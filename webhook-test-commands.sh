#!/bin/bash

# Railway PostcardService Webhook Testing Commands
# Update BASE_URL to match your Railway deployment

BASE_URL="https://postcardservice-test.up.railway.app"
# For production: BASE_URL="https://postcardservice-prod.up.railway.app"

echo "🚂 Testing Railway PostcardService Webhooks"
echo "Base URL: $BASE_URL"
echo ""

# 1. Health Check
echo "1️⃣ Health Check:"
curl -X GET "$BASE_URL/health" | jq '.' || echo "Health check failed"
echo -e "\n"

# 2. Create Payment Intent (for mobile app)
echo "2️⃣ Create Payment Intent:"
curl -X POST "$BASE_URL/create-payment-intent" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 199,
    "transactionId": "test-payment-intent-'$(date +%s)'"
  }' | jq '.' || echo "Payment Intent creation failed"
echo -e "\n"

# 3. Generate Complete Postcard
echo "3️⃣ Generate Complete Postcard:"
TRANSACTION_ID="test-postcard-$(date +%s)"
curl -X POST "$BASE_URL/generate-complete-postcard" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test postcard from webhook testing script! This tests the Railway PostcardService endpoint.",
    "recipientInfo": {
      "to": "Test Recipient",
      "addressLine1": "123 Test Street",
      "addressLine2": "Apt 1",
      "city": "Test City",
      "state": "CA",
      "zipcode": "90210"
    },
    "postcardSize": "regular",
    "returnAddressText": "Test Sender\n456 Sender Ave\nSender City, TX 12345",
    "transactionId": "'$TRANSACTION_ID'",
    "frontImageUri": "https://res.cloudinary.com/db9totnmb/image/upload/sample.jpg",
    "userEmail": "test@example.com"
  }' | jq '.' || echo "Postcard generation failed"
echo -e "\n"

# 4. Simulate Stripe Checkout Session Webhook
echo "4️⃣ Simulate Stripe Checkout Webhook:"
curl -X POST "$BASE_URL/stripe-webhook" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=$(date +%s),v1=test_signature" \
  -d '{
    "id": "evt_test_webhook",
    "object": "event",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_session",
        "object": "checkout.session",
        "payment_status": "paid",
        "payment_intent": "pi_test_payment",
        "metadata": {
          "transaction_id": "test-webhook-'$(date +%s)'",
          "service": "xlpostcards",
          "postcard_size": "regular"
        }
      }
    }
  }' | jq '.' || echo "Webhook simulation failed"
echo -e "\n"

# 5. Test Email Notification
echo "5️⃣ Test Email Notification:"
curl -X POST "$BASE_URL/test-email?email=your-email@example.com" | jq '.' || echo "Email test failed"
echo -e "\n"

echo "✅ Webhook testing complete!"
echo ""
echo "📝 To test with your own data:"
echo "   - Update the email address in test #5"
echo "   - Change BASE_URL to production when ready"
echo "   - Use real Cloudinary image URLs for better testing"
echo ""
echo "🔍 Check Railway logs for detailed request/response info"