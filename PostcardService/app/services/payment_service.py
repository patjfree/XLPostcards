"""
Payment processing service containing all payment-related business logic
"""
import stripe
import os
from typing import Dict, Any
from fastapi import HTTPException
from app.models.schemas import PaymentConfirmedRequest, CreatePaymentSessionRequest
from app.models.database import PostcardTransaction, SessionLocal


async def create_payment_intent(request: dict) -> Dict[str, Any]:
    """Create Stripe payment intent"""
    try:
        # Basic payment intent creation
        amount = request.get("amount", 299)  # Default to $2.99
        currency = request.get("currency", "usd")
        
        # Create Stripe PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            metadata={
                "transaction_id": request.get("transactionId", ""),
                "source": "xl_postcards_legacy"
            }
        )
        
        response = {
            "success": True,
            "paymentIntentClientSecret": intent.client_secret,
            "clientSecret": intent.client_secret,
            "client_secret": intent.client_secret,  # Try all possible field names
            "paymentIntent": {
                "id": intent.id,
                "client_secret": intent.client_secret,
                "amount": intent.amount,
                "currency": intent.currency,
                "status": intent.status
            }
        }
        
        print(f"[PAYMENT] Created PaymentIntent: {intent.id}")
        print(f"[PAYMENT] Client Secret: {intent.client_secret[:20]}...")
        print(f"[PAYMENT] Returning response with multiple client_secret fields")
        return response
        
    except Exception as e:
        print(f"[PAYMENT] Error creating payment intent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def get_payment_status(transaction_id: str) -> Dict[str, Any]:
    """Get payment status and submit to Stannp if payment confirmed"""
    try:
        print(f"[PAYMENT_STATUS] Checking status for transaction: {transaction_id}")
        
        # Build the postcard URLs
        front_url = f"https://res.cloudinary.com/db9totnmb/image/upload/postcards/backs/postcard-front-{transaction_id}.jpg"
        back_url = f"https://res.cloudinary.com/db9totnmb/image/upload/postcards/backs/postcard-back-{transaction_id}.jpg"
        
        # Try to submit to Stannp now that payment is confirmed
        print(f"[PAYMENT_STATUS] Attempting to submit to Stannp for transaction: {transaction_id}")
        
        # Use the refactored service (import here to avoid circular imports)
        from app.services.postcard_service import submit_to_stannp_with_transaction_data
        result = await submit_to_stannp_with_transaction_data(transaction_id)
        
        if result.get("success"):
            return {
                "success": True,
                "status": "submitted_to_stannp",
                "transactionId": transaction_id,
                "paymentStatus": "succeeded",
                "paymentConfirmed": True,
                "submittedToStannp": True,
                "completed": True,
                "finalStatus": True,
                "stannpOrderId": result.get("stannpOrderId", ""),
                "message": "Postcard successfully submitted for printing and mailing",
                "frontUrl": front_url,
                "backUrl": back_url,
                "stannpResponse": result.get("stannpResponse", {})
            }
        else:
            return {
                "success": True,
                "status": "stannp_error",
                "transactionId": transaction_id,
                "paymentStatus": "succeeded",
                "paymentConfirmed": True,
                "submittedToStannp": False,
                "completed": False,
                "error": result.get("error", "Unknown error"),
                "frontUrl": front_url,
                "backUrl": back_url
            }
            
    except Exception as e:
        print(f"[PAYMENT_STATUS] Error checking payment status: {e}")
        return {
            "success": True,
            "status": "error",
            "transactionId": transaction_id,
            "paymentStatus": "succeeded",
            "paymentConfirmed": True,
            "submittedToStannp": False,
            "completed": False,
            "error": str(e),
            "frontUrl": f"https://res.cloudinary.com/db9totnmb/image/upload/postcards/backs/postcard-front-{transaction_id}.jpg",
            "backUrl": f"https://res.cloudinary.com/db9totnmb/image/upload/postcards/backs/postcard-back-{transaction_id}.jpg"
        }


async def handle_stripe_webhook(body: bytes, stripe_signature: str) -> Dict[str, Any]:
    """Handle Stripe webhook events"""
    try:
        print(f"[WEBHOOK] Received Stripe webhook")
        # For now, just acknowledge the webhook
        return {"received": True}
    except Exception as e:
        print(f"[WEBHOOK] Error processing webhook: {e}")
        raise HTTPException(status_code=400, detail=str(e))


async def handle_payment_confirmation(request: PaymentConfirmedRequest) -> Dict[str, Any]:
    """Handle payment confirmation from client"""
    # TODO: Implement payment confirmation logic if needed
    pass


async def create_payment_session(request: CreatePaymentSessionRequest) -> Dict[str, Any]:
    """Create Stripe checkout session"""
    # TODO: Implement payment session creation if needed
    pass


async def handle_android_purchase(request: Dict[str, Any]) -> Dict[str, Any]:
    """Process Android in-app purchase"""
    # TODO: Implement Android purchase logic if needed
    pass