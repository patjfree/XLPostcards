from PIL import ImageFont
import os
import tempfile
import urllib.request


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