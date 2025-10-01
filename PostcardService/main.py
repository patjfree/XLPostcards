from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from PIL import Image, ImageDraw, ImageFont
import io, base64, os, tempfile, urllib.request, requests
import asyncio, time, hmac, hashlib
from datetime import datetime
import cloudinary
import cloudinary.uploader
import resend
import stripe
import json
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
        
        # Add center overlay image (5th image) - smaller and centered
        center_size = (int(quarter_width * 0.7), int(quarter_height * 0.7))
        center_image = self._load_image_from_url(image_urls[4])
        center_image = self._resize_and_crop(center_image, center_size)
        
        # Calculate center position
        center_x = (self.width - center_size[0]) // 2
        center_y = (self.height - center_size[1]) // 2
        
        canvas.paste(center_image, (center_x, center_y))
        
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

TEMPLATE_ENGINE_AVAILABLE = True
print("[STARTUP] TemplateEngine embedded successfully")

app = FastAPI()

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

# In-memory transaction storage (will be replaced with database)
transaction_store = {}
payment_sessions = {}  # Store payment session data

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
    """Send email notification using Resend"""
    try:
        if not resend.api_key:
            print(f"[EMAIL] WARNING: Resend API key not configured, skipping email to {to_email}")
            return
            
        print(f"[EMAIL] Sending email to {to_email}: {subject}")
        
        # Create HTML message with optional PDF link
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">XLPostcards</h2>
                <p>{message}</p>
                {f'<p><strong>PDF Link:</strong> <a href="{pdf_url}" target="_blank">View your postcard</a></p>' if pdf_url else ''}
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">
                    This email was sent automatically by XLPostcards.<br>
                    If you have any questions, please contact support.
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

        # Address block
        x = W - 700
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
                "Your Postcard Was Delivered Successfully!",
                "Your postcard has been submitted for printing and mailing. You can view a copy of your postcard using the link below.",
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
        "size": "6x9" if txn["postcardSize"] == "xl" else "A6",
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

        x = W - 700
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
        amount = body.get('amount', 199)
        transaction_id = body.get('transactionId')
        
        print(f"[STRIPE] Creating PaymentIntent for transaction: {transaction_id}, amount: {amount}")
        
        # Create PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            metadata={
                'transaction_id': transaction_id,
                'service': 'xlpostcards'
            }
        )
        
        print(f"[STRIPE] PaymentIntent created: {intent.id}")
        
        return {
            "success": True,
            "clientSecret": intent.client_secret,
            "paymentIntentId": intent.id
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
