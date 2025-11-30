"""
XLPostcards Service - Clean Entry Point

A clean, modular FastAPI application for postcard generation and processing.
"""

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

# Configuration
from app.config.settings import configure_services
from app.models.database import init_database

# Routers
from app.routers import health, postcards, payments, coupons

# Create FastAPI app
app = FastAPI(
    title="XLPostcards Service",
    description="API for generating and sending physical postcards",
    version="2.1.1"
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(postcards.router, prefix="/postcards", tags=["Postcards"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])
app.include_router(coupons.router, prefix="/coupons", tags=["Coupons"])


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    import os
    print("[STARTUP] Starting XLPostcards Service...")
    print(f"[STARTUP] PORT environment variable: {os.getenv('PORT', 'not set')}")
    print(f"[STARTUP] Python version: {os.sys.version}")
    print(f"[STARTUP] Working directory: {os.getcwd()}")
    
    try:
        print("[STARTUP] Configuring external services...")
        configure_services()
        print("[STARTUP] External services configured")
        
        print("[STARTUP] Initializing database...")
        init_database()
        print("[STARTUP] Database initialized")
        
        print("[STARTUP] XLPostcards Service ready!")
        print("[STARTUP] Health endpoint available at /health")
    except Exception as e:
        print(f"[STARTUP] Error during startup: {e}")
        import traceback
        print(f"[STARTUP] Traceback: {traceback.format_exc()}")
        print("[STARTUP] Service will continue with limited functionality")


@app.get("/")
async def root():
    """Root endpoint redirects to docs"""
    return RedirectResponse(url="/docs")


@app.get("/test")
async def test():
    """Simple test endpoint"""
    import os
    return {
        "status": "ok",
        "message": "XLPostcards Service is running",
        "port": os.getenv("PORT", "not set"),
        "version": "2.1.1"
    }


# Legacy endpoints for backwards compatibility
@app.post("/create-payment-intent")
async def create_payment_intent_legacy(request: dict):
    """Legacy create payment intent endpoint"""
    from app.services.payment_service import create_payment_intent
    return await create_payment_intent(request)


@app.post("/stripe-webhook")
async def stripe_webhook_legacy(request):
    """Legacy Stripe webhook endpoint"""
    from fastapi import Request
    from app.services.payment_service import handle_stripe_webhook
    body = await request.body()
    stripe_signature = request.headers.get("stripe-signature", "")
    return await handle_stripe_webhook(body, stripe_signature)


@app.get("/payment-status/{transaction_id}")
async def payment_status_legacy(transaction_id: str):
    """Legacy payment status endpoint"""
    from app.services.payment_service import get_payment_status
    return await get_payment_status(transaction_id)


@app.post("/submit-to-stannp")
async def submit_to_stannp_legacy(request: dict):
    """Legacy Stannp submission endpoint"""
    from app.services.postcard_service import submit_to_stannp_legacy
    return await submit_to_stannp_legacy(request)


@app.post("/generate-complete-postcard")
async def generate_complete_postcard_legacy(request: dict):
    """Legacy endpoint - redirect to postcards router"""
    from app.services.postcard_generation_service import generate_complete_postcard_service
    from app.models.database import get_db, CouponCode, CouponDistribution
    from app.models.schemas import PostcardRequest
    
    # Convert dict to proper request model
    postcard_request = PostcardRequest(**request)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Create transaction store (simple dict for legacy compatibility)
        transaction_store = {}
        
        # Call the service directly with all required arguments
        return generate_complete_postcard_service(
            request=postcard_request,
            transaction_store=transaction_store,
            db_session=db,
            coupon_code_model=CouponCode,
            coupon_distribution_model=CouponDistribution
        )
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    import os
    import sys
    
    port = int(os.getenv("PORT", 8000))
    print(f"[MAIN] Starting server on port {port}")
    print(f"[MAIN] Environment PORT: {os.getenv('PORT', 'not set')}")
    print(f"[MAIN] Host: 0.0.0.0")
    print(f"[MAIN] Python executable: {sys.executable}")
    
    try:
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=port,
            log_level="info",
            access_log=True
        )
    except Exception as e:
        print(f"[MAIN] Failed to start server: {e}")
        import traceback
        print(f"[MAIN] Traceback: {traceback.format_exc()}")
        sys.exit(1)