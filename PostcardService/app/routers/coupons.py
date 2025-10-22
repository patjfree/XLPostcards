from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models.schemas import PromoCodeValidationRequest
from app.models.database import get_db
from app.services.coupon_service import (
    create_monthly_coupon,
    validate_promo_code,
    get_coupon_status,
    get_coupon_analytics
)

router = APIRouter()


@router.post("/create-monthly-coupon")
async def create_monthly_coupon_endpoint(db: Session = Depends(get_db)):
    """Create monthly coupon campaign"""
    try:
        return await create_monthly_coupon(db)
    except Exception as e:
        print(f"[COUPON] Error creating monthly coupon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/coupon-status")
async def get_coupon_status_endpoint(db: Session = Depends(get_db)):
    """Get current coupon status"""
    try:
        return await get_coupon_status(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-promo-code")
async def validate_promo_code_endpoint(request: PromoCodeValidationRequest, db: Session = Depends(get_db)):
    """Validate promo code"""
    try:
        return await validate_promo_code(request, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/coupon-analytics")
async def get_coupon_analytics_endpoint(db: Session = Depends(get_db)):
    """Get coupon analytics"""
    try:
        return await get_coupon_analytics(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))