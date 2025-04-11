import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

interface PostcardTransaction {
  idempotencyKey: string;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
}

class PostcardService {
  private static instance: PostcardService;
  private readonly STORAGE_KEY = '@PostcardTransactions';

  private constructor() {}

  public static getInstance(): PostcardService {
    if (!PostcardService.instance) {
      PostcardService.instance = new PostcardService();
    }
    return PostcardService.instance;
  }

  public async createTransaction(transactionId: string): Promise<string> {
    const idempotencyKey = uuidv4();
    const transaction: PostcardTransaction = {
      idempotencyKey,
      transactionId,
      status: 'pending',
      timestamp: Date.now(),
    };

    // Store the transaction
    await this.storeTransaction(transaction);
    return idempotencyKey;
  }

  public async checkTransactionStatus(transactionId: string): Promise<'pending' | 'completed' | 'failed' | null> {
    const transactions = await this.getTransactions();
    const transaction = transactions.find(t => t.transactionId === transactionId);
    return transaction?.status || null;
  }

  public async markTransactionComplete(transactionId: string): Promise<void> {
    const transactions = await this.getTransactions();
    const transaction = transactions.find(t => t.transactionId === transactionId);
    
    if (transaction) {
      transaction.status = 'completed';
      await this.storeTransactions(transactions);
    }
  }

  public async markTransactionFailed(transactionId: string): Promise<void> {
    const transactions = await this.getTransactions();
    const transaction = transactions.find(t => t.transactionId === transactionId);
    
    if (transaction) {
      transaction.status = 'failed';
      await this.storeTransactions(transactions);
    }
  }

  private async getTransactions(): Promise<PostcardTransaction[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(this.STORAGE_KEY);
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('[NANAGRAM][POSTCARD] Error reading transactions:', error);
      return [];
    }
  }

  private async storeTransaction(transaction: PostcardTransaction): Promise<void> {
    const transactions = await this.getTransactions();
    transactions.push(transaction);
    await this.storeTransactions(transactions);
  }

  private async storeTransactions(transactions: PostcardTransaction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('[NANAGRAM][POSTCARD] Error storing transactions:', error);
    }
  }

  // Clean up old transactions (older than 24 hours)
  public async cleanupOldTransactions(): Promise<void> {
    const transactions = await this.getTransactions();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const recentTransactions = transactions.filter(
      t => now - t.timestamp < oneDay
    );
    
    await this.storeTransactions(recentTransactions);
  }
}

export const postcardService = PostcardService.getInstance(); 