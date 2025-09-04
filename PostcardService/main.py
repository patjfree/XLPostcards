from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from PIL import Image, ImageDraw, ImageFont
import io, base64, os, tempfile, urllib.request, requests
import asyncio, time
from datetime import datetime
import cloudinary
import cloudinary.uploader
import resend

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

# In-memory transaction storage (avoiding database for now)
transaction_store = {}

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
    frontImageUri: Optional[str] = ""
    userEmail: Optional[str] = ""

class PaymentConfirmedRequest(BaseModel):
    transactionId: str
    stripePaymentIntentId: str
    userEmail: Optional[str] = ""

class StannpSubmissionRequest(BaseModel):
    transactionId: str

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

        # Message block
        words = request.message.split()
        lines = []
        current_line = ""
        max_width = 1400 if request.postcardSize == "xl" else 900
        
        for word in words:
            test_line = (current_line + " " + word).strip()
            try:
                text_width = draw.textlength(test_line, font=body_font)
            except:
                text_width = len(test_line) * 20
                
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

        # Generate back image data
        back_buf = io.BytesIO()
        back_img.save(back_buf, format="JPEG", quality=95)
        back_data = back_buf.getvalue()

        # Front image is already uploaded to Cloudinary by the app
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
        transaction_store[request.transactionId] = {
            "frontUrl": front_url,
            "backUrl": back_url,
            "recipientInfo": request.recipientInfo.model_dump(),
            "message": request.message,
            "postcardSize": request.postcardSize,
            "status": "ready_for_payment",
            "created_at": datetime.now().isoformat(),
            "userEmail": request.userEmail or ""
        }
        
        print(f"[COMPLETE] Stored user email: '{request.userEmail}' for transaction {request.transactionId}")
        
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
    stannp_payload = {
        "test": "true",  # Always test mode for now
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

        # Message and address (same as before)
        words = request.message.split()
        lines = []
        current_line = ""
        max_width = 1400 if request.postcardSize == "xl" else 900
        
        for word in words:
            test_line = (current_line + " " + word).strip()
            try:
                text_width = draw.textlength(test_line, font=body_font)
            except:
                text_width = len(test_line) * 20
                
            if text_width <= max_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        
        if current_line:
            lines.append(current_line)

        y = message_start_y
        for line in lines[:20]:
            draw.text((108, y), line, font=body_font, fill="black")
            y += 50

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))