import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  type: "sejour" | "hebergement" | "activite";
  title: string;
  subtitle?: string;
  location: string;
  duration: string;
  image: string;
  price: number;
  quantity: number;
  startDate?: string;
  endDate?: string;
  slotId?: string;
  ridingLevel?: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  
  // Actions
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  
  // Computed
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find(
          (i) => i.id === item.id && i.slotId === item.slotId
        );

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.id === item.id && i.slotId === item.slotId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] });
        }
        
        // Open cart when adding
        set({ isOpen: true });
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: "an-arwen-cart",
    }
  )
);
