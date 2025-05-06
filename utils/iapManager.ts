import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import Constants from 'expo-constants';
import * as RNIap from 'react-native-iap';

// Define product IDs
const PRODUCT_SKUS = {
  android: ['nana_postcard'],
};

export interface PostcardPurchase extends RNIap.ProductPurchase {
  idempotencyKey: string;
  transactionId?: string;
  purchaseStateAndroid?: number;
}

export interface StripePurchase {
  idempotencyKey: string;
  transactionId: string;
  amount: number;
  currency: string;
}

export type Purchase = PostcardPurchase | StripePurchase;

class IAPManager {
  private static instance: IAPManager;
  private isInitialized: boolean = false;
  private purchaseUpdateSubscription: any;
  private purchaseErrorSubscription: any;

  private constructor() {}

  public static getInstance(): IAPManager {
    if (!IAPManager.instance) {
      IAPManager.instance = new IAPManager();
    }
    return IAPManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (Platform.OS === 'android') {
      await RNIap.initConnection();
      this.setupListeners();
    }
    this.isInitialized = true;
  }

  private setupListeners(): void {
    if (Platform.OS !== 'android') return;
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase: RNIap.ProductPurchase) => {
        let idempotencyKey = `nanagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const purchaseWithIdempotency: PostcardPurchase = {
          ...purchase,
          idempotencyKey,
        };
        if (purchase.purchaseToken) {
          await RNIap.finishTransaction({ purchase, isConsumable: true });
        }
        return purchaseWithIdempotency;
      }
    );
    this.purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error: RNIap.PurchaseError) => {
        console.error('[NANAGRAM][IAP] Purchase error:', error);
      }
    );
  }

  public async purchasePostcard(stripe?: any): Promise<Purchase> {
    if (Platform.OS === 'ios') {
      // Stripe Payment Sheet logic
      // Get the appropriate webhook URL based on environment
      const isDev = Constants.expoConfig?.extra?.APP_VARIANT === 'development';
      const webhookUrl = isDev 
        ? Constants.expoConfig?.extra?.n8nWebhookUrl_dev 
        : Constants.expoConfig?.extra?.n8nWebhookUrl_prod;
      
      if (!webhookUrl) {
        console.error('[NANAGRAM][STRIPE] Webhook URL is undefined!', {
          isDev,
          APP_VARIANT: Constants.expoConfig?.extra?.APP_VARIANT,
          availableUrls: {
            dev: Constants.expoConfig?.extra?.n8nWebhookUrl_dev,
            prod: Constants.expoConfig?.extra?.n8nWebhookUrl_prod
          }
        });
        throw new Error('Webhook URL is not configured');
      }
      
      console.log('[NANAGRAM][STRIPE] Using webhook URL:', webhookUrl);
      
      const postcardPriceCents = Constants.expoConfig?.extra?.postcardPriceCents || 199;
      const APP_VARIANT = Constants.expoConfig?.extra?.APP_VARIANT || 'production';
      console.log('[NANAGRAM][STRIPE] Config values:', {
        APP_VARIANT,
        isDev,
        webhookUrl
      });
      const transactionId = uuidv4();
      const idempotencyKey = `nanagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const purchase: StripePurchase = {
        idempotencyKey,
        transactionId,
        amount: postcardPriceCents,
        currency: 'usd',
      };

      // Create the request body
      const requestBody = {
        amount: postcardPriceCents,
        transactionId,
        APP_VARIANT
      };
      console.log('[NANAGRAM][STRIPE] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const text = await response.text();
      console.log('Stripe webhook response:', text);
      const { clientSecret } = JSON.parse(text);
      if (!clientSecret) throw new Error('Payment initialization failed.');
      const initResult = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'NanaGram',
      });
      if (initResult.error) throw new Error(initResult.error.message);
      const paymentResult = await stripe.presentPaymentSheet();
      if (paymentResult.error) throw new Error(paymentResult.error.message);
      return purchase;
    }
    // Android IAP logic
    if (!this.isInitialized) {
      await this.initialize();
    }
    const sku = PRODUCT_SKUS.android[0];
    const products = await RNIap.getProducts({ skus: [sku] });
    if (!products || products.length === 0) {
      throw new Error(`Product ${sku} not found in store`);
    }
    const purchaseResponse = await RNIap.requestPurchase({ skus: [sku] });
    const purchase = (Array.isArray(purchaseResponse) ? purchaseResponse[0] : purchaseResponse) as PostcardPurchase;
    if (!purchase.purchaseToken && !purchase.transactionId) {
      throw new Error('Invalid purchase: missing purchase token or transactionId');
    }
    await RNIap.finishTransaction({ purchase, isConsumable: true });
    return purchase;
  }

  public async cleanup(): Promise<void> {
    if (Platform.OS === 'android') {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
      }
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
      }
      if (this.isInitialized) {
        await RNIap.endConnection();
        this.isInitialized = false;
      }
    }
  }
}

export const iapManager = IAPManager.getInstance();

export async function clearStalePurchases() {
  if (Platform.OS === 'android') {
    try {
      const purchases = await RNIap.getAvailablePurchases();
      for (const purchase of purchases) {
        if (purchase && purchase.transactionId) {
          await RNIap.finishTransaction({ purchase, isConsumable: true });
        }
      }
    } catch (error) {
      console.error('[NANAGRAM][IAP] Error clearing stale purchases:', error);
    }
  }
} 