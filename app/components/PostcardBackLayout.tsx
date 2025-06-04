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
  postageImage?: any;
  stampImage?: any;
}

const postageIndicia = require('../../assets/images/TruePostage.jpeg');
const stampImage = require('../../assets/images/stamp.png');

// Address box positions (further adjusted for 4x6)
const addressBox = {
  regular: { left: 950, top: 780, width: 700, height: 320 }, // more top margin, slightly narrower
  xl: { left: 1700, top: 1200, width: 800, height: 400 },
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
  const box = addressBox[postcardSize];
  const MESSAGE_FONT = postcardSize === 'regular' ? 32 : 48;
  const ADDRESS_FONT = postcardSize === 'regular' ? 32 : 48;
  // Make stamp and postage indicia 4x larger (not 16x)
  const STAMP_SIZE = postcardSize === 'regular' ? 400 : 400; // 100*4
  const POSTAGE_HEIGHT = postcardSize === 'regular' ? 240 : 240; // 60*4

  // For 4x6, move message block further left and down, and make it narrower
  const messageBlockStyle = postcardSize === 'regular'
    ? { position: 'absolute' as const, left: 60, top: 60, width: width * 0.38, height: height - 120 }
    : { position: 'absolute' as const, left: 60, top: 60, width: width * 0.5, height: height - 120 };

  // For 4x6, move stamp further in from the edge
  const stampStyle = postcardSize === 'regular'
    ? { position: 'absolute' as const, top: 80, right: 80, width: STAMP_SIZE, height: STAMP_SIZE }
    : { position: 'absolute' as const, top: 40, right: 40, width: STAMP_SIZE, height: STAMP_SIZE };

  return (
    <View style={{ width, height, backgroundColor: 'white' }}>
      {/* Message block */}
      <View style={messageBlockStyle}>
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
        {/* Postage indicia at top of address box, 4x larger */}
        <Image
          source={postageImage || postageIndicia}
          style={{ width: box.width, height: POSTAGE_HEIGHT, marginBottom: 8 }}
          resizeMode="contain"
        />
        {/* Address text */}
        <Text style={{ fontSize: ADDRESS_FONT, color: '#222' }}>{recipientInfo.to}</Text>
        <Text style={{ fontSize: ADDRESS_FONT, color: '#222' }}>{recipientInfo.addressLine1}</Text>
        {recipientInfo.addressLine2 && <Text style={{ fontSize: ADDRESS_FONT, color: '#222' }}>{recipientInfo.addressLine2}</Text>}
        <Text style={{ fontSize: ADDRESS_FONT, color: '#222' }}>{`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}</Text>
      </View>
      {/* Stamp in stamp area (top right), 4x larger */}
      <Image
        source={stampOverride || stampImage}
        style={stampStyle}
        resizeMode="contain"
      />
    </View>
  );
};

export default PostcardBackLayout; 