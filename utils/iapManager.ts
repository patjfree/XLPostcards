import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import Constants from 'expo-constants';
import * as RNIap from 'react-native-iap';

// Define product IDs
const PRODUCT_SKUS = {
  android: ['postcard_us'],
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
        let idempotencyKey = `xlpostcards-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        console.error('[XLPOSTCARDS][IAP] Purchase error:', error);
      }
    );
  }

  public async purchasePostcard(stripe?: any): Promise<Purchase> {
    console.log('[XLPOSTCARDS][IAP] Starting purchasePostcard, platform:', Platform.OS);
    
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
      console.log('[NANAGRAM][STRIPE] Device info:', {
        platform: Platform.OS,
        version: Platform.Version,
        constants: Platform.constants
      });
      
      const postcardPriceCents = Constants.expoConfig?.extra?.postcardPriceCents || 199;
      const APP_VARIANT = Constants.expoConfig?.extra?.APP_VARIANT || 'production';
      console.log('[NANAGRAM][STRIPE] Config values:', {
        APP_VARIANT,
        isDev,
        webhookUrl
      });
      const transactionId = uuidv4();
      const idempotencyKey = `xlpostcards-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    console.log('[XLPOSTCARDS][IAP] Android purchase flow starting');
    
    if (!this.isInitialized) {
      console.log('[XLPOSTCARDS][IAP] Initializing IAP connection...');
      await this.initialize();
    }
    
    const sku = PRODUCT_SKUS.android[0];
    console.log('[XLPOSTCARDS][IAP] Fetching products for SKU:', sku);
    
    try {
      const products = await RNIap.getProducts({ skus: [sku] });
      console.log('[XLPOSTCARDS][IAP] Available products:', products);
      
      if (!products || products.length === 0) {
        console.error('[XLPOSTCARDS][IAP] No products found for SKU:', sku);
        throw new Error(`Product ${sku} not found in store`);
      }
      
      console.log('[XLPOSTCARDS][IAP] Requesting purchase for:', products[0]);
      const purchaseResponse = await RNIap.requestPurchase({ skus: [sku] });
      console.log('[XLPOSTCARDS][IAP] Purchase response:', purchaseResponse);
      
      const purchase = (Array.isArray(purchaseResponse) ? purchaseResponse[0] : purchaseResponse) as PostcardPurchase;
      console.log('[XLPOSTCARDS][IAP] Processed purchase:', purchase);
      
      if (!purchase.purchaseToken && !purchase.transactionId) {
        console.error('[XLPOSTCARDS][IAP] Invalid purchase - missing tokens:', purchase);
        throw new Error('Invalid purchase: missing purchase token or transactionId');
      }
      
      console.log('[XLPOSTCARDS][IAP] Finishing transaction...');
      await RNIap.finishTransaction({ purchase, isConsumable: true });
      console.log('[XLPOSTCARDS][IAP] Purchase completed successfully');
      
      return purchase;
    } catch (error) {
      console.error('[XLPOSTCARDS][IAP] Detailed purchase error:', {
        error,
        message: (error as Error)?.message,
        code: (error as any)?.code,
        stack: (error as Error)?.stack,
        sku,
        isInitialized: this.isInitialized
      });
      throw error;
    }
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