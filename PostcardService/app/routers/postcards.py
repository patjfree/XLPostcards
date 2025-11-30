from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models.schemas import (
    PostcardRequest,
    StannpSubmissionRequest,
    FreePostcardRequest
)
from app.models.database import get_db
from app.services.postcard_generation_service import generate_complete_postcard_service
from app.services.postcard_service import submit_to_stannp

router = APIRouter()


@router.post("/generate-complete-postcard")
async def generate_complete_postcard(request: PostcardRequest, db: Session = Depends(get_db)):
    """Generate both front and back images, upload to Cloudinary"""
    try:
        from app.models.database import CouponCode, CouponDistribution
        
        # Create transaction store
        transaction_store = {}
        
        # Call service with all required arguments
        result = generate_complete_postcard_service(
            request=request,
            transaction_store=transaction_store,
            db_session=db,
            coupon_code_model=CouponCode,
            coupon_distribution_model=CouponDistribution
        )
        return result
    except Exception as e:
        print(f"[POSTCARD] Error generating postcard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit-to-stannp")
async def submit_to_stannp_endpoint(request: StannpSubmissionRequest, db: Session = Depends(get_db)):
    """Submit postcard to Stannp for printing and mailing"""
    try:
        return await submit_to_stannp(request, db)
    except Exception as e:
        print(f"[STANNP] Error submitting to Stannp: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transaction-status/{transaction_id}")
async def get_transaction_status(transaction_id: str):
    """Get transaction status"""
    try:
        # This would contain transaction status lookup logic
        pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-postcard-back")
async def generate_postcard_back_endpoint(request: PostcardRequest):
    """Generate postcard back only"""
    try:
        # Use the complete postcard generation service
        from app.models.database import CouponCode, CouponDistribution
        
        # Create transaction store (simple dict for compatibility)
        transaction_store = {}
        
        # Get database session
        db = next(get_db())
        
        try:
            # Call the complete service - it generates both front and back
            result = generate_complete_postcard_service(
                request=request,
                transaction_store=transaction_store,
                db_session=db,
                coupon_code_model=CouponCode,
                coupon_distribution_model=CouponDistribution
            )
            return result
        finally:
            db.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-free-postcard")
async def process_free_postcard(request: FreePostcardRequest, db: Session = Depends(get_db)):
    """Process free postcard with promo code"""
    try:
        # This would contain free postcard processing logic
        pass
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))