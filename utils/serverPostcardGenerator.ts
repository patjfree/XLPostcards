import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { PostcardSize, getPrintPixels, getFrontBleedPixels } from './printSpecs';
import { generatePostcardBackServer, downloadServerImage, validateServerConfiguration } from './serverPostcardService';

interface RecipientInfo {
  to: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  id?: string;
}

/**
 * Generates postcard front by scaling the user's image
 * This part works reliably and doesn't need server-side processing
 */
export const generatePostcardFrontServer = async (
  imageUri: string,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[SERVER_GENERATOR] Generating postcard front (client-side)');
  
  const frontDimensions = getFrontBleedPixels(postcardSize);
  console.log('[SERVER_GENERATOR] Target front dimensions:', frontDimensions);
  
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: frontDimensions.width, height: frontDimensions.height } }],
      { 
        compress: 0.9, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    console.log('[SERVER_GENERATOR] Front image generated successfully:', result.uri);
    return result.uri;
    
  } catch (error) {
    console.error('[SERVER_GENERATOR] Error generating front image:', error);
    throw new Error(`Failed to generate postcard front: ${error}`);
  }
};

/**
 * Generates postcard back using N8N server-side rendering
 * This completely bypasses iOS ViewShot limitations
 */
export const generatePostcardBackServerSide = async (
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  transactionId?: string
): Promise<string> => {
  console.log('[SERVER_GENERATOR] Generating postcard back (server-side)');
  
  // Validate configuration first
  if (!validateServerConfiguration()) {
    throw new Error('Server-side generation not properly configured. Please check N8N webhook URLs.');
  }
  
  const dimensions = getPrintPixels(postcardSize);
  const txnId = transactionId || `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[SERVER_GENERATOR] Transaction ID:', txnId);
  console.log('[SERVER_GENERATOR] Target back dimensions:', dimensions);
  console.log('[SERVER_GENERATOR] Recipient:', recipientInfo.to);
  
  try {
    // Step 1: Request server generation
    console.log('[SERVER_GENERATOR] Step 1: Requesting server generation...');
    const imageUrl = await generatePostcardBackServer({
      message,
      recipientInfo,
      postcardSize,
      transactionId: txnId,
      dimensions
    });
    
    // Step 2: Download generated image to local storage
    console.log('[SERVER_GENERATOR] Step 2: Downloading generated image...');
    const localPath = await downloadServerImage(imageUrl, txnId);
    
    console.log('[SERVER_GENERATOR] Server-side back generation completed successfully');
    return localPath;
    
  } catch (error) {
    console.error('[SERVER_GENERATOR] Server-side back generation failed:', error);
    throw new Error(`Failed to generate postcard back on server: ${error}`);
  }
};

/**
 * Main function to generate complete postcard using server-side approach
 * Front: Client-side ImageManipulator (works reliably)
 * Back: Server-side N8N + Python PIL (bypasses iOS ViewShot issues)
 */
export const generateCompletePostcardServer = async (
  frontImageUri: string,
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  transactionId?: string
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[SERVER_GENERATOR] ========= STARTING SERVER-SIDE POSTCARD GENERATION =========');
  console.log('[SERVER_GENERATOR] Platform:', Platform.OS);
  console.log('[SERVER_GENERATOR] Postcard size:', postcardSize);
  console.log('[SERVER_GENERATOR] Strategy: Client front + Server back');
  
  const startTime = Date.now();
  const txnId = transactionId || `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log('[SERVER_GENERATOR] Transaction ID:', txnId);
    
    // Generate both front and back in parallel for better performance
    console.log('[SERVER_GENERATOR] Starting parallel generation...');
    
    const [frontUri, backUri] = await Promise.all([
      generatePostcardFrontServer(frontImageUri, postcardSize),
      generatePostcardBackServerSide(message, recipientInfo, postcardSize, txnId)
    ]);
    
    const totalDuration = Date.now() - startTime;
    
    console.log('[SERVER_GENERATOR] ========= SERVER-SIDE POSTCARD GENERATION COMPLETED =========');
    console.log('[SERVER_GENERATOR] Total generation time:', totalDuration, 'ms');
    console.log('[SERVER_GENERATOR] Front URI:', frontUri);
    console.log('[SERVER_GENERATOR] Back URI:', backUri);
    console.log('[SERVER_GENERATOR] Transaction ID:', txnId);
    
    return { frontUri, backUri };
    
  } catch (error) {
    const errorDuration = Date.now() - startTime;
    console.error('[SERVER_GENERATOR] ========= SERVER-SIDE GENERATION FAILED =========');
    console.error('[SERVER_GENERATOR] Error after', errorDuration, 'ms');
    console.error('[SERVER_GENERATOR] Error details:', error);
    
    // Re-throw with context
    if (error instanceof Error) {
      throw new Error(`Server-side postcard generation failed: ${error.message}`);
    } else {
      throw new Error(`Server-side postcard generation failed: ${error}`);
    }
  }
};