import { useState, useEffect } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Share, Platform, ActivityIndicator, Linking, ScrollView, Dimensions, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import ViewShot from 'react-native-view-shot';
import { useRef } from 'react';
import Constants from 'expo-constants';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AIDisclaimer from './components/AIDisclaimer';

// Postcard dimensions at 300 DPI
const POSTCARD_WIDTH = 1871;
const POSTCARD_HEIGHT = 1271;

// Define interface for ViewShot methods
interface ViewShotMethods {
  capture: () => Promise<string>;
}

console.log("App started. Environment check:");
console.log("- stannpApiKey available:", !!Constants.expoConfig?.extra?.stannpApiKey);
if (!Constants.expoConfig?.extra?.stannpApiKey) {
  console.warn("WARNING: Stannp API key is missing!");
}

const CheckboxIcon = ({ checked }: { checked: boolean }) => (
  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
    {checked && (
      <MaterialIcons 
        name="check"
        size={18}
        color="#ffffff"
        style={{ margin: -2 }}
      />
    )}
  </View>
);

// Function to scale an image to the required dimensions
const scaleImage = async (imageUri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: POSTCARD_WIDTH, height: POSTCARD_HEIGHT } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error('Error scaling image:', error);
    throw error;
  }
};

export default function PostcardPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const viewShotFrontRef = useRef<ViewShot & ViewShotMethods>(null);
  const viewShotBackRef = useRef<ViewShot & ViewShotMethods>(null);
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('back');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean; 
    message: string;
    pdfUrl?: string;
  } | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showRefundSuccessModal, setShowRefundSuccessModal] = useState(false);
  const [stannpAttempts, setStannpAttempts] = useState(0);
  const [refundData, setRefundData] = useState({
    date: new Date().toISOString(),
    name: '',
    email: '',
    comments: '',
    platform: Platform.OS,
    transactionId: '',
    stannpError: ''
  });
  
  // Get data from route params
  const imageUri = params.imageUri as string;
  const message = params.message as string;
  const recipientInfo = JSON.parse(params.recipient as string);
  
  useEffect(() => {
    console.log('Image URI:', imageUri);
    console.log('Message:', message);
    console.log('Recipient info:', JSON.stringify(recipientInfo, null, 2));

    // Verify the image exists
    const checkImage = async () => {
      try {
        const imageInfo = await FileSystem.getInfoAsync(imageUri);
        console.log('Image exists:', imageInfo.exists, 'Image info:', imageInfo);
        
        if (!imageInfo.exists) {
          setImageLoadError(true);
          console.error('Image file does not exist at path:', imageUri);
        }
      } catch (error) {
        console.error('Error checking image:', error);
        setImageLoadError(true);
      }
    };

    checkImage();
  }, []);
  
  // Function to flip the postcard
  const flipPostcard = () => {
    setCurrentSide(currentSide === 'front' ? 'back' : 'front');
  };
  
  // Function to save the postcard
  const savePostcard = async () => {
    if (!viewShotFrontRef.current || !viewShotBackRef.current) return;
    
    try {
      setSaving(true);
      
      // Request permissions if needed
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('We need media library permissions to save the postcard');
        setSaving(false);
        return;
      }
      
      // Capture both front and back images
      const frontUri = await viewShotFrontRef.current.capture();
      const backUri = await viewShotBackRef.current.capture();
      
      // Save both images to media library
      const frontAsset = await MediaLibrary.createAssetAsync(frontUri);
      const backAsset = await MediaLibrary.createAssetAsync(backUri);
      
      // Create album and add both images
      await MediaLibrary.createAlbumAsync('Postcards', frontAsset, false);
      await MediaLibrary.createAlbumAsync('Postcards', backAsset, false);
      
      alert('Postcard front and back saved to your photos!');
      setSaving(false);
    } catch (error) {
      console.error('Error saving postcard:', error);
      alert('Failed to save postcard');
      setSaving(false);
    }
  };
  
  // Function to send the postcard via Stannp API
  const sendPostcard = async () => {
    console.log("==== SENDING POSTCARD ====");
    console.log("Starting send process...");
    
    try {
      setSending(true);
      setSendResult(null);
      setIsCapturing(true);

      // Get API key
      const apiKey = Constants.expoConfig?.extra?.stannpApiKey;
      
      if (!apiKey) {
        console.error("API key is missing!");
        throw new Error('Stannp API key not found. Please check your .env file and app.config.js.');
      }

      // Step 1: Capture images at full resolution
      console.log("Capturing front and back images at full resolution...");
      
      if (!viewShotFrontRef.current || !viewShotBackRef.current) {
        throw new Error('ViewShot refs not initialized');
      }

      const frontOriginalUri = await viewShotFrontRef.current.capture();
      const backOriginalUri = await viewShotBackRef.current.capture();
      
      setIsCapturing(false);  // Reset capturing mode after snapshots
      
      console.log("Captured original image URIs:");
      console.log("- Front URI:", frontOriginalUri);
      console.log("- Back URI:", backOriginalUri);

      // Step 2: Scale images to required dimensions
      console.log("Scaling images to required dimensions...");
      const frontUri = await scaleImage(frontOriginalUri);
      const backUri = await scaleImage(backOriginalUri);
      
      console.log("Scaled image URIs:");
      console.log("- Scaled Front URI:", frontUri);
      console.log("- Scaled Back URI:", backUri);

      // Step 3: Create FormData and send to Stannp
      console.log("Creating FormData for Stannp API...");
      const formData = new FormData();
      
      // Add test mode flag and size
      formData.append('test', 'true');  // This sets whether the postcard is sent or not
      formData.append('size', '4x6');
      
      // Add scaled front and back images
      // @ts-ignore - React Native's FormData accepts this format
      formData.append('front', {
        uri: frontUri,
        type: 'image/jpeg',
        name: 'front.jpg'
      });

      // @ts-ignore - React Native's FormData accepts this format
      formData.append('back', {
        uri: backUri,
        type: 'image/jpeg',
        name: 'back.jpg'
      });
      
      // Format recipient data
      const nameParts = recipientInfo.to.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      formData.append('recipient[firstname]', firstName);
      formData.append('recipient[lastname]', lastName);
      formData.append('recipient[address1]', recipientInfo.addressLine1);
      if (recipientInfo.addressLine2) {
        formData.append('recipient[address2]', recipientInfo.addressLine2);
      }
      formData.append('recipient[city]', recipientInfo.city);
      formData.append('recipient[state]', recipientInfo.state);
      formData.append('recipient[postcode]', recipientInfo.zipcode);
      formData.append('recipient[country]', 'US');
      
      // Add clearzone parameter to ensure machine readability
      formData.append('clearzone', 'true');
      
      // Create authorization header with invalid API key for testing
      const authHeader = 'Basic ' + btoa(`${apiKey}:`);
      
      // Make the API request
      console.log("Sending request to Stannp API...");
      const response = await fetch('https://api-us1.stannp.com/v1/postcards/create', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      console.log("Response received. Status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("ERROR: Bad response from API:", errorText);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }
      
      const responseText = await response.text();
      console.log("Raw API Response:", responseText);
      
      const data = JSON.parse(responseText);
      console.log("Parsed API Response:", JSON.stringify(data, null, 2));
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send postcard');
      }
      
      // Extract PDF preview URL
      const pdfUrl = data.data.pdf || data.data.pdf_url;
      
      // Success case - update all states in one batch
      const updates = async () => {
        setStannpAttempts(0);
        setSendResult({
          success: true,
          message: `Test postcard created successfully! A print-ready PDF has been generated.`,
          pdfUrl: pdfUrl
        });
        setShowSuccessModal(true);
        setSending(false);
        setIsCapturing(false);
      };
      await updates();
      
    } catch (error) {
      console.error('ERROR in sending process:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Error case - update all states in one batch
      const updates = async () => {
        setSendResult({
          success: false,
          message: `Failed to generate postcard preview: ${errorMessage}`
        });
        setStannpAttempts(prev => prev + 1);
        setShowErrorModal(true);
        setRefundData(prev => ({
          ...prev,
          stannpError: errorMessage
        }));
        setSending(false);
        setIsCapturing(false);
      };
      await updates();
    }
  };
  
  // Function to check status of a sent postcard
  const fetchPostcardStatus = async (postcardId: number | string) => {
    // Don't try to check status if we're in test mode with ID 0
    if (postcardId === 0) {
      console.log("Test mode postcard (ID: 0) - skipping status check");
      return;
    }
    
    try {
      const apiKey = Constants.expoConfig?.extra?.stannpApiKey;
      if (!apiKey) throw new Error('API key not found');
      
      const response = await fetch(`https://api-us1.stannp.com/v1/postcards/status/${postcardId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${apiKey}:`),
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Status check failed with code ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Status check result:", data);
      
      if (data.success) {
        setSendResult((prev: SendResult | null) => {
          if (!prev) return null;
          return {
            ...prev,
            message: `${prev.message} Status: ${data.data.status}. Cost: ${data.data.cost || 'N/A'}.`
          };
        });
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  };
  
  // Format recipient's full address
  const formattedAddress = () => {
    const parts = [];
    
    if (recipientInfo.addressLine1) {
      parts.push(recipientInfo.addressLine1);
    }
    
    if (recipientInfo.addressLine2) {
      parts.push(recipientInfo.addressLine2);
    }
    
    const cityStateZip = [
      recipientInfo.city,
      recipientInfo.state,
      recipientInfo.zipcode
    ].filter(Boolean).join(', ');
    
    if (cityStateZip) {
      parts.push(cityStateZip);
    }
    
    return parts.join('\n');
  };
  
  // Add this test function at the same level as your other functions
  const sendTestPostcard = () => {
    setSendResult({
      success: true,
      message: "This is a test confirmation. In a real app, the postcard would be sent to Stannp."
    });
  };
  
  // Calculate scale factor based on screen width
  const screenWidth = Dimensions.get('window').width - 16; // Account for padding
  const scaleFactor = screenWidth / POSTCARD_WIDTH;
  const scaledHeight = POSTCARD_HEIGHT * scaleFactor;

  // Purchase Modal Component
  const PurchaseModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showPurchaseModal}
      onRequestClose={() => setShowPurchaseModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ThemedText style={styles.modalTitle}>Purchase Postcard</ThemedText>
          <ThemedText style={styles.modalText}>Ready to send your Nanagram?</ThemedText>
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={() => {
              setShowPurchaseModal(false);
              sendPostcard();
            }}
          >
            <ThemedText style={styles.modalButtonText}>Purchase</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Success Modal Component
  const SuccessModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showSuccessModal}
      onRequestClose={() => {
        setShowSuccessModal(false);
        router.replace('/');
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ThemedText style={styles.modalTitle}>Success!</ThemedText>
          <ThemedText style={styles.modalText}>
            We've received your Nanagram, your recipient will receive their Postcard within a week.
          </ThemedText>
          {__DEV__ && sendResult?.pdfUrl && (
            <TouchableOpacity 
              style={[styles.modalButton, { marginBottom: 12 }]}
              onPress={() => {
                Linking.openURL(sendResult.pdfUrl as string);
              }}
            >
              <ThemedText style={styles.modalButtonText}>View PDF Preview</ThemedText>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={() => {
              setShowSuccessModal(false);
              router.replace('/');
            }}
          >
            <ThemedText style={styles.modalButtonText}>OK</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Error Modal Component
  const ErrorModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showErrorModal}
      onRequestClose={() => setShowErrorModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ThemedText style={styles.modalTitle}>Oops!</ThemedText>
          <ThemedText style={styles.modalText}>
            {stannpAttempts === 1 
              ? "Oops, something went wrong with your Nanagram. Please Try Again."
              : "Oops, something went wrong with your Nanagram. Let's request your Refund."}
          </ThemedText>
          {stannpAttempts === 1 ? (
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setShowErrorModal(false);
                sendPostcard();
              }}
            >
              <ThemedText style={styles.modalButtonText}>Try Again</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setShowErrorModal(false);
                setShowRefundModal(true);
              }}
            >
              <ThemedText style={styles.modalButtonText}>Request Refund</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

  // Refund Modal Component
  const RefundModal = () => {
    const [refundForm, setRefundForm] = useState({
      name: '',
      email: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitRefund = async () => {
      setIsSubmitting(true);
      try {
        const formData = new URLSearchParams();
        formData.append('Name', refundForm.name);
        formData.append('Email', refundForm.email);
        formData.append('Comments', `Transaction ID: ${refundData.transactionId || 'Not available'}`);
        formData.append('Payload', JSON.stringify({
          platform: Platform.OS,
          stannpError: sendResult?.message || 'Unknown error',
          recipientInfo: recipientInfo,
          postcardMessage: message,
          imageUri: imageUri
        }));

        // Use the same reporting endpoint as AIDisclaimer
        const response = await fetch('https://script.google.com/macros/s/AKfycbwgPQTnYaApkceJFVOXh4bru-kT392o1RiDYJc4cp4_9UB9zANAX-XsfDXotu-JFwvJsg/exec', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
          mode: 'no-cors'
        });

        setShowRefundModal(false);
        setShowRefundSuccessModal(true);
      } catch (error) {
        console.error('Error submitting refund request:', error);
        Alert.alert('Error', 'Failed to submit refund request. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRefundModal}
        onRequestClose={() => setShowRefundModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Request Refund</ThemedText>
            <ThemedText style={styles.modalText}>
              Please provide your information for the refund request:
            </ThemedText>
            
            <TextInput
              style={styles.refundInput}
              placeholder="Name *"
              placeholderTextColor="#999"
              value={refundForm.name}
              onChangeText={(text) => setRefundForm(prev => ({ ...prev, name: text }))}
            />

            <TextInput
              style={styles.refundInput}
              placeholder="Email *"
              placeholderTextColor="#999"
              value={refundForm.email}
              onChangeText={(text) => setRefundForm(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity 
              style={[
                styles.modalButton,
                (!refundForm.name.trim() || !refundForm.email.trim() || isSubmitting) && { opacity: 0.5 }
              ]}
              onPress={handleSubmitRefund}
              disabled={!refundForm.name.trim() || !refundForm.email.trim() || isSubmitting}
            >
              <ThemedText style={styles.modalButtonText}>
                {isSubmitting ? 'Submitting...' : 'Request Refund'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Refund Success Modal Component
  const RefundSuccessModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showRefundSuccessModal}
      onRequestClose={() => {
        setShowRefundSuccessModal(false);
        router.replace('/');
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ThemedText style={styles.modalTitle}>Refund Request Received</ThemedText>
          <ThemedText style={styles.modalText}>
            We've received your request for a refund, please give us 2 business days to investigate and complete the transaction.
          </ThemedText>
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={() => {
              setShowRefundSuccessModal(false);
              router.replace('/');
            }}
          >
            <ThemedText style={styles.modalButtonText}>OK</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        style={{ width: '100%' }} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Front of postcard */}
        <ViewShot 
          ref={viewShotFrontRef} 
          style={[styles.postcardPreviewContainer, {
            width: screenWidth,
            height: scaledHeight,
            paddingTop: 20  // Add padding to the container
          }]}
          options={{
            width: POSTCARD_WIDTH,
            height: POSTCARD_HEIGHT,
            quality: 1,
            format: "jpg"
          }}
        >
          <View style={[styles.postcardContainer, {
            transform: [{ scale: scaleFactor }],
            transformOrigin: 'top left'
          }]}>
            <Image 
              source={{ uri: imageUri }}
              style={styles.postcardFront}
              onError={(error: ImageErrorEvent) => {
                console.error('Image loading error:', error?.nativeEvent?.error || 'Unknown error');
                setImageLoadError(true);
              }}
              onLoad={() => {
                console.log('Image loaded successfully');
                setImageLoadError(false);
              }}
            />
            {imageLoadError && (
              <View style={styles.errorOverlay}>
                <ThemedText style={styles.errorText}>
                  Failed to load image.{'\n'}Please go back and try again.
                </ThemedText>
              </View>
            )}
          </View>
        </ViewShot>

        {/* Back of postcard */}
        <ViewShot 
          ref={viewShotBackRef} 
          style={[styles.postcardPreviewContainer, styles.marginTop, {
            width: screenWidth,
            height: scaledHeight
          }]}
          options={{
            width: POSTCARD_WIDTH,
            height: POSTCARD_HEIGHT,
            quality: 1,
            format: "jpg",
            fileName: "postcard-back"
          }}
        >
          <View style={[styles.postcardContainer, {
            transform: [{ scale: scaleFactor }],
            transformOrigin: 'top left'
          }]}>
            <Image
              source={require('@/assets/images/PostcardBackTemplate.jpg')}
              style={[styles.postcardBack]}
              resizeMode="contain"
            />
            
            {/* Message Box */}
            <View style={[styles.messageBox]}>
              <ThemedText style={styles.messageText}>
                {message}
              </ThemedText>
            </View>

            {/* Address Box */}
            <View style={[styles.addressBox]}>
              <View style={styles.addressContent}>
                <ThemedText style={styles.recipientName}>
                  {recipientInfo.to}
                </ThemedText>
                <ThemedText style={styles.addressText}>
                  {recipientInfo.addressLine1}
                  {recipientInfo.addressLine2 ? `\n${recipientInfo.addressLine2}` : ''}
                  {`\n${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}
                </ThemedText>
              </View>
            </View>
          </View>
        </ViewShot>

        {/* Footer content */}
        <View style={styles.footerContainer}>
          {/* Disclaimer Text */}
          <ThemedText style={styles.disclaimerText}>
            By clicking the Continue button, I confirm the postcard preview is accurate and agree to print as shown. No further changes can be made.
          </ThemedText>

          {/* Controls */}
          <View style={styles.controls}>
            <View style={styles.buttonRow}>
              {!sendResult?.success ? (
                <TouchableOpacity 
                  style={[
                    styles.submitButton,
                    sending && { opacity: 0.5 }
                  ]} 
                  onPress={() => setShowPurchaseModal(true)}
                  disabled={sending}
                >
                  <ThemedText style={styles.buttonText}>Continue</ThemedText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Status indicators remain outside ScrollView */}
      {sending && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color="#A1CEDC" />
          <ThemedText style={styles.statusText}>Sending Nanagram...</ThemedText>
        </View>
      )}
      
      {sendResult?.message && (
        <View style={[
          styles.statusContainer, 
          sendResult.success ? styles.successContainer : styles.errorContainer
        ]}>
          <ThemedText style={styles.statusText}>{sendResult.message}</ThemedText>
        </View>
      )}
      
      {/* Add the new modals */}
      <PurchaseModal />
      <SuccessModal />
      <ErrorModal />
      <RefundModal />
      <RefundSuccessModal />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#1D3D47',
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 12,
  },
  postcardPreviewContainer: {
    alignSelf: 'center',
    overflow: 'hidden',
  },
  postcardContainer: {
    width: POSTCARD_WIDTH,
    height: POSTCARD_HEIGHT,
    backgroundColor: 'white',
    position: 'relative',
  },
  marginTop: {
    marginTop: 20,
  },
  postcardFront: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  postcardBack: {
    position: 'absolute',
    width: POSTCARD_WIDTH,
    height: POSTCARD_HEIGHT,
    backgroundColor: 'white',
  },
  messageBox: {
    position: 'absolute',
    top: 72,
    left: 72,
    width: 561,
    height: 1128,
    padding: 20,
  },
  messageText: {
    fontFamily: 'Arial',
    fontSize: 44,
    color: '#333333',
    lineHeight: 58,
  },
  addressBox: {
    position: 'absolute',
    top: 633,
    left: 888,
    width: 1167,
    height: 407,
    padding: 0,
  },
  addressContent: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  recipientName: {
    fontFamily: 'Arial',
    fontSize: 46,
    color: '#333333',
    marginBottom: 4,
    lineHeight: 52,
  },
  addressText: {
    fontFamily: 'Arial',
    fontSize: 46,
    color: '#333333',
    lineHeight: 52,
  },
  footerContainer: {
    width: '100%',
    marginTop: 12,
  },
  disclaimerText: {
    fontSize: 16,
    lineHeight: 24,
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  controls: {
    width: '100%',
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#2c5a68',
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  submitButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 24,
  },
  statusContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  successContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.5)',
  },
  statusText: {
    marginLeft: 10,
    fontSize: 14,
    textAlign: 'center',
    flex: 1,
    color: 'white',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 14,
    textAlign: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#0a7ea4',
    marginRight: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  checkboxContainer: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  checkboxLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: 'white',
    flexShrink: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: '#1D3D47',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#0a7ea4',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 24,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  privacyLink: {
    color: '#0a7ea4',
    textDecorationLine: 'underline',
  },
  refundInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: 'white',
  },
}); 