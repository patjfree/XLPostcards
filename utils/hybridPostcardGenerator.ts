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
export const generatePostcardFrontHybrid = async (
  imageUri: string,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[HYBRID_GENERATOR] Generating postcard front');
  
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
    
    console.log('[HYBRID_GENERATOR] Front image generated:', result.uri);
    return result.uri;
    
  } catch (error) {
    console.error('[HYBRID_GENERATOR] Error generating front:', error);
    throw new Error(`Failed to generate postcard front: ${error}`);
  }
};

/**
 * This is a placeholder for the back generation - the actual implementation
 * will use ViewShot from the preview component with optimized settings
 */
export const generatePostcardBackHybrid = async (
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  viewShotRef?: any
): Promise<string> => {
  console.log('[HYBRID_GENERATOR] Generating postcard back using ViewShot (hybrid approach)');
  
  if (!viewShotRef || !viewShotRef.current) {
    throw new Error('ViewShot reference is required for back generation');
  }
  
  const dimensions = getPrintPixels(postcardSize);
  
  try {
    // Use ViewShot with iOS-optimized settings
    let backUri;
    
    if (Platform.OS === 'ios') {
      // iOS-specific ViewShot settings for better compatibility
      console.log('[HYBRID_GENERATOR] Using iOS-optimized ViewShot settings');
      
      try {
        // First attempt: High quality PNG
        backUri = await viewShotRef.current.capture({
          format: 'png',
          quality: 1.0,
          result: 'tmpfile',
          width: dimensions.width,
          height: dimensions.height,
          snapshotContentContainer: false,
          afterScreenUpdates: false
        });
        console.log('[HYBRID_GENERATOR] iOS ViewShot (PNG) successful:', backUri);
      } catch (pngError) {
        console.warn('[HYBRID_GENERATOR] PNG capture failed, trying JPEG:', pngError);
        
        // Fallback: JPEG format
        backUri = await viewShotRef.current.capture({
          format: 'jpg',
          quality: 0.95,
          result: 'tmpfile',
          width: dimensions.width,
          height: dimensions.height,
          snapshotContentContainer: false,
          afterScreenUpdates: false
        });
        console.log('[HYBRID_GENERATOR] iOS ViewShot (JPEG) successful:', backUri);
      }
    } else {
      // Android settings
      console.log('[HYBRID_GENERATOR] Using Android ViewShot settings');
      backUri = await viewShotRef.current.capture({
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
        width: dimensions.width,
        height: dimensions.height
      });
      console.log('[HYBRID_GENERATOR] Android ViewShot successful:', backUri);
    }
    
    return backUri;
    
  } catch (error) {
    console.error('[HYBRID_GENERATOR] ViewShot failed:', error);
    throw new Error(`Failed to capture postcard back: ${error}`);
  }
};

/**
 * Main function to generate complete postcard using hybrid approach
 * Front: ImageManipulator scaling
 * Back: ViewShot with optimized settings
 */
export const generateCompletePostcardHybrid = async (
  frontImageUri: string,
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  viewShotBackRef?: any
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[HYBRID_GENERATOR] Starting complete postcard generation with hybrid approach');
  console.log('[HYBRID_GENERATOR] Platform:', Platform.OS);
  console.log('[HYBRID_GENERATOR] Size:', postcardSize);
  
  try {
    // Generate front image (ImageManipulator scaling)
    const frontUri = await generatePostcardFrontHybrid(frontImageUri, postcardSize);
    
    // Generate back using ViewShot
    const backUri = await generatePostcardBackHybrid(message, recipientInfo, postcardSize, viewShotBackRef);
    
    console.log('[HYBRID_GENERATOR] Complete postcard generated successfully');
    console.log('[HYBRID_GENERATOR] Front URI:', frontUri);
    console.log('[HYBRID_GENERATOR] Back URI:', backUri);
    
    return { frontUri, backUri };
    
  } catch (error) {
    console.error('[HYBRID_GENERATOR] Error generating complete postcard:', error);
    throw new Error(`Failed to generate complete postcard: ${error}`);
  }
};