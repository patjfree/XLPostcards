import {
  initConnection,
  endConnection,
  getProducts,
  getPurchaseHistory,
  getAvailablePurchases,
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
      console.error('Nanagram-Log [NANAGRAM][IAP] Error initializing IAP:', error);
      throw error;
    }
  }

  private setupListeners(): void {
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: ProductPurchase) => {
        try {
          let idempotencyKey = '';
          try {
            idempotencyKey = `nanagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          } catch (error) {
            console.warn('Nanagram-Log [NANAGRAM][IAP] Warning: Failed to generate idempotency key:', error);
          }

          const purchaseWithIdempotency: PostcardPurchase = {
            ...purchase,
            idempotencyKey,
          };

          console.log('Nanagram-Log [NANAGRAM][IAP] Processing purchase update:', JSON.stringify(purchase));

          // Always finish the transaction if it has a token
          if (purchase.purchaseToken) {
            try {
              await finishTransaction({ purchase, isConsumable: true });
              console.log('Nanagram-Log [NANAGRAM][IAP] Finished transaction from listener:', purchase.transactionId);
            } catch (err) {
              console.error('Nanagram-Log [NANAGRAM][IAP] Error finishing transaction from listener:', err);
            }
          }

          return purchaseWithIdempotency;
        } catch (error) {
          console.error('Nanagram-Log [NANAGRAM][IAP] Error handling purchase update:', error);
          return purchase;
        }
      }
    );

    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('Nanagram-Log [NANAGRAM][IAP] Purchase error:', error);
      }
    );
  }

  public async purchasePostcard(): Promise<PostcardPurchase> {
    try {
      console.log("Nanagram-Log [NANAGRAM][IAP] Starting postcard purchase flow");
      if (!this.isInitialized) {
        console.log("Nanagram-Log [NANAGRAM][IAP] Initializing IAP manager");
        await this.initialize();
      }

      const sku = Platform.select({
        ios: PRODUCT_SKUS.ios[0],
        android: PRODUCT_SKUS.android[0],
      });

      if (!sku) {
        throw new Error('No product SKU available for this platform');
      }

      console.log("Nanagram-Log [NANAGRAM][IAP] Fetching products for SKU:", sku);
      const products = await getProducts({ skus: [sku] });
      console.log("Nanagram-Log [NANAGRAM][IAP] Available products:", JSON.stringify(products));
      
      if (!products || products.length === 0) {
        throw new Error(`Product ${sku} not found in store`);
      }

      console.log("Nanagram-Log [NANAGRAM][IAP] Initiating purchase for SKU:", sku);
      
      // Request purchase - handle both platforms with minimal branching
      const purchaseResponse = await requestPurchase(Platform.OS === 'ios' 
        ? { sku } 
        : { skus: [sku] }
      );
      
      // Handle array response from Android
      const purchase = (Array.isArray(purchaseResponse) ? purchaseResponse[0] : purchaseResponse) as PostcardPurchase;
      
      console.log("Nanagram-Log [NANAGRAM][IAP] Purchase completed:", JSON.stringify(purchase));

      // Only proceed if we have a valid purchase token
      if (!purchase.purchaseToken) {
        throw new Error('Invalid purchase: missing purchase token');
      }

      // Always call finishTransaction after a successful purchase
      try {
        console.log("Nanagram-Log [NANAGRAM][IAP] Finishing transaction");
        await finishTransaction({ purchase, isConsumable: true });
        console.log("Nanagram-Log [NANAGRAM][IAP] Transaction finished successfully");
        return purchase;
      } catch (error) {
        console.error("Nanagram-Log [NANAGRAM][IAP] Error finishing transaction:", error);
        // Even if we can't finish the transaction, return the purchase
        // The purchase update listener will handle the final state
        return purchase;
      }
    } catch (error) {
      console.error('Nanagram-Log [NANAGRAM][IAP] Error purchasing postcard:', error);
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

// Call this on app start to clear any unfinished transactions
export async function clearStalePurchases() {
  try {
    const purchases = await getAvailablePurchases();
    for (const purchase of purchases) {
      if (purchase && purchase.transactionId) {
        await finishTransaction({ purchase, isConsumable: true });
        console.log('Nanagram-Log [NANAGRAM][IAP] Finished stale transaction:', purchase.transactionId);
      }
    }
    console.log('Nanagram-Log [NANAGRAM][IAP] Cleared stale purchases');
  } catch (error) {
    console.error('Nanagram-Log [NANAGRAM][IAP] Error clearing stale purchases:', error);
  }
} 