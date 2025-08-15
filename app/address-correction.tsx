import React from 'react';
import { SafeAreaView, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AddressCorrectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse the addresses from params
  const originalAddress = params.originalAddress ? JSON.parse(params.originalAddress as string) : null;
  const correctedAddress = params.correctedAddress ? JSON.parse(params.correctedAddress as string) : null;

  // Add logging for incoming params
  React.useEffect(() => {
    console.log('[XLPOSTCARDS][ADDRESS-CORRECTION] Received params:', {
      imageUri: params.imageUri,
      message: params.message,
      originalAddress,
      correctedAddress
    });
  }, [params]);

  const handleUseCorrected = () => {
    console.log('[XLPOSTCARDS][ADDRESS-CORRECTION] Using corrected address, navigating back with params:', {
      imageUri: params.imageUri,
      message: params.message
    });
    router.replace({
      pathname: '/',
      params: {
        useCorrectedAddress: 'true',
        correctedAddress: params.correctedAddress,
        originalAddress: params.originalAddress,
        imageUri: params.imageUri,
        message: params.message
      }
    });
  };

  const handleUseOriginal = () => {
    console.log('[XLPOSTCARDS][ADDRESS-CORRECTION] Using original address, navigating back with params:', {
      imageUri: params.imageUri,
      message: params.message
    });
    router.replace({
      pathname: '/',
      params: {
        useOriginalAddress: 'true',
        originalAddress: params.originalAddress,
        imageUri: params.imageUri,
        message: params.message
      }
    });
  };

  const handleCancel = () => {
    console.log('[XLPOSTCARDS][ADDRESS-CORRECTION] Canceling, navigating back with params:', {
      imageUri: params.imageUri,
      message: params.message
    });
    router.replace({
      pathname: '/',
      params: {
        imageUri: params.imageUri,
        message: params.message
      }
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.container}>
        <Text style={styles.title}>Address Correction</Text>
        
        {correctedAddress && (
          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Suggested Correction</Text>
            <View style={styles.addressBox}>
              <Text style={[
                styles.addressText,
                correctedAddress.address !== originalAddress.address && styles.changedText
              ]}>
                {correctedAddress.address}
              </Text>
              {correctedAddress.address2 && (
                <Text style={[
                  styles.addressText,
                  correctedAddress.address2 !== originalAddress.address2 && styles.changedText
                ]}>
                  {correctedAddress.address2}
                </Text>
              )}
              <Text style={[
                styles.addressText,
                correctedAddress.city !== originalAddress.city && styles.changedText
              ]}>
                {correctedAddress.city}
              </Text>
              <Text style={[
                styles.addressText,
                correctedAddress.state !== originalAddress.state && styles.changedText
              ]}>
                {correctedAddress.state}
              </Text>
              <Text style={[
                styles.addressText,
                correctedAddress.zip !== originalAddress.zip && styles.changedText
              ]}>
                {correctedAddress.zip}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>Your Entry</Text>
          <View style={styles.addressBox}>
            <Text style={styles.addressText}>{originalAddress.address}</Text>
            {originalAddress.address2 && (
              <Text style={styles.addressText}>{originalAddress.address2}</Text>
            )}
            <Text style={styles.addressText}>{originalAddress.city}</Text>
            <Text style={styles.addressText}>{originalAddress.state}</Text>
            <Text style={styles.addressText}>{originalAddress.zip}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.correctedButton]}
            onPress={handleUseCorrected}
          >
            <Text style={styles.buttonText}>Use Correction</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.originalButton]}
            onPress={handleUseOriginal}
          >
            <Text style={[styles.buttonText, styles.originalButtonText]}>Use My Entry</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f28914',
    textAlign: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  addressSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 8,
  },
  addressBox: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addressText: {
    fontSize: 16,
    color: '#222',
    marginBottom: 4,
  },
  changedText: {
    color: '#f28914',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    alignItems: 'center',
    gap: 16,
  },
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  correctedButton: {
    backgroundColor: '#f28914',
    minWidth: 160,
    maxWidth: 200,
    marginRight: 0,
  },
  originalButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f28914',
    minWidth: 120,
    maxWidth: 140,
    marginLeft: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  originalButtonText: {
    color: '#f28914',
    fontSize: 15,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#f28914',
    borderRadius: 8,
    alignItems: 'center',
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  cancelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  iconButton: {
    padding: 0,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f28914',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    width: 56,
    marginRight: 8,
    alignSelf: 'center',
  },
});