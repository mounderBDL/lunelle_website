import { create } from "zustand";

type CartUiState = {
  open: boolean; // the drawer was asked to open
  present: boolean; // the drawer is on screen (also while it slides out)
  bumps: number; // goes up every time an item lands in the cart
  openCart: () => void;
  closeCart: () => void;
  finish: () => void;
  bump: () => void;
};

export const useCartUi = create<CartUiState>((set) => ({
  open: false,
  present: false,
  bumps: 0,
  openCart: () => set({ open: true, present: true }),
  closeCart: () => set({ open: false }),
  finish: () => set({ open: false, present: false }),
  bump: () => set((state) => ({ bumps: state.bumps + 1 })),
}));