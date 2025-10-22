from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./postcards.db"
    print(f"[DATABASE] No DATABASE_URL found, using SQLite fallback: {DATABASE_URL}")
else:
    engine = create_engine(DATABASE_URL)
    print(f"[DATABASE] Using SQLite fallback: {DATABASE_URL}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class CouponCampaign(Base):
    __tablename__ = "coupon_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_name = Column(String(100), unique=True, nullable=False)
    campaign_type = Column(String(50), nullable=False)
    description = Column(Text)
    max_redemptions = Column(Integer, default=500)
    discount_percent = Column(Integer, default=100)
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    coupon_codes = relationship("CouponCode", back_populates="campaign")


class CouponCode(Base):
    __tablename__ = "coupon_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("coupon_campaigns.id"))
    code = Column(String(50), unique=True, nullable=False, index=True)
    stripe_coupon_id = Column(String(100))
    stripe_promo_id = Column(String(100))
    max_redemptions = Column(Integer, default=500)
    times_redeemed = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    campaign = relationship("CouponCampaign", back_populates="coupon_codes")
    distributions = relationship("CouponDistribution", back_populates="coupon_code")
    redemptions = relationship("CouponRedemption", back_populates="coupon_code")


class CouponDistribution(Base):
    __tablename__ = "coupon_distributions"
    
    id = Column(Integer, primary_key=True, index=True)
    coupon_code_id = Column(Integer, ForeignKey("coupon_codes.id"))
    transaction_id = Column(String(100), nullable=False, index=True)
    recipient_name = Column(String(255))
    recipient_address = Column(Text)
    sent_at = Column(DateTime, default=func.now())
    postcard_size = Column(String(20))
    
    coupon_code = relationship("CouponCode", back_populates="distributions")


class CouponRedemption(Base):
    __tablename__ = "coupon_redemptions"
    
    id = Column(Integer, primary_key=True, index=True)
    coupon_code_id = Column(Integer, ForeignKey("coupon_codes.id"))
    transaction_id = Column(String(100))
    stripe_payment_intent_id = Column(String(100), index=True)
    customer_email = Column(String(255))
    redeemed_at = Column(DateTime, default=func.now())
    redemption_value_cents = Column(Integer, default=299)
    
    coupon_code = relationship("CouponCode", back_populates="redemptions")


class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    created_at = Column(DateTime, default=func.now())
    total_orders = Column(Integer, default=0)
    total_spent_cents = Column(Integer, default=0)
    first_order_date = Column(DateTime)
    last_order_date = Column(DateTime)
    is_active = Column(Boolean, default=True)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session():
    """Get direct database session for synchronous operations"""
    return SessionLocal()


def init_database():
    """Initialize database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        print("[DATABASE] Tables created successfully")
        
        # Test database connection
        test_session = SessionLocal()
        test_session.execute("SELECT 1")
        test_session.close()
        print("[DATABASE] Database connection test successful")
        
    except Exception as e:
        print(f"[DATABASE] Error setting up database: {e}")
        print("[DATABASE] Falling back to in-memory storage only")