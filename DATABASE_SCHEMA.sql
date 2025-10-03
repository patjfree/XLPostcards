-- XLPostcards Coupon Tracking Database Schema
-- This will track all coupons we generate and send out

-- Table for tracking different coupon campaigns
CREATE TABLE coupon_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(100) NOT NULL UNIQUE,
    campaign_type VARCHAR(50) NOT NULL, -- 'monthly_welcome', 'seasonal', 'custom', etc.
    description TEXT,
    max_redemptions INTEGER DEFAULT 500,
    discount_percent INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Table for tracking individual coupon codes
CREATE TABLE coupon_codes (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES coupon_campaigns(id),
    code VARCHAR(50) NOT NULL UNIQUE,
    stripe_coupon_id VARCHAR(100),
    stripe_promo_id VARCHAR(100),
    max_redemptions INTEGER DEFAULT 500,
    times_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Table for tracking when coupons are sent on postcards
CREATE TABLE coupon_distributions (
    id SERIAL PRIMARY KEY,
    coupon_code_id INTEGER REFERENCES coupon_codes(id),
    transaction_id VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_address TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    postcard_size VARCHAR(20)
);

-- Table for tracking coupon redemptions
CREATE TABLE coupon_redemptions (
    id SERIAL PRIMARY KEY,
    coupon_code_id INTEGER REFERENCES coupon_codes(id),
    transaction_id VARCHAR(100),
    stripe_payment_intent_id VARCHAR(100),
    customer_email VARCHAR(255),
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redemption_value_cents INTEGER DEFAULT 299
);

-- Create indexes for performance
CREATE INDEX idx_coupon_codes_code ON coupon_codes(code);
CREATE INDEX idx_coupon_codes_campaign ON coupon_codes(campaign_id);
CREATE INDEX idx_distributions_transaction ON coupon_distributions(transaction_id);
CREATE INDEX idx_redemptions_coupon ON coupon_redemptions(coupon_code_id);
CREATE INDEX idx_redemptions_payment_intent ON coupon_redemptions(stripe_payment_intent_id);

-- Insert initial monthly welcome campaign
INSERT INTO coupon_campaigns (
    campaign_name, 
    campaign_type, 
    description, 
    max_redemptions, 
    discount_percent
) VALUES (
    'Monthly Welcome Campaign',
    'monthly_welcome',
    'Monthly rotating welcome codes for first-time customers (XLWelcomeMonth format)',
    500,
    100
);

-- Sample queries for analytics:

-- Get current month's coupon performance
-- SELECT 
--     cc.code,
--     cc.times_redeemed,
--     cc.max_redemptions,
--     (cc.max_redemptions - cc.times_redeemed) as remaining,
--     COUNT(cd.id) as postcards_sent
-- FROM coupon_codes cc
-- LEFT JOIN coupon_distributions cd ON cc.id = cd.coupon_code_id
-- WHERE cc.expires_at > CURRENT_TIMESTAMP 
-- AND cc.is_active = true
-- GROUP BY cc.id;

-- Get redemption rate by month
-- SELECT 
--     DATE_TRUNC('month', cc.created_at) as month,
--     COUNT(cd.id) as postcards_sent,
--     SUM(cc.times_redeemed) as total_redeemed,
--     ROUND(SUM(cc.times_redeemed) * 100.0 / COUNT(cd.id), 2) as redemption_rate_percent
-- FROM coupon_codes cc
-- LEFT JOIN coupon_distributions cd ON cc.id = cd.coupon_code_id
-- WHERE cc.campaign_id = 1
-- GROUP BY DATE_TRUNC('month', cc.created_at)
-- ORDER BY month DESC;