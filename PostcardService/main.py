from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from PIL import Image, ImageDraw, ImageFont
import io, base64, os, tempfile, urllib.request, requests
import asyncio, time, hmac, hashlib
from threading import Timer
import cloudinary
import cloudinary.uploader
import resend
import stripe
import json
from datetime import datetime, timedelta
import calendar
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
# Embedded TemplateEngine to avoid import issues in Railway
class TemplateEngine:
    """Handle multi-photo template layouts for postcard fronts"""
    
    # Standard postcard dimensions (6x9 inches at 300 DPI)
    REGULAR_SIZE = (1800, 1200)  # 6x4 inches at 300 DPI
    XL_SIZE = (2700, 1800)       # 9x6 inches at 300 DPI
    
    def __init__(self, postcard_size: str = "xl"):
        self.size = self.XL_SIZE if postcard_size == "xl" else self.REGULAR_SIZE
        self.width, self.height = self.size
        
    def _load_image_from_url(self, image_url: str) -> Image.Image:
        """Load image from URL or base64 data"""
        try:
            if image_url.startswith('data:image'):
                # Handle base64 data URLs
                header, encoded = image_url.split(',', 1)
                image_data = base64.b64decode(encoded)
                return Image.open(io.BytesIO(image_data)).convert('RGB')
            else:
                # Handle regular URLs
                with urllib.request.urlopen(image_url) as response:
                    return Image.open(response).convert('RGB')
        except Exception as e:
            print(f"[TEMPLATE] Error loading image from {image_url[:50]}...: {e}")
            # Return a placeholder image
            placeholder = Image.new('RGB', (400, 400), color='lightgray')
            return placeholder
    
    def _resize_and_crop(self, image: Image.Image, target_size: tuple) -> Image.Image:
        """Resize and crop image to fit target size while maintaining aspect ratio"""
        target_width, target_height = target_size
        
        # Calculate ratios
        img_ratio = image.width / image.height
        target_ratio = target_width / target_height
        
        if img_ratio > target_ratio:
            # Image is wider than target - crop width
            new_height = image.height
            new_width = int(new_height * target_ratio)
            left = (image.width - new_width) // 2
            image = image.crop((left, 0, left + new_width, new_height))
        else:
            # Image is taller than target - crop height
            new_width = image.width
            new_height = int(new_width / target_ratio)
            top = (image.height - new_height) // 2
            image = image.crop((0, top, new_width, top + new_height))
        
        return image.resize(target_size, Image.Resampling.LANCZOS)
    
    def apply_template(self, template_type: str, image_urls: List[str]) -> Image.Image:
        """Apply specified template with provided images"""
        print(f"[TEMPLATE] Applying template: {template_type}")
        
        if template_type == "single":
            if len(image_urls) < 1:
                raise ValueError("Single template requires 1 image")
            return self._apply_single_photo(image_urls[0])
            
        elif template_type == "two_side_by_side":
            if len(image_urls) < 2:
                raise ValueError("Two side-by-side template requires 2 images")
            return self._apply_two_side_by_side(image_urls[0], image_urls[1])
            
        elif template_type == "three_photos":
            if len(image_urls) < 3:
                raise ValueError("Three photos template requires 3 images")
            return self._apply_three_photos(image_urls[0], image_urls[1], image_urls[2])
            
        elif template_type == "four_quarters":
            if len(image_urls) < 4:
                raise ValueError("Four quarters template requires 4 images")
            return self._apply_four_quarters(image_urls)
            
        elif template_type == "two_vertical":
            if len(image_urls) < 2:
                raise ValueError("Two vertical template requires 2 images")
            return self._apply_two_vertical(image_urls[0], image_urls[1])
            
        elif template_type == "five_collage":
            if len(image_urls) < 5:
                raise ValueError("Five collage template requires 5 images")
            return self._apply_five_collage(image_urls)
            
        elif template_type == "six_grid":
            if len(image_urls) < 6:
                raise ValueError("Six grid template requires 6 images")
            return self._apply_six_grid(image_urls)
            
        elif template_type == "three_horizontal":
            if len(image_urls) < 3:
                raise ValueError("Three horizontal template requires 3 images")
            return self._apply_three_horizontal(image_urls[0], image_urls[1], image_urls[2])
            
        elif template_type == "three_bookmarks":
            if len(image_urls) < 3:
                raise ValueError("Three bookmarks template requires 3 images")
            return self._apply_three_bookmarks(image_urls[0], image_urls[1], image_urls[2])
            
        elif template_type == "three_sideways":
            if len(image_urls) < 3:
                raise ValueError("Three sideways template requires 3 images")
            return self._apply_three_sideways(image_urls[0], image_urls[1], image_urls[2])
            
        else:
            # Default to single photo
            print(f"[TEMPLATE] Unknown template type: {template_type}, defaulting to single")
            return self._apply_single_photo(image_urls[0])
    
    def _apply_single_photo(self, image_url: str) -> Image.Image:
        """Template 1: Single photo covering entire front"""
        print(f"[TEMPLATE] Applying single photo template")
        image = self._load_image_from_url(image_url)
        return self._resize_and_crop(image, self.size)
    
    def _apply_two_side_by_side(self, left_image_url: str, right_image_url: str) -> Image.Image:
        """Template 2: Two photos side by side"""
        print(f"[TEMPLATE] Applying two side-by-side template")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes (with small gap between images)
        gap = 20
        photo_width = (self.width - gap) // 2
        photo_size = (photo_width, self.height)
        
        # Load and resize images
        left_image = self._load_image_from_url(left_image_url)
        right_image = self._load_image_from_url(right_image_url)
        
        left_image = self._resize_and_crop(left_image, photo_size)
        right_image = self._resize_and_crop(right_image, photo_size)
        
        # Paste images
        canvas.paste(left_image, (0, 0))
        canvas.paste(right_image, (photo_width + gap, 0))
        
        return canvas
    
    def _apply_three_photos(self, left_image_url: str, top_right_url: str, bottom_right_url: str) -> Image.Image:
        """Template 3: One large photo on left half, two smaller on right half (stacked)"""
        print(f"[TEMPLATE] Applying three photos template")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes
        gap = 20
        left_width = self.width // 2 - gap // 2
        right_width = self.width // 2 - gap // 2
        right_height = (self.height - gap) // 2
        
        # Define rectangles
        left_size = (left_width, self.height)
        right_size = (right_width, right_height)
        
        # Load and resize images
        left_image = self._load_image_from_url(left_image_url)
        top_right_image = self._load_image_from_url(top_right_url)
        bottom_right_image = self._load_image_from_url(bottom_right_url)
        
        left_image = self._resize_and_crop(left_image, left_size)
        top_right_image = self._resize_and_crop(top_right_image, right_size)
        bottom_right_image = self._resize_and_crop(bottom_right_image, right_size)
        
        # Paste images
        canvas.paste(left_image, (0, 0))
        canvas.paste(top_right_image, (left_width + gap, 0))
        canvas.paste(bottom_right_image, (left_width + gap, right_height + gap))
        
        return canvas
    
    def _apply_four_quarters(self, image_urls: List[str]) -> Image.Image:
        """Template 4: Four photos in quarters"""
        print(f"[TEMPLATE] Applying four quarters template")
        
        if len(image_urls) < 4:
            raise ValueError("Four quarters template requires exactly 4 images")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes
        gap = 20
        quarter_width = (self.width - gap) // 2
        quarter_height = (self.height - gap) // 2
        quarter_size = (quarter_width, quarter_height)
        
        # Load and resize images
        images = []
        for url in image_urls[:4]:  # Only use first 4 images
            image = self._load_image_from_url(url)
            image = self._resize_and_crop(image, quarter_size)
            images.append(image)
        
        # Paste images in quarters
        positions = [
            (0, 0),                                    # Top left
            (quarter_width + gap, 0),                  # Top right
            (0, quarter_height + gap),                 # Bottom left
            (quarter_width + gap, quarter_height + gap) # Bottom right
        ]
        
        for i, (image, pos) in enumerate(zip(images, positions)):
            canvas.paste(image, pos)
        
        return canvas
    
    def _apply_two_vertical(self, top_image_url: str, bottom_image_url: str) -> Image.Image:
        """Template: Two photos stacked vertically"""
        print(f"[TEMPLATE] Applying two vertical template")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes (with small gap between images)
        gap = 20
        photo_height = (self.height - gap) // 2
        photo_size = (self.width, photo_height)
        
        # Load and resize images
        top_image = self._load_image_from_url(top_image_url)
        bottom_image = self._load_image_from_url(bottom_image_url)
        
        top_image = self._resize_and_crop(top_image, photo_size)
        bottom_image = self._resize_and_crop(bottom_image, photo_size)
        
        # Paste images
        canvas.paste(top_image, (0, 0))
        canvas.paste(bottom_image, (0, photo_height + gap))
        
        return canvas
    
    def _apply_five_collage(self, image_urls: List[str]) -> Image.Image:
        """Template: Five photos - four quarters with one overlaid in center"""
        print(f"[TEMPLATE] Applying five collage template")
        
        if len(image_urls) < 5:
            raise ValueError("Five collage template requires exactly 5 images")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes for background quarters
        gap = 20
        quarter_width = (self.width - gap) // 2
        quarter_height = (self.height - gap) // 2
        quarter_size = (quarter_width, quarter_height)
        
        # Load and resize background images (first 4)
        background_images = []
        for url in image_urls[:4]:
            image = self._load_image_from_url(url)
            image = self._resize_and_crop(image, quarter_size)
            background_images.append(image)
        
        # Paste background images in quarters
        positions = [
            (0, 0),                                    # Top left
            (quarter_width + gap, 0),                  # Top right
            (0, quarter_height + gap),                 # Bottom left
            (quarter_width + gap, quarter_height + gap) # Bottom right
        ]
        
        for i, (image, pos) in enumerate(zip(background_images, positions)):
            canvas.paste(image, pos)
        
        # Add center overlay image (5th image) - smaller and centered with white border
        center_size = (int(quarter_width * 0.7), int(quarter_height * 0.7))
        center_image = self._load_image_from_url(image_urls[4])
        center_image = self._resize_and_crop(center_image, center_size)
        
        # Create white border around center image
        border_width = 8  # Border thickness in pixels
        bordered_size = (center_size[0] + border_width * 2, center_size[1] + border_width * 2)
        bordered_image = Image.new('RGB', bordered_size, color='white')
        bordered_image.paste(center_image, (border_width, border_width))
        
        # Calculate center position for bordered image
        center_x = (self.width - bordered_size[0]) // 2
        center_y = (self.height - bordered_size[1]) // 2
        
        canvas.paste(bordered_image, (center_x, center_y))
        
        return canvas
    
    def _apply_six_grid(self, image_urls: List[str]) -> Image.Image:
        """Template: Six photos in a 2x3 grid"""
        print(f"[TEMPLATE] Applying six grid template")
        
        if len(image_urls) < 6:
            raise ValueError("Six grid template requires exactly 6 images")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes (3 columns, 2 rows)
        gap = 15
        cell_width = (self.width - (2 * gap)) // 3  # 3 columns with 2 gaps
        cell_height = (self.height - gap) // 2      # 2 rows with 1 gap
        cell_size = (cell_width, cell_height)
        
        # Load and resize images
        images = []
        for url in image_urls[:6]:  # Only use first 6 images
            image = self._load_image_from_url(url)
            image = self._resize_and_crop(image, cell_size)
            images.append(image)
        
        # Paste images in grid (2 rows, 3 columns)
        positions = [
            # Top row
            (0, 0),
            (cell_width + gap, 0),
            ((cell_width + gap) * 2, 0),
            # Bottom row
            (0, cell_height + gap),
            (cell_width + gap, cell_height + gap),
            ((cell_width + gap) * 2, cell_height + gap)
        ]
        
        for i, (image, pos) in enumerate(zip(images, positions)):
            canvas.paste(image, pos)
        
        return canvas
    
    def _apply_three_horizontal(self, left_image_url: str, center_image_url: str, right_image_url: str) -> Image.Image:
        """Template: Three photos side by side horizontally"""
        print(f"[TEMPLATE] Applying three horizontal template")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes (with small gaps between images)
        gap = 15
        photo_width = (self.width - (2 * gap)) // 3  # 3 photos with 2 gaps
        photo_size = (photo_width, self.height)
        
        # Load and resize images
        left_image = self._load_image_from_url(left_image_url)
        center_image = self._load_image_from_url(center_image_url)
        right_image = self._load_image_from_url(right_image_url)
        
        left_image = self._resize_and_crop(left_image, photo_size)
        center_image = self._resize_and_crop(center_image, photo_size)
        right_image = self._resize_and_crop(right_image, photo_size)
        
        # Paste images
        canvas.paste(left_image, (0, 0))
        canvas.paste(center_image, (photo_width + gap, 0))
        canvas.paste(right_image, ((photo_width + gap) * 2, 0))
        
        return canvas

    def _apply_three_bookmarks(self, top_image_url: str, middle_image_url: str, bottom_image_url: str) -> Image.Image:
        """Template: Three narrow horizontal bookmark-style photos stacked vertically (3:0.67 ratio)"""
        print(f"[TEMPLATE] Applying three bookmarks template")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes for narrow horizontal strips stacked vertically
        gap = 15
        photo_height = (self.height - (2 * gap)) // 3  # 3 photos with 2 gaps, stacked vertically
        photo_size = (self.width, photo_height)  # Full width, narrow height
        
        # Load and resize images for bookmark style (wide and narrow)
        top_image = self._load_image_from_url(top_image_url)
        middle_image = self._load_image_from_url(middle_image_url)
        bottom_image = self._load_image_from_url(bottom_image_url)
        
        # Apply bookmark aspect ratio (wide, narrow strips)
        top_image = self._resize_and_crop(top_image, photo_size)
        middle_image = self._resize_and_crop(middle_image, photo_size)
        bottom_image = self._resize_and_crop(bottom_image, photo_size)
        
        # Paste images vertically stacked
        canvas.paste(top_image, (0, 0))
        canvas.paste(middle_image, (0, photo_height + gap))
        canvas.paste(bottom_image, (0, (photo_height + gap) * 2))
        
        return canvas

    def _apply_three_sideways(self, top_image_url: str, bottom_left_image_url: str, bottom_right_image_url: str) -> Image.Image:
        """Template: One wide photo on top (3:1) with two photos below (1.5:1)"""
        print(f"[TEMPLATE] Applying three sideways template")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes for top wide photo and bottom two photos
        gap = 15
        top_height = int(self.height * 0.4)  # Top photo takes 40% of height
        bottom_height = self.height - top_height - gap
        bottom_width = (self.width - gap) // 2  # Two bottom photos split width
        
        # Load and resize images
        top_image = self._load_image_from_url(top_image_url)
        bottom_left_image = self._load_image_from_url(bottom_left_image_url)
        bottom_right_image = self._load_image_from_url(bottom_right_image_url)
        
        # Resize with appropriate ratios
        top_image = self._resize_and_crop(top_image, (self.width, top_height))  # 3:1 wide
        bottom_left_image = self._resize_and_crop(bottom_left_image, (bottom_width, bottom_height))  # 1.5:1
        bottom_right_image = self._resize_and_crop(bottom_right_image, (bottom_width, bottom_height))  # 1.5:1
        
        # Paste images
        canvas.paste(top_image, (0, 0))  # Top wide photo
        canvas.paste(bottom_left_image, (0, top_height + gap))  # Bottom left
        canvas.paste(bottom_right_image, (bottom_width + gap, top_height + gap))  # Bottom right
        
        return canvas

TEMPLATE_ENGINE_AVAILABLE = True
print("[STARTUP] TemplateEngine embedded successfully")

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    """Run startup tasks including coupon creation"""
    print("[STARTUP] PostcardService starting up...")
    
    # Automatically create next month's coupon if it doesn't exist
    try:
        print("[STARTUP] Checking if next month's coupon needs to be created...")
        result = await create_monthly_coupon()
        if result["success"]:
            print(f"[STARTUP] ✅ Monthly coupon ready: {result.get('promo_code')}")
        else:
            print(f"[STARTUP] ⚠️ Coupon creation issue: {result.get('error')}")
    except Exception as e:
        print(f"[STARTUP] ❌ Error during coupon creation: {e}")
    
    print("[STARTUP] PostcardService ready!")
    
    # Schedule daily coupon check
    schedule_daily_coupon_check()

# Configure Cloudinary SDK
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "db9totnmb"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

# Configure Resend for email notifications
resend.api_key = os.getenv("RESEND_API_KEY")

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./coupons.db")

# Create engine with connection pooling and better error handling
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"sslmode": "require"} if "railway" in DATABASE_URL else {}
    )
    print(f"[DATABASE] Connected to PostgreSQL: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'Railway'}")
else:
    engine = create_engine(DATABASE_URL)
    print(f"[DATABASE] Using SQLite fallback: {DATABASE_URL}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class CouponCampaign(Base):
    __tablename__ = "coupon_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_name = Column(String(100), unique=True, nullable=False)
    campaign_type = Column(String(50), nullable=False)
    description = Column(Text)
    max_redemptions = Column(Integer, default=500)
    discount_percent = Column(Integer, default=100)
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    coupon_codes = relationship("CouponCode", back_populates="campaign")

class CouponCode(Base):
    __tablename__ = "coupon_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("coupon_campaigns.id"))
    code = Column(String(50), unique=True, nullable=False, index=True)
    stripe_coupon_id = Column(String(100))
    stripe_promo_id = Column(String(100))
    max_redemptions = Column(Integer, default=500)
    times_redeemed = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    campaign = relationship("CouponCampaign", back_populates="coupon_codes")
    distributions = relationship("CouponDistribution", back_populates="coupon_code")
    redemptions = relationship("CouponRedemption", back_populates="coupon_code")

class CouponDistribution(Base):
    __tablename__ = "coupon_distributions"
    
    id = Column(Integer, primary_key=True, index=True)
    coupon_code_id = Column(Integer, ForeignKey("coupon_codes.id"))
    transaction_id = Column(String(100), nullable=False, index=True)
    recipient_name = Column(String(255))
    recipient_address = Column(Text)
    sent_at = Column(DateTime, default=func.now())
    postcard_size = Column(String(20))
    
    coupon_code = relationship("CouponCode", back_populates="distributions")

class CouponRedemption(Base):
    __tablename__ = "coupon_redemptions"
    
    id = Column(Integer, primary_key=True, index=True)
    coupon_code_id = Column(Integer, ForeignKey("coupon_codes.id"))
    transaction_id = Column(String(100))
    stripe_payment_intent_id = Column(String(100), index=True)
    customer_email = Column(String(255))
    redeemed_at = Column(DateTime, default=func.now())
    redemption_value_cents = Column(Integer, default=299)
    
    coupon_code = relationship("CouponCode", back_populates="redemptions")

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    created_at = Column(DateTime, default=func.now())
    total_orders = Column(Integer, default=0)
    total_spent_cents = Column(Integer, default=0)
    first_order_date = Column(DateTime)
    last_order_date = Column(DateTime)
    is_active = Column(Boolean, default=True)

# Create tables with error handling
try:
    Base.metadata.create_all(bind=engine)
    print("[DATABASE] Tables created successfully")
    
    # Test database connection
    test_session = SessionLocal()
    test_session.execute("SELECT 1")
    test_session.close()
    print("[DATABASE] Database connection test successful")
    
except Exception as e:
    print(f"[DATABASE] Error setting up database: {e}")
    print("[DATABASE] Falling back to in-memory storage only")

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_session():
    """Get database session for direct use"""
    try:
        return SessionLocal()
    except Exception as e:
        print(f"[DATABASE] Error creating session: {e}")
        return None

# In-memory transaction storage (will be replaced with database)
transaction_store = {}
payment_sessions = {}  # Store payment session data

def get_next_month_coupon_code():
    """Generate the coupon code for next month (e.g., XLWelcomeNov)"""
    next_month = datetime.now() + timedelta(days=32)
    month_abbr = calendar.month_abbr[next_month.month]
    return f"XLWelcome{month_abbr}"

def get_next_month_details():
    """Get next month's details for coupon creation"""
    next_month = datetime.now() + timedelta(days=32)
    next_month = next_month.replace(day=1)  # First day of next month
    
    # Last day of next month
    last_day = calendar.monthrange(next_month.year, next_month.month)[1]
    expiry_date = next_month.replace(day=last_day)
    
    month_name = calendar.month_name[next_month.month]
    year = next_month.year
    
    return {
        "month_name": month_name,
        "year": year,
        "expiry_timestamp": int(expiry_date.timestamp()),
        "expiry_date": expiry_date,
        "coupon_code": get_next_month_coupon_code()
    }

async def create_monthly_coupon():
    """Create next month's coupon and promotional code automatically"""
    db = SessionLocal()
    try:
        details = get_next_month_details()
        coupon_id = f"xlwelcome-{details['month_name'].lower()}-{details['year']}"
        promo_code = details["coupon_code"]
        
        print(f"[COUPON] Creating monthly coupon: {coupon_id} with code: {promo_code}")
        
        # Check if coupon already exists in database
        existing_code = db.query(CouponCode).filter(CouponCode.code == promo_code).first()
        if existing_code:
            print(f"[COUPON] Code {promo_code} already exists in database")
            return {
                "success": True,
                "message": f"Coupon already exists",
                "coupon_id": existing_code.stripe_coupon_id,
                "promo_code": promo_code
            }
        
        # Get or create monthly welcome campaign
        campaign = db.query(CouponCampaign).filter(
            CouponCampaign.campaign_type == "monthly_welcome"
        ).first()
        
        if not campaign:
            campaign = CouponCampaign(
                campaign_name="Monthly Welcome Campaign",
                campaign_type="monthly_welcome",
                description="Monthly rotating welcome codes for first-time customers",
                max_redemptions=500,
                discount_percent=100
            )
            db.add(campaign)
            db.commit()
            db.refresh(campaign)
            print(f"[COUPON] Created new campaign: {campaign.id}")
        
        # Create Stripe coupon
        try:
            stripe_coupon = stripe.Coupon.create(
                id=coupon_id,
                name=f"XLWelcome {details['month_name']} {details['year']}",
                percent_off=100,
                duration="once",
                max_redemptions=500
            )
            print(f"[COUPON] Created Stripe coupon: {stripe_coupon.id}")
        except stripe.error.InvalidRequestError as e:
            if "already exists" in str(e):
                stripe_coupon = stripe.Coupon.retrieve(coupon_id)
                print(f"[COUPON] Using existing Stripe coupon: {coupon_id}")
            else:
                raise e
        
        # Create Stripe promotional code
        try:
            stripe_promo = stripe.PromotionCode.create(
                coupon=coupon_id,
                code=promo_code,
                active=True,
                restrictions={
                    "first_time_transaction": True  # First-time customers only
                },
                expires_at=details["expiry_timestamp"]
            )
            print(f"[COUPON] Created Stripe promotional code: {stripe_promo.code}")
        except stripe.error.InvalidRequestError as e:
            if "already exists" in str(e):
                # Get existing promotional code
                existing_promos = stripe.PromotionCode.list(code=promo_code, limit=1)
                stripe_promo = existing_promos.data[0] if existing_promos.data else None
                print(f"[COUPON] Using existing Stripe promotional code: {promo_code}")
            else:
                raise e
        
        # Save to database
        db_coupon = CouponCode(
            campaign_id=campaign.id,
            code=promo_code,
            stripe_coupon_id=stripe_coupon.id,
            stripe_promo_id=stripe_promo.id if stripe_promo else None,
            max_redemptions=500,
            expires_at=details["expiry_date"]
        )
        db.add(db_coupon)
        db.commit()
        db.refresh(db_coupon)
        
        print(f"[COUPON] Saved coupon to database: {db_coupon.id}")
        
        return {
            "success": True,
            "message": f"Successfully created monthly coupon",
            "coupon_id": coupon_id,
            "promo_code": promo_code,
            "expires": details["expiry_date"].strftime("%Y-%m-%d"),
            "max_redemptions": 500,
            "db_id": db_coupon.id
        }
        
    except Exception as e:
        print(f"[COUPON] Error creating monthly coupon: {e}")
        db.rollback()
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close()

def schedule_daily_coupon_check():
    """Schedule daily check for coupon creation at 2 AM UTC"""
    def daily_check():
        print("[SCHEDULER] Running daily coupon check...")
        try:
            # Run the coupon creation in an async context
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(create_monthly_coupon())
            
            if result["success"]:
                print(f"[SCHEDULER] ✅ Daily check complete: {result.get('promo_code')}")
            else:
                print(f"[SCHEDULER] ⚠️ Daily check issue: {result.get('error')}")
                
        except Exception as e:
            print(f"[SCHEDULER] ❌ Daily check error: {e}")
        finally:
            # Schedule next check in 24 hours
            Timer(86400, daily_check).start()  # 24 hours = 86400 seconds
    
    # Start the first check in 24 hours
    Timer(86400, daily_check).start()
    print("[SCHEDULER] Daily coupon check scheduled (every 24 hours)")

class Recipient(BaseModel):
    to: str = Field(default="")
    addressLine1: str = Field(default="")
    addressLine2: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    zipcode: Optional[str] = ""

class PostcardRequest(BaseModel):
    message: str
    recipientInfo: Recipient
    postcardSize: str
    returnAddressText: str = ""
    transactionId: str = ""
    frontImageUri: Optional[str] = ""  # Legacy single image support
    frontImageUris: Optional[List[str]] = []  # New multi-image support
    templateType: Optional[str] = "single"  # Template type: single, two_side_by_side, three_photos, four_quarters, two_vertical, five_collage, six_grid, three_horizontal
    userEmail: Optional[str] = ""

class PaymentConfirmedRequest(BaseModel):
    transactionId: str
    stripePaymentIntentId: str
    userEmail: Optional[str] = ""

class StannpSubmissionRequest(BaseModel):
    transactionId: str

class PromoCodeValidationRequest(BaseModel):
    code: str
    transactionId: Optional[str] = ""

class FreePostcardRequest(BaseModel):
    message: str
    recipientInfo: Recipient
    postcardSize: str
    returnAddressText: str = ""
    transactionId: str = ""
    frontImageUri: Optional[str] = ""
    frontImageUris: Optional[List[str]] = []
    templateType: Optional[str] = "single"
    userEmail: Optional[str] = ""
    promoCode: str

class CreatePaymentSessionRequest(BaseModel):
    message: str
    recipientInfo: Recipient
    postcardSize: str
    returnAddressText: str = ""
    frontImageUri: str
    userEmail: Optional[str] = ""
    successUrl: Optional[str] = "https://stripe.com/docs/payments/checkout/custom-success-page"
    cancelUrl: Optional[str] = "https://stripe.com/docs/payments/checkout"

class PaymentSessionResponse(BaseModel):
    success: bool
    sessionId: str
    checkoutUrl: str
    transactionId: str

class AppErrorLog(BaseModel):
    timestamp: str
    level: str
    message: str
    stackTrace: Optional[str] = None
    userAgent: Optional[str] = None
    buildInfo: Dict

def load_font(size: int) -> ImageFont.FreeTypeFont:
    """Load font with emoji support and fallback options"""
    print(f"[FONT] Attempting to load {size}pt font with emoji support")
    
    # Try fonts that support emojis first
    emoji_font_paths = [
        "/System/Library/Fonts/Apple Color Emoji.ttc",  # macOS emoji font
        "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",  # Linux emoji font
        "/Windows/Fonts/seguiemj.ttf",  # Windows emoji font
    ]
    
    # Try regular fonts with good Unicode support
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", 
        "/System/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc"
    ]
    
    # Try emoji fonts first
    for font_path in emoji_font_paths:
        try:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, size)
                print(f"[FONT] SUCCESS: Loaded emoji font {font_path} at {size}pt")
                return font
        except Exception as e:
            print(f"[FONT] Emoji font failed {font_path}: {e}")
            continue
    
    # Try regular fonts
    for font_path in font_paths:
        try:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, size)
                print(f"[FONT] SUCCESS: Loaded {font_path} at {size}pt")
                return font
        except Exception as e:
            print(f"[FONT] Failed {font_path}: {e}")
            continue
    
    # Download font as fallback
    try:
        print("[FONT] Downloading DejaVu Sans font...")
        font_url = "https://github.com/dejavu-fonts/dejavu-fonts/raw/version_2_37/ttf/DejaVuSans.ttf"
        font_path = os.path.join(tempfile.gettempdir(), "DejaVuSans.ttf")
        urllib.request.urlretrieve(font_url, font_path)
        font = ImageFont.truetype(font_path, size)
        print(f"[FONT] SUCCESS: Downloaded font at {size}pt")
        return font
    except Exception as e:
        print(f"[FONT] Download failed: {e}")
    
    # Absolute fallback
    print("[FONT] WARNING: Using default font (will be small)")
    return ImageFont.load_default()

def process_message_with_line_breaks(message: str, max_width: int, font, draw) -> list:
    """Process message while preserving user line breaks and handling emojis"""
    print(f"[MESSAGE] Processing message with line breaks preserved")
    
    # Split by user-defined line breaks first
    user_lines = message.split('\n')
    processed_lines = []
    
    for user_line in user_lines:
        if not user_line.strip():
            # Empty line - preserve it for spacing
            processed_lines.append('')
            continue
            
        # Word wrap each user line individually
        words = user_line.split()
        current_line = ""
        
        for word in words:
            test_line = (current_line + " " + word).strip() if current_line else word
            
            # Check if line fits
            try:
                text_width = draw.textlength(test_line, font=font)
            except:
                # Fallback for older PIL versions or compatibility issues
                text_width = len(test_line) * (font.size * 0.6) if hasattr(font, 'size') else len(test_line) * 20
                
            if text_width <= max_width:
                current_line = test_line
            else:
                if current_line:
                    processed_lines.append(current_line)
                current_line = word
        
        if current_line:
            processed_lines.append(current_line)
    
    print(f"[MESSAGE] Processed {len(user_lines)} user lines into {len(processed_lines)} final lines")
    return processed_lines

def upload_to_cloudinary(image_data: bytes, filename: str) -> str:
    """Upload image to Cloudinary using official SDK"""
    try:
        print(f"[CLOUDINARY] SDK Upload: {filename}, size: {len(image_data)} bytes")
        
        # Upload using official Cloudinary SDK
        result = cloudinary.uploader.upload(
            image_data,
            resource_type="image",
            folder="postcards/backs",
            public_id=filename.replace('.jpg', '').replace('.jpeg', ''),
            overwrite=True,
            unique_filename=False
        )
        
        print(f"[CLOUDINARY] SDK upload successful: {result['secure_url']}")
        print(f"[CLOUDINARY] Public ID created: {result['public_id']}")
        return result["secure_url"]
        
    except Exception as e:
        print(f"[CLOUDINARY] SDK upload failed: {e}")
        raise

def send_email_notification(to_email: str, subject: str, message: str, pdf_url: Optional[str] = None):
    """Send email notification using Resend with PDF attachment"""
    try:
        if not resend.api_key:
            print(f"[EMAIL] WARNING: Resend API key not configured, skipping email to {to_email}")
            return
            
        print(f"[EMAIL] Sending email to {to_email}: {subject}")
        
        # Extract first name from email or use default
        first_name = to_email.split('@')[0].title() if '@' in to_email else "there"
        
        # Create HTML message with new content
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <p>Hi {first_name},</p>
                
                <p>Your postcard has been successfully submitted for printing and mailing! ✉️✨</p>
                
                <p>We've attached a PDF copy of your postcard to this email so you can see exactly what your recipient will receive in their mailbox.</p>
                
                <p>📎 Attachment: postcard.pdf</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p><strong>What's next?</strong></p>
                <ul style="padding-left: 20px;">
                    <li>Your postcard is with the printer and will be printed and mailed shortly.</li>
                    <li>Want to share more smiles? It only takes a minute to send another postcard — whether it's for a birthday, thank-you, or "just because."</li>
                </ul>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p>Thank you for choosing XLPostcards. We love helping you stay connected in the most personal way possible.</p>
                
                <p>Happy mailing,<br>
                The XLPostcards Team</p>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    For any issues or concerns contact us at <a href="mailto:info@xlpostcards.com">info@xlpostcards.com</a>
                </p>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": "XLPostcards <notifications@xlpostcards.com>",
            "to": [to_email],
            "subject": subject,
            "html": html_message,
        }
        
        # Download and attach PDF if URL provided
        if pdf_url:
            try:
                print(f"[EMAIL] Downloading PDF from: {pdf_url}")
                pdf_response = requests.get(pdf_url, timeout=30)
                pdf_response.raise_for_status()
                
                # Encode PDF as base64 for attachment
                pdf_base64 = base64.b64encode(pdf_response.content).decode('utf-8')
                
                # Add attachment to email params
                params["attachments"] = [{
                    "filename": "postcard.pdf",
                    "content": pdf_base64,
                    "content_type": "application/pdf"
                }]
                
                print(f"[EMAIL] PDF attachment prepared, size: {len(pdf_response.content)} bytes")
                
            except Exception as pdf_error:
                print(f"[EMAIL] Failed to download PDF for attachment: {pdf_error}")
                # Fall back to including the link in the message
                html_message = html_message.replace(
                    '<p>We\'ve attached a PDF copy of your postcard to this email so you can see exactly what your recipient will receive in their mailbox.</p>',
                    f'<p>You can view a copy of your postcard using this link: <a href="{pdf_url}" target="_blank">View your postcard</a></p>'
                )
                html_message = html_message.replace(
                    '<p>📎 Attachment: postcard.pdf</p>',
                    ''
                )
                params["html"] = html_message
        
        result = resend.Emails.send(params)
        print(f"[EMAIL] Email sent successfully to {to_email}, ID: {result.get('id', 'unknown')}")
        
    except Exception as e:
        print(f"[EMAIL] Failed to send email to {to_email}: {e}")
        # Don't raise exception - email failure shouldn't break postcard processing

@app.post("/generate-complete-postcard")
async def generate_complete_postcard(request: PostcardRequest):
    """Generate both front and back images, upload to Cloudinary"""
    try:
        print(f"[COMPLETE] Railway PostcardService v2.1.1.17-dev")
        print(f"[COMPLETE] Generating complete {request.postcardSize} postcard")
        print(f"[COMPLETE] Received userEmail: '{request.userEmail}'")
        
        # Generate back image (existing logic)
        if request.postcardSize == "regular":
            W, H = 1800, 1200
        else:
            W, H = 2754, 1872

        back_img = Image.new("RGB", (W, H), "white")
        draw = ImageDraw.Draw(back_img)

        # Load fonts
        body_font = load_font(40)
        addr_font = load_font(36)
        ret_font = load_font(32)

        # Return address with separator
        message_start_y = 150
        if request.returnAddressText and request.returnAddressText != "{{RETURN_ADDRESS}}":
            y = 108
            for line in request.returnAddressText.split("\n")[:3]:
                if line.strip():
                    draw.text((108, y), line.strip(), font=ret_font, fill="black")
                    y += 40
            
            # Separator line
            line_y = y + 20
            line_end_x = 1400 if request.postcardSize == "xl" else 900
            draw.line([(108, line_y), (line_end_x, line_y)], fill="black", width=2)
            message_start_y = line_y + 30

        # Process message with line breaks preserved
        max_width = 1400 if request.postcardSize == "xl" else 900
        lines = process_message_with_line_breaks(request.message, max_width, body_font, draw)

        # Draw message with proper line spacing for empty lines
        y = message_start_y
        line_height = 50
        lines_drawn = 0
        
        for line in lines[:20]:  # Limit to 20 lines
            if line.strip():
                # Non-empty line - draw the text
                draw.text((108, y), line, font=body_font, fill="black")
            # Empty lines just add spacing without drawing text
            y += line_height
            lines_drawn += 1
            
        print(f"[MESSAGE] Drew {lines_drawn} lines with preserved line breaks")

        # Address block - increased width to prevent overflow
        x = W - 800 if request.postcardSize == "xl" else W - 680
        y = H - 360
        r = request.recipientInfo
        
        for line in filter(None, [
            r.to,
            r.addressLine1,
            r.addressLine2,
            f"{r.city}, {r.state} {r.zipcode}".strip(", ")
        ]):
            draw.text((x, y), line, font=addr_font, fill="black")
            y += 46

        # Add XLPostcards logo to lower left corner
        try:
            logo_path = os.path.join(os.path.dirname(__file__), "Assets", "Images", "BW Icon - Back.png")
            if os.path.exists(logo_path):
                logo_img = Image.open(logo_path).convert("RGBA")
                
                # Scale logo based on postcard size (2x bigger)
                if request.postcardSize == "xl":
                    logo_width = 600  # 2x larger for XL postcards (was 300)
                else:
                    logo_width = 400  # 2x larger for regular postcards (was 200)
                
                # Calculate height maintaining aspect ratio
                aspect_ratio = logo_img.height / logo_img.width
                logo_height = int(logo_width * aspect_ratio)
                logo_img = logo_img.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
                
                # Position in lower left corner with some padding
                logo_x = 50
                logo_y = H - logo_height - 50
                
                # Paste logo with transparency support
                back_img.paste(logo_img, (logo_x, logo_y), logo_img)
                print(f"[LOGO] Added XLPostcards logo to postcard back at ({logo_x}, {logo_y})")
            else:
                print(f"[LOGO] Logo file not found at: {logo_path}")
        except Exception as e:
            print(f"[LOGO] Error adding logo: {e}")

        # Add promotional advertisement in upper right corner
        try:
            # Use monthly coupon code for all postcards (first-time customers only)
            coupon_code = get_next_month_coupon_code()
            
            # Position promotional box above address block (bigger size)
            if request.postcardSize == "xl":
                # XL postcard (9x6 inches) - bigger box above address
                ad_width = 700  # Much larger width
                ad_height = 300  # Much larger height
                ad_x = W - ad_width - 50  # Position above address block
                ad_y = 100  # Higher up to be above address
                title_font = load_font(36)
                body_font = load_font(28)
                code_font = load_font(32)
                line_spacing = 40
            else:
                # Regular postcard (4x6 inches) - bigger box above address
                ad_width = 500  # Much larger width  
                ad_height = 220  # Much larger height
                ad_x = W - ad_width - 40  # Position above address block
                ad_y = 80   # Higher up to be above address
                title_font = load_font(28)
                body_font = load_font(22)
                code_font = load_font(26)
                line_spacing = 32
            
            # Draw rounded rectangle background for advertisement
            def draw_rounded_rectangle(draw, xy, radius, fill):
                """Draw a rounded rectangle"""
                x1, y1, x2, y2 = xy
                # Draw main rectangle
                draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
                draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
                # Draw corners
                draw.pieslice([x1, y1, x1 + radius * 2, y1 + radius * 2], 180, 270, fill=fill)
                draw.pieslice([x2 - radius * 2, y1, x2, y1 + radius * 2], 270, 360, fill=fill)
                draw.pieslice([x1, y2 - radius * 2, x1 + radius * 2, y2], 90, 180, fill=fill)
                draw.pieslice([x2 - radius * 2, y2 - radius * 2, x2, y2], 0, 90, fill=fill)
            
            # Draw advertisement background with subtle border
            draw_rounded_rectangle(
                draw,
                [ad_x, ad_y, ad_x + ad_width, ad_y + ad_height],
                15,
                "#f8f8f8"
            )
            
            # Add thicker border for bigger box
            draw.rectangle([ad_x + 3, ad_y + 3, ad_x + ad_width - 3, ad_y + ad_height - 3], outline="#f28914", width=6)
            
            # Add promotional text content (centered in bigger box)
            text_x = ad_x + 25
            current_y = ad_y + 25
            
            # Calculate center positions for text
            title_text = "Get XLPostcards App!"
            title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
            title_width = title_bbox[2] - title_bbox[0]
            title_x = ad_x + (ad_width - title_width) // 2
            
            # Title (centered)
            draw.text((title_x, current_y), title_text, font=title_font, fill="#f28914")
            current_y += line_spacing
            
            # Main message (centered)
            msg_text = "Download from App/Play Store"
            msg_bbox = draw.textbbox((0, 0), msg_text, font=body_font)
            msg_width = msg_bbox[2] - msg_bbox[0]
            msg_x = ad_x + (ad_width - msg_width) // 2
            draw.text((msg_x, current_y), msg_text, font=body_font, fill="#333333")
            current_y += line_spacing
            
            # Coupon code (centered and emphasized)
            code_text = f"Code: {coupon_code}"
            code_bbox = draw.textbbox((0, 0), code_text, font=code_font)
            code_width = code_bbox[2] - code_bbox[0]
            code_x = ad_x + (ad_width - code_width) // 2
            draw.text((code_x, current_y), code_text, font=code_font, fill="#f28914")
            current_y += line_spacing - 10
            
            # Free offer (centered)
            free_text = "First postcard FREE!"
            free_bbox = draw.textbbox((0, 0), free_text, font=body_font)
            free_width = free_bbox[2] - free_bbox[0]
            free_x = ad_x + (ad_width - free_width) // 2
            draw.text((free_x, current_y), free_text, font=body_font, fill="#333333")
            
            print(f"[PROMO] Added larger promotional box above address with code {coupon_code}")
            
            # Track coupon distribution in database
            try:
                db = SessionLocal()
                coupon_record = db.query(CouponCode).filter(CouponCode.code == coupon_code).first()
                if coupon_record:
                    distribution = CouponDistribution(
                        coupon_code_id=coupon_record.id,
                        transaction_id=request.transactionId,
                        recipient_name=request.recipientInfo.to,
                        recipient_address=f"{request.recipientInfo.addressLine1}, {request.recipientInfo.city}, {request.recipientInfo.state} {request.recipientInfo.zipcode}",
                        postcard_size=request.postcardSize
                    )
                    db.add(distribution)
                    db.commit()
                    print(f"[COUPON] Tracked coupon distribution: {distribution.id}")
                db.close()
            except Exception as db_error:
                print(f"[COUPON] Error tracking distribution: {db_error}")
            
        except Exception as e:
            print(f"[COUPON] Error adding promotional code: {e}")

        # Generate back image data
        back_buf = io.BytesIO()
        back_img.save(back_buf, format="JPEG", quality=95)
        back_data = back_buf.getvalue()

        # Generate front image using TemplateEngine
        try:
            if TEMPLATE_ENGINE_AVAILABLE and request.templateType and request.templateType != "single":
                print(f"[TEMPLATE] Creating front image with template: {request.templateType}")
                template_engine = TemplateEngine(request.postcardSize)
                
                # Prepare image URLs for template
                image_urls = []
                if request.frontImageUris and len(request.frontImageUris) > 0:
                    # Use new multi-image array
                    image_urls = request.frontImageUris
                    print(f"[TEMPLATE] Using {len(image_urls)} images from frontImageUris")
                elif request.frontImageUri:
                    # Use legacy single image
                    image_urls = [request.frontImageUri]
                    print(f"[TEMPLATE] Using single image from frontImageUri")
                else:
                    raise Exception("No front images provided")
                
                # Apply template to create front image
                front_img = template_engine.apply_template(request.templateType, image_urls)
            else:
                # Fallback to single image mode
                print("[TEMPLATE] Using fallback single image mode")
                front_image_url = request.frontImageUri or (request.frontImageUris[0] if request.frontImageUris else None)
                if not front_image_url:
                    raise Exception("No front image provided")
                
                # Load single image directly
                with urllib.request.urlopen(front_image_url) as response:
                    front_img = Image.open(response).convert('RGB')
                    # Resize to appropriate postcard dimensions
                    if request.postcardSize == "xl":
                        target_size = (2700, 1800)
                    else:
                        target_size = (1800, 1200)
                    front_img = front_img.resize(target_size, Image.Resampling.LANCZOS)
            
            # Convert to bytes and upload to Cloudinary
            front_buf = io.BytesIO()
            front_img.save(front_buf, format="JPEG", quality=95)
            front_data = front_buf.getvalue()
            
            # Upload front image to Cloudinary
            front_url = upload_to_cloudinary(front_data, f"postcard-front-{request.transactionId}")
            print(f"[TEMPLATE] Front image uploaded to Cloudinary: {front_url[:50]}...")
            
        except Exception as e:
            print(f"[TEMPLATE] Template generation failed, using fallback: {e}")
            # Fallback to original single image logic
            if request.frontImageUri and request.frontImageUri.startswith('http'):
                print(f"[FRONT] Using app-provided Cloudinary URL: {request.frontImageUri[:50]}...")
                front_url = request.frontImageUri
            else:
                print(f"[FRONT] No Cloudinary front image URL provided, creating fallback")
                # Create fallback front image if needed
                front_buf = io.BytesIO()
                back_img.save(front_buf, format="JPEG", quality=95)
                front_data = front_buf.getvalue()
                front_b64 = base64.b64encode(front_data).decode('utf-8')
                front_url = f"data:image/jpeg;base64,{front_b64}"
        
        # Upload back to Cloudinary (front already uploaded by app)
        try:
            back_url = upload_to_cloudinary(back_data, f"postcard-back-{request.transactionId}")
        except Exception as e:
            print(f"[CLOUDINARY] Back upload failed, using data URL: {e}")
            back_b64 = base64.b64encode(back_data).decode('utf-8')
            back_url = f"data:image/jpeg;base64,{back_b64}"
            
        
        # Store transaction info in memory
        # Check if transaction exists and preserve email
        existing_email = ""
        if request.transactionId in transaction_store:
            existing_email = transaction_store[request.transactionId].get("userEmail", "")
        
        # Use provided email or preserve existing email
        final_email = request.userEmail or existing_email
        
        transaction_store[request.transactionId] = {
            "frontUrl": front_url,
            "backUrl": back_url,
            "recipientInfo": request.recipientInfo.model_dump(),
            "message": request.message,
            "postcardSize": request.postcardSize,
            "status": "ready_for_payment",
            "created_at": datetime.now().isoformat(),
            "userEmail": final_email
        }
        
        print(f"[COMPLETE] Stored user email: '{final_email}' for transaction {request.transactionId}")
        
        print(f"[COMPLETE] Generated complete postcard for transaction {request.transactionId}")
        
        return {
            "success": True,
            "transactionId": request.transactionId,
            "frontUrl": front_url,
            "backUrl": back_url,
            "status": "ready_for_payment"
        }

    except Exception as e:
        print(f"[ERROR] Complete postcard generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/payment-confirmed")
async def payment_confirmed(request: PaymentConfirmedRequest):
    """N8N calls this when Stripe payment succeeds"""
    try:
        print(f"[PAYMENT] Payment confirmed for transaction {request.transactionId}")
        
        # Check if promo code was used by looking at Stripe metadata
        try:
            # Retrieve PaymentIntent to check for promo code
            payment_intent = stripe.PaymentIntent.retrieve(request.stripePaymentIntentId)
            promo_code = payment_intent.metadata.get('promo_code')
            
            if promo_code:
                print(f"[PAYMENT] Promo code detected in payment: {promo_code}")
                
                # Track promo code redemption in database
                db = get_db_session()
                try:
                    # Find the coupon code
                    db_coupon = db.query(CouponCode).filter(
                        CouponCode.code == promo_code,
                        CouponCode.is_active == True
                    ).first()
                    
                    if db_coupon:
                        # Create redemption record
                        redemption = CouponRedemption(
                            coupon_code_id=db_coupon.id,
                            transaction_id=request.transactionId,
                            stripe_payment_intent_id=request.stripePaymentIntentId,
                            customer_email=request.userEmail or '',
                            redemption_value_cents=int(payment_intent.metadata.get('discount_amount', 0))
                        )
                        db.add(redemption)
                        
                        # Increment redemption count
                        db_coupon.times_redeemed += 1
                        
                        db.commit()
                        print(f"[PAYMENT] Promo code redemption tracked in database: {promo_code}")
                    else:
                        print(f"[PAYMENT] Promo code {promo_code} not in local database - handled by Stripe directly")
                        
                except Exception as e:
                    print(f"[PAYMENT] Error tracking promo code redemption: {e}")
                    db.rollback()
                finally:
                    db.close()
                    
        except Exception as e:
            print(f"[PAYMENT] Error retrieving PaymentIntent for promo tracking: {e}")
        
        # Update transaction status
        if request.transactionId in transaction_store:
            existing_email = transaction_store[request.transactionId].get("userEmail", "")
            print(f"[PAYMENT] Preserving existing email: '{existing_email}'")
            
            transaction_store[request.transactionId]["status"] = "payment_confirmed"
            transaction_store[request.transactionId]["stripePaymentIntentId"] = request.stripePaymentIntentId
            
            # Only update email if we don't already have one and the request provides one
            if not existing_email and request.userEmail:
                transaction_store[request.transactionId]["userEmail"] = request.userEmail
                print(f"[PAYMENT] Updated email to: '{request.userEmail}'")
            else:
                print(f"[PAYMENT] Keeping existing email: '{existing_email}'")
            
            return {"success": True, "status": "payment_confirmed"}
        else:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
    except Exception as e:
        print(f"[ERROR] Payment confirmation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/submit-to-stannp")
async def submit_to_stannp(request: StannpSubmissionRequest):
    """Submit postcard to Stannp after payment confirmation"""
    try:
        print(f"[STANNP] Submitting transaction {request.transactionId} to Stannp")
        
        # Get transaction data
        if request.transactionId not in transaction_store:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
        txn = transaction_store[request.transactionId]
        print(f"[DEBUG] Full transaction data: {txn}")
        print(f"[DEBUG] Transaction keys: {list(txn.keys())}")
        print(f"[DEBUG] UserEmail value: '{txn.get('userEmail')}' (type: {type(txn.get('userEmail'))})")
        
        if txn["status"] != "payment_confirmed":
            raise HTTPException(status_code=400, detail="Payment not confirmed")
        
        # Submit to Stannp API
        stannp_result = await submit_to_stannp_api(txn)
        
        txn["status"] = "submitted_to_stannp"
        txn["stannp_id"] = stannp_result.get("id", f"stannp_{request.transactionId}")
        
        # Extract PDF URL from Stannp response (nested under 'data')
        pdf_url = stannp_result.get("data", {}).get("pdf")
        print(f"[STANNP] PDF URL from response: {pdf_url}")
        
        # Send confirmation email with PDF link
        stored_email = txn.get("userEmail", "").strip()
        print(f"[EMAIL] Transaction data: userEmail='{stored_email}', hasEmail={bool(stored_email)}")
        if stored_email:
            print(f"[EMAIL] Sending confirmation email to {stored_email}")
            send_email_notification(
                stored_email,
                "🎉 Your Postcard Was Successfully Sent!",
                "",  # Message not used in new template
                pdf_url
            )
        else:
            print(f"[EMAIL] No user email available in transaction {request.transactionId}")
        
        return {
            "success": True,
            "status": "submitted_to_stannp",
            "stannp_id": txn.get("stannp_id")
        }
        
    except Exception as e:
        print(f"[ERROR] Stannp submission failed: {str(e)}")
        
        # Handle failure - notify user and admin
        if request.transactionId in transaction_store:
            txn = transaction_store[request.transactionId]
            
            # Email user about failure
            if txn.get("userEmail"):
                send_email_notification(
                    txn["userEmail"],
                    "Postcard Processing Issue",
                    "Your postcard could not be processed. You will receive a credit within 24 hours."
                )
            
            # Email admin for manual refund
            send_email_notification(
                "info@xlpostcards.com",
                f"Manual Refund Required - {request.transactionId}",
                f"Transaction {request.transactionId} failed Stannp submission. Please issue Stripe refund for payment {txn.get('stripePaymentIntentId')}"
            )
            
            txn["status"] = "failed"
        
        raise HTTPException(status_code=500, detail=str(e))

async def submit_to_stannp_api(txn: dict) -> dict:
    """Submit postcard to Stannp API with retry logic"""
    stannp_api_key = os.getenv("STANNP_API_KEY")
    if not stannp_api_key:
        raise Exception("STANNP_API_KEY not configured")
    
    print(f"[STANNP] Submitting postcard to Stannp API")
    
    # Map recipient info to Stannp format
    recipient = txn["recipientInfo"]
    
    # Debug: Log transaction data before creating Stannp payload
    print(f"[DEBUG][STANNP] Transaction data before Stannp submission:")
    print(f"[DEBUG][STANNP] - frontUrl: {txn.get('frontUrl', 'MISSING')[:80]}{'...' if len(str(txn.get('frontUrl', ''))) > 80 else ''}")
    print(f"[DEBUG][STANNP] - backUrl: {txn.get('backUrl', 'MISSING')[:80]}{'...' if len(str(txn.get('backUrl', ''))) > 80 else ''}")
    print(f"[DEBUG][STANNP] - postcardSize: {txn.get('postcardSize', 'MISSING')}")
    print(f"[DEBUG][STANNP] - recipient keys: {list(recipient.keys())}")
    print(f"[DEBUG][STANNP] - frontUrl type: {type(txn.get('frontUrl'))}")
    print(f"[DEBUG][STANNP] - backUrl type: {type(txn.get('backUrl'))}")
    
    # Validate URLs before sending to Stannp
    front_url = txn.get("frontUrl")
    back_url = txn.get("backUrl")
    
    if not front_url or not back_url:
        raise Exception(f"Missing image URLs - front: {bool(front_url)}, back: {bool(back_url)}")
    
    # Check if URLs are valid Cloudinary URLs (not data URLs)
    if front_url.startswith('data:') or back_url.startswith('data:'):
        print(f"[DEBUG][STANNP] WARNING: Found data URLs instead of Cloudinary URLs")
        print(f"[DEBUG][STANNP] - frontUrl is data URL: {front_url.startswith('data:')}")
        print(f"[DEBUG][STANNP] - backUrl is data URL: {back_url.startswith('data:')}")

    # Prepare Stannp API payload
    environment = os.getenv("ENVIRONMENT", "development").lower()
    is_test_mode = environment != "production"
    stannp_payload = {
        "test": "true" if is_test_mode else "false",
        "size": "6x9" if txn["postcardSize"] == "xl" else "4x6",
        "front": front_url,
        "back": back_url,
        "recipient": {
            "firstname": recipient["to"].split()[0] if recipient["to"] else "Recipient",
            "lastname": " ".join(recipient["to"].split()[1:]) if len(recipient["to"].split()) > 1 else "",
            "address1": recipient["addressLine1"],
            "address2": recipient.get("addressLine2", ""),
            "city": recipient["city"],
            "state": recipient["state"],
            "postcode": recipient["zipcode"],
            "country": "US"
        },
        "clearzone": "true"
    }
    
    # Remove empty address2 if not provided
    if not stannp_payload["recipient"]["address2"]:
        del stannp_payload["recipient"]["address2"]
    
    print(f"[STANNP] Payload: {stannp_payload}")
    
    # Submit to Stannp with retry logic
    headers = {
        "Authorization": f"Basic {base64.b64encode(f'{stannp_api_key}:'.encode()).decode()}",
        "Content-Type": "application/json"
    }
    
    # Retry up to 3 times with increasing timeouts
    for attempt in range(3):
        try:
            timeout = 30 + (attempt * 15)  # 30s, 45s, 60s
            print(f"[STANNP] Attempt {attempt + 1}/3, timeout: {timeout}s")
            
            response = requests.post(
                "https://us.stannp.com/api/v1/postcards/create",
                json=stannp_payload,
                headers=headers,
                timeout=timeout
            )
            
            print(f"[STANNP] Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"[STANNP] Postcard submitted successfully: {result.get('id')}")
                print(f"[STANNP] Full response keys: {list(result.keys())}")
                print(f"[STANNP] PDF URL: {result.get('data', {}).get('pdf', 'Not provided')}")
                return result
            else:
                error_text = response.text
                print(f"[STANNP] Submission failed: {response.status_code} - {error_text}")
                # Don't retry on HTTP errors, only timeouts
                raise Exception(f"Stannp submission failed: {response.status_code} - {error_text}")
                
        except requests.exceptions.Timeout as e:
            print(f"[STANNP] Timeout on attempt {attempt + 1}: {e}")
            if attempt < 2:
                wait_time = 5 * (attempt + 1)  # 5s, 10s
                print(f"[STANNP] Waiting {wait_time}s before retry...")
                await asyncio.sleep(wait_time)
                continue
            else:
                raise Exception(f"Stannp API timeout after 3 attempts: {e}")
                
        except requests.exceptions.ConnectionError as e:
            print(f"[STANNP] Connection error on attempt {attempt + 1}: {e}")
            if attempt < 2:
                wait_time = 5 * (attempt + 1)
                print(f"[STANNP] Waiting {wait_time}s before retry...")
                await asyncio.sleep(wait_time)
                continue
            else:
                raise Exception(f"Stannp API connection error after 3 attempts: {e}")
                
        except Exception as e:
            print(f"[STANNP] Unexpected error on attempt {attempt + 1}: {e}")
            raise Exception(f"Stannp API error: {e}")
    
    raise Exception("Stannp submission failed after all retry attempts")

@app.get("/transaction-status/{transaction_id}")
async def get_transaction_status(transaction_id: str):
    """Get current status of a transaction"""
    if transaction_id in transaction_store:
        return {
            "success": True,
            "transactionId": transaction_id,
            "status": transaction_store[transaction_id]["status"],
            "data": transaction_store[transaction_id]
        }
    else:
        raise HTTPException(status_code=404, detail="Transaction not found")

# Keep existing endpoint for backward compatibility
@app.post("/generate-postcard-back")
async def generate_postcard_back(request: PostcardRequest):
    """Legacy endpoint - generate only back image"""
    try:
        print(f"[LEGACY] Generating {request.postcardSize} postcard back only")
        
        if request.postcardSize == "regular":
            W, H = 1800, 1200
        else:
            W, H = 2754, 1872

        img = Image.new("RGB", (W, H), "white")
        draw = ImageDraw.Draw(img)

        # Load fonts
        body_font = load_font(40)
        addr_font = load_font(36)
        ret_font = load_font(32)

        # Return address with separator
        message_start_y = 150
        if request.returnAddressText and request.returnAddressText != "{{RETURN_ADDRESS}}":
            y = 108
            for line in request.returnAddressText.split("\n")[:3]:
                if line.strip():
                    draw.text((108, y), line.strip(), font=ret_font, fill="black")
                    y += 40
            
            line_y = y + 20
            line_end_x = 1400 if request.postcardSize == "xl" else 900
            draw.line([(108, line_y), (line_end_x, line_y)], fill="black", width=2)
            message_start_y = line_y + 30

        # Process message with line breaks preserved (legacy endpoint)
        max_width = 1400 if request.postcardSize == "xl" else 900
        lines = process_message_with_line_breaks(request.message, max_width, body_font, draw)

        # Draw message with proper line spacing for empty lines
        y = message_start_y
        line_height = 50
        lines_drawn = 0
        
        for line in lines[:20]:  # Limit to 20 lines
            if line.strip():
                # Non-empty line - draw the text
                draw.text((108, y), line, font=body_font, fill="black")
            # Empty lines just add spacing without drawing text
            y += line_height
            lines_drawn += 1
            
        print(f"[LEGACY] Drew {lines_drawn} lines with preserved line breaks")

        x = W - 800 if request.postcardSize == "xl" else W - 680
        y = H - 360
        r = request.recipientInfo
        
        for line in filter(None, [
            r.to,
            r.addressLine1,
            r.addressLine2,
            f"{r.city}, {r.state} {r.zipcode}".strip(", ")
        ]):
            draw.text((x, y), line, font=addr_font, fill="black")
            y += 46

        # Add XLPostcards logo to lower left corner (legacy endpoint)
        try:
            logo_path = os.path.join(os.path.dirname(__file__), "Assets", "Images", "BW Icon - Back.png")
            if os.path.exists(logo_path):
                logo_img = Image.open(logo_path).convert("RGBA")
                
                # Scale logo based on postcard size (2x bigger)
                if request.postcardSize == "xl":
                    logo_width = 600  # 2x larger for XL postcards (was 300)
                else:
                    logo_width = 400  # 2x larger for regular postcards (was 200)
                
                # Calculate height maintaining aspect ratio
                aspect_ratio = logo_img.height / logo_img.width
                logo_height = int(logo_width * aspect_ratio)
                logo_img = logo_img.resize((logo_width, logo_height), Image.Resampling.LANCZOS)
                
                # Position in lower left corner with some padding
                logo_x = 50
                logo_y = H - logo_height - 50
                
                # Paste logo with transparency support
                img.paste(logo_img, (logo_x, logo_y), logo_img)
                print(f"[LEGACY LOGO] Added XLPostcards logo to postcard back at ({logo_x}, {logo_y})")
            else:
                print(f"[LEGACY LOGO] Logo file not found at: {logo_path}")
        except Exception as e:
            print(f"[LEGACY LOGO] Error adding logo: {e}")

        # Add promotional advertisement in upper right corner (legacy endpoint)
        try:
            # Use monthly coupon code for all postcards (first-time customers only)
            coupon_code = get_next_month_coupon_code()
            
            # Position promotional box above address block (bigger size)
            if request.postcardSize == "xl":
                # XL postcard (9x6 inches) - bigger box above address
                ad_width = 700  # Much larger width
                ad_height = 300  # Much larger height
                ad_x = W - ad_width - 50  # Position above address block
                ad_y = 100  # Higher up to be above address
                title_font = load_font(36)
                body_font = load_font(28)
                code_font = load_font(32)
                line_spacing = 40
            else:
                # Regular postcard (4x6 inches) - bigger box above address
                ad_width = 500  # Much larger width  
                ad_height = 220  # Much larger height
                ad_x = W - ad_width - 40  # Position above address block
                ad_y = 80   # Higher up to be above address
                title_font = load_font(28)
                body_font = load_font(22)
                code_font = load_font(26)
                line_spacing = 32
            
            # Draw rounded rectangle background for advertisement
            def draw_rounded_rectangle(draw, xy, radius, fill):
                """Draw a rounded rectangle"""
                x1, y1, x2, y2 = xy
                # Draw main rectangle
                draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
                draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
                # Draw corners
                draw.pieslice([x1, y1, x1 + radius * 2, y1 + radius * 2], 180, 270, fill=fill)
                draw.pieslice([x2 - radius * 2, y1, x2, y1 + radius * 2], 270, 360, fill=fill)
                draw.pieslice([x1, y2 - radius * 2, x1 + radius * 2, y2], 90, 180, fill=fill)
                draw.pieslice([x2 - radius * 2, y2 - radius * 2, x2, y2], 0, 90, fill=fill)
            
            # Draw advertisement background with subtle border
            draw_rounded_rectangle(
                draw,
                [ad_x, ad_y, ad_x + ad_width, ad_y + ad_height],
                15,
                "#f8f8f8"
            )
            
            # Add thicker border for bigger box
            draw.rectangle([ad_x + 3, ad_y + 3, ad_x + ad_width - 3, ad_y + ad_height - 3], outline="#f28914", width=6)
            
            # Add promotional text content (centered in bigger box)
            text_x = ad_x + 25
            current_y = ad_y + 25
            
            # Calculate center positions for text
            title_text = "Get XLPostcards App!"
            title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
            title_width = title_bbox[2] - title_bbox[0]
            title_x = ad_x + (ad_width - title_width) // 2
            
            # Title (centered)
            draw.text((title_x, current_y), title_text, font=title_font, fill="#f28914")
            current_y += line_spacing
            
            # Main message (centered)
            msg_text = "Download from App/Play Store"
            msg_bbox = draw.textbbox((0, 0), msg_text, font=body_font)
            msg_width = msg_bbox[2] - msg_bbox[0]
            msg_x = ad_x + (ad_width - msg_width) // 2
            draw.text((msg_x, current_y), msg_text, font=body_font, fill="#333333")
            current_y += line_spacing
            
            # Coupon code (centered and emphasized)
            code_text = f"Code: {coupon_code}"
            code_bbox = draw.textbbox((0, 0), code_text, font=code_font)
            code_width = code_bbox[2] - code_bbox[0]
            code_x = ad_x + (ad_width - code_width) // 2
            draw.text((code_x, current_y), code_text, font=code_font, fill="#f28914")
            current_y += line_spacing - 10
            
            # Free offer (centered)
            free_text = "First postcard FREE!"
            free_bbox = draw.textbbox((0, 0), free_text, font=body_font)
            free_width = free_bbox[2] - free_bbox[0]
            free_x = ad_x + (ad_width - free_width) // 2
            draw.text((free_x, current_y), free_text, font=body_font, fill="#333333")
            
            print(f"[LEGACY PROMO] Added larger promotional box above address with code {coupon_code}")
            
            # Track coupon distribution in database (legacy endpoint)
            try:
                db = SessionLocal()
                coupon_record = db.query(CouponCode).filter(CouponCode.code == coupon_code).first()
                if coupon_record:
                    distribution = CouponDistribution(
                        coupon_code_id=coupon_record.id,
                        transaction_id=request.transactionId,
                        recipient_name=request.recipientInfo.to,
                        recipient_address=f"{request.recipientInfo.addressLine1}, {request.recipientInfo.city}, {request.recipientInfo.state} {request.recipientInfo.zipcode}",
                        postcard_size=request.postcardSize
                    )
                    db.add(distribution)
                    db.commit()
                    print(f"[LEGACY COUPON] Tracked coupon distribution: {distribution.id}")
                db.close()
            except Exception as db_error:
                print(f"[LEGACY COUPON] Error tracking distribution: {db_error}")
            
        except Exception as e:
            print(f"[LEGACY COUPON] Error adding promotional code: {e}")

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=95)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return {
            "success": True,
            "imageUrl": f"data:image/jpeg;base64,{b64}",
            "postcard_back_url": f"data:image/jpeg;base64,{b64}",
            "transactionId": request.transactionId,
            "isTestMode": True
        }

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== STRIPE PAYMENT ENDPOINTS ====================

@app.post("/create-payment-intent")
async def create_payment_intent(request: Request):
    """Create Stripe PaymentIntent for mobile app payment sheet"""
    try:
        body = await request.json()
        original_amount = body.get('amount', 199)
        transaction_id = body.get('transactionId')
        promo_code = body.get('promoCode')
        discount_percent = body.get('discountPercent', 0)
        
        print(f"[STRIPE] Creating PaymentIntent for transaction: {transaction_id}, original amount: {original_amount}")
        
        final_amount = original_amount
        metadata = {
            'transaction_id': transaction_id,
            'service': 'xlpostcards',
            'original_amount': str(original_amount)
        }
        
        # Apply promo code discount if provided
        if promo_code and discount_percent > 0:
            discount_amount = int(original_amount * discount_percent / 100)
            final_amount = original_amount - discount_amount
            
            # Ensure minimum charge (Stripe minimum is $0.50)
            if final_amount < 50:
                final_amount = 50
            
            metadata['promo_code'] = promo_code
            metadata['discount_percent'] = str(discount_percent)
            metadata['discount_amount'] = str(discount_amount)
            metadata['final_amount'] = str(final_amount)
            
            print(f"[STRIPE] Promo code {promo_code} applied: {discount_percent}% off, final amount: {final_amount}")
        
        # Create PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=final_amount,
            currency='usd',
            metadata=metadata
        )
        
        print(f"[STRIPE] PaymentIntent created: {intent.id}")
        
        return {
            "success": True,
            "clientSecret": intent.client_secret,
            "paymentIntentId": intent.id,
            "original_amount": original_amount,
            "final_amount": final_amount,
            "discount_applied": discount_percent > 0,
            "discount_percent": discount_percent if discount_percent > 0 else None
        }
        
    except Exception as e:
        print(f"[STRIPE] PaymentIntent creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PaymentIntent creation failed: {str(e)}")

@app.post("/process-android-purchase")
async def process_android_purchase(request: Request):
    """Process Android IAP purchase verification"""
    try:
        body = await request.json()
        transaction_id = body.get('transactionId')
        purchase_token = body.get('purchaseToken')
        platform = body.get('platform', 'android')
        
        print(f"[ANDROID] Processing purchase for transaction: {transaction_id}")
        print(f"[ANDROID] Platform: {platform}, Purchase token: {purchase_token[:20]}...")
        
        # Here you would typically verify the purchase token with Google Play
        # For now, we'll just acknowledge the purchase
        
        return {
            "success": True,
            "transactionId": transaction_id,
            "status": "purchase_verified",
            "platform": platform
        }
        
    except Exception as e:
        print(f"[ANDROID] Purchase processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Android purchase processing failed: {str(e)}")

# ==================== EXISTING STRIPE CHECKOUT ENDPOINTS ====================

@app.post("/create-payment-session")
async def create_payment_session(request: CreatePaymentSessionRequest):
    """Create Stripe checkout session for postcard payment"""
    try:
        print(f"[STRIPE] Creating payment session for postcard")
        print(f"[STRIPE] User email: {request.userEmail}")
        print(f"[STRIPE] Postcard size: {request.postcardSize}")
        print(f"[STRIPE] Success URL: {request.successUrl}")
        print(f"[STRIPE] Cancel URL: {request.cancelUrl}")
        
        # Generate unique transaction ID for this payment
        import uuid
        transaction_id = str(uuid.uuid4())
        
        # Store the postcard data temporarily (will be processed after payment)
        payment_sessions[transaction_id] = {
            "message": request.message,
            "recipientInfo": request.recipientInfo.model_dump(),
            "postcardSize": request.postcardSize,
            "returnAddressText": request.returnAddressText,
            "frontImageUri": request.frontImageUri,
            "userEmail": request.userEmail,
            "status": "pending_payment",
            "created_at": datetime.now().isoformat()
        }
        
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'XL Postcard',
                        'description': f'{request.postcardSize.upper()} postcard delivery'
                    },
                    'unit_amount': 199,  # $1.99 in cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=request.successUrl + f"?transaction_id={transaction_id}",
            cancel_url=request.cancelUrl + f"?transaction_id={transaction_id}",
            customer_email=request.userEmail if request.userEmail else None,
            metadata={
                'transaction_id': transaction_id,
                'service': 'xlpostcards',
                'postcard_size': request.postcardSize
            }
        )
        
        # Store session info
        payment_sessions[transaction_id]["stripe_session_id"] = checkout_session.id
        payment_sessions[transaction_id]["checkout_url"] = checkout_session.url
        
        print(f"[STRIPE] Payment session created: {checkout_session.id}")
        print(f"[STRIPE] Transaction ID: {transaction_id}")
        
        return PaymentSessionResponse(
            success=True,
            sessionId=checkout_session.id,
            checkoutUrl=checkout_session.url,
            transactionId=transaction_id
        )
        
    except Exception as e:
        print(f"[STRIPE] Payment session creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment session creation failed: {str(e)}")

@app.post("/stripe-webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        
        if not STRIPE_WEBHOOK_SECRET:
            print("[WEBHOOK] WARNING: No webhook secret configured")
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
        else:
            try:
                event = stripe.Webhook.construct_event(
                    payload, stripe_signature, STRIPE_WEBHOOK_SECRET
                )
            except ValueError:
                print("[WEBHOOK] Invalid payload")
                raise HTTPException(status_code=400, detail="Invalid payload")
            except stripe.error.SignatureVerificationError:
                print("[WEBHOOK] Invalid signature")
                raise HTTPException(status_code=400, detail="Invalid signature")
        
        print(f"[WEBHOOK] Received event: {event['type']}")
        
        # Handle successful payment from checkout session (web checkout)
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            transaction_id = session['metadata'].get('transaction_id')
            
            print(f"[WEBHOOK] Checkout session completed for transaction: {transaction_id}")
            
            if transaction_id and transaction_id in payment_sessions:
                # Update payment status
                payment_sessions[transaction_id]["status"] = "payment_completed"
                payment_sessions[transaction_id]["stripe_payment_intent_id"] = session.get('payment_intent')
                payment_sessions[transaction_id]["payment_completed_at"] = datetime.now().isoformat()
                
                # Process the postcard asynchronously
                asyncio.create_task(process_paid_postcard(transaction_id))
                
            else:
                print(f"[WEBHOOK] Transaction not found: {transaction_id}")
        
        # Handle successful payment from PaymentIntent (Payment Sheet)
        elif event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            transaction_id = payment_intent['metadata'].get('transaction_id')
            
            print(f"[WEBHOOK] PaymentIntent succeeded for transaction: {transaction_id}")
            
            # Check if promotional code was used (Stripe handles validation automatically)
            charges = payment_intent.get('charges', {}).get('data', [])
            if charges:
                charge = charges[0]
                discount = charge.get('discount')
                if discount:
                    promo_code = discount.get('promotion_code', '')
                    coupon_id = discount.get('coupon', {}).get('id', '')
                    print(f"[WEBHOOK] Promotional code used: {promo_code}, Coupon: {coupon_id}")
                    
                    # Track redemption in database
                    try:
                        db = SessionLocal()
                        # Find the coupon by Stripe coupon ID
                        coupon_record = db.query(CouponCode).filter(
                            CouponCode.stripe_coupon_id == coupon_id
                        ).first()
                        
                        if coupon_record:
                            # Create redemption record
                            redemption = CouponRedemption(
                                coupon_code_id=coupon_record.id,
                                transaction_id=transaction_id,
                                stripe_payment_intent_id=payment_intent['id'],
                                customer_email=payment_intent.get('receipt_email', ''),
                                redemption_value_cents=payment_intent.get('amount', 299)
                            )
                            db.add(redemption)
                            
                            # Update coupon redemption count
                            coupon_record.times_redeemed = (coupon_record.times_redeemed or 0) + 1
                            
                            db.commit()
                            print(f"[WEBHOOK] Tracked coupon redemption: {redemption.id}")
                        else:
                            print(f"[WEBHOOK] Coupon record not found for Stripe ID: {coupon_id}")
                        
                        db.close()
                    except Exception as db_error:
                        print(f"[WEBHOOK] Error tracking redemption: {db_error}")
                    
                    # Stripe automatically handles first-time customer validation
            
            if transaction_id and transaction_id in transaction_store:
                # Update transaction status
                transaction_store[transaction_id]["status"] = "payment_confirmed"
                transaction_store[transaction_id]["stripePaymentIntentId"] = payment_intent['id']
                transaction_store[transaction_id]["payment_completed_at"] = datetime.now().isoformat()
                
                print(f"[WEBHOOK] Processing PaymentIntent postcard for transaction: {transaction_id}")
                
                # Submit to Stannp directly
                try:
                    stannp_request = StannpSubmissionRequest(transactionId=transaction_id)
                    asyncio.create_task(submit_to_stannp(stannp_request))
                    print(f"[WEBHOOK] Stannp submission initiated for transaction: {transaction_id}")
                except Exception as e:
                    print(f"[WEBHOOK] Error initiating Stannp submission: {e}")
                    
                    # Send error notifications
                    txn = transaction_store.get(transaction_id, {})
                    user_email = txn.get("userEmail")
                    payment_intent_id = payment_intent['id']
                    
                    # Email user about failure
                    if user_email:
                        send_email_notification(
                            user_email,
                            "Postcard Processing Issue",
                            "Your payment was successful but we encountered an issue processing your postcard. Our team has been notified and will resolve this shortly. You will receive a credit or your postcard will be sent within 24 hours."
                        )
                    
                    # Email admin for manual refund
                    send_email_notification(
                        "info@xlpostcards.com",
                        f"Manual Refund Required - {transaction_id}",
                        f"Transaction {transaction_id} failed Stannp submission after successful payment. Please issue Stripe refund for PaymentIntent {payment_intent_id}. User email: {user_email or 'not provided'}"
                    )
                    
                    # Mark transaction as failed
                    transaction_store[transaction_id]["status"] = "failed"
                
            else:
                print(f"[WEBHOOK] Transaction not found in transaction_store: {transaction_id}")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"[WEBHOOK] Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_paid_postcard(transaction_id: str):
    """Process postcard after successful payment"""
    try:
        print(f"[POSTCARD] Processing paid postcard: {transaction_id}")
        
        session_data = payment_sessions.get(transaction_id)
        if not session_data:
            print(f"[POSTCARD] Session data not found: {transaction_id}")
            return
        
        # Create the complete postcard (front + back)
        postcard_request = PostcardRequest(
            message=session_data["message"],
            recipientInfo=Recipient(**session_data["recipientInfo"]),
            postcardSize=session_data["postcardSize"],
            returnAddressText=session_data["returnAddressText"],
            transactionId=transaction_id,
            frontImageUri=session_data["frontImageUri"],
            userEmail=session_data["userEmail"]
        )
        
        # Generate complete postcard
        print(f"[POSTCARD] Generating complete postcard for {transaction_id}")
        result = await generate_complete_postcard(postcard_request)
        
        # Submit to Stannp
        print(f"[POSTCARD] Submitting to Stannp: {transaction_id}")
        stannp_request = StannpSubmissionRequest(transactionId=transaction_id)
        await submit_to_stannp(stannp_request)
        
        print(f"[POSTCARD] Successfully processed paid postcard: {transaction_id}")
        
    except Exception as e:
        print(f"[POSTCARD] Error processing paid postcard {transaction_id}: {str(e)}")
        
        # Send failure notification
        if session_data and session_data.get("userEmail"):
            send_email_notification(
                session_data["userEmail"],
                "Postcard Processing Issue",
                "Your payment was successful but we encountered an issue processing your postcard. Our team has been notified and will resolve this shortly. You will receive a credit or your postcard will be sent within 24 hours."
            )

@app.get("/payment-status/{transaction_id}")
async def get_payment_status(transaction_id: str):
    """Get payment and processing status"""
    if transaction_id in payment_sessions:
        session_data = payment_sessions[transaction_id]
        return {
            "success": True,
            "transaction_id": transaction_id,
            "status": session_data["status"],
            "created_at": session_data.get("created_at"),
            "payment_completed_at": session_data.get("payment_completed_at"),
            "postcard_submitted_at": session_data.get("postcard_submitted_at")
        }
    elif transaction_id in transaction_store:
        # Check legacy transaction store
        txn = transaction_store[transaction_id]
        return {
            "success": True,
            "transaction_id": transaction_id,
            "status": txn["status"],
            "created_at": txn.get("created_at")
        }
    else:
        raise HTTPException(status_code=404, detail="Transaction not found")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PostcardService", "version": "2.1.1"}

@app.post("/log-app-error")
async def log_app_error(error_log: AppErrorLog):
    """Receive and log client-side errors from React Native app"""
    try:
        timestamp = error_log.timestamp
        level = error_log.level.upper()
        message = error_log.message
        build_info = error_log.buildInfo
        
        # Format log message for Railway logs
        log_msg = f"[CLIENT-{level}] {timestamp} | {message}"
        if error_log.stackTrace:
            log_msg += f" | Stack: {error_log.stackTrace[:200]}..."
        
        log_msg += f" | Build: {build_info.get('version', 'unknown')} ({build_info.get('variant', 'unknown')})"
        
        print(log_msg)
        
        # You could also store in database here if needed
        return {"success": True, "logged": True}
        
    except Exception as e:
        print(f"[ERROR] Failed to log client error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/create-monthly-coupon")
async def create_monthly_coupon_endpoint():
    """Manually trigger creation of next month's coupon"""
    try:
        result = await create_monthly_coupon()
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/coupon-status")
async def get_coupon_status():
    """Get current month's coupon information and usage"""
    try:
        details = get_next_month_details()
        coupon_code = details["coupon_code"]
        coupon_id = f"xlwelcome-{details['month_name'].lower()}-{details['year']}"
        
        # Check if coupon exists in Stripe
        try:
            coupon = stripe.Coupon.retrieve(coupon_id)
            
            # Get promotional code details
            promo_codes = stripe.PromotionCode.list(code=coupon_code, limit=1)
            promo_code = promo_codes.data[0] if promo_codes.data else None
            
            return {
                "success": True,
                "current_code": coupon_code,
                "coupon_exists": True,
                "coupon_id": coupon_id,
                "max_redemptions": coupon.max_redemptions,
                "times_redeemed": coupon.times_redeemed,
                "remaining_redemptions": (coupon.max_redemptions or 0) - (coupon.times_redeemed or 0),
                "expires": details["expiry_date"].strftime("%Y-%m-%d"),
                "promo_code_active": promo_code.active if promo_code else False
            }
            
        except stripe.error.InvalidRequestError:
            return {
                "success": True,
                "current_code": coupon_code,
                "coupon_exists": False,
                "message": "Coupon needs to be created",
                "expires": details["expiry_date"].strftime("%Y-%m-%d")
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/validate-promo-code")
async def validate_promo_code(request: PromoCodeValidationRequest):
    """Validate a promo code and return discount information"""
    try:
        code = request.code.strip().upper()
        print(f"[PROMO] Validating promo code: {code}")
        
        if not code:
            return {
                "valid": False,
                "message": "Please enter a promo code"
            }
        
        # Get database session
        db = get_db_session()
        
        if not db:
            print(f"[PROMO] Database unavailable, checking Stripe directly: {code}")
            # Fall back to Stripe-only validation
            try:
                promo_codes = stripe.PromotionCode.list(code=code, limit=1)
                if promo_codes.data:
                    promo_code_obj = promo_codes.data[0]
                    if promo_code_obj.active:
                        coupon = stripe.Coupon.retrieve(promo_code_obj.coupon.id)
                        if coupon.valid and (not coupon.max_redemptions or coupon.times_redeemed < coupon.max_redemptions):
                            return {
                                "valid": True,
                                "code": code,
                                "discount_percent": coupon.percent_off or 100,
                                "message": f"Promo code applied! {coupon.percent_off or 100}% off your postcard.",
                                "remaining_uses": (coupon.max_redemptions or 500) - (coupon.times_redeemed or 0)
                            }
                return {
                    "valid": False,
                    "message": "Invalid promo code"
                }
            except Exception as stripe_error:
                print(f"[PROMO] Stripe validation failed: {stripe_error}")
                return {
                    "valid": False,
                    "message": "Unable to validate promo code. Please try again."
                }
        
        try:
            # Check if code exists in our database
            db_coupon = db.query(CouponCode).filter(
                CouponCode.code == code,
                CouponCode.is_active == True
            ).first()
            
            if not db_coupon:
                print(f"[PROMO] Code not found in database, checking Stripe: {code}")
                
                # Check Stripe directly for the promo code
                try:
                    promo_codes = stripe.PromotionCode.list(code=code, limit=1)
                    if promo_codes.data:
                        promo_code_obj = promo_codes.data[0]
                        if promo_code_obj.active:
                            # Get the associated coupon
                            coupon = stripe.Coupon.retrieve(promo_code_obj.coupon.id)
                            
                            # Check if coupon is still valid
                            if coupon.valid and (not coupon.max_redemptions or coupon.times_redeemed < coupon.max_redemptions):
                                print(f"[PROMO] Found valid code in Stripe: {code}")
                                return {
                                    "valid": True,
                                    "code": code,
                                    "discount_percent": coupon.percent_off or 100,
                                    "message": f"Promo code applied! {coupon.percent_off or 100}% off your postcard.",
                                    "remaining_uses": (coupon.max_redemptions or 500) - (coupon.times_redeemed or 0)
                                }
                    
                    print(f"[PROMO] Code not found in Stripe either: {code}")
                    return {
                        "valid": False,
                        "message": "Invalid promo code"
                    }
                    
                except Exception as stripe_error:
                    print(f"[PROMO] Stripe lookup failed: {stripe_error}")
                    return {
                        "valid": False,
                        "message": "Invalid promo code"
                    }
            
            # Check if code has expired
            if db_coupon.expires_at and datetime.utcnow() > db_coupon.expires_at:
                print(f"[PROMO] Code expired: {code}")
                return {
                    "valid": False,
                    "message": "This promo code has expired"
                }
            
            # Check if code has reached max redemptions
            if db_coupon.times_redeemed >= db_coupon.max_redemptions:
                print(f"[PROMO] Code max redemptions reached: {code}")
                return {
                    "valid": False,
                    "message": "This promo code has reached its usage limit"
                }
            
            # Get campaign details for discount percentage
            campaign = db.query(CouponCampaign).filter(
                CouponCampaign.id == db_coupon.campaign_id
            ).first()
            
            discount_percent = campaign.discount_percent if campaign else 100
            
            print(f"[PROMO] Valid code: {code}, discount: {discount_percent}%")
            
            return {
                "valid": True,
                "code": code,
                "discount_percent": discount_percent,
                "message": f"Promo code applied! {discount_percent}% off your postcard.",
                "remaining_uses": db_coupon.max_redemptions - db_coupon.times_redeemed
            }
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"[PROMO] Error validating promo code: {e}")
        return {
            "valid": False,
            "message": "Unable to validate promo code. Please try again."
        }

@app.post("/process-free-postcard")
async def process_free_postcard(request: FreePostcardRequest):
    """Process a completely free postcard with 100% discount promo code"""
    try:
        print(f"[FREE] Processing free postcard with promo: {request.promoCode}")
        
        # Validate the promo code first
        validation_request = PromoCodeValidationRequest(
            code=request.promoCode,
            transactionId=request.transactionId
        )
        validation_result = await validate_promo_code(validation_request)
        
        if not validation_result.get("valid") or validation_result.get("discount_percent") != 100:
            return {
                "success": False,
                "error": "Invalid promo code or not 100% discount"
            }
        
        # Track customer if email provided
        customer_id = None
        if request.userEmail:
            db = get_db_session()
            if db:
                try:
                    # Check if customer exists
                    customer = db.query(Customer).filter(Customer.email == request.userEmail).first()
                    
                    if not customer:
                        # Create new customer
                        customer = Customer(
                            email=request.userEmail,
                            total_orders=1,
                            total_spent_cents=0,  # Free postcard
                            first_order_date=func.now(),
                            last_order_date=func.now()
                        )
                        db.add(customer)
                        db.commit()
                        db.refresh(customer)
                        print(f"[FREE] Created new customer: {request.userEmail}")
                    else:
                        # Update existing customer
                        customer.total_orders += 1
                        customer.last_order_date = func.now()
                        db.commit()
                        print(f"[FREE] Updated existing customer: {request.userEmail}")
                    
                    customer_id = customer.id
                    
                except Exception as e:
                    print(f"[FREE] Error tracking customer: {e}")
                    db.rollback()
                finally:
                    db.close()
        
        # Generate the postcard
        print(f"[FREE] Generating postcard for transaction: {request.transactionId}")
        
        # Use the same generation logic but skip payment
        postcard_request = PostcardRequest(
            message=request.message,
            recipientInfo=request.recipientInfo,
            postcardSize=request.postcardSize,
            returnAddressText=request.returnAddressText,
            transactionId=request.transactionId,
            frontImageUri=request.frontImageUri or (request.frontImageUris[0] if request.frontImageUris else ""),
            frontImageUris=request.frontImageUris,
            templateType=request.templateType,
            userEmail=request.userEmail
        )
        
        result = await generate_complete_postcard(postcard_request)
        
        # Track promo code redemption
        if result.get("success"):
            db = get_db_session()
            if db:
                try:
                    # Find the coupon code
                    db_coupon = db.query(CouponCode).filter(
                        CouponCode.code == request.promoCode.upper(),
                        CouponCode.is_active == True
                    ).first()
                    
                    if db_coupon:
                        # Create redemption record
                        redemption = CouponRedemption(
                            coupon_code_id=db_coupon.id,
                            transaction_id=request.transactionId,
                            stripe_payment_intent_id="FREE_PROMO",
                            customer_email=request.userEmail or '',
                            redemption_value_cents=299  # Full value saved
                        )
                        db.add(redemption)
                        
                        # Increment redemption count
                        db_coupon.times_redeemed += 1
                        
                        db.commit()
                        print(f"[FREE] Promo code redemption tracked: {request.promoCode}")
                        
                except Exception as e:
                    print(f"[FREE] Error tracking promo redemption: {e}")
                    db.rollback()
                finally:
                    db.close()
            
            # Submit directly to Stannp (skip payment)
            print(f"[FREE] Submitting free postcard to Stannp...")
            
            # Mark as payment confirmed first
            if request.transactionId in transaction_store:
                transaction_store[request.transactionId]["status"] = "payment_confirmed"
                transaction_store[request.transactionId]["stripePaymentIntentId"] = "FREE_PROMO"
                transaction_store[request.transactionId]["userEmail"] = request.userEmail or ""
            
            # Now submit to Stannp
            stannp_request = StannpSubmissionRequest(transactionId=request.transactionId)
            stannp_result = await submit_to_stannp(stannp_request)
            
            return {
                "success": True,
                "message": "Free postcard processed successfully!",
                "transaction_id": request.transactionId,
                "promo_code": request.promoCode,
                "customer_id": customer_id
            }
        else:
            return {
                "success": False,
                "error": "Failed to generate postcard"
            }
            
    except Exception as e:
        print(f"[FREE] Error processing free postcard: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/coupon-analytics")
async def get_coupon_analytics():
    """Get comprehensive coupon analytics"""
    db = SessionLocal()
    try:
        # Current month's performance
        current_code = get_next_month_coupon_code()
        current_coupon = db.query(CouponCode).filter(CouponCode.code == current_code).first()
        
        analytics = {
            "current_month": {
                "code": current_code,
                "exists": current_coupon is not None
            }
        }
        
        if current_coupon:
            # Get distribution and redemption stats
            distributions = db.query(CouponDistribution).filter(
                CouponDistribution.coupon_code_id == current_coupon.id
            ).count()
            
            redemptions = db.query(CouponRedemption).filter(
                CouponRedemption.coupon_code_id == current_coupon.id
            ).count()
            
            analytics["current_month"].update({
                "postcards_sent": distributions,
                "redemptions": redemptions,
                "redemption_rate": round((redemptions / distributions * 100), 2) if distributions > 0 else 0,
                "remaining_redemptions": current_coupon.max_redemptions - current_coupon.times_redeemed,
                "expires": current_coupon.expires_at.strftime("%Y-%m-%d") if current_coupon.expires_at else None
            })
        
        # All-time stats
        total_campaigns = db.query(CouponCampaign).count()
        total_codes = db.query(CouponCode).count()
        total_distributions = db.query(CouponDistribution).count()
        total_redemptions = db.query(CouponRedemption).count()
        
        analytics["all_time"] = {
            "campaigns": total_campaigns,
            "codes_created": total_codes,
            "postcards_sent": total_distributions,
            "total_redemptions": total_redemptions,
            "overall_redemption_rate": round((total_redemptions / total_distributions * 100), 2) if total_distributions > 0 else 0
        }
        
        # Recent activity (last 5 codes)
        recent_codes = db.query(CouponCode).order_by(CouponCode.created_at.desc()).limit(5).all()
        analytics["recent_codes"] = []
        
        for code in recent_codes:
            distributions = db.query(CouponDistribution).filter(
                CouponDistribution.coupon_code_id == code.id
            ).count()
            
            redemptions = db.query(CouponRedemption).filter(
                CouponRedemption.coupon_code_id == code.id
            ).count()
            
            analytics["recent_codes"].append({
                "code": code.code,
                "created": code.created_at.strftime("%Y-%m-%d"),
                "expires": code.expires_at.strftime("%Y-%m-%d") if code.expires_at else None,
                "postcards_sent": distributions,
                "redemptions": redemptions,
                "redemption_rate": round((redemptions / distributions * 100), 2) if distributions > 0 else 0
            })
        
        return {
            "success": True,
            "analytics": analytics
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close()


@app.post("/test-email")
async def test_email(email: str = "test@example.com"):
    """Test endpoint for Resend email functionality"""
    try:
        send_email_notification(
            email,
            "XLPostcards Test Email",
            "This is a test email to verify Resend integration is working correctly.",
            "https://example.com/test-pdf"
        )
        return {"success": True, "message": f"Test email sent to {email}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/manual-process-payment")
async def manual_process_payment(request: Request):
    """Manually trigger payment processing and Stannp submission for testing"""
    try:
        body = await request.json()
        transaction_id = body.get('transactionId')
        payment_intent_id = body.get('paymentIntentId', 'manual_test')
        
        print(f"[MANUAL] Processing payment manually for transaction: {transaction_id}")
        
        if not transaction_id:
            raise HTTPException(status_code=400, detail="transactionId is required")
        
        if transaction_id not in transaction_store:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Update transaction status
        transaction_store[transaction_id]["status"] = "payment_confirmed"
        transaction_store[transaction_id]["stripePaymentIntentId"] = payment_intent_id
        transaction_store[transaction_id]["payment_completed_at"] = datetime.now().isoformat()
        
        print(f"[MANUAL] Submitting to Stannp for transaction: {transaction_id}")
        
        # Submit to Stannp
        stannp_request = StannpSubmissionRequest(transactionId=transaction_id)
        result = await submit_to_stannp(stannp_request)
        
        return {
            "success": True,
            "message": f"Payment processed and submitted to Stannp for transaction {transaction_id}",
            "result": result
        }
        
    except Exception as e:
        print(f"[MANUAL] Error processing payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
