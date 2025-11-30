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
        """Template: Three narrow horizontal bookmark-style photos stacked vertically"""
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
        """Template: One wide photo on top with two photos below"""
        print(f"[TEMPLATE] Applying three sideways template")
        
        # Create canvas
        canvas = Image.new('RGB', self.size, color='white')
        
        # Calculate sizes for top wide photo and bottom two photos
        gap = 15
        top_height = int(self.height * 0.4)  # Top photo takes 40% of height
        bottom_height = self.height - top_height - gap
        bottom_width = (self.width - gap) // 2  # Bottom photos split width
        
        # Define rectangles
        top_size = (self.width, top_height)
        bottom_size = (bottom_width, bottom_height)
        
        # Load and resize images
        top_image = self._load_image_from_url(top_image_url)
        bottom_left_image = self._load_image_from_url(bottom_left_image_url)
        bottom_right_image = self._load_image_from_url(bottom_right_image_url)
        
        top_image = self._resize_and_crop(top_image, top_size)
        bottom_left_image = self._resize_and_crop(bottom_left_image, bottom_size)
        bottom_right_image = self._resize_and_crop(bottom_right_image, bottom_size)
        
        # Paste images
        canvas.paste(top_image, (0, 0))
        canvas.paste(bottom_left_image, (0, top_height + gap))
        canvas.paste(bottom_right_image, (bottom_width + gap, top_height + gap))
        
        return canvas


def get_next_month_coupon_code():
    """Generate the coupon code for next month (e.g., XLWelcomeNov)"""
    next_month = datetime.now() + timedelta(days=32)
    month_abbr = calendar.month_abbr[next_month.month]
    return f"XLWelcome{month_abbr}"


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
        print(f"[COMPLETE] Railway PostcardService v2.1.1.17-dev")
        print(f"[COMPLETE] Generating complete {request.postcardSize} postcard")
        print(f"[COMPLETE] Received userEmail: '{request.userEmail}'")
        
        # Generate back image - use exact dimensions from old working version
        if request.postcardSize == "regular" or request.postcardSize == "4x6":
            W, H = 1800, 1200  # 4x6 inches at 300 DPI
        else:
            W, H = 2754, 1872  # XL size - exact dimensions from old version

        back_img = Image.new("RGB", (W, H), "white")
        draw = ImageDraw.Draw(back_img)

        # Load fonts
        body_font = load_font(40)
        addr_font = load_font(36)
        ret_font = load_font(32)

        # Return address with separator - align with logo's left edge
        message_start_y = 180  # Move down slightly from top edge
        text_x = 50  # Align with logo's left edge (three dashes position)
        
        if request.returnAddressText and request.returnAddressText != "{{RETURN_ADDRESS}}":
            y = 80  # Start higher up
            for line in request.returnAddressText.split("\n")[:3]:
                if line.strip():
                    draw.text((text_x, y), line.strip(), font=ret_font, fill="black")
                    y += 40
            
            # Separator line
            line_y = y + 20
            line_end_x = 1400 if request.postcardSize == "xl" else 650  # Even shorter to avoid address cutoff
            draw.line([(text_x, line_y), (line_end_x, line_y)], fill="black", width=2)
            message_start_y = line_y + 30

        # Process message with line breaks preserved - fine-tuned to prevent character cutoff
        max_width = 1400 if request.postcardSize == "xl" else 620  # Reduced by ~30px to prevent cutoff
        lines = process_message_with_line_breaks(request.message, max_width, body_font, draw)

        # Draw message with proper line spacing for empty lines
        y = message_start_y
        line_height = 50
        lines_drawn = 0
        
        message_x = 50  # Align with logo's left edge (same as text_x)
        
        for line in lines[:20]:  # Limit to 20 lines
            if line.strip():
                # Non-empty line - draw the text
                draw.text((message_x, y), line, font=body_font, fill="black")
            # Empty lines just add spacing without drawing text
            y += line_height
            lines_drawn += 1
            
        print(f"[MESSAGE] Drew {lines_drawn} lines with preserved line breaks")

        # Address block - positioned to match Stannp's actual placement
        # Move further left to match Stannp's actual position (Stannp will overlay with white background)
        # Use exact positioning from old working version
        address_x = W - 800 if request.postcardSize == "xl" else W - 680
        address_y = H - 360
        
        # Add barcode and indicia stamp above address
        try:
            # Try multiple possible barcode paths
            possible_barcode_paths = [
                os.path.join(os.path.dirname(__file__), "..", "..", "Assets", "Images", "barcode_and_indica_stamp_sample.png"),
                os.path.join("/app", "Assets", "Images", "barcode_and_indica_stamp_sample.png"),  # Railway path
                os.path.join(os.getcwd(), "Assets", "Images", "barcode_and_indica_stamp_sample.png"),  # Current working directory
                "Assets/Images/barcode_and_indica_stamp_sample.png"  # Relative path
            ]
            
            barcode_img = None
            barcode_path_used = None
            
            for barcode_path in possible_barcode_paths:
                if os.path.exists(barcode_path):
                    try:
                        barcode_img = Image.open(barcode_path)
                        barcode_path_used = barcode_path
                        break
                    except Exception as e:
                        print(f"[BARCODE] Error loading image from {barcode_path}: {e}")
            
            if barcode_img:
                # Resize barcode to appropriate size for postcard
                barcode_width = 400 if request.postcardSize == "xl" else 320
                barcode_height = int(barcode_img.height * (barcode_width / barcode_img.width))
                barcode_img = barcode_img.resize((barcode_width, barcode_height), Image.Resampling.LANCZOS)
                
                # Position barcode above the address area
                barcode_x = address_x + 50  # Slightly right of address
                barcode_y = address_y - barcode_height - 30  # Above address with some spacing
                
                back_img.paste(barcode_img, (barcode_x, barcode_y), barcode_img if barcode_img.mode == 'RGBA' else None)
                print(f"[BARCODE] Added barcode/indicia at position ({barcode_x}, {barcode_y}) from {barcode_path_used}")
            else:
                print(f"[BARCODE] Warning: Barcode image not found")
        except Exception as e:
            print(f"[BARCODE] Error adding barcode: {e}")
        
        # Draw address without white background (Stannp will handle overlay with clearzone=true)
        r = request.recipientInfo
        address_lines = list(filter(None, [
            r.to,
            r.addressLine1,
            r.addressLine2,
            f"{r.city}, {r.state} {r.zipcode}".strip(", ")
        ]))
        
        if address_lines:
            # Draw address text directly (no white background - Stannp handles overlay)
            current_y = address_y
            for line in address_lines:
                draw.text((address_x, current_y), line, font=addr_font, fill="black")
                current_y += 46
                
            print(f"[ADDRESS] Drew address at position ({address_x}, {address_y}) - Stannp will overlay with clearzone")

        # Add XLPostcards logo to lower left corner
        try:
            # Try multiple possible logo paths
            possible_logo_paths = [
                os.path.join(os.path.dirname(__file__), "..", "..", "BW icon - Back.png"),  # Root level
                os.path.join(os.path.dirname(__file__), "..", "..", "Assets", "Images", "BW Icon - Back.png"),  # Assets folder
                os.path.join("/app", "BW icon - Back.png"),  # Railway root
                os.path.join("/app", "Assets", "Images", "BW Icon - Back.png"),  # Railway assets
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
            
            # Use exact promotional box positioning from old working version
            if request.postcardSize == "xl":
                # XL postcard - bigger box above address
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
        # Check if transaction exists and preserve email (check database first, then memory)
        existing_email = ""
        
        # First check database for existing email
        try:
            from app.models.database import PostcardTransaction
            existing_transaction = db_session.query(PostcardTransaction).filter_by(
                transaction_id=request.transactionId
            ).first()
            if existing_transaction and existing_transaction.user_email:
                existing_email = existing_transaction.user_email
        except Exception as e:
            print(f"[COMPLETE] Error checking database for existing email: {e}")
        
        # If not in database, check memory store
        if not existing_email and request.transactionId in transaction_store:
            existing_email = transaction_store[request.transactionId].get("userEmail", "")
        
        # Use provided email only if it's not empty, otherwise preserve existing email
        if request.userEmail and request.userEmail.strip():
            final_email = request.userEmail
        elif existing_email:
            final_email = existing_email
        else:
            final_email = ""
        
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
        
        # Store transaction data for later Stannp submission
        try:
            from app.models.database import PostcardTransaction
            
            # Create or update transaction record
            existing_transaction = db_session.query(PostcardTransaction).filter_by(
                transaction_id=request.transactionId
            ).first()
            
            if existing_transaction:
                # Update existing transaction
                existing_transaction.recipient_name = request.recipientInfo.to
                existing_transaction.recipient_address_line1 = request.recipientInfo.addressLine1
                existing_transaction.recipient_address_line2 = request.recipientInfo.addressLine2 or ""
                existing_transaction.recipient_city = request.recipientInfo.city or ""
                existing_transaction.recipient_state = request.recipientInfo.state or ""
                existing_transaction.recipient_zipcode = request.recipientInfo.zipcode or ""
                existing_transaction.postcard_size = request.postcardSize
                existing_transaction.front_url = front_url
                existing_transaction.back_url = back_url
                existing_transaction.message = request.message
                # Only update email if we have a good one (don't overwrite with empty)
                if final_email and final_email.strip():
                    existing_transaction.user_email = final_email
            else:
                # Create new transaction record
                transaction_record = PostcardTransaction(
                    transaction_id=request.transactionId,
                    recipient_name=request.recipientInfo.to,
                    recipient_address_line1=request.recipientInfo.addressLine1,
                    recipient_address_line2=request.recipientInfo.addressLine2 or "",
                    recipient_city=request.recipientInfo.city or "",
                    recipient_state=request.recipientInfo.state or "",
                    recipient_zipcode=request.recipientInfo.zipcode or "",
                    postcard_size=request.postcardSize,
                    front_url=front_url,
                    back_url=back_url,
                    message=request.message,
                    user_email=final_email
                )
                db_session.add(transaction_record)
            
            db_session.commit()
            print(f"[COMPLETE] Stored transaction data for {request.transactionId}")
            
        except Exception as e:
            print(f"[COMPLETE] Warning: Could not store transaction data: {e}")
            db_session.rollback()
        
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