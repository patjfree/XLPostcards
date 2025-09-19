import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, View, Switch, Platform, StatusBar, Text, TouchableOpacity, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const SETTINGS_KEYS = {
  EMAIL: 'settings_email',
  SIGNATURE: 'settings_signature',
  RETURN_ADDRESS: 'settings_return_address',
  INCLUDE_RETURN_ADDRESS: 'settings_include_return_address',
};

export default function SettingsScreen() {
  const [email, setEmail] = useState('');
  const [signature, setSignature] = useState('');
  const [returnAddress, setReturnAddress] = useState('');
  const [includeReturnAddress, setIncludeReturnAddress] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedEmail, savedSignature, savedReturnAddress, savedIncludeReturnAddress] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEYS.EMAIL),
        AsyncStorage.getItem(SETTINGS_KEYS.SIGNATURE),
        AsyncStorage.getItem(SETTINGS_KEYS.RETURN_ADDRESS),
        AsyncStorage.getItem(SETTINGS_KEYS.INCLUDE_RETURN_ADDRESS),
      ]);

      setEmail(savedEmail || '');
      setSignature(savedSignature || '');
      setReturnAddress(savedReturnAddress || '');
      setIncludeReturnAddress(savedIncludeReturnAddress === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(SETTINGS_KEYS.EMAIL, email),
        AsyncStorage.setItem(SETTINGS_KEYS.SIGNATURE, signature),
        AsyncStorage.setItem(SETTINGS_KEYS.RETURN_ADDRESS, returnAddress),
        AsyncStorage.setItem(SETTINGS_KEYS.INCLUDE_RETURN_ADDRESS, includeReturnAddress.toString()),
      ]);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Handle return address change with 3-line limit
  const handleReturnAddressChange = (text: string) => {
    const lines = text.split('\n');
    if (lines.length <= 3) {
      setReturnAddress(text);
    } else {
      // If more than 3 lines, only keep the first 3
      const limitedText = lines.slice(0, 3).join('\n');
      setReturnAddress(limitedText);
    }
  };

  // Save settings whenever they change
  useEffect(() => {
    saveSettings();
  }, [email, signature, returnAddress, includeReturnAddress]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 32) : 0 }}>
        <Text style={styles.title}>Settings</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.emailNote}>For postcard proof</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="MarthaWashington@aol.com"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          testID="settings-email-input"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Signature Block</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={signature}
          onChangeText={setSignature}
          placeholder="Love,&#10;Martha"
          placeholderTextColor="#888"
          multiline
          numberOfLines={3}
          testID="settings-signature-input"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Return Address</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={returnAddress}
          onChangeText={handleReturnAddressChange}
          placeholder="Martha Washington&#10;1 Mount Vernon Way&#10;Mount Vernon, VA"
          placeholderTextColor="#888"
          multiline
          numberOfLines={3}
          testID="settings-return-address-input"
        />
      </View>

      <View style={styles.switchContainer}>
        <Text style={[styles.label, { flex: 1, flexWrap: 'wrap' }]}>Use Return Address</Text>
        <Switch
          value={includeReturnAddress}
          onValueChange={setIncludeReturnAddress}
          trackColor={{ false: '#767577', true: '#f28914' }}
          thumbColor={includeReturnAddress ? '#fff' : '#f4f3f4'}
        />
      </View>


      <View style={styles.section}>
        <TouchableOpacity
          style={styles.videoTutorialButton}
          onPress={() => {
            Linking.openURL('https://youtu.be/your-video-id');
          }}
          testID="video-tutorial-btn"
        >
          <Text style={styles.videoTutorialText}>📺 Watch Video Tutorial</Text>
        </TouchableOpacity>
      </View>

      {/* Hide reset tour button for now - keep code in case needed later
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.resetTourButton}
          onPress={() => {
            if ((global as any).showHamburgerSpotlight) {
              (global as any).showHamburgerSpotlight();
            }
          }}
          testID="reset-tour-btn"
        >
          <Text style={styles.resetTourText}>🔄 Reset Tour</Text>
        </TouchableOpacity>
      </View>
      */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0a7ea4',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#f28914',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  emailNote: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  videoTutorialButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  videoTutorialText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetTourButton: {
    backgroundColor: '#666',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  resetTourText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 