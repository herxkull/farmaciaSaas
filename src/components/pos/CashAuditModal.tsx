import { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  AlertTriangle, 
  ShieldAlert, 
  Printer, 
  Eye, 
  EyeOff, 
  Lock,
  Coins,
  FileText,
  CreditCard,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useShiftStore } from '../../stores/shiftStore';

interface CashAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOpeningFlow?: boolean; // Si es true, muestra el formulario de apertura; si es false, el de arqueo/cierre
}

// Denominaciones oficiales de Nicaragua (Córdobas - NIO)
const BILLS = [
  { value: 1000, label: 'C$1,000 NIO', isBill: true },
  { value: 500, label: 'C$500 NIO', isBill: true },
  { value: 200, label: 'C$200 NIO', isBill: true },
  { value: 100, label: 'C$100 NIO', isBill: true },
  { value: 50, label: 'C$50 NIO', isBill: true },
  { value: 20, label: 'C$20 NIO', isBill: true },
  { value: 10, label: 'C$10 NIO', isBill: true },
];

const COINS = [
  { value: 5, label: 'C$5 NIO', isBill: false },
  { value: 1, label: 'C$1 NIO', isBill: false },
];

import { useBranchStore } from '../../stores/branchStore';

export default function CashAuditModal({ isOpen, onClose, isOpeningFlow = false }: CashAuditModalProps) {
  const activeBranch = useBranchStore((state) => state.activeBranch);
  const currentShift = useShiftStore((state) => activeBranch ? state.shifts[activeBranch.id] : null);
  const { openShift, closeShift, user } = useShiftStore();

  // --- ESTADO PARA APERTURA DE CAJA ---
  const [openingCashInput, setOpeningCashInput] = useState<string>('2000');
  const [isOpeningSubmitting, setIsOpeningSubmitting] = useState(false);

  // --- ESTADOS PARA ARQUEO Y CIERRE ---
  const [blindAudit, setBlindAudit] = useState<boolean>(true); // Arqueo ciego activo por defecto
  
  // Conteo de billetes y monedas (denominación id -> cantidad)
  const [counts, setCounts] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    [...BILLS, ...COINS].forEach(d => {
      initial[d.value] = '';
    });
    return initial;
  });

  const [cardsInput, setCardsInput] = useState<string>('');
  const [valesInput, setValesInput] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [nextTurnFund, setNextTurnFund] = useState<string>('2000');

  // Control de doble paso para confirmación
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const [isPrintingTicket, setIsPrintingTicket] = useState<boolean>(false);
  const [printProgress, setPrintProgress] = useState<number>(0);

  // Resetear estados al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setConfirmStep(false);
      setIsPrintingTicket(false);
      setPrintProgress(0);
      setJustification('');
      setOpeningCashInput('2000');
      setNextTurnFund('2000');
      setCardsInput('');
      setValesInput('');
      // Limpiar conteos
      const resetCounts: Record<number, string> = {};
      [...BILLS, ...COINS].forEach(d => {
        resetCounts[d.value] = '';
      });
      setCounts(resetCounts);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Lógica de valores esperados en el sistema (Estáticos Base + Acumulado de ventas del ShiftStore)
  const expectedFondoInicial = currentShift?.openingCash || 2000;
  const expectedVentasEfectivo = currentShift?.salesCash || 0;
  const expectedEgresos = currentShift?.withdrawals || 0;
  const expectedVentasTarjeta = currentShift?.salesCard || 0;
  
  const expectedTotalEfectivo = expectedFondoInicial + expectedVentasEfectivo - expectedEgresos;
  const expectedTotalSistema = expectedTotalEfectivo + expectedVentasTarjeta; // Total en caja esperado (Efectivo + Tarjetas)

  // --- CÁLCULO DE CONTEO FÍSICO ---
  const cashTotal = Object.entries(counts).reduce((acc, [value, qtyStr]) => {
    const qty = parseInt(qtyStr) || 0;
    return acc + (qty * parseInt(value));
  }, 0);

  const cardsTotal = parseFloat(cardsInput) || 0;
  const valesTotal = parseFloat(valesInput) || 0;

  const totalDeclarado = cashTotal + cardsTotal + valesTotal;
  const diferencia = totalDeclarado - expectedTotalSistema;

  const isFaltante = diferencia < -0.01;
  const isSobrante = diferencia > 0.01;
  const isCuadrada = Math.abs(diferencia) <= 0.01;

  // Validación para permitir el cierre:
  // Si hay faltante, obligatoriamente se debe rellenar la justificación
  const canCloseShift = !isFaltante || justification.trim().length >= 10;

  // --- ACCIÓN: APERTURA DE TURNO ---
  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fund = parseFloat(openingCashInput) || 0;
    if (fund < 0) return;

    setIsOpeningSubmitting(true);
    // Simular conexión segura y registro de auditoría
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (activeBranch) {
      openShift(activeBranch.id, fund);
    }
    setIsOpeningSubmitting(false);
    onClose();
  };

  // --- ACCIÓN: CIERRE DE TURNO CON SIMULACIÓN DE TICKET Z ---
  const handleCloseShiftSubmit = async () => {
    if (!canCloseShift) return;

    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    // Iniciar simulación de impresión de Ticket Z
    setIsPrintingTicket(true);
    
    // Simular el feed del papel del ticket con porcentaje de carga
    for (let i = 0; i <= 100; i += 10) {
      setPrintProgress(i);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Limpiar los clientes mock de prueba
    useCustomerStore.getState().clearCustomers();
    
    // Asegurarnos que la caja (turno) nazca cerrada
    useShiftStore.getState().logout();
    
    // Cerrar el turno en el ShiftStore
    if (activeBranch) {
      closeShift(activeBranch.id);
    }
    setIsPrintingTicket(false);
    onClose();
  };

  const handleQtyChange = (value: number, text: string) => {
    // Validar solo números enteros
    const sanitized = text.replace(/[^0-9]/g, '');
    setCounts(prev => ({
      ...prev,
      [value]: sanitized
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* ========================================== */}
      {/* FLUJO DE APERTURA DE CAJA                  */}
      {/* ========================================== */}
      {isOpeningFlow ? (
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-slate-50/50 border-b border-slate-100 p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Apertura de Caja</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Inicializar Turno POS</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleOpenShiftSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Cajero Responsable</label>
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                {user?.name || 'Hernández, Hersan'} ({user?.role === 'CASHIER' ? 'Cajero POS' : 'Administrador'})
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Sucursal Activa</label>
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                {activeBranch?.name || 'Sucursal Centro'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Fondo de Apertura (Córdobas - NIO)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-black">
                  C$
                </div>
                <input 
                  type="text"
                  required
                  placeholder="2000"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-extrabold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Efectivo en monedas y billetes para dar cambio al inicio del turno.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button 
                type="button" 
                onClick={onClose}
                className="py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isOpeningSubmitting}
                className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
              >
                {isOpeningSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  'Abrir Turno'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ========================================== */
        /* FLUJO DE ARQUEO Y CIERRE DE CAJA           */
        /* ========================================== */
        <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
          
          {/* Cabecera del Modal */}
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Arqueo de Caja - Cierre de Turno</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  Cajero: <span className="text-slate-600">{user?.name || 'Hernández, Hersan'}</span> • {activeBranch?.name || 'Sucursal Centro'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Toggle de Arqueo Ciego */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                <button
                  onClick={() => setBlindAudit(true)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                    blindAudit 
                      ? "bg-white text-indigo-700 shadow-sm border border-slate-200/30" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Ciego
                </button>
                <button
                  onClick={() => setBlindAudit(false)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                    !blindAudit 
                      ? "bg-white text-indigo-700 shadow-sm border border-slate-200/30" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Auditoría
                </button>
              </div>

              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cuerpo dividido en 2 secciones */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* COLUMNA IZQUIERDA: EL SISTEMA (2/5) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="relative border border-slate-200/70 rounded-3xl p-5 overflow-hidden h-full flex flex-col bg-slate-50/50">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Saldos en Sistema</h4>
                
                {/* Panel Glassmorphic del Arqueo Ciego */}
                {blindAudit && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-sm animate-pulse">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h5 className="text-xs font-extrabold text-slate-800">Arqueo Ciego Activo</h5>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1 max-w-[200px]">
                      Por políticas de seguridad, los saldos teóricos esperados en el sistema están ocultos durante el conteo físico.
                    </p>
                  </div>
                )}

                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Fondo Inicial</p>
                      <p className="text-[9px] text-slate-400 font-medium">Efectivo inicial cargado al abrir turno</p>
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">C${expectedFondoInicial.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Ventas en Efectivo</p>
                      <p className="text-[9px] text-slate-400 font-medium">Acumulado real de terminal POS</p>
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm text-emerald-600">+C${expectedVentasEfectivo.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Retiros / Egresos de Turno</p>
                      <p className="text-[9px] text-slate-400 font-medium">Salidas de efectivo justificadas</p>
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm text-rose-600">-C${expectedEgresos.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-200/50">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Ventas con Tarjeta (Vouchers)</p>
                      <p className="text-[9px] text-slate-400 font-medium">Débito y crédito reportado por el POS</p>
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">+C${expectedVentasTarjeta.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 bg-slate-50 -mx-5 -mb-5 p-5 rounded-b-3xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Esperado en Caja</p>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Efectivo + Vouchers</p>
                    </div>
                    <span className="text-lg font-black text-indigo-700">C${expectedTotalSistema.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: EL CONTEO FÍSICO (3/5) */}
            <div className="lg:col-span-3 space-y-5">
              
              {/* Billetes y Monedas */}
              <div className="border border-slate-200/80 rounded-3xl p-5 bg-white">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-indigo-600" />
                  Efectivo Físico (Desglose de Moneda)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Columna de Billetes */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Billetes</p>
                    {BILLS.map(denom => (
                      <div key={denom.value} className="flex items-center justify-between gap-2.5">
                        <span className="text-xs font-bold text-slate-600 w-24 shrink-0">{denom.label}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs text-slate-400 font-bold">x</span>
                          <input 
                            type="text"
                            placeholder="0"
                            value={counts[denom.value]}
                            onChange={(e) => handleQtyChange(denom.value, e.target.value)}
                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <span className="text-xs font-extrabold text-slate-700 w-20 text-right">
                          C${((parseInt(counts[denom.value]) || 0) * denom.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Columna de Monedas */}
                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-100 md:pl-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Monedas</p>
                    {COINS.map(denom => (
                      <div key={denom.value} className="flex items-center justify-between gap-2.5">
                        <span className="text-xs font-bold text-slate-600 w-24 shrink-0">{denom.label}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs text-slate-400 font-bold">x</span>
                          <input 
                            type="text"
                            placeholder="0"
                            value={counts[denom.value]}
                            onChange={(e) => handleQtyChange(denom.value, e.target.value)}
                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <span className="text-xs font-extrabold text-slate-700 w-20 text-right">
                          C${((parseInt(counts[denom.value]) || 0) * denom.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    
                    {/* Subtotal Efectivo */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Subtotal Efectivo</span>
                      <span className="text-xs font-black text-slate-800">C${cashTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Otros Medios y Justificantes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200/80 rounded-3xl p-5 bg-white space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    Otros Medios de Pago
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Vouchers de Tarjeta (Total C$)</label>
                      <input 
                        type="text"
                        placeholder="0.00"
                        value={cardsInput}
                        onChange={(e) => setCardsInput(e.target.value.replace(/[^0-9.]/g, ''))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Documentos / Vales (Total C$)</label>
                      <input 
                        type="text"
                        placeholder="0.00"
                        value={valesInput}
                        onChange={(e) => setValesInput(e.target.value.replace(/[^0-9.]/g, ''))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200/80 rounded-3xl p-5 bg-white flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Arqueo de Auditoría
                    </h4>
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Total Efectivo:</span>
                        <span className="text-slate-800">C${cashTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Total Tarjetas:</span>
                        <span className="text-slate-800">C${cardsTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Total Vales/Doc:</span>
                        <span className="text-slate-800">C${valesTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Total Declarado</span>
                    <span className="text-sm font-black text-indigo-700">C${totalDeclarado.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Panel Fijo Inferior de Resultados y Diferencias */}
          <div className="border-t border-slate-200 bg-slate-50/50 p-5 shrink-0 space-y-4">
            
            {/* Balance y Alertas de Diferencia */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-2xl">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cálculo de Diferencia</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xs font-bold text-slate-500">Total Declarado: C${totalDeclarado.toFixed(2)} vs Esperado</span>
                </div>
              </div>

              {/* Badges de Diferencia */}
              <div className="flex items-center gap-3">
                {isCuadrada && (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl font-bold text-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                    Caja Cuadrada (Diferencia C$0.00 NIO)
                  </div>
                )}

                {isFaltante && (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-bold text-xs animate-pulse">
                    <ShieldAlert className="w-4 h-4" />
                    Faltante de Caja ({diferencia.toFixed(2)} NIO)
                  </div>
                )}

                {isSobrante && (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    Sobrante de Caja (+{diferencia.toFixed(2)} NIO)
                  </div>
                )}
              </div>
            </div>

            {/* Justificación obligatoria si hay faltante */}
            {isFaltante && (
              <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Justificación de Faltante Obligatoria (Mínimo 10 caracteres)</span>
                </div>
                <textarea 
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Por favor justifica el faltante de caja aquí (ej. cobro mal computado en tarjeta, vouchers faltantes...)"
                  className="w-full p-3 bg-white border border-rose-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none h-16 resize-none transition-all"
                />
              </div>
            )}

            {/* Footer Final */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
              
              {/* Fondo Siguiente Turno */}
              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <div className="shrink-0">
                  <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Fondo Siguiente Turno</label>
                  <div className="relative w-44">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-black">
                      C$
                    </div>
                    <input 
                      type="text"
                      placeholder="2000"
                      value={nextTurnFund}
                      onChange={(e) => setNextTurnFund(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  Cancelar
                </button>
                
                <button 
                  type="button"
                  disabled={!canCloseShift}
                  onClick={handleCloseShiftSubmit}
                  className={cn(
                    "px-6 py-2.5 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-97 cursor-pointer",
                    !canCloseShift 
                      ? "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed"
                      : confirmStep 
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                  )}
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  {confirmStep 
                    ? "¿Confirmar Cierre Real? Haz Clic de Nuevo" 
                    : "Confirmar Cierre e Imprimir Ticket Z"}
                </button>
              </div>

            </div>

          </div>

          {/* ========================================== */}
          {/* ANIMACIÓN DE IMPRESIÓN DE TICKET Z         */}
          {/* ========================================== */}
          {isPrintingTicket && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <div className="w-full max-w-sm flex flex-col items-center">
                
                {/* Sonido ficticio / Animación Visual de la impresora */}
                <div className="w-full bg-slate-800 rounded-3xl p-5 border border-slate-700 shadow-2xl relative overflow-hidden flex flex-col items-center">
                  <div className="flex items-center gap-2 text-indigo-400 mb-6">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Transmitiendo Reporte Z...</span>
                  </div>

                  {/* El papel saliendo del POS */}
                  <div className="w-full bg-white border-x border-slate-300 p-5 shadow-2xl flex flex-col font-mono text-[10px] text-slate-800 space-y-2 select-none relative transition-all duration-300 rounded-t-sm"
                       style={{ transform: `translateY(${100 - printProgress}%)`, minHeight: '300px' }}>
                    
                    {/* Línea dentada superior del ticket */}
                    <div className="absolute -top-1.5 left-0 right-0 h-1.5 bg-slate-100 flex overflow-hidden">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} className="w-2.5 h-2.5 bg-white border-t border-l border-slate-300 rotate-45 shrink-0" 
                             style={{ marginTop: '3px' }}></div>
                      ))}
                    </div>

                    <div className="text-center font-bold tracking-tight">
                      <p className="text-[12px] font-black">ZEFIRO PHARMACY SUITE</p>
                      <p>RUC: 12903810293-8</p>
                      <p>{activeBranch?.name || 'SUCURSAL CENTRO'}</p>
                      <p className="text-[8px] text-slate-400 mt-1">--- CIERRE DE TURNO / TICKET Z ---</p>
                    </div>

                    <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>FECHA/HORA:</span>
                        <span>{new Date().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CAJERO:</span>
                        <span>{user?.name.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TURNO ID:</span>
                        <span>{currentShift?.id}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 font-bold">
                      <div className="flex justify-between">
                        <span>FONDO INICIAL:</span>
                        <span>C${expectedFondoInicial.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>VENTAS EFECTIVO:</span>
                        <span>+C${expectedVentasEfectivo.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-rose-700">
                        <span>RETIROS / EGRESOS:</span>
                        <span>-C${expectedEgresos.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VENTAS TARJETA:</span>
                        <span>+C${expectedVentasTarjeta.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="border-t-2 border-double border-slate-400 pt-2 space-y-1 font-black">
                      <div className="flex justify-between text-slate-900 text-xs">
                        <span>TOTAL SISTEMA:</span>
                        <span>C${expectedTotalSistema.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 text-xs">
                        <span>TOTAL DECLARADO:</span>
                        <span>C${totalDeclarado.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-700 border-t border-slate-200 pt-1">
                        <span>DIFERENCIA:</span>
                        <span>C${diferencia.toFixed(2)}</span>
                      </div>
                    </div>

                    {isFaltante && (
                      <div className="border-t border-dashed border-slate-300 pt-2 text-[8px] text-rose-600 font-semibold leading-relaxed">
                        <p className="font-bold uppercase">JUSTIFICACIÓN DE FALTANTE:</p>
                        <p className="italic">"{justification}"</p>
                      </div>
                    )}

                    <div className="text-center pt-4 text-[8px] text-slate-400">
                      <p>--- TRANSMISIÓN COMPLETA A NUBE ---</p>
                      <p>¡MUCHAS GRACIAS POR TU TRABAJO!</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-white/80 mt-4 font-bold uppercase tracking-wider flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-400 animate-bounce" />
                  Imprimiendo Ticket Z... {printProgress}%
                </p>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
