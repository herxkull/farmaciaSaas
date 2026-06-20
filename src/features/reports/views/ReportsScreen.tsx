import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Download, 
  Printer, 
  DollarSign, 
  FileSpreadsheet, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal, 
  Table, 
  Mail, 
  Check, 
  Loader2, 
  BarChart3, 
  AlertCircle,
  Layers
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useBranchStore } from '../../../stores/branchStore';

import { useTransactionStore } from '../../../stores/transactionStore';
import type { Transaction } from '../../../stores/transactionStore';
import { useInventoryStore } from '../../../stores/inventoryStore';
import CategoryAnalysisView from './CategoryAnalysisView';

export default function ReportsScreen() {
  const availableBranches = useBranchStore((state) => state.availableBranches);
  const activeBranch = useBranchStore((state) => state.activeBranch);
  const transactions = useTransactionStore((state) => state.transactions);
  const inventory = useInventoryStore((state) => state.inventory);
  
  const activeBranchId = activeBranch?.id || 'b-01';
  const branchInventory = inventory[activeBranchId] || [];
  
  const totalInventoryValue = branchInventory.reduce((sum, item) => sum + (item.salePrice * item.stockTotal), 0);
  const totalItemsCount = branchInventory.reduce((sum, item) => sum + item.stockTotal, 0);
  const [activeTab, setActiveTab] = useState<'bi' | 'compliance' | 'categories'>('bi');
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // ESTADOS DE FILTRADO BI
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // ESTADO DEL MODAL ENTERPRISE (AGENDAMIENTO)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleFreq, setScheduleFreq] = useState('daily');

  // ESTADO DEL TICKET (VER COPIA)
  const [selectedTicket, setSelectedTicket] = useState<Transaction | null>(null);

  // COMPUTAR CAJEROS ÚNICOS
  const uniqueCashiers = useMemo(() => {
    const cashiersSet = new Set<string>();
    transactions.forEach(t => {
      if (t.cashier) cashiersSet.add(t.cashier);
    });
    return Array.from(cashiersSet).sort();
  }, [transactions]);

  // FILTRADO DINÁMICO REACTIVO DE VENTAS
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filtrar Sucursal
      if (selectedBranch !== 'all' && t.branchId !== selectedBranch) return false;
      // Filtrar Cajero
      if (selectedCashier !== 'all' && t.cashier !== selectedCashier) return false;
      // Filtrar Método Pago
      if (selectedPayment !== 'all' && t.paymentMethod !== selectedPayment) return false;
      // Filtrar Categoría
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      // Rango de fechas (Real)
      if (selectedDateRange) {
        if (!t.date.startsWith(selectedDateRange)) return false;
      }
      return true;
    });
  }, [selectedBranch, selectedDateRange, selectedCashier, selectedPayment, selectedCategory, transactions]);

  // MÉTRICAS DE CONTEXTO REACTIVAS (BI MICRO-DASHBOARD)
  const metrics = useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((acc, t) => acc + t.total, 0);
    const count = filteredTransactions.length;
    const avgTicket = count > 0 ? totalRevenue / count : 0;

    return {
      revenue: totalRevenue,
      transactions: count,
      avgTicket
    };
  }, [filteredTransactions]);

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsScheduling(true);
    setTimeout(() => {
      setIsScheduling(false);
      setScheduleSuccess(true);
      setTimeout(() => {
        setShowScheduleModal(false);
        setScheduleSuccess(false);
      }, 2000);
    }, 1500);
  };

  const exportToCSV = (filename: string, rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFiscal = () => {
    const headers = ['ID Transacción', 'Fecha', 'Sucursal', 'Cajero', 'Método', 'Categoría', 'Total'];
    const rows = filteredTransactions.map(tx => [
      tx.id, tx.date, tx.branchId, tx.cashier, tx.paymentMethod, tx.category, tx.total.toFixed(2)
    ]);
    exportToCSV(`Cierre_Fiscal_${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows]);
  };

  const handleExportInventory = () => {
    const headers = ['Producto', 'Principio Activo', 'SKU', 'Stock Total', 'Controlado'];
    const rows = branchInventory.map(item => [
      item.name, item.activeIngredient, item.sku, item.stockTotal.toString(), item.isControlled ? 'SI' : 'NO'
    ]);
    exportToCSV(`Inventario_${new Date().toISOString().split('T')[0]}.csv`, [headers, ...rows]);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
      
      {/* ======================================================== */}
      {/* CABECERA PRINCIPAL                                       */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Analítica & Reportes</h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">Centro de Business Intelligence (BI) y documentos de cumplimiento sanitario.</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button 
            onClick={() => alert('Generando descarga consolidada en formato ZIP comprimido...')}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" /> Descargar Todo (.zip)
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SISTEMA DE PESTAÑAS (TABS SYSTEM)                       */}
      {/* ======================================================== */}
      <div className="border-b border-slate-200/80 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('bi')}
          className={cn(
            "pb-3.5 text-sm font-extrabold tracking-tight relative transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'bi' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Explorador de Datos (BI)</span>
          {activeTab === 'bi' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in duration-300"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={cn(
            "pb-3.5 text-sm font-extrabold tracking-tight relative transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'compliance' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Printer className="w-4 h-4" />
          <span>Reportes Legales y de Cierre</span>
          {activeTab === 'compliance' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in duration-300"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            "pb-3.5 text-sm font-extrabold tracking-tight relative transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'categories' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Análisis por Categoría</span>
          {activeTab === 'categories' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in duration-300"></div>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: EXPLORADOR DE DATOS (BI ENGINE)                   */}
      {/* ======================================================== */}
      {activeTab === 'bi' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* BARRA DE FILTROS COLAPSABLE */}
          <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
            <div 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="px-5 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 select-none"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Filtros Avanzados de Consulta</h3>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                {isFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isFiltersOpen && (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white animate-in slide-in-from-top-1 duration-200">
                {/* 1. SUCURSAL */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Sucursal</label>
                  <select 
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Consolidado Total</option>
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. RANGO DE FECHAS */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Fecha Específica</label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={selectedDateRange}
                      onChange={(e) => setSelectedDateRange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. CAJERO / USUARIO */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Cajero / Usuario</label>
                  <select 
                    value={selectedCashier}
                    onChange={(e) => setSelectedCashier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todos los Cajeros</option>
                    {uniqueCashiers.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* 4. MÉTODO DE PAGO */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Método de Pago</label>
                  <select 
                    value={selectedPayment}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todos los Métodos</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Mixto">Pago Mixto</option>
                  </select>
                </div>

                {/* 5. CATEGORÍA */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Categoría de Producto</label>
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todas las Categorías</option>
                    <option value="Analgésicos">Analgésicos</option>
                    <option value="Antibióticos">Antibióticos</option>
                    <option value="Controlados">Medicamento Controlado</option>
                    <option value="Gastroenterología">Gastroenterología</option>
                    <option value="Endocrinología">Endocrinología</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* MICRO-DASHBOARD DE CONTEXTO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* KPI 1: INGRESOS TOTALES */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ingresos Totales (Consulta)</span>
                <span className="text-2xl font-black text-slate-800 tracking-tight block">
                  C${metrics.revenue.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 group-hover:scale-105 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 2: TRANSACCIONES */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Transacciones</span>
                <span className="text-2xl font-black text-slate-800 tracking-tight block">
                  {metrics.transactions}
                </span>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 group-hover:scale-105 transition-transform">
                <Table className="w-5 h-5" />
              </div>
            </div>

            {/* KPI 3: TICKET PROMEDIO */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ticket Promedio</span>
                <span className="text-2xl font-black text-slate-800 tracking-tight block">
                  C${metrics.avgTicket.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl border border-violet-100 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* DATA GRID (TABLA AVANZADA) */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col">
            
            {/* BARRA DE ACCIONES DE LA TABLA */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Detalle Granular de Ventas</h4>
              </div>
              
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => setShowScheduleModal(true)}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-97 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" /> Programar Reporte
                </button>
                
                <button 
                  onClick={() => alert('Generando archivo estructurado en formato CSV/Excel...')}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-97 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar CSV
                </button>
              </div>
            </div>

            {/* CONTENEDOR DE LA TABLA CON CABECERA FIJA */}
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                    <th className="px-6 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">ID Transacción</th>
                    <th className="px-6 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Fecha / Hora</th>
                    <th className="px-6 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Sucursal</th>
                    <th className="px-6 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Cajero</th>
                    <th className="px-6 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Método</th>
                    <th className="px-6 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Total Cobrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-8 h-8 text-slate-300" />
                          <span>No se encontraron registros de ventas con los filtros seleccionados.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr 
                        key={tx.id} 
                        onClick={() => setSelectedTicket(tx)}
                        className="hover:bg-slate-50/40 group transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-3.5">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-700 px-2 py-0.5 rounded transition-colors">
                            {tx.id}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-slate-600">{tx.date}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-extrabold text-slate-800 text-xs">{tx.branchName}</span>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-600 text-xs">{tx.cashier}</td>
                        <td className="px-6 py-3.5">
                          <span className={cn(
                            "inline-flex px-2 py-0.5 rounded font-extrabold text-[10px] uppercase tracking-wide border",
                            tx.paymentMethod === 'Efectivo' && "bg-emerald-50 border-emerald-100 text-emerald-700",
                            tx.paymentMethod === 'Tarjeta' && "bg-blue-50 border-blue-100 text-blue-700",
                            tx.paymentMethod === 'Mixto' && "bg-purple-50 border-purple-100 text-purple-700"
                          )}>
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-xs font-bold text-slate-400">{tx.category}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-slate-800 text-xs">
                          C${tx.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN SIMULADA */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between text-xs font-bold text-slate-500 select-none">
              <span>Mostrando {filteredTransactions.length} de {filteredTransactions.length} registros</span>
              <div className="flex items-center gap-1.5">
                <button disabled className="px-2.5 py-1 bg-white border border-slate-200 text-slate-300 rounded-md cursor-not-allowed">Anterior</button>
                <button disabled className="px-3 py-1 bg-indigo-600 text-white border border-indigo-600 rounded-md">1</button>
                <button disabled className="px-2.5 py-1 bg-white border border-slate-200 text-slate-300 rounded-md cursor-not-allowed">Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: REPORTES LEGALES Y DE CUMPLIMIENTO               */}
      {/* ======================================================== */}
      {activeTab === 'compliance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* CARD: REPORTE FINANCIERO */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-6 hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Listo</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Cierre de Caja Fiscal & Ingresos</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">Corte de arqueo de caja con desglose de impuestos, reembolsos, cancelaciones y balance general homologado para el SAT.</p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400">Última Gen: Hace 5 mins</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportFiscal}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200 cursor-pointer" 
                  title="Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200 cursor-pointer" 
                  title="Imprimir"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* CARD: LIBRO DE CONTROLADOS (CRÍTICO FARMACIA) */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-6 hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 group-hover:scale-105 transition-transform">
                  <Printer className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded">Requiere Firma Regente</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Libro de Medicamentos Controlados</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">Reporte de cumplimiento sanitario foliado oficial. Lista entradas y salidas vinculadas a recetas de psicotrópicos y estupefacientes (Grupo II y III).</p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400">Última Gen: Hoy, 8:00 AM</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Libro de Actas
                </button>
              </div>
            </div>
          </div>

          {/* CARD: VALORACIÓN DE INVENTARIO */}
          <div className="bg-white border border-slate-200/70 rounded-2xl p-6 hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded">En Tiempo Real</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Valoración de Inventario</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">Reporte de auditoría del valor total de la mercancía en stock (Retail Value) y existencias físicas actuales de la sucursal.</p>
              
              <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">Valor Estimado (PVP)</span>
                  <span className="text-sm font-black text-slate-800">C${totalInventoryValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-500">Unidades Físicas</span>
                  <span className="text-xs font-bold text-slate-600">{totalItemsCount} uds</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400">Sincronizado ahora</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportInventory}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200 cursor-pointer" 
                  title="Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200 cursor-pointer" 
                  title="Imprimir"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ANÁLISIS DE CATEGORÍAS                            */}
      {/* ======================================================== */}
      {activeTab === 'categories' && (
        <CategoryAnalysisView />
      )}

      {/* ======================================================== */}
      {/* MODAL ENTERPRISE: AGENDAMIENTO AUTOMÁTICO DE REPORTES   */}
      {/* ======================================================== */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-800 tracking-tight">Programar Envío de Reporte</h3>
              </div>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-extrabold cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Enviar a (Correo Electrónico)</label>
                <input 
                  type="email"
                  required
                  placeholder="gerencia@tufarmacia.com"
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Frecuencia</label>
                  <select 
                    value={scheduleFreq}
                    onChange={(e) => setScheduleFreq(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="daily">Diariamente</option>
                    <option value="weekly">Semanalmente (Lunes)</option>
                    <option value="monthly">Mensualmente (Día 1)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Formato de Archivo</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                    <option>Microsoft Excel (.xlsx)</option>
                    <option>PDF Corporativo (.pdf)</option>
                    <option>CSV Estructurado (.csv)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Zefiro empaquetará los resultados de esta consulta configurada y los enviará automáticamente en la fecha acordada a las 06:00 AM hora servidor.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="w-1/3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={isScheduling || scheduleSuccess}
                  className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isScheduling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : scheduleSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : null}
                  <span>
                    {isScheduling ? 'Programando...' : scheduleSuccess ? '¡Completado!' : 'Guardar Automatización'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE TICKET DE VENTA (TICKET TÉRMICO) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] bg-[#f9f9f9] border-t-8 border-slate-800 rounded-b-md shadow-2xl p-6 relative font-mono text-sm text-slate-800 animate-in slide-in-from-bottom-4 duration-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-black/5 blur-sm rounded-full"></div>
            
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center mb-4">
                <Printer className="w-6 h-6 text-slate-800" />
              </div>
              
              <h3 className="font-bold text-lg uppercase tracking-widest mb-1">Copia de Recibo</h3>
              <p className="text-xs text-slate-500 uppercase">{selectedTicket.branchName}</p>
              <p className="text-[10px] text-slate-500 mt-1">Ticket: {selectedTicket.id}</p>
              <p className="text-[10px] text-slate-500">{selectedTicket.date}</p>
              
              <div className="w-full border-t border-dashed border-slate-400 my-4"></div>

              <div className="w-full space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Cajero:</span>
                  <span>{selectedTicket.cashier}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Artículos:</span>
                  <span>{selectedTicket.itemsCount} uds</span>
                </div>
                {selectedTicket.earnedPoints !== undefined && (
                  <div className="flex justify-between text-slate-600">
                    <span>Puntos Ganados:</span>
                    <span className="font-bold">+{selectedTicket.earnedPoints}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Pago con:</span>
                  <span>{selectedTicket.paymentMethod}</span>
                </div>
                
                <div className="flex justify-between text-lg font-black uppercase mt-3 pt-3 border-t border-slate-800">
                  <span>Total:</span>
                  <span>C${selectedTicket.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="w-full border-t border-dashed border-slate-400 my-4"></div>

              <div className="w-full font-sans">
                <button
                  onClick={() => {
                    alert('Imprimiendo copia de recibo térmico...');
                  }}
                  className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  Reimprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
