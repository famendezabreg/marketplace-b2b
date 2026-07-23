import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../lib/types';

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity) => {
        const existing = get().items.find((i) => i.productId === product.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i,
            ),
          });
        } else {
          set({ items: [...get().items, { productId: product.id, product, quantity }] });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      setQuantity: (productId, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        });
      },

      clear: () => set({ items: [] }),
    }),
    { name: 'marketplace-cart' },
  ),
);
