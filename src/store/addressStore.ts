import { create } from 'zustand';

interface AddressState {
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  setRecipientName: (name: string) => void;
  setRecipientAddress: (address: string) => void;
  setRecipientCity: (city: string) => void;
  setRecipientState: (state: string) => void;
  setRecipientZip: (zip: string) => void;
}

export const useAddressStore = create<AddressState>((set) => ({
  recipientName: '',
  recipientAddress: '',
  recipientCity: '',
  recipientState: '',
  recipientZip: '',
  setRecipientName: (name) => set({ recipientName: name }),
  setRecipientAddress: (address) => set({ recipientAddress: address }),
  setRecipientCity: (city) => set({ recipientCity: city }),
  setRecipientState: (state) => set({ recipientState: state }),
  setRecipientZip: (zip) => set({ recipientZip: zip }),
})); 