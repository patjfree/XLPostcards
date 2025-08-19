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
 * Generates postcard images using the same ViewShot approach that works for saving
 * This reuses the exact same capture logic from the savePostcard function
 */
export const generateCompletePostcardFromViewShot = async (
  frontImageUri: string,
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  viewShotFrontRef?: any,
  viewShotBackRef?: any
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[REUSE_GENERATOR] Starting postcard generation using existing ViewShot components');
  console.log('[REUSE_GENERATOR] Platform:', Platform.OS);
  console.log('[REUSE_GENERATOR] Size:', postcardSize);
  console.log('[REUSE_GENERATOR] Strategy: Reuse working ViewShot captures from preview');
  
  if (!viewShotFrontRef?.current || !viewShotBackRef?.current) {
    throw new Error('ViewShot references are required for capture');
  }
  
  try {
    // Get target dimensions for final scaling
    const frontDimensions = getFrontBleedPixels(postcardSize);
    const backDimensions = getPrintPixels(postcardSize);
    
    console.log('[REUSE_GENERATOR] Target dimensions - Front:', frontDimensions, 'Back:', backDimensions);
    
    // Capture front image using same logic as savePostcard function
    let frontUri;
    try {
      console.log('[REUSE_GENERATOR] Capturing front image...');
      frontUri = await viewShotFrontRef.current.capture({
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
        ...(Platform.OS === 'ios' && { afterScreenUpdates: true })
      });
      console.log('[REUSE_GENERATOR] Front capture successful (tmpfile):', frontUri);
    } catch (error) {
      console.log('[REUSE_GENERATOR] Front capture failed, trying base64 fallback');
      frontUri = await viewShotFrontRef.current.capture({
        format: 'jpg',
        quality: 0.8,
        result: 'base64'
      });
      if (frontUri.startsWith('data:')) {
        const base64Data = frontUri.split(',')[1];
        const filename = `${FileSystem.cacheDirectory}stannp_front_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(filename, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        frontUri = filename;
        console.log('[REUSE_GENERATOR] Front capture successful (base64 converted):', frontUri);
      }
    }
    
    // Capture back image using same logic as savePostcard function
    let backUri;
    try {
      console.log('[REUSE_GENERATOR] Capturing back image...');
      backUri = await viewShotBackRef.current.capture({
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
        ...(Platform.OS === 'ios' && { 
          afterScreenUpdates: true,
          snapshotContentContainer: false
        })
      });
      console.log('[REUSE_GENERATOR] Back capture successful (tmpfile):', backUri);
    } catch (error) {
      console.log('[REUSE_GENERATOR] Back capture failed, trying base64 fallback');
      backUri = await viewShotBackRef.current.capture({
        format: 'jpg',
        quality: 0.8,
        result: 'base64'
      });
      if (backUri.startsWith('data:')) {
        const base64Data = backUri.split(',')[1];
        const filename = `${FileSystem.cacheDirectory}stannp_back_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(filename, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        backUri = filename;
        console.log('[REUSE_GENERATOR] Back capture successful (base64 converted):', backUri);
      }
    }
    
    // Scale front image to proper dimensions with bleed
    console.log('[REUSE_GENERATOR] Scaling front image to final dimensions...');
    const scaledFrontResult = await ImageManipulator.manipulateAsync(
      frontUri,
      [{ resize: { width: frontDimensions.width, height: frontDimensions.height } }],
      { 
        compress: 0.9, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    // Scale back image to proper dimensions
    console.log('[REUSE_GENERATOR] Scaling back image to final dimensions...');
    const scaledBackResult = await ImageManipulator.manipulateAsync(
      backUri,
      [{ resize: { width: backDimensions.width, height: backDimensions.height } }],
      { 
        compress: 1.0, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    console.log('[REUSE_GENERATOR] Complete postcard generated successfully');
    console.log('[REUSE_GENERATOR] Final front URI:', scaledFrontResult.uri);
    console.log('[REUSE_GENERATOR] Final back URI:', scaledBackResult.uri);
    
    // Clean up temporary files
    try {
      if (frontUri !== scaledFrontResult.uri) {
        await FileSystem.deleteAsync(frontUri, { idempotent: true });
      }
      if (backUri !== scaledBackResult.uri) {
        await FileSystem.deleteAsync(backUri, { idempotent: true });
      }
    } catch (cleanupError) {
      console.warn('[REUSE_GENERATOR] Could not clean up temp files:', cleanupError);
    }
    
    return { 
      frontUri: scaledFrontResult.uri, 
      backUri: scaledBackResult.uri 
    };
    
  } catch (error) {
    console.error('[REUSE_GENERATOR] Error generating postcard from ViewShot:', error);
    throw new Error(`Failed to generate postcard from ViewShot: ${error}`);
  }
};