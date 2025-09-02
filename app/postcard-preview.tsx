import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Share, Platform, ActivityIndicator, Linking, ScrollView, Dimensions, Modal, TextInput, Alert, GestureResponderEvent, SafeAreaView, Text, Keyboard } from 'react-native';
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
import { getPrintPixels, getFrontBleedPixels } from '@/utils/printSpecs';

import AIDisclaimer from './components/AIDisclaimer';
import { iapManager, PostcardPurchase, Purchase } from '@/utils/iapManager';
import { postcardService } from '@/utils/postcardService';
import { stripeManager } from '@/utils/stripeManager';
import PostcardBackLayout from './components/PostcardBackLayout';
import { generateCompletePostcard } from '@/utils/postcardGenerator';
import { generateCompletePostcardServer } from '@/utils/serverPostcardGenerator';

// Postcard dimensions at 300 DPI - will be dynamically set based on size

// Get dimensions for front image with bleed extension

// Default to XL for backwards compatibility
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
const scaleImage = async (imageUri: string, postcardSize: 'regular' | 'xl'): Promise<string> => {
  try {
    const dimensions = getPrintPixels(postcardSize);
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: dimensions.width, height: dimensions.height } }],
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

interface RecipientInfo {
  to: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  id?: string;
}

interface NavigationParams {
  resetModals: string;
  imageUri: string;
  message: string;
  recipient?: string;
  selectedRecipientId?: string;
  postcardSize: string;
  [key: string]: string | undefined;  // Add index signature to match UnknownInputParams
}

export default function PostcardPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const viewShotFrontRef = useRef<ViewShot & ViewShotMethods>(null);
  const viewShotBackRef = useRef<ViewShot & ViewShotMethods>(null);
  const postcardBackLayoutRef = useRef<View>(null);
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
  const [showTestModal, setShowTestModal] = useState(true);
  const [postcardSize, setPostcardSize] = useState<'regular' | 'xl'>(params.postcardSize === 'regular' ? 'regular' : 'xl');
  
  // Get data from route params
  const imageUri = params.imageUri as string;
  const message = params.message as string;
  const returnAddress = params.returnAddress as string;
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | undefined>(undefined);
  
  // Add a new state to hold the last error message
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [stannpConfirmed, setStannpConfirmed] = useState<boolean>(false);
  
  // Update the initial params effect
  useEffect(() => {
    console.log('[XLPOSTCARDS][PREVIEW] Initial params:', {
      imageUri,
      message,
      recipientInfo,
      selectedRecipientId,
      allParams: params
    });

    // Parse recipient info from params
    if (params.recipient) {
      try {
        const parsedRecipient = JSON.parse(params.recipient as string);
        console.log('[XLPOSTCARDS][PREVIEW] Parsed recipient info:', parsedRecipient);
        if (parsedRecipient && typeof parsedRecipient === 'object') {
          setRecipientInfo(parsedRecipient);
          // If the recipient has an ID, set it
          if (parsedRecipient.id) {
            setSelectedRecipientId(parsedRecipient.id);
          }
        } else {
          console.warn('[XLPOSTCARDS][PREVIEW] Invalid recipient data format');
        }
      } catch (error) {
        console.error('[XLPOSTCARDS][PREVIEW] Error parsing recipient info:', error);
      }
    }

    // Verify the image exists
    const checkImage = async () => {
      try {
        const imageInfo = await FileSystem.getInfoAsync(imageUri);
        console.log('[XLPOSTCARDS][PREVIEW] Image exists:', imageInfo.exists, 'Image info:', imageInfo);
        
        if (!imageInfo.exists) {
          setImageLoadError(true);
          console.error('[XLPOSTCARDS][PREVIEW] Image file does not exist at path:', imageUri);
        }
      } catch (error) {
        console.error('[XLPOSTCARDS][PREVIEW] Error checking image:', error);
        setImageLoadError(true);
      }
    };

    void checkImage();
  }, []); // Empty dependency array since this is initialization
  
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
      
      // Capture both front and back images with iOS-safe settings and fallback
      let frontUri, backUri;
      
      try {
        frontUri = await viewShotFrontRef.current.capture({
          format: 'jpg',
          quality: 0.9,
          result: 'tmpfile',
          ...(Platform.OS === 'ios' && { afterScreenUpdates: true })
        });
      } catch (error) {
        console.log('[XLPOSTCARDS][SAVE] Front capture failed, trying fallback');
        frontUri = await viewShotFrontRef.current.capture({
          format: 'jpg',
          quality: 0.8,
          result: 'base64'
        });
        if (frontUri.startsWith('data:')) {
          const base64Data = frontUri.split(',')[1];
          const filename = `${FileSystem.cacheDirectory}save_front_${Date.now()}.jpg`;
          await FileSystem.writeAsStringAsync(filename, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          frontUri = filename;
        }
      }
      
      try {
        backUri = await viewShotBackRef.current.capture({
          format: 'jpg',
          quality: 0.9,
          result: 'tmpfile',
          ...(Platform.OS === 'ios' && { 
            afterScreenUpdates: true,
            snapshotContentContainer: false
          })
        });
      } catch (error) {
        console.log('[XLPOSTCARDS][SAVE] Back capture failed, trying fallback');
        backUri = await viewShotBackRef.current.capture({
          format: 'jpg',
          quality: 0.8,
          result: 'base64'
        });
        if (backUri.startsWith('data:')) {
          const base64Data = backUri.split(',')[1];
          const filename = `${FileSystem.cacheDirectory}save_back_${Date.now()}.jpg`;
          await FileSystem.writeAsStringAsync(filename, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          backUri = filename;
        }
      }
      
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
  
  // Function to handle Railway API call (includes Stannp submission)
  const sendToRailway = async (postcardPurchase: Purchase) => {
    const railwayStartTime = Date.now();
    console.log('[XLPOSTCARDS][RAILWAY] ========= ENTERING RAILWAY FLOW =========');
    console.log('[XLPOSTCARDS][RAILWAY] Transaction ID:', postcardPurchase.transactionId);
    
    try {
      // Ensure we have a transaction ID
      if (!postcardPurchase.transactionId) {
        throw new Error('No transaction ID received from purchase');
      }

      // Check transaction status
      const existingStatus = await postcardService.checkTransactionStatus(postcardPurchase.transactionId);
      if (existingStatus === 'completed') {
        throw new Error('This postcard has already been sent');
      }
      if (existingStatus === 'pending') {
        throw new Error('This postcard is currently being processed');
      }

      // Create transaction record
      await postcardService.createTransaction(postcardPurchase.transactionId);

      // Step 1: Generate complete postcard via Railway (includes Stannp submission)
      console.log('[XLPOSTCARDS][RAILWAY] Calling Railway complete flow...');
      const result = await generateCompletePostcardServer(
        params.imageUri as string,
        message,
        recipientInfo || { to: '', addressLine1: '', city: '', state: '', zipcode: '' },
        postcardSize,
        postcardPurchase.transactionId,
        returnAddress
      );

      console.log('[XLPOSTCARDS][RAILWAY] Railway flow completed successfully');
      
      // Step 2: Confirm payment with Railway  
      console.log('[XLPOSTCARDS][RAILWAY] Confirming payment with Railway...');
      const paymentResponse = await fetch('https://postcardservice-production.up.railway.app/payment-confirmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: postcardPurchase.transactionId,
          stripePaymentIntentId: postcardPurchase.paymentIntentId || 'mobile-payment',
          userEmail: '' // TODO: Get from settings
        })
      });
      
      if (!paymentResponse.ok) {
        throw new Error(`Payment confirmation failed: ${paymentResponse.status}`);
      }
      
      // Step 3: Submit to Stannp via Railway
      console.log('[XLPOSTCARDS][RAILWAY] Submitting to Stannp via Railway...');
      const stannpResponse = await fetch('https://postcardservice-production.up.railway.app/submit-to-stannp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: postcardPurchase.transactionId
        })
      });
      
      if (!stannpResponse.ok) {
        const errorText = await stannpResponse.text();
        throw new Error(`Stannp submission failed: ${stannpResponse.status} - ${errorText}`);
      }
      
      const stannpResult = await stannpResponse.json();
      console.log('[XLPOSTCARDS][RAILWAY] Stannp submission successful:', stannpResult);
      
      // Set the confirmation flag
      setStannpConfirmed(true);
      
      // Mark transaction as completed
      await postcardService.markTransactionComplete(postcardPurchase.transactionId);
      
      // Success - update UI states
      setStannpAttempts(0);
      setSendResult({
        success: true,
        message: `Your postcard will be printed and sent by First Class mail within 1 business day. It should arrive in 3-7 days.`,
      });
      
      if (stannpConfirmed) {
        console.log('[XLPOSTCARDS][RAILWAY] Showing success modal after Railway confirmation');
        showOnlyModal('success');
      }
      
      setSending(false);
      setIsCapturing(false);

      const railwayEndTime = Date.now();
      const totalDuration = railwayEndTime - railwayStartTime;
      console.log('[XLPOSTCARDS][RAILWAY] ========= RAILWAY FLOW COMPLETED SUCCESSFULLY =========');
      console.log('[XLPOSTCARDS][RAILWAY] Total duration:', totalDuration, 'ms');
      
    } catch (error) {
      const railwayErrorTime = Date.now();
      const totalDuration = railwayErrorTime - railwayStartTime;
      
      console.error('[XLPOSTCARDS][RAILWAY] ========= RAILWAY FLOW FAILED =========');
      console.error('[XLPOSTCARDS][RAILWAY] Duration before failure:', totalDuration, 'ms');
      console.error('[XLPOSTCARDS][RAILWAY] Error details:', error);
      
      const err = error as Error;
      setLastErrorMessage(err.message);
      throw error;
    }
  };

  // Update the critical states logging effect
  useEffect(() => {
    console.log('[XLPOSTCARDS][PREVIEW] Critical states:', {
      sending,
      isCapturing,
      showSuccessModal,
      showErrorModal,
      showRefundModal,
      showRefundSuccessModal
    });
  }, [sending, isCapturing, showSuccessModal, showErrorModal, showRefundModal, showRefundSuccessModal]);

  // Update the navigation effect
  useEffect(() => {
    console.log('[XLPOSTCARDS][PREVIEW] Screen mounted');
    return () => {
      console.log('[XLPOSTCARDS][PREVIEW] Screen unmounting');
    };
  }, []); // Empty dependency array since this is mount/unmount logging

  // Fix resetPurchaseState so it doesn't show refund modal after success
  const resetPurchaseState = () => {
    console.log('[XLPOSTCARDS][PREVIEW] Starting state reset');
    setLastPurchase(null);
    setSendResult(null);
    setStannpAttempts(0);
    setStannpConfirmed(false);
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setShowRefundModal(false);
    setShowRefundSuccessModal(false);
    setSending(false);
    setIsCapturing(false);
    console.log('[XLPOSTCARDS][PREVIEW] State reset complete');
  };

  const handleNavigation = React.useCallback(() => {
    console.log('[XLPOSTCARDS][PREVIEW] About to navigate. recipientInfo:', recipientInfo, 'selectedRecipientId:', selectedRecipientId);
    console.log('[XLPOSTCARDS][PREVIEW] Attempting navigation to index');
    console.log('[XLPOSTCARDS][PREVIEW] Current recipient info:', recipientInfo);
    console.log('[XLPOSTCARDS][PREVIEW] Selected recipient ID:', selectedRecipientId);
    console.log('[XLPOSTCARDS][PREVIEW] All params:', params);
    try {
      // Reset state before navigation
      resetPurchaseState();
      // Add a longer delay to ensure state is reset before navigation
      setTimeout(() => {
        const navParams: NavigationParams = { 
          resetModals: 'true', 
          imageUri, 
          message,
          postcardSize,
        };
        if (recipientInfo) {
          navParams.recipient = JSON.stringify({
            ...recipientInfo,
            id: selectedRecipientId || recipientInfo.id
          });
          navParams.selectedRecipientId = selectedRecipientId || recipientInfo.id;
        }
        console.log('[XLPOSTCARDS][PREVIEW] Navigation params:', navParams);
        router.replace({
          pathname: '/',
          params: navParams
        });
        console.log('[XLPOSTCARDS][PREVIEW] Navigation command executed');
      }, 700); // Increased delay to 700ms
    } catch (error) {
      console.error('[XLPOSTCARDS][PREVIEW] Navigation failed:', error);
    }
  }, [imageUri, message, recipientInfo, selectedRecipientId, router]);

  // Update the back button press handler
  const handleBackPress = React.useCallback(() => {
    console.log('[XLPOSTCARDS][PREVIEW] Back button pressed');
    console.log('[XLPOSTCARDS][PREVIEW] Current recipient info:', recipientInfo);
    console.log('[XLPOSTCARDS][PREVIEW] Selected recipient ID:', selectedRecipientId);
    console.log('[XLPOSTCARDS][PREVIEW] All params:', params);
    
    const navParams: NavigationParams = { 
      imageUri, 
      message, 
      resetModals: 'true',
      postcardSize,
    };
    if (recipientInfo) {
      navParams.recipient = JSON.stringify({
        ...recipientInfo,
        id: selectedRecipientId || recipientInfo.id
      });
      navParams.selectedRecipientId = selectedRecipientId || recipientInfo.id;
    }
    
    console.log('[XLPOSTCARDS][PREVIEW] Navigating back to index with params:', navParams);
    router.replace({ 
      pathname: '/', 
      params: navParams
    });
  }, [imageUri, message, recipientInfo, selectedRecipientId, router, params]);

  // Helper to show only one modal at a time
  const showOnlyModal = React.useCallback((modal: 'success' | 'error' | 'refund' | 'refundSuccess') => {
    setShowSuccessModal(modal === 'success');
    setShowErrorModal(modal === 'error');
    setShowRefundModal(modal === 'refund');
    setShowRefundSuccessModal(modal === 'refundSuccess');
  }, []);

  // Function to retry with existing purchase
  const retryWithExistingPurchase = React.useCallback(async (purchase: Purchase) => {
    try {
      setSending(true);
      setSendResult(null);
      setIsCapturing(true);

      // Send to Railway using existing purchase (Railway handles Stannp)
      await sendToRailway(purchase);
      
    } catch (error) {
      console.error('ERROR in retry:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      showOnlyModal('error');
      setStannpAttempts(prev => prev + 1);
      setRefundData(prev => ({
        ...prev,
        stannpError: errorMessage
      }));
    } finally {
      setSending(false);
      setIsCapturing(false);
    }
  }, [showOnlyModal]);

  // Update SuccessOverlay with full message and better centering
  const SuccessOverlay = React.useCallback(() => {
    if (!showSuccessModal) return null;
    return (
      <View style={styles.successOverlay} pointerEvents="auto">
        <View style={styles.successContent}>
          <View style={{ width: '100%', height: 12, backgroundColor: '#fff' }} />
          <Text style={styles.successTitle}>Success!</Text>
          <Text style={styles.successMessage}>
            Your postcard was successfully created. It will be printed within 1 business day and should be received within 3-7 days.
          </Text>
          <TouchableOpacity 
            style={styles.successButton}
            onPress={() => {
              console.log('[XLPOSTCARDS][PREVIEW] Success modal OK button pressed - closing modal and navigating');
              // Close modal and navigate directly
              setShowSuccessModal(false);
              // Navigate back to main screen immediately
              handleNavigation();
            }}
          >
            <Text style={styles.successButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [showSuccessModal, handleNavigation]);

  // Note: Navigation is now handled directly in the OK button press
  // Removed automatic navigation useEffect to ensure modal stays open until user clicks OK

  // Update the fallback effect for success modal
  useEffect(() => {
    if (sendResult?.success && !showSuccessModal && stannpConfirmed) {
      console.log('[XLPOSTCARDS][PREVIEW][FALLBACK] ========= FALLBACK SUCCESS MODAL TRIGGER =========');
      console.log('[XLPOSTCARDS][PREVIEW][FALLBACK] This should only happen if Stannp API returned success: true');
      console.log('[XLPOSTCARDS][PREVIEW][FALLBACK] sendResult:', sendResult);
      console.log('[XLPOSTCARDS][PREVIEW][FALLBACK] stannpConfirmed:', stannpConfirmed);
      showOnlyModal('success');
    } else if (sendResult?.success && !showSuccessModal && !stannpConfirmed) {
      console.error('[XLPOSTCARDS][PREVIEW][FALLBACK] ========= BLOCKING SUCCESS MODAL: NO STANNP CONFIRMATION =========');
      console.error('[XLPOSTCARDS][PREVIEW][FALLBACK] sendResult.success is true but stannpConfirmed is false');
    }
  }, [sendResult?.success, showSuccessModal, stannpConfirmed, showOnlyModal]);

  // Function to start a new purchase flow
  const startNewPurchaseFlow = async () => {
    try {
      console.log('[XLPOSTCARDS][PREVIEW] Continue button pressed');
      setSending(true);
      setSendResult(null);
      setStannpConfirmed(false);
      setIsCapturing(true);

      // Start the purchase flow
      console.log('[XLPOSTCARDS][PREVIEW] Starting purchase flow');
      let purchase;
      
      if (Platform.OS === 'ios') {
        // Use Stripe Payment Sheet for iOS
        try {
          const isDev = Constants.expoConfig?.extra?.APP_VARIANT === 'development';
          const stripeKey = Constants.expoConfig?.extra?.stripePublishableKey;
          
          console.log('[XLPOSTCARDS][PREVIEW] Stripe Payment Details:', {
            isDev,
            hasStripeKey: !!stripeKey,
            keyLength: stripeKey?.length,
            hasStripeInstance: !!stripe
          });

          if (!stripeKey) {
            throw new Error('Stripe configuration is missing. Please check your environment variables.');
          }

          if (!stripe) {
            throw new Error('Stripe is not properly initialized. Please check your configuration.');
          }

          purchase = await iapManager.purchasePostcard(stripe);
        } catch (error) {
          const stripeError = error as Error;
          console.error('[XLPOSTCARDS][PREVIEW] Stripe error details:', {
            error: stripeError,
            message: stripeError.message,
            stack: stripeError.stack
          });
          throw new Error('Payment failed. Please try again or contact support if the issue persists.');
        }
      } else if (Platform.OS === 'android') {
        // Use Google Pay for Android
        try {
          purchase = await iapManager.purchasePostcard();
        } catch (googlePayError) {
          console.error('[XLPOSTCARDS][PREVIEW] Google Pay error:', googlePayError);
          throw new Error('Google Pay failed. Please try again or contact support if the issue persists.');
        }
      }
      
      console.log('[XLPOSTCARDS][PREVIEW] Purchase result:', purchase);
      
      // Check if purchase is valid
      if (!purchase) {
        console.error('[XLPOSTCARDS][PREVIEW] Invalid purchase received');
        throw new Error('Invalid purchase received');
      }
      
      setLastPurchase(purchase);
      
      // Critical: Add memory management and UI cleanup before Stannp call
      console.log('[XLPOSTCARDS][PREVIEW] ========= PAYMENT SUCCESSFUL - STARTING STANNP PREPARATION =========');
      console.log('[XLPOSTCARDS][PREVIEW] Purchase object:', JSON.stringify(purchase, null, 2));
      console.log('[XLPOSTCARDS][PREVIEW] Device info:', {
        platform: Platform.OS,
        version: Platform.Version,
        memoryUsage: Platform.constants?.systemVersion,
        timestamp: new Date().toISOString()
      });
      
      console.log('[XLPOSTCARDS][PREVIEW] Starting memory cleanup...');
      // Force garbage collection hint (iOS memory management)
      if (global.gc) {
        console.log('[XLPOSTCARDS][PREVIEW] Calling global.gc()');
        global.gc();
        console.log('[XLPOSTCARDS][PREVIEW] global.gc() completed');
      } else {
        console.log('[XLPOSTCARDS][PREVIEW] global.gc() not available');
      }
      
      console.log('[XLPOSTCARDS][PREVIEW] Dismissing keyboard...');
      // Dismiss any active keyboards/modals that might interfere
      Keyboard.dismiss();
      console.log('[XLPOSTCARDS][PREVIEW] Keyboard dismissed');
      
      console.log('[XLPOSTCARDS][PREVIEW] Starting UI stabilization delay...');
      // Small delay to ensure UI state is stable before heavy operations
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[XLPOSTCARDS][PREVIEW] UI stabilization completed');
      
      console.log('[XLPOSTCARDS][PREVIEW] ========= UI STATE STABILIZED - CALLING STANNP API =========');
      
      // Send to Stannp with timeout protection and comprehensive logging
      console.log('[XLPOSTCARDS][PREVIEW] Creating timeout protection (60 seconds)...');
      const stannpTimeout = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          console.error('[XLPOSTCARDS][PREVIEW] ========= STANNP API TIMEOUT - 60 SECONDS EXCEEDED =========');
          reject(new Error('Stannp API call timed out after 60 seconds'));
        }, 60000);
        return timeoutId;
      });
      
      console.log('[XLPOSTCARDS][PREVIEW] Starting Promise.race with sendToStannp and timeout...');
      const raceStartTime = Date.now();
      
      try {
        await Promise.race([
          sendToRailway(purchase),
          stannpTimeout
        ]);
        
        const raceEndTime = Date.now();
        const duration = raceEndTime - raceStartTime;
        console.log('[XLPOSTCARDS][PREVIEW] ========= STANNP API COMPLETED SUCCESSFULLY =========');
        console.log('[XLPOSTCARDS][PREVIEW] Total duration:', duration, 'ms');
        console.log('[XLPOSTCARDS][PREVIEW] sendToStannp finished successfully');
        
      } catch (error) {
        const raceEndTime = Date.now();
        const duration = raceEndTime - raceStartTime;
        console.error('[XLPOSTCARDS][PREVIEW] ========= STANNP API FAILED =========');
        console.error('[XLPOSTCARDS][PREVIEW] Duration before failure:', duration, 'ms');
        console.error('[XLPOSTCARDS][PREVIEW] Error details:', error);
        throw error; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      const err = error as Error;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setLastErrorMessage(errorMessage);
      console.error('[XLPOSTCARDS][PREVIEW] ERROR in purchase flow:', {
        error: err,
        message: err.message,
        stack: err.stack,
        sendResult,
        lastPurchase,
        showSuccessModal,
        showErrorModal,
        showRefundModal,
        showRefundSuccessModal
      });
      // Show error modal with the specific error message
      showOnlyModal('error');
      setStannpAttempts(prev => prev + 1);
      setRefundData(prev => ({
        ...prev,
        stannpError: errorMessage,
        transactionId: lastPurchase?.transactionId || ''
      }));
      // Reset state
      setLastPurchase(null);
      setSendResult(null);
    } finally {
      setSending(false);
      setIsCapturing(false);
      console.log('[XLPOSTCARDS][PREVIEW] Purchase flow finished');
    }
  };

  const windowHeight = Dimensions.get('window').height;
  const windowWidth = Dimensions.get('window').width;
  const designWidth = 700;
  
  // Get correct dimensions for the current postcard size
  const currentDimensions = getPrintPixels(postcardSize);
  const frontImageDimensions = getFrontBleedPixels(postcardSize);
  const currentAspectRatio = currentDimensions.height / currentDimensions.width;
  const designPreviewHeight = designWidth * currentAspectRatio;
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

  // Set the font size for both 4x6 (regular) and 6x9 (xl) postcards to 50
  const messageFontSize = 50;

  // Error Modal Component
  const ErrorModal = () => {
    const handleTryAgain = () => {
      console.log('[XLPOSTCARDS][PREVIEW] Try again pressed');
      showOnlyModal('error');
      if (lastPurchase) {
        void retryWithExistingPurchase(lastPurchase);
      }
    };
    const handleBackToHome = () => {
      console.log('[XLPOSTCARDS][PREVIEW] Back to Home pressed from ErrorModal');
      showOnlyModal('error');
      resetPurchaseState();
      router.replace({ pathname: '/', params: { imageUri, message, recipient: JSON.stringify(recipientInfo), selectedRecipientId } });
    };
    // Determine if the error was a payment cancellation
    const isPaymentCanceled = lastErrorMessage?.toLowerCase().includes('canceled');
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showErrorModal}
        onRequestClose={handleBackToHome}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Oops!</Text>
            <Text style={styles.modalText}>
              {isPaymentCanceled
                ? 'Payment was canceled. No charge was made. Please try again or return to the home screen.'
                : lastErrorMessage || 'Oops, something went wrong sending your XLPostcards.'}
            </Text>
            {stannpAttempts === 1 && !isPaymentCanceled ? (
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleTryAgain}
              >
                <Text style={styles.modalButtonText}>Try Again</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity 
              style={[styles.modalButton, { marginTop: 12, backgroundColor: '#2c5a68' }]}
              onPress={handleBackToHome}
            >
              <Text style={styles.modalButtonText}>Back to Home</Text>
            </TouchableOpacity>
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
      showOnlyModal('refund');
      router.replace({ pathname: '/', params: { imageUri, message, recipient: JSON.stringify(recipientInfo), selectedRecipientId } });
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
        showOnlyModal('refundSuccess');
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
            <Text style={styles.modalTitle}>Request Refund</Text>
            <Text style={styles.modalText}>
              Please provide your information for the refund request:
            </Text>
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
              <Text style={styles.modalButtonText}>
                {isSubmitting ? 'Submitting...' : 'Request Refund'}
              </Text>
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
        showOnlyModal('refundSuccess');
        router.replace({ pathname: '/', params: { imageUri, message, recipient: JSON.stringify(recipientInfo), selectedRecipientId } });
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Refund Request Received</Text>
          <Text style={styles.modalText}>
            We've received your request for a refund, please give us 2 business days to investigate and complete the transaction.
          </Text>
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={() => {
              showOnlyModal('refundSuccess');
              router.replace({ pathname: '/', params: { imageUri, message, recipient: JSON.stringify(recipientInfo), selectedRecipientId } });
            }}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // In useEffect, restore postcardSize from params if present
  useEffect(() => {
    if (params.postcardSize && (params.postcardSize === 'regular' || params.postcardSize === 'xl')) {
      setPostcardSize(params.postcardSize);
    }
  }, []);

  return (
    <>
      {/* Existing SuccessModal and main content */}
      <SuccessOverlay />
      <View style={styles.container}>
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
                width: currentDimensions.width,
                height: currentDimensions.height,
                quality: 1,
                format: "jpg"
              }}
            >
              <View style={{
                width: currentDimensions.width,
                height: currentDimensions.height,
                transform: [{ scale: designWidth / currentDimensions.width }],
                transformOrigin: 'top left',
                backgroundColor: 'white',
                overflow: 'hidden',
              }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ 
                    width: frontImageDimensions.width, 
                    height: frontImageDimensions.height, 
                    resizeMode: 'cover', 
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: -9,  // Offset to center the larger image
                    left: -9
                  }}
                  onError={(error: ImageErrorEvent) => {
                    console.error('Image loading error:', error?.nativeEvent?.error || 'Unknown error');
                    setImageLoadError(true);
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully');
                    setImageLoadError(false);
                  }}
                />
                {/* Overlay content for front of postcard */}
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none'
                }}>
                  
                </View>
                
                {imageLoadError && (
                  <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>
                      Failed to load image.{"\n"}Please go back and try again.
                    </Text>
                  </View>
                )}
              </View>
            </ViewShot>
            {/* Back of postcard */}
            <ViewShot
              ref={viewShotBackRef}
              style={[styles.postcardPreviewContainer, styles.marginTop, { width: designWidth, height: designPreviewHeight, backgroundColor: '#FFFFFF' }]}
              options={{
                width: currentDimensions.width,
                height: currentDimensions.height,
                quality: 1,
                format: "jpg",
                fileName: "postcard-back"
              }}
            >
              <View 
                ref={postcardBackLayoutRef}
                style={{
                  width: currentDimensions.width,
                  height: currentDimensions.height,
                  transform: [{ scale: designWidth / currentDimensions.width }],
                  transformOrigin: 'top left',
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                }}
                collapsable={false}>
                <PostcardBackLayout
                  width={currentDimensions.width}
                  height={currentDimensions.height}
                  message={message}
                  recipientInfo={recipientInfo || { to: '', addressLine1: '', city: '', state: '', zipcode: '' }}
                  postcardSize={postcardSize}
                  returnAddress={returnAddress}
                />
              </View>
            </ViewShot>
            {/* Footer content */}
            <View style={[styles.footerContainer, { height: designFooterHeight, justifyContent: 'flex-end', width: designWidth, alignSelf: 'center' }]}> 
              {/* Disclaimer Text */}
              <Text style={styles.disclaimerText}>
                By clicking the Continue button, I confirm the postcard preview is accurate and agree to print as shown. No further changes can be made.
              </Text>
              {/* Controls */}
              <View style={styles.controls}>
                <View style={[styles.buttonRow, { justifyContent: 'center', alignItems: 'center' }]}> 
                  {!sendResult?.success ? (
                    <>
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#fff',
                          borderColor: '#f28914',
                          borderWidth: 2,
                          borderRadius: 8,
                          paddingVertical: 16,
                          paddingHorizontal: 20,
                          marginRight: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 56,
                          height: 56,
                          flexDirection: 'row',
                          elevation: 2,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                        }}
                        onPress={handleBackPress}
                        accessibilityLabel="Go back"
                      >
                        <MaterialIcons name="arrow-back" size={28} color="#f28914" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitButton, { alignSelf: 'center', minWidth: 240, maxWidth: 400 }]}
                        onPress={() => void startNewPurchaseFlow()}
                        disabled={sending}
                      >
                        <Text style={styles.buttonText}>
                          Send Your {postcardSize === 'regular' ? '4"x6"' : '6"x9"'} Postcard
                        </Text>
                      </TouchableOpacity>
                    </>
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
            <Text style={styles.statusText}>Sending XLPostcards...</Text>
          </View>
        )}
        {/* Add the new modals */}
        <ErrorModal />
        <RefundModal />
        <RefundSuccessModal />
      </View>
    </>
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
    backgroundColor: 'white' // Ensure white background for postcard rendering
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
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  successContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 300,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    color: '#f28914',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  successMessage: {
    color: '#333',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 26,
  },
  successButton: {
    backgroundColor: '#f28914',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  successButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  backButton: {
    backgroundColor: '#fff',
    borderColor: '#f28914',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    height: 56,
    flexDirection: 'row',
  },
}); 