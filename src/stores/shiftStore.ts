import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useBranchStore } from './branchStore';

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
  fetchActiveShift: (branchId: string) => Promise<void>;
  openShift: (branchId: string, openingCash: number) => Promise<void>;
  addSale: (branchId: string, amount: number, method: 'cash' | 'card') => Promise<void>;
  addWithdrawal: (branchId: string, amount: number) => Promise<void>;
  closeShift: (branchId: string, actualCashCount?: number) => Promise<void>;
  logout: () => void;
}

/**
 * Shift Store
 * Administra la sesión del cajero vinculada obligatoriamente a una Sucursal y a un Turno Abierto.
 * Utiliza persistencia local para asegurar que ante desconexiones repentinas o recargas,
 * el estado de auditoría y seguridad del cajero no se pierda.
 */
export const useShiftStore = create<ShiftState>()((set, get) => ({
  user: null,
  shifts: {},

  setSession: (user) => set({ user }),

  fetchActiveShift: async (branchId) => {
    // First try exact branch_id match
    let { data, error } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('branch_id', branchId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();



    if (!error && data) {
      set((state) => ({
        shifts: {
          ...state.shifts,
          [branchId]: {
            id: data.id,
            openedAt: new Date(data.opened_at).toLocaleString(),
            openingCash: parseFloat(data.opening_cash),
            salesCash: Math.max(0, parseFloat(data.expected_cash) - parseFloat(data.opening_cash)),
            salesCard: 0,
            withdrawals: 0
          }
        }
      }));
    } else {
      // No hay turno abierto — removerlo del store local
      set((state) => {
        const newShifts = { ...state.shifts };
        delete newShifts[branchId];
        return { shifts: newShifts };
      });
    }
  },
  
  openShift: async (branchId, openingCash) => {
    const tenantId = useBranchStore.getState().user?.tenantId;
    if (!tenantId) return;

    const userId = useBranchStore.getState().user?.id || 'anonymous';
    const userName = useBranchStore.getState().user?.name || 'Cajero';
    const branchName = useBranchStore.getState().availableBranches.find(b => b.id === branchId)?.name || branchId;
    const shiftId = 'SHIFT-' + Math.floor(100000 + Math.random() * 900000);

    const { data, error } = await supabase
      .from('cash_shifts')
      .insert({
        id: shiftId,
        tenant_id: tenantId,
        branch_id: branchId,
        branch_name: branchName,
        user_id: userId,
        user_name: userName,
        opening_cash: openingCash,
        expected_cash: openingCash,
        status: 'OPEN'
      })
      .select()
      .single();

    if (error) {
      console.error("Error opening shift in Supabase", error);
      throw error;
    }

    set((state) => ({
      shifts: {
        ...state.shifts,
        [branchId]: {
          id: data.id,
          openedAt: new Date(data.opened_at).toLocaleString(),
          openingCash: openingCash,
          salesCash: 0,
          salesCard: 0,
          withdrawals: 0
        }
      }
    }));
  },

  addSale: async (branchId, amount, method) => {
    // Primero actualizar localmente para UI instántanea
    set((state) => {
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
    });

    // Luego sincronizar el expected_cash con Supabase si fue en efectivo
    if (method === 'cash') {
      const shift = get().shifts[branchId];
      if (shift) {
        const expectedCash = shift.openingCash + shift.salesCash - shift.withdrawals;
        await supabase
          .from('cash_shifts')
          .update({ expected_cash: expectedCash })
          .eq('id', shift.id);
      }
    }
  },

  addWithdrawal: async (branchId, amount) => {
    set((state) => {
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
    });

    // Sincronizar expected_cash
    const shift = get().shifts[branchId];
    if (shift) {
      const expectedCash = shift.openingCash + shift.salesCash - shift.withdrawals;
      await supabase
        .from('cash_shifts')
        .update({ expected_cash: expectedCash })
        .eq('id', shift.id);
    }
  },

  closeShift: async (branchId, actualCashCount = 0) => {
    const shift = get().shifts[branchId];
    if (!shift) return;

    const expectedCash = shift.openingCash + shift.salesCash - shift.withdrawals;
    const difference = actualCashCount - expectedCash;
    
    // Traer el id del cajero actual
    const { useBranchStore } = await import('./branchStore');
    const closedByUserId = useBranchStore.getState().user?.id || 'anonymous';

    const { error } = await supabase
      .from('cash_shifts')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        closed_by: closedByUserId,
        expected_cash: expectedCash,
        actual_cash_count: actualCashCount,
        difference: difference
      })
      .eq('id', shift.id);

    if (error) {
      console.error("Error closing shift", error);
      throw error;
    }

    set((state) => {
      const newShifts = { ...state.shifts };
      delete newShifts[branchId];
      return { shifts: newShifts };
    });
  },

  logout: () => set({ user: null })
}));
