import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartProduct {
  id: string;
  name: string;
  salePrice: number;
  taxRate: number;
  isControlled: boolean;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
  prescription?: {
    doctorName: string;
    doctorLicense: string;
    folio: string;
  };
}

export interface PaymentMethod {
  type: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'INSURANCE' | 'LOYALTY_POINTS';
  amount: number;
  reference?: string;
}

export interface CustomerSession {
  id: string;
  name: string;
  discountAgreement?: string;
}

interface POSState {
  // Cart Data
  cart: CartItem[];
  activeCustomer: CustomerSession | null;
  payments: PaymentMethod[];

  // Actions
  addItem: (product: CartProduct, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  
  // Prescription Control
  attachPrescription: (productId: string, data: CartItem['prescription']) => void;
  
  // Customer Actions
  setCustomer: (customer: CustomerSession | null) => void;

  // Payment Actions (Hybrid Flow)
  addPayment: (payment: PaymentMethod) => void;
  clearPayments: () => void;

  // Store Actions
  clearCart: () => void;
  
  // Financial Computed Getters (Functions)
  getSubtotal: () => number;
  getTaxes: () => number;
  getTotal: () => number;
  getRemainingBalance: () => number;
}

/**
 * POS Store
 * Gestiona el estado transaccional del checkout activo.
 * Soporta múltiples métodos de pago (cobro híbrido) y retención obligatoria de recetas médicas.
 */
export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      cart: [],
      activeCustomer: null,
      payments: [],

      addItem: (product, qty = 1) => {
        const currentCart = get().cart;
        const existingIndex = currentCart.findIndex((item) => item.product.id === product.id);

        if (existingIndex >= 0) {
          const updatedCart = [...currentCart];
          updatedCart[existingIndex].quantity += qty;
          set({ cart: updatedCart });
        } else {
          set({ cart: [...currentCart, { product, quantity: qty }] });
        }
      },

      removeItem: (productId) => {
        set({ cart: get().cart.filter((item) => item.product.id !== productId) });
      },

      updateQuantity: (productId, qty) => {
        set({
          cart: get().cart.map((item) =>
            item.product.id === productId ? { ...item, quantity: Math.max(1, qty) } : item
          ),
        });
      },

      attachPrescription: (productId, data) => {
        set({
          cart: get().cart.map((item) =>
            item.product.id === productId ? { ...item, prescription: data } : item
          ),
        });
      },

      setCustomer: (customer) => set({ activeCustomer: customer }),

      addPayment: (payment) => {
        set({ payments: [...get().payments, payment] });
      },

      clearPayments: () => set({ payments: [] }),

      clearCart: () => set({ cart: [], activeCustomer: null, payments: [] }),

      // CÁLCULOS CALCULADOS DINÁMICAMENTE
      getSubtotal: () => {
        return get().cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
      },

      getTaxes: () => {
        return get().cart.reduce((acc, item) => {
          const linePrice = item.product.salePrice * item.quantity;
          return acc + (linePrice * item.product.taxRate);
        }, 0);
      },

      getTotal: () => {
        return get().getSubtotal() + get().getTaxes();
      },

      getRemainingBalance: () => {
        const total = get().getTotal();
        const totalPaid = get().payments.reduce((acc, p) => acc + p.amount, 0);
        return Math.max(0, total - totalPaid);
      },
    }),
    {
      name: 'farma-pos-cart', // Mantiene el carrito persistente en localstorage ante reloads
    }
  )
);
