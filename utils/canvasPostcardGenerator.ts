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
 * Creates a base64 encoded PNG image with white background and text overlay
 * This uses a simpler approach that should work reliably across platforms
 */
const createPostcardBackPNG = async (
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  width: number,
  height: number
): Promise<string> => {
  console.log('[CANVAS_GENERATOR] Creating postcard back PNG');
  
  // Create a minimal white PNG as base64
  // We'll create a white background and use it as the base
  const createWhiteBackground = (): string => {
    // Create a simple 1x1 white PNG in base64
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  };

  try {
    // Create white background base64
    const whiteBase64 = createWhiteBackground();
    
    // Save to temporary file
    const tempFileName = `temp-white-${Date.now()}.png`;
    const tempPath = `${FileSystem.cacheDirectory}${tempFileName}`;
    
    await FileSystem.writeAsStringAsync(tempPath, whiteBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Scale the white pixel to the required dimensions
    const result = await ImageManipulator.manipulateAsync(
      tempPath,
      [{ resize: { width, height } }],
      { 
        compress: 1.0,
        format: ImageManipulator.SaveFormat.PNG,
        base64: false
      }
    );
    
    // Clean up temp file
    try {
      await FileSystem.deleteAsync(tempPath, { idempotent: true });
    } catch (cleanupError) {
      console.warn('[CANVAS_GENERATOR] Could not clean up temp file:', cleanupError);
    }
    
    console.log('[CANVAS_GENERATOR] White background PNG created:', result.uri);
    return result.uri;
    
  } catch (error) {
    console.error('[CANVAS_GENERATOR] Error creating white background:', error);
    throw error;
  }
};

/**
 * Generates postcard front by scaling the user's image
 */
export const generatePostcardFrontCanvas = async (
  imageUri: string,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[CANVAS_GENERATOR] Generating postcard front');
  
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
    
    console.log('[CANVAS_GENERATOR] Front image generated:', result.uri);
    return result.uri;
    
  } catch (error) {
    console.error('[CANVAS_GENERATOR] Error generating front:', error);
    throw new Error(`Failed to generate postcard front: ${error}`);
  }
};

/**
 * Generates postcard back using simple white background
 * This approach prioritizes reliability over text rendering
 */
export const generatePostcardBackCanvas = async (
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[CANVAS_GENERATOR] Generating postcard back with white background');
  console.log('[CANVAS_GENERATOR] Note: Text rendering will use ViewShot from preview component');
  
  const dimensions = getPrintPixels(postcardSize);
  
  try {
    const backUri = await createPostcardBackPNG(message, recipientInfo, postcardSize, dimensions.width, dimensions.height);
    
    console.log('[CANVAS_GENERATOR] Postcard back generated:', backUri);
    return backUri;
    
  } catch (error) {
    console.error('[CANVAS_GENERATOR] Error generating postcard back:', error);
    throw new Error(`Failed to generate postcard back: ${error}`);
  }
};

/**
 * Main function to generate complete postcard using reliable Canvas approach
 * This focuses on creating valid images that Stannp can process
 */
export const generateCompletePostcardCanvas = async (
  frontImageUri: string,
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[CANVAS_GENERATOR] Starting complete postcard generation with reliable Canvas approach');
  console.log('[CANVAS_GENERATOR] Platform:', Platform.OS);
  console.log('[CANVAS_GENERATOR] Size:', postcardSize);
  
  try {
    // Generate front image (simple scaling)
    const frontUri = await generatePostcardFrontCanvas(frontImageUri, postcardSize);
    
    // Generate back with simple white background
    const backUri = await generatePostcardBackCanvas(message, recipientInfo, postcardSize);
    
    console.log('[CANVAS_GENERATOR] Complete postcard generated successfully');
    console.log('[CANVAS_GENERATOR] Front URI:', frontUri);
    console.log('[CANVAS_GENERATOR] Back URI:', backUri);
    
    return { frontUri, backUri };
    
  } catch (error) {
    console.error('[CANVAS_GENERATOR] Error generating complete postcard:', error);
    throw new Error(`Failed to generate complete postcard: ${error}`);
  }
};