import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import ViewShot from 'react-native-view-shot';

interface ViewShotMethods {
  capture: () => Promise<string>;
}

interface RecipientInfo {
  to: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  id?: string;
}

const PostcardBackGenerator = ({ 
  message, 
  recipientInfo, 
  onGenerated, 
  postcardSize = 'xl'
}: { 
  message: string; 
  recipientInfo: RecipientInfo | null; 
  onGenerated: (uri: string, recipientData: RecipientInfo | null) => void; 
  postcardSize?: 'regular' | 'xl';
}) => {
  const [error, setError] = useState<string | null>(null);
  const viewShotRef = useRef<ViewShot & ViewShotMethods>(null);

  const isRegular = postcardSize === 'regular';
  
  // STANNP EXACT SPECIFICATIONS - Design for print first!
  const WIDTH = isRegular ? 1871 : 2771;   // Stannp exact pixel dimensions @ 300 DPI
  const HEIGHT = isRegular ? 1271 : 1871;
  
  // STANNP SAFE ZONES - Based on template specifications
  if (isRegular) {
    // 4x6 Regular: Use Stannp template exact measurements
    var SAFE_LEFT = 72;        // 0.24" = 72px @ 300 DPI
    var SAFE_TOP = 72;         // 0.24" = 72px @ 300 DPI  
    var SAFE_RIGHT = 72;       // 0.24" = 72px @ 300 DPI
    var SAFE_BOTTOM = 72;      // 0.24" = 72px @ 300 DPI
    
    // Message area: Left 2.93" (879px) of safe zone
    var MESSAGE_LEFT = SAFE_LEFT;
    var MESSAGE_TOP = SAFE_TOP;
    var MESSAGE_WIDTH = 879;   // 2.93" exactly from Stannp template
    var MESSAGE_HEIGHT = HEIGHT - SAFE_TOP - SAFE_BOTTOM;
    
    // Address area: Right 4.13" (1239px) of safe zone  
    var ADDRESS_RIGHT = SAFE_RIGHT;
    var ADDRESS_BOTTOM = SAFE_BOTTOM + 100;  // Space from bottom
    var ADDRESS_WIDTH = 600;   // Conservative width for address
    var ADDRESS_HEIGHT = 200;  // Conservative height for address
    
    var MESSAGE_FONT = 28;
    var ADDRESS_FONT = 28;
  } else {
    // 6x9 XL: Proportionally scale up
    var SAFE_LEFT = 108;       // 0.36" = 108px @ 300 DPI
    var SAFE_TOP = 108;
    var SAFE_RIGHT = 108;
    var SAFE_BOTTOM = 108;
    
    var MESSAGE_LEFT = SAFE_LEFT;
    var MESSAGE_TOP = SAFE_TOP;
    var MESSAGE_WIDTH = WIDTH * 0.48;  // Keep proportional to XL size
    var MESSAGE_HEIGHT = HEIGHT - SAFE_TOP - SAFE_BOTTOM;
    
    var ADDRESS_RIGHT = SAFE_RIGHT;
    var ADDRESS_BOTTOM = SAFE_BOTTOM + 120;
    var ADDRESS_WIDTH = 700;
    var ADDRESS_HEIGHT = 300;
    
    var MESSAGE_FONT = 42;
    var ADDRESS_FONT = 42;
  }

  useEffect(() => {
    const generatePostcardBack = async () => {
      try {
        if (!viewShotRef.current) {
          throw new Error('ViewShot ref not initialized');
        }

        if (!recipientInfo) {
          console.warn('[XLPOSTCARDS][GENERATOR] No recipient info available');
          return;
        }

        const uri = await viewShotRef.current.capture();
        onGenerated(uri, recipientInfo);
      } catch (error) {
        console.error('[XLPOSTCARDS][GENERATOR] Error generating postcard back:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate postcard back');
      }
    };

    if (recipientInfo) {
      void generatePostcardBack();
    }
  }, [message, recipientInfo, onGenerated]);

  if (error) {
    console.error('[XLPOSTCARDS][GENERATOR] Error:', error);
    return null;
  }

  if (!recipientInfo) {
    console.warn('[XLPOSTCARDS][GENERATOR] No recipient info available, not rendering');
    return null;
  }

  return (
    <View style={styles.container}>
      <ViewShot
        ref={viewShotRef}
        style={styles.postcardBack}
        options={{
          format: 'jpg',
          quality: 0.9,
          width: WIDTH,
          height: HEIGHT,
        }}
      >
        <View style={{flex:1, backgroundColor: 'white'}}>
          {/* Message area - STANNP EXACT POSITIONING */}
          <View style={{
            position: 'absolute', 
            top: MESSAGE_TOP, 
            left: MESSAGE_LEFT, 
            width: MESSAGE_WIDTH,
            height: MESSAGE_HEIGHT,
            // Debug border to verify positioning
            // borderWidth: 1, borderColor: 'red', borderStyle: 'dashed'
          }}>
            <Text style={{fontSize: MESSAGE_FONT, color: '#222', lineHeight: MESSAGE_FONT * 1.2}}>
              {message}
            </Text>
          </View>
          
          {/* Address area - STANNP EXACT POSITIONING */}
          <View style={{
            position: 'absolute', 
            bottom: ADDRESS_BOTTOM, 
            right: ADDRESS_RIGHT, 
            width: ADDRESS_WIDTH,
            height: ADDRESS_HEIGHT,
            // Debug border to verify positioning  
            // borderWidth: 1, borderColor: 'blue', borderStyle: 'dashed'
          }}>
            <Text style={{fontSize: ADDRESS_FONT, color: '#222', lineHeight: ADDRESS_FONT * 1.2}}>
              {recipientInfo.to}
            </Text>
            <Text style={{fontSize: ADDRESS_FONT, color: '#222', marginTop: 4, lineHeight: ADDRESS_FONT * 1.2}}>
              {recipientInfo.addressLine1}
            </Text>
            {recipientInfo.addressLine2 && (
              <Text style={{fontSize: ADDRESS_FONT, color: '#222', marginTop: 4, lineHeight: ADDRESS_FONT * 1.2}}>
                {recipientInfo.addressLine2}
              </Text>
            )}
            <Text style={{fontSize: ADDRESS_FONT, color: '#222', marginTop: 4, lineHeight: ADDRESS_FONT * 1.2}}>
              {`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}
            </Text>
          </View>
        </View>
      </ViewShot>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  postcardBack: {
    flex: 1,
    backgroundColor: 'white',
  }
});

export default PostcardBackGenerator;