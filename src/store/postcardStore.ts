import { create } from 'zustand';

interface PostcardState {
  postcardId: string | null;
  setPostcardId: (id: string | null) => void;
}

export const usePostcardStore = create<PostcardState>((set) => ({
  postcardId: null,
  setPostcardId: (id) => set({ postcardId: id }),
})); 