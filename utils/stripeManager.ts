import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useStripe } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

const variant = Constants.expoConfig?.extra?.APP_VARIANT ?? 'production';
const stripeKey = Constants.expoConfig?.extra?.stripePublishableKey;

export interface StripePurchase {
  idempotencyKey: string;
  transactionId: string;
  amount: number;
  currency: string;
}

class StripeManager {
  private static instance: StripeManager;
  private readonly RAILWAY_POSTCARD_URL: string;
  private readonly POSTCARD_PRICE_CENTS: number;
  private readonly POSTCARD_PRICE_DOLLARS: number;

  private constructor() {
    // Use Railway PostcardService URL
    this.RAILWAY_POSTCARD_URL = Constants.expoConfig?.extra?.railwayPostcardUrl || '';
    this.POSTCARD_PRICE_CENTS = Constants.expoConfig?.extra?.postcardPriceCents || 199;
    this.POSTCARD_PRICE_DOLLARS = Constants.expoConfig?.extra?.postcardPriceDollars || 1.99;
    if (!this.RAILWAY_POSTCARD_URL) {
      console.warn('Railway PostcardService URL is not set in app config');
    }
  }

  public static getInstance(): StripeManager {
    if (!StripeManager.instance) {
      StripeManager.instance = new StripeManager();
    }
    return StripeManager.instance;
  }

  public async purchasePostcard(stripe: ReturnType<typeof useStripe>): Promise<StripePurchase> {
    if (Platform.OS !== 'ios') {
      throw new Error('Stripe payments are only available on iOS');
    }
    try {
      console.log('[XLPOSTCARDS][STRIPE] Starting Stripe payment flow');
      const transactionId = uuidv4();
      const idempotencyKey = `xlpostcards-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const purchase: StripePurchase = {
        idempotencyKey,
        transactionId,
        amount: this.POSTCARD_PRICE_CENTS,
        currency: 'usd',
      };
      // 1. Call Railway PostcardService to create Stripe checkout session
      const response = await fetch(`${this.RAILWAY_POSTCARD_URL}/create-payment-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: this.POSTCARD_PRICE_CENTS,
          transactionId,
          successUrl: 'https://stripe.com/docs/payments/checkout/custom-success-page',
          cancelUrl: 'https://stripe.com/docs/payments/checkout'
        }),
      });
      const { sessionId, checkoutUrl } = await response.json();
      if (!sessionId) throw new Error('Payment session creation failed.');
      // 2. For mobile app, we need to create PaymentIntent directly (not checkout session)
      // Let's use a different endpoint for mobile payment intent creation
      const piResponse = await fetch(`${this.RAILWAY_POSTCARD_URL}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: this.POSTCARD_PRICE_CENTS,
          transactionId
        }),
      });
      const { clientSecret: paymentClientSecret } = await piResponse.json();
      if (!paymentClientSecret) throw new Error('Payment intent creation failed.');
      
      // Init and present Payment Sheet
      const initResult = await stripe.initPaymentSheet({
        paymentIntentClientSecret: paymentClientSecret,
        merchantDisplayName: 'XLPostcards',
        allowsDelayedPaymentMethods: true,
        appearance: {
          primaryButton: {
            backgroundColor: '#f28914'
          }
        },
        applePay: {
          merchantId: Constants.expoConfig?.extra?.appleMerchantId || 'merchant.com.xlpostcards',
        },
        googlePay: {
          merchantId: Constants.expoConfig?.extra?.googleMerchantId || 'xlpostcards',
          testEnvironment: variant !== 'production',
        },
        defaultBillingDetails: {},
        returnURL: 'xlpostcards://stripe-redirect',
      });
      if (initResult.error) throw new Error(initResult.error.message);
      const paymentResult = await stripe.presentPaymentSheet();
      if (paymentResult.error) throw new Error(paymentResult.error.message);
      // 3. Only return purchase if payment is successful
      return purchase;
    } catch (error) {
      console.error('[XLPOSTCARDS][STRIPE] Error in Stripe payment flow:', error);
      throw error;
    }
  }
}

export const stripeManager = StripeManager.getInstance(); 