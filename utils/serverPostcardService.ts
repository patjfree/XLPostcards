import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { PostcardSize } from './printSpecs';

interface RecipientInfo {
  to: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  id?: string;
}

interface ServerPostcardRequest {
  message: string;
  recipientInfo: RecipientInfo;
  postcardSize: PostcardSize;
  transactionId: string;
  frontImageUri?: string; // Legacy single image support
  frontImageUris?: string[]; // New multi-image support
  frontImageBase64?: string;
  dimensions?: { width: number; height: number };
  testMode?: boolean;
  variant?: string;
  returnAddressText?: string | string[]; // New in v2.1: Support for return address
  userEmail?: string; // User email for confirmation
  templateType?: string; // Template type: single, two_side_by_side, three_photos, four_quarters
}

interface ServerPostcardResponse {
  success: boolean;
  postcard_back_url?: string;
  frontUrl?: string;
  backUrl?: string;
  status?: string;
  public_id?: string;
  postcardSize?: string;
  dimensions?: { width: number; height: number };
  transactionId?: string;
  isTestMode?: boolean;
  fileSize?: number;
  messageLines?: number;
  messageFontSize?: number;
  addressFontSize?: number;
  cloudinary_url?: string;
  stannp_id?: string;
  stannp_status?: string;
  generated_at?: string;
  message?: string;
  error?: string;
}

/**
 * Generates a postcard back image using Railway PostcardService server-side rendering
 * This completely bypasses iOS ViewShot limitations
 */
export const generatePostcardBackServer = async (
  request: ServerPostcardRequest
): Promise<string> => {
  console.log('[SERVER_POSTCARD] Requesting server generation for transaction:', request.transactionId);
  console.log('[SERVER_POSTCARD] Postcard size:', request.postcardSize);
  console.log('[SERVER_POSTCARD] Message preview:', request.message.substring(0, 50) + '...');
  
  // Use Railway PostcardService exclusively
  const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl;
  const serviceUrl = `${railwayBaseUrl}/generate-complete-postcard`;
  const serviceName = 'Railway PostcardService';
  
  if (!railwayBaseUrl) {
    throw new Error('Railway PostcardService URL not configured. Please check your app.config.js railwayPostcardUrl setting.');
  }
  
  console.log('[SERVER_POSTCARD] Using service:', serviceName);
  console.log('[SERVER_POSTCARD] Using URL:', serviceUrl.replace(/https:\/\/[^/]+/, 'https://***'));
  
  try {
    const startTime = Date.now();
    
    // Add environment info to request
    const isDev = Constants.expoConfig?.extra?.APP_VARIANT === 'development';
    const enhancedRequest = {
      ...request,
      testMode: isDev,
      variant: Constants.expoConfig?.extra?.APP_VARIANT || 'production'
    };
    
    console.log('[SERVER_POSTCARD] Test mode:', isDev);
    console.log('[SERVER_POSTCARD] Variant:', enhancedRequest.variant);
    
    // Make request to service
    console.log(`[SERVER_POSTCARD] Sending request to ${serviceName}...`);
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'XLPostcards/1.14.0',
      },
      body: JSON.stringify(enhancedRequest),
    });
    
    const duration = Date.now() - startTime;
    console.log(`[SERVER_POSTCARD] ${serviceName} response received in`, duration, 'ms');
    console.log('[SERVER_POSTCARD] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SERVER_POSTCARD] ${serviceName} returned error status:`, response.status);
      console.error('[SERVER_POSTCARD] Error response:', errorText);
      throw new Error(`${serviceName} server responded with ${response.status}: ${errorText}`);
    }
    
    const result: ServerPostcardResponse = await response.json();
    console.log(`[SERVER_POSTCARD] ${serviceName} response parsed successfully`);
    console.log('[SERVER_POSTCARD] Success:', result.success);
    console.log('[SERVER_POSTCARD] Test mode:', result.isTestMode);
    console.log('[SERVER_POSTCARD] File size:', result.fileSize, 'bytes');
    console.log('[SERVER_POSTCARD] Message lines:', result.messageLines);
    console.log('[SERVER_POSTCARD] Font sizes: message=' + result.messageFontSize + 'pt, address=' + result.addressFontSize + 'pt');
    
    if (result.message) {
      console.log('[SERVER_POSTCARD] Workflow message:', result.message);
    }
    
    if (!result.success) {
      console.error(`[SERVER_POSTCARD] ${serviceName} reported failure:`, result.error);
      throw new Error(result.error || `${serviceName} server generation failed`);
    }
    
    // Railway PostcardService returns backUrl
    const imageUrl = result.backUrl;
    
    if (!imageUrl) {
      console.error('[SERVER_POSTCARD] No image URL returned from server');
      throw new Error('No image URL returned from server');
    }
    
    console.log('[SERVER_POSTCARD] Server generation successful!');
    console.log('[SERVER_POSTCARD] Image URL:', imageUrl.substring(0, 50) + '...');
    console.log('[SERVER_POSTCARD] Service:', serviceName);
    
    console.log('[SERVER_POSTCARD] Railway status:', result.status);
    console.log('[SERVER_POSTCARD] Front URL:', result.frontUrl?.substring(0, 50) + '...');
    
    // Railway PostcardService test mode
    const isTestMode = result.isTestMode === true || result.isTestMode === 'true';
    
    console.log('[SERVER_POSTCARD] Test mode:', isTestMode);
    
    return { 
      imageUrl,
      isTestMode,
      frontUrl: result.frontUrl
    };
    
  } catch (error) {
    console.error('[SERVER_POSTCARD] Server generation failed:', error);
    
    // Enhanced error reporting
    if (error instanceof Error) {
      if (error.message.includes('Network request failed')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
    }
    
    throw error;
  }
};

/**
 * Downloads a server-generated image to local storage for Stannp submission
 * This converts the Railway PostcardService URL to a local file that Stannp can use
 */
export const downloadServerImage = async (
  imageUrl: string,
  transactionId: string
): Promise<string> => {
  console.log('[SERVER_POSTCARD] Downloading server image for transaction:', transactionId);
  console.log('[SERVER_POSTCARD] Source URL:', imageUrl.substring(0, 50) + '...');
  
  try {
    const startTime = Date.now();
    
    // Download the image
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'XLPostcards/1.14.0',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const downloadDuration = Date.now() - startTime;
    console.log('[SERVER_POSTCARD] Image downloaded in', downloadDuration, 'ms');
    
    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Save to local file
    const fileName = `server-postcard-back-${transactionId}-${Date.now()}.png`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const totalDuration = Date.now() - startTime;
    console.log('[SERVER_POSTCARD] Image saved locally in', totalDuration, 'ms total');
    console.log('[SERVER_POSTCARD] Local file path:', filePath);
    console.log('[SERVER_POSTCARD] File size:', base64.length * 0.75, 'bytes (estimated)');
    
    return filePath;
    
  } catch (error) {
    console.error('[SERVER_POSTCARD] Failed to download server image:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Network request failed')) {
        throw new Error('Network error during image download. Please check your internet connection.');
      }
    }
    
    throw error;
  }
};

/**
 * Validates that the required Railway PostcardService configuration is present
 */
export const validateServerConfiguration = (): boolean => {
  const railwayUrl = Constants.expoConfig?.extra?.railwayPostcardUrl;
  
  if (!railwayUrl) {
    console.error('[SERVER_POSTCARD] Railway PostcardService URL not configured');
    return false;
  }
  
  console.log('[SERVER_POSTCARD] Server configuration validated for Railway PostcardService');
  return true;
};