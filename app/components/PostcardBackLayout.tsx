import React from 'react';
import { View, Text, Platform } from 'react-native';
import { PostcardSize, getPrintPixels } from '@/utils/printSpecs';

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
  postcardSize: PostcardSize;
  returnAddress?: string;
  postageImage?: { uri: string };
  stampImage?: { uri: string };
}

/**
 * Returns absolute pixel positions for key regions.
 * We define layout in a size's base design space, then scale by the actual
 * capture size (width/height props). The scale denominators come from
 * getPrintPixels(size), so adding a new size later is centralized.
 */
const getScaledDims = (postcardSize: PostcardSize, width: number, height: number) => {
  const base = getPrintPixels(postcardSize); // e.g., 1872x1272 or 2772x1872
  const scaleX = width / base.width;
  const scaleY = height / base.height;

  if (postcardSize === 'regular') {
    // 4x6 base
    return {
      messageLeft: 72 * scaleX,
      messageTop: 72 * scaleY,
      messageWidth: 900 * scaleX,
      messageHeight: (base.height - 144) * scaleY,

      addressRight: 72 * scaleX,
      addressBottom: 172 * scaleY,
      addressWidth: 680 * scaleX,
      addressHeight: 220 * scaleY,
    };
  } else {
    // 6x9 base
    return {
      messageLeft: 108 * scaleX,
      messageTop: 108 * scaleY,
      messageWidth: 1060 * scaleX,
      messageHeight: (base.height - 216) * scaleY,

      addressRight: 108 * scaleX,
      addressBottom: 228 * scaleY,
      addressWidth: 800 * scaleX,
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
  returnAddress,
}) => {
  const dims = getScaledDims(postcardSize, width, height);
  

  const calculateMessageFontSize = (text: string, base: number) => {
    if (text.length <= 220) return base;
    if (text.length <= 350) return base * 0.9;
    if (text.length <= 500) return base * 0.8;
    return base * 0.7;
  };

  const baseMessageFont = postcardSize === 'regular' ? 44 : 56;
  let MESSAGE_FONT: number;
  let ADDRESS_FONT: number;

  if (width >= 1600 && height >= 1100) {
    MESSAGE_FONT = calculateMessageFontSize(message, baseMessageFont);
    ADDRESS_FONT = Platform.OS === 'ios'
      ? (postcardSize === 'regular' ? 40 : 48)
      : (postcardSize === 'regular' ? 48 : 56);
  } else {
    MESSAGE_FONT = postcardSize === 'regular' ? 16 : 24;
    ADDRESS_FONT = postcardSize === 'regular' ? 16 : 20;
  }
  
  // Ensure minimum font sizes for visibility
  MESSAGE_FONT = Math.max(MESSAGE_FONT, postcardSize === 'regular' ? 20 : 30);
  ADDRESS_FONT = Math.max(ADDRESS_FONT, postcardSize === 'regular' ? 18 : 24);
  

  return (
    <View collapsable={false} style={{
      width,
      height,
      backgroundColor: '#FFFFFF',
      position: 'relative',
      ...(Platform.OS === 'ios' && {
        // Enhanced iOS-specific fixes for ViewShot compatibility on large postcards
        borderWidth: 0,
        borderColor: 'transparent',
        shadowColor: 'transparent',
        shadowOpacity: 0,
        // Additional memory optimization for 6x9 captures
        ...(postcardSize === 'xl' && {
          overflow: 'hidden',
          opacity: 1,
          shouldRasterizeIOS: false, // Disable rasterization for memory
          renderToHardwareTextureAndroid: false,
        }),
      }),
    }}>
      {/* Enhanced white background layer for iOS ViewShot compatibility */}
      <View pointerEvents="none" collapsable={false} style={{
        position: 'absolute',
        left: 0, top: 0, right: 0, bottom: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 0,
        ...(Platform.OS === 'ios' && postcardSize === 'xl' && {
          // Force solid background for large captures
          borderWidth: 1,
          borderColor: '#FFFFFF',
        }),
      }} />

      {/* Return address area */}
      {returnAddress && (
        <View 
          collapsable={false}
          style={{
            position: 'absolute',
            left: dims.messageLeft,
            top: dims.messageTop - (postcardSize === 'regular' ? 120 : 150),
            width: dims.messageWidth,
            zIndex: 10,
            backgroundColor: 'transparent',
          }}>
          <Text 
            allowFontScaling={false}
            style={{
              fontSize: postcardSize === 'regular' ? 14 : 18,
              color: '#000000',
              lineHeight: (postcardSize === 'regular' ? 14 : 18) * 1.2,
              backgroundColor: 'transparent',
              fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
              fontWeight: '400',
              textAlign: 'left',
            }}>
            {returnAddress}
          </Text>
          {/* Separator line */}
          <View style={{
            height: 1,
            backgroundColor: '#000000',
            marginTop: 8,
            marginBottom: 8,
            width: '70%',
          }} />
        </View>
      )}

      {/* Message area - simplified for iOS 6x9 compatibility */}
      <View 
        collapsable={false}
        style={{
          position: 'absolute',
          left: dims.messageLeft,
          top: dims.messageTop,
          width: dims.messageWidth,
          height: dims.messageHeight,
          zIndex: 10,
          backgroundColor: 'transparent',
          ...(Platform.OS === 'ios' && postcardSize === 'xl' && {
            // Additional iOS 6x9 optimizations
            overflow: 'visible',
            flex: 0,
          }),
        }}>
        <Text 
          allowFontScaling={false}
          style={{
            fontSize: MESSAGE_FONT,
            color: '#000000',
            lineHeight: MESSAGE_FONT * 1.3,
            backgroundColor: 'transparent',
            zIndex: 15,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
            fontWeight: '400',
            textAlign: 'left',
            ...(Platform.OS === 'ios' && {
              // Enhanced iOS ViewShot compatibility for large captures
              textShadowColor: 'transparent',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 0,
              includeFontPadding: false,
              elevation: 10,
              allowFontScaling: false,
              overflow: 'visible',
              // Additional fixes for 6x9 text rendering
              ...(postcardSize === 'xl' && {
                textDecorationLine: 'none',
                textDecorationStyle: 'solid',
                textDecorationColor: 'transparent',
                writingDirection: 'ltr',
                // More aggressive iOS fixes
                textAlign: 'left',
                textAlignVertical: 'top',
              }),
            }),
          }}>
          {message}
        </Text>
      </View>

      {/* Address block - simplified for iOS 6x9 compatibility */}
      <View 
        collapsable={false}
        style={{
          position: 'absolute',
          right: dims.addressRight,
          bottom: dims.addressBottom,
          width: dims.addressWidth,
          height: dims.addressHeight,
          backgroundColor: '#FFFFFF',
          justifyContent: 'center',
          zIndex: 10,
          ...(Platform.OS === 'ios' && postcardSize === 'xl' && {
            // Additional iOS 6x9 optimizations
            overflow: 'visible',
            flex: 0,
          }),
        }}>
        <Text style={{
          fontSize: ADDRESS_FONT,
          color: '#000000',
          fontWeight: '600',
          backgroundColor: 'transparent',
          zIndex: 15,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
          textAlign: 'left',
          ...(Platform.OS === 'ios' && {
            textShadowColor: 'transparent',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 0,
            includeFontPadding: false,
            elevation: 10,
            allowFontScaling: false,
            overflow: 'visible',
          }),
        }}>
          {recipientInfo.to}
        </Text>
        <Text style={{ 
          fontSize: ADDRESS_FONT,
          color: '#000000',
          backgroundColor: 'transparent',
          zIndex: 15,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
          textAlign: 'left',
          ...(Platform.OS === 'ios' && {
            textShadowColor: 'transparent',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 0,
            includeFontPadding: false,
            elevation: 10,
            allowFontScaling: false,
            overflow: 'visible',
          }),
        }}>
          {recipientInfo.addressLine1}
        </Text>
        {recipientInfo.addressLine2 ? (
          <Text style={{ 
            fontSize: ADDRESS_FONT,
            color: '#000000',
            backgroundColor: 'transparent',
            zIndex: 15,
            fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
            textAlign: 'left',
            ...(Platform.OS === 'ios' && {
              textShadowColor: 'transparent',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 0,
              includeFontPadding: false,
              elevation: 10,
              allowFontScaling: false,
              overflow: 'visible',
            }),
          }}>
            {recipientInfo.addressLine2}
          </Text>
        ) : null}
        <Text style={{
          fontSize: ADDRESS_FONT,
          color: '#000000',
          marginTop: 2,
          lineHeight: ADDRESS_FONT * 1.3,
          backgroundColor: 'transparent',
          fontWeight: 'normal',
          zIndex: 15,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
          textAlign: 'left',
          ...(Platform.OS === 'ios' && {
            textShadowColor: 'transparent',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 0,
            includeFontPadding: false,
            elevation: 10,
            allowFontScaling: false,
            overflow: 'visible',
          }),
        }}>
          {`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}
        </Text>
      </View>
    </View>
  );
};

export default PostcardBackLayout;
