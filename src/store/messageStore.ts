import { create } from 'zustand';

interface MessageState {
  message: string;
  setMessage: (message: string) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  message: '',
  setMessage: (message) => set({ message }),
})); 