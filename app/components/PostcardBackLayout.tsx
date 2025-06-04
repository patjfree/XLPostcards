import React from 'react';
import { View, Text, Image } from 'react-native';

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
  // Optional overrides for images
  templateImage?: any;
  postageImage?: any;
  logoImage?: any;
  stampImage?: any;
}

const templates = {
  regular: require('../assets/images/4x6_Front_Template.png'),
  xl: require('../assets/images/6x9_Template_Back.png'),
};
const postageIndicia = require('../assets/images/TruePostage.jpeg');
const logoImage = require('../assets/images/foreground.png');
const stampImage = require('../assets/images/stamp.png');

// Address box positions (example values, adjust as needed)
const addressBox = {
  regular: { left: 1100, top: 800, width: 600, height: 300 },
  xl: { left: 1700, top: 1200, width: 800, height: 400 },
};

const PostcardBackLayout: React.FC<PostcardBackLayoutProps> = ({
  width,
  height,
  message,
  recipientInfo,
  postcardSize,
  templateImage,
  postageImage,
  logoImage: logoOverride,
  stampImage: stampOverride,
}) => {
  const template = templateImage || templates[postcardSize];
  const box = addressBox[postcardSize];
  const MESSAGE_FONT = postcardSize === 'regular' ? 32 : 48;
  const ADDRESS_FONT = postcardSize === 'regular' ? 32 : 48;

  return (
    <View style={{ width, height }}>
      {/* Template background */}
      <Image
        source={template}
        style={{ position: 'absolute', width, height, top: 0, left: 0 }}
        resizeMode="stretch"
      />
      {/* Message block */}
      <View style={{ position: 'absolute', left: 60, top: 60, width: width * 0.5, height: height - 120 }}>
        <Text style={{ fontSize: MESSAGE_FONT, color: '#222' }}>{message}</Text>
      </View>
      {/* Address box overlay */}
      <View style={{
        position: 'absolute',
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        justifyContent: 'flex-start',
      }}>
        {/* Postage indicia at top of address box */}
        <Image
          source={postageImage || postageIndicia}
          style={{ width: box.width, height: 60, resizeMode: 'contain', marginBottom: 8 }}
        />
        {/* Address text */}
        <Text style={{ fontSize: ADDRESS_FONT, color: '#222' }}>{recipientInfo.to}</Text>
        <Text style={{ fontSize: ADDRESS_FONT, color: '#222' }}>{recipientInfo.addressLine1}</Text>
        {recipientInfo.addressLine2 && <Text style={{ fontSize: ADDRESS_FONT, color: '#222' }}>{recipientInfo.addressLine2}</Text>}
        <Text style={{ fontSize: ADDRESS_FONT, color: '#222' }}>{`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}</Text>
        {/* Logo in address box (bottom right) */}
        <Image
          source={logoOverride || logoImage}
          style={{ width: 80, height: 80, position: 'absolute', right: 0, bottom: 0, resizeMode: 'contain' }}
        />
      </View>
      {/* Stamp in stamp area (top right) */}
      <Image
        source={stampOverride || stampImage}
        style={{ position: 'absolute', top: 40, right: 40, width: 100, height: 100, resizeMode: 'contain' }}
      />
      {/* DEBUG: Overlay template for visual alignment (remove for production) */}
      <Image
        source={template}
        style={{ position: 'absolute', width, height, top: 0, left: 0, opacity: 0.4 }}
        resizeMode="stretch"
      />
    </View>
  );
};

export default PostcardBackLayout; 