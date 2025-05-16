import { useState, useEffect } from 'react';
import { Image, StyleSheet, Platform, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, View, KeyboardAvoidingView, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AIDisclaimer from './components/AIDisclaimer';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const openaiApiKey = Constants.expoConfig?.extra?.openaiApiKey;

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [postcardMessage, setPostcardMessage] = useState('');
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const router = useRouter();
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const [addressItems, setAddressItems] = useState<Array<{ label: string; value: string }>>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateItems] = useState(US_STATES.map(s => ({ label: s, value: s })));
  const [newAddress, setNewAddress] = useState({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Request permissions on component mount
  useEffect(() => {
    (async () => {
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libraryStatus !== 'granted') {
        Alert.alert('Permissions needed', 'Photo library permission is required to use this app.');
      }
    })();
  }, []);

  // Function to pick an image from the gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [3, 2],
      quality: 1,
      mediaTypes: 'images',
      base64: true,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) {
      setImage(result.assets[0] as ImagePicker.ImagePickerAsset);
    }
  };

  // Function to take a photo with the camera
  const takePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.7,
      base64: true,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) {
      setImage(result.assets[0] as ImagePicker.ImagePickerAsset);
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
      let base64Image = image.base64 ? `data:image/jpeg;base64,${image.base64}` : undefined;
      // Compose prompt
      let promptText =
        `Write a friendly, engaging postcard message (max 100 words) based on the attached photo.` +
        (salutation ? ` Start the message with: "${salutation}".` : '') +
        (postcardMessage ? ` Here are some hints or ideas: ${postcardMessage}` : '') +
        ` Write it in a casual, personal tone, like a real postcard.`;
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
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze image.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle the Create XLPostcard button (stub)
  const handleCreatePostcard = () => {
    if (!image) {
      Alert.alert('No image', 'Please select a photo first.');
      return;
    }
    if (!postcardMessage) {
      Alert.alert('No message', 'Please enter a message.');
      return;
    }
    const selected = addresses.find(a => a.id === selectedAddressId);
    if (!selected) {
      Alert.alert('No address', 'Please select a recipient address.');
      return;
    }
    // Prepare recipient info for preview screen
    const recipientInfo = {
      to: selected.name,
      addressLine1: selected.address,
      addressLine2: '',
      city: selected.city,
      state: selected.state,
      zipcode: selected.zip,
      country: 'United States',
    };
    router.push({
      pathname: '/postcard-preview',
      params: {
        imageUri: image.uri,
        message: postcardMessage,
        recipient: JSON.stringify(recipientInfo),
      },
    });
  };

  // Load addresses from AsyncStorage
  useEffect(() => { loadAddresses(); }, []);
  const loadAddresses = async () => {
    const stored = await AsyncStorage.getItem('addresses');
    const parsed = stored ? JSON.parse(stored) : [];
    setAddresses(parsed);
    setAddressItems([
      ...parsed.map((a: any) => ({
        label: a.name,
        value: a.id,
      })),
      { label: '+ Add new address', value: 'add_new' }
    ]);
  };

  const handleAddressSelect = (value: string | null) => {
    if (value === 'add_new') {
      setShowAddressModal(true);
      setSelectedAddressId(null);
    } else {
      setSelectedAddressId(value);
    }
  };

  const handleEditAddress = (address: any) => {
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
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const updated = addresses.filter(a => a.id !== id);
        await AsyncStorage.setItem('addresses', JSON.stringify(updated));
        if (selectedAddressId === id) setSelectedAddressId(null);
        loadAddresses();
      }},
    ]);
  };

  const handleSaveNewAddress = async () => {
    if (!newAddress.name || !newAddress.address || !newAddress.city || !newAddress.state || !newAddress.zip) {
      Alert.alert('Please fill in all required fields');
      return;
    }
    let updated;
    if (editingAddressId) {
      updated = addresses.map(a => a.id === editingAddressId ? { ...newAddress, id: editingAddressId } : a);
    } else {
      const id = Date.now().toString();
      updated = [...addresses, { ...newAddress, id }];
      setSelectedAddressId(id);
    }
    await AsyncStorage.setItem('addresses', JSON.stringify(updated));
    setNewAddress({ name: '', salutation: '', address: '', address2: '', city: '', state: '', zip: '', birthday: '' });
    setShowAddressModal(false);
    setEditingAddressId(null);
    loadAddresses();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <ParallaxScrollView
          headerBackgroundColor={{ light: '#ffffff', dark: '#ffffff' }}
          headerImage={
            <Image
              source={require('@/assets/images/xlpostcards_1024x500.png')}
              style={styles.headerImage}
              resizeMode="contain"
            />
          }
        >
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title" style={{ color: '#0a7ea4' }}>XLPostcards</ThemedText>
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

          {/* Address Dropdown Section */}
          <ThemedView style={{ marginVertical: 20, zIndex: 1000 }}>
            <ThemedText style={{ fontWeight: 'bold', color: '#f28914', fontSize: 18, marginBottom: 8 }}>Select Recipient</ThemedText>
            <DropDownPicker
              open={addressDropdownOpen}
              value={selectedAddressId}
              items={addressItems}
              setOpen={setAddressDropdownOpen}
              setValue={setSelectedAddressId}
              setItems={setAddressItems}
              placeholder="Select recipient"
              style={{ borderColor: '#f28914', borderRadius: 8, backgroundColor: '#fff', marginBottom: 8 }}
              dropDownContainerStyle={{ backgroundColor: '#fff', borderColor: '#f28914' }}
              listItemContainerStyle={{ height: 50, backgroundColor: '#fff' }}
              textStyle={{ color: '#222', fontWeight: '500' }}
              onChangeValue={handleAddressSelect}
              listMode="SCROLLVIEW"
              zIndex={3000}
              zIndexInverse={1000}
            />
            {selectedAddressId && selectedAddressId !== 'add_new' && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => handleEditAddress(addresses.find(a => a.id === selectedAddressId))} style={{ marginRight: 16 }}>
                  <Ionicons name="pencil" size={20} color="#f28914" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAddress(selectedAddressId)}>
                  <Ionicons name="trash" size={20} color="#f28914" />
                </TouchableOpacity>
              </View>
            )}
          </ThemedView>

          {/* Message Block */}
          <ThemedView style={styles.messageSection}>
            <ThemedText style={styles.sectionTitle}>Message *</ThemedText>
            <View style={styles.messageInputContainer}>
              <TextInput
                style={[styles.input, styles.messageInput]}
                value={postcardMessage}
                onChangeText={text => { setPostcardMessage(text); setIsAIGenerated(false); }}
                multiline={true}
                numberOfLines={6}
                placeholder="Write your message or give our AI assist some ideas on what you want your message to say."
                placeholderTextColor="#888"
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
                onPress={analyzeImage}
                disabled={!image || loading}
              >
                <ThemedText style={styles.buttonText}>
                  AI writing assist
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          <Modal visible={showAddressModal} animationType="slide" transparent onRequestClose={() => setShowAddressModal(false)}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
              >
                <ScrollView
                  contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                  keyboardShouldPersistTaps="handled"
                  style={{ width: '100%' }}
                >
                  <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '90%' }}>
                    <ThemedText style={{ fontSize: 22, fontWeight: 'bold', color: '#f28914', marginBottom: 16, textAlign: 'center' }}>Add New Address</ThemedText>
                    <TextInput style={styles.input} placeholder="Name *" placeholderTextColor="#888" value={newAddress.name} onChangeText={t => setNewAddress({ ...newAddress, name: t })} />
                    <TextInput style={styles.input} placeholder="Salutation e.g. Dear Grandma" placeholderTextColor="#888" value={newAddress.salutation} onChangeText={t => setNewAddress({ ...newAddress, salutation: t })} />
                    <TextInput style={styles.input} placeholder="Address *" placeholderTextColor="#888" value={newAddress.address} onChangeText={t => setNewAddress({ ...newAddress, address: t })} />
                    <TextInput style={styles.input} placeholder="Address line #2" placeholderTextColor="#888" value={newAddress.address2} onChangeText={t => setNewAddress({ ...newAddress, address2: t })} />
                    <TextInput style={styles.input} placeholder="City *" placeholderTextColor="#888" value={newAddress.city} onChangeText={t => setNewAddress({ ...newAddress, city: t })} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <DropDownPicker
                          open={stateDropdownOpen}
                          value={newAddress.state}
                          items={stateItems}
                          setOpen={setStateDropdownOpen}
                          setValue={val => {
                            const value = typeof val === 'function' ? val(newAddress.state) : val;
                            setNewAddress({ ...newAddress, state: value });
                          }}
                          setItems={() => {}}
                          placeholder="State *"
                          style={{ borderColor: '#f28914', borderRadius: 8, backgroundColor: '#fff', marginBottom: 8, minHeight: 48 }}
                          dropDownContainerStyle={{ backgroundColor: '#fff', borderColor: '#f28914' }}
                          textStyle={{ color: '#222', fontWeight: '500' }}
                          listMode="SCROLLVIEW"
                          zIndex={4000}
                          zIndexInverse={2000}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput style={styles.input} placeholder="Zip *" placeholderTextColor="#888" value={newAddress.zip} onChangeText={t => setNewAddress({ ...newAddress, zip: t })} keyboardType="numeric" />
                      </View>
                    </View>
                    <TextInput style={styles.input} placeholder="Birthday (mm/dd/yyyy)" placeholderTextColor="#888" value={newAddress.birthday} onChangeText={t => setNewAddress({ ...newAddress, birthday: t })} keyboardType="numbers-and-punctuation" />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                      <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#fff', borderColor: '#f28914', borderWidth: 1 }]} onPress={() => { setShowAddressModal(false); setEditingAddressId(null); }}>
                        <ThemedText style={{ color: '#f28914', fontWeight: 'bold' }}>Cancel</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.submitButton, { marginLeft: 8 }]} onPress={handleSaveNewAddress}>
                        <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Save</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          <TouchableOpacity 
            style={[
              styles.submitButton,
              (!image || !postcardMessage) && { opacity: 0.5 }
            ]} 
            onPress={handleCreatePostcard}
            disabled={!image || !postcardMessage}
          >
            <ThemedText style={styles.buttonText}>Create XLPostcard</ThemedText>
          </TouchableOpacity>

          <ThemedView style={styles.formContainer}>
            <ThemedText style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 8 }}>
              Currently postcards can only be sent to the US
            </ThemedText>
            <AIDisclaimer contentToReport={isAIGenerated ? postcardMessage : undefined} />
          </ThemedView>
        </ParallaxScrollView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    alignItems: 'center',
    marginBottom: 10,
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
});
