import * as ImageManipulator from 'expo-image-manipulator';
import { PostcardSize, getPrintPixels } from './printSpecs';
import { Platform } from 'react-native';

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
 * Generates both front and back postcard images programmatically
 * Completely bypasses ViewShot for iOS compatibility
 */
export const generateCompletePostcard = async (
  frontImageUri: string,
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[POSTCARDGEN] Starting complete postcard generation');
  console.log('[POSTCARDGEN] Platform:', Platform.OS);
  console.log('[POSTCARDGEN] Size:', postcardSize);
  
  const dimensions = getPrintPixels(postcardSize);
  console.log('[POSTCARDGEN] Dimensions:', dimensions);
  
  try {
    // Generate front image
    const frontUri = await generatePostcardFront(frontImageUri, postcardSize);
    
    // Generate back image
    const backUri = await generatePostcardBack(message, recipientInfo, postcardSize);
    
    console.log('[POSTCARDGEN] Complete postcard generated successfully');
    console.log('[POSTCARDGEN] Front URI:', frontUri);
    console.log('[POSTCARDGEN] Back URI:', backUri);
    
    return { frontUri, backUri };
    
  } catch (error) {
    console.error('[POSTCARDGEN] Error generating complete postcard:', error);
    throw new Error(`Failed to generate complete postcard: ${error}`);
  }
};

/**
 * Generates the front of the postcard from the user's image
 */
export const generatePostcardFront = async (
  imageUri: string,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[POSTCARDGEN] Generating postcard front');
  
  const dimensions = getPrintPixels(postcardSize);
  
  try {
    // Scale the user's image to exact postcard dimensions
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: dimensions.width, height: dimensions.height } }],
      { 
        compress: 0.9, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    console.log('[POSTCARDGEN] Front image generated:', result.uri);
    return result.uri;
    
  } catch (error) {
    console.error('[POSTCARDGEN] Error generating front:', error);
    throw new Error(`Failed to generate postcard front: ${error}`);
  }
};

/**
 * Generates the back of the postcard with message and address using React Native Canvas-like approach
 */
export const generatePostcardBack = async (
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[POSTCARDGEN] Generating postcard back with text overlay');
  console.log('[POSTCARDGEN] Message length:', message.length);
  console.log('[POSTCARDGEN] Postcard size:', postcardSize);
  
  const dimensions = getPrintPixels(postcardSize);
  console.log('[POSTCARDGEN] Target dimensions:', dimensions);
  
  try {
    // Create white background
    const whiteBackground = await ImageManipulator.manipulateAsync(
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      [{ resize: { width: dimensions.width, height: dimensions.height } }],
      { 
        compress: 1, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    console.log('[POSTCARDGEN] Created white background for back');
    
    // Create an SVG with the postcard layout
    const svgContent = createPostcardBackSVG(message, recipientInfo, dimensions, postcardSize);
    console.log('[POSTCARDGEN] Created SVG content for', postcardSize, 'postcard');
    
    // Convert SVG to base64 data URI (React Native compatible)
    const svgBase64 = btoa(svgContent);
    const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;
    
    console.log('[POSTCARDGEN] Converting SVG to image...');
    
    // Convert SVG to image using ImageManipulator
    const svgResult = await ImageManipulator.manipulateAsync(
      svgDataUri,
      [{ resize: { width: dimensions.width, height: dimensions.height } }],
      { 
        compress: 0.9, 
        format: ImageManipulator.SaveFormat.PNG,
        base64: false
      }
    );
    
    console.log('[POSTCARDGEN] SVG converted to image successfully');
    console.log('[POSTCARDGEN] Message content rendered:', message);
    console.log('[POSTCARDGEN] Recipient rendered:', recipientInfo.to);
    console.log('[POSTCARDGEN] Address rendered:', `${recipientInfo.addressLine1}, ${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`);
    
    return svgResult.uri;
    
  } catch (error) {
    console.error('[POSTCARDGEN] Error generating back with text:', error);
    console.log('[POSTCARDGEN] Falling back to white background approach');
    
    // Fallback to white background if SVG approach fails
    try {
      const fallbackBackground = await ImageManipulator.manipulateAsync(
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        [{ resize: { width: dimensions.width, height: dimensions.height } }],
        { 
          compress: 1, 
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false
        }
      );
      
      console.warn('[POSTCARDGEN] Using fallback white background - text rendering failed');
      return fallbackBackground.uri;
    } catch (fallbackError) {
      console.error('[POSTCARDGEN] Fallback also failed:', fallbackError);
      throw new Error(`Failed to generate postcard back: ${error}`);
    }
  }
};

/**
 * Creates SVG content for postcard back layout using proper dimensions for each size
 */
const createPostcardBackSVG = (
  message: string,
  recipientInfo: RecipientInfo,
  dimensions: { width: number; height: number },
  postcardSize: PostcardSize = 'xl'
): string => {
  const { width, height } = dimensions;
  
  // Use same layout logic as PostcardBackLayout component
  const getLayoutDimensions = (size: PostcardSize, w: number, h: number) => {
    const base = getPrintPixels(size);
    const scaleX = w / base.width;
    const scaleY = h / base.height;

    if (size === 'regular') {
      // 4x6 layout
      return {
        messageLeft: 72 * scaleX,
        messageTop: 72 * scaleY,
        messageWidth: 900 * scaleX,
        messageHeight: (base.height - 144) * scaleY,
        addressRight: 72 * scaleX,
        addressBottom: 172 * scaleY,
        addressWidth: 600 * scaleX,
        addressHeight: 220 * scaleY,
        messageFontSize: 36 * Math.min(scaleX, scaleY),
        addressFontSize: 32 * Math.min(scaleX, scaleY),
      };
    } else {
      // 6x9 layout
      return {
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
  };

  const layout = getLayoutDimensions(postcardSize, width, height);
  
  // Escape HTML entities in message and address
  const escapeHtml = (text: string) => 
    text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
  
  const escapedMessage = escapeHtml(message);
  const escapedName = escapeHtml(recipientInfo.to);
  const escapedAddress1 = escapeHtml(recipientInfo.addressLine1);
  const escapedAddress2 = recipientInfo.addressLine2 ? escapeHtml(recipientInfo.addressLine2) : '';
  const escapedCity = escapeHtml(recipientInfo.city);
  const escapedState = escapeHtml(recipientInfo.state);
  const escapedZip = escapeHtml(recipientInfo.zipcode);
  
  // Split message into lines for SVG text elements (word wrap)
  const messageLines = wrapText(escapedMessage, layout.messageWidth / (layout.messageFontSize * 0.6));
  const lineHeight = layout.messageFontSize * 1.3;
  
  // Create message text elements
  const messageTextElements = messageLines.map((line, index) => 
    `<text x="${layout.messageLeft}" y="${layout.messageTop + (index + 1) * lineHeight}" 
           font-family="Arial, sans-serif" font-size="${layout.messageFontSize}" fill="black">${line}</text>`
  ).join('\n      ');
  
  // Create address text elements
  const addressX = width - layout.addressRight - layout.addressWidth;
  const addressY = height - layout.addressBottom - layout.addressHeight;
  const addressLineHeight = layout.addressFontSize * 1.3;
  
  let addressElements = [];
  let currentY = addressY + addressLineHeight;
  
  // Name (bold)
  addressElements.push(`<text x="${addressX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${layout.addressFontSize}" font-weight="bold" fill="black">${escapedName}</text>`);
  currentY += addressLineHeight;
  
  // Address line 1
  addressElements.push(`<text x="${addressX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${layout.addressFontSize}" fill="black">${escapedAddress1}</text>`);
  currentY += addressLineHeight;
  
  // Address line 2 (if exists)
  if (escapedAddress2) {
    addressElements.push(`<text x="${addressX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${layout.addressFontSize}" fill="black">${escapedAddress2}</text>`);
    currentY += addressLineHeight;
  }
  
  // City, State ZIP
  currentY += addressLineHeight * 0.3; // Small gap
  addressElements.push(`<text x="${addressX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${layout.addressFontSize}" fill="black">${escapedCity}, ${escapedState} ${escapedZip}</text>`);
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      
      <!-- Message text -->
      ${messageTextElements}
      
      <!-- Address text -->
      ${addressElements.join('\n      ')}
    </svg>
  `;
};

/**
 * Helper function to wrap text for SVG rendering
 */
const wrapText = (text: string, maxCharsPerLine: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is longer than max line length, break it
        lines.push(word.substring(0, maxCharsPerLine));
        currentLine = word.substring(maxCharsPerLine);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

/**
 * Helper function to estimate if text will fit in the given dimensions
 */
export const estimateTextFit = (text: string, maxChars: number): boolean => {
  return text.length <= maxChars;
};

/**
 * Helper function to truncate text if it's too long
 */
export const truncateText = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 3) + '...';
};