import { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  ShoppingCart, 
  ChevronDown, 
  Building2, 
  Check,
  Globe,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { useBranchStore } from '../../stores/branchStore';
import { cn } from '../../lib/utils';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  onOpenNotifications: () => void;
  isShiftOpen: boolean;
  onToggleShift: () => void;
  unreadNotificationsCount?: number;
  onOpenCommandPalette: () => void;
}

export default function Topbar({
  onOpenMobileMenu,
  onOpenNotifications,
  isShiftOpen,
  onToggleShift,
  unreadNotificationsCount = 0,
  onOpenCommandPalette
}: TopbarProps) {
  const { activeBranch, availableBranches, switchBranchById, canSwitchBranch, user } = useBranchStore();
  const canSwitch = canSwitchBranch();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- LÓGICA DE INDICADOR DE CONECTIVIDAD (OFFLINE-FIRST) ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      const timer = setTimeout(() => {
        setIsSyncing(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cerrar dropdown al dar clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBranch = (id: string) => {
    switchBranchById(id);
    setIsDropdownOpen(false);
  };

  // --- CONDICIONES DE RENDERIZACIÓN DE ARQUEO ---
  // isBranchSelected es true si hay una sucursal activa
  const isBranchSelected = !!activeBranch;
  // hasActiveShift es true si la caja está abierta
  const hasActiveShift = isShiftOpen;

  return (
    <header className="h-16 px-4 md:px-8 border-b border-slate-200/60 bg-white flex items-center justify-between shadow-sm z-20 relative">
      
      {/* ======================================================== */}
      {/* BLOQUE IZQUIERDO: MÓVIL + CONTEXTO SUCURSAL              */}
      {/* ======================================================== */}
      <div className="flex items-center gap-4">
        {/* Menú Responsive */}
        <button 
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* SELECTOR DINÁMICO DE SUCURSAL (DROPDOWN COMPATIBLE CON RBAC) */}
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => canSwitch && setIsDropdownOpen(!isDropdownOpen)}
            title={canSwitch ? "Cambiar de Sucursal" : `Sucursal Asignada a ${user?.name || 'Usuario'}`}
            className={cn(
              "flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full select-none group transition-all",
              canSwitch 
                ? "hover:bg-slate-100/80 cursor-pointer active:scale-98" 
                : "cursor-default opacity-90",
              isDropdownOpen && "bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-100"
            )}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse group-hover:scale-110 transition-transform"></div>
            <div className="text-left">
              <span className="text-[9px] block leading-none font-black text-emerald-700 tracking-wider uppercase mb-0.5">
                {canSwitch ? "Multitienda" : "Asignada"}
              </span>
              <span className="text-xs font-extrabold text-slate-800 leading-none flex items-center gap-1 truncate max-w-[120px] sm:max-w-[180px]">
                {activeBranch ? activeBranch.name : 'Sin Seleccionar'}
                {canSwitch && (
                  <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform duration-200", isDropdownOpen && "rotate-180 text-indigo-600")} />
                )}
              </span>
            </div>
          </div>

          {/* DROPDOWN MENU CON HOT-SWITCHING */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 pt-2 pb-1.5 border-b border-slate-100 mb-1">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Conmutar Sucursal</h4>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">Los datos se re-hidratarán en caliente.</p>
              </div>

              <div className="space-y-0.5 max-h-60 overflow-y-auto">
                {availableBranches.map((branch) => {
                  const isSelected = branch.id === activeBranch?.id;
                  return (
                    <div
                      key={branch.id}
                      onClick={() => handleSelectBranch(branch.id)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all",
                        isSelected 
                          ? "bg-indigo-50 text-indigo-900 font-bold" 
                          : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                          isSelected ? "bg-white border-indigo-100 text-indigo-600" : "bg-slate-50 border-slate-200 text-slate-400"
                        )}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate leading-tight">{branch.name}</div>
                          <div className="text-[9px] text-slate-400 uppercase mt-0.5 font-bold tracking-wide">ID: {branch.code}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 mr-1" />}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-1.5 pt-1.5 border-t border-slate-100 px-2">
                <div className="flex items-center gap-1.5 p-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50/30 rounded-lg border border-indigo-100/30 cursor-not-allowed">
                  <Globe className="w-3.5 h-3.5" /> Redirección Multitienda Habilitada
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🔍 REEMPLAZO VISUAL: BOTÓN COMANDOS GLOBAL (Ctrl + K) */}
        <button 
          onClick={onOpenCommandPalette}
          className="hidden lg:flex items-center justify-between w-80 xl:w-96 ml-3 px-3.5 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60 rounded-xl text-left text-xs font-semibold text-slate-400 transition-all outline-none active:scale-99 shadow-inner-sm cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Buscar o ejecutar comando...</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 select-none">
            <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-extrabold uppercase tracking-wide text-slate-400 shadow-sm">Ctrl</span>
            <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-extrabold uppercase tracking-wide text-slate-400 shadow-sm">K</span>
          </div>
        </button>
      </div>

      {/* ======================================================== */}
      {/* BLOQUE DERECHO: CONTROLES Y ALERTAS                      */}
      {/* ======================================================== */}
      <div className="flex items-center gap-3 md:gap-4">

        {/* 🌐 INDICADOR DE CONECTIVIDAD (OFFLINE-FIRST) */}
        <div className="relative group">
          {isSyncing ? (
            <div 
              title="Sincronizando cambios locales con la nube..."
              className="p-2 text-indigo-600 bg-indigo-50/60 border border-indigo-100 rounded-xl transition-all flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          ) : isOnline ? (
            <div 
              title="Sincronizado con la nube (Online)"
              className="p-2 text-emerald-500 bg-emerald-50/40 border border-emerald-100/50 rounded-xl transition-all flex items-center justify-center group-hover:bg-emerald-50"
            >
              <Cloud className="w-5 h-5 stroke-[2.2]" />
            </div>
          ) : (
            <div 
              title="Modo Offline - Guardando en caché local"
              className="p-2 text-rose-500 bg-rose-50 border border-rose-200 rounded-xl transition-all flex items-center justify-center animate-pulse"
            >
              <CloudOff className="w-5 h-5 stroke-[2.2]" />
            </div>
          )}

          {/* Tooltip Premium */}
          <div className="absolute top-full right-0 mt-2 w-48 hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold p-2.5 rounded-xl shadow-xl z-50 animate-in fade-in duration-200">
            {isSyncing ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" /> Sincronización en curso...
              </span>
            ) : isOnline ? (
              <span className="text-emerald-400">● Conectado a la red de Zefiro. Todos los datos están seguros en la nube.</span>
            ) : (
              <span className="text-rose-400">▲ Modo Offline. Los tickets y cobros se guardan en IndexedDB y se sincronizarán al volver.</span>
            )}
          </div>
        </div>
        
        {/* Campana Notificaciones con Badge */}
        <button 
          onClick={onOpenNotifications}
          title="Alertas Críticas"
          className="relative p-2 text-slate-500 hover:text-indigo-700 hover:bg-slate-50 rounded-xl transition-all active:scale-95 border border-transparent hover:border-slate-200"
        >
          <Bell className="w-5 h-5 stroke-[2.2]" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white border border-white shadow-sm animate-pulse">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-0.5 hidden md:block"></div>

        {/* 🔑 RENDERIZADO CONDICIONAL DEL ARQUEO / APERTURA */}
        {isBranchSelected && (
          <button 
            onClick={onToggleShift}
            className={cn(
              "hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 border shadow-sm",
              hasActiveShift 
                ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" 
                : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
            )}
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            {hasActiveShift ? "Cerrar Caja / Arqueo" : "Abrir Caja"}
          </button>
        )}
      </div>
    </header>
  );
}
