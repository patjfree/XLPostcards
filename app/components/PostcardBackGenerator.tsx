import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import ViewShot from 'react-native-view-shot';

interface ViewShotMethods {
  capture: () => Promise<string>;
}

const PostcardBackGenerator = ({ message, recipientInfo, onGenerated }: { message: string; recipientInfo: { to: string; addressLine1: string; addressLine2?: string; city: string; state: string; zipcode: string; }; onGenerated: (uri: string) => void; }) => {
  const [error, setError] = useState<string | null>(null);
  const viewShotRef = useRef<ViewShot & ViewShotMethods>(null);

  useEffect(() => {
    const generatePostcardBack = async () => {
      try {
        if (!viewShotRef.current) {
          throw new Error('ViewShot ref not initialized');
        }

        const uri = await viewShotRef.current.capture();
        onGenerated(uri);
      } catch (error) {
        console.error('Error generating postcard back:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate postcard back');
      }
    };

    generatePostcardBack();
  }, [message, recipientInfo]);

  if (error) {
    console.error('PostcardBackGenerator error:', error);
  }

  return (
    <View style={styles.container}>
      <ViewShot
        ref={viewShotRef}
        style={styles.postcardBack}
        options={{
          format: 'jpg',
          quality: 0.9,
          width: 1871,
          height: 1271,
        }}
      >
        <View style={{flex:1, backgroundColor: 'white'}}>
          <View style={{width: '50%', borderRightWidth: 2, borderRightColor: 'black', paddingRight: 50}}>
          </View>
          <View style={{width: '50%', paddingLeft: 50}}>
            <View style={{position: 'absolute', top: 50, left: 50}}>
              <Text style={{fontSize: 48}}>{message}</Text>
            </View>
            <View style={{position: 'absolute', bottom: 100, left: 0}}>
              <Text style={{fontSize: 48}}>{recipientInfo.to}</Text>
              <Text style={{fontSize: 48, marginTop: 20}}>{recipientInfo.addressLine1}</Text>
              {recipientInfo.addressLine2 && <Text style={{fontSize: 48, marginTop: 20}}>{recipientInfo.addressLine2}</Text>}
              <Text style={{fontSize: 48, marginTop: 20}}>{`${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}</Text>
            </View>
            <View style={{position: 'absolute', top: 50, right: 50, width: 200, height: 200, borderColor: '#cccccc', borderWidth: 1, borderStyle: 'solid'}}>
              <Text style={{fontSize: 32, position: 'absolute', top: '50%', left: '50%', transform: [{translateX: '-50%'}, {translateY: '-50%'}]}}>STAMP</Text>
            </View>
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