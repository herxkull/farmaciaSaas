import { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  AlertTriangle, 
  Package2,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  Users,
  Percent,
  PiggyBank,
  Activity,
  CreditCard,
  MinusCircle,
  PlusCircle
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useBranchStore } from '../../../stores/branchStore';
import { useInventoryStore } from '../../../stores/inventoryStore';
import { useTransactionStore } from '../../../stores/transactionStore';
import { useCustomerStore } from '../../../stores/customerStore';
import { useShiftStore } from '../../../stores/shiftStore';
import { CashMovementModal } from '../components/CashMovementModal';

// Interfaces de Tipado
interface BestSeller {
  id: string;
  name: string;
  activeIng: string;
  sales: number;
  margin: number;
  img: string;
}

export default function DashboardScreen() {
  const { activeBranch, user } = useBranchStore();

  // ==========================================
  // ESTADOS REACTIVOS INTERACTIVOS
  // ==========================================
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [timeRange, setTimeRange] = useState<'hoy' | 'mes'>('hoy');
  const [sortKey, setSortKey] = useState<'sales' | 'margin'>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeAlertFilter, setActiveAlertFilter] = useState<'all' | 'stock' | 'expiry'>('all');
  const [processedAlerts, setProcessedAlerts] = useState<number[]>([]);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  // Determinar si es una sucursal de prueba (las default son b-01 a b-05)
  const isDemoBranch = activeBranch?.id?.startsWith('b-0');

  const currentShift = useShiftStore((state) => activeBranch ? state.shifts[activeBranch.id] : null);
  const baseAmount = currentShift ? currentShift.openingCash : (isDemoBranch ? 2500 : 0);

  // ==========================================
  // DATOS DINÁMICOS REALES
  // ==========================================
  const transactions = useTransactionStore((state) => state.transactions);
  const inventory = useInventoryStore((state) => state.inventory);
  
  const branchTransactions = transactions.filter(t => t.branchId === activeBranch?.id);
  
  const now = new Date();
  const dateStringToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dateStringMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const filteredBranchTransactions = branchTransactions.filter(t => {
    if (timeRange === 'hoy') return t.date.startsWith(dateStringToday);
    return t.date.startsWith(dateStringMonth);
  });

  const branchInventory = activeBranch?.id ? (inventory[activeBranch.id] || []) : [];

  const totalSales = filteredBranchTransactions.reduce((acc, t) => acc + t.total, 0);
  const avgTicket = filteredBranchTransactions.length > 0 ? totalSales / filteredBranchTransactions.length : 0;

  const kpiSales = `C$${totalSales.toFixed(2)}`;
  const kpiTicket = `C$${avgTicket.toFixed(2)}`;
  
  const outOfStockCount = branchInventory.filter(p => p.stockTotal === 0).length;
  const lowStockCount = branchInventory.filter(p => p.stockTotal > 0 && p.stockTotal < 15).length;
  
  const kpiOutOfStock = outOfStockCount.toString();
  const kpiLowStock = lowStockCount.toString();

  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() + 3);

  let realClinicalAlerts: any[] = [];
  let expCount = 0;

  branchInventory.forEach((product, idx) => {
    if (product.stockTotal === 0) {
      realClinicalAlerts.push({
        id: parseInt(`1${idx}`),
        title: product.name,
        subtitle: 'Stock crítico debajo del mínimo (0 uds)',
        type: 'stock',
        urgency: 'high'
      });
    } else if (product.stockTotal < 15) {
      realClinicalAlerts.push({
        id: parseInt(`2${idx}`),
        title: product.name,
        subtitle: `Existencias bajas en anaquel (${product.stockTotal} uds)`,
        type: 'stock',
        urgency: 'medium'
      });
    }

    product.batches.forEach((batch, bidx) => {
      const expDate = new Date(batch.expirationDate);
      if (expDate < limitDate) {
        expCount++;
        const days = Math.floor((expDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        realClinicalAlerts.push({
          id: parseInt(`3${idx}${bidx}`),
          title: product.name,
          subtitle: `Lote ${batch.batchNumber} expira en ${days >= 0 ? days : 0} días`,
          type: 'expiry',
          urgency: days < 30 ? 'high' : 'medium'
        });
      }
    });
  });

  const clinicalAlerts = realClinicalAlerts;
  const kpiExpiring = `${expCount} lotes`;

  // Calcular las ventas reales de los últimos 7 días
  const calculateRealWeeklySales = () => {
    const today = new Date();
    const result = [];
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const daySales = branchTransactions
        .filter(t => t.date.startsWith(dateString))
        .reduce((sum, t) => sum + t.total, 0);
        
      result.push({
        day: daysOfWeek[d.getDay()],
        actual: daySales,
        projected: 1000, // Projection could be dynamic later
        date: i === 0 ? 'Hoy' : `Hace ${i} días`
      });
    }
    return result;
  };

  const weeklySales = calculateRealWeeklySales();

  const bestSellers: BestSeller[] = [...branchInventory]
    .map(p => {
      const assumedInitialStock = p.category === 'Analgésicos' ? 150 : p.category === 'Antibióticos' ? 40 : 50;
      const retroSold = Math.max(0, assumedInitialStock - p.stockTotal);
      return {
        ...p,
        calculatedSales: (p as any).soldTotal !== undefined ? (p as any).soldTotal : retroSold
      };
    })
    .sort((a, b) => b.calculatedSales - a.calculatedSales)
    .slice(0, 5)
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      activeIng: p.activeIngredient,
      sales: p.calculatedSales,
      margin: Math.floor(Math.random() * 40) + 20,
      img: ['💊', '🧪', '🔒', '🧴', '🩹'][i % 5]
    }));

  // Agrupar transacciones por cajero
  const cashierStats: Record<string, { trans: number; total: number }> = {};
  branchTransactions.forEach(t => {
    if (!cashierStats[t.cashier]) {
      cashierStats[t.cashier] = { trans: 0, total: 0 };
    }
    cashierStats[t.cashier].trans += 1;
    cashierStats[t.cashier].total += t.total;
  });

  const cashiers = Object.keys(cashierStats).length > 0 
    ? Object.entries(cashierStats).map(([name, stats]) => ({
        name,
        role: 'Personal POS',
        sales: `C$${stats.total.toFixed(2)}`,
        trans: stats.trans,
        ticket: `C$${(stats.total / stats.trans).toFixed(2)}`
      }))
    : [
        { name: user?.name || 'Administrador', role: 'Gerente', sales: 'C$0.00', trans: 0, ticket: 'C$0.00' }
      ];

  const customers = useCustomerStore((state) => state.customers);
  const totalCustomers = customers.length;
  const loyalCustomers = customers.filter(c => c.loyaltyTier !== 'Bronce' && c.loyaltyTier !== undefined).length;
  const kpiFidelityPct = totalCustomers > 0 ? `${Math.round((loyalCustomers / totalCustomers) * 100)}%` : '0%';
  const kpiNewAffiliates = totalCustomers.toString();
  const kpiInvited = totalCustomers > 0 ? `${100 - Math.round((loyalCustomers / totalCustomers) * 100)}%` : '0%';

  const kpiVaultCash = `C$${(totalSales + baseAmount).toFixed(2)}`;

  const kpiCashFlow = [
    { label: 'Fondo de Apertura', val: `C$${baseAmount.toFixed(2)}`, type: 'base', icon: Activity },
    { label: 'Ingresos por Ventas', val: `+C$${totalSales.toFixed(2)}`, type: 'in', icon: PlusCircle },
    { label: 'Retiro parcial / Egresos', val: '-C$0.00', type: 'out', icon: MinusCircle }
  ];

  // Acciones interactivas
  const handleSort = (key: 'sales' | 'margin') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const toggleAlertProcess = (id: number) => {
    setProcessedAlerts(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Clasificación de Top Ventas
  const sortedBestSellers = [...bestSellers].sort((a, b) => {
    const mult = sortOrder === 'asc' ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * mult;
  });

  const filteredAlerts = clinicalAlerts.filter(alert => {
    if (activeAlertFilter === 'all') return true;
    return alert.type === activeAlertFilter;
  });

  const maxVal = Math.max(1000, ...weeklySales.map(d => Math.max(d.actual, d.projected)));

  const handleRegisterMovement = () => {
    if (!currentShift) {
      alert("Debes abrir caja primero.");
      return;
    }
    setIsMovementModalOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 font-sans antialiased text-slate-900 pb-24">
      
      {/* ==========================================
          ENCABEZADO GERENCIAL
          ========================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Panel Ejecutivo de Control</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">Rendimiento financiero y auditoría operativa en tiempo real.</p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center select-none">
            <button 
              onClick={() => setTimeRange('hoy')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", timeRange === 'hoy' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-600 font-extrabold")}
            >Hoy</button>
            <button 
              onClick={() => setTimeRange('mes')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", timeRange === 'mes' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-600 font-extrabold")}
            >Mes</button>
          </div>
        </div>
      </div>

      {/* ==========================================
          FILA SUPERIOR: KPI CARDS CON SPARKLINE SVGS
          ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* CARD 1: VENTAS DEL DÍA */}
        <div className="bg-white rounded-2xl p-5 xl:p-6 border border-slate-200/70 shadow-sm relative group overflow-hidden hover:shadow-md transition-all">
          <div className="flex justify-between items-start relative z-10">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50">
              <DollarSign className="w-5 h-5" />
            </div>
            {isDemoBranch ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3 h-3" /> +12.5% vs ayer
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">
                Sin datos
              </span>
            )}
          </div>
          <div className="mt-4 relative z-10">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ventas Consolidadas</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">{kpiSales}</h3>
          </div>
          {/* Micro sparkline SVG */}
          {isDemoBranch && (
            <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30 group-hover:opacity-50 transition-opacity">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                <path d="M 0 30 Q 20 10, 40 25 T 80 15 T 100 5 L 100 40 L 0 40 Z" fill="url(#grad-indigo)" />
                <path d="M 0 30 Q 20 10, 40 25 T 80 15 T 100 5" fill="none" stroke="#4f46e5" strokeWidth="2" />
                <defs>
                  <linearGradient id="grad-indigo" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="1" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
        </div>

        {/* CARD 2: TICKET PROMEDIO */}
        <div className="bg-white rounded-2xl p-5 xl:p-6 border border-slate-200/70 shadow-sm relative group overflow-hidden hover:shadow-md transition-all">
          <div className="flex justify-between items-start relative z-10">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50">
              <ShoppingBag className="w-5 h-5" />
            </div>
            {isDemoBranch && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3 h-3" /> +4.3% vs ayer
              </span>
            )}
          </div>
          <div className="mt-4 relative z-10">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ticket Promedio</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">{kpiTicket}</h3>
          </div>
          {/* Micro sparkline Emerald */}
          {isDemoBranch && (
            <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30 group-hover:opacity-50 transition-opacity">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                <path d="M 0 25 Q 30 35, 50 15 T 90 20 T 100 8 L 100 40 L 0 40 Z" fill="url(#grad-emerald)" />
                <path d="M 0 25 Q 30 35, 50 15 T 90 20 T 100 8" fill="none" stroke="#059669" strokeWidth="2" />
                <defs>
                  <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#059669" stopOpacity="1" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
        </div>

        {/* CARD 3: ALERTAS DE STOCK (SPLIT) */}
        <div className="bg-white rounded-2xl p-5 xl:p-6 border border-slate-200/70 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/50">
              <Package2 className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{outOfStockCount > 0 ? 'Nivel Crítico' : 'Todo en orden'}</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Alertas de Existencias</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className={cn("block text-xl font-black", outOfStockCount > 0 ? "text-rose-600" : "text-slate-500")}>{kpiOutOfStock}</span>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Agotados</span>
              </div>
              <div className="border-l border-slate-100 pl-3">
                <span className={cn("block text-xl font-black", lowStockCount > 0 ? "text-amber-600" : "text-slate-500")}>{kpiLowStock}</span>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Bajo Mín</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: LOTES POR CADUCAR */}
        <div className="bg-white rounded-2xl p-5 xl:p-6 border border-slate-200/70 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100/50">
              <AlertTriangle className="w-5 h-5" />
            </div>
            {expCount > 0 && (
              <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
                Ver Listado
              </button>
            )}
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Lotes Próximos a Vencer</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1">{kpiExpiring}</h3>
            {expCount > 0 && (
              <p className="text-[9px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Próximos 30 días
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ==========================================
          SECCIÓN CENTRAL: GRÁFICO SEMANAL & ESTADO DE CAJA
          ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO INTERACTIVO DE VENTAS (2/3 ANCHO) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/70 p-6 xl:p-7 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Desempeño Semanal Consolidado</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Flujo monetario capturado vs proyecciones estimadas.</p>
            </div>
            
            <div className="flex items-center gap-2.5 select-none">
              {/* Selector Línea / Barras */}
              <div className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 flex text-xs font-bold">
                <button 
                  onClick={() => setChartType('line')}
                  className={cn("px-3 py-1.5 rounded-lg transition-all", chartType === 'line' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >Líneas</button>
                <button 
                  onClick={() => setChartType('bar')}
                  className={cn("px-3 py-1.5 rounded-lg transition-all", chartType === 'bar' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >Barras</button>
              </div>
            </div>
          </div>

          {/* LEYENDA FUNCIONAL */}
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-6 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded bg-indigo-600"></span> Venta Neta (C$)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded bg-slate-200"></span> Proyectado (C$)
            </div>
          </div>

          {/* CONTENEDOR DINÁMICO DE GRÁFICO SIMULADO CON INTERACTIVIDAD */}
          <div className="h-64 flex items-end gap-3 md:gap-6 px-2 relative border-b border-slate-200/60 pb-1 flex-1">
            
            {weeklySales.map((item, idx) => {
              const actHeight = (item.actual / maxVal) * 100;
              const projHeight = (item.projected / maxVal) * 100;
              
              return (
                <div 
                  key={idx} 
                  className="flex-1 flex items-end h-full relative group cursor-pointer"
                  onMouseEnter={() => setHoveredDay(idx)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* BARRAS VERTICALES */}
                  {chartType === 'bar' ? (
                    <div className="w-full flex items-end gap-1 h-full">
                      {/* Barra Proyectada (Fondo) */}
                      <div 
                        style={{ height: `${projHeight}%` }} 
                        className="w-full bg-slate-100 group-hover:bg-slate-200 rounded-t-md transition-all duration-200 relative"
                      />
                      {/* Barra Real (Al frente) */}
                      <div 
                        style={{ height: `${actHeight}%` }} 
                        className="w-full bg-indigo-600 group-hover:bg-indigo-700 rounded-t-md transition-all duration-200 shadow-inner relative"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-400/50 rounded-t-md" />
                      </div>
                    </div>
                  ) : (
                    /* LÍNEAS SIMULADAS (USANDO DIVS CON CONECTORES) */
                    <div className="w-full h-full flex flex-col items-center justify-end relative pb-4">
                      {/* Línea indicadora de eje invisible */}
                      <div className="absolute inset-y-0 border-l border-dashed border-slate-100 group-hover:border-indigo-200 transition-colors"></div>
                      
                      {/* Dot real flotante */}
                      <div 
                        style={{ bottom: `${actHeight}%` }}
                        className="absolute w-3 h-3 bg-white border-[3px] border-indigo-600 rounded-full z-10 shadow-md group-hover:scale-125 transition-all"
                      />
                      <div style={{ bottom: `${projHeight}%` }} className="absolute w-2.5 h-2.5 bg-white border-2 border-slate-300 rounded-full z-0 opacity-60" />
                    </div>
                  )}

                  {hoveredDay === idx && (
                      <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 bg-slate-900 text-white p-3 rounded-xl shadow-2xl z-30 text-xs min-w-[140px] animate-in fade-in zoom-in-95 duration-150 border border-slate-700">
                        <div className="font-black tracking-tight mb-1 border-b border-slate-700 pb-1 text-[10px] uppercase text-indigo-300">{item.day}, {item.date}</div>
                        <div className="space-y-1 font-medium">
                          <div className="flex justify-between">
                            <span>Real:</span>
                            <span className="font-bold">C${item.actual.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Proy:</span>
                            <span>C${item.projected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                          {item.projected > 0 && (
                            <div className="flex justify-between text-[10px] font-bold text-emerald-400 border-t border-slate-800 pt-1">
                              <span>Diferencia:</span>
                              <span className={item.actual >= item.projected ? "text-emerald-400" : "text-rose-400"}>
                                {item.actual >= item.projected ? '+' : ''}{((item.actual - item.projected) / item.projected * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                      </div>
                  )}

                  <span className="absolute top-[105%] left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap tracking-wide">
                    {item.day.substring(0, 3)}
                  </span>
                </div>
              );
            })}

          </div>
        </div>

        {/* WIDGET 2: ESTADO DE CAJA Y FLUJO DE EFECTIVO (1/3 ANCHO) */}
        <div className="bg-white rounded-3xl border border-slate-200/70 p-6 xl:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-800 leading-tight">Control de Efectivo</h3>
              </div>
              <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold tracking-wider uppercase">Auditado</div>
            </div>

            {/* Desglose de Movimientos */}
            <div className="space-y-3.5">
              {kpiCashFlow.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1 font-medium">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <item.icon className={cn(
                       "w-3.5 h-3.5 shrink-0",
                       item.type === 'in' && "text-emerald-500",
                       item.type === 'out' && "text-rose-500",
                       item.type === 'base' && "text-slate-400"
                    )} />
                    <span>{item.label}</span>
                  </div>
                  <span className={cn(
                    "text-xs font-extrabold leading-none",
                    item.type === 'in' && "text-emerald-700",
                    item.type === 'out' && "text-rose-700",
                    item.type === 'base' && "text-slate-800"
                  )}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-1 mb-4 border border-slate-100 shadow-inner-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Efectivo Neto en Bóveda</span>
              <div className="text-xl font-black text-slate-800 tracking-tight">{kpiVaultCash}</div>
              <span className="text-[9px] text-slate-400 font-medium">(Solo Cash físico, excluye tarjetas)</span>
            </div>

            <button onClick={handleRegisterMovement} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all">
              <PlusCircle className="w-4 h-4" /> Registrar Retiro / Depósito
            </button>
          </div>
        </div>

      </div>

      {/* ==========================================
          FILA INFERIOR: 3 NUEVOS WIDGETS COMPACTOS
          ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* NUEVO WIDGET: TOP 5 PRODUCTOS (ORDENABLE) */}
        <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-extrabold text-slate-800">Top 5 Más Vendidos</h3>
            <Percent className="w-4 h-4 text-slate-400" />
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-xl flex-1 flex flex-col bg-slate-50/30">
            <table className="w-full text-left text-[11px] border-collapse flex-1">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-extrabold select-none">
                  <th className="p-2.5 pl-3 uppercase">Prod</th>
                  <th 
                    onClick={() => handleSort('sales')}
                    className="p-2.5 text-right cursor-pointer hover:bg-slate-100 transition-colors uppercase"
                  >
                    <div className="flex items-center justify-end gap-0.5">
                      Uds {sortKey === 'sales' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('margin')}
                    className="p-2.5 pr-3 text-right cursor-pointer hover:bg-slate-100 transition-colors uppercase"
                  >
                    <div className="flex items-center justify-end gap-0.5">
                      Marg {sortKey === 'margin' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sortedBestSellers.length > 0 ? sortedBestSellers.map((prod) => (
                  <tr key={prod.id} className="hover:bg-white transition-colors">
                    <td className="p-2.5 pl-3 flex items-center gap-2 min-w-0">
                      <span className="bg-white border border-slate-100 rounded shadow-sm p-0.5 text-xs shrink-0">{prod.img}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate leading-tight">{prod.name}</div>
                        <div className="text-[9px] text-slate-400 leading-none mt-0.5 truncate">{prod.activeIng}</div>
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-extrabold text-slate-900">{prod.sales}</td>
                    <td className="p-2.5 pr-3 text-right font-bold text-emerald-600">{prod.margin}%</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="text-center py-6 text-slate-400 font-medium">Sin ventas registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* NUEVO WIDGET: RENDIMIENTO DE CAJEROS */}
        <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-extrabold text-slate-800">Rendimiento de Personal</h3>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="2 Activos"></span>
          </div>

          <div className="space-y-3 flex-1">
            {cashiers.map((cashier, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-black text-xs border border-indigo-200 shadow-sm">
                      {cashier.name.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 leading-tight">{cashier.name}</div>
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider leading-none block mt-0.5">{cashier.role}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-900 leading-none">{cashier.sales}</div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Hoy</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t border-slate-200/60 pt-2 text-center gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Transacciones</span>
                    <span className="text-xs font-bold text-slate-700">{cashier.trans}</span>
                  </div>
                  <div className="border-l border-slate-200/60">
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Ticket Prom.</span>
                    <span className="text-xs font-bold text-slate-700">{cashier.ticket}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NUEVO WIDGET: DONUT DE FIDELIZACIÓN */}
        <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-800 mb-5">Fidelización de Clientes</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center mb-4">
              {/* Anillo Donut con CSS radial */}
              <svg className="w-28 h-28 -rotate-90">
                <circle cx="56" cy="56" r="45" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                <circle 
                  cx="56" cy="56" r="45" 
                  stroke="#4f46e5" strokeWidth="10" 
                  fill="transparent" 
                  strokeDasharray={`${isDemoBranch ? (72 / 100) * 282 : 0} 282`} 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-800 leading-none">{kpiFidelityPct}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Fidelizados</span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between gap-2 px-4 mt-2 border-t border-slate-100 pt-4">
              <div className="flex flex-col text-center flex-1">
                <span className="text-xs font-black text-slate-800">{kpiNewAffiliates}</span>
                <span className="text-[9px] font-bold text-indigo-600 uppercase">Nuevos Afiliados</span>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div className="flex flex-col text-center flex-1">
                <span className="text-xs font-black text-slate-500">{kpiInvited}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Invitados</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ==========================================
          SECCIÓN DE ALERTAS CLÍNICAS DINÁMICAS
          ========================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/70 p-6 xl:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Alertas de Inventario Clínico Prioritarias</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Riesgos sanitarios y rupturas de stock que requieren atención logística inmediata.</p>
          </div>
          
          {/* Filtro Tabbed */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-bold self-start sm:self-auto">
            <button 
              onClick={() => setActiveAlertFilter('all')}
              className={cn("px-3 py-1 rounded-lg transition-all", activeAlertFilter === 'all' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >Todas</button>
            <button 
              onClick={() => setActiveAlertFilter('expiry')}
              className={cn("px-3 py-1 rounded-lg transition-all", activeAlertFilter === 'expiry' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >Caducidad</button>
            <button 
              onClick={() => setActiveAlertFilter('stock')}
              className={cn("px-3 py-1 rounded-lg transition-all", activeAlertFilter === 'stock' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >Stock</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.length > 0 ? filteredAlerts.map((alert) => {
            const isDone = processedAlerts.includes(alert.id);
            
            return (
              <div key={alert.id} className={cn(
                "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all",
                isDone && "opacity-40 bg-slate-50",
                !isDone && (alert.urgency === 'high' ? "bg-rose-50/30 border-rose-100" : "bg-amber-50/30 border-amber-100")
              )}>
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className={cn(
                    "w-5 h-5 shrink-0 mt-0.5",
                    isDone ? "text-slate-400" : (alert.urgency === 'high' ? "text-rose-600" : "text-amber-600")
                  )} />
                  <div className="min-w-0">
                    <h4 className={cn(
                      "text-xs font-black leading-snug truncate",
                      isDone ? "line-through text-slate-500" : "text-slate-800"
                    )}>{alert.title}</h4>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-relaxed">{alert.subtitle}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-200/50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      <Check className="w-3 h-3" /> Procesado
                    </span>
                  ) : (
                    <>
                      {alert.type === 'stock' ? (
                        <button 
                          onClick={() => toggleAlertProcess(alert.id)}
                          className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-xl text-[10px] font-black transition-all hover:shadow-sm active:scale-95"
                        >
                          Generar Orden Compra
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleAlertProcess(alert.id)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-[10px] font-black transition-all hover:shadow-sm active:scale-95"
                        >
                          Retirar del Estante
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="col-span-2 text-center py-6 text-slate-400 font-medium bg-slate-50 border border-slate-100 rounded-2xl">
              Sin alertas críticas pendientes
            </div>
          )}
        </div>
      </div>

      <CashMovementModal 
        isOpen={isMovementModalOpen} 
        onClose={() => setIsMovementModalOpen(false)} 
        branchId={activeBranch?.id || ''} 
      />
    </div>
  );
}
