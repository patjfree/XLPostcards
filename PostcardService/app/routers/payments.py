from fastapi import APIRouter, HTTPException, Request, Header
from app.models.schemas import (
    PaymentConfirmedRequest,
    CreatePaymentSessionRequest,
    PaymentSessionResponse
)
from app.services.payment_service import (
    handle_payment_confirmation,
    create_payment_session,
    handle_stripe_webhook,
    handle_android_purchase
)

router = APIRouter()


@router.post("/payment-confirmed")
async def payment_confirmed(request: PaymentConfirmedRequest):
    """Handle payment confirmation from client"""
    try:
        return await handle_payment_confirmation(request)
    except Exception as e:
        print(f"[PAYMENT] Error in payment confirmation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-payment-intent")
async def create_payment_intent_endpoint(request: dict):
    """Create Stripe payment intent"""
    from app.services.payment_service import create_payment_intent
    return await create_payment_intent(request)


@router.post("/process-android-purchase")
async def process_android_purchase(request: dict):
    """Process Android in-app purchase"""
    try:
        return await handle_android_purchase(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-payment-session")
async def create_payment_session_endpoint(request: CreatePaymentSessionRequest):
    """Create Stripe checkout session"""
    try:
        return await create_payment_session(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stripe-webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Handle Stripe webhook events"""
    try:
        body = await request.body()
        return await handle_stripe_webhook(body, stripe_signature)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/payment-status/{transaction_id}")
async def get_payment_status_endpoint(transaction_id: str):
    """Get payment status for transaction"""
    from app.services.payment_service import get_payment_status
    return await get_payment_status(transaction_id)