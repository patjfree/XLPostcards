import React from 'react';
import { View, Text, Image, Platform } from 'react-native';

interface RecipientInfo {
  to: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  id?: string;
}

interface PostcardBackLayoutProps {
  width: number;
  height: number;
  message: string;
  recipientInfo: RecipientInfo;
  postcardSize: 'regular' | 'xl';
  postageImage?: any;
  stampImage?: any;
}

const postageIndicia = require('../../assets/images/TruePostage.jpeg');
const stampImage = require('../../assets/images/stamp.png');

// STANNP EXACT SPECIFICATIONS scaled for preview
const getStannpDimensions = (postcardSize: 'regular' | 'xl', previewWidth: number, previewHeight: number) => {
  const isRegular = postcardSize === 'regular';
  
  // Stannp original dimensions @ 300 DPI  
  const STANNP_WIDTH = isRegular ? 1871 : 2771;
  const STANNP_HEIGHT = isRegular ? 1271 : 1871;
  
  // Scale factor from Stannp to preview
  const scaleX = previewWidth / STANNP_WIDTH;
  const scaleY = previewHeight / STANNP_HEIGHT;
  
  if (isRegular) {
    // 4x6 Regular: Scale Stannp exact measurements to preview size
    return {
      messageLeft: 72 * scaleX,        // Scaled from Stannp 72px safe margin
      messageTop: 72 * scaleY,         
      messageWidth: 620 * scaleX,      // Reduced to prevent address overlap
      messageHeight: (STANNP_HEIGHT - 144) * scaleY, // Total height minus top/bottom margins
      
      addressRight: 72 * scaleX,       // Scaled from Stannp safe margin
      addressBottom: 172 * scaleY,     // Scaled from Stannp positioning
      addressWidth: 600 * scaleX,      // Scaled conservative width
      addressHeight: 200 * scaleY,     // Scaled conservative height
    };
  } else {
    // 6x9 XL: Scale proportionally
    return {
      messageLeft: 108 * scaleX,
      messageTop: 108 * scaleY,
      messageWidth: (STANNP_WIDTH * 0.48) * scaleX,
      messageHeight: (STANNP_HEIGHT - 216) * scaleY,
      
      addressRight: 108 * scaleX,
      addressBottom: 228 * scaleY,
      addressWidth: 700 * scaleX,
      addressHeight: 300 * scaleY,
    };
  }
};

const PostcardBackLayout: React.FC<PostcardBackLayoutProps> = ({
  width,
  height,
  message,
  recipientInfo,
  postcardSize,
  postageImage,
  stampImage: stampOverride,
}) => {
  // Get Stannp exact dimensions scaled to preview size
  const dims = getStannpDimensions(postcardSize, width, height);
  // Calculate proper font sizes for print output - these need to be much larger
  // When used in ViewShot at full resolution, we need full-size fonts
  const isFullResolution = width > 1000; // ViewShot uses full Stannp dimensions
  
  // Dynamic font sizing based on message length
  const calculateMessageFontSize = (messageText: string, baseSize: number): number => {
    const messageLength = messageText.length;
    let fontSize = baseSize;
    
    if (messageLength > 200) {
      fontSize = Math.max(baseSize * 0.7, baseSize * 0.6);
    } else if (messageLength > 100) {
      fontSize = Math.max(baseSize * 0.85, baseSize * 0.75);
    }
    
    return fontSize;
  };
  
  let MESSAGE_FONT, ADDRESS_FONT;
  if (isFullResolution) {
    // Full resolution for Stannp output - use large fonts with dynamic scaling
    // iOS has issues with very large fonts, so use slightly smaller sizes
    const baseMessageFont = Platform.OS === 'ios' 
      ? (postcardSize === 'regular' ? 48 : 56) 
      : (postcardSize === 'regular' ? 60 : 72);
    MESSAGE_FONT = calculateMessageFontSize(message, baseMessageFont);
    ADDRESS_FONT = Platform.OS === 'ios'
      ? (postcardSize === 'regular' ? 40 : 48)
      : (postcardSize === 'regular' ? 48 : 56);
  } else {
    // Preview resolution - scale fonts down
    MESSAGE_FONT = postcardSize === 'regular' ? 16 : 24;
    ADDRESS_FONT = postcardSize === 'regular' ? 16 : 20;
  }

  return (
    <View style={{ 
      width, 
      height, 
      backgroundColor: '#FFFFFF', // Explicit white background for Stannp compatibility
      position: 'relative'
    }}>
      {/* Message area - SCALED FROM STANNP EXACT POSITIONING */}
      <View style={{
        position: 'absolute',
        left: dims.messageLeft,
        top: dims.messageTop,
        width: dims.messageWidth,
        height: dims.messageHeight,
        // Debug border to verify scaling
        // borderWidth: 1, borderColor: 'red', borderStyle: 'dashed'
      }}>
        <Text style={{ 
          fontSize: MESSAGE_FONT, 
          color: '#000000', // Explicit black color for better iOS compatibility
          lineHeight: MESSAGE_FONT * 1.3,
          backgroundColor: 'transparent', // Ensure no background interference
          fontWeight: 'normal' // Ensure consistent font rendering
        }}>
          {message}
        </Text>
      </View>
      
      {/* Address area - SCALED FROM STANNP EXACT POSITIONING */}
      <View style={{
        position: 'absolute',
        right: dims.addressRight,
        bottom: dims.addressBottom,
        width: dims.addressWidth,
        height: dims.addressHeight,
        justifyContent: 'flex-start',
        // Debug border to verify scaling
        // borderWidth: 1, borderColor: 'blue', borderStyle: 'dashed'
      }}>
        <Text style={{ 
          fontSize: ADDRESS_FONT, 
          color: '#000000', 
          lineHeight: ADDRESS_FONT * 1.3, 
          backgroundColor: 'transparent',
          fontWeight: 'normal'
        }}>
          {recipientInfo.to}
        </Text>
        <Text style={{ 
          fontSize: ADDRESS_FONT, 
          color: '#000000', 
          marginTop: 2, 
          lineHeight: ADDRESS_FONT * 1.3, 
          backgroundColor: 'transparent',
          fontWeight: 'normal'
        }}>
          {recipientInfo.addressLine1}
        </Text>
        {recipientInfo.addressLine2 && (
          <Text style={{ 
            fontSize: ADDRESS_FONT, 
            color: '#000000', 
            marginTop: 2, 
            lineHeight: ADDRESS_FONT * 1.3, 
            backgroundColor: 'transparent',
            fontWeight: 'normal'
          }}>
            {recipientInfo.addressLine2}
          </Text>
        )}
        <Text style={{ 
          fontSize: ADDRESS_FONT, 
          color: '#000000', 
          marginTop: 2, 
          lineHeight: ADDRESS_FONT * 1.3, 
          backgroundColor: 'transparent',
          fontWeight: 'normal'
        }}>
          {`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}
        </Text>
      </View>
    </View>
  );
};

export default PostcardBackLayout; 