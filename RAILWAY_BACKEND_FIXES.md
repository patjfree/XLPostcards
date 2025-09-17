# Railway Backend Fixes for Line Breaks and Emojis

## Issue
The postcard backend is not preserving line breaks and emoji characters in messages.

## Root Causes
1. **Line breaks removed**: `textwrap.fill()` and `msg.split()` strip newlines
2. **Emoji handling**: Need proper UTF-8 encoding support

## Fix for main.py (Railway Server)

Replace the message processing section with this code:

```python
# Message processing with line break preservation
def process_message_with_line_breaks(message, max_width, font, draw):
    """Process message while preserving user line breaks"""
    # Split by user-defined line breaks first
    user_lines = message.split('\n')
    
    processed_lines = []
    for user_line in user_lines:
        if not user_line.strip():
            # Empty line - preserve it
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
                # Fallback for older PIL versions
                text_width = draw.textsize(test_line, font=font)[0]
                
            if text_width <= max_width:
                current_line = test_line
            else:
                if current_line:
                    processed_lines.append(current_line)
                current_line = word
        
        if current_line:
            processed_lines.append(current_line)
    
    return processed_lines

# Usage in the main drawing code:
# Replace this section:
# words = msg.split()
# lines = []
# current_line = ""
# ...

# With this:
lines = process_message_with_line_breaks(msg, L["messageWidth"], f_msg, draw)
```

## Font Fix for Emoji Support

Add this improved font loading that supports emojis:

```python
def _load_font_with_emoji_support(pt_size):
    """Load font with emoji support"""
    pt_size = int(pt_size)
    print(f"[FONT] Loading {pt_size}pt font with emoji support")
    
    # Try fonts that support emojis
    emoji_font_paths = [
        # System fonts with emoji support
        "/System/Library/Fonts/Apple Color Emoji.ttc",  # macOS
        "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",  # Linux
        "/Windows/Fonts/seguiemj.ttf",  # Windows
        # Fallback to regular fonts
        "/System/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    
    for font_path in emoji_font_paths:
        try:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, pt_size)
                print(f"[FONT] SUCCESS: Loaded {font_path} with emoji support")
                return font
        except Exception as e:
            print(f"[FONT] Failed to load {font_path}: {e}")
            continue
    
    # Download fallback font with emoji support
    try:
        font_url = "https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf"
        font_path = os.path.join(tempfile.gettempdir(), "NotoColorEmoji.ttf")
        if not os.path.exists(font_path):
            urllib.request.urlretrieve(font_url, font_path)
        font = ImageFont.truetype(font_path, pt_size)
        print(f"[FONT] SUCCESS: Downloaded Noto Color Emoji {pt_size}pt")
        return font
    except Exception as e:
        print(f"[FONT] Emoji font download failed: {e}")
    
    return ImageFont.load_default()
```

## Complete Updated Message Drawing Section

```python
# Load fonts with emoji support
f_msg = _load_font_with_emoji_support(L['messageFontSize'])
f_addr = _load_font_with_emoji_support(L['addressFontSize'])

# Process message with line breaks preserved
lines = process_message_with_line_breaks(msg, L["messageWidth"], f_msg, draw)

# Draw message lines
y = L["messageTop"]
line_height = int(L['messageFontSize'] * 1.2)  # Proper line spacing
lines_drawn = 0

for line in lines:
    if y + line_height > L["messageTop"] + L["messageHeight"]:
        print(f"[POSTCARD] Message truncated at line {lines_drawn}")
        break
    
    # Draw line (empty lines create spacing)
    if line.strip():
        draw.text((L["messageLeft"], y), line, font=f_msg, fill="black")
    
    y += line_height
    lines_drawn += 1

print(f"[POSTCARD] Drew {lines_drawn} lines with line breaks preserved")
```

## Testing

Test with a message like:
```
Dear Mom,

Hope you're doing well! 😊

Love,
Patrick ❤️
```

This should preserve:
1. Line break after "Dear Mom,"
2. Empty line 
3. Emoji characters 😊 and ❤️
4. Proper spacing between paragraphs