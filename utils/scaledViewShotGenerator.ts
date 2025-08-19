import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { PostcardSize, getPrintPixels, getFrontBleedPixels } from './printSpecs';

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
 */
export const generatePostcardFrontScaled = async (
  imageUri: string,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[SCALED_GENERATOR] Generating postcard front');
  
  const frontDimensions = getFrontBleedPixels(postcardSize);
  
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
    
    console.log('[SCALED_GENERATOR] Front image generated:', result.uri);
    return result.uri;
    
  } catch (error) {
    console.error('[SCALED_GENERATOR] Error generating front:', error);
    throw new Error(`Failed to generate postcard front: ${error}`);
  }
};

/**
 * Generates postcard back using ViewShot at smaller size, then scales up
 * This works around iOS limitations by capturing at a manageable size
 */
export const generatePostcardBackScaled = async (
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  viewShotRef?: any
): Promise<string> => {
  console.log('[SCALED_GENERATOR] Generating postcard back using scaled ViewShot approach');
  
  if (!viewShotRef || !viewShotRef.current) {
    throw new Error('ViewShot reference is required for back generation');
  }
  
  const finalDimensions = getPrintPixels(postcardSize);
  
  try {
    // Calculate a smaller capture size that iOS can handle
    // We'll capture at 1/3 the size and scale up
    const captureScale = 0.33;
    const captureWidth = Math.round(finalDimensions.width * captureScale);
    const captureHeight = Math.round(finalDimensions.height * captureScale);
    
    console.log('[SCALED_GENERATOR] Final dimensions:', finalDimensions);
    console.log('[SCALED_GENERATOR] Capture dimensions:', { width: captureWidth, height: captureHeight });
    console.log('[SCALED_GENERATOR] Scale factor:', captureScale);
    
    let capturedUri;
    
    if (Platform.OS === 'ios') {
      console.log('[SCALED_GENERATOR] Using iOS-optimized ViewShot settings');
      
      try {
        // Capture at smaller size with high quality
        capturedUri = await viewShotRef.current.capture({
          format: 'png',
          quality: 1.0,
          result: 'tmpfile',
          width: captureWidth,
          height: captureHeight,
          snapshotContentContainer: false,
          afterScreenUpdates: false
        });
        console.log('[SCALED_GENERATOR] iOS ViewShot (PNG, scaled) successful:', capturedUri);
      } catch (pngError) {
        console.warn('[SCALED_GENERATOR] PNG capture failed, trying JPEG:', pngError);
        
        capturedUri = await viewShotRef.current.capture({
          format: 'jpg',
          quality: 0.95,
          result: 'tmpfile',
          width: captureWidth,
          height: captureHeight,
          snapshotContentContainer: false,
          afterScreenUpdates: false
        });
        console.log('[SCALED_GENERATOR] iOS ViewShot (JPEG, scaled) successful:', capturedUri);
      }
    } else {
      // Android
      console.log('[SCALED_GENERATOR] Using Android ViewShot settings');
      capturedUri = await viewShotRef.current.capture({
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
        width: captureWidth,
        height: captureHeight
      });
      console.log('[SCALED_GENERATOR] Android ViewShot (scaled) successful:', capturedUri);
    }
    
    // Scale the captured image up to final dimensions
    console.log('[SCALED_GENERATOR] Scaling captured image to final dimensions');
    const scaledResult = await ImageManipulator.manipulateAsync(
      capturedUri,
      [{ resize: { width: finalDimensions.width, height: finalDimensions.height } }],
      { 
        compress: 1.0,
        format: ImageManipulator.SaveFormat.PNG,
        base64: false
      }
    );
    
    console.log('[SCALED_GENERATOR] Image scaled successfully:', scaledResult.uri);
    
    // Clean up the temporary captured file
    try {
      await FileSystem.deleteAsync(capturedUri, { idempotent: true });
    } catch (cleanupError) {
      console.warn('[SCALED_GENERATOR] Could not clean up temp file:', cleanupError);
    }
    
    return scaledResult.uri;
    
  } catch (error) {
    console.error('[SCALED_GENERATOR] Scaled ViewShot failed:', error);
    throw new Error(`Failed to capture postcard back (scaled): ${error}`);
  }
};

/**
 * Main function to generate complete postcard using scaled ViewShot approach
 * This works around iOS ViewShot limitations by capturing at smaller size and scaling up
 */
export const generateCompletePostcardScaled = async (
  frontImageUri: string,
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  viewShotBackRef?: any
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[SCALED_GENERATOR] Starting complete postcard generation with scaled ViewShot approach');
  console.log('[SCALED_GENERATOR] Platform:', Platform.OS);
  console.log('[SCALED_GENERATOR] Size:', postcardSize);
  console.log('[SCALED_GENERATOR] Strategy: Capture small, scale up to avoid iOS limitations');
  
  try {
    // Generate front image (ImageManipulator scaling)
    const frontUri = await generatePostcardFrontScaled(frontImageUri, postcardSize);
    
    // Generate back using scaled ViewShot
    const backUri = await generatePostcardBackScaled(message, recipientInfo, postcardSize, viewShotBackRef);
    
    console.log('[SCALED_GENERATOR] Complete postcard generated successfully');
    console.log('[SCALED_GENERATOR] Front URI:', frontUri);
    console.log('[SCALED_GENERATOR] Back URI:', backUri);
    
    return { frontUri, backUri };
    
  } catch (error) {
    console.error('[SCALED_GENERATOR] Error generating complete postcard:', error);
    throw new Error(`Failed to generate complete postcard: ${error}`);
  }
};