import { create } from 'zustand';

interface PaymentState {
  paymentIntentId: string | null;
  setPaymentIntentId: (id: string | null) => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  paymentIntentId: null,
  setPaymentIntentId: (id) => set({ paymentIntentId: id }),
})); 