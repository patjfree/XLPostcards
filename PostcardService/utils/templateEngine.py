from PIL import Image, ImageDraw
from typing import List, Tuple, Optional
import io
import base64
import urllib.request

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
    
    def _resize_and_crop(self, image: Image.Image, target_size: Tuple[int, int]) -> Image.Image:
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
    
    def apply_single_photo(self, image_url: str) -> Image.Image:
        """Template 1: Single photo covering entire front"""
        print(f"[TEMPLATE] Applying single photo template")
        
        image = self._load_image_from_url(image_url)
        return self._resize_and_crop(image, self.size)
    
    def apply_two_side_by_side(self, left_image_url: str, right_image_url: str) -> Image.Image:
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
    
    def apply_three_photos(self, left_image_url: str, top_right_url: str, bottom_right_url: str) -> Image.Image:
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
    
    def apply_four_quarters(self, image_urls: List[str]) -> Image.Image:
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
    
    def get_supported_templates(self) -> List[str]:
        """Get list of supported template types"""
        return [
            "single",
            "two_side_by_side", 
            "three_photos",
            "four_quarters"
        ]
    
    def apply_template(self, template_type: str, image_urls: List[str]) -> Image.Image:
        """Apply specified template with provided images"""
        print(f"[TEMPLATE] Applying template: {template_type}")
        
        if template_type == "single":
            if len(image_urls) < 1:
                raise ValueError("Single template requires 1 image")
            return self.apply_single_photo(image_urls[0])
            
        elif template_type == "two_side_by_side":
            if len(image_urls) < 2:
                raise ValueError("Two side-by-side template requires 2 images")
            return self.apply_two_side_by_side(image_urls[0], image_urls[1])
            
        elif template_type == "three_photos":
            if len(image_urls) < 3:
                raise ValueError("Three photos template requires 3 images")
            return self.apply_three_photos(image_urls[0], image_urls[1], image_urls[2])
            
        elif template_type == "four_quarters":
            if len(image_urls) < 4:
                raise ValueError("Four quarters template requires 4 images")
            return self.apply_four_quarters(image_urls)
            
        else:
            raise ValueError(f"Unsupported template type: {template_type}")