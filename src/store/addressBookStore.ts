import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Address {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressBookState {
  addresses: Address[];
  addAddress: (address: Address) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  updateAddress: (address: Address) => Promise<void>;
  loadAddresses: () => Promise<void>;
}

export const useAddressBookStore = create<AddressBookState>((set) => ({
  addresses: [],
  
  addAddress: async (address: Address) => {
    try {
      const currentAddresses = await AsyncStorage.getItem('addresses');
      const addresses = currentAddresses ? JSON.parse(currentAddresses) : [];
      const newAddresses = [...addresses, address];
      await AsyncStorage.setItem('addresses', JSON.stringify(newAddresses));
      set({ addresses: newAddresses });
    } catch (error) {
      console.error('Error saving address:', error);
    }
  },

  removeAddress: async (id: string) => {
    try {
      const currentAddresses = await AsyncStorage.getItem('addresses');
      const addresses = currentAddresses ? JSON.parse(currentAddresses) : [];
      const newAddresses = addresses.filter((addr: Address) => addr.id !== id);
      await AsyncStorage.setItem('addresses', JSON.stringify(newAddresses));
      set({ addresses: newAddresses });
    } catch (error) {
      console.error('Error removing address:', error);
    }
  },

  updateAddress: async (address: Address) => {
    try {
      const currentAddresses = await AsyncStorage.getItem('addresses');
      const addresses = currentAddresses ? JSON.parse(currentAddresses) : [];
      const newAddresses = addresses.map((addr: Address) => 
        addr.id === address.id ? address : addr
      );
      await AsyncStorage.setItem('addresses', JSON.stringify(newAddresses));
      set({ addresses: newAddresses });
    } catch (error) {
      console.error('Error updating address:', error);
    }
  },

  loadAddresses: async () => {
    try {
      console.log('[XLPOSTCARDS][DEBUG] Loading addresses from AsyncStorage...');
      const addresses = await AsyncStorage.getItem('addresses');
      console.log('[XLPOSTCARDS][DEBUG] Raw addresses from AsyncStorage:', addresses);
      if (addresses) {
        const parsedAddresses = JSON.parse(addresses);
        console.log('[XLPOSTCARDS][DEBUG] Parsed addresses:', parsedAddresses);
        set({ addresses: parsedAddresses });
      }
    } catch (error) {
      console.error('[XLPOSTCARDS][ERROR] Error loading addresses:', error);
    }
  },
})); 