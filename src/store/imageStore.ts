import { create } from 'zustand';

interface ImageState {
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
}

export const useImageStore = create<ImageState>((set) => ({
  imageUri: null,
  setImageUri: (uri) => set({ imageUri: uri }),
})); 