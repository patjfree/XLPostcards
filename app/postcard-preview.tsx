import { useState, useEffect } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Share, Platform, ActivityIndicator, Linking, ScrollView, Dimensions, Modal, TextInput, Alert, GestureResponderEvent, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import ViewShot from 'react-native-view-shot';
import { useRef } from 'react';
import Constants from 'expo-constants';
import { useStripe } from '@stripe/stripe-react-native';
import '../config'; // <-- Import config to ensure it's loaded

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AIDisclaimer from './components/AIDisclaimer';
import { iapManager, PostcardPurchase, Purchase } from '@/utils/iapManager';
import { postcardService } from '@/utils/postcardService';
import { stripeManager } from '@/utils/stripeManager';

// Postcard dimensions at 300 DPI (landscape 9x6)
const POSTCARD_WIDTH = 2772;
const POSTCARD_HEIGHT = 1872;
const POSTCARD_ASPECT_RATIO = POSTCARD_HEIGHT / POSTCARD_WIDTH;

// Define interface for ViewShot methods
interface ViewShotMethods {
  capture: () => Promise<string>;
}

console.log('[XLPOSTCARDS][PREVIEW] App started. Environment check:');
console.log('[XLPOSTCARDS][PREVIEW] - stannpApiKey available:', !!Constants.expoConfig?.extra?.stannpApiKey);
if (!Constants.expoConfig?.extra?.stannpApiKey) {
  console.warn('[XLPOSTCARDS][PREVIEW] WARNING: Stannp API key is missing!');
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
      { 
        compress: 1, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
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
  const stripe = useStripe();
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
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const postcardPriceDollars = Constants.expoConfig?.extra?.postcardPriceDollars || 1.99;
  
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
  
  // Function to handle the Stannp API call
  const sendToStannp = async (postcardPurchase: Purchase) => {
    try {
      console.log('[XLPOSTCARDS][STANNP] ====== STARTING STANNP API CALL ======');
      console.log('[XLPOSTCARDS][STANNP] Platform:', Platform.OS);
      console.log('[XLPOSTCARDS][STANNP] Purchase details:', JSON.stringify(postcardPurchase, null, 2));
      
      // Ensure we have a transaction ID
      if (!postcardPurchase.transactionId) {
        console.error('[XLPOSTCARDS][STANNP] No transaction ID received');
        throw new Error('No transaction ID received from purchase');
      }

      // Get API key
      const apiKey = Constants.expoConfig?.extra?.stannpApiKey;
      console.log('[XLPOSTCARDS][STANNP] API key available:', !!apiKey);
      
      if (!apiKey) {
        console.error('[XLPOSTCARDS][STANNP] API key is missing!');
        throw new Error('Stannp API key not found. Please check your .env file and app.config.js.');
      }

      // Check if this transaction has already been processed
      console.log('[XLPOSTCARDS][STANNP] Checking transaction status:', postcardPurchase.transactionId);
      const existingStatus = await postcardService.checkTransactionStatus(postcardPurchase.transactionId);
      console.log('[XLPOSTCARDS][STANNP] Transaction status:', existingStatus);
      
      if (existingStatus === 'completed') {
        console.error('[XLPOSTCARDS][STANNP] Transaction already completed');
        throw new Error('This postcard has already been sent');
      }
      if (existingStatus === 'pending') {
        console.error('[XLPOSTCARDS][STANNP] Transaction is pending');
        throw new Error('This postcard is currently being processed');
      }

      // Create a new transaction record
      console.log('[XLPOSTCARDS][STANNP] Creating transaction record');
      await postcardService.createTransaction(postcardPurchase.transactionId);

      // Step 1: Capture images at full resolution
      console.log('[XLPOSTCARDS][STANNP] Capturing front and back images');
      
      if (!viewShotFrontRef.current || !viewShotBackRef.current) {
        console.error('[XLPOSTCARDS][STANNP] ViewShot refs not initialized');
        throw new Error('ViewShot refs not initialized');
      }

      const frontOriginalUri = await viewShotFrontRef.current.capture();
      const backOriginalUri = await viewShotBackRef.current.capture();
      console.log('[XLPOSTCARDS][STANNP] Images captured successfully');
      console.log('[XLPOSTCARDS][STANNP] Front image URI:', frontOriginalUri);
      console.log('[XLPOSTCARDS][STANNP] Back image URI:', backOriginalUri);
      
      setIsCapturing(false);  // Reset capturing mode after snapshots
      
      // Step 2: Scale images to required dimensions
      console.log('[XLPOSTCARDS][STANNP] Scaling images');
      const frontUri = await scaleImage(frontOriginalUri);
      const backUri = await scaleImage(backOriginalUri);
      console.log('[XLPOSTCARDS][STANNP] Images scaled successfully');
      console.log('[XLPOSTCARDS][STANNP] Scaled front URI:', frontUri);
      console.log('[XLPOSTCARDS][STANNP] Scaled back URI:', backUri);

      // Step 3: Create FormData and send to Stannp
      console.log('[XLPOSTCARDS][STANNP] Preparing FormData');
      const formData = new FormData();
      
      // Add test mode flag and size
      const isTestMode = __DEV__ || Constants.expoConfig?.extra?.APP_VARIANT === 'development';
      console.log('[XLPOSTCARDS][STANNP] Using test mode:', isTestMode);
      formData.append('test', isTestMode ? 'true' : 'false');
      formData.append('size', '6x9');
      formData.append('padding', '0');
      
      // Add scaled front and back images
      console.log('[XLPOSTCARDS][STANNP] Adding images to FormData');
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
      console.log('[XLPOSTCARDS][STANNP] Adding recipient data to FormData');
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
      
      formData.append('clearzone', 'true');
      
      // Create authorization header
      const authHeader = 'Basic ' + btoa(`${apiKey}:`);
      
      // Log the complete FormData for debugging
      console.log('[XLPOSTCARDS][STANNP] FormData contents:', {
        test: isTestMode ? 'true' : 'false',
        size: '6x9',
        recipient: {
          firstname: firstName,
          lastname: lastName,
          address1: recipientInfo.addressLine1,
          address2: recipientInfo.addressLine2,
          city: recipientInfo.city,
          state: recipientInfo.state,
          postcode: recipientInfo.zipcode,
          country: 'US'
        },
        frontImage: frontUri,
        backImage: backUri
      });
      
      // Make the API request
      console.log('[XLPOSTCARDS][STANNP] Sending request to Stannp API');
      const response = await fetch('https://api-us1.stannp.com/v1/postcards/create', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      console.log('[XLPOSTCARDS][STANNP] Response received. Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[XLPOSTCARDS][STANNP] Bad response from API:', errorText);
        await postcardService.markTransactionFailed(postcardPurchase.transactionId);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }
      
      const responseText = await response.text();
      console.log('[XLPOSTCARDS][STANNP] Raw API Response:', responseText);
      
      const data = JSON.parse(responseText);
      console.log('[XLPOSTCARDS][STANNP] Parsed API Response:', JSON.stringify(data, null, 2));
      
      if (!data.success) {
        console.error('[XLPOSTCARDS][STANNP] API reported failure:', data.error);
        await postcardService.markTransactionFailed(postcardPurchase.transactionId);
        throw new Error(data.error || 'Failed to send postcard');
      }
      
      // Mark transaction as completed
      console.log('[XLPOSTCARDS][STANNP] Marking transaction as complete');
      await postcardService.markTransactionComplete(postcardPurchase.transactionId);
      
      // Extract PDF preview URL
      const pdfUrl = data.data.pdf || data.data.pdf_url;
      console.log('[XLPOSTCARDS][STANNP] PDF URL received:', pdfUrl);
      
      // Success case - update all states in one batch
      console.log('[XLPOSTCARDS][STANNP] Updating UI states for success');
      const updates = async () => {
        setStannpAttempts(0);
        setSendResult({
          success: true,
          message: `Your postcard will be printed and sent by First Class mail within 1 business day. It should arrive in 3-7 days.`,
          pdfUrl: pdfUrl
        });
        console.log('[XLPOSTCARDS][STANNP] Showing success modal now');
        setShowSuccessModal(true);
        setSending(false);
        setIsCapturing(false);
      };
      await updates();
      console.log('[XLPOSTCARDS][STANNP] ====== STANNP API CALL COMPLETED SUCCESSFULLY ======');
    } catch (error) {
      console.error('[XLPOSTCARDS][STANNP] ====== ERROR IN STANNP API CALL ======');
      console.error('[XLPOSTCARDS][STANNP] Error details:', error);
      throw error;  // Re-throw to be handled by the calling function
    }
  };

  // Helper to reset all purchase-related state
  const resetPurchaseState = () => {
    console.log('[XLPOSTCARDS][RESET] Starting state reset');
    setLastPurchase(null);
    setSendResult(null);
    setStannpAttempts(0);
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setShowRefundModal(false);
    setShowRefundSuccessModal(false);
    setSending(false);
    setIsCapturing(false);
    console.log('[XLPOSTCARDS][RESET] State reset complete');
  };

  const handleNavigation = () => {
    console.log('[XLPOSTCARDS][NAV] Attempting navigation to index');
    try {
      router.replace('/');
      console.log('[XLPOSTCARDS][NAV] Navigation command executed');
    } catch (error) {
      console.error('[XLPOSTCARDS][NAV] Navigation failed:', error);
    }
  };

  // Success Modal Component
  const SuccessModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showSuccessModal}
      onRequestClose={() => {
        console.log('[XLPOSTCARDS][SUCCESS_MODAL] onRequestClose called');
        resetPurchaseState();
        handleNavigation();
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ThemedText style={styles.modalTitle}>Success!</ThemedText>
          <ThemedText style={styles.modalText}>
            Your postcard will be printed and sent by First Class mail within 1 business day. It should arrive in 3-7 days.
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
              console.log('[XLPOSTCARDS][SUCCESS_MODAL] OK button pressed');
              resetPurchaseState();
              handleNavigation();
            }}
          >
            <ThemedText style={styles.modalButtonText}>OK</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Update the fallback navigation effect
  useEffect(() => {
    console.log('[XLPOSTCARDS][NAV_DEBUG] Navigation effect triggered:', {
      showSuccessModal,
      hasSuccessResult: !!sendResult?.success
    });
    
    if (!showSuccessModal && sendResult?.success) {
      console.log('[XLPOSTCARDS][FALLBACK_NAV] Success modal closed, forcing navigation to index');
      handleNavigation();
    }
  }, [showSuccessModal, sendResult?.success]);

  // Function to start a new purchase flow
  const startNewPurchaseFlow = async () => {
    try {
      console.log('[XLPOSTCARDS][CONTINUE] Continue button pressed');
      setSending(true);
      setSendResult(null);
      setIsCapturing(true);

      // Start the purchase flow
      console.log('[XLPOSTCARDS][CONTINUE] Starting purchase flow');
      let purchase;
      if (Platform.OS === 'ios') {
        // Use Stripe Payment Sheet
        purchase = await iapManager.purchasePostcard(stripe);
      } else {
        purchase = await iapManager.purchasePostcard();
      }
      console.log('[XLPOSTCARDS][CONTINUE] Purchase result:', purchase);
      
      // Check if purchase is valid
      if (!purchase) {
        console.error('[XLPOSTCARDS][CONTINUE] Invalid purchase received');
        throw new Error('Invalid purchase received');
      }
      
      setLastPurchase(purchase);
      
      // Send to Stannp
      console.log('[XLPOSTCARDS][CONTINUE] Sending to Stannp');
      await sendToStannp(purchase);
      console.log('[XLPOSTCARDS][CONTINUE] sendToStannp finished');
    } catch (error) {
      console.error('[XLPOSTCARDS][CONTINUE] ERROR in purchase flow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Only show error modal if it's not a successful purchase
      if (errorMessage !== 'Invalid purchase: missing purchase token') {
        setStannpAttempts(prev => prev + 1);
        setShowErrorModal(true);
        setRefundData(prev => ({
          ...prev,
          stannpError: errorMessage,
          transactionId: lastPurchase?.transactionId || ''
        }));
      }
      
      // Reset state
      setLastPurchase(null);
      setSendResult(null);
    } finally {
      setSending(false);
      setIsCapturing(false);
      console.log('[XLPOSTCARDS][CONTINUE] Purchase flow finished');
    }
  };

  // Function to retry with existing purchase
  const retryWithExistingPurchase = async (purchase: Purchase) => {
    try {
      setSending(true);
      setSendResult(null);
      setIsCapturing(true);

      // Send to Stannp using existing purchase
      await sendToStannp(purchase);
      
    } catch (error) {
      console.error('ERROR in retry:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setStannpAttempts(prev => prev + 1);
      setShowErrorModal(true);
      setRefundData(prev => ({
        ...prev,
        stannpError: errorMessage
      }));
    } finally {
      setSending(false);
      setIsCapturing(false);
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
      // Silently handle status check errors
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
  
  const windowHeight = Dimensions.get('window').height;
  const windowWidth = Dimensions.get('window').width;
  const designWidth = 700;
  const designPreviewHeight = designWidth * POSTCARD_ASPECT_RATIO;
  const designFooterHeight = 170;
  const designTotalHeight = designPreviewHeight * 2 + designFooterHeight + 24 + (Platform.OS === 'android' ? 32 : 40);

  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const [containerHeight, setContainerHeight] = useState(windowHeight);

  // Calculate scale to fit both width and height
  const scale = Math.min(
    containerWidth / designWidth,
    containerHeight / designTotalHeight,
    1 // never scale up
  );

  // Error Modal Component
  const ErrorModal = () => {
    const handleTryAgain = () => {
      setShowErrorModal(false);
      if (lastPurchase) {
        void retryWithExistingPurchase(lastPurchase);
      }
    };
    return (
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
                ? "Oops, something went wrong sending your XLPostcards. Please Try Again."
                : "Oops, something went wrong sending your XLPostcards. Let's request your Refund."}
            </ThemedText>
            {stannpAttempts === 1 ? (
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleTryAgain}
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
  };

  // Refund Modal Component
  const RefundModal = () => {
    const [refundForm, setRefundForm] = useState({ name: '', email: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleDismiss = () => {
      setShowRefundModal(false);
      router.replace('/');
    };
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
        await fetch('https://script.google.com/macros/s/AKfycbwgPQTnYaApkceJFVOXh4bru-kT392o1RiDYJc4cp4_9UB9zANAX-XsfDXotu-JFwvJsg/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
        onRequestClose={handleDismiss}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleDismiss}
            >
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
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
      {/* Top SafeAreaView for status bar spacer */}
      <SafeAreaView style={{ backgroundColor: '#22303C' }} />
      <View
        style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
        onLayout={e => {
          setContainerWidth(e.nativeEvent.layout.width);
          setContainerHeight(e.nativeEvent.layout.height);
        }}
      >
        <View
          style={{
            width: designWidth,
            height: designTotalHeight,
            alignItems: 'center',
            justifyContent: 'flex-start',
            transform: [{ scale }],
          }}
        >
          {/* Spacer for status bar/header */}
          <View style={{ height: Platform.OS === 'android' ? 32 : 40, backgroundColor: '#22303C', width: designWidth }} />
          {/* Front of postcard */}
          <ViewShot
            ref={viewShotFrontRef}
            style={[styles.postcardPreviewContainer, { width: designWidth, height: designPreviewHeight }]}
            options={{
              width: POSTCARD_WIDTH,
              height: POSTCARD_HEIGHT,
              quality: 1,
              format: "jpg"
            }}
          >
            <View style={{
              width: POSTCARD_WIDTH,
              height: POSTCARD_HEIGHT,
              transform: [{ scale: designWidth / POSTCARD_WIDTH }],
              transformOrigin: 'top left',
              backgroundColor: 'white',
              overflow: 'hidden',
            }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: POSTCARD_WIDTH, height: POSTCARD_HEIGHT, resizeMode: 'cover' }}
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
                    Failed to load image.{"\n"}Please go back and try again.
                  </ThemedText>
                </View>
              )}
            </View>
          </ViewShot>
          {/* Back of postcard */}
          <ViewShot
            ref={viewShotBackRef}
            style={[styles.postcardPreviewContainer, styles.marginTop, { width: designWidth, height: designPreviewHeight }]}
            options={{
              width: POSTCARD_WIDTH,
              height: POSTCARD_HEIGHT,
              quality: 1,
              format: "jpg",
              fileName: "postcard-back"
            }}
          >
            <View style={{
              width: POSTCARD_WIDTH,
              height: POSTCARD_HEIGHT,
              transform: [{ scale: designWidth / POSTCARD_WIDTH }],
              transformOrigin: 'top left',
              backgroundColor: 'white',
              overflow: 'hidden',
            }}>
              <Image
                source={require('@/assets/images/PostcardBackTemplate.jpg')}
                style={{ width: POSTCARD_WIDTH, height: POSTCARD_HEIGHT, position: 'absolute', top: 0, left: 0, resizeMode: 'cover' }}
              />
              {/* Message Box (reasonable default: left half) */}
              <View style={{
                position: 'absolute',
                top: 180,
                left: 120,
                width: 1200,
                height: 1500,
                padding: 40,
                backgroundColor: 'transparent',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              }}>
                <ThemedText style={{ fontFamily: 'Arial', fontSize: 60, color: '#333', lineHeight: 80 }}>
                  {message}
                </ThemedText>
              </View>
              {/* Address Box (lowered further) */}
              <View style={{
                position: 'absolute',
                top: POSTCARD_HEIGHT - 600,
                left: 1700,
                width: 900,
                height: 500,
                padding: 0,
                backgroundColor: 'transparent',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
              }}>
                <ThemedText style={{ fontFamily: 'Arial', fontSize: 54, color: '#333', marginBottom: 10, lineHeight: 64 }}>
                  {recipientInfo.to}
                </ThemedText>
                <ThemedText style={{ fontFamily: 'Arial', fontSize: 54, color: '#333', lineHeight: 64 }}>
                  {recipientInfo.addressLine1}
                  {recipientInfo.addressLine2 ? `\n${recipientInfo.addressLine2}` : ''}
                  {`\n${recipientInfo.city}, ${recipientInfo.state} ${recipientInfo.zipcode}`}
                </ThemedText>
              </View>
            </View>
          </ViewShot>
          {/* Footer content */}
          <View style={[styles.footerContainer, { height: designFooterHeight, justifyContent: 'flex-end', width: designWidth, alignSelf: 'center' }]}> 
            {/* Disclaimer Text */}
            <ThemedText style={styles.disclaimerText}>
              By clicking the Continue button, I confirm the postcard preview is accurate and agree to print as shown. No further changes can be made.
            </ThemedText>
            {/* Controls */}
            <View style={styles.controls}>
              <View style={[styles.buttonRow, { justifyContent: 'center' }]}> 
                {!sendResult?.success ? (
                  <TouchableOpacity
                    style={[styles.submitButton, { alignSelf: 'center', minWidth: 240, maxWidth: 400 }]}
                    onPress={() => void startNewPurchaseFlow()}
                    disabled={sending}
                  >
                    <ThemedText style={styles.buttonText}>Continue & Pay ${postcardPriceDollars.toFixed(2)}</ThemedText>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </View>
      {/* Status indicators remain outside main layout */}
      {sending && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color="#A1CEDC" />
          <ThemedText style={styles.statusText}>Sending XLPostcards...</ThemedText>
        </View>
      )}
      {/* Add the new modals */}
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
    backgroundColor: '#22303C',
  },
  postcardPreviewContainer: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent'
  },
  postcardContainer: {
    width: POSTCARD_WIDTH,
    height: POSTCARD_HEIGHT,
    backgroundColor: 'transparent',
    position: 'relative'
  },
  marginTop: {
    marginTop: 20,
  },
  postcardFront: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
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
    backgroundColor: '#f28914',
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
    fontSize: 22,
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
    backgroundColor: '#f28914',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 22,
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
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: 8,
    zIndex: 1,
  },
}); 