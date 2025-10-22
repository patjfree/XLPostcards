"""
XLPostcards Service - Refactored Entry Point

A clean, modular FastAPI application for postcard generation and processing.
"""

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
import asyncio

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
    print("[STARTUP] Starting XLPostcards Service...")
    
    # Configure external services
    configure_services()
    print("[STARTUP] External services configured")
    
    # Initialize database
    init_database()
    print("[STARTUP] Database initialized")
    
    # TODO: Initialize any other startup tasks (coupon creation, etc.)
    
    print("[STARTUP] XLPostcards Service ready!")


@app.get("/")
async def root():
    """Root endpoint redirects to docs"""
    return RedirectResponse(url="/docs")


# For backwards compatibility, keep some direct routes
@app.post("/test-email")
async def test_email(request: dict):
    """Test email functionality"""
    # TODO: Implement test email logic
    return {"success": True, "message": "Test email functionality"}


@app.post("/manual-process-payment")
async def manual_process_payment(request: dict):
    """Manual payment processing endpoint"""
    # TODO: Implement manual payment processing
    return {"success": True, "message": "Manual payment processing"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)