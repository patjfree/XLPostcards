from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Optional
from PIL import Image, ImageDraw, ImageFont
import io, base64, os, tempfile, urllib.request

app = FastAPI()

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

def load_font(size: int) -> ImageFont.FreeTypeFont:
    """Load font with fallback options"""
    print(f"[FONT] Attempting to load {size}pt font")
    
    # Try system fonts first
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc"
    ]
    
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

@app.post("/generate-postcard-back")
async def generate_postcard_back(request: PostcardRequest):
    try:
        print(f"[POSTCARD] Generating {request.postcardSize} postcard")
        print(f"[POSTCARD] Message: {request.message[:50]}...")
        print(f"[POSTCARD] Return address: {request.returnAddressText[:30]}...")
        
        if request.postcardSize == "regular":
            W, H = 1800, 1200
        else:
            W, H = 2754, 1872

        img = Image.new("RGB", (W, H), "white")
        draw = ImageDraw.Draw(img)

        # Load fonts - bigger return address font
        body_font = load_font(40)
        addr_font = load_font(36)
        ret_font = load_font(32)  # Bigger return address font

        # Return address (top-left) with better spacing
        if request.returnAddressText and request.returnAddressText != "{{RETURN_ADDRESS}}":
            y = 108
            for line in request.returnAddressText.split("\n")[:3]:
                if line.strip():
                    draw.text((108, y), line.strip(), font=ret_font, fill="black")
                    y += 40  # More spacing between lines
            
            # Add separator line between return address and message
            line_y = y + 20  # 20px gap after return address
            line_start_x = 108
            line_end_x = 1400 if request.postcardSize == "xl" else 900
            draw.line([(line_start_x, line_y), (line_end_x, line_y)], fill="black", width=2)
            
            # Adjust message start position to be below the line
            message_start_y = line_y + 30
        else:
            # No return address, start message higher
            message_start_y = 150

        # Message block (left side)
        words = request.message.split()
        lines = []
        current_line = ""
        max_width = 1400 if request.postcardSize == "xl" else 900
        
        for word in words:
            test_line = (current_line + " " + word).strip()
            try:
                text_width = draw.textlength(test_line, font=body_font)
            except:
                text_width = len(test_line) * 20  # fallback estimate
                
            if text_width <= max_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        
        if current_line:
            lines.append(current_line)

        # Draw message
        y = message_start_y
        for line in lines[:20]:
            draw.text((108, y), line, font=body_font, fill="black")
            y += 50

        # Address block (right side)
        x = W - 700
        y = H - 360
        r = request.recipientInfo
        
        # Draw address lines
        for line in filter(None, [
            r.to,
            r.addressLine1,
            r.addressLine2,
            f"{r.city}, {r.state} {r.zipcode}".strip(", ")
        ]):
            draw.text((x, y), line, font=addr_font, fill="black")
            y += 46

        # Export as JPEG
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=95)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        print(f"[POSTCARD] Generated successfully: {len(buf.getvalue())} bytes")

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

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PostcardService"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))