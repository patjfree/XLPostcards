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
  const WIDTH = isRegular ? 1871 : 2771;
  const HEIGHT = isRegular ? 1271 : 1871;
  const MESSAGE_FONT = isRegular ? 32 : 48;
  const ADDRESS_FONT = isRegular ? 32 : 48;
  const LOGO_SIZE = isRegular ? 180 : 260;
  const STAMP_FONT = isRegular ? 20 : 32;
  const PADDING = isRegular ? 32 : 50;
  const ADDRESS_BOTTOM = isRegular ? 60 : 100;
  const LOGO_RIGHT = isRegular ? 32 : 50;
  const LOGO_BOTTOM = isRegular ? 32 : 50;
  const STAMP_SIZE = isRegular ? 100 : 200;
  const STAMP_TOP = isRegular ? 20 : 50;
  const STAMP_RIGHT = isRegular ? 20 : 50;

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
          <View style={{position: 'absolute', top: PADDING, left: PADDING, width: WIDTH * 0.55 - PADDING, height: HEIGHT - 2 * PADDING}}>
            <Text style={{fontSize: MESSAGE_FONT, color: '#222'}}>{message}</Text>
          </View>
          <View style={{position: 'absolute', bottom: ADDRESS_BOTTOM, left: WIDTH * 0.55 + PADDING, width: WIDTH * 0.4 - 2 * PADDING}}>
            <Text style={{fontSize: ADDRESS_FONT, color: '#222'}}>{recipientInfo.to}</Text>
            <Text style={{fontSize: ADDRESS_FONT, color: '#222', marginTop: 8}}>{recipientInfo.addressLine1}</Text>
            {recipientInfo.addressLine2 && <Text style={{fontSize: ADDRESS_FONT, color: '#222', marginTop: 8}}>{recipientInfo.addressLine2}</Text>}
            <Text style={{fontSize: ADDRESS_FONT, color: '#222', marginTop: 8}}>{`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}</Text>
          </View>
          <View style={{position: 'absolute', right: LOGO_RIGHT, bottom: LOGO_BOTTOM}}>
            <Text style={{fontSize: LOGO_SIZE}}>📬</Text>
          </View>
          <View style={{position: 'absolute', top: STAMP_TOP, right: STAMP_RIGHT, width: STAMP_SIZE, height: STAMP_SIZE, borderColor: '#cccccc', borderWidth: 1, borderStyle: 'solid', alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontSize: STAMP_FONT}}>STAMP</Text>
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