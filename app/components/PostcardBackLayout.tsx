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
      addressWidth: 600 * scaleX,
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

  return (
    <View collapsable={false} style={{
      width,
      height,
      backgroundColor: '#FFFFFF',
      position: 'relative',
    }}>
      {/* White underlay prevents any alpha → black issues on iOS snapshots */}
      <View pointerEvents="none" style={{
        position: 'absolute',
        left: 0, top: 0, right: 0, bottom: 0,
        backgroundColor: '#FFFFFF',
      }} />

      {/* Message area */}
      <View style={{
        position: 'absolute',
        left: dims.messageLeft,
        top: dims.messageTop,
        width: dims.messageWidth,
        height: dims.messageHeight,
      }}>
        <Text style={{
          fontSize: MESSAGE_FONT,
          color: '#000000',
          lineHeight: MESSAGE_FONT * 1.4,
          backgroundColor: 'transparent',
        }}>
          {message}
        </Text>
      </View>

      {/* Address block */}
      <View style={{
        position: 'absolute',
        right: dims.addressRight,
        bottom: dims.addressBottom,
        width: dims.addressWidth,
        height: dims.addressHeight,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
      }}>
        <Text style={{
          fontSize: ADDRESS_FONT,
          color: '#000000',
          fontWeight: '600',
          backgroundColor: 'transparent',
        }}>
          {recipientInfo.to}
        </Text>
        <Text style={{ fontSize: ADDRESS_FONT, color: '#000000', backgroundColor: 'transparent' }}>
          {recipientInfo.addressLine1}
        </Text>
        {recipientInfo.addressLine2 ? (
          <Text style={{ fontSize: ADDRESS_FONT, color: '#000000', backgroundColor: 'transparent' }}>
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
        }}>
          {`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}
        </Text>
      </View>
    </View>
  );
};

export default PostcardBackLayout;
