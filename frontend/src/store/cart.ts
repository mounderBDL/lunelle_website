"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LineType = "VARIANT" | "PACK";
export type CartLine = { type: LineType; id: string; quantity: number };

export const MAX_PER_ITEM = 10; // same limit as the backend

type CartState = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  setQuantity: (type: LineType, id: string, quantity: number) => void;
  remove: (type: LineType, id: string) => void;
  replaceLines: (lines: CartLine[]) => void;
  clear: () => void;
};

const same = (l: CartLine, type: LineType, id: string) => l.type === type && l.id === id;

/**
 * The cart only remembers WHAT and HOW MANY. Prices, names and stock always come from the
 * server (POST /api/checkout/quote), so nothing in the browser can change what a customer pays.
 */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((state) => {
          const existing = state.lines.find((l) => same(l, line.type, line.id));
          if (!existing) {
            return { lines: [...state.lines, { ...line, quantity: Math.min(line.quantity, MAX_PER_ITEM) }] };
          }
          return {
            lines: state.lines.map((l) =>
              l === existing ? { ...l, quantity: Math.min(l.quantity + line.quantity, MAX_PER_ITEM) } : l,
            ),
          };
        }),
      setQuantity: (type, id, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => !same(l, type, id))
              : state.lines.map((l) =>
                  same(l, type, id) ? { ...l, quantity: Math.min(quantity, MAX_PER_ITEM) } : l,
                ),
        })),
      remove: (type, id) => set((state) => ({ lines: state.lines.filter((l) => !same(l, type, id)) })),
      replaceLines: (lines) => set({ lines }),
      clear: () => set({ lines: [] }),
    }),
    { name: "lunelle-cart", version: 1 },
  ),
);

export const selectCount = (state: CartState) => state.lines.reduce((n, l) => n + l.quantity, 0);