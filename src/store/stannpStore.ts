import { create } from 'zustand';

interface StannpState {
  stannpId: string | null;
  setStannpId: (id: string | null) => void;
}

export const useStannpStore = create<StannpState>((set) => ({
  stannpId: null,
  setStannpId: (id) => set({ stannpId: id }),
})); 