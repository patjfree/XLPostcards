"""
Postcard processing service for Stannp submission and postcard back generation
"""
import requests
import os
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.schemas import StannpSubmissionRequest, PostcardRequest
from app.models.database import PostcardTransaction, SessionLocal


async def submit_to_stannp_with_transaction_data(transaction_id: str) -> Dict[str, Any]:
    """Submit postcard to Stannp using stored transaction data"""
    import base64
    
    try:
        print(f"[STANNP] Processing submission for transaction: {transaction_id}")
        
        # Get transaction data from database
        db = SessionLocal()
        try:
            transaction_record = db.query(PostcardTransaction).filter_by(
                transaction_id=transaction_id
            ).first()
            
            if not transaction_record:
                raise Exception(f"Transaction record not found for {transaction_id}")
                
            print(f"[STANNP] Found transaction record for {transaction_id}")
            print(f"[STANNP] Recipient: {transaction_record.recipient_name}")
            print(f"[STANNP] Address: {transaction_record.recipient_address_line1}, {transaction_record.recipient_city}")
            print(f"[STANNP] Size: {transaction_record.postcard_size}")
            
            # Build URLs
            front_url = transaction_record.front_url
            back_url = transaction_record.back_url
            
            # Get Stannp API key
            stannp_api_key = os.getenv("STANNP_API_KEY")
            if not stannp_api_key:
                raise Exception("STANNP_API_KEY not configured")
            
            print(f"[STANNP] Using Stannp API key: {stannp_api_key[:8]}... (length: {len(stannp_api_key)})")
            
            # Parse recipient name
            recipient_name = (transaction_record.recipient_name or "").strip()
            name_parts = recipient_name.split() if recipient_name else []
            
            # Build recipient data
            recipient_data = {
                "recipient[address1]": transaction_record.recipient_address_line1 or "",
                "recipient[city]": transaction_record.recipient_city or "",
                "recipient[postcode]": transaction_record.recipient_zipcode or "",
                "recipient[country]": "US"
            }
            
            # Only add names if we have them
            if len(name_parts) >= 1:
                recipient_data["recipient[firstname]"] = name_parts[0]
            if len(name_parts) >= 2:
                recipient_data["recipient[lastname]"] = " ".join(name_parts[1:])
            
            # Add optional fields if present
            if transaction_record.recipient_address_line2:
                recipient_data["recipient[address2]"] = transaction_record.recipient_address_line2
            if transaction_record.recipient_state:
                recipient_data["recipient[state]"] = transaction_record.recipient_state
            
            # Map postcard size - default to 4x6 for backwards compatibility
            if transaction_record.postcard_size == "6x9" or transaction_record.postcard_size == "xl":
                postcard_size = "6x9"
            elif transaction_record.postcard_size == "4x6" or transaction_record.postcard_size == "regular":
                postcard_size = "4x6"
            else:
                postcard_size = "4x6"  # Default to 4x6
            
            # Prepare Stannp API request
            stannp_url = "https://dash.stannp.com/api/v1/postcards/create"
            stannp_data = {
                "test": "true",  # Set to false for production
                "size": postcard_size,
                "front": front_url,
                "back": back_url,
                "clearzone": "true",  # Enable white overlay
                **recipient_data
            }
            
            print(f"[STANNP] Sending request to Stannp API")
            
            # Make API call using Basic auth
            auth_string = f"{stannp_api_key}:"
            encoded_auth = base64.b64encode(auth_string.encode()).decode()
            headers = {
                "Authorization": f"Basic {encoded_auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            response = requests.post(stannp_url, data=stannp_data, headers=headers)
            print(f"[STANNP] Stannp API response status: {response.status_code}")
            print(f"[STANNP] Stannp API response: {response.text}")
            
            if response.status_code == 200:
                stannp_response = response.json()
                if stannp_response.get("success"):
                    stannp_order_id = stannp_response.get("data", {}).get("id", "")
                    print(f"[STANNP] SUCCESS: Postcard submitted with order ID: {stannp_order_id}")
                    
                    # Send success email if user has email
                    if transaction_record.user_email and transaction_record.user_email.strip():
                        await _send_success_email(transaction_record, stannp_response)
                    
                    # Update transaction record
                    transaction_record.submitted_to_stannp = True
                    transaction_record.stannp_order_id = str(stannp_order_id)
                    transaction_record.stannp_status = "submitted"
                    db.commit()
                    
                    return {
                        "success": True,
                        "status": "submitted_to_stannp",
                        "transactionId": transaction_id,
                        "stannpOrderId": stannp_order_id,
                        "message": "Postcard successfully submitted for printing and mailing",
                        "stannpResponse": stannp_response
                    }
                else:
                    error_msg = stannp_response.get("error", "Unknown Stannp error")
                    await _send_error_email(transaction_id, transaction_record, f"Stannp API error: {error_msg}")
                    return {"success": False, "error": f"Stannp API error: {error_msg}"}
            else:
                error_msg = f"Stannp HTTP error: {response.status_code}"
                await _send_error_email(transaction_id, transaction_record, error_msg)
                return {"success": False, "error": error_msg}
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"[STANNP] Error in Stannp submission: {e}")
        await _send_error_email(transaction_id, None, str(e))
        return {"success": False, "error": str(e)}


async def _send_success_email(transaction_record, stannp_response):
    """Send success email notification"""
    try:
        from app.utils.email import send_email_notification
        
        pdf_url = stannp_response.get("data", {}).get("pdf", "")
        print(f"[EMAIL] Sending success notification to: {transaction_record.user_email}")
        
        send_email_notification(
            to_email=transaction_record.user_email,
            subject="Your postcard has been submitted for printing! ✉️",
            message="Your postcard has been successfully submitted for printing and mailing!",
            pdf_url=pdf_url
        )
    except Exception as email_error:
        print(f"[EMAIL] Failed to send success notification: {email_error}")


async def _send_error_email(transaction_id: str, transaction_record, error_msg: str):
    """Send error notification to support"""
    try:
        from app.utils.email import send_email_notification
        
        customer_email = transaction_record.user_email if transaction_record else "Unknown"
        error_details = f"""
        Transaction ID: {transaction_id}
        Error: {error_msg}
        Customer Email: {customer_email}
        """
        
        send_email_notification(
            to_email="info@xlpostcards.com",
            subject=f"Stannp Error - Transaction {transaction_id[:8]}",
            message=f"Stannp error occurred: {error_details}",
            pdf_url=None
        )
        print(f"[EMAIL] Sent error notification to support")
    except Exception as email_error:
        print(f"[EMAIL] Failed to send error notification: {email_error}")


async def submit_to_stannp_legacy(request: dict) -> Dict[str, Any]:
    """Legacy Stannp submission endpoint with request dict"""
    import requests
    import base64
    
    try:
        print(f"[STANNP] Submitting postcard to Stannp for printing")
        transaction_id = request.get("transactionId", "")
        front_url = request.get("frontUrl", "")
        back_url = request.get("backUrl", "")
        
        # Get Stannp API key from environment
        stannp_api_key = os.getenv("STANNP_API_KEY")
        if not stannp_api_key:
            print(f"[STANNP] ERROR: STANNP_API_KEY not configured")
            return {"success": False, "error": "Stannp API key not configured"}
        
        # Prepare Stannp API request
        stannp_url = "https://dash.stannp.com/api/v1/postcards/create"
        
        # Extract address from request
        address_data = request.get("address", {})
        
        # Get size from request or default to 4x6
        postcard_size = request.get("postcardSize", "4x6")
        if postcard_size == "6x9" or postcard_size == "xl":
            size = "6x9"
        else:
            size = "4x6"  # Default to 4x6
        
        stannp_data = {
            "test": "true",  # Set to false for production
            "size": size,  # Use dynamic size based on request
            "front": front_url,
            "back": back_url,
            "clearzone": "true",  # Enable white overlay to cover our preview address
            "recipient[address1]": address_data.get("street", ""),
            "recipient[city]": address_data.get("city", ""),
            "recipient[postcode]": address_data.get("postalCode", ""),
            "recipient[country]": address_data.get("country", "US")
        }
        
        # Only add names if they exist (don't make up titles/names)
        if address_data.get("firstName"):
            stannp_data["recipient[firstname]"] = address_data.get("firstName")
        if address_data.get("lastName"):
            stannp_data["recipient[lastname]"] = address_data.get("lastName")
        if address_data.get("title"):
            stannp_data["recipient[title]"] = address_data.get("title")
        if address_data.get("address2"):
            stannp_data["recipient[address2]"] = address_data.get("address2")
        
        # Add state for US addresses
        if address_data.get("state"):
            stannp_data["recipient[state]"] = address_data.get("state")
        
        print(f"[STANNP] Sending request to Stannp API with data: {stannp_data}")
        
        # Make API call to Stannp using Basic auth
        auth_string = f"{stannp_api_key}:"
        encoded_auth = base64.b64encode(auth_string.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_auth}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        response = requests.post(stannp_url, data=stannp_data, headers=headers)
        
        print(f"[STANNP] Stannp API response status: {response.status_code}")
        print(f"[STANNP] Stannp API response: {response.text}")
        
        if response.status_code == 200:
            stannp_response = response.json()
            if stannp_response.get("success"):
                stannp_order_id = stannp_response.get("data", {}).get("id", "")
                print(f"[STANNP] SUCCESS: Postcard submitted to Stannp with order ID: {stannp_order_id}")
                
                return {
                    "success": True,
                    "transactionId": transaction_id,
                    "stannpOrderId": stannp_order_id,
                    "status": "submitted_to_stannp",
                    "message": "Postcard successfully submitted for printing and mailing",
                    "stannpResponse": stannp_response
                }
            else:
                error_msg = stannp_response.get("error", "Unknown Stannp error")
                print(f"[STANNP] ERROR: Stannp API returned error: {error_msg}")
                return {"success": False, "error": f"Stannp API error: {error_msg}"}
        else:
            print(f"[STANNP] ERROR: Stannp API returned status {response.status_code}: {response.text}")
            return {"success": False, "error": f"Stannp API error: {response.status_code}"}
            
    except Exception as e:
        print(f"[STANNP] Error submitting to Stannp: {e}")
        return {"success": False, "error": str(e)}


# Legacy compatibility - kept for backwards compatibility
async def submit_to_stannp(request: StannpSubmissionRequest, db: Session) -> Dict[str, Any]:
    """Legacy endpoint - redirect to new implementation"""
    return await submit_to_stannp_with_transaction_data(request.transactionId)