import {
  initConnection,
  endConnection,
  getProducts,
  getPurchaseHistory,
  finishTransaction,
  purchaseErrorListener,
  purchaseUpdatedListener,
  ProductPurchase,
  PurchaseError,
  requestPurchase,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// Define product IDs
const PRODUCT_SKUS = {
  ios: ['Nana_Postcard'],
  android: ['nana_postcard'],
};

// Extend ProductPurchase to include our idempotency key
export interface PostcardPurchase extends ProductPurchase {
  idempotencyKey: string;
  transactionId?: string;
  purchaseStateAndroid?: number;
}

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

    try {
      await initConnection();
      this.setupListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error('[NANAGRAM][IAP] Error initializing IAP:', error);
      throw error;
    }
  }

  private setupListeners(): void {
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: ProductPurchase) => {
        try {
          let idempotencyKey = '';
          try {
            // Try to generate a unique idempotency key
            idempotencyKey = `nanagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          } catch (error) {
            console.warn('[NANAGRAM][IAP] Warning: Failed to generate idempotency key:', error);
            // Continue without idempotency key
          }
          
          // Store the idempotency key with the purchase
          const purchaseWithIdempotency: PostcardPurchase = {
            ...purchase,
            idempotencyKey,
          };

          console.log('[NANAGRAM][IAP] Processing purchase update:', JSON.stringify(purchase));

          // Return the purchase with idempotency key for the caller to handle
          return purchaseWithIdempotency;
        } catch (error) {
          console.error('[NANAGRAM][IAP] Error handling purchase update:', error);
          // Return the original purchase even if there's an error
          return purchase;
        }
      }
    );

    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('[NANAGRAM][IAP] Purchase error:', error);
      }
    );
  }

  public async purchasePostcard(): Promise<PostcardPurchase> {
    try {
      console.log("[NANAGRAM][IAP] Starting postcard purchase flow");
      if (!this.isInitialized) {
        console.log("[NANAGRAM][IAP] Initializing IAP manager");
        await this.initialize();
      }

      const sku = Platform.select({
        ios: PRODUCT_SKUS.ios[0],
        android: PRODUCT_SKUS.android[0],
      });

      if (!sku) {
        throw new Error('No product SKU available for this platform');
      }

      console.log("[NANAGRAM][IAP] Fetching products for SKU:", sku);
      // First fetch the products to get their details
      const products = await getProducts({ skus: [sku] });
      console.log("[NANAGRAM][IAP] Available products:", JSON.stringify(products));
      
      if (!products || products.length === 0) {
        throw new Error(`Product ${sku} not found in store`);
      }

      console.log("[NANAGRAM][IAP] Initiating purchase for SKU:", sku);
      // Handle iOS and Android differently
      if (Platform.OS === 'ios') {
        // iOS requires a single sku string
        const purchase = await requestPurchase({ sku }) as PostcardPurchase;
        console.log("[NANAGRAM][IAP] iOS Purchase completed:", JSON.stringify(purchase));
        
        // For iOS, finish the transaction after successful purchase
        await finishTransaction({ purchase });
        return purchase;
      } else {
        // Android can take an array of skus
        const purchase = await requestPurchase({ skus: [sku] }) as PostcardPurchase;
        console.log("[NANAGRAM][IAP] Android Purchase completed:", JSON.stringify(purchase));
        
        // Log purchase state for debugging
        console.log("[NANAGRAM][IAP] Purchase state:", purchase.purchaseStateAndroid);
        
        // Handle purchase state - more robust handling
        if (purchase.purchaseStateAndroid === undefined) {
          // If purchase state is undefined but we have a valid purchase token and transaction ID,
          // assume the purchase is complete
          if (purchase.purchaseToken && purchase.transactionId) {
            console.log("[NANAGRAM][IAP] Purchase state undefined but has valid purchase token, proceeding with completion");
            await finishTransaction({ purchase, isConsumable: true });
            return purchase;
          } else {
            console.error("[NANAGRAM][IAP] Invalid purchase: missing required fields");
            throw new Error('Invalid purchase: missing required fields');
          }
        } else if (purchase.purchaseStateAndroid === 0) {
          // Purchase is complete, finish the transaction
          console.log("[NANAGRAM][IAP] Purchase is complete, finishing transaction");
          await finishTransaction({ purchase, isConsumable: true });
          return purchase;
        } else if (purchase.purchaseStateAndroid === 1) {
          // Purchase is pending, wait and retry
          console.log("[NANAGRAM][IAP] Purchase is pending, waiting...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            console.log("[NANAGRAM][IAP] Retrying to finish transaction...");
            await finishTransaction({ purchase, isConsumable: true });
            console.log("[NANAGRAM][IAP] Transaction finished successfully");
            return purchase;
          } catch (error) {
            console.error("[NANAGRAM][IAP] Error finishing transaction:", error);
            // If we can't finish the transaction, still return the purchase
            // The purchase update listener will handle the final state
            return purchase;
          }
        } else {
          // Invalid purchase state
          console.error("[NANAGRAM][IAP] Invalid purchase state:", purchase.purchaseStateAndroid);
          throw new Error('Purchase is not in a valid state');
        }
      }
    } catch (error) {
      console.error('[NANAGRAM][IAP] Error purchasing postcard:', error);
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }
    if (this.isInitialized) {
      await endConnection();
      this.isInitialized = false;
    }
  }
}

export const iapManager = IAPManager.getInstance(); 