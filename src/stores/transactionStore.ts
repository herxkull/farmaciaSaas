import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Transaction {
  id: string;
  date: string;
  branchId: string;
  branchName: string;
  cashier: string;
  total: number;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Mixto';
  category: string;
  earnedPoints?: number;
  itemsCount?: number;
}

interface TransactionState {
  transactions: Transaction[];
  fetchTransactionsFromSupabase: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()((set) => ({
  transactions: [],
  fetchTransactionsFromSupabase: async () => {
    const { useBranchStore } = await import('./branchStore');
    const tenantId = useBranchStore.getState().user?.tenantId;
    if (!tenantId) return;

    const { data, error } = await supabase
      .from('sales')
      .select(`
        id, 
        created_at, 
        branch_id, 
        user_id,
        total, 
        status
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      if (error) console.error('Error fetching transactions:', error);
      return;
    }


    const state = useBranchStore.getState();
    
    const mapped = data.map((sale: any) => {
      const b = state.availableBranches.find(br => br.id === sale.branch_id);
      const u = state.users.find(us => us.id === sale.user_id);
      
      return {
        id: sale.id,
        date: sale.created_at.replace('T', ' ').substring(0, 16),
        branchId: sale.branch_id,
        branchName: b ? b.name : 'Sucursal Desconocida',
        cashier: u ? u.name : 'Cajero Desconocido',
        total: Number(sale.total),
        paymentMethod: 'Efectivo' as const, // Simplificación
        category: 'General',
        itemsCount: 1
      };
    });

    set({ transactions: mapped });
  },
  addTransaction: (transaction) => {
    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newTx: Transaction = {
      ...transaction,
      id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
      date: dateString,
    };
    
    set((state) => ({
      transactions: [newTx, ...state.transactions]
    }));
  },
  clearTransactions: () => set({ transactions: [] })
}));
