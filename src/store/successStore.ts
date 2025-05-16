import { create } from 'zustand';

interface SuccessState {
  success: string | null;
  setSuccess: (success: string | null) => void;
}

export const useSuccessStore = create<SuccessState>((set) => ({
  success: null,
  setSuccess: (success) => set({ success }),
})); 