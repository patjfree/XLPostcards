import { useState, useEffect } from 'react';
import { Image, StyleSheet, Platform, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AIDisclaimer from './components/AIDisclaimer';

// Define types for our state variables
type ImageInfo = ImagePicker.ImagePickerAsset | null;
type LocationClue = string;

// Add type for recipient info
type RecipientInfo = {
  to: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
};

// Add valid US states and territories
const VALID_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'APO'
];

const styles = StyleSheet.create({
  titleContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  headerImage: {
    height: '100%',
    width: '100%',
    position: 'absolute',
    opacity: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  analyzeButtonsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    padding: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 22,
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
  spinner: {
    marginTop: 10,
  },
  cluesContainer: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  paragraphText: {
    marginTop: 10,
    lineHeight: 22,
    fontSize: 15,
  },
  formContainer: {
    marginBottom: 20,
  },
  label: {
    marginTop: 10,
    marginBottom: 5,
    fontWeight: '500',
  },
  sublabel: {
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '400',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.23)',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
    marginBottom: 12,
    color: 'black',
    backgroundColor: 'white',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
    borderColor: '#ddd',
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  cityStateContainer: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#0a7ea4',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
    marginTop: 0,
    lineHeight: 22,
    fontSize: 15,
    color: 'black',
    backgroundColor: 'white',
  },
  messageSection: {
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
  },
  recipientSection: {
    marginTop: 0,
    marginBottom: 8,
    padding: 4,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [locationClues, setLocationClues] = useState<string[]>([]);
  const [postcardMessage, setPostcardMessage] = useState('');
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState({
    to: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'United States',
  });
  const [stateError, setStateError] = useState('');
  const [zipcodeError, setZipcodeError] = useState('');
  const [isStateValid, setIsStateValid] = useState(false);
  const [isZipcodeValid, setIsZipcodeValid] = useState(false);

  const router = useRouter();

  // Request permissions on component mount
  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert('Permissions needed', 'Camera and photo library permissions are required to use this app.');
      }
    })();
  }, []);

  // Function to pick an image from the gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [3, 2], // 6:4 ratio for postcard
      quality: 1,
      mediaTypes: 'images',
      base64: true,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      allowsMultipleSelection: false,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      setLocationClues([]);
    }
  };

  // Function to take a photo with the camera
  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 2], // 6:4 ratio for postcard
      quality: 0.7,
      base64: true,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      allowsMultipleSelection: false,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      setLocationClues([]);
    }
  };

  // Function to analyze the image with OpenAI
  const analyzeImage = async () => {
    if (!image) {
      Alert.alert('No image', 'Please select a photo first.');
      return;
    }

    setLoading(true);
    try {
      // Make sure base64 property exists
      if (!image.base64) {
        throw new Error('Image base64 data is missing');
      }

      const base64Image = `data:image/jpeg;base64,${image.base64}`;
      
      // Get API key from Expo Constants
      const apiKey = Constants.expoConfig?.extra?.openaiApiKey;
      
      if (!apiKey) {
        console.log('[NANAGRAM][HOME] Config:', Constants.expoConfig?.extra);  // Add debug logging
        throw new Error('OpenAI API key not found');
      }

      const promptText = "I am uploading a photo, and I want you to write a short (maximum 60 words), engaging postcard message based on it. Write it in a casual, friendly tone like a real postcard. Include interesting details about the location, sights, sounds, and atmosphere. If you can identify the place, mention it naturally in the message. Keep it personal and conversational, like a real postcard to a friend or family member. Start with two empty lines.";
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
          max_tokens: 300
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Error analyzing image');
      }

      // Get the paragraph from the response
      const content = data.choices[0].message.content;
      
      // Split by newlines to handle possible multi-paragraph responses
      const paragraphs = content.split('\n\n').filter((p: string) => p.trim().length > 0);
      setLocationClues(paragraphs);
      setPostcardMessage(paragraphs.join('\n\n'));
      setIsAIGenerated(true);
      
    } catch (error: unknown) {
      console.error('[NANAGRAM][HOME] Error analyzing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to analyze image: ${errorMessage}`);
      setLocationClues(['Failed to analyze image. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  // Add validation functions
  const validateState = (state: string): boolean => {
    const upperState = state.toUpperCase();
    if (!VALID_STATES.includes(upperState)) {
      setStateError('Invalid 2-letter state code');
      return false;
    }
    setStateError('');
    return true;
  };

  const validateZipcode = (zipcode: string): boolean => {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipcode)) {
      setZipcodeError('Please enter a valid 5 or 9-digit zipcode');
      return false;
    }
    setZipcodeError('');
    return true;
  };

  // Update handleRecipientChange to remove validation
  const handleRecipientChange = (field: string, value: string | boolean) => {
    setRecipientInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add new validation handler for blur events
  const handleFieldBlur = (field: string) => {
    if (field === 'state') {
      setIsStateValid(validateState(recipientInfo.state));
    } else if (field === 'zipcode') {
      setIsZipcodeValid(validateZipcode(recipientInfo.zipcode));
    }
  };

  // Add address parser function
  const parseAddress = (fullAddress: string) => {
    // Remove "United States" if present
    fullAddress = fullAddress.replace(/United States$/i, '').trim();
    
    // Match for zipcode at the end
    const zipcodeMatch = fullAddress.match(/\s+(\d{5}(?:-\d{4})?)\s*$/);
    const zipcode = zipcodeMatch ? zipcodeMatch[1] : '';
    
    // Remove zipcode from address
    let remaining = fullAddress.replace(/\s+\d{5}(?:-\d{4})?\s*$/, '').trim();
    
    // Match for state abbreviation before zipcode
    const stateMatch = remaining.match(/\s+([A-Z]{2})\s*$/i);
    const state = stateMatch ? stateMatch[1].toUpperCase() : '';
    
    // Remove state from remaining
    remaining = remaining.replace(/\s+[A-Z]{2}\s*$/i, '').trim();

    // If there's a comma, use that to split city
    const lastCommaIndex = remaining.lastIndexOf(',');
    if (lastCommaIndex !== -1) {
      const city = remaining.substring(lastCommaIndex + 1).trim();
      const streetAddress = remaining.substring(0, lastCommaIndex).trim();
      
      // Check for apartment/unit in street address
      const aptMatch = streetAddress.match(/(.*?)\s*(?:(?:Apt|Unit|#)\s*[\w-]+)$/i);
      if (aptMatch) {
        const addressLine1 = aptMatch[1].trim();
        const addressLine2 = streetAddress.substring(addressLine1.length).trim();
        return { addressLine1, addressLine2, city, state, zipcode };
      }
      
      return { addressLine1: streetAddress, addressLine2: '', city, state, zipcode };
    }

    // Fallback - just use the whole thing as street address
    return {
      addressLine1: remaining,
      addressLine2: '',
      city: '',
      state,
      zipcode
    };
  };

  // Add handler for address autofill
  const handleAddressAutofill = (text: string) => {
    if (text.includes(',') || text.match(/[A-Z]{2}\s+\d{5}/i)) {
      // This looks like a full address - parse it
      const parsed = parseAddress(text);
      
      // Only update fields that have values
      if (parsed.addressLine1) handleRecipientChange('addressLine1', parsed.addressLine1);
      if (parsed.addressLine2) handleRecipientChange('addressLine2', parsed.addressLine2);
      if (parsed.city) handleRecipientChange('city', parsed.city);
      if (parsed.state) handleRecipientChange('state', parsed.state);
      if (parsed.zipcode) handleRecipientChange('zipcode', parsed.zipcode);
    } else {
      // Just update address line 1
      handleRecipientChange('addressLine1', text);
    }
  };

  // Add handler for contact autofill
  const handleContactAutofill = (text: string) => {
    // Update the name field immediately
    handleRecipientChange('to', text);
  };

  // Add handler for postcard message changes
  const handlePostcardMessageChange = (text: string) => {
    setPostcardMessage(text);
    setIsAIGenerated(false);
  };

  // Add validation function
  const validateAddress = async (recipientInfo: RecipientInfo) => {
    // Temporarily disabled Stannp API validation
    return {
      isValid: true,
      message: 'Address validation temporarily disabled'
    };
    /*
    try {
      const apiKey = Constants.expoConfig?.extra?.stannpApiKey;
      if (!apiKey) {
        throw new Error('Stannp API key not found');
      }

      // Create form data for the request
      const formData = new FormData();
      const nameParts = recipientInfo.to.split(' ');
      formData.append('firstname', nameParts[0] || '');
      formData.append('lastname', nameParts.slice(1).join(' '));
      formData.append('address1', recipientInfo.addressLine1);
      if (recipientInfo.addressLine2) {
        formData.append('address2', recipientInfo.addressLine2);
      }
      formData.append('city', recipientInfo.city);
      formData.append('state', recipientInfo.state);
      formData.append('postcode', recipientInfo.zipcode);
      formData.append('country', 'US');
      formData.append('test_level', 'full');

      // Create authorization header
      const authHeader = 'Basic ' + btoa(`${apiKey}:`);

      // Make the API request
      const response = await fetch('https://api-us1.stannp.com/v1/recipients/new', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
        body: formData
      });

      const data = await response.json();
      return {
        isValid: data.valid === true,
        message: data.valid ? 'Address is valid' : 'Invalid address. Please check city, state, and zip code.'
      };
    } catch (error) {
      console.error('Address validation error:', error);
      return {
        isValid: false,
        message: 'Unable to validate address. Please check your input.'
      };
    }
    */
  };

  // Update handleCreatePostcard to validate before proceeding
  const handleCreatePostcard = async () => {
    if (!image) {
      Alert.alert('No image', 'Please select a photo first.');
      return;
    }

    // Validate fields before proceeding
    const stateValid = validateState(recipientInfo.state);
    const zipcodeValid = validateZipcode(recipientInfo.zipcode);
    
    if (!stateValid || !zipcodeValid) {
      Alert.alert('Invalid Input', 'Please fix the errors in the form before proceeding.');
      return;
    }

    try {
      // Create a permanent directory if it doesn't exist
      const postcardDir = `${FileSystem.documentDirectory}postcards/`;
      await FileSystem.makeDirectoryAsync(postcardDir, { intermediates: true }).catch(() => {});

      // Generate a unique filename
      const filename = `postcard-${Date.now()}.jpg`;
      const newUri = `${postcardDir}${filename}`;

      // Copy the image to the permanent location
      await FileSystem.copyAsync({
        from: image.uri,
        to: newUri
      });

      console.log('[NANAGRAM][HOME] Image copied to:', newUri);
      
      router.push({
        pathname: '/postcard-preview',
        params: {
          imageUri: newUri,
          message: postcardMessage,
          recipient: JSON.stringify(recipientInfo)
        }
      });
    } catch (error) {
      console.error('[NANAGRAM][HOME] Error preparing postcard:', error);
      Alert.alert('Error', 'Failed to prepare postcard. Please try again.');
    }
  };

  // Update isFormValid to use stored validation results
  const isFormValid = () => {
    return (
      image !== null &&
      postcardMessage.length > 5 &&
      recipientInfo.to.trim() !== '' &&
      recipientInfo.addressLine1.trim() !== '' &&
      recipientInfo.city.trim() !== '' &&
      isStateValid &&
      isZipcodeValid &&
      recipientInfo.country.trim() !== ''
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#ffffff', dark: '#ffffff' }}
      headerImage={
        image ? (
          <Image
            source={{ uri: image.uri }}
            style={styles.headerImage}
          />
        ) : (
          <Image
            source={require('@/assets/images/nanagramHeader.jpeg')}
            style={styles.headerImage}
            resizeMode="contain"
          />
        )
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={{ color: '#0a7ea4' }}>NanaGram</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.submitButton} onPress={pickImage}>
          <ThemedText style={styles.buttonText}>Select Photo</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {image && (
        <ThemedView style={styles.imagePreviewContainer}>
          <Image source={{ uri: image.uri }} style={styles.imagePreview} />
        </ThemedView>
      )}

      <ThemedView style={styles.messageSection}>
        <ThemedText style={styles.sectionTitle}>Message *</ThemedText>
        <View style={styles.messageInputContainer}>
          <TextInput
            style={[
              styles.input, 
              styles.messageInput, 
              { color: 'black' },
              loading && styles.inputDisabled
            ]}
            value={postcardMessage}
            onChangeText={handlePostcardMessageChange}
            multiline={true}
            numberOfLines={6}
            placeholder="Write your message to Nana... or a friend or family member!"
            placeholderTextColor="rgba(0, 0, 0, 0.5)"
            editable={!loading}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#A1CEDC" />
            </View>
          )}
        </View>
        
        <ThemedView style={styles.analyzeButtonsContainer}>
          <TouchableOpacity 
            style={[
              styles.submitButton,
              (!image || loading) && { opacity: 0.5 }
            ]}
            onPress={() => analyzeImage()}
            disabled={!image || loading}
          >
            <ThemedText style={styles.buttonText}>
              NanaBot Message Assist
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.recipientSection}>
        <ThemedText style={styles.sectionTitle}>Recipient</ThemedText>
        <ThemedText style={styles.sublabel}>Name: *</ThemedText>
        <TextInput
          style={styles.input}
          value={recipientInfo.to}
          onChangeText={handleContactAutofill}
          placeholder="Recipient's name"
          textContentType="name"
          autoComplete="name"
          dataDetectorTypes="address"
        />
        
        <ThemedText style={styles.sublabel}>Address 1: *</ThemedText>
        <TextInput
          style={styles.input}
          value={recipientInfo.addressLine1}
          onChangeText={handleAddressAutofill}
          placeholder="Street address, P.O. box, etc."
          textContentType="fullStreetAddress"
          autoComplete="street-address"
          dataDetectorTypes="address"
        />
        
        <ThemedText style={styles.sublabel}>Address 2:</ThemedText>
        <TextInput
          style={styles.input}
          value={recipientInfo.addressLine2}
          onChangeText={(text) => handleRecipientChange('addressLine2', text)}
          placeholder="Apt, suite, etc."
          textContentType="fullStreetAddress"
          autoComplete="street-address"
        />
        
        <ThemedView style={styles.rowContainer}>
          <ThemedView style={styles.cityStateContainer}>
            <ThemedText style={styles.sublabel}>City: *</ThemedText>
            <TextInput
              style={styles.input}
              value={recipientInfo.city}
              onChangeText={(text) => handleRecipientChange('city', text)}
              placeholder="City"
              textContentType="addressCity"
              autoComplete="address-line1"
            />
          </ThemedView>
          
          <ThemedView style={styles.cityStateContainer}>
            <ThemedText style={styles.sublabel}>State: *</ThemedText>
            <TextInput
              style={[styles.input, stateError ? styles.inputError : null]}
              value={recipientInfo.state}
              onChangeText={(text) => handleRecipientChange('state', text)}
              onBlur={() => handleFieldBlur('state')}
              placeholder="State"
              textContentType="addressState"
              autoComplete="address-line2"
              maxLength={2}
              autoCapitalize="characters"
            />
            {stateError ? <ThemedText style={styles.errorText}>{stateError}</ThemedText> : null}
          </ThemedView>
        </ThemedView>
        
        <ThemedText style={styles.sublabel}>Zipcode: *</ThemedText>
        <TextInput
          style={[styles.input, zipcodeError ? styles.inputError : null]}
          value={recipientInfo.zipcode}
          onChangeText={(text) => handleRecipientChange('zipcode', text)}
          onBlur={() => handleFieldBlur('zipcode')}
          placeholder="Zipcode"
          keyboardType="numeric"
          textContentType="postalCode"
          autoComplete="postal-code"
          maxLength={10}
        />
        {zipcodeError ? <ThemedText style={styles.errorText}>{zipcodeError}</ThemedText> : null}

        <ThemedText style={styles.sublabel}>Country:</ThemedText>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={recipientInfo.country}
          onChangeText={(text) => handleRecipientChange('country', text)}
          placeholder="Country"
          textContentType="countryName"
          autoComplete="country"
          editable={false}
          selectTextOnFocus={false}
        />
      </ThemedView>
      
      <TouchableOpacity 
        style={[
          styles.submitButton,
          !isFormValid() && { opacity: 0.5 }
        ]} 
        onPress={handleCreatePostcard}
        disabled={!isFormValid()}
      >
        <ThemedText style={styles.buttonText}>Create NanaGram</ThemedText>
      </TouchableOpacity>

      <ThemedView style={styles.formContainer}>
        <ThemedText style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 8 }}>
          Currently postcards can only be sent to the US
        </ThemedText>
        <AIDisclaimer contentToReport={isAIGenerated ? postcardMessage : undefined} />
      </ThemedView>
    </ParallaxScrollView>
  );
}
