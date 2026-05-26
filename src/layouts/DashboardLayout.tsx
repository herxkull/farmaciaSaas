import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  GitFork, 
  Settings, 
  Bell, 
  LogOut,
  X,
  Wind,
  ChevronRight,
  Clock,
  Users,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import Topbar from '../components/navigation/Topbar';
import { useBranchStore } from '../stores/branchStore';
import CashAuditModal from '../components/pos/CashAuditModal';
import CommandPalette from '../components/navigation/CommandPalette';
import { useShiftStore } from '../stores/shiftStore';
import { useInventoryStore } from '../stores/inventoryStore';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useBranchStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const activeBranch = useBranchStore((state) => state.activeBranch);
  const currentShift = useShiftStore((state) => activeBranch ? state.shifts[activeBranch.id] : null);
  const isShiftOpen = !!currentShift;

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isOpeningFlow, setIsOpeningFlow] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // ========================================================
  // SEGURIDAD RBAC: PROTECCIÓN DE RUTAS DINÁMICA
  // ========================================================
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const role = user.role;
    const path = location.pathname;

    let allowed = false;
    if (role === 'OWNER' || role === 'SUPER_ADMIN') {
      allowed = true;
    } else if (role === 'BRANCH_MANAGER') {
      allowed = path !== '/app/settings';
    } else if (role === 'PHARMACIST') {
      allowed = path === '/app/pos' || path === '/app/inventory' || path === '/app/customers';
    } else if (role === 'CASHIER') {
      allowed = path === '/app/pos' || path === '/app/customers';
    }

    if (!allowed) {
      console.warn(`[RBAC Guard] Unauthorized attempt to access ${path} as ${role}. Redirecting.`);
      // Redirigir a la pantalla predeterminada
      if (role === 'CASHIER' || role === 'PHARMACIST') {
        navigate('/app/pos', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  // Atajo global Ctrl+K o Cmd+K para abrir/cerrar CommandPalette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleShift = () => {
    if (isShiftOpen) {
      setIsOpeningFlow(false);
      setIsAuditModalOpen(true);
    } else {
      setIsOpeningFlow(true);
      setIsAuditModalOpen(true);
    }
  };

  const [notifications, setNotifications] = useState<{id: number, title: string, desc: string, type: string, time: string, unread: boolean}[]>([]);

  const inventory = useInventoryStore(state => state.inventory);

  useEffect(() => {
    if (!activeBranch) return;
    const branchInventory = inventory[activeBranch.id] || [];
    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() + 3);

    const newAlerts: any[] = [];
    branchInventory.forEach((product, idx) => {
      if (product.stockTotal === 0) {
        newAlerts.push({
          id: parseInt(`100${idx}`),
          title: product.name,
          desc: 'Stock crítico debajo del mínimo (0 uds)',
          type: 'danger',
          time: 'Ahora',
          unread: true
        });
      } else if (product.stockTotal < 15) {
        newAlerts.push({
          id: parseInt(`200${idx}`),
          title: product.name,
          desc: `Existencias bajas en anaquel (${product.stockTotal} uds)`,
          type: 'warning',
          time: 'Ahora',
          unread: true
        });
      }

      product.batches.forEach((batch, bidx) => {
        const expDate = new Date(batch.expirationDate);
        if (expDate < limitDate) {
          const days = Math.floor((expDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
          newAlerts.push({
            id: parseInt(`300${idx}${bidx}`),
            title: product.name,
            desc: `Lote ${batch.batchNumber} expira en ${days >= 0 ? days : 0} días`,
            type: days < 30 ? 'danger' : 'warning',
            time: 'Ahora',
            unread: true
          });
        }
      });
    });

    setNotifications(newAlerts);
  }, [inventory, activeBranch]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleOpenNotifications = () => {
    setIsNotifOpen(true);
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleDismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const baseNavigation = [
    { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
    { name: 'Terminal POS', href: '/app/pos', icon: ShoppingCart },
    { name: 'Inventario', href: '/app/inventory', icon: Package },
    { name: 'Clientes', href: '/app/customers', icon: Users },
    { name: 'Reportes', href: '/app/reports', icon: BarChart3 },
    { name: 'Sucursales', href: '/app/branches', icon: GitFork },
    { name: 'Configuración', href: '/app/settings', icon: Settings },
  ];

  const filteredNavigation = baseNavigation.filter(item => {
    if (!user) return false;
    const role = user.role;

    if (role === 'CASHIER') {
      return item.href === '/app/pos' || item.href === '/app/customers';
    }
    if (role === 'PHARMACIST') {
      return item.href === '/app/pos' || item.href === '/app/inventory' || item.href === '/app/customers';
    }
    if (role === 'BRANCH_MANAGER') {
      return item.href !== '/app/settings';
    }
    // OWNER / SUPER_ADMIN can access everything
    return true;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'Propietario';
      case 'SUPER_ADMIN':
        return 'Administrador Global';
      case 'BRANCH_MANAGER':
        return 'Gerente Sucursal';
      case 'PHARMACIST':
        return 'Químico Regente';
      case 'CASHIER':
        return 'Cajero';
      default:
        return 'Personal';
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans antialiased text-slate-900">
      
      {/* ======================================================== */}
      {/* SIDEBAR (ESCRITORIO) */}
      {/* ======================================================== */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200/80 shadow-[1px_0_0_rgba(0,0,0,0.02)]">
        {/* Branding Header */}
        <div className="h-16 px-6 border-b border-slate-200/60 flex items-center gap-2.5">
          <div className="bg-indigo-600 text-white p-1.5 rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center">
            <Wind className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">Zefiro</span>
            <span className="text-[10px] block -mt-1 font-bold text-indigo-600 uppercase tracking-wider">Pharmacy Suite</span>
          </div>
        </div>

        {/* Links de Navegación */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/app' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group",
                  isActive 
                    ? "bg-indigo-50/80 text-indigo-700 shadow-sm shadow-indigo-50" 
                    : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer de Sidebar (Usuario Logueado) */}
        <div className="p-4 border-t border-slate-200/60 bg-slate-50/50">
          <div className="flex items-center gap-3 p-2 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold text-sm shadow-inner uppercase font-extrabold">
              {user ? getInitials(user.name) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user ? user.name : 'Usuario'}</p>
              <p className="text-[10px] font-medium text-slate-500 truncate">{user ? getRoleLabel(user.role) : 'Personal'}</p>
            </div>
            <Link to="/login" className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Cerrar Sesión">
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOPBAR MODULAR MULTI-SUCURSAL */}
        <Topbar 
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNotifications={handleOpenNotifications}
          unreadNotificationsCount={unreadCount}
          isShiftOpen={isShiftOpen}
          onToggleShift={handleToggleShift}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* PANEL DINÁMICO DE RUTA */}
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>

      {/* ======================================================== */}
      {/* MENÚ MÓVIL (OVERLAY) */}
      {/* ======================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/40 backdrop-blur-sm flex">
          <div className="w-72 bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-indigo-600" />
                <span className="font-extrabold text-slate-900">Zefiro</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-colors",
                    location.pathname === item.href ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DRAWER DE NOTIFICACIONES LATERAL (Z-INDEX 50) */}
      {/* ======================================================== */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="flex-1" onClick={() => setIsNotifOpen(false)}></div>
          <aside className="w-96 h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="h-16 px-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h2 className="font-extrabold text-slate-900 text-sm">Alertas Críticas</h2>
              </div>
              <button onClick={() => setIsNotifOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 animate-bounce">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">¡Al corriente!</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">No hay alertas críticas pendientes de revisión en tu red.</p>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm relative group",
                    notif.type === 'danger' && "bg-rose-50/60 border-rose-100 hover:bg-rose-50",
                    notif.type === 'warning' && "bg-amber-50/60 border-amber-100 hover:bg-amber-50",
                    notif.type === 'info' && "bg-indigo-50/60 border-indigo-100 hover:bg-indigo-50",
                  )}>
                    {/* Botón rápido de descarte */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismissNotification(notif.id);
                      }}
                      className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Descartar Alerta"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    <div className="flex justify-between items-start mb-1.5 pr-4">
                      <h4 className={cn(
                        "text-xs font-bold",
                        notif.type === 'danger' && "text-rose-900",
                        notif.type === 'warning' && "text-amber-900",
                        notif.type === 'info' && "text-indigo-900",
                      )}>{notif.title}</h4>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 shrink-0">
                        <Clock className="w-3 h-3" /> {notif.time}
                      </div>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{notif.desc}</p>
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={() => handleDismissNotification(notif.id)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        Atender <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}

      {/* MODAL DE ARQUEO Y APERTURA DE CAJA */}
      <CashAuditModal 
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        isOpeningFlow={isOpeningFlow}
      />

      {/* OMNIBAR DE BÚSQUEDA GLOBAL */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
