import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Address } from '../../src/store/addressBookStore';

interface EditAddressModalProps {
  visible: boolean;
  address: Address | null;
  onClose: () => void;
  onSave: (address: Address) => void;
}

export default function EditAddressModal({ visible, address, onClose, onSave }: EditAddressModalProps) {
  const [editedAddress, setEditedAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (address) {
      setEditedAddress(address);
    }
  }, [address]);

  const handleSave = () => {
    if (editedAddress) {
      onSave(editedAddress);
      onClose();
    }
  };

  if (!editedAddress) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Edit Address</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={editedAddress.name}
            onChangeText={(text) => setEditedAddress({ ...editedAddress, name: text })}
            placeholder="Enter name"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={editedAddress.address}
            onChangeText={(text) => setEditedAddress({ ...editedAddress, address: text })}
            placeholder="Enter address"
          />

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={editedAddress.city}
            onChangeText={(text) => setEditedAddress({ ...editedAddress, city: text })}
            placeholder="Enter city"
          />

          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            value={editedAddress.state}
            onChangeText={(text) => setEditedAddress({ ...editedAddress, state: text })}
            placeholder="Enter state"
          />

          <Text style={styles.label}>ZIP</Text>
          <TextInput
            style={styles.input}
            value={editedAddress.zip}
            onChangeText={(text) => setEditedAddress({ ...editedAddress, zip: text })}
            placeholder="Enter ZIP"
            keyboardType="numeric"
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#22303C',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#f28914',
    textAlign: 'center',
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
    backgroundColor: '#22303C',
    marginBottom: 16,
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#22303C',
    borderColor: '#f28914',
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#f28914',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
}); 