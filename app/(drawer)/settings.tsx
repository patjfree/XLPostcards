import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, View, Switch, Platform, StatusBar, Text } from 'react-native';
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

  // Save settings whenever they change
  useEffect(() => {
    saveSettings();
  }, [email, signature, returnAddress, includeReturnAddress]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 32) : 0 }}>
        <Text style={styles.title}>Settings</Text>
      </View>
      
      {/* Email field temporarily hidden */}
      {/* <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View> */}

      <View style={styles.section}>
        <Text style={styles.label}>Signature Block</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={signature}
          onChangeText={setSignature}
          placeholder="How do you sign your postcards"
          placeholderTextColor="#888"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Return Address</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={returnAddress}
          onChangeText={setReturnAddress}
          placeholder="Your return address (3 lines max)&#10;e.g.:&#10;John Smith&#10;123 Main St"
          placeholderTextColor="#888"
          multiline
          numberOfLines={4}
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
    marginBottom: 20,
    color: '#0a7ea4',
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
    height: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
}); 