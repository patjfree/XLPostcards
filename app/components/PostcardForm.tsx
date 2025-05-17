import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { usePostcardStore } from '../../src/store/postcardStore';
import { useAddressBookStore, Address } from '../../src/store/addressBookStore';
import { useStannpStore } from '../../src/store/stannpStore';
import { useImageStore } from '../../src/store/imageStore';
import { useMessageStore } from '../../src/store/messageStore';
import { useAddressStore } from '../../src/store/addressStore';
import { usePaymentStore } from '../../src/store/paymentStore';
import { useErrorStore } from '../../src/store/errorStore';
import { useSuccessStore } from '../../src/store/successStore';
import { useLoadingStore } from '../../src/store/loadingStore';
import { useAddressBook } from '../../src/hooks/useAddressBook';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import EditAddressModal from './EditAddressModal';
import * as ImagePicker from 'expo-image-picker';

export default function PostcardForm() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { setPostcardId } = usePostcardStore();
  const { setStannpId } = useStannpStore();
  const { setPaymentIntentId } = usePaymentStore();
  const { setError } = useErrorStore();
  const { setSuccess } = useSuccessStore();
  const { setIsLoading } = useLoadingStore();
  const { imageUri } = useImageStore();
  const { message } = useMessageStore();
  const {
    recipientName,
    recipientAddress,
    recipientCity,
    recipientState,
    recipientZip,
    setRecipientName,
    setRecipientAddress,
    setRecipientCity,
    setRecipientState,
    setRecipientZip,
  } = useAddressStore();

  const [open, setOpen] = useState(false);
  const [addressItems, setAddressItems] = useState<Array<{ label: string; value: string }>>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [postcardMessage, setPostcardMessage] = useState('');
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  const { saveAddress, deleteAddress, editAddress, getAddresses } = useAddressBook();

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    console.log('[XLPOSTCARDS][DEBUG] Loading addresses...');
    const addresses = await getAddresses();
    console.log('[XLPOSTCARDS][DEBUG] Loaded addresses:', addresses);
    const items = addresses.map(addr => ({
      label: `${addr.name} - ${addr.address}`,
      value: addr.id
    }));
    console.log('[XLPOSTCARDS][DEBUG] Dropdown items:', items);
    setAddressItems(items);
  };

  const handleAddressSelect = async (value: string | null) => {
    if (!value) return;
    setSelectedAddress(value);
    const addresses = await getAddresses();
    const selected = addresses.find(addr => addr.id === value);
    if (selected) {
      setRecipientName(selected.name);
      setRecipientAddress(selected.address);
      setRecipientCity(selected.city);
      setRecipientState(selected.state);
      setRecipientZip(selected.zip);
    }
  };

  const handleEditAddress = async (item: { label: string; value: string }) => {
    const addresses = await getAddresses();
    const address = addresses.find(addr => addr.id === item.value);
    if (address) {
      setEditingAddress(address);
      setShowEditModal(true);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAddress(id);
            await loadAddresses();
            if (selectedAddress === id) {
              setSelectedAddress(null);
              setRecipientName('');
              setRecipientAddress('');
              setRecipientCity('');
              setRecipientState('');
              setRecipientZip('');
            }
          }
        }
      ]
    );
  };

  const handleSaveAddress = async () => {
    if (!recipientName || !recipientAddress || !recipientCity || !recipientState || !recipientZip) {
      Alert.alert('Error', 'Please fill in all recipient fields before saving');
      return;
    }

    const newAddress: Address = {
      id: Date.now().toString(),
      name: recipientName,
      address: recipientAddress,
      city: recipientCity,
      state: recipientState,
      zip: recipientZip
    };

    await saveAddress(newAddress);
    await loadAddresses();
    Alert.alert('Success', 'Address saved to address book');
  };

  const handleEditSave = async (editedAddress: Address) => {
    await editAddress(editedAddress);
    await loadAddresses();
    if (selectedAddress === editedAddress.id) {
      setRecipientName(editedAddress.name);
      setRecipientAddress(editedAddress.address);
      setRecipientCity(editedAddress.city);
      setRecipientState(editedAddress.state);
      setRecipientZip(editedAddress.zip);
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    if (!postcardMessage) {
      setError('Please enter a message');
      return;
    }

    if (!recipientName || !recipientAddress || !recipientCity || !recipientState || !recipientZip) {
      setError('Please fill in all recipient fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://api.xlpostcards.com/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 499,
          currency: 'usd',
        }),
      });

      const { clientSecret, paymentIntentId } = await response.json();
      setPaymentIntentId(paymentIntentId);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'XLPostcards',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: recipientName,
        },
      });

      if (initError) {
        setError(initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        setError(presentError.message);
        return;
      }

      // Payment successful, create postcard
      const postcardResponse = await fetch('https://api.xlpostcards.com/create-postcard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUri: image.uri,
          message: postcardMessage,
          recipientName,
          recipientAddress,
          recipientCity,
          recipientState,
          recipientZip,
          paymentIntentId,
        }),
      });

      const { postcardId, stannpId } = await postcardResponse.json();
      setPostcardId(postcardId);
      setStannpId(stannpId);
      setSuccess('Postcard created successfully!');
      router.push('/success');
    } catch (error) {
      setError('An error occurred while processing your request');
    } finally {
      setIsLoading(false);
    }
  };

  // Image picker logic
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [3, 2],
      quality: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
      setIsAIGenerated(false);
    }
  };

  // AI writing assist logic (stub)
  const analyzeImage = async () => {
    if (!image) {
      Alert.alert('No image', 'Please select a photo first.');
      return;
    }
    setLoading(true);
    try {
      // TODO: Integrate with your AI API
      setPostcardMessage('AI generated message based on the image.');
      setIsAIGenerated(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Select Photo and Preview */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Select Photo</Text>
          </TouchableOpacity>
        </View>
        {image && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          </View>
        )}
        {/* Message Block */}
        <Text style={styles.label}>Message *</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={postcardMessage}
          onChangeText={text => { setPostcardMessage(text); setIsAIGenerated(false); }}
          multiline={true}
          numberOfLines={6}
          placeholder="Write your message to your friend or loved one!"
          placeholderTextColor="#888"
          editable={!loading}
        />
        <View style={styles.analyzeButtonsContainer}>
          <TouchableOpacity 
            style={[styles.button, (!image || loading) && { opacity: 0.5 }]}
            onPress={analyzeImage}
            disabled={!image || loading}
          >
            <Text style={styles.buttonText}>AI writing assist</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dropdownContainer}>
          <DropDownPicker
            open={open}
            value={selectedAddress}
            items={addressItems}
            setOpen={setOpen}
            setValue={setSelectedAddress}
            setItems={setAddressItems}
            placeholder="Select a saved address"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownList}
            listItemContainerStyle={styles.dropdownItem}
            zIndex={3000}
            zIndexInverse={1000}
            onChangeValue={handleAddressSelect}
            listMode="SCROLLVIEW"
          />
          {selectedAddress && (
            <View style={styles.addressActions}>
              <TouchableOpacity 
                onPress={() => handleEditAddress(addressItems.find(item => item.value === selectedAddress)!)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil" size={20} color="#f28914" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleDeleteAddress(selectedAddress)}
                style={styles.actionButton}
              >
                <Ionicons name="trash" size={20} color="#f28914" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.label}>Recipient Name</Text>
        <TextInput
          style={styles.input}
          value={recipientName}
          onChangeText={setRecipientName}
          placeholder="Enter recipient name"
        />

        <Text style={styles.label}>Recipient Address</Text>
        <TextInput
          style={styles.input}
          value={recipientAddress}
          onChangeText={setRecipientAddress}
          placeholder="Enter recipient address"
        />

        <Text style={styles.label}>Recipient City</Text>
        <TextInput
          style={styles.input}
          value={recipientCity}
          onChangeText={setRecipientCity}
          placeholder="Enter recipient city"
        />

        <Text style={styles.label}>Recipient State</Text>
        <TextInput
          style={styles.input}
          value={recipientState}
          onChangeText={setRecipientState}
          placeholder="Enter recipient state"
        />

        <Text style={styles.label}>Recipient Zip</Text>
        <TextInput
          style={styles.input}
          value={recipientZip}
          onChangeText={setRecipientZip}
          placeholder="Enter recipient zip"
        />

        <TouchableOpacity 
          style={[styles.button, styles.saveAddressButton]} 
          onPress={handleSaveAddress}
        >
          <Text style={styles.buttonText}>Save to Address Book</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Create XLPostcard</Text>
        </TouchableOpacity>
      </ScrollView>

      <EditAddressModal
        visible={showEditModal}
        address={editingAddress}
        onClose={() => {
          setShowEditModal(false);
          setEditingAddress(null);
        }}
        onSave={handleEditSave}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  dropdownContainer: {
    marginBottom: 20,
    zIndex: 1000,
  },
  dropdown: {
    borderColor: '#f28914',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderColor: '#f28914',
  },
  dropdownItem: {
    height: 50,
    backgroundColor: '#fff',
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  saveAddressButton: {
    backgroundColor: '#22303C',
    borderColor: '#f28914',
    borderWidth: 1,
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#f28914',
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
  button: {
    backgroundColor: '#f28914',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
    marginTop: 0,
    lineHeight: 22,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#fff',
  },
}); 