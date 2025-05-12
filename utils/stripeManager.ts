import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useStripe } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

export interface StripePurchase {
  idempotencyKey: string;
  transactionId: string;
  amount: number;
  currency: string;
}

class StripeManager {
  private static instance: StripeManager;
  private readonly N8N_WEBHOOK_URL: string;
  private readonly POSTCARD_PRICE_CENTS: number;
  private readonly POSTCARD_PRICE_DOLLARS: number;

  private constructor() {
    this.N8N_WEBHOOK_URL = Constants.expoConfig?.extra?.n8nWebhookUrl || '';
    this.POSTCARD_PRICE_CENTS = Constants.expoConfig?.extra?.postcardPriceCents || 199;
    this.POSTCARD_PRICE_DOLLARS = Constants.expoConfig?.extra?.postcardPriceDollars || 1.99;
    if (!this.N8N_WEBHOOK_URL) {
      console.warn('N8N_WEBHOOK_URL is not set in app config');
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
      // 1. Call n8n webhook to create PaymentIntent
      const response = await fetch(this.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: this.POSTCARD_PRICE_CENTS, transactionId }),
      });
      const { clientSecret } = await response.json();
      if (!clientSecret) throw new Error('Payment initialization failed.');
      // 2. Init and present Payment Sheet
      const initResult = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'XLPostcards',
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