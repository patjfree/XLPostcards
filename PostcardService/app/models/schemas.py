from pydantic import BaseModel, Field
from typing import Dict, Optional, List


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
    frontImageUri: Optional[str] = ""  # Legacy single image support
    frontImageUris: Optional[List[str]] = []  # New multi-image support
    templateType: Optional[str] = "single"  # Template type: single, two_side_by_side, three_photos, four_quarters, two_vertical, five_collage, six_grid, three_horizontal
    userEmail: Optional[str] = ""


class PaymentConfirmedRequest(BaseModel):
    transactionId: str
    stripePaymentIntentId: str
    userEmail: Optional[str] = ""


class StannpSubmissionRequest(BaseModel):
    transactionId: str


class PromoCodeValidationRequest(BaseModel):
    code: str
    transactionId: Optional[str] = ""


class FreePostcardRequest(BaseModel):
    message: str
    recipientInfo: Recipient
    postcardSize: str
    returnAddressText: str = ""
    transactionId: str = ""
    frontImageUri: Optional[str] = ""
    frontImageUris: Optional[List[str]] = []
    templateType: Optional[str] = "single"
    userEmail: Optional[str] = ""
    promoCode: str


class CreatePaymentSessionRequest(BaseModel):
    message: str
    recipientInfo: Recipient
    postcardSize: str
    returnAddressText: str = ""
    frontImageUri: str
    userEmail: Optional[str] = ""
    successUrl: Optional[str] = "https://stripe.com/docs/payments/checkout/custom-success-page"
    cancelUrl: Optional[str] = "https://stripe.com/docs/payments/checkout"


class PaymentSessionResponse(BaseModel):
    success: bool
    sessionId: str
    checkoutUrl: str
    transactionId: str


class AppErrorLog(BaseModel):
    timestamp: str
    level: str
    message: str
    stackTrace: Optional[str] = None
    userAgent: Optional[str] = None
    buildInfo: Dict