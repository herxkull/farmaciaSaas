import React, { useState, useMemo } from 'react';
import { 
  Download, 
  MapPin, 
  Calendar, 
  ChevronDown,
  PieChart,
  BarChart2,
  Activity,
  Pill,
  ShieldAlert,
  Heart,
  PlusSquare,
  TrendingUp,
  ArrowUpDown,
  Layers
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useBranchStore } from '../../../stores/branchStore';
import { useInventoryStore } from '../../../stores/inventoryStore';
import { useTransactionStore } from '../../../stores/transactionStore';

export default function CategoryAnalysisView() {
  const activeBranch = useBranchStore(state => state.activeBranch);
  const activeBranchId = activeBranch?.id || 'b-01';
  
  const inventory = useInventoryStore(state => state.inventory);
  const transactions = useTransactionStore(state => state.transactions);
  
  const branchInventory = inventory[activeBranchId] || [];
  const branchTransactions = transactions.filter(t => t.branchId === activeBranchId);

  const categoryStats = useMemo(() => {
    const stats: Record<string, {
      id: string;
      name: string;
      netSales: number;
      unitsSold: number;
      stockValue: number;
      topSeller: string;
      icon: any;
      _products: typeof branchInventory;
    }> = {};

    // First pass: aggregate inventory
    branchInventory.forEach(product => {
      const catName = product.category || 'General';
      if (!stats[catName]) {
        stats[catName] = {
          id: `cat-${catName.toLowerCase().replace(/\s+/g, '-')}`,
          name: catName,
          netSales: 0,
          unitsSold: 0,
          stockValue: 0,
          topSeller: 'N/A',
          icon: Layers,
          _products: []
        };
      }
      stats[catName].stockValue += ((product.salePrice || 0) * (product.stockTotal || 0));
      stats[catName]._products.push(product);
    });

    // Second pass: aggregate transactions
    branchTransactions.forEach(tx => {
      const catName = tx.category || 'General';
      if (!stats[catName]) {
        stats[catName] = {
          id: `cat-${catName.toLowerCase().replace(/\s+/g, '-')}`,
          name: catName,
          netSales: 0,
          unitsSold: 0,
          stockValue: 0,
          topSeller: 'N/A',
          icon: Layers,
          _products: []
        };
      }
      stats[catName].netSales += (tx.total || 0);
      stats[catName].unitsSold += (tx.itemsCount || 0);
    });

    // Calculate top sellers
    return Object.values(stats).map(stat => {
      // Icon mapping
      const lower = stat.name.toLowerCase();
      if (lower.includes('derma')) stat.icon = Activity;
      else if (lower.includes('anti')) stat.icon = Pill;
      else if (lower.includes('control')) stat.icon = ShieldAlert;
      else if (lower.includes('cuidado')) stat.icon = Heart;
      else if (lower.includes('otc') || lower.includes('libre')) stat.icon = PlusSquare;

      // Find top seller by assuming lowest stock vs 50 means it sold more
      let top = 'Sin Productos';
      let maxSold = -1;
      stat._products.forEach(p => {
        const assumedInitial = 50; // simple heuristic since we don't track per-item sales yet
        const sold = Math.max(0, assumedInitial - (p.stockTotal || 0));
        if (sold > maxSold) {
          maxSold = sold;
          top = p.name;
        }
      });
      stat.topSeller = maxSold >= 0 && stat._products.length > 0 ? top : 'N/A';

      return stat;
    });
  }, [branchInventory, branchTransactions]);

  const [sortKey, setSortKey] = useState<keyof typeof categoryStats[0]>('netSales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: keyof typeof categoryStats[0]) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedCategories = [...categoryStats].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }
    
    return 0;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'NIO',
      minimumFractionDigits: 2
    }).format(value);
  };

  const totalNetSales = categoryStats.reduce((sum, cat) => sum + cat.netSales, 0);

  return (
    <div className="w-full bg-slate-50 min-h-screen p-6 md:p-8 font-sans text-slate-900 animate-in fade-in duration-300">
      
      {/* 1. HEADER Y FILTROS DE CONTEXTO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Rendimiento y Análisis por Categoría</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Evalúa el rendimiento financiero y rotación de las familias clínicas (DATOS REALES).</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>Sucursal Activa</span>
          </button>
        </div>
      </div>

      {/* 2. SECCIÓN VISUAL (GRÁFICOS DE COMPOSICIÓN) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Gráfico Izquierdo: Dona */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-extrabold text-slate-800">Distribución de Ingresos por Categoría</h3>
            <PieChart className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center min-h-[240px] relative">
            {/* Gráfico aproximado usando SVG dinámico */}
            <div className="relative flex items-center justify-center w-48 h-48">
              <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="#f8fafc" strokeWidth="16" fill="transparent" />
                
                {categoryStats.length > 0 && totalNetSales > 0 ? (() => {
                  let currentOffset = 0;
                  const colors = ['#4f46e5', '#059669', '#f59e0b', '#ec4899', '#8b5cf6'];
                  const totalCircumference = 502; // 2 * pi * r = 2 * 3.14159 * 80 = 502.6
                  
                  return categoryStats.slice(0, 5).map((cat, idx) => {
                    const percentage = cat.netSales / totalNetSales;
                    const strokeLength = percentage * totalCircumference;
                    const dashArray = `${strokeLength} ${totalCircumference}`;
                    const dashOffset = -currentOffset;
                    
                    currentOffset += strokeLength;
                    
                    return (
                      <circle 
                        key={cat.id}
                        cx="96" cy="96" r="80" 
                        stroke={colors[idx % colors.length]} 
                        strokeWidth="16" 
                        strokeDasharray={dashArray} 
                        strokeDashoffset={dashOffset} 
                        strokeLinecap="round" 
                        fill="transparent" 
                      />
                    );
                  });
                })() : (
                  <circle cx="96" cy="96" r="80" stroke="#cbd5e1" strokeWidth="16" strokeDasharray="502 502" fill="transparent" />
                )}
              </svg>
              <div className="flex flex-col items-center justify-center text-center z-10">
                <span className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(totalNetSales)}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total NetSales</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              {categoryStats.slice(0, 3).map((cat, idx) => {
                const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-500'];
                return (
                  <div key={cat.id} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`}></span> {cat.name}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gráfico Derecho: Barras Horizontales */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-extrabold text-slate-800">Participación de Ventas (%)</h3>
            <BarChart2 className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 flex flex-col justify-center min-h-[240px] space-y-4">
            {categoryStats.length === 0 && (
              <div className="text-center text-sm font-bold text-slate-400">Sin datos de ventas.</div>
            )}
            {categoryStats.slice(0, 4).map((cat) => {
              const percentage = totalNetSales > 0 ? (cat.netSales / totalNetSales) * 100 : 0;
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">{cat.name}</span>
                    <span className="text-emerald-600">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div 
                      className="bg-emerald-500 h-2.5 rounded-full transition-all" 
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. DATA GRID (TABLA ANALÍTICA) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-extrabold text-slate-800">Desglose Detallado</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/60 text-xs text-slate-500 font-extrabold uppercase tracking-wider select-none">
                <th 
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1.5">Categoría <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th 
                  className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('netSales')}
                >
                  <div className="flex items-center justify-end gap-1.5">Ventas Netas <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th 
                  className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('unitsSold')}
                >
                  <div className="flex items-center justify-end gap-1.5">Unidades <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th 
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('topSeller')}
                >
                  <div className="flex items-center gap-1.5 ml-4">Top Seller <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th 
                  className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort('stockValue')}
                >
                  <div className="flex items-center justify-end gap-1.5">Valor Stock <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCategories.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                    No hay categorías registradas en el inventario actual.
                  </td>
                </tr>
              )}
              {sortedCategories.map((cat) => {
                const Icon = cat.icon;
                
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-800 leading-none mb-1">{cat.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">ID: {cat.id.toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-extrabold text-slate-900">{formatCurrency(cat.netSales)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold text-slate-600">{cat.unitsSold.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-700 truncate max-w-[180px] ml-4" title={cat.topSeller}>
                        {cat.topSeller}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold text-slate-500">{formatCurrency(cat.stockValue)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
