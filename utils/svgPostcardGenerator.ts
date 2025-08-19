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
 * Creates SVG content for postcard back with proper text rendering
 * Uses react-native-svg compatible syntax for reliable text layout
 */
const createPostcardBackSVG = (
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize,
  width: number,
  height: number
): string => {
  // Calculate layout dimensions (same as PostcardBackLayout)
  const base = getPrintPixels(postcardSize);
  const scaleX = width / base.width;
  const scaleY = height / base.height;

  let layout;
  if (postcardSize === 'regular') {
    // 4x6 layout
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
    // 6x9 layout
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

  const addressX = width - layout.addressRight - layout.addressWidth;
  const addressY = height - layout.addressBottom - layout.addressHeight;

  // Word wrap function for SVG text
  const wrapText = (text: string, maxWidth: number, fontSize: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    // Approximate character width (will vary by font, but good enough for layout)
    const avgCharWidth = fontSize * 0.6;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, split it
          lines.push(word);
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  // Wrap message text
  const messageLines = wrapText(message, layout.messageWidth, layout.messageFontSize);
  const messageLineHeight = layout.messageFontSize * 1.3;

  // Create SVG text elements for message
  const messageTextElements = messageLines.map((line, index) => {
    const y = layout.messageTop + (index * messageLineHeight);
    return `<text x="${layout.messageLeft}" y="${y}" font-family="Arial, sans-serif" font-size="${layout.messageFontSize}" fill="black">${escapeXml(line)}</text>`;
  }).join('\n');

  // Create address text elements
  const addressLineHeight = layout.addressFontSize * 1.3;
  let currentY = addressY + addressLineHeight;

  const nameElement = `<text x="${addressX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${layout.addressFontSize}" font-weight="bold" fill="black">${escapeXml(recipientInfo.to)}</text>`;
  currentY += addressLineHeight;

  const address1Element = `<text x="${addressX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${layout.addressFontSize}" fill="black">${escapeXml(recipientInfo.addressLine1)}</text>`;
  currentY += addressLineHeight;

  const address2Element = recipientInfo.addressLine2 ? 
    `<text x="${addressX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${layout.addressFontSize}" fill="black">${escapeXml(recipientInfo.addressLine2)}</text>` : '';
  if (recipientInfo.addressLine2) currentY += addressLineHeight;

  currentY += addressLineHeight * 0.3; // Small gap
  const cityStateZipElement = `<text x="${addressX}" y="${currentY}" font-family="Arial, sans-serif" font-size="${layout.addressFontSize}" fill="black">${escapeXml(`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`)}</text>`;

  // Helper function to escape XML characters
  function escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="white"/>
  ${messageTextElements}
  ${nameElement}
  ${address1Element}
  ${address2Element}
  ${cityStateZipElement}
</svg>`.trim();
};

/**
 * Generates postcard front by scaling the user's image
 */
export const generatePostcardFrontSVG = async (
  imageUri: string,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[SVG_GENERATOR] Generating postcard front');
  
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
    
    console.log('[SVG_GENERATOR] Front image generated:', result.uri);
    return result.uri;
    
  } catch (error) {
    console.error('[SVG_GENERATOR] Error generating front:', error);
    throw new Error(`Failed to generate postcard front: ${error}`);
  }
};

/**
 * Generates postcard back using SVG with proper text rendering
 */
export const generatePostcardBackSVG = async (
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize
): Promise<string> => {
  console.log('[SVG_GENERATOR] Generating postcard back with SVG text rendering');
  
  const dimensions = getPrintPixels(postcardSize);
  
  try {
    // Create SVG content
    const svgContent = createPostcardBackSVG(message, recipientInfo, postcardSize, dimensions.width, dimensions.height);
    
    // Save SVG to file
    const svgFileName = `svg-postcard-back-${Date.now()}.svg`;
    const svgPath = `${FileSystem.cacheDirectory}${svgFileName}`;
    
    await FileSystem.writeAsStringAsync(svgPath, svgContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    console.log('[SVG_GENERATOR] SVG file created:', svgPath);
    
    // Convert SVG to PNG using ImageManipulator
    const result = await ImageManipulator.manipulateAsync(
      svgPath,
      [],
      { 
        compress: 1.0,
        format: ImageManipulator.SaveFormat.PNG,
        base64: false
      }
    );
    
    console.log('[SVG_GENERATOR] SVG converted to PNG:', result.uri);
    
    // Clean up SVG file
    try {
      await FileSystem.deleteAsync(svgPath, { idempotent: true });
    } catch (cleanupError) {
      console.warn('[SVG_GENERATOR] Could not clean up SVG file:', cleanupError);
    }
    
    return result.uri;
    
  } catch (error) {
    console.error('[SVG_GENERATOR] Error generating SVG back:', error);
    throw new Error(`Failed to generate SVG postcard back: ${error}`);
  }
};

/**
 * Main function to generate complete postcard using improved SVG approach
 */
export const generateCompletePostcardSVG = async (
  frontImageUri: string,
  message: string,
  recipientInfo: RecipientInfo,
  postcardSize: PostcardSize
): Promise<{ frontUri: string; backUri: string }> => {
  console.log('[SVG_GENERATOR] Starting complete postcard generation with improved SVG rendering');
  console.log('[SVG_GENERATOR] Platform:', Platform.OS);
  console.log('[SVG_GENERATOR] Size:', postcardSize);
  
  try {
    // Generate front image (simple scaling)
    const frontUri = await generatePostcardFrontSVG(frontImageUri, postcardSize);
    
    // Generate back with SVG text rendering
    const backUri = await generatePostcardBackSVG(message, recipientInfo, postcardSize);
    
    console.log('[SVG_GENERATOR] Complete postcard generated successfully');
    console.log('[SVG_GENERATOR] Front URI:', frontUri);
    console.log('[SVG_GENERATOR] Back URI:', backUri);
    
    return { frontUri, backUri };
    
  } catch (error) {
    console.error('[SVG_GENERATOR] Error generating complete postcard:', error);
    throw new Error(`Failed to generate complete postcard: ${error}`);
  }
};