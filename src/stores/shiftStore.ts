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
  shifts: Record<string, ActiveShift>;
  
  // Actions
  setSession: (user: SessionUser) => void;
  openShift: (branchId: string, openingCash: number) => void;
  addSale: (branchId: string, amount: number, method: 'cash' | 'card') => void;
  addWithdrawal: (branchId: string, amount: number) => void;
  closeShift: (branchId: string) => void;
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
      shifts: {},

      setSession: (user) => set({ user }),
      
      openShift: (branchId, openingCash) => set((state) => ({
        shifts: {
          ...state.shifts,
          [branchId]: {
            id: 'SHIFT-' + Math.floor(100000 + Math.random() * 900000),
            openedAt: new Date().toLocaleString(),
            openingCash: openingCash,
            salesCash: 0,
            salesCard: 0,
            withdrawals: 0
          }
        }
      })),

      addSale: (branchId, amount, method) => set((state) => {
        const currentShift = state.shifts[branchId];
        if (!currentShift) return state;

        return {
          shifts: {
            ...state.shifts,
            [branchId]: {
              ...currentShift,
              salesCash: method === 'cash' ? currentShift.salesCash + amount : currentShift.salesCash,
              salesCard: method === 'card' ? currentShift.salesCard + amount : currentShift.salesCard
            }
          }
        };
      }),

      addWithdrawal: (branchId, amount) => set((state) => {
        const currentShift = state.shifts[branchId];
        if (!currentShift) return state;

        return {
          shifts: {
            ...state.shifts,
            [branchId]: {
              ...currentShift,
              withdrawals: currentShift.withdrawals + amount
            }
          }
        };
      }),
      
      closeShift: (branchId) => set((state) => {
        const newShifts = { ...state.shifts };
        delete newShifts[branchId];
        return { shifts: newShifts };
      }),
      
      logout: () => set({ user: null, shifts: {} }),
    }),
    {
      name: 'farma-shift-storage', // Nombre de la key en localStorage
    }
  )
);
