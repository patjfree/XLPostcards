# Stripe Promotional Codes Setup Guide - XLWelcome

## Overview
This guide explains how to set up the "XLWelcome" promotional code in your Stripe dashboard for first-time customers only.

## Changes Made to Enable Promotional Codes

### 1. App Changes
- **stripeManager.ts**: Updated Payment Sheet initialization to enable promotional codes
- **app.config.js**: Added Apple Pay and Google Pay merchant IDs
- **Railway Backend**: Added fixed "XLWelcome" coupon code on all postcards

### 2. How It Works
1. Every postcard shows "First-time customers: Use code XLWelcome" in the top-right corner
2. First-time customers can enter "XLWelcome" in the Stripe Payment Sheet
3. Stripe automatically validates they haven't purchased before
4. Valid first-time customers get 100% discount (free postcard)
5. Same customer cannot use the code again

## Stripe Dashboard Setup

### Step 1: Create a Coupon
1. Go to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Products** → **Coupons**
3. Click **Create coupon**
4. Set up the coupon:
   - **ID**: `xlwelcome-free-postcard`
   - **Name**: XLWelcome Free Postcard
   - **Type**: Percentage
   - **Percentage off**: 100%
   - **Duration**: Once

### Step 2: Create the XLWelcome Promotional Code
1. In the same **Coupons** section, find your coupon
2. Click **Create promotional code**
3. Set up the promotional code:
   - **Code**: `XLWelcome` (exact case matters)
   - **Coupon**: Select the coupon you created above
   - **Active**: Yes
   - **Eligible for first-time order only**: ✅ **ENABLE THIS**
   - **Max redemptions**: Leave unlimited (Stripe handles per-customer limits)
   - **Expiry**: Set if desired (optional)

### 📋 Important Settings
- ✅ **"Use customer-facing coupon codes"** - ENABLED
- ✅ **"Eligible for first-time order only"** - ENABLED
- ❌ Do NOT limit to specific customer
- ❌ Do NOT limit number of times code can be redeemed (Stripe handles this per customer)

## Testing Promotional Codes

### Test the Flow
1. Build and run your app
2. Create a postcard (will show "First-time customers: Use code XLWelcome" in top-right)
3. At payment screen, tap "Add promotional code" 
4. Enter `XLWelcome`
5. Verify the discount applies (should show $0.00 for first-time customers)
6. Complete the "payment" (no charge will occur)

### Testing Different Scenarios
- **First-time customer**: Code should work, shows $0.00
- **Existing customer**: Code should be rejected by Stripe
- **Wrong code**: Any other code should show "not found"

## Environment Variables
Make sure these are set in your environment:
```bash
# Stripe Keys
STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)

# Optional: Apple/Google Pay (for promotional codes)
APPLE_MERCHANT_ID=merchant.com.patjfree.xlpostcards
GOOGLE_MERCHANT_ID=com.patjfree.xlpostcards
```

## Production Considerations

### Database Integration
The current implementation uses in-memory storage. For production:
1. Set up a database table for coupon codes
2. Track usage, expiration, and user association
3. Implement proper validation and security

### Security
- Validate codes server-side
- Implement rate limiting on validation endpoints
- Log coupon usage for audit trails
- Consider adding CAPTCHAs for coupon entry

### Monitoring
- Track coupon usage analytics
- Monitor for abuse or unusual patterns
- Set up alerts for high-value coupon usage

## API Endpoints Added

### Validate Coupon
```bash
POST /validate-coupon/{coupon_code}
```
Returns whether a coupon is valid and unused.

### Redeem Coupon  
```bash
POST /redeem-coupon/{coupon_code}
```
Marks a coupon as used (called automatically by webhooks).

## Webhook Events
The system handles these Stripe webhook events:
- `payment_intent.succeeded` - Automatically marks used coupon codes as redeemed

## Troubleshooting

### Promotional Codes Not Showing
- Ensure `allowsDelayedPaymentMethods: true` in Payment Sheet config
- Verify Stripe keys are correct for your environment
- Check that promotional codes are marked as "Active" in Stripe

### Codes Not Working
- Verify codes exist in Stripe dashboard
- Check expiration dates and usage limits
- Ensure codes haven't already been used

### Payment Issues
- Test with Stripe test mode first
- Verify webhook endpoints are working
- Check Railway backend logs for errors

## Next Steps

1. **Test thoroughly** in development mode
2. **Create initial promotional codes** in Stripe dashboard  
3. **Deploy backend changes** to Railway
4. **Build and test app** with real payment flow
5. **Monitor usage** and adjust as needed

## Support
For issues with Stripe integration, check:
- Stripe Dashboard → Developers → Logs
- Railway application logs
- App console logs during payment flow