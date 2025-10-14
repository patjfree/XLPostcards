import Constants from 'expo-constants';

interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stackTrace?: string;
  userAgent?: string;
  buildInfo: {
    version: string;
    variant: string;
    platform: string;
  };
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private readonly RAILWAY_URL: string;
  private readonly enabled: boolean;

  private constructor() {
    this.RAILWAY_URL = Constants.expoConfig?.extra?.railwayPostcardUrl || '';
    // Only log in production builds
    this.enabled = Constants.expoConfig?.extra?.APP_VARIANT === 'production';
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  public async logError(message: string, error?: Error): Promise<void> {
    if (!this.enabled || !this.RAILWAY_URL) {
      console.log('[ERROR_LOGGER] Skipping remote logging (disabled or no URL)');
      return;
    }

    try {
      const errorLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        stackTrace: error?.stack,
        buildInfo: {
          version: Constants.expoConfig?.version || 'unknown',
          variant: Constants.expoConfig?.extra?.APP_VARIANT || 'unknown',
          platform: Constants.expoConfig?.platforms?.[0] || 'unknown'
        }
      };

      // Send to Railway backend
      await fetch(`${this.RAILWAY_URL}/log-app-error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorLog),
      });

      console.log('[ERROR_LOGGER] Error logged to Railway successfully');
    } catch (logError) {
      console.error('[ERROR_LOGGER] Failed to send error to Railway:', logError);
    }
  }

  public async logNavigation404(): Promise<void> {
    await this.logError('NAVIGATION_404: User reached not-found screen after payment or navigation');
  }

  public async logPaymentError(message: string, error?: Error): Promise<void> {
    await this.logError(`PAYMENT_ERROR: ${message}`, error);
  }

  public async logStannpError(message: string, error?: Error): Promise<void> {
    await this.logError(`STANNP_ERROR: ${message}`, error);
  }
}

export const errorLogger = ErrorLogger.getInstance();