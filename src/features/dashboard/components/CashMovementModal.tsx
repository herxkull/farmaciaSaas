import { useState } from 'react';
import { X, MinusCircle, PlusCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useShiftStore } from '../../../stores/shiftStore';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
}

export function CashMovementModal({ isOpen, onClose, branchId }: CashMovementModalProps) {
  const [type, setType] = useState<'withdrawal' | 'deposit'>('withdrawal');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Monto inválido');
      return;
    }

    if (type === 'withdrawal') {
      useShiftStore.getState().addWithdrawal(branchId, parsedAmount);
    } else {
      useShiftStore.getState().addWithdrawal(branchId, -parsedAmount);
    }

    setAmount('');
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-800">Registrar Movimiento</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setType('withdrawal')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                type === 'withdrawal' 
                  ? "border-rose-500 bg-rose-50 text-rose-700" 
                  : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
              )}
            >
              <MinusCircle className="w-6 h-6" />
              <span className="font-bold text-sm">Retiro / Egreso</span>
            </button>

            <button
              type="button"
              onClick={() => setType('deposit')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                type === 'deposit' 
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                  : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
              )}
            >
              <PlusCircle className="w-6 h-6" />
              <span className="font-bold text-sm">Depósito / Ingreso</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monto (C$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Motivo / Concepto</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Ej. Pago a proveedor..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-8 bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            Confirmar Movimiento
          </button>
        </form>
      </div>
    </div>
  );
}
