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
 * Creates a postcard back by overlaying text on a white background
 * This approach mimics the PostcardBackLayout component exactly
 */
const createPostcardBackWithTextOverlay = async (
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  width: number,
  height: number
): Promise<string> => {
  console.log('[DIRECT_GENERATOR] Creating postcard back with text overlay');
  
  try {
    // Step 1: Create white background
    const whiteBackground = await createWhiteBackgroundImage(width, height);
    
    // Step 2: Calculate layout (same as PostcardBackLayout)
    const base = getPrintPixels(postcardSize);
    const scaleX = width / base.width;
    const scaleY = height / base.height;

    let layout;
    if (postcardSize === 'regular') {
      layout = {
        messageLeft: 72 * scaleX,
        messageTop: 72 * scaleY,
        messageWidth: 900 * scaleX,
        messageHeight: (base.height - 144) * scaleY,
        addressRight: 72 * scaleX,
        addressBottom: 172 * scaleY,
        addressWidth: 600 * scaleX,
        addressHeight: 300 * scaleY,
        messageFontSize: 36 * Math.min(scaleX, scaleY),
        addressFontSize: 32 * Math.min(scaleX, scaleY),
      };
    } else {
      layout = {
        messageLeft: 108 * scaleX,
        messageTop: 108 * scaleY,
        messageWidth: 1060 * scaleX,
        messageHeight: (base.height - 216) * scaleY,
        addressRight: 108 * scaleX,
        addressBottom: 228 * scaleY,
        addressWidth: 700 * scaleX,
        addressHeight: 300 * scaleY,
        messageFontSize: 56 * Math.min(scaleX, scaleY),
        addressFontSize: 48 * Math.min(scaleX, scaleY),
      };
    }

    // Step 3: Create HTML that renders the exact layout
    const html = createPostcardHTML(message, recipientInfo, layout, width, height);
    
    // Step 4: Save HTML and capture as image
    const htmlPath = `${FileSystem.cacheDirectory}postcard-back-${Date.now()}.html`;
    await FileSystem.writeAsStringAsync(htmlPath, html, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    console.log('[DIRECT_GENERATOR] HTML file created:', htmlPath);
    
    // For now, return the white background - we'll need to implement HTML to image conversion
    // This is a stepping stone approach
    console.log('[DIRECT_GENERATOR] Returning white background (HTML conversion not yet implemented)');
    return whiteBackground;
    
  } catch (error) {
    console.error('[DIRECT_GENERATOR] Error creating postcard back:', error);
    throw error;
  }
};

/**
 * Creates a white background image of specified dimensions
 */
const createWhiteBackgroundImage = async (width: number, height: number): Promise<string> => {
  try {
    // Create a small white image and scale it up
    const whitePixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const tempPath = `${FileSystem.cacheDirectory}white-pixel-${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(tempPath, whitePixelBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
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
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
    
    return result.uri;
  } catch (error) {
    console.error('[DIRECT_GENERATOR] Error creating white background:', error);
    throw error;
  }
};

/**
 * Creates HTML that matches the PostcardBackLayout exactly
 */
const createPostcardHTML = (
  message: string,
  recipientInfo: RecipientInfo,
  layout: any,
  width: number,
  height: number
): string => {
  const addressX = width - layout.addressRight - layout.addressWidth;
  const addressY = height - layout.addressBottom - layout.addressHeight;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            background: white; 
            width: ${width}px; 
            height: ${height}px;
            position: relative;
            font-family: Arial, sans-serif;
        }
        .message {
            position: absolute;
            left: ${layout.messageLeft}px;
            top: ${layout.messageTop}px;
            width: ${layout.messageWidth}px;
            height: ${layout.messageHeight}px;
            font-size: ${layout.messageFontSize}px;
            color: black;
            line-height: 1.3;
            word-wrap: break-word;
            overflow: hidden;
        }
        .address {
            position: absolute;
            left: ${addressX}px;
            top: ${addressY}px;
            width: ${layout.addressWidth}px;
            height: ${layout.addressHeight}px;
            font-size: ${layout.addressFontSize}px;
            color: black;
            line-height: 1.3;
        }
        .name {
            font-weight: bold;
            margin-bottom: ${layout.addressFontSize * 0.3}px;
        }
        .address-line {
            margin-bottom: ${layout.addressFontSize * 0.3}px;
        }
        .city-state-zip {
            margin-top: ${layout.addressFontSize * 0.5}px;
        }
    </style>
</head>
<body>
    <div class="message">${escapeHtml(message)}</div>
    <div class="address">
        <div class="name">${escapeHtml(recipientInfo.to)}</div>
        <div class="address-line">${escapeHtml(recipientInfo.addressLine1)}</div>
        ${recipientInfo.addressLine2 ? `<div class="address-line">${escapeHtml(recipientInfo.addressLine2)}</div>` : ''}
        <div class="city-state-zip">${escapeHtml(`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`)}</div>
    </div>
</body>
</html>`.trim();
};

/**
 * Escapes HTML characters
 */
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Generates postcard front by scaling the user's image
 */
export const generatePostcardFrontDirect = async (
  imageUri: string,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[DIRECT_GENERATOR] Generating postcard front');
  
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
    
    console.log('[DIRECT_GENERATOR] Front image generated:', result.uri);
    return result.uri;
    
  } catch (error) {
    console.error('[DIRECT_GENERATOR] Error generating front:', error);
    throw new Error(`Failed to generate postcard front: ${error}`);
  }
};

/**
 * Main function to generate complete postcard using direct approach
 * This completely avoids ViewShot and creates images programmatically
 */
export const generateCompletePostcardDirect = async (
  frontImageUri: string,
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[DIRECT_GENERATOR] Starting complete postcard generation with direct approach');
  console.log('[DIRECT_GENERATOR] Platform:', Platform.OS);
  console.log('[DIRECT_GENERATOR] Size:', postcardSize);
  console.log('[DIRECT_GENERATOR] Message preview:', message.substring(0, 50) + '...');
  
  try {
    // Generate front image
    const frontUri = await generatePostcardFrontDirect(frontImageUri, postcardSize);
    
    // Generate back image
    const dimensions = getPrintPixels(postcardSize);
    const backUri = await createPostcardBackWithTextOverlay(message, recipientInfo, postcardSize, dimensions.width, dimensions.height);
    
    console.log('[DIRECT_GENERATOR] Complete postcard generated successfully');
    console.log('[DIRECT_GENERATOR] Front URI:', frontUri);
    console.log('[DIRECT_GENERATOR] Back URI:', backUri);
    console.log('[DIRECT_GENERATOR] Note: Back currently uses white background - text overlay implementation needed');
    
    return { frontUri, backUri };
    
  } catch (error) {
    console.error('[DIRECT_GENERATOR] Error generating complete postcard:', error);
    throw new Error(`Failed to generate complete postcard: ${error}`);
  }
};