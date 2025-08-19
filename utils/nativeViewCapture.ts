import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { PostcardSize, getPrintPixels, getFrontBleedPixels } from './printSpecs';
import ViewShot, { ViewShotMethods } from 'react-native-view-shot';

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
 * Captures a React Native view using optimized ViewShot settings for iOS
 * This uses ViewShot with specific settings to avoid iOS issues
 */
export const captureViewNatively = async (
  viewRef: any,
  width: number,
  height: number,
  backgroundColor: string = '#FFFFFF'
): Promise<string> => {
  console.log('[NATIVE_CAPTURE] Starting optimized ViewShot capture');
  console.log('[NATIVE_CAPTURE] Target dimensions:', { width, height });
  
  if (!viewRef?.current) {
    throw new Error('View ref is not available');
  }
  
  try {
    // Wait for layout to settle
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Use optimized ViewShot settings specifically for iOS text rendering
    const options = Platform.OS === 'ios' ? {
      format: 'png' as const,
      quality: 1.0,
      result: 'tmpfile' as const,
      width,
      height,
      // Critical iOS settings to prevent issues
      snapshotContentContainer: false,
      afterScreenUpdates: false, // Set to false to avoid delay issues
    } : {
      format: 'png' as const,
      quality: 1.0,
      result: 'tmpfile' as const,
      width,
      height,
    };
    
    console.log('[NATIVE_CAPTURE] Using ViewShot options:', options);
    const uri = await viewRef.current.capture(options);
    
    console.log('[NATIVE_CAPTURE] ViewShot capture successful:', uri);
    return uri;
    
  } catch (error) {
    console.error('[NATIVE_CAPTURE] ViewShot capture failed:', error);
    throw new Error(`ViewShot capture failed: ${error}`);
  }
};

/**
 * Generates postcard front using the original image with proper scaling
 */
export const generatePostcardFrontNative = async (
  imageUri: string,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[NATIVE_CAPTURE] Generating postcard front');
  
  const frontDimensions = getFrontBleedPixels(postcardSize);
  
  try {
    // Scale the user's image to exact postcard front dimensions
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: frontDimensions.width, height: frontDimensions.height } }],
      { 
        compress: 0.9, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    console.log('[NATIVE_CAPTURE] Front image generated:', result.uri);
    return result.uri;
    
  } catch (error) {
    console.error('[NATIVE_CAPTURE] Error generating front:', error);
    throw new Error(`Failed to generate postcard front: ${error}`);
  }
};

/**
 * Generates postcard back by capturing the PostcardBackLayout component
 * This uses optimized ViewShot settings to avoid iOS issues
 */
export const generatePostcardBackNative = async (
  backLayoutRef: any,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[NATIVE_CAPTURE] Generating postcard back using optimized ViewShot');
  
  const dimensions = getPrintPixels(postcardSize);
  console.log('[NATIVE_CAPTURE] Target dimensions:', dimensions);
  
  try {
    const backUri = await captureViewNatively(
      backLayoutRef,
      dimensions.width,
      dimensions.height,
      '#FFFFFF'
    );
    
    console.log('[NATIVE_CAPTURE] Back image captured:', backUri);
    return backUri;
    
  } catch (error) {
    console.error('[NATIVE_CAPTURE] Error generating back:', error);
    throw new Error(`Failed to generate postcard back: ${error}`);
  }
};

/**
 * Generates complete postcard using native view capture
 * This is the main function that replaces the SVG approach
 */
export const generateCompletePostcardNative = async (
  frontImageUri: string,
  backLayoutRef: any,
  postcardSize: PostcardSize
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[NATIVE_CAPTURE] Starting complete postcard generation (native)');
  console.log('[NATIVE_CAPTURE] Platform:', Platform.OS);
  console.log('[NATIVE_CAPTURE] Size:', postcardSize);
  
  try {
    // Generate front image
    const frontUri = await generatePostcardFrontNative(frontImageUri, postcardSize);
    
    // Generate back image using native capture
    const backUri = await generatePostcardBackNative(backLayoutRef, postcardSize);
    
    console.log('[NATIVE_CAPTURE] Complete postcard generated successfully');
    console.log('[NATIVE_CAPTURE] Front URI:', frontUri);
    console.log('[NATIVE_CAPTURE] Back URI:', backUri);
    
    return { frontUri, backUri };
    
  } catch (error) {
    console.error('[NATIVE_CAPTURE] Error generating complete postcard:', error);
    throw new Error(`Failed to generate complete postcard: ${error}`);
  }
};