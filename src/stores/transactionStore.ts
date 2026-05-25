import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  clearTransactions: () => void;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'TX-99012', date: '2026-05-18 11:24', branchId: 'b-01', branchName: 'Sucursal Centro', cashier: 'Hernández, Hersan', total: 420.50, paymentMethod: 'Efectivo', category: 'Controlados' },
  { id: 'TX-99013', date: '2026-05-18 10:45', branchId: 'b-02', branchName: 'Sucursal Norte', cashier: 'Pérez, Ana', total: 1250.00, paymentMethod: 'Tarjeta', category: 'Antibióticos' },
  { id: 'TX-99014', date: '2026-05-18 09:12', branchId: 'b-01', branchName: 'Sucursal Centro', cashier: 'Hernández, Hersan', total: 85.00, paymentMethod: 'Efectivo', category: 'Gastroenterología' },
  { id: 'TX-99015', date: '2026-05-17 18:30', branchId: 'b-02', branchName: 'Sucursal Norte', cashier: 'Gómez, Carlos', total: 185.00, paymentMethod: 'Tarjeta', category: 'Controlados' },
  { id: 'TX-99016', date: '2026-05-17 16:15', branchId: 'b-01', branchName: 'Sucursal Centro', cashier: 'Hernández, Hersan', total: 320.00, paymentMethod: 'Mixto', category: 'Analgésicos' },
  { id: 'TX-99017', date: '2026-05-17 14:02', branchId: 'b-02', branchName: 'Sucursal Norte', cashier: 'Pérez, Ana', total: 450.00, paymentMethod: 'Tarjeta', category: 'Endocrinología' },
  { id: 'TX-99018', date: '2026-05-16 12:45', branchId: 'b-01', branchName: 'Sucursal Centro', cashier: 'Gómez, Carlos', total: 110.00, paymentMethod: 'Efectivo', category: 'Antihistamínicos' },
  { id: 'TX-99019', date: '2026-05-16 10:30', branchId: 'b-02', branchName: 'Sucursal Norte', cashier: 'Pérez, Ana', total: 55.00, paymentMethod: 'Efectivo', category: 'Analgésicos' },
  { id: 'TX-99020', date: '2026-05-15 17:40', branchId: 'b-01', branchName: 'Sucursal Centro', cashier: 'Hernández, Hersan', total: 640.00, paymentMethod: 'Tarjeta', category: 'Antibióticos' },
  { id: 'TX-99021', date: '2026-05-15 15:20', branchId: 'b-02', branchName: 'Sucursal Norte', cashier: 'Gómez, Carlos', total: 95.00, paymentMethod: 'Efectivo', category: 'Gastroenterología' }
];

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set) => ({
      transactions: INITIAL_TRANSACTIONS,
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
    }),
    {
      name: 'zefiro-transactions-storage',
    }
  )
);
