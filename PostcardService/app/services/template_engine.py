from PIL import Image
from typing import List
import io
import base64
import urllib.request


class TemplateEngine:
    """Handle multi-photo template layouts for postcard fronts"""
    
    # Standard postcard dimensions - exact from old working version
    REGULAR_SIZE = (1800, 1200)  # 4x6 inches at 300 DPI
    XL_SIZE = (2754, 1872)       # XL size - exact dimensions from old version
    
    def __init__(self, postcard_size: str = "xl"):
        # Use exact logic from old working version
        if postcard_size == "regular" or postcard_size == "4x6":
            self.size = self.REGULAR_SIZE  # 4x6 inches
        else:
            self.size = self.XL_SIZE  # XL size
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