import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'SUPER_ADMIN' | 'TENANT_OWNER' | 'BRANCH_MANAGER' | 'PHARMACIST' | 'CASHIER';

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  tenantId: string;
}

export interface ActiveBranch {
  id: string;
  name: string;
  code: string;
}

export interface ActiveShift {
  id: string;
  openedAt: string;
  openingCash: number;
  salesCash: number;
  salesCard: number;
  withdrawals: number;
}

interface ShiftState {
  // Data
  user: SessionUser | null;
  activeBranch: ActiveBranch | null;
  currentShift: ActiveShift | null;
  
  // Actions
  setSession: (user: SessionUser, branch: ActiveBranch) => void;
  openShift: (openingCash: number) => void;
  addSale: (amount: number, method: 'cash' | 'card') => void;
  addWithdrawal: (amount: number) => void;
  closeShift: () => void;
  logout: () => void;
}

/**
 * Shift Store
 * Administra la sesión del cajero vinculada obligatoriamente a una Sucursal y a un Turno Abierto.
 * Utiliza persistencia local para asegurar que ante desconexiones repentinas o recargas,
 * el estado de auditoría y seguridad del cajero no se pierda.
 */
export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      user: null,
      activeBranch: null,
      currentShift: null,

      setSession: (user, branch) => set({ user, activeBranch: branch }),
      
      openShift: (openingCash) => set({
        currentShift: {
          id: 'SHIFT-' + Math.floor(100000 + Math.random() * 900000),
          openedAt: new Date().toLocaleString(),
          openingCash: openingCash,
          salesCash: 0,
          salesCard: 0,
          withdrawals: 0
        }
      }),

      addSale: (amount, method) => {
        const { currentShift } = get();
        if (!currentShift) return;

        set({
          currentShift: {
            ...currentShift,
            salesCash: method === 'cash' ? currentShift.salesCash + amount : currentShift.salesCash,
            salesCard: method === 'card' ? currentShift.salesCard + amount : currentShift.salesCard
          }
        });
      },

      addWithdrawal: (amount) => {
        const { currentShift } = get();
        if (!currentShift) return;

        set({
          currentShift: {
            ...currentShift,
            withdrawals: currentShift.withdrawals + amount
          }
        });
      },
      
      closeShift: () => set({ currentShift: null }),
      
      logout: () => set({ user: null, activeBranch: null, currentShift: null }),
    }),
    {
      name: 'farma-shift-storage', // Nombre de la key en localStorage
    }
  )
);
