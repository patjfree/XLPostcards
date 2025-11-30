import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Share, Platform, ActivityIndicator, Linking, ScrollView, Dimensions, Modal, TextInput, Alert, GestureResponderEvent, SafeAreaView, Text, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { postcardService } from '@/utils/postcardService';
import { stripeManager, StripePurchase } from '@/utils/stripeManager';
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
  imageUris?: string;
  templateType?: string;
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
  const [processingPayment, setProcessingPayment] = useState(false);
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
  const [showPromoCodeModal, setShowPromoCodeModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeDiscount, setPromoCodeDiscount] = useState(0);
  const [promoCodeUsedPermanently, setPromoCodeUsedPermanently] = useState(false);
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
  const [lastPurchase, setLastPurchase] = useState<StripePurchase | null>(null);
  const postcardPriceDollars = Constants.expoConfig?.extra?.postcardPriceDollars || 1.99;
  const [showTestModal, setShowTestModal] = useState(true);
  const [postcardSize, setPostcardSize] = useState<'regular' | 'xl'>(params.postcardSize === 'regular' ? 'regular' : 'xl');
  
  // Get data from route params
  const imageUri = params.imageUri as string;
  const message = params.message as string;
  const returnAddress = params.returnAddress as string;
  const railwayBackUrl = params.railwayBackUrl as string;
  const railwayFrontUrl = params.railwayFrontUrl as string;
  const existingTransactionId = params.transactionId as string;
  const imageUris = params.imageUris as string | undefined;
  const templateType = params.templateType as string | undefined;
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | undefined>(undefined);
  
  // Add a new state to hold the last error message
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [stannpConfirmed, setStannpConfirmed] = useState<boolean>(false);
  const [railwayBackImageUrl, setRailwayBackImageUrl] = useState<string | null>(null);
  
  // Check if promo code was already used permanently
  useEffect(() => {
    const checkPromoCodeUsed = async () => {
      try {
        const used = await AsyncStorage.getItem('promo_code_used_permanently');
        if (used === 'true') {
          setPromoCodeUsedPermanently(true);
        }
      } catch (error) {
        console.error('[XLPOSTCARDS][PROMO] Error checking promo code usage:', error);
      }
    };
    checkPromoCodeUsed();
  }, []);

  // Update the initial params effect
  useEffect(() => {
    console.log('[XLPOSTCARDS][PREVIEW] Initial params:', {
      imageUri,
      message,
      recipientInfo,
      selectedRecipientId,
      hasRailwayBackUrl: !!railwayBackUrl,
      hasRailwayFrontUrl: !!railwayFrontUrl,
      hasExistingTransaction: !!existingTransactionId,
      existingTransactionId,
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

    // Set Railway back URL if provided
    if (railwayBackUrl) {
      console.log('[RAILWAY] Using Railway-generated back image URL:', railwayBackUrl);
      setRailwayBackImageUrl(railwayBackUrl);
    }
    
    // Log Railway front URL usage
    if (railwayFrontUrl) {
      console.log('[RAILWAY] Using Railway-generated front image URL:', railwayFrontUrl);
    } else {
      console.log('[RAILWAY] No Railway front URL, using local imageUri:', imageUri);
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
    
    // Only generate Railway preview if not already provided from index screen
    if (!railwayBackUrl) {
      console.log('[XLPOSTCARDS][PREVIEW] No Railway URL provided, generating preview...');
      const generatePreview = async () => {
        try {
          console.log('[XLPOSTCARDS][PREVIEW] Generating Railway preview...');
          const result = await generateCompletePostcardServer(
            imageUri,
            message,
            recipientInfo || { to: '', addressLine1: '', city: '', state: '', zipcode: '' },
            postcardSize,
            `preview-${Date.now()}`,
            returnAddress
          );
          setRailwayBackImageUrl(result.imageUrl);
          console.log('[XLPOSTCARDS][PREVIEW] Railway preview generated:', result.imageUrl);
        } catch (error) {
          console.error('[XLPOSTCARDS][PREVIEW] Failed to generate Railway preview:', error);
        }
      };
      
      // Generate preview after recipient info is parsed
      setTimeout(() => {
        if (imageUri && message) {
          void generatePreview();
        }
      }, 500);
    } else {
      console.log('[XLPOSTCARDS][PREVIEW] Using Railway URL from index screen:', railwayBackUrl);
    }
    
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
      // Note: On Android 10+ (API 29+), saving to MediaStore works without READ permissions
      // via scoped storage. We only need permission on iOS and older Android.
      // On Android 13+ (API 33+), we avoid requesting READ_MEDIA_IMAGES/READ_MEDIA_VIDEO
      // as Google Play restricts these permissions.
      if (Platform.OS === 'ios') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('We need media library permissions to save the postcard');
          setSaving(false);
          return;
        }
      }
      // On Android, we'll try to save directly - it should work on Android 10+
      // If it fails on older Android, we'll catch the error
      
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
  const sendToRailway = async (postcardPurchase: StripePurchase) => {
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

      // Always use the payment transaction ID, but link to existing Railway transaction if available
      if (existingTransactionId) {
        console.log('[XLPOSTCARDS][RAILWAY] Linking payment transaction to existing Railway transaction');
        console.log('[XLPOSTCARDS][RAILWAY] Payment ID:', postcardPurchase.transactionId);
        console.log('[XLPOSTCARDS][RAILWAY] Railway ID:', existingTransactionId);
        
        // Copy existing Railway transaction data to new payment transaction ID
        const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl || 'https://postcardservice-production.up.railway.app';
        const railwayUrl = `${railwayBaseUrl}/transaction-status/${existingTransactionId}`;
        console.log('[DEBUG][COPY] Fetching existing transaction data from:', railwayUrl);
        const statusResponse = await fetch(railwayUrl);
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('[DEBUG][COPY] Retrieved transaction data:', {
            transactionId: statusData.transactionId,
            status: statusData.status,
            dataKeys: Object.keys(statusData.data || {}),
            frontUrl: statusData.data?.frontUrl?.substring(0, 50) + '...',
            backUrl: statusData.data?.backUrl?.substring(0, 50) + '...',
            userEmail: statusData.data?.userEmail,
            message: statusData.data?.message?.substring(0, 30) + '...',
            postcardSize: statusData.data?.postcardSize
          });
          
          // Validate the data before copying
          if (!statusData.data?.frontUrl || !statusData.data?.backUrl) {
            console.error('[DEBUG][COPY] ERROR: Missing image URLs in original transaction');
            console.error('[DEBUG][COPY] frontUrl present:', !!statusData.data?.frontUrl);
            console.error('[DEBUG][COPY] backUrl present:', !!statusData.data?.backUrl);
            throw new Error('Original transaction missing image URLs');
          }
          
          // Create new transaction with payment ID using Railway data
          const copyPayload = {
            message: statusData.data.message,
            recipientInfo: statusData.data.recipientInfo,
            postcardSize: statusData.data.postcardSize,
            returnAddressText: returnAddress,
            transactionId: postcardPurchase.transactionId,
            frontImageUri: statusData.data.frontUrl,
            userEmail: statusData.data.userEmail
          };
          
          console.log('[DEBUG][COPY] Copy payload being sent:', {
            message: copyPayload.message?.substring(0, 30) + '...',
            recipientInfo: copyPayload.recipientInfo,
            postcardSize: copyPayload.postcardSize,
            returnAddressText: copyPayload.returnAddressText?.substring(0, 30) + '...',
            transactionId: copyPayload.transactionId,
            frontImageUri: copyPayload.frontImageUri?.substring(0, 50) + '...',
            userEmail: copyPayload.userEmail
          });
          
          const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl || 'https://postcardservice-production.up.railway.app';
          const copyResponse = await fetch(`${railwayBaseUrl}/generate-complete-postcard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(copyPayload),
          });
          
          if (copyResponse.ok) {
            const copyResult = await copyResponse.json();
            console.log('[DEBUG][COPY] Transaction copied successfully:', {
              success: copyResult.success,
              transactionId: copyResult.transactionId,
              status: copyResult.status,
              frontUrl: copyResult.frontUrl?.substring(0, 50) + '...',
              backUrl: copyResult.backUrl?.substring(0, 50) + '...'
            });
          } else {
            const errorText = await copyResponse.text();
            console.error('[DEBUG][COPY] Copy response error:', copyResponse.status, errorText);
            throw new Error(`Transaction copy failed: ${copyResponse.status} - ${errorText}`);
          }
        } else {
          const errorText = await statusResponse.text();
          console.error('[DEBUG][COPY] Status response error:', statusResponse.status, errorText);
          throw new Error(`Failed to fetch original transaction: ${statusResponse.status} - ${errorText}`);
        }
      } else {
        console.log('[XLPOSTCARDS][RAILWAY] No existing transaction, generating new postcard...');
        const savedUserEmail = await AsyncStorage.getItem('settings_email');
        
        const result = await generateCompletePostcardServer(
          params.imageUri as string,
          message,
          recipientInfo || { to: '', addressLine1: '', city: '', state: '', zipcode: '' },
          postcardSize,
          postcardPurchase.transactionId,
          returnAddress,
          savedUserEmail || ''
        );
        console.log('[XLPOSTCARDS][RAILWAY] Railway generation completed');
      }
      
      // Step 2: Confirm payment with Railway  
      console.log('[XLPOSTCARDS][RAILWAY] Confirming payment with Railway...');
      const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl || 'https://postcardservice-production.up.railway.app';
      const paymentResponse = await fetch(`${railwayBaseUrl}/payment-confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: postcardPurchase.transactionId,
          stripePaymentIntentId: postcardPurchase.paymentIntentId || 'mobile-payment',
          userEmail: ''
        })
      });
      
      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error('[XLPOSTCARDS][RAILWAY] Payment confirmation error:', errorText);
        throw new Error(`Payment confirmation failed: ${paymentResponse.status} - ${errorText}`);
      }
      
      // Step 3: Submit to Stannp via Railway
      console.log('[XLPOSTCARDS][RAILWAY] Submitting to Stannp via Railway...');
      const stannpResponse = await fetch(`${railwayBaseUrl}/submit-to-stannp`, {
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
      processingPayment,
      showSuccessModal,
      showErrorModal,
      showRefundModal,
      showRefundSuccessModal
    });
  }, [sending, isCapturing, processingPayment, showSuccessModal, showErrorModal, showRefundModal, showRefundSuccessModal]);

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
    setProcessingPayment(false);
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
          imageUris,
          templateType,
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
        try {
          router.replace({
            pathname: '/',
            params: navParams
          });
          console.log('[XLPOSTCARDS][PREVIEW] Navigation command executed successfully');
        } catch (navError) {
          console.error('[XLPOSTCARDS][PREVIEW] Navigation router.replace failed:', navError);
          // Fallback navigation
          try {
            router.push('/');
            console.log('[XLPOSTCARDS][PREVIEW] Fallback navigation with router.push successful');
          } catch (fallbackError) {
            console.error('[XLPOSTCARDS][PREVIEW] Fallback navigation also failed:', fallbackError);
          }
        }
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
      imageUris,
      templateType,
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
  const retryWithExistingPurchase = React.useCallback(async (purchase: StripePurchase) => {
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

  // Add state for user email
  const [userEmail, setUserEmail] = useState<string>('');

  // Load user email when success modal is shown
  useEffect(() => {
    if (showSuccessModal) {
      const loadUserEmail = async () => {
        try {
          const savedEmail = await AsyncStorage.getItem('settings_email');
          setUserEmail(savedEmail || '');
        } catch (error) {
          console.error('[XLPOSTCARDS][PREVIEW] Error loading user email:', error);
          setUserEmail('');
        }
      };
      loadUserEmail();
    }
  }, [showSuccessModal]);

  // Update SuccessOverlay with conditional email messages
  const SuccessOverlay = React.useCallback(() => {
    if (!showSuccessModal) return null;
    
    const hasEmail = userEmail && userEmail.trim() !== '';
    
    return (
      <View style={styles.successOverlay} pointerEvents="auto">
        <View style={styles.successContent}>
          <View style={{ width: '100%', height: 12, backgroundColor: '#fff' }} />
          <Text style={styles.successTitle}>Success!</Text>
          {hasEmail ? (
            <Text style={styles.successMessage}>
              Your postcard will be printed and mailed soon. A pdf proof was sent to your email address at {userEmail}.
            </Text>
          ) : (
            <View>
              <Text style={styles.successMessage}>
                Your postcard will be printed and mailed soon. If you wish to get a pdf proof of the final postcard in the future please enter your email address in the settings drawer.
              </Text>
              <View style={styles.hamburgerContainer}>
                <View style={styles.hamburgerIcon}>
                  <View style={styles.hamburgerLine} />
                  <View style={styles.hamburgerLine} />
                  <View style={styles.hamburgerLine} />
                </View>
              </View>
            </View>
          )}
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
  }, [showSuccessModal, handleNavigation, userEmail]);

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

  // Function to start new purchase flow (Stripe or Free)
  const startNewPurchaseFlow = async () => {
    try {
      // Check if this is a 100% discount promo code
      if (promoCode && promoCodeDiscount === 100) {
        console.log('[XLPOSTCARDS][PREVIEW] Processing 100% discount - skipping Stripe');
        return await processFreePostcard();
      }
      
      console.log('[XLPOSTCARDS][PREVIEW] Continue button pressed - Using Railway Stripe Checkout');
      setSending(true);
      setSendResult(null);
      setStannpConfirmed(false);
      setIsCapturing(true);

      // Get user email from AsyncStorage for receipts
      let userEmail = '';
      try {
        userEmail = await AsyncStorage.getItem('userEmail') || '';
      } catch (e) {
        console.log('[XLPOSTCARDS][PREVIEW] Could not get user email:', e);
      }

      // Step 1: Create postcard data in Railway
      console.log('[XLPOSTCARDS][PREVIEW] Creating postcard data with Railway...');
      const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl || 'https://postcardservice-production.up.railway.app';
      
      const postcardResponse = await fetch(`${railwayBaseUrl}/generate-complete-postcard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          recipientInfo: {
            to: recipientInfo?.to || '',
            addressLine1: recipientInfo?.addressLine1 || '',
            addressLine2: recipientInfo?.addressLine2 || '',
            city: recipientInfo?.city || '',
            state: recipientInfo?.state || '',
            zipcode: recipientInfo?.zipcode || ''
          },
          postcardSize,
          returnAddressText: returnAddress,
          transactionId: existingTransactionId || 'temp-' + Date.now(),
          frontImageUri: railwayFrontUrl || imageUri,
          userEmail: userEmail
        }),
      });

      if (!postcardResponse.ok) {
        const errorText = await postcardResponse.text();
        throw new Error(`Failed to create postcard: ${errorText}`);
      }

      const postcardData = await postcardResponse.json();
      const finalTransactionId = postcardData.transactionId;
      console.log('[XLPOSTCARDS][PREVIEW] Postcard data created:', finalTransactionId);

      // Step 2: Create PaymentIntent for native Payment Sheet
      console.log('[XLPOSTCARDS][PREVIEW] Creating PaymentIntent for Payment Sheet...');
      const paymentPayload = {
        amount: 299, // $2.99 in cents
        transactionId: finalTransactionId
      };

      // Add promo code if available
      if (promoCode && promoCodeDiscount > 0) {
        paymentPayload.promoCode = promoCode;
        paymentPayload.discountPercent = promoCodeDiscount;
        console.log('[XLPOSTCARDS][PREVIEW] Applying promo code:', promoCode, 'with', promoCodeDiscount, '% discount');
      }

      const paymentResponse = await fetch(`${railwayBaseUrl}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload),
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        throw new Error(`Failed to create payment intent: ${errorText}`);
      }

      const paymentData = await paymentResponse.json();
      console.log('[XLPOSTCARDS][PREVIEW] PaymentIntent created successfully');

      // Step 3: Initialize and present native Payment Sheet
      const { initPaymentSheet, presentPaymentSheet } = stripe;
      
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: paymentData.clientSecret,
        merchantDisplayName: 'XLPostcards',
        style: 'alwaysDark',
        returnURL: 'xlpostcards://payment-return'
      });

      if (initError) {
        throw new Error(`Payment Sheet initialization failed: ${initError.message}`);
      }

      // Step 4: Present Payment Sheet (native mobile UI)
      console.log('[XLPOSTCARDS][PREVIEW] Presenting native Payment Sheet...');
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          console.log('[XLPOSTCARDS][PREVIEW] Payment cancelled by user');
          setIsCapturing(false);
          setSending(false);
          return;
        }
        throw new Error(`Payment failed: ${paymentError.message}`);
      }

      // Step 5: Payment successful! Store transaction ID and wait for Stannp
      console.log('[XLPOSTCARDS][PREVIEW] Payment completed successfully!');
      await AsyncStorage.setItem('pendingTransactionId', finalTransactionId);
      
      // Don't show success yet - wait for Stannp confirmation
      console.log('[XLPOSTCARDS][PREVIEW] Payment successful, waiting for Railway to process postcard...');
      setIsCapturing(false);
      setSending(false); // Clear general sending state
      setProcessingPayment(true); // Show post-payment processing
      
      // Poll for completion - only show success when Stannp confirms
      pollPaymentStatus(finalTransactionId);

    } catch (error) {
      const err = error as Error;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setLastErrorMessage(errorMessage);
      console.error('[XLPOSTCARDS][PREVIEW] ERROR in Railway Stripe checkout flow:', {
        error: err,
        message: err.message,
        stack: err.stack
      });
      // Only clear processing state on error
      setSending(false);
      setIsCapturing(false);
      setProcessingPayment(false);
      showOnlyModal('error');
      console.log('[XLPOSTCARDS][PREVIEW] Railway Stripe checkout flow finished with error');
    }
  };

  // Poll payment status after checkout
  const pollPaymentStatus = async (transactionId: string) => {
    const maxAttempts = 12; // 2 minutes with 10-second intervals
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl || 'https://postcardservice-production.up.railway.app';
        const response = await fetch(
          `${railwayBaseUrl}/payment-status/${transactionId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('[XLPOSTCARDS][PREVIEW] Payment status:', data.status);
          
          if (data.status === 'submitted_to_stannp') {
            // Payment successful and postcard submitted to Stannp!
            await AsyncStorage.removeItem('pendingTransactionId');
            console.log('[XLPOSTCARDS][PREVIEW] Payment completed and postcard submitted to Stannp!');
            setSending(false);
            showOnlyModal('success');
            // Clear processing state after success modal is shown
            setProcessingPayment(false);
            return true;
          } else if (data.status === 'payment_completed') {
            // Payment done, still processing postcard
            console.log('[XLPOSTCARDS][PREVIEW] Payment completed, processing postcard...');
            attempts = 0; // Reset attempts to give more time for processing
          }
        }
      } catch (error) {
        console.error('[XLPOSTCARDS][PREVIEW] Error checking payment status:', error);
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 10000); // Check again in 10 seconds
      } else {
        console.log('[XLPOSTCARDS][PREVIEW] Payment status polling timed out');
      }
      
      return false;
    };

    // Start polling after a brief delay
    setTimeout(checkStatus, 5000);
  };

  // Function to process free postcard with 100% discount
  const processFreePostcard = async () => {
    try {
      setSending(true);
      setSendResult(null);
      setStannpConfirmed(false);
      setIsCapturing(true);

      // Get user email from AsyncStorage
      let userEmail = '';
      try {
        userEmail = await AsyncStorage.getItem('settings_email') || '';
      } catch (e) {
        console.log('[XLPOSTCARDS][FREE] Could not get user email:', e);
      }

      console.log('[XLPOSTCARDS][FREE] Processing free postcard with promo code:', promoCode);
      
      if (!promoCode) {
        throw new Error('No promo code available for free postcard processing');
      }
      
      const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl || 'https://postcardservice-production.up.railway.app';
      const transactionId = `free-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(`${railwayBaseUrl}/process-free-postcard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          recipientInfo: {
            to: recipientInfo?.to || '',
            addressLine1: recipientInfo?.addressLine1 || '',
            addressLine2: recipientInfo?.addressLine2 || '',
            city: recipientInfo?.city || '',
            state: recipientInfo?.state || '',
            zipcode: recipientInfo?.zipcode || ''
          },
          postcardSize,
          returnAddressText: returnAddress,
          transactionId,
          frontImageUri: railwayFrontUrl || imageUri,
          userEmail,
          promoCode
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('[XLPOSTCARDS][FREE] Free postcard processed successfully!');
        setStannpConfirmed(true);
        setSendResult({
          success: true,
          message: 'Your free postcard will be printed and sent by First Class mail within 1 business day. It should arrive in 3-7 days.',
        });
        showOnlyModal('success');
      } else {
        throw new Error(result.error || 'Failed to process free postcard');
      }

    } catch (error) {
      console.error('[XLPOSTCARDS][FREE] Error processing free postcard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastErrorMessage(errorMessage);
      showOnlyModal('error');
    } finally {
      setSending(false);
      setIsCapturing(false);
    }
  };

  // Function to process free postcard with specific promo code
  const processFreePostcardWithCode = async (promoCodeToUse: string) => {
    try {
      setSending(true);
      setSendResult(null);
      setStannpConfirmed(false);
      setIsCapturing(true);

      // Get user email from AsyncStorage
      let userEmail = '';
      try {
        userEmail = await AsyncStorage.getItem('settings_email') || '';
      } catch (e) {
        console.log('[XLPOSTCARDS][FREE] Could not get user email:', e);
      }

      console.log('[XLPOSTCARDS][FREE] Processing free postcard with promo code:', promoCodeToUse);
      
      if (!promoCodeToUse) {
        throw new Error('No promo code provided for free postcard processing');
      }
      
      const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl || 'https://postcardservice-production.up.railway.app';
      const transactionId = `free-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(`${railwayBaseUrl}/process-free-postcard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          recipientInfo: {
            to: recipientInfo?.to || '',
            addressLine1: recipientInfo?.addressLine1 || '',
            addressLine2: recipientInfo?.addressLine2 || '',
            city: recipientInfo?.city || '',
            state: recipientInfo?.state || '',
            zipcode: recipientInfo?.zipcode || ''
          },
          postcardSize,
          returnAddressText: returnAddress,
          transactionId,
          frontImageUri: railwayFrontUrl || imageUri,
          userEmail,
          promoCode: promoCodeToUse
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('[XLPOSTCARDS][FREE] Free postcard processed successfully!');
        setStannpConfirmed(true);
        setSendResult({
          success: true,
          message: 'Your free postcard will be printed and sent by First Class mail within 1 business day. It should arrive in 3-7 days.',
        });
        showOnlyModal('success');
      } else {
        throw new Error(result.error || 'Failed to process free postcard');
      }

    } catch (error) {
      console.error('[XLPOSTCARDS][FREE] Error processing free postcard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastErrorMessage(errorMessage);
      showOnlyModal('error');
    } finally {
      setSending(false);
      setIsCapturing(false);
    }
  };

  // Function to start postcard sending after promo code validation
  const startPostcardSending = async (validatedPromoCode: string, discountPercent: number) => {
    try {
      // Set the promo code state for the flow
      setPromoCode(validatedPromoCode);
      setPromoCodeDiscount(discountPercent);
      
      // Check if this is a 100% discount - use free flow
      if (discountPercent === 100) {
        console.log('[XLPOSTCARDS][PROMO] Processing 100% discount - skipping Stripe');
        await processFreePostcardWithCode(validatedPromoCode);
      } else {
        // Use regular Stripe flow with discount
        console.log('[XLPOSTCARDS][PROMO] Processing discounted payment via Stripe');
        await startNewPurchaseFlow();
      }
    } catch (error) {
      console.error('[XLPOSTCARDS][PROMO] Error in postcard sending:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastErrorMessage(errorMessage);
      showOnlyModal('error');
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
      router.replace({ 
        pathname: '/', 
        params: { 
          imageUri, 
          imageUris, 
          templateType,
          message, 
          recipient: JSON.stringify(recipientInfo), 
          selectedRecipientId,
          postcardSize
        } 
      });
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
      router.replace({ 
        pathname: '/', 
        params: { 
          imageUri, 
          imageUris, 
          templateType,
          message, 
          recipient: JSON.stringify(recipientInfo), 
          selectedRecipientId,
          postcardSize
        } 
      });
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

  // Promo Code Modal Component
  const PromoCodeModal = () => {
    const [localPromoCode, setLocalPromoCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState('');

    const handleValidatePromoCode = async () => {
      if (!localPromoCode.trim()) {
        setValidationError('Please enter a promo code');
        return;
      }

      setIsValidating(true);
      setValidationError('');

      try {
        const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl || 'https://postcardservice-production.up.railway.app';
        const response = await fetch(`${railwayBaseUrl}/validate-promo-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code: localPromoCode.trim().toUpperCase(),
            transactionId: `promo-check-${Date.now()}`
          }),
        });

        const result = await response.json();

        if (response.ok && result.valid) {
          setPromoCode(localPromoCode.trim().toUpperCase());
          setPromoCodeDiscount(result.discount_percent || 100);
          
          // Mark promo code as used permanently
          await AsyncStorage.setItem('promo_code_used_permanently', 'true');
          setPromoCodeUsedPermanently(true);
          
          setShowPromoCodeModal(false);
          setLocalPromoCode('');
          
          // Start sending postcard immediately
          console.log('[XLPOSTCARDS][PROMO] Promo code applied, starting postcard send...');
          await startPostcardSending(localPromoCode.trim().toUpperCase(), result.discount_percent || 100);
        } else {
          setValidationError(result.message || 'Invalid promo code');
        }
      } catch (error) {
        console.error('Error validating promo code:', error);
        setValidationError('Unable to validate promo code. Please try again.');
      } finally {
        setIsValidating(false);
      }
    };

    const handleClose = () => {
      setShowPromoCodeModal(false);
      setLocalPromoCode('');
      setValidationError('');
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPromoCodeModal}
        onRequestClose={handleClose}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
            >
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Enter Promo Code</Text>
            <Text style={styles.modalText}>
              Enter your promo code to get a discount on your postcard.
            </Text>
            <TextInput
              style={styles.refundInput}
              placeholder="Promo Code (e.g., XLWelcomeNov)"
              placeholderTextColor="#999"
              value={localPromoCode}
              onChangeText={setLocalPromoCode}
              autoCapitalize="characters"
              onSubmitEditing={handleValidatePromoCode}
            />
            {validationError ? (
              <Text style={styles.errorMessage}>{validationError}</Text>
            ) : null}
            <TouchableOpacity 
              style={[
                styles.modalButton,
                (!localPromoCode.trim() || isValidating) && { opacity: 0.5 }
              ]}
              onPress={handleValidatePromoCode}
              disabled={!localPromoCode.trim() || isValidating}
            >
              <Text style={[styles.modalButtonText, { fontSize: 18, textAlign: 'center' }]}>
                {isValidating ? 'Validating...' : 'Apply Promo Code and Send\nPostcard'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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
        router.replace({ 
        pathname: '/', 
        params: { 
          imageUri, 
          imageUris, 
          templateType,
          message, 
          recipient: JSON.stringify(recipientInfo), 
          selectedRecipientId,
          postcardSize
        } 
      });
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
              router.replace({ 
        pathname: '/', 
        params: { 
          imageUri, 
          imageUris, 
          templateType,
          message, 
          recipient: JSON.stringify(recipientInfo), 
          selectedRecipientId,
          postcardSize
        } 
      });
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
                  source={{ uri: railwayFrontUrl || imageUri }}
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
              {railwayBackImageUrl ? (
                // Show Railway-generated back image (exact final result)
                <Image
                  source={{ uri: railwayBackImageUrl }}
                  style={{
                    width: currentDimensions.width,
                    height: currentDimensions.height,
                    transform: [{ scale: designWidth / currentDimensions.width }],
                    transformOrigin: 'top left',
                    backgroundColor: '#FFFFFF',
                    resizeMode: 'cover',
                  }}
                />
              ) : (
                // Fallback to local PostcardBackLayout component
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
              )}
            </ViewShot>
            {/* Footer content */}
            <View style={[styles.footerContainer, { height: designFooterHeight, justifyContent: 'flex-end', width: designWidth, alignSelf: 'center' }]}> 
              {/* Disclaimer Text */}
              <Text style={styles.disclaimerText} maxFontSizeMultiplier={1.05} numberOfLines={3} adjustsFontSizeToFit>
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
                        <Text style={styles.buttonText} maxFontSizeMultiplier={1.05} numberOfLines={2} adjustsFontSizeToFit>
                          Send Your {postcardSize === 'regular' ? '4"x6"' : '6"x9"'} Postcard{promoCodeDiscount === 100 ? ' (FREE!)' : promoCodeDiscount > 0 ? ` (${promoCodeDiscount}% OFF!)` : ''}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
                {/* Promo code link below the buttons */}
                {!sendResult?.success && !promoCode && !promoCodeUsedPermanently && (
                  <TouchableOpacity
                    style={styles.promoCodeLink}
                    onPress={() => setShowPromoCodeModal(true)}
                  >
                    <Text style={styles.promoCodeText}>Use Promo Code</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
        {/* Status indicators remain outside main layout */}
        {processingPayment && !showSuccessModal && (
          <View style={styles.loadingOverlay} pointerEvents="auto">
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#f28914" />
              <Text style={styles.loadingText}>
                Please wait while postcard is submitted for printing
              </Text>
            </View>
          </View>
        )}
        {sending && !showSuccessModal && !showErrorModal && (
          <View style={styles.loadingOverlay} pointerEvents="auto">
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#f28914" />
              <Text style={styles.loadingText}>
                Please wait while your {postcardSize === 'regular' ? '4"x6"' : '6"x9"'} postcard is submitted for printing
              </Text>
            </View>
          </View>
        )}
        {/* Add the new modals */}
        <ErrorModal />
        <RefundModal />
        <RefundSuccessModal />
        <PromoCodeModal />
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
  },
  loadingContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    color: '#333',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 26,
    fontWeight: '500',
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
  hamburgerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  hamburgerIcon: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#666',
    borderRadius: 1,
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
  promoCodeLink: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  promoCodeText: {
    color: '#f28914',
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  errorMessage: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
}); 