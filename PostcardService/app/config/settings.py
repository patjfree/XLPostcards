import os
import cloudinary
import cloudinary.uploader
import resend
import stripe


def configure_services():
    """Configure external services with environment variables"""
    # Configure Cloudinary SDK
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "db9totnmb"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True,
    )
    
    # Configure Resend for email notifications
    resend.api_key = os.getenv("RESEND_API_KEY")
    
    # Configure Stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


# Environment variables
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./coupons.db")
STANNP_API_KEY = os.getenv("STANNP_API_KEY")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()