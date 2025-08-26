import { useState, useEffect } from 'react';
import { Image, StyleSheet, Platform, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, View, KeyboardAvoidingView, Modal, Pressable, Text } from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import ImagePicker, { Image as ImagePickerAsset } from 'react-native-image-crop-picker';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { PostcardSize, supportedPostcardSizes } from '@/utils/printSpecs';

import AIDisclaimer from '../components/AIDisclaimer';

// const US_STATES = [
//   'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
//   'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
//   'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
//   'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
//   'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
// ];

const openaiApiKey = Constants.expoConfig?.extra?.openaiApiKey;
const stannpApiKey = Constants.expoConfig?.extra?.stannpApiKey;

// Helper function to process images for consistent 3:2 ratio and iOS compatibility
const processImageForPostcard = async (imageUri: string) => {
  try {
    // If we already have an image URI, just return it without opening the picker
    // This function should only open the picker when called from pickImage
    return {
      path: imageUri,
      width: 1500,
      height: 1000,
      data: null, // We don't have base64 data for existing images
      filename: 'image.jpg',
      size: 0
    };
  } catch (error) {
    console.error('[XLPOSTCARDS][MAIN] Error processing image:', error);
    throw error;
  }
};

const SETTINGS_KEYS = {
  SIGNATURE: 'settings_signature',
};

// Helper: Normalize abbreviations for comparison
const ABBREVIATIONS = [
  ['STREET', 'ST'], ['ROAD', 'RD'], ['AVENUE', 'AVE'], ['SUITE', 'STE'], ['APARTMENT', 'APT'], ['FLOOR', 'FL'], ['UNIT', 'UNIT'], ['BOULEVARD', 'BLVD'], ['DRIVE', 'DR'], ['LANE', 'LN'], ['COURT', 'CT'], ['TERRACE', 'TER'], ['PLACE', 'PL'], ['NORTH', 'N'], ['SOUTH', 'S'], ['EAST', 'E'], ['WEST', 'W']
];
function normalizeAbbr(str: string): string {
  if (!str) return '';
  let s = str.toUpperCase();
  ABBREVIATIONS.forEach(([long, abbr]) => {
    s = s.replace(new RegExp(`\\b${long}\\b`, 'g'), abbr);
  });
  return s.replace(/\s+/g, ' ').trim();
}
function zip5(zip: string): string {
  return zip ? zip.substring(0, 5) : '';
}
function isMaterialAddressChange(orig: any, corr: any): boolean {
  // Compare address line 1 (with abbr and case-insensitive)
  const origAddr = normalizeAbbr(orig.address || '');
  const corrAddr = normalizeAbbr(corr.address || '');
  // If unit/suite moved from address2 to address1, treat as non-material
  const origAddr2 = (orig.address2 || '').toUpperCase().trim();
  const corrAddr2 = (corr.address2 || '').toUpperCase().trim();
  // If address2 is empty in correction, but its value is now in address1, treat as non-material
  const addr2Moved = origAddr2 && !corrAddr2 && corrAddr.includes(origAddr2);
  // Compare city/state (case-insensitive)
  const origCity = (orig.city || '').toUpperCase().trim();
  const corrCity = (corr.city || '').toUpperCase().trim();
  const origState = (orig.state || '').toUpperCase().trim();
  const corrState = (corr.state || '').toUpperCase().trim();
  // Compare zip (5 digit vs 9 digit)
  const origZip5 = zip5(orig.zip);
  const corrZip5 = zip5(corr.zip);
  // Material if city/state/zip5 differ
  if (origCity !== corrCity || origState !== corrState || origZip5 !== corrZip5) return true;
  // Material if address1 differs in more than abbr/case/unit movement
  if (origAddr !== corrAddr && !(addr2Moved && origAddr.replace(origAddr2, '').trim() === corrAddr.replace(origAddr2, '').trim())) return true;
  // If address2 is present in original but not in correction, and it's not just moved, material
  if (origAddr2 && !corrAddr2 && !addr2Moved) return true;
  // If address2 is present in correction but not in original, material
  if (!origAddr2 && corrAddr2) return true;
  // Otherwise, non-material
  return false;
}

type DrawerParamList = {
  Main: undefined;
};

// Add modal transition utility at the top of the file, after imports
const transitionModal = (closeModal: () => void, openModal?: () => void, delay: number = 300) => {
  console.log('[XLPOSTCARDS][MAIN] Starting modal transition');
  closeModal();
  if (openModal) {
    setTimeout(() => {
      console.log('[XLPOSTCARDS][MAIN] Opening next modal after delay');
      openModal();
    }, delay);
  }
};

// type RecipientModalProps = {
//   visible: boolean;
//   addresses: any[];
//   setShowRecipientModal: (v: boolean) => void;
//   setShowAddressModal: (v: boolean) => void;
//   setSelectedAddressId: (id: string | null) => void;
// };



export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<ExpoImagePicker.ImagePickerAsset | ImagePickerAsset | null>(null);
  const [postcardMessage, setPostcardMessage] = useState('');
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
// normalized postcard size from params (validated)
const __postcardSizeParam = (params?.postcardSize as string) || '';
const __normalizedPostcardSize = (supportedPostcardSizes.includes(__postcardSizeParam as PostcardSize) 
  ? (__postcardSizeParam as PostcardSize) 
  : undefined);

  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressValidationStatus, setAddressValidationStatus] = useState<'idle'|'loading'|'valid'|'invalid'|'error'>('idle');
  const [addressValidationMessage, setAddressValidationMessage] = useState('');
  const [showValidationOptions, setShowValidationOptions] = useState(false);
  const [, setCorrectedAddress] = useState<any>(null);
  const [showUSPSNote, setShowUSPSNote] = useState(false);
  const [cameFromSelectRecipient, setCameFromSelectRecipient] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<any>(null);
  const [hasUserEditedMessage, setHasUserEditedMessage] = useState(false);
  const imageSetFromParams = React.useRef(false);
  const postcardSizeSetFromParams = React.useRef(false);
  const [postcardSize, setPostcardSize] = useState<PostcardSize>('xl');
  const hasMounted = React.useRef(false);
  const [showRecipientModalComponent, setShowRecipientModalComponent] = useState(true);
  // Suppress unused variable warning
  void showRecipientModalComponent;

  // Move resetAllModals outside useEffect so it can be called anywhere
  const resetAllModals = () => {
    console.log('[XLPOSTCARDS][MAIN] Resetting modal states (global call)');
    setShowAddressModal(false);
    setStateDropdownOpen(false);
    setEditingAddressId(null);
    setAddressValidationStatus('idle');
    setAddressValidationMessage('');
    setShowValidationOptions(false);
    setCorrectedAddress(null);
    setShowUSPSNote(false);
  };

  // Update the useEffect that processes params
  const processParams = React.useCallback(async () => {
    if (!params) return;

    console.log('[XLPOSTCARDS][MAIN] Processing navigation params:', params);
    console.log('[XLPOSTCARDS][MAIN] Current selectedAddressId:', selectedAddressId);

    // Only skip image processing if we're adding a new address AND there's no imageUri
    // This allows us to preserve the image when returning from select-recipient
    if (params.addNewAddress === 'true' && !params.imageUri) {
      console.log('[XLPOSTCARDS][MAIN] Skipping image processing for new address without image');
      return;
    }

    // Only set image from params if we haven't already set it from params
    if (params.imageUri && !imageSetFromParams.current) {
      console.log('[XLPOSTCARDS][MAIN] Setting image with URI:', params.imageUri);
      try {
        // Process the image to ensure consistent 3:2 ratio
        const processed = await processImageForPostcard(params.imageUri as string);
        setImage({ 
          uri: processed.path,
          width: processed.width,
          height: processed.height,
          base64: processed.data, // This will be null for existing images
          type: 'image',
          fileName: processed.filename || '',
          fileSize: processed.size || 0,
          assetId: '',
        });
        imageSetFromParams.current = true;
      } catch (error: unknown) {
        console.error('[XLPOSTCARDS][MAIN] Error processing image from params:', error);
        // Fallback to original image if processing fails
        setImage({ 
          uri: params.imageUri as string,
          width: 0,
          height: 0,
          type: 'image',
          fileName: '',
          fileSize: 0,
          assetId: '',
        });
        imageSetFromParams.current = true;
      }
    }

    // Process message
    if (params.message && !hasUserEditedMessage) {
      console.log('[XLPOSTCARDS][MAIN] Setting message:', params.message);
      setPostcardMessage(params.message as string);
    }

    // Process recipient info
    if (params.recipient) {
      try {
        const newRecipientInfo = JSON.parse(params.recipient as string);
        if (JSON.stringify(newRecipientInfo) !== JSON.stringify(recipientInfo)) {
          console.log('[XLPOSTCARDS][MAIN] Setting recipient info:', newRecipientInfo);
          setRecipientInfo(newRecipientInfo);
        }
      } catch (error: unknown) {
        console.error('[XLPOSTCARDS][MAIN] Error parsing recipient info:', error);
      }
    }

    // Process selected recipient ID
    let receivedRecipientId = params.selectedRecipientId as string | undefined;
    if (!receivedRecipientId && params.recipient) {
      try {
        const recipientObj = JSON.parse(params.recipient as string);
        if (recipientObj && recipientObj.id) {
          receivedRecipientId = recipientObj.id;
        }
      } catch {
        // handle error
      }
    }
    if (receivedRecipientId && receivedRecipientId !== selectedAddressId) {
      console.log('[XLPOSTCARDS][MAIN] Setting selected recipient ID:', receivedRecipientId);
      setSelectedAddressId(receivedRecipientId);
    }

    console.log('[XLPOSTCARDS][DEBUG] processParams called. postcardSize:', postcardSize, 'params:', params, 'hasMounted:', hasMounted.current);
    if (!postcardSizeSetFromParams.current) {
      if (params.postcardSize && (params.postcardSize === 'regular' || params.postcardSize === 'xl') && params.postcardSize !== postcardSize) {
        console.log('[XLPOSTCARDS][DEBUG] Setting postcardSize from params on first mount:', params.postcardSize);
        setPostcardSize(params.postcardSize);
      }
      postcardSizeSetFromParams.current = true;
    }
    console.log('[XLPOSTCARDS][DEBUG] postcardSize after processParams:', postcardSize);
  }, [params, recipientInfo, selectedAddressId, hasUserEditedMessage, postcardSize]);

  // Update the useEffect that processes params
  useEffect(() => {
    void processParams();
  }, [processParams]);

  // Update the useEffect that handles focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[XLPOSTCARDS][MAIN] Screen focused');
      void loadAddresses();
    });

    return unsubscribe;
  }, [navigation]); // Only depend on navigation

  // Update the useEffect that handles cleanup
  useEffect(() => {
    return () => {
      console.log('[XLPOSTCARDS][MAIN] Cleanup: resetting all modal state on unmount');
      resetAllModals();
      console.log('[XLPOSTCARDS][MAIN] HomeScreen unmounted');
    };
  }, []); // Empty dependency array since this is cleanup

  // Update the useEffect that handles modal state logging
  useEffect(() => {
    console.log('[XLPOSTCARDS][MAIN] Modal states:', {
      showAddressModal,
      stateDropdownOpen
    });
  }, [showAddressModal, stateDropdownOpen]); // Only depend on modal states

  // Reset all modal states when screen mounts or receives reset param
  useEffect(() => {
    // Reset on mount
    resetAllModals();

    // Listen for navigation events
    const unsubscribe = navigation.addListener('focus', (e) => {
      console.log('[XLPOSTCARDS][MAIN] Screen focused');
      // Check if we should reset modals
      const target = e.target || '';
      const params = target.split('?')[1];
      if (params?.includes('resetModals=true')) {
        console.log('[XLPOSTCARDS][MAIN] Reset modals param detected');
        resetAllModals();
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Platform-specific image picker - Both iOS and Android use react-native-image-crop-picker for consistent cropping
  const pickImage = async () => {
    try {
      // iOS-specific: Force memory cleanup before opening picker
      if (Platform.OS === 'ios' && global.gc) {
        global.gc();
      }
      
      if (Platform.OS === 'ios') {
        // iOS: Use react-native-image-crop-picker for proper 3:2 cropping and rotation
        const pickedImage = await ImagePicker.openPicker({
          width: 1500,
          height: 1000,
          cropping: true,
          cropperToolbarTitle: 'Crop your postcard image',
          cropperChooseText: 'Choose',
          cropperCancelText: 'Cancel',
          cropperRotateButtonsHidden: false,
          includeBase64: true,
          mediaType: 'photo',
          forceJpg: true,
          // iOS-specific settings for better experience
          cropperCircleOverlay: false,
          showCropGuidelines: true,
          showCropFrame: true,
          enableRotationGesture: true,
          cropperActiveWidgetColor: '#f28914',
          cropperStatusBarColor: '#000000',
          cropperToolbarColor: '#000000',
          cropperToolbarWidgetColor: '#ffffff',
        });
        
        setImage({
          uri: pickedImage.path,
          width: pickedImage.width,
          height: pickedImage.height,
          base64: pickedImage.data,
          type: 'image',
          fileName: pickedImage.filename || 'image.jpg',
          fileSize: pickedImage.size || 0,
          assetId: '',
        });
        imageSetFromParams.current = true;
        
      } else {
        // Android: Use simple Expo ImagePicker with 3:2 aspect ratio
        const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to select photos.');
          return;
        }

        const result = await ExpoImagePicker.launchImageLibraryAsync({
          mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 2], // 3:2 aspect ratio for postcard
          quality: 0.9,
          base64: true,
        });

        if (!result.canceled && result.assets[0]) {
          const selectedImage = result.assets[0];
          
          // Ensure the image is properly sized to 3:2 aspect ratio
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            selectedImage.uri,
            [
              { resize: { width: 1500 } } // Let height adjust automatically to maintain aspect ratio
            ],
            {
              compress: 0.9,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );

          // Ensure final dimensions are exactly 3:2 ratio (1500x1000)
          const finalImage = await ImageManipulator.manipulateAsync(
            manipulatedImage.uri,
            [
              { resize: { width: 1500, height: 1000 } }
            ],
            {
              compress: 0.9,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );

          setImage({
            uri: finalImage.uri,
            width: 1500,
            height: 1000,
            base64: finalImage.base64,
            type: 'image',
            fileName: selectedImage.fileName || 'image.jpg',
            fileSize: selectedImage.fileSize || 0,
            assetId: selectedImage.assetId || '',
          });
          imageSetFromParams.current = true;
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      // User cancelled or error - don't show alert for cancellation
      if ((error as any)?.message && !(error as any).message.includes('cancelled')) {
        Alert.alert('Error', 'Failed to select image.');
      }
    }
  };

  // Simple 90-degree rotation handler - maintains 3:2 aspect ratio
  const handleRotateImage = async () => {
    if (!image) return;
    try {
      // First rotate the image 90 degrees
      const rotated = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ rotate: 90 }], // Simple 90-degree rotation
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      
      // After rotation, ensure we maintain postcard aspect ratio (3:2)
      // If we started with 1500x1000 (3:2), after rotation it becomes 1000x1500 (2:3)
      // We need to crop/resize it back to 1500x1000 (3:2)
      const finalImage = await ImageManipulator.manipulateAsync(
        rotated.uri,
        [
          { resize: { width: 1500, height: 1000 } } // Force back to 3:2 ratio
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      
      setImage({
        ...image,
        uri: finalImage.uri,
        width: 1500, // Keep consistent 3:2 dimensions
        height: 1000,
        base64: finalImage.base64,
      });
    } catch (error) {
      console.error('Error rotating image:', error);
      Alert.alert('Error', 'Failed to rotate image.');
    }
  };

  // Function to analyze the image with OpenAI
  const analyzeImage = async () => {
    if (!image) {
      Alert.alert('No image', 'Please select a photo first.');
      return;
    }
    const selected = addresses.find(a => a.id === selectedAddressId);
    const salutation = selected?.salutation || '';
    setLoading(true);
    try {
      // Prepare base64 image
      let base64Image = (image as any).base64 ? `data:image/jpeg;base64,${(image as any).base64}` : undefined;
      // Compose prompt
      let promptText =
        `Write a friendly, engaging postcard message (max ${postcardSize === 'regular' ? 60 : 100} words) based on the attached photo.` +
        (salutation ? ` Start the message with: "${salutation}".` : '') +
        (postcardMessage ? ` Here are some hints or ideas: ${postcardMessage}` : '') +
        ` Write it in a casual, personal tone, like a real postcard.`;

      // Get signature block from settings
      let signatureBlock = await AsyncStorage.getItem(SETTINGS_KEYS.SIGNATURE);
      if (signatureBlock) {
        promptText += ` End the message with: "${signatureBlock}"`;
      }

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                ...(base64Image ? [{ type: 'image_url', image_url: { url: base64Image } }] : [])
              ]
            }
          ],
          max_tokens: 400
        })
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'Error analyzing image');
      }
      // Get the paragraph from the response
      const content = data.choices[0].message.content;
      setPostcardMessage(content);
      setIsAIGenerated(true);
    } catch {
      Alert.alert('Error', 'Failed to analyze image.');
    } finally {
      setLoading(false);
    }
  };

  // Ensure all modals are closed when leaving the screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      console.log('[XLPOSTCARDS][MAIN] Screen blurred (navigating away), resetting all modals');
      resetAllModals();
    });
    return unsubscribe;
  }, [navigation]);

  // Update handleCreatePostcard to unmount recipient modal component before navigation
  const handleCreatePostcard = () => {
    if (!image) {
      Alert.alert('No image', 'Please select a photo first.');
      return;
    }
    if (!postcardMessage) {
      Alert.alert('No message', 'Please enter a message.');
      return;
    }
    
    // Check if there are any addresses at all
    if (addresses.length === 0) {
      Alert.alert(
        'No Recipients', 
        'You need to add a recipient address first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Recipient', onPress: () => setShowAddressModal(true) }
        ]
      );
      return;
    }
    
    const selected = addresses.find(a => a.id === selectedAddressId);
    if (!selected) {
      Alert.alert('No recipient selected', 'Please select a recipient address.');
      return;
    }
    // Close and unmount recipient modal before navigation
    setShowRecipientModal(false);
    setShowRecipientModalComponent(false);
    setTimeout(() => {
      if (!showAddressModal && 
          !stateDropdownOpen && 
          !editingAddressId && 
          !showValidationOptions && 
          !showUSPSNote && !showRecipientModal) {
        const recipientInfo = {
          to: selected.name,
          addressLine1: selected.address,
          addressLine2: '',
          city: selected.city,
          state: selected.state,
          zipcode: selected.zip,
          country: 'United States',
          id: selected.id,
        };
        console.log('[XLPOSTCARDS][MAIN] handleCreatePostcard recipientInfo:', recipientInfo);
        router.push({
          pathname: '/postcard-preview',
          params: {
            imageUri: (image as any).uri,
            message: postcardMessage,
            recipient: JSON.stringify(recipientInfo),
            postcardSize,
          },
        });
      } else {
        console.warn('[XLPOSTCARDS][MAIN] Not navigating: one or more modals are still open!');
      }
    }, 700); // 700ms delay for robust iOS modal teardown
  };

  // When returning to this screen, remount the recipient modal component
  useEffect(() => {
    setShowRecipientModalComponent(true);
  }, [navigation]);

  // Load addresses from AsyncStorage
  useEffect(() => { loadAddresses(); }, []);
  const loadAddresses = async () => {
    const stored = await AsyncStorage.getItem('addresses');
    const parsed = stored ? JSON.parse(stored) : [];
    setAddresses(parsed);
  };

  /* const handleEditAddress = (address: any) => {
    console.log('[XLPOSTCARDS][MAIN] Editing address:', address.id);
    setNewAddress({
      name: address.name,
      salutation: address.salutation || '',
      address: address.address,
      address2: address.address2 || '',
      city: address.city,
      state: address.state,
      zip: address.zip,
      birthday: address.birthday || '',
    });
    setEditingAddressId(address.id);
    setShowAddressModal(true);
  }; */

  /* const handleDeleteAddress = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = addresses.filter(a => a.id !== id);
        await AsyncStorage.setItem('addresses', JSON.stringify(updated));
        if (selectedAddressId === id) setSelectedAddressId(null);
        loadAddresses();
      }},
    ]);
  }; */

  const validateAddressWithStannp = async (address: any) => {
    setAddressValidationStatus('loading');
    setAddressValidationMessage('Please wait while we verify the address…');
    setCorrectedAddress(null);
    try {
      const formData = new URLSearchParams();
      formData.append('company', 'Stannp');
      formData.append('address1', address.address);
      formData.append('address2', address.address2 || '');
      formData.append('city', address.city);
      formData.append('state', address.state);
      formData.append('zipcode', address.zip);
      formData.append('country', 'US');
      console.log('[XLPOSTCARDS][STANNP][VALIDATE] Request payload:', Object.fromEntries(formData));
      const response = await fetch('https://api-us1.stannp.com/v1/addresses/validate', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${stannpApiKey}:`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      const raw = await response.text();
      console.log('[XLPOSTCARDS][STANNP][VALIDATE] Raw response:', raw);
      const data = JSON.parse(raw);
      if (data?.data?.is_valid === true) {
        const corrected = {
          address: data.data.address1,
          address2: data.data.address2 || '',
          city: data.data.city,
          state: data.data.county, // Stannp returns state in county field
          zip: data.data.postcode,
        };
        const hasChanges =
          corrected.address !== address.address ||
          corrected.address2 !== (address.address2 || '') ||
          corrected.city !== address.city ||
          corrected.state !== address.state ||
          corrected.zip !== address.zip;
        if (hasChanges) {
          setCorrectedAddress(corrected);
          setAddressValidationStatus('valid');
          setAddressValidationMessage('We found a suggested correction for your address.');
          return { isValid: true, corrected };
        } else {
          setAddressValidationStatus('valid');
          setAddressValidationMessage('Address confirmed.');
          return { isValid: true, corrected: null };
        }
      } else {
        setAddressValidationStatus('invalid');
        setAddressValidationMessage("We couldn't verify this address. Please check for typos or confirm it's correct.");
        setShowValidationOptions(true);
        return { isValid: false, corrected: null };
      }
    } catch (e) {
      console.error('[XLPOSTCARDS][STANNP][VALIDATE] Error:', e);
      setAddressValidationStatus('error');
      setAddressValidationMessage("We couldn't verify this address. Please check for typos or confirm it's correct.");
      setShowValidationOptions(true);
      return { isValid: false, corrected: null };
    }
  };

  // Update the effect that handles address correction results
  useEffect(() => {
    const handleAddressCorrection = async () => {
      // Always fetch the latest addresses from AsyncStorage before writing
      const stored = await AsyncStorage.getItem('addresses');
      const latestAddresses = stored ? JSON.parse(stored) : [];
      if (params.useCorrectedAddress === 'true' && params.correctedAddress && params.originalAddress) {
        const corrected = JSON.parse(params.correctedAddress as string);
        const original = JSON.parse(params.originalAddress as string);
        const merged = {
          ...original,
          address: corrected.address,
          address2: corrected.address2,
          city: corrected.city,
          state: corrected.state,
          zip: corrected.zip,
        };
        let updated;
        let newId = editingAddressId;
        if (editingAddressId) {
          updated = latestAddresses.map((a: any) => a.id === editingAddressId ? { ...merged, id: editingAddressId, verified: true } : a);
        } else {
          newId = Date.now().toString() + Math.random().toString(36).slice(2); // unique
          updated = [...latestAddresses, { ...merged, id: newId, verified: true }];
        }
        await AsyncStorage.setItem('addresses', JSON.stringify(updated));
        setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
        setEditingAddressId(null);
        setAddressValidationStatus('idle');
        setAddressValidationMessage('');
        setCorrectedAddress(null);
        await loadAddresses();
        // Navigate to main screen with new/edited address selected
        router.replace({ pathname: '/', params: { selectedRecipientId: newId, imageUri: (image as any)?.uri, message: postcardMessage } });
      } else if (params.useOriginalAddress === 'true' && params.originalAddress) {
        const original = JSON.parse(params.originalAddress as string);
        let updated;
        let newId = editingAddressId;
        if (editingAddressId) {
          updated = latestAddresses.map((a: any) => a.id === editingAddressId ? { ...original, id: editingAddressId, verified: true } : a);
        } else {
          newId = Date.now().toString() + Math.random().toString(36).slice(2); // unique
          updated = [...latestAddresses, { ...original, id: newId, verified: true }];
        }
        await AsyncStorage.setItem('addresses', JSON.stringify(updated));
        setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
        setEditingAddressId(null);
        setAddressValidationStatus('idle');
        setAddressValidationMessage('');
        setCorrectedAddress(null);
        await loadAddresses();
        // Navigate to main screen with new/edited address selected
        router.replace({ pathname: '/', params: { selectedRecipientId: newId, imageUri: (image as any)?.uri, message: postcardMessage } });
      }
    };
    handleAddressCorrection();
  }, [params.useCorrectedAddress, params.useOriginalAddress, params.correctedAddress, params.originalAddress, editingAddressId, image, postcardMessage, router]);

  // Keep the editAddressId effect separate since it has different dependencies
  useEffect(() => {
    if (params.editAddressId) {
      const editId = Array.isArray(params.editAddressId) ? params.editAddressId[0] : params.editAddressId;
      const address = addresses.find(a => a.id === editId);
      if (address) {
        setNewAddress({
          name: address.name,
          salutation: address.salutation || '',
          address: address.address,
          address2: address.address2 || '',
          city: address.city,
          state: address.state,
          zip: address.zip,
          birthday: address.birthday || '',
        });
        setEditingAddressId(editId);
        setShowAddressModal(true);
      }
    }
  }, [params.editAddressId, addresses]);

  // Keep the addNewAddress effect separate since it has different dependencies
  useEffect(() => {
    let shouldShow = false;
    if (params.addNewAddress === 'true') shouldShow = true;
    if (params.editAddressId) shouldShow = true;
    setShowAddressModal(shouldShow);
    if (!shouldShow) {
      setEditingAddressId(null);
      setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
    }
  }, [params.addNewAddress, params.editAddressId]);

  // In handleSaveNewAddress, always fetch the latest addresses from AsyncStorage before writing
  const handleSaveNewAddress = async () => {
    if (!newAddress.name) {
      Alert.alert('Please enter a name for the recipient.');
      return;
    }
    setShowValidationOptions(false);
    setShowUSPSNote(false);
    const addressToSave = { ...newAddress };
    const { isValid, corrected } = await validateAddressWithStannp(addressToSave);
    // Always fetch the latest addresses from AsyncStorage before writing
    const stored = await AsyncStorage.getItem('addresses');
    const latestAddresses = stored ? JSON.parse(stored) : [];
    if (isValid && corrected) {
      if (!isMaterialAddressChange(addressToSave, corrected)) {
        // Auto-apply correction, show USPS note
        const merged = {
          ...addressToSave,
          address: corrected.address,
          address2: corrected.address2,
          city: corrected.city,
          state: corrected.state,
          zip: corrected.zip,
        };
        let updated;
        let newId = editingAddressId;
        if (editingAddressId) {
          updated = latestAddresses.map((a: any) => a.id === editingAddressId ? { ...merged, id: editingAddressId, verified: true } : a);
        } else {
          newId = Date.now().toString() + Math.random().toString(36).slice(2); // unique
          updated = [...latestAddresses, { ...merged, id: newId, verified: true }];
        }
        await AsyncStorage.setItem('addresses', JSON.stringify(updated));
        setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
        setShowAddressModal(false);
        setEditingAddressId(null);
        setAddressValidationStatus('idle');
        setAddressValidationMessage('');
        setCorrectedAddress(null);
        setShowUSPSNote(true);
        await loadAddresses();
        // Navigate to main screen with new/edited address selected
        router.replace({ pathname: '/', params: { selectedRecipientId: newId, imageUri: (image as any)?.uri, message: postcardMessage } });
        return;
      } else {
        // Navigate to address correction screen
        router.push({
          pathname: '/address-correction',
          params: {
            originalAddress: JSON.stringify(addressToSave),
            correctedAddress: JSON.stringify(corrected),
            imageUri: (image as any)?.uri,
            message: postcardMessage
          }
        });
        return;
      }
    }
    if (isValid) {
      let updated;
      let newId = editingAddressId;
      if (editingAddressId) {
        updated = latestAddresses.map((a: any) => a.id === editingAddressId ? { ...addressToSave, id: editingAddressId, verified: true } : a);
      } else {
        newId = Date.now().toString() + Math.random().toString(36).slice(2); // unique
        updated = [...latestAddresses, { ...addressToSave, id: newId, verified: true }];
      }
      await AsyncStorage.setItem('addresses', JSON.stringify(updated));
      setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
      setShowAddressModal(false);
      setEditingAddressId(null);
      setAddressValidationStatus('idle');
      setAddressValidationMessage('');
      setCorrectedAddress(null);
      setShowUSPSNote(false);
      await loadAddresses();
      // Navigate to main screen with new/edited address selected
      router.replace({ pathname: '/', params: { selectedRecipientId: newId, imageUri: (image as any)?.uri, message: postcardMessage } });
    }
  };

  // On mount or when params change, update selected recipient or open address modal
  useEffect(() => {
    if (params.selectedRecipientId) {
      setSelectedAddressId(params.selectedRecipientId as string);
    }
    if (params.addNewAddress === 'true') {
      setShowAddressModal(true);
    }
  }, [params]);

  // Add a resetCard function
  const resetCard = () => {
    setImage(null);
    setPostcardMessage('');
    setSelectedAddressId(null);
    setRecipientInfo(null);
    setIsAIGenerated(false);
    setHasUserEditedMessage(false);
    setShowRecipientModal(false);
    setShowRecipientModalComponent(true);
    setShowAddressModal(false);
    setEditingAddressId(null);
    setAddressValidationStatus('idle');
    setAddressValidationMessage('');
    setShowValidationOptions(false);
    setCorrectedAddress(null);
    setShowUSPSNote(false);
    setCameFromSelectRecipient(false);
    setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
    setPostcardSize('xl');
    imageSetFromParams.current = false;
    postcardSizeSetFromParams.current = false;
    // Navigate to main screen with NO params to clear everything
    router.replace({ pathname: '/' });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      {/* Spacer to prevent header image from being cut off by the status bar */}
      <View style={{ height: (Constants.statusBarHeight || 32), backgroundColor: '#e5851a', width: '100%' }} />
      {/* Header image and hamburger menu, now edge-to-edge and not cut off */}
      <View style={{ width: '100%', backgroundColor: '#e5851a' }}>
        <Image
          source={require('@/assets/images/XLPostcards-Header.png')}
          style={{
            width: '100%',
            height: undefined,
            aspectRatio: 4, // 4:1 aspect ratio recommended
            backgroundColor: '#e5851a',
          }}
          resizeMode="cover"
        />
        <TouchableOpacity style={[styles.hamburgerInHeaderScroll, { top: 32 }]} onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color="#0a7ea4" />
        </TouchableOpacity>
      </View>
      
      {/* Debug Build Info Banner - Show if using test key */}
      {Constants.expoConfig?.extra?.stripePublishableKey?.startsWith('pk_test') && (
        <View style={{ 
          backgroundColor: '#10B981', 
          paddingVertical: 6, 
          paddingHorizontal: 12,
          alignItems: 'center'
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            🔧 v{Constants.expoConfig?.version} | SIMULATOR | 💳 TEST CARDS OK
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, backgroundColor: '#fff', paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Remove the test modal button */}
        {/* Remove the teal XLPostcards title, but leave a space for layout balance */}
        <View style={{ height: 24 }} />

        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.fullWidthButton} onPress={pickImage}>
            <Text style={styles.buttonText}>{image ? 'Change Photo' : '1) Select Photo'}</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: (image as any).uri }}
              style={{ width: '100%', aspectRatio: 1.5, borderRadius: 8 }}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Select Postcard Size</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, marginVertical: 8 }}>
            <Pressable onPress={() => setPostcardSize('regular')} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <View style={[styles.radioOuter, postcardSize === 'regular' && styles.radioOuterSelected]}>
                {postcardSize === 'regular' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Regular (4"x6")</Text>
            </Pressable>
            <Pressable onPress={() => setPostcardSize('xl')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.radioOuter, postcardSize === 'xl' && styles.radioOuterSelected]}>
                {postcardSize === 'xl' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>XL (6"x9")</Text>
            </Pressable>
          </View>
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ color: '#888', fontSize: 14 }}>Same Low Price - $1.99 + tax</Text>
          </View>
        </View>

        {/* Address Dropdown Section */}
        <View style={[styles.sectionBlock, { zIndex: 3000 }]}>
          <Text style={styles.sectionLabel}>2) Select Recipient</Text>
          <TouchableOpacity
            style={[styles.fullWidthButton, { marginBottom: 8 }]}
            onPress={() => {
              setCameFromSelectRecipient(true);
              router.push({ pathname: '/select-recipient', params: { imageUri: (image as any)?.uri, message: postcardMessage, postcardSize } });
            }}
          >
            <Text style={styles.buttonText}>
              {addresses.length === 0
                ? 'Add Recipient'
                : (selectedAddressId
                    ? (addresses.find(a => a.id === selectedAddressId)?.name || 'Select Recipient')
                    : 'Select Recipient')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Message Block */}
        <View style={[styles.sectionBlock, { zIndex: 1000 }]}>
          <Text style={styles.sectionLabel}>3) Write Message</Text>
          <View style={styles.messageInputContainer}>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={postcardMessage}
              onChangeText={text => { setPostcardMessage(text); setIsAIGenerated(false); setHasUserEditedMessage(true); }}
              multiline={true}
              numberOfLines={6}
              placeholder="Write your message here or put in some ideas and hit the 'Write for me' button below."
              placeholderTextColor="#888"
              editable={!loading}
            />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#A1CEDC" />
              </View>
            )}
            <TouchableOpacity 
              style={[styles.submitButton, styles.aiButton, (!image || loading) && { opacity: 0.5, backgroundColor: '#e7c7a1' }, { minWidth: 180 }]}
              onPress={analyzeImage}
              disabled={!image || loading}
            >
              <Text style={[styles.buttonText, { fontSize: 18 }]}>Write for me</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              borderWidth: 2,
              borderColor: '#f28914',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              minHeight: 56,
              minWidth: 56,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 2,
            }}
            onPress={resetCard}
            accessibilityLabel="Reset postcard"
          >
            <Ionicons name="refresh-circle" size={32} color="#f28914" style={{ marginTop: 0 }} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.submitButton,
              styles.createButton,
              (!image || !postcardMessage) && { opacity: 0.5 },
              { zIndex: 1, height: 56, minHeight: 56, maxHeight: 56, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: 0, marginBottom: 0 }
            ]}
            onPress={handleCreatePostcard}
            disabled={!image || !postcardMessage}
          >
            <Text style={styles.createButtonText}>Create Postcard</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 8 }}>
            Currently postcards can only be sent to the US
          </Text>
          <AIDisclaimer contentToReport={isAIGenerated ? postcardMessage : undefined} />
        </View>
      </ScrollView>

      {/* Add/Edit Address Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          console.log('[XLPOSTCARDS][MAIN] Address modal closing');
          // iOS-specific: Force memory cleanup before modal transition
          if (Platform.OS === 'ios' && global.gc) {
            global.gc();
          }
          transitionModal(() => {
            setShowAddressModal(false);
            setEditingAddressId(null);
            setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
          });
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}
          keyboardVerticalOffset={Platform.OS === 'android' ? 32 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flex: 1, maxWidth: 420, width: '98%', alignSelf: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 20, justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#f28914', textAlign: 'center', marginBottom: 16 }}>
                {editingAddressId ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Name *"
                value={newAddress.name}
                onChangeText={text => setNewAddress({ ...newAddress, name: text })}
                placeholderTextColor="#b3b3b3"
              />
              <TextInput
                style={styles.input}
                placeholder="Salutation e.g. Dear Grandma"
                value={newAddress.salutation}
                onChangeText={text => setNewAddress({ ...newAddress, salutation: text })}
                placeholderTextColor="#b3b3b3"
              />
              <TextInput
                style={styles.input}
                placeholder="Address line #1"
                value={newAddress.address}
                onChangeText={text => setNewAddress({ ...newAddress, address: text })}
                placeholderTextColor="#b3b3b3"
              />
              <TextInput
                style={styles.input}
                placeholder="Address line #2"
                value={newAddress.address2}
                onChangeText={text => setNewAddress({ ...newAddress, address2: text })}
                placeholderTextColor="#b3b3b3"
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                value={newAddress.city}
                onChangeText={text => setNewAddress({ ...newAddress, city: text })}
                placeholderTextColor="#b3b3b3"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="State"
                    value={newAddress.state}
                    onChangeText={text => setNewAddress({ ...newAddress, state: text })}
                    autoCapitalize="characters"
                    maxLength={2}
                    placeholderTextColor="#b3b3b3"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Zip"
                    value={newAddress.zip}
                    onChangeText={text => setNewAddress({ ...newAddress, zip: text })}
                    placeholderTextColor="#b3b3b3"
                  />
                </View>
              </View>
              {/* Birthday field temporarily hidden */}
              {/* <TextInput
                style={styles.input}
                placeholder="Birthday (mm/dd/yyyy)"
                value={newAddress.birthday}
                onChangeText={text => setNewAddress({ ...newAddress, birthday: text })}
                placeholderTextColor="#b3b3b3"
              /> */}
              {addressValidationStatus === 'invalid' && addressValidationMessage ? (
                <Text style={{ color: '#dc3545', textAlign: 'center', marginBottom: 12 }}>
                  {addressValidationMessage}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f28914' }]}
                  onPress={() => {
                    // iOS-specific: Force memory cleanup before closing modal
                    if (Platform.OS === 'ios' && global.gc) {
                      global.gc();
                    }
                    setShowAddressModal(false);
                    setEditingAddressId(null);
                    setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
                    // Only navigate back to select-recipient if we actually came from there
                    if (cameFromSelectRecipient) {
                      setCameFromSelectRecipient(false);
                      router.replace({ pathname: '/select-recipient', params: { imageUri: (image as any)?.uri, message: postcardMessage, postcardSize } });
                    } else {
                      // Clear all params that would cause modal to reopen
                      router.replace({ pathname: '/', params: { imageUri: (image as any)?.uri, message: postcardMessage } });
                    }
                  }}
                >
                  <Text style={{ color: '#f28914', fontWeight: 'bold', fontSize: 18 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#f28914' }]}
                  onPress={handleSaveNewAddress}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 24,
  },
  headerImage: {
    height: 200,
    width: '100%',
    position: 'relative',
    opacity: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  submitButton: {
    padding: 16,
    backgroundColor: '#f28914',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 120,
  },
  createButton: {
    height: 56,
    marginTop: 12,
    marginBottom: 24,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  analyzeButtonsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    padding: 4,
  },
  input: {
    borderColor: '#f28914',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 20,
    color: '#000',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
    marginTop: 0,
    lineHeight: 22,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#fff',
  },
  messageSection: {
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
  },
  formContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  messageInputContainer: {
    position: 'relative',
    width: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  addressCorrectionContainer: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addressCorrectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f28914',
    marginBottom: 12,
    textAlign: 'center',
  },
  addressComparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addressColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  addressColumnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  addressField: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  addressFieldChanged: {
    color: '#f28914',
    fontWeight: '600',
  },
  addressCorrectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  addressComparisonContainerVertical: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addressColumnVertical: {
    marginBottom: 12,
  },
  scrollHeaderContainer: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  scrollHeaderImage: {
    width: '100%',
    height: 180,
    marginLeft: 0,
    marginRight: 0,
  },
  hamburgerInHeaderScroll: {
    position: 'absolute',
    top: 32,
    left: 20,
    backgroundColor: '#f0e6c2',
    borderRadius: 8,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fullWidthButton: {
    width: '100%',
    backgroundColor: '#f28914',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionBlock: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    zIndex: 100,
  },
  sectionLabel: {
    fontWeight: 'bold',
    color: '#f28914',
    fontSize: 18,
    marginBottom: 8,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 200,
  },
  recipientDropdown: {
    borderColor: '#f28914',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 40,
    marginBottom: 0,
    zIndex: 3000,
  },
  recipientDropdownContainer: {
    backgroundColor: '#fff',
    borderColor: '#f28914',
    maxHeight: 200,
    zIndex: 4000,
  },
  recipientDropdownItem: {
    height: 40,
    backgroundColor: '#fff',
  },
  recipientDropdownText: {
    color: '#222',
    fontWeight: '500',
    fontSize: 16,
  },
  recipientIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  aiPrompt: {
    color: '#888',
    fontSize: 15,
    marginRight: 8,
  },
  aiButton: {
    width: 150,
    paddingHorizontal: 0,
    height: 56,
    justifyContent: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f28914',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: '#f28914',
    backgroundColor: '#f28914',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  radioLabel: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
});