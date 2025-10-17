"""
Postcard Generation Service

This module contains the business logic for generating complete postcards,
extracted from the main FastAPI route handler for better maintainability.
"""

import io
import base64
import os
import tempfile
import urllib.request
import calendar
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from PIL import Image, ImageDraw, ImageFont
import cloudinary
import cloudinary.uploader
from sqlalchemy.orm import Session

# Import enhanced font loading
from app.utils.fonts import load_emoji_font_chain, draw_text_with_emoji_fallback, load_font, process_message_with_line_breaks, test_emoji_rendering

# Type definitions for dependencies that need to be injected
from pydantic import BaseModel, Field


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
    templateType: Optional[str] = "single"  # Template type
    userEmail: Optional[str] = ""


# Embedded TemplateEngine to avoid import issues
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
        canvas.paste(images[0], (0, 0))  # Top left
        canvas.paste(images[1], (quarter_width + gap, 0))  # Top right
        canvas.paste(images[2], (0, quarter_height + gap))  # Bottom left
        canvas.paste(images[3], (quarter_width + gap, quarter_height + gap))  # Bottom right
        
        return canvas
    
    def _apply_two_vertical(self, top_image_url: str, bottom_image_url: str) -> Image.Image:
        """Template 5: Two photos stacked vertically"""
        print(f"[TEMPLATE] Applying two vertical template")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes
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


def get_next_month_coupon_code():
    """Generate the coupon code for next month (e.g., XLWelcomeNov)"""
    next_month = datetime.now() + timedelta(days=32)
    month_abbr = calendar.month_abbr[next_month.month]
    return f"XLWelcome{month_abbr}"


# Font loading and message processing functions now imported from app.utils.fonts


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


def generate_complete_postcard_service(
    request: PostcardRequest,
    transaction_store: Dict,
    db_session: Session,
    coupon_code_model,
    coupon_distribution_model,
    template_engine_available: bool = True
) -> Dict:
    """
    Generate both front and back images, upload to Cloudinary
    
    Args:
        request: PostcardRequest containing all postcard details
        transaction_store: In-memory transaction storage
        db_session: Database session for coupon tracking
        coupon_code_model: CouponCode model class
        coupon_distribution_model: CouponDistribution model class
        template_engine_available: Whether template engine is available
        
    Returns:
        Dict containing success status, transaction ID, and image URLs
    """
    try:
        print(f"[COMPLETE] Railway PostcardService v2.1.1.1-emoji-fix")
        print(f"[COMPLETE] Generating complete {request.postcardSize} postcard")
        print(f"[COMPLETE] Received userEmail: '{request.userEmail}'")
        
        # Generate back image (existing logic)
        if request.postcardSize == "regular":
            W, H = 1800, 1200
        else:
            W, H = 2754, 1872

        back_img = Image.new("RGB", (W, H), "white")
        draw = ImageDraw.Draw(back_img)

        # Load font chains for comprehensive emoji support
        body_font_chain = load_emoji_font_chain(40)
        addr_font_chain = load_emoji_font_chain(36)
        ret_font_chain = load_emoji_font_chain(32)
        
        # Test emoji rendering capability
        print(f"[EMOJI] Testing emoji rendering capability...")
        test_emoji_rendering(body_font_chain)
        
        # Legacy compatibility for single font usage
        body_font = body_font_chain[0] if body_font_chain else load_font(40)
        addr_font = addr_font_chain[0] if addr_font_chain else load_font(36)
        ret_font = ret_font_chain[0] if ret_font_chain else load_font(32)

        # Return address with separator
        message_start_y = 150
        print(f"[RETURN_ADDRESS] Received return address: '{request.returnAddressText}'")
        
        if request.returnAddressText and request.returnAddressText != "{{RETURN_ADDRESS}}" and request.returnAddressText.strip():
            print(f"[RETURN_ADDRESS] Adding return address to postcard")
            y = 108
            lines_added = 0
            
            for line in request.returnAddressText.split("\n")[:3]:
                if line.strip():
                    print(f"[RETURN_ADDRESS] Adding line: '{line.strip()}'")
                    # Use emoji fallback for return address too
                    try:
                        draw_text_with_emoji_fallback(draw, (108, y), line.strip(), ret_font_chain, fill="black")
                        print(f"[RETURN_ADDRESS] Successfully drew line with emoji support: '{line.strip()}'")
                    except Exception as e:
                        print(f"[RETURN_ADDRESS] Emoji fallback failed, using basic text: {e}")
                        draw.text((108, y), line.strip(), font=ret_font, fill="black")
                    y += 40
                    lines_added += 1
            
            if lines_added > 0:
                # Separator line
                line_y = y + 20
                line_end_x = 1400 if request.postcardSize == "xl" else 900
                draw.line([(108, line_y), (line_end_x, line_y)], fill="black", width=2)
                message_start_y = line_y + 30
                print(f"[RETURN_ADDRESS] Added {lines_added} return address lines with separator")
            else:
                print(f"[RETURN_ADDRESS] No valid return address lines found")
        else:
            print(f"[RETURN_ADDRESS] No return address provided or using placeholder")

        # Process message with line breaks preserved
        max_width = 1400 if request.postcardSize == "xl" else 900
        lines = process_message_with_line_breaks(request.message, max_width, body_font_chain[0] if body_font_chain else body_font, draw)

        # Draw message with proper line spacing for empty lines
        y = message_start_y
        line_height = 50
        lines_drawn = 0
        
        for line in lines[:20]:  # Limit to 20 lines
            if line.strip():
                # Non-empty line - draw the text with comprehensive emoji fallback
                draw_text_with_emoji_fallback(draw, (108, y), line, body_font_chain, fill="black")
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
            # Try multiple possible logo paths
            possible_logo_paths = [
                os.path.join(os.path.dirname(__file__), "..", "..", "Assets", "Images", "BW Icon - Back.png"),  # Relative to service file
                os.path.join("/app", "Assets", "Images", "BW Icon - Back.png"),  # Absolute Railway path
                os.path.join(os.getcwd(), "Assets", "Images", "BW Icon - Back.png"),  # Working directory
                os.path.join(os.path.dirname(__file__), "Assets", "Images", "BW Icon - Back.png"),  # Original path
            ]
            
            logo_img = None
            logo_path = None
            
            for path in possible_logo_paths:
                if os.path.exists(path):
                    logo_path = path
                    logo_img = Image.open(path).convert("RGBA")
                    print(f"[LOGO] Found logo at: {path}")
                    break
                else:
                    print(f"[LOGO] Logo not found at: {path}")
            
            if logo_img:
                
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
                coupon_record = db_session.query(coupon_code_model).filter(coupon_code_model.code == coupon_code).first()
                if coupon_record:
                    distribution = coupon_distribution_model(
                        coupon_code_id=coupon_record.id,
                        transaction_id=request.transactionId,
                        recipient_name=request.recipientInfo.to,
                        recipient_address=f"{request.recipientInfo.addressLine1}, {request.recipientInfo.city}, {request.recipientInfo.state} {request.recipientInfo.zipcode}",
                        postcard_size=request.postcardSize
                    )
                    db_session.add(distribution)
                    db_session.commit()
                    print(f"[COUPON] Tracked coupon distribution: {distribution.id}")
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
            if template_engine_available and request.templateType and request.templateType != "single":
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
        raise e