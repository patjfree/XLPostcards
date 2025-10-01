import { useState, useEffect, useRef } from 'react';
import { Image, StyleSheet, Platform, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, View, KeyboardAvoidingView, Modal, Pressable, Text } from 'react-native';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { PostcardSize } from '@/utils/printSpecs';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';

import AIDisclaimer from '../components/AIDisclaimer';
import TemplateSelector, { TemplateType } from '../components/TemplateSelector';
import { SelectedImage } from '../components/MultiImagePicker';
import SpotlightBox, { SpotlightRect } from '../../components/SpotlightBox';

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
  RETURN_ADDRESS: 'settings_return_address',
  INCLUDE_RETURN_ADDRESS: 'settings_include_return_address',
  EMAIL: 'settings_email',
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



const templateRequirements = {
  single: 1,
  two_side_by_side: 2,
  three_photos: 3,
  four_quarters: 4,
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [isCreatingPostcard, setIsCreatingPostcard] = useState(false);
  const [postcardProgress, setPostcardProgress] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [templateType, setTemplateType] = useState<TemplateType>('single');
  const userChangedTemplate = React.useRef(false);
  
  // Spotlight state for hamburger highlighting
  const hamburgerRef = useRef<View>(null);
  const [spot, setSpot] = useState<SpotlightRect | null>(null);
  const [showSpotlight, setShowSpotlight] = useState(false);

  // Handle template change with smart photo management
  const handleTemplateChange = (newTemplate: TemplateType) => {
    console.log('[TEMPLATE] User manually changing template from', templateType, 'to', newTemplate);
    const newRequiredImages = templateRequirements[newTemplate];
    
    if (images.length > newRequiredImages) {
      // Keep only the photos that fit the new template
      const trimmedImages = images.slice(0, newRequiredImages);
      setImages(trimmedImages);
      console.log('[TEMPLATE] Trimmed images from', images.length, 'to', newRequiredImages);
    }
    
    setTemplateType(newTemplate);
    userChangedTemplate.current = true; // Mark that user manually changed template
    console.log('[TEMPLATE] Set userChangedTemplate to true');
  };

  // Function to show hamburger spotlight
  const showHamburgerSpotlight = () => {
    setTimeout(() => {
      hamburgerRef.current?.measureInWindow((x, y, w, h) => {
        // Add Android-specific offset to lower the highlight box
        const androidOffset = Platform.OS === 'android' ? 55 : 0;
        setSpot({ x, y: y + androidOffset, w, h });
        setShowSpotlight(true);
      });
    }, 100);
  };
  const [postcardMessage, setPostcardMessage] = useState('');
  const [signatureBlock, setSignatureBlock] = useState('');
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const messageInputRef = useRef<TextInput>(null);
  
  // Expose drawer control functions globally for tour
  useEffect(() => {
    (global as any).openDrawer = () => navigation.openDrawer();
    (global as any).closeDrawer = () => navigation.closeDrawer();
    // Expose spotlight function for manual restart
    (global as any).showHamburgerSpotlight = showHamburgerSpotlight;
    // Expose scroll function for tour
    (global as any).scrollToSelectRecipient = () => {
      if (scrollViewRef.current) {
        console.log('[SCROLL] Scrolling to Select Recipient section');
        scrollViewRef.current.scrollTo({ y: 800, animated: true });
      }
    };
    return () => {
      delete (global as any).openDrawer;
      delete (global as any).closeDrawer;
      delete (global as any).showHamburgerSpotlight;
      delete (global as any).scrollToSelectRecipient;
    };
  }, [navigation]);

  // Show spotlight on first launch
  useEffect(() => {
    const checkAndShowSpotlight = async () => {
      try {
        const { TourStorageService } = await import('../../src/services/tourStorage');
        const shouldShow = await TourStorageService.shouldShowTour();
        if (shouldShow) {
          setTimeout(() => {
            showHamburgerSpotlight();
          }, 1000); // Wait for layout to settle
        }
      } catch (error) {
        console.log('[SPOTLIGHT] Error checking tour state:', error);
      }
    };
    
    checkAndShowSpotlight();
  }, []);

  // Load signature block from settings
  useEffect(() => {
    const loadSignature = async () => {
      try {
        const savedSignature = await AsyncStorage.getItem(SETTINGS_KEYS.SIGNATURE);
        setSignatureBlock(savedSignature || '');
      } catch (error) {
        console.log('[SIGNATURE] Error loading signature:', error);
      }
    };
    
    loadSignature();
  }, []);

  // Auto-populate message with salutation and signature
  useEffect(() => {
    console.log('[SALUTATION] Auto-populate effect triggered');
    console.log('[SALUTATION] selectedAddressId:', selectedAddressId);
    console.log('[SALUTATION] addresses length:', addresses.length);
    console.log('[SALUTATION] signatureBlock:', signatureBlock);
    console.log('[SALUTATION] current postcardMessage:', postcardMessage);
    
    // Don't proceed if no address selected
    if (!selectedAddressId) {
      console.log('[SALUTATION] Skipping - no address selected');
      return;
    }
    
    // If addresses not loaded yet, trigger loading
    if (addresses.length === 0) {
      console.log('[SALUTATION] Addresses not loaded yet, triggering load');
      loadAddresses();
      return;
    }
    
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    console.log('[SALUTATION] selectedAddress:', selectedAddress);
    
    const salutation = selectedAddress?.salutation || '';
    console.log('[SALUTATION] extracted salutation:', salutation);
    
    // Check if we need to add/update salutation or signature
    const messageLines = postcardMessage.split('\n');
    console.log('[SALUTATION] messageLines:', messageLines);
    console.log('[SALUTATION] messageLines count:', messageLines.length);
    console.log('[SALUTATION] signatureBlock to search for:', signatureBlock);
    
    // Check for signature presence more robustly
    let hasSignature = false;
    if (signatureBlock) {
      const signatureLines = signatureBlock.split('\n').map(line => line.trim());
      // Check if all signature lines are present in the message
      hasSignature = signatureLines.every(sigLine => 
        sigLine === '' || messageLines.some(msgLine => msgLine.trim() === sigLine)
      );
    }
    
    const hasSalutation = salutation && messageLines.some(line => line.trim() === salutation.trim());
    
    // Check if message has a different salutation (from a different recipient)
    const hasWrongSalutation = postcardMessage.trim() && salutation && !hasSalutation && 
      messageLines.length > 0 && messageLines[0].trim().endsWith(',');
    
    console.log('[SALUTATION] Looking for signature lines:');
    if (signatureBlock) {
      const signatureLines = signatureBlock.split('\n');
      signatureLines.forEach((sigLine, idx) => {
        console.log(`[SALUTATION] Signature line ${idx}: "${sigLine}"`);
        const found = messageLines.some(line => line.trim() === sigLine.trim());
        console.log(`[SALUTATION] Found signature line ${idx} in message:`, found);
      });
    }
    
    console.log('[SALUTATION] hasSignature:', hasSignature);
    console.log('[SALUTATION] hasSalutation:', hasSalutation);
    console.log('[SALUTATION] hasWrongSalutation:', hasWrongSalutation);
    console.log('[SALUTATION] message is empty:', !postcardMessage.trim());
    console.log('[SALUTATION] salutation exists but not in message:', salutation && !hasSalutation);
    console.log('[SALUTATION] signature exists but not in message:', signatureBlock && !hasSignature);
    
    // If message is empty or missing components, populate them
    // Also populate if we just selected a new address with a salutation, or if wrong salutation
    const shouldPopulate = !postcardMessage.trim() || (salutation && !hasSalutation) || (signatureBlock && !hasSignature) || hasWrongSalutation;
    console.log('[SALUTATION] Should populate:', shouldPopulate);
    
    if (shouldPopulate) {
      console.log('[SALUTATION] Conditions met, will populate message');
      let newMessage = '';
      let cursorPosition = 0;
      
      // Handle salutation
      if (salutation) {
        if (hasWrongSalutation) {
          // Replace wrong salutation - skip the first line and start with correct salutation
          console.log('[SALUTATION] Replacing wrong salutation');
          newMessage += salutation + '\n\n';
          cursorPosition = newMessage.length;
          // Add content after the first line (skip wrong salutation)
          const contentAfterWrongSalutation = messageLines.slice(1).join('\n');
          if (contentAfterWrongSalutation.trim()) {
            newMessage += contentAfterWrongSalutation;
          }
        } else if (!hasSalutation) {
          // Add missing salutation
          console.log('[SALUTATION] Adding missing salutation');
          newMessage += salutation + '\n\n';
          cursorPosition = newMessage.length;
        } else {
          // Salutation already correct, preserve existing structure
          console.log('[SALUTATION] Salutation already correct, preserving structure');
          const salutationIndex = messageLines.findIndex(line => line.trim() === salutation.trim());
          if (salutationIndex >= 0) {
            newMessage += messageLines.slice(0, salutationIndex + 1).join('\n') + '\n\n';
            cursorPosition = newMessage.length;
          }
        }
      }
      
      // Add space for user to type their message if not already present
      if (!newMessage.includes('\n\n\n')) {
        newMessage += '\n';
      }
      
      // Add signature if needed
      if (signatureBlock && !hasSignature) {
        newMessage += '\n' + signatureBlock;
      } else if (hasSignature) {
        // Find and preserve existing signature location
        const signatureIndex = messageLines.findIndex(line => line.trim() === signatureBlock.trim());
        if (signatureIndex >= 0) {
          const beforeSignature = messageLines.slice(0, signatureIndex).join('\n');
          newMessage = beforeSignature + '\n' + signatureBlock;
        }
      }
      
      console.log('[SALUTATION] Setting new message:', newMessage);
      console.log('[SALUTATION] New message length:', newMessage.length);
      console.log('[SALUTATION] Cursor position will be:', cursorPosition);
      
      setPostcardMessage(newMessage);
      
      // Set cursor position between salutation and signature
      setTimeout(() => {
        if (messageInputRef.current && cursorPosition > 0) {
          console.log('[SALUTATION] Setting cursor position to:', cursorPosition);
          messageInputRef.current.focus();
          messageInputRef.current.setSelection(cursorPosition, cursorPosition);
        }
      }, 100);
    } else {
      console.log('[SALUTATION] No changes needed to message');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId, signatureBlock, addresses]);

  // Handle spotlight dismiss
  const handleSpotlightDismiss = async () => {
    setShowSpotlight(false);
    try {
      const { TourStorageService } = await import('../../src/services/tourStorage');
      await TourStorageService.markTourCompleted();
      console.log('[SPOTLIGHT] Tour marked as completed');
      
      // Auto-reset the app after first-time tour to ensure proper state initialization
      console.log('[SPOTLIGHT] Auto-resetting app state after first launch tour...');
      
      // Reset all state variables directly (avoid navigation conflicts with spotlight dismissal)
      const resetState = () => {
        setImages([]);
        setTemplateType('single');
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
        userChangedTemplate.current = false;
        console.log('[SPOTLIGHT] State reset complete - Create Postcard should now work!');
      };
      
      // Execute state reset immediately
      resetState();
      
      // Also schedule a backup reset to ensure it sticks
      setTimeout(resetState, 100);
      
    } catch (error) {
      console.log('[SPOTLIGHT] Error marking tour completed:', error);
    }
  };

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

    // Handle multiple images from params
    if ((params.imageUris || params.imageUri) && !imageSetFromParams.current) {
      console.log('[XLPOSTCARDS][MAIN] Processing images from params');
      try {
        if (params.imageUris) {
          // Handle multiple images
          const imageUris = JSON.parse(params.imageUris as string);
          console.log('[XLPOSTCARDS][MAIN] Setting multiple images:', imageUris.length);
          const processedImages: SelectedImage[] = [];
          
          for (const imageUri of imageUris) {
            const processed = await processImageForPostcard(imageUri);
            const newImage: SelectedImage = { 
              uri: processed.path,
              width: processed.width,
              height: processed.height,
              base64: processed.data || undefined,
              type: 'image',
              fileName: processed.filename || '',
              fileSize: processed.size || 0,
              assetId: '',
            };
            processedImages.push(newImage);
          }
          setImages(processedImages);
        } else if (params.imageUri) {
          // Handle single image (legacy)
          console.log('[XLPOSTCARDS][MAIN] Setting single image with URI:', params.imageUri);
          const processed = await processImageForPostcard(params.imageUri as string);
          const newImage: SelectedImage = { 
            uri: processed.path,
            width: processed.width,
            height: processed.height,
            base64: processed.data || undefined,
            type: 'image',
            fileName: processed.filename || '',
            fileSize: processed.size || 0,
            assetId: '',
          };
          setImages([newImage]);
        }
        imageSetFromParams.current = true;
      } catch (error: unknown) {
        console.error('[XLPOSTCARDS][MAIN] Error processing images from params:', error);
        // Fallback to single image if processing fails
        if (params.imageUri) {
          const fallbackImage: SelectedImage = { 
            uri: params.imageUri as string,
            width: 0,
            height: 0,
            type: 'image',
            fileName: '',
            fileSize: 0,
            assetId: '',
          };
          setImages([fallbackImage]);
          imageSetFromParams.current = true;
        }
      }
    }

    // Process template type (only if user hasn't manually changed it)
    console.log('[XLPOSTCARDS][MAIN] Template processing - params.templateType:', params.templateType, 'current templateType:', templateType, 'userChangedTemplate:', userChangedTemplate.current);
    
    if (params.templateType && params.templateType !== templateType && !userChangedTemplate.current) {
      console.log('[XLPOSTCARDS][MAIN] Setting template type from params:', params.templateType);
      setTemplateType(params.templateType as TemplateType);
    } else if (params.templateType && userChangedTemplate.current) {
      console.log('[XLPOSTCARDS][MAIN] Ignoring template type from params, user has manually changed template');
    } else if (params.templateType === templateType) {
      console.log('[XLPOSTCARDS][MAIN] Template type from params matches current, no change needed');
    } else if (!params.templateType) {
      console.log('[XLPOSTCARDS][MAIN] No template type in params');
    }

    // Process message
    if (params.message && !hasUserEditedMessage) {
      // Check if current message already has the correct salutation for selected recipient
      const selectedAddress = addresses.find(a => a.id === selectedAddressId);
      const expectedSalutation = selectedAddress?.salutation || '';
      const currentMessageHasCorrectSalutation = expectedSalutation && 
        postcardMessage.split('\n').some(line => line.trim() === expectedSalutation.trim());
      
      // Only set message from params if current message doesn't have the right salutation
      if (!currentMessageHasCorrectSalutation) {
        console.log('[XLPOSTCARDS][MAIN] Setting message:', params.message);
        setPostcardMessage(params.message as string);
      } else {
        console.log('[XLPOSTCARDS][MAIN] Skipping message update - current message has correct salutation');
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps  
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



  // Function to analyze the image with OpenAI
  const analyzeImage = async () => {
    console.log('[AI] Starting analyzeImage function');
    console.log('[AI] OpenAI API Key available:', !!openaiApiKey);
    console.log('[AI] OpenAI API Key first 10 chars:', openaiApiKey?.substring(0, 10));
    
    if (!openaiApiKey) {
      console.log('[AI] No OpenAI API key available');
      Alert.alert('Error', 'OpenAI API key not configured.');
      return;
    }
    
    if (!openaiApiKey.startsWith('sk-')) {
      console.log('[AI] Invalid OpenAI API key format');
      Alert.alert('Error', 'Invalid OpenAI API key format.');
      return;
    }
    
    if (!images.length) {
      console.log('[AI] No images found, showing alert');
      Alert.alert('No image', 'Please select a photo first.');
      return;
    }
    
    console.log('[AI] Images array length:', images.length);
    console.log('[AI] Images details:', images.map((img, idx) => ({
      index: idx,
      uri: img.uri?.substring(0, 50) + '...',
      hasBase64: !!img.base64,
      base64Length: img.base64?.length || 0
    })));
    
    const selected = addresses.find(a => a.id === selectedAddressId);
    const salutation = selected?.salutation || '';
    console.log('[AI] Selected address:', selected);
    console.log('[AI] Found salutation:', salutation);
    console.log('[AI] Setting loading to true');
    setLoading(true);
    try {
      // Prepare images with base64 validation
      console.log('Analyzing images:', images.map(img => ({ 
        uri: img.uri?.substring(0, 50) + '...', 
        hasBase64: !!img.base64,
        base64Length: img.base64?.length || 0,
        allKeys: Object.keys(img)
      })));
      
      let validImages = images.filter(img => img.base64).slice(0, 4); // Max 4 images for API efficiency
      
      console.log(`Found ${validImages.length} valid images out of ${images.length} total`);
      
      // If no valid images, try to regenerate base64 for all images
      if (validImages.length === 0) {
        console.log('No valid images found, attempting to regenerate base64 for all images...');
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img.uri && !img.base64) {
            try {
              console.log(`Regenerating base64 for image ${i}: ${img.uri.substring(0, 50)}...`);
              const result = await ImageManipulator.manipulateAsync(
                img.uri,
                [],
                {
                  compress: 0.8,
                  format: ImageManipulator.SaveFormat.JPEG,
                  base64: true,
                }
              );
              
              if (result.base64) {
                // Update the image in the images array
                img.base64 = result.base64;
                console.log(`Successfully generated base64 for image ${i}, length: ${result.base64.length}`);
              }
            } catch (error) {
              console.error(`Failed to generate base64 for image ${i}:`, error);
            }
          }
        }
        
        // Re-filter for valid images
        validImages = images.filter(img => img.base64).slice(0, 4);
        console.log(`After regeneration: ${validImages.length} valid images out of ${images.length} total`);
      }
      
      if (validImages.length === 0) {
        Alert.alert('Image Error', 'No valid images with data found. Please try selecting photos again.');
        return;
      }

      // Create template-aware prompt based on selected template and number of images
      let promptText = `Write a friendly, engaging postcard message (max ${postcardSize === 'regular' ? 60 : 100} words) based on `;
      
      if (validImages.length === 1) {
        promptText += 'the attached photo.';
      } else {
        promptText += `the ${validImages.length} attached photos. `;
        if (templateType === 'two_side_by_side') {
          promptText += 'These photos are arranged side-by-side, so consider their relationship or contrast.';
        } else if (templateType === 'three_photos') {
          promptText += 'These photos create a story or collection, so weave them together in your message.';
        } else if (templateType === 'four_quarters') {
          promptText += 'These photos form a collage of memories, so create a unified message about the collection.';
        } else {
          promptText += 'Consider how these photos work together to tell a story.';
        }
      }

      // Extract any existing message content between salutation and signature
      let existingContent = '';
      if (postcardMessage) {
        const lines = postcardMessage.split('\n');
        let startIndex = 0;
        let endIndex = lines.length;
        
        // Find where salutation ends (skip salutation and empty lines)
        if (salutation) {
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === salutation.trim()) {
              startIndex = i + 1;
              // Skip empty lines after salutation
              while (startIndex < lines.length && lines[startIndex].trim() === '') {
                startIndex++;
              }
              break;
            }
          }
        }
        
        // Find where signature starts (working backwards)
        if (signatureBlock) {
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() === signatureBlock.trim()) {
              endIndex = i;
              // Skip empty lines before signature
              while (endIndex > 0 && lines[endIndex - 1].trim() === '') {
                endIndex--;
              }
              break;
            }
          }
        }
        
        // Extract content between salutation and signature
        if (startIndex < endIndex) {
          existingContent = lines.slice(startIndex, endIndex).join('\n').trim();
        }
      }
      
      if (existingContent) {
        promptText += ` Here are some hints or ideas: ${existingContent}`;
      }
      
      promptText += ` Write it in a casual, personal tone, like a real postcard. Write ONLY the main message content - no salutation or signature.`;

      // Create content array with text and all valid images
      const contentArray = [
        { type: 'text', text: promptText },
        ...validImages.map(img => ({
          type: 'image_url',
          image_url: { 
            url: `data:image/jpeg;base64,${img.base64}`,
            detail: 'low' // Use 'low' detail to save tokens while still getting good analysis
          }
        }))
      ];

      console.log('[AI] About to call OpenAI API');
      console.log('[AI] Content array length:', contentArray.length);
      console.log('[AI] Content array structure:', contentArray.map((item, idx) => ({
        index: idx,
        type: item.type,
        hasImageUrl: item.type === 'image_url' ? !!item.image_url : false,
        textLength: item.type === 'text' ? item.text?.length : 0
      })));
      
      // Call OpenAI API
      console.log('[AI] Making fetch request to OpenAI');
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
              content: contentArray
            }
          ],
          max_tokens: 400
        })
      });
      
      console.log('[AI] Response status:', response.status);
      console.log('[AI] Response ok:', response.ok);
      
      const data = await response.json();
      console.log('[AI] Response data keys:', Object.keys(data));
      console.log('[AI] Response data:', data);
      
      if (data.error) {
        console.log('[AI] API returned error:', data.error);
        throw new Error(data.error.message || 'Error analyzing image');
      }
      // Get the paragraph from the response
      console.log('[AI] Extracting content from response');
      console.log('[AI] data.choices length:', data.choices?.length || 0);
      console.log('[AI] First choice:', data.choices?.[0]);
      
      const aiContent = data.choices[0].message.content;
      console.log('[AI] AI generated content:', aiContent);
      console.log('[AI] AI content length:', aiContent?.length || 0);
      
      // Construct the full message with salutation and signature
      console.log('[AI] Constructing full message');
      console.log('[AI] Current salutation:', salutation);
      console.log('[AI] Current signatureBlock:', signatureBlock);
      
      let fullMessage = '';
      
      if (salutation) {
        fullMessage += salutation + '\n\n';
        console.log('[AI] Added salutation to message');
      }
      
      fullMessage += aiContent;
      console.log('[AI] Added AI content to message');
      
      if (signatureBlock) {
        fullMessage += '\n\n' + signatureBlock;
        console.log('[AI] Added signature to message');
      }
      
      console.log('[AI] Final message to set:', fullMessage);
      console.log('[AI] Final message length:', fullMessage.length);
      
      setPostcardMessage(fullMessage);
      setIsAIGenerated(true);
      console.log('[AI] Successfully set message and AI generated flag');
    } catch (error) {
      console.error('[AI] Error analyzing images:', error);
      console.error('[AI] Error details:', {
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name
      });
      Alert.alert('Error', 'Failed to analyze images. Check console for details.');
    } finally {
      console.log('[AI] Setting loading to false');
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
  const handleCreatePostcard = async () => {
    console.log('[BUTTON] Create Postcard button pressed!');
    console.log('[BUTTON] Images count:', images.length);
    console.log('[BUTTON] Template type:', templateType);
    console.log('[BUTTON] Message length:', postcardMessage.length);
    console.log('[BUTTON] Is creating:', isCreatingPostcard);
    
    const requiredImages = templateRequirements[templateType];
    if (images.length < requiredImages) {
      console.log('[BUTTON] Not enough images:', images.length, 'required:', requiredImages);
      Alert.alert('Not enough photos', `Please select ${requiredImages} photo${requiredImages > 1 ? 's' : ''} for the ${templateType.replace('_', ' ')} template.`);
      return;
    }
    if (!postcardMessage) {
      console.log('[BUTTON] No message entered');
      Alert.alert('No message', 'Please enter a message.');
      return;
    }
    
    // Prevent multiple clicks
    if (isCreatingPostcard) {
      console.log('[BUTTON] Already creating postcard, ignoring click');
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
    
    // Force reset any lingering modal states that might prevent navigation
    setShowAddressModal(false);
    setStateDropdownOpen(false);
    setEditingAddressId(null);
    setShowValidationOptions(false);
    setShowUSPSNote(false);
    
    setTimeout(async () => {
      // Simplified check - just ensure we're not in the middle of creating a postcard
      if (!isCreatingPostcard) {
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
        
        // Start loading state
        setIsCreatingPostcard(true);
        setPostcardProgress('Preparing your postcard...');
        
        // Get return address settings and generate Railway preview
        let returnAddressText = '';
        try {
          const [savedReturnAddress, savedIncludeReturnAddress, savedUserEmail] = await Promise.all([
            AsyncStorage.getItem(SETTINGS_KEYS.RETURN_ADDRESS),
            AsyncStorage.getItem(SETTINGS_KEYS.INCLUDE_RETURN_ADDRESS),
            AsyncStorage.getItem(SETTINGS_KEYS.EMAIL),
          ]);
          const includeReturnAddress = savedIncludeReturnAddress === 'true';
          returnAddressText = includeReturnAddress ? (savedReturnAddress || '') : '';
          
          // Generate Railway preview before navigation
          setPostcardProgress('Uploading your images...');
          
            console.log('[RAILWAY] Generating preview for postcard...');
            const railwayBaseUrl = Constants.expoConfig?.extra?.railwayPostcardUrl || 'https://postcardservice-production.up.railway.app';
            const railwayUrl = `${railwayBaseUrl}/generate-complete-postcard`;
            
            // Generate real transaction ID for the postcard
            require('react-native-get-random-values');
            const { v4: uuidv4 } = require('uuid');
            const transactionId = uuidv4();
            
            // Upload all images to Cloudinary before sending to Railway
            console.log('[RAILWAY] Uploading images to Cloudinary...');
            const frontImageCloudinaryUrls: string[] = [];
            
            for (let i = 0; i < images.length; i++) {
              setPostcardProgress(`Uploading image ${i + 1} of ${images.length}...`);
              const imageUrl = await uploadToCloudinary(
                images[i].uri,
                `postcard-front-${transactionId}-${i}`
              );
              frontImageCloudinaryUrls.push(imageUrl);
              console.log(`[RAILWAY] Image ${i + 1} uploaded successfully:`, imageUrl);
            }
            
            const railwayPayload = {
              message: postcardMessage,
              recipientInfo,
              postcardSize,
              returnAddressText,
              transactionId: transactionId,
              frontImageUri: frontImageCloudinaryUrls[0], // Legacy single image support
              frontImageUris: frontImageCloudinaryUrls, // New multi-image support
              templateType,
              userEmail: savedUserEmail || '',
            };
            
            console.log('[RAILWAY] Using real transaction ID:', transactionId);
            
            console.log('[RAILWAY] User email from settings:', savedUserEmail);
            
            setPostcardProgress('Creating your postcard template...');
            
            const railwayResponse = await fetch(railwayUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(railwayPayload),
            });
            
            if (railwayResponse.ok) {
              const railwayResult = await railwayResponse.json();
              console.log('[RAILWAY] Preview generated successfully:', railwayResult);
              console.log('[RAILWAY] Front URL:', railwayResult.frontUrl);
              console.log('[RAILWAY] Back URL:', railwayResult.backUrl);
              console.log('[RAILWAY] Status:', railwayResult.status);
              
              setPostcardProgress('Opening preview...');
              
              // Reset loading state
              setIsCreatingPostcard(false);
              setPostcardProgress('');
              
              // Navigate with Railway URLs and transaction ID
              router.push({
                pathname: '/postcard-preview',
                params: {
                  imageUri: images[0].uri, // Pass first image for compatibility
                  imageUris: JSON.stringify(images.map(img => img.uri)), // Pass all images
                  message: postcardMessage,
                  returnAddress: returnAddressText,
                  recipient: JSON.stringify(recipientInfo),
                  postcardSize,
                  railwayBackUrl: railwayResult.backUrl,
                  railwayFrontUrl: railwayResult.frontUrl,
                  transactionId: transactionId,
                  templateType,
                },
              });
              console.log('[RAILWAY] Navigation with back URL:', railwayResult.backUrl);
            } else {
              console.error('[RAILWAY] Preview generation failed, proceeding without Railway preview');
              
              // Reset loading state
              setIsCreatingPostcard(false);
              setPostcardProgress('');
              
              // Navigate without Railway URL (fallback to local rendering)
              router.push({
                pathname: '/postcard-preview',
                params: {
                  imageUri: images[0].uri,
                  imageUris: JSON.stringify(images.map(img => img.uri)),
                  message: postcardMessage,
                  returnAddress: returnAddressText,
                  recipient: JSON.stringify(recipientInfo),
                  postcardSize,
                  templateType,
                },
              });
            }
          } catch (error) {
            console.error('[RAILWAY] Preview generation error:', error);
            
            // Reset loading state
            setIsCreatingPostcard(false);
            setPostcardProgress('');
            
            // Navigate without Railway URL (fallback to local rendering)
            router.push({
              pathname: '/postcard-preview',
              params: {
                imageUri: images[0].uri,
                imageUris: JSON.stringify(images.map(img => img.uri)),
                message: postcardMessage,
                returnAddress: returnAddressText,
                recipient: JSON.stringify(recipientInfo),
                postcardSize,
                templateType,
              },
            });
          }
      } else {
        console.warn('[XLPOSTCARDS][MAIN] Not navigating: already creating postcard!');
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
        
        // Ensure the newly created address is selected
        if (newId) {
          setSelectedAddressId(newId);
        }
        
        // Reset all modal states to ensure button functionality
        setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
        setEditingAddressId(null);
        setAddressValidationStatus('idle');
        setAddressValidationMessage('');
        setCorrectedAddress(null);
        setShowValidationOptions(false);
        setShowUSPSNote(false);
        setStateDropdownOpen(false);
        setShowAddressModal(false);
        
        await loadAddresses();
        
        // Navigate to main screen with new/edited address selected
        router.replace({ pathname: '/', params: { selectedRecipientId: newId, imageUri: images[0]?.uri, imageUris: JSON.stringify(images.map(img => img.uri)), templateType, message: postcardMessage } });
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
        
        // Ensure the newly created address is selected
        if (newId) {
          setSelectedAddressId(newId);
        }
        
        // Reset all modal states to ensure button functionality
        setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
        setEditingAddressId(null);
        setAddressValidationStatus('idle');
        setAddressValidationMessage('');
        setCorrectedAddress(null);
        setShowValidationOptions(false);
        setShowUSPSNote(false);
        setStateDropdownOpen(false);
        setShowAddressModal(false);
        
        await loadAddresses();
        
        // Navigate to main screen with new/edited address selected
        router.replace({ pathname: '/', params: { selectedRecipientId: newId, imageUri: images[0]?.uri, imageUris: JSON.stringify(images.map(img => img.uri)), templateType, message: postcardMessage } });
      }
    };
    handleAddressCorrection();
  }, [params.useCorrectedAddress, params.useOriginalAddress, params.correctedAddress, params.originalAddress, editingAddressId, images, postcardMessage, templateType, router]);

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
    // Only clear editingAddressId if we're not editing an address
    if (!shouldShow && !params.editAddressId) {
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
        
        // Ensure the newly created address is selected
        if (newId) {
          setSelectedAddressId(newId);
        }
        
        // Reset all modal states to ensure button functionality
        setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
        setShowAddressModal(false);
        setEditingAddressId(null);
        setAddressValidationStatus('idle');
        setAddressValidationMessage('');
        setCorrectedAddress(null);
        setShowUSPSNote(true);
        setShowValidationOptions(false);
        setStateDropdownOpen(false);
        
        await loadAddresses();
        
        // Navigate to main screen with new/edited address selected
        router.replace({ pathname: '/', params: { selectedRecipientId: newId, imageUri: images[0]?.uri, imageUris: JSON.stringify(images.map(img => img.uri)), templateType, message: postcardMessage } });
        return;
      } else {
        // Navigate to address correction screen
        router.push({
          pathname: '/address-correction',
          params: {
            originalAddress: JSON.stringify(addressToSave),
            correctedAddress: JSON.stringify(corrected),
            imageUri: images[0]?.uri,
            imageUris: JSON.stringify(images.map(img => img.uri)),
            templateType,
            message: postcardMessage,
            postcardSize
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
      
      // Ensure the newly created address is selected
      if (newId) {
        setSelectedAddressId(newId);
        console.log('[ADDRESS] New address created and selected:', newId);
      }
      
      // Reset all modal states to ensure button functionality
      setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
      setShowAddressModal(false);
      setEditingAddressId(null);
      setAddressValidationStatus('idle');
      setAddressValidationMessage('');
      setCorrectedAddress(null);
      setShowUSPSNote(false);
      setShowValidationOptions(false);
      setStateDropdownOpen(false);
      
      await loadAddresses();
      
      // Navigate to main screen with new/edited address selected
      router.replace({ pathname: '/', params: { selectedRecipientId: newId, imageUri: images[0]?.uri, message: postcardMessage } });
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
    setImages([]);
    setTemplateType('single');
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
    userChangedTemplate.current = false; // Reset template change flag
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
        <View ref={hamburgerRef} style={styles.hamburgerInHeaderScroll}>
          <TouchableOpacity 
            style={{ 
              width: '100%', 
              height: '100%', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
            onPress={() => {
              console.log('[HAMBURGER] Button pressed');
              navigation.openDrawer();
            }}
            testID="hamburger-btn"
          >
            <Ionicons name="menu" size={28} color="#0a7ea4" />
          </TouchableOpacity>
        </View>
      </View>
      

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1, backgroundColor: '#fff', paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Remove the test modal button */}
        {/* Remove the teal XLPostcards title, but leave a space for layout balance */}
        <View style={{ height: 24 }} />

        {/* Template Selection with Built-in Photo Picker */}
        <View style={{ width: '100%' }}>
          <TemplateSelector
            selectedTemplate={templateType}
            onTemplateSelect={handleTemplateChange}
            images={images}
            onImagesChange={setImages}
          />
        </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>2) Select Postcard Size</Text>
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
              <Text style={styles.sectionLabel}>3) Select Recipient</Text>
              <TouchableOpacity
                style={[styles.fullWidthButton, { marginBottom: 8 }]}
                onPress={() => {
                  setCameFromSelectRecipient(true);
                  router.push({ 
                    pathname: '/select-recipient', 
                    params: { 
                      imageUri: images[0]?.uri, 
                      imageUris: JSON.stringify(images.map(img => img.uri)), 
                      templateType,
                      message: postcardMessage, 
                      postcardSize 
                    } 
                  });
                }}
                testID="select-recipient-btn"
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
          <Text style={styles.sectionLabel}>4) Write Message</Text>
          <View style={styles.messageInputContainer}>
            <TextInput
              ref={messageInputRef}
              style={[styles.input, styles.messageInput]}
              value={postcardMessage}
              onChangeText={text => { setPostcardMessage(text); setIsAIGenerated(false); setHasUserEditedMessage(true); }}
              multiline={true}
              numberOfLines={6}
              placeholder="Write your message here or put in some ideas and hit the 'Write for me' button below."
              placeholderTextColor="#888"
              autoFocus={false}
              blurOnSubmit={true}
              editable={!loading}
            />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#A1CEDC" />
              </View>
            )}
            <TouchableOpacity 
              style={[styles.submitButton, styles.aiButton, { minWidth: 180 }]}
              onPress={analyzeImage}
              testID="write-for-me-btn"
            >
              <Text style={[styles.buttonText, { fontSize: 18 }]}>Write for me</Text>
            </TouchableOpacity>
              </View>
            </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#fff',
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#f28914',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 1,
              elevation: 1,
            }}
            onPress={resetCard}
            accessibilityLabel="Reset postcard"
          >
            <Ionicons name="refresh-circle" size={24} color="#f28914" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <TouchableOpacity 
              style={[
                styles.submitButton,
                styles.createButton,
                { flex: 1, minWidth: 140 }
              ]}
              onPress={handleCreatePostcard}
              testID="create-postcard-btn"
            >
              {isCreatingPostcard ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.createButtonText}>Creating</Text>
                </View>
              ) : (
                <Text style={styles.createButtonText}>Create Postcard</Text>
              )}
            </TouchableOpacity>
            
            {/* Progress indicator next to button */}
            {isCreatingPostcard && postcardProgress && (
              <View style={{ flex: 1, paddingLeft: 8 }}>
                <Text style={{ fontSize: 13, color: '#666', flexWrap: 'wrap' }}>
                  {postcardProgress}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.formContainer}>
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 8 }}>
            Currently postcards can only be sent to the US
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 10, color: '#999', marginBottom: 4 }}>
            v{Constants.expoConfig?.version || 'Unknown'}
            {__DEV__ && Constants.expoConfig?.extra?.internalBuildNumber && (
              <Text style={{ fontSize: 9, color: '#666' }}> (build {Constants.expoConfig.extra.internalBuildNumber})</Text>
            )}
          </Text>
          {__DEV__ && (
            <Text style={{ textAlign: 'center', fontSize: 9, color: '#999', marginBottom: 8 }}>
              Simulator - Test cards okay
            </Text>
          )}
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
                      router.replace({ pathname: '/select-recipient', params: { imageUri: images[0]?.uri, imageUris: JSON.stringify(images.map(img => img.uri)), templateType, message: postcardMessage, postcardSize } });
                    } else {
                      // Clear all params that would cause modal to reopen
                      router.replace({ pathname: '/', params: { imageUri: images[0]?.uri, imageUris: JSON.stringify(images.map(img => img.uri)), templateType, message: postcardMessage } });
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

      {/* Custom Spotlight for hamburger button */}
      <SpotlightBox
        rect={spot}
        visible={showSpotlight}
        onDismiss={handleSpotlightDismiss}
        tip="Click here for settings and video tutorial."
      />
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