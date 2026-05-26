import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Store, 
  Users, 
  MapPin, 
  Phone, 
  AlertCircle,
  LayoutGrid,
  List,
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  MoreVertical,
  Globe,
  X,
  Map,
  Info,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useBranchStore, type BranchInfo } from '../../../stores/branchStore';
import { useInventoryStore } from '../../../stores/inventoryStore';
import { useTransactionStore } from '../../../stores/transactionStore';

export default function BranchListScreen() {
  const navigate = useNavigate();
  const { availableBranches, addBranch, switchBranchById } = useBranchStore();
  const inventory = useInventoryStore((state) => state.inventory);
  const transactions = useTransactionStore((state) => state.transactions);

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // MAPA TÁCTICO INTERACTIVO (Removido por solicitud del usuario)
  const [selectedPinBranch, setSelectedPinBranch] = useState<BranchInfo | null>(null);

  // ACCIONES RÁPIDAS: DROPDOWNS
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<any>(null);

  // ESTADOS DEL MODAL DE CREACIÓN
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchManager, setNewBranchManager] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // FILTRADO DINÁMICO MULTI-CRITERIO Y CÁLCULO EN TIEMPO REAL
  const filteredBranches = useMemo(() => {
    return availableBranches.map(b => {
      // Calcular Ventas Reales
      const branchTxs = transactions.filter(t => t.branchId === b.id);
      const branchSales = branchTxs.reduce((sum, t) => sum + t.total, 0);
      
      // Calcular Abasto y Estado FEFO
      const branchInv = inventory[b.id] || [];
      let healthStatus = b.healthStatus || 'optimal';
      let coverage = b.coverage || '100%';
      
      if (branchInv.length > 0) {
        const lowStockCount = branchInv.filter(p => p.stockTotal <= 20).length;
        const coveragePercent = Math.max(0, 100 - Math.round((lowStockCount / branchInv.length) * 100));
        coverage = `${coveragePercent}%`;
        
        if (coveragePercent < 80) healthStatus = 'critical';
        else if (coveragePercent < 95) healthStatus = 'warning';
        else healthStatus = 'optimal';
      } else {
        coverage = '0%';
        healthStatus = 'critical';
      }

      return {
        ...b,
        sales: `C$${branchSales.toFixed(2)}`,
        healthStatus,
        coverage
      };
    }).filter(b => {
      // Filtrar por término de búsqueda (nombre, código, gerente o ciudad)
      const term = searchQuery.toLowerCase().trim();
      const managerName = b.manager || '';
      const cityName = b.city || '';
      const matchesSearch = term === '' || 
        b.name.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term) ||
        managerName.toLowerCase().includes(term) ||
        cityName.toLowerCase().includes(term);

      // Filtrar por estado de abasto (healthStatus)
      let matchesStatus = true;
      const status = b.healthStatus;
      const connectivity = b.connectivity || 'online';

      if (statusFilter === 'critical') {
        matchesStatus = status === 'critical';
      } else if (statusFilter === 'warning') {
        matchesStatus = status === 'warning';
      } else if (statusFilter === 'optimal') {
        matchesStatus = status === 'optimal';
      } else if (statusFilter === 'offline') {
        matchesStatus = connectivity === 'offline';
      }

      return matchesSearch && matchesStatus;
    });
  }, [availableBranches, searchQuery, statusFilter, transactions, inventory]);

  const handleActionClick = (actionName: string, branchName: string) => {
    const branch = availableBranches.find(b => b.name === branchName);
    if (!branch) return;

    // Conmutar sucursal en caliente
    switchBranchById(branch.id);

    if (actionName === 'Ver Inventario Local' || actionName === 'Ver Inventario') {
      navigate('/app/inventory');
    } else if (actionName === 'Auditar Caja') {
      navigate('/app');
    } else if (actionName === 'Gestionar Personal') {
      navigate('/app/settings', { state: { tab: 'users' } });
    } else if (actionName === 'Configuración de Sucursal' || actionName === 'Configuración') {
      navigate('/app/settings', { state: { tab: 'profile' } });
    } else {
      alert(`Ejecutando "${actionName}" para la ${branchName} de forma segura en el ecosistema SaaS.`);
    }
    
    setActiveDropdown(null);
  };

  const handleAddBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchCode) return;

    setIsAddingBranch(true);

    try {
      // Simular latencia de creación e inicialización API
      await new Promise(resolve => setTimeout(resolve, 800));

      const newId = `b-${Date.now()}`;
      const newBranch: BranchInfo = {
        id: newId,
        name: newBranchName,
        code: newBranchCode,
        isActive: true,
        config: {
          allowManualDiscount: true,
          requirePrescriptionCapture: true,
          taxPercentage: 15,
          currency: 'NIO'
        },
        city: newBranchCity || 'Managua',
        address: newBranchAddress || 'Dirección de Farmacia',
        phone: newBranchPhone || '555-100-2030',
        manager: newBranchManager || 'Sin Asignar',
        activeShifts: 0,
        healthStatus: 'optimal',
        sales: 'C$0',
        coverage: '100%',
        connectivity: 'online',
        pendingTransfers: 0,
        coordinates: { 
          x: Math.floor(Math.random() * 50) + 25, 
          y: Math.floor(Math.random() * 50) + 25 
        }
      };

      // 1. Agregar sucursal en el store de Sucursales
      addBranch(newBranch);

      setAddSuccess(true);
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess(false);
        // Reset campos
        setNewBranchName('');
        setNewBranchCode('');
        setNewBranchManager('');
        setNewBranchPhone('');
        setNewBranchCity('');
        setNewBranchAddress('');
      }, 1000);

    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingBranch(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
      
      {/* ======================================================== */}
      {/* CABECERA Y ACCIONES GLOBAL                               */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Red de Sucursales</h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">Control geopolítico, conectividad de cajas físicas y abasto FEFO centralizado.</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Toggle de Modo Grid vs Tabla */}
          <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                viewMode === 'grid' ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600"
              )}
              title="Vista de Cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                viewMode === 'table' ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600"
              )}
              title="Vista de Lista Densa"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Agregar Sucursal
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BARRA DE HERRAMIENTAS Y BÚSQUEDA                         */}
      {/* ======================================================== */}
      <div className="bg-white p-4 border border-slate-200/70 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por sucursal, código, gerente o ciudad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-400"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros de Estado */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Filtro: Todos los Abastos</option>
            <option value="optimal">Abasto Óptimo (95%+)</option>
            <option value="warning">Abasto Moderado (80%-94%)</option>
            <option value="critical">Abasto Crítico (Menos de 80%)</option>
            <option value="offline">Cajas Offline (Sin Red)</option>
          </select>

        </div>
      </div>


      {/* 4. VISUALIZACIÓN DINÁMICA DE ELEMENTOS (GRID VS TABLE)   */}
      {/* ======================================================== */}
      {filteredBranches.length === 0 ? (
        <div className="bg-white border border-slate-200/70 p-12 rounded-3xl shadow-sm text-center font-bold text-slate-400">
          <div className="flex flex-col items-center gap-2.5">
            <AlertCircle className="w-8 h-8 text-slate-300" />
            <span>No se encontraron sucursales físicas con los criterios de filtrado.</span>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        
        // VISTA A: CUADRÍCULA ENTERPRISE (GRID)
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          {filteredBranches.map((branch) => {
            const isDropdownOpen = activeDropdown === branch.id;
            const status = branch.healthStatus || 'optimal';
            const connectivity = branch.connectivity || 'online';
            const transfers = branch.pendingTransfers || 0;
            
            return (
              <div 
                key={branch.id} 
                className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden relative hover:shadow-md hover:border-indigo-100 transition-all duration-300"
              >
                {/* Indicador de Estado Superior */}
                <div className={cn(
                  "h-1.5 w-full",
                  status === 'optimal' && "bg-emerald-500",
                  status === 'warning' && "bg-amber-500",
                  status === 'critical' && "bg-rose-500"
                )}></div>
                
                <div className="p-6">
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-2xl text-slate-700">
                        <Store className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-800 leading-tight">{branch.name}</h3>
                          <span className="font-mono text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 border border-slate-200/50 rounded">
                            {branch.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-300" />
                          <span>{branch.address || 'Centro de la Ciudad'} • {branch.city || 'Managua'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Menú de Acciones Dropdown */}
                    <div className="relative shrink-0 z-30" ref={isDropdownOpen ? dropdownRef : null}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(isDropdownOpen ? null : branch.id);
                        }}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer active:scale-95 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150 z-40">
                          <button onClick={() => handleActionClick('Ver Inventario Local', branch.name)} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors">Ver Inventario Local</button>
                          <button onClick={() => handleActionClick('Auditar Caja', branch.name)} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors">Auditar Caja</button>
                          <button onClick={() => handleActionClick('Gestionar Personal', branch.name)} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors">Gestionar Personal</button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button onClick={() => handleActionClick('Configuración de Sucursal', branch.name)} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 rounded-xl text-xs font-bold text-indigo-600 cursor-pointer transition-colors">Configuración de Sucursal</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divisor */}
                  <div className="h-px bg-slate-100 my-5"></div>

                  {/* Métricas Clínicas & Geográficas */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Gerente */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Gerente / Regente</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-700">{branch.manager || 'Sin Asignar'}</span>
                      </div>
                    </div>

                    {/* Red / Conectividad */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Caja / Terminal Red</p>
                      <div className="flex items-center gap-1.5 text-xs">
                        {connectivity === 'online' ? (
                          <>
                            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-extrabold text-emerald-700">Online (Sincronizado)</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                            <span className="font-extrabold text-rose-600">Offline ({branch.lastSeen})</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Logística */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Logística Inter-sucursal</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <RefreshCw className={cn(
                          "w-3.5 h-3.5 text-slate-400",
                          transfers > 0 && "text-indigo-500 animate-spin-slow"
                        )} />
                        {transfers > 0 ? (
                          <span className="text-indigo-600">{transfers} cargas en tránsito</span>
                        ) : (
                          <span className="text-slate-400">Sin traslados</span>
                        )}
                      </div>
                    </div>

                    {/* Contacto */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Línea Telefónica</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-700">{branch.phone || '555-100-2030'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Panel de KPIs Rápidos */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 mt-5 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase">Cajas Activas</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">{branch.activeShifts || 0}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase">Ventas (Mes)</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">{branch.sales || 'C$0'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase">Abasto FEFO</p>
                      <p className={cn(
                        "text-base font-black mt-0.5",
                        status === 'optimal' && "text-emerald-600",
                        status === 'warning' && "text-amber-600",
                        status === 'critical' && "text-rose-600"
                      )}>{branch.coverage || '100%'}</p>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        
        // VISTA B: LISTA/TABLA ENTERPRISE DE ALTA DENSIDAD
        <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-wider">Código / Nodo</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-wider">Nombre de Sucursal</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-wider">Regente / Gerente</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-wider">Red</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-wider">Ventas (Mes)</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-wider">Abasto FEFO</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-wider">Tránsitos</th>
                  <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredBranches.map((branch) => {
                  const isDropdownOpen = activeDropdown === branch.id;
                  const status = branch.healthStatus || 'optimal';
                  const connectivity = branch.connectivity || 'online';
                  const transfers = branch.pendingTransfers || 0;

                  return (
                    <tr key={branch.id} className="hover:bg-slate-50/50 group transition-colors">
                      {/* Código */}
                      <td className="px-6 py-3.5">
                        <span className="font-mono font-black text-slate-500 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-700 px-2 py-0.5 border border-slate-200/50 rounded transition-colors">
                          {branch.code}
                        </span>
                      </td>

                      {/* Nombre & Ciudad */}
                      <td className="px-6 py-3.5">
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm leading-tight">{branch.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{branch.address || 'Centro de la Ciudad'} • {branch.city || 'Managua'}</p>
                        </div>
                      </td>

                      {/* Gerente */}
                      <td className="px-6 py-3.5 font-bold text-slate-600">{branch.manager || 'Sin Asignar'}</td>

                      {/* Red */}
                      <td className="px-6 py-3.5 font-bold">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] uppercase tracking-wide",
                          connectivity === 'online' 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                            : "bg-rose-50 border-rose-100 text-rose-700 animate-pulse"
                        )}>
                          {connectivity === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </td>

                      {/* Ventas */}
                      <td className="px-6 py-3.5 font-black text-slate-800">{branch.sales || 'C$0'}</td>

                      {/* Abasto */}
                      <td className="px-6 py-3.5 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            status === 'optimal' && "bg-emerald-500",
                            status === 'warning' && "bg-amber-500",
                            status === 'critical' && "bg-rose-500 animate-ping"
                          )}></span>
                          <span className={cn(
                            "font-extrabold text-xs",
                            status === 'optimal' && "text-emerald-700",
                            status === 'warning' && "text-amber-700",
                            status === 'critical' && "text-rose-700"
                          )}>
                            {branch.coverage || '100%'}
                          </span>
                        </div>
                      </td>

                      {/* Tránsitos */}
                      <td className="px-6 py-3.5 font-bold text-slate-500">
                        {transfers > 0 ? (
                          <span className="text-indigo-600 font-extrabold">{transfers} cargas</span>
                        ) : (
                          <span className="text-slate-400">Sin traslados</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-3.5 text-right relative" ref={isDropdownOpen ? dropdownRef : null}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(isDropdownOpen ? null : branch.id);
                          }}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer transition-all active:scale-95 inline-flex"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 text-left z-40">
                            <button onClick={() => handleActionClick('Ver Inventario Local', branch.name)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-colors">Ver Inventario</button>
                            <button onClick={() => handleActionClick('Auditar Caja', branch.name)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-colors">Auditar Caja</button>
                            <button onClick={() => handleActionClick('Gestionar Personal', branch.name)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-colors">Gestionar Personal</button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={() => handleActionClick('Configuración de Sucursal', branch.name)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-indigo-600 cursor-pointer transition-colors">Configuración</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 select-none">
            <span>Listando {filteredBranches.length} sucursales físicas operativas</span>
            <div className="flex items-center gap-1.5">
              <button disabled className="px-2 py-0.5 bg-white border border-slate-200 text-slate-300 rounded cursor-not-allowed">1</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: APROVISIONAR NUEVA SUCURSAL CORPORATIVA           */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-800 tracking-tight">Agregar Sucursal Física</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-extrabold cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleAddBranchSubmit} className="space-y-4 mt-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Nombre Sucursal</label>
                  <input 
                    type="text"
                    required
                    placeholder="Sucursal Poniente"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Código Único (Ej: SP-03)</label>
                  <input 
                    type="text"
                    required
                    placeholder="SP-03"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Gerente Responsable</label>
                  <input 
                    type="text"
                    placeholder="Carlos Gómez"
                    value={newBranchManager}
                    onChange={(e) => setNewBranchManager(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Teléfono Sucursal</label>
                  <input 
                    type="text"
                    placeholder="555-223-4455"
                    value={newBranchPhone}
                    onChange={(e) => setNewBranchPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Ciudad</label>
                  <input 
                    type="text"
                    placeholder="Managua"
                    value={newBranchCity}
                    onChange={(e) => setNewBranchCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Dirección Física</label>
                  <input 
                    type="text"
                    placeholder="Del Calvario 2c al Norte, León"
                    value={newBranchAddress}
                    onChange={(e) => setNewBranchAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={isAddingBranch || addSuccess}
                  className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isAddingBranch ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : addSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : null}
                  <span>
                    {isAddingBranch ? 'Aprovisionando...' : addSuccess ? '¡Listo!' : 'Aprovisionar Nodo'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
