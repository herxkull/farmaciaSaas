import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Building, 
  Users2, 
  Receipt, 
  Save, 
  Shield, 
  UserPlus, 
  Eye, 
  HardDrive, 
  ShieldCheck, 
  MoreVertical, 
  X, 
  Check, 
  Loader2
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useBranchStore } from '../../../stores/branchStore';

// ========================================================
// DOMINIO DE DATOS: CONFIGURACIÓN DE SEGURIDAD Y HARDWARE
// ========================================================
interface SettingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  branch: string;
  status: 'active' | 'suspended';
  lastAccess: string;
  color: string;
  permissions: {
    processSale: boolean;
    applyDiscount: boolean;
    voidInvoice: boolean;
    adjustStock: boolean;
    purchaseOrder: boolean;
  };
}

interface AuditLog {
  timestamp: string;
  user: string;
  branch: string;
  action: string;
  severity: 'info' | 'warning' | 'critical';
}

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { timestamp: '2026-05-18 12:45', user: 'Hernández, Hersan', branch: 'Centro', action: 'Anuló Ticket de Venta TX-99014', severity: 'warning' },
  { timestamp: '2026-05-18 11:30', user: 'Pérez, Ana', branch: 'Norte', action: 'Apertura manual de cajón de dinero (Sin Venta)', severity: 'critical' },
  { timestamp: '2026-05-18 10:15', user: 'Gómez, Carlos', branch: 'Centro', action: 'Ajustó existencias de Omeprazol 20mg (+20 unidades)', severity: 'info' },
  { timestamp: '2026-05-17 18:00', user: 'Sistema Automático', branch: 'Corporativo', action: 'Respaldo encriptado de base de datos completado', severity: 'info' }
];

export default function SettingsScreen() {
  const availableBranches = useBranchStore((state) => state.availableBranches);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'security' | 'hardware' | 'tickets'>(() => {
    if (location.state && typeof location.state === 'object' && 'tab' in location.state) {
      const tab = location.state.tab as any;
      if (['profile', 'users', 'security', 'hardware', 'tickets'].includes(tab)) {
        return tab;
      }
    }
    return 'profile';
  });

  useEffect(() => {
    if (location.state && typeof location.state === 'object' && 'tab' in location.state) {
      const tab = location.state.tab as any;
      if (['profile', 'users', 'security', 'hardware', 'tickets'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [location.state]);

  // NAVEGACIÓN Y CONFIGURACIÓN GENERAL
  const tabs = [
    { id: 'profile', name: 'Perfil Corporativo', icon: Building },
    { id: 'users', name: 'Usuarios & Roles (RBAC)', icon: Users2 },
    { id: 'security', name: 'Seguridad & Auditoría', icon: ShieldCheck },
    { id: 'hardware', name: 'Hardware y POS', icon: HardDrive },
    { id: 'tickets', name: 'Tickets & Facturación', icon: Receipt },
  ] as const;

  // ESTADO DE USUARIOS RBAC
  const [users, setUsers] = useState<SettingUser[]>([
    { 
      id: 'u-1', 
      name: 'Juan Pérez', 
      email: 'jperez@zefiro.com', 
      role: 'CASHIER', 
      roleLabel: 'Cajero', 
      branch: 'Sucursal Norte', 
      status: 'active', 
      lastAccess: 'Hace 5 mins', 
      color: 'slate',
      permissions: { processSale: true, applyDiscount: false, voidInvoice: false, adjustStock: false, purchaseOrder: false }
    },
    { 
      id: 'u-2', 
      name: 'Elena Rostova', 
      email: 'erostova@zefiro.com', 
      role: 'BRANCH_MANAGER', 
      roleLabel: 'Gerente Sucursal', 
      branch: 'Sucursal Centro', 
      status: 'active', 
      lastAccess: 'Hoy, 09:15 AM', 
      color: 'indigo',
      permissions: { processSale: true, applyDiscount: true, voidInvoice: true, adjustStock: true, purchaseOrder: false }
    },
    { 
      id: 'u-3', 
      name: 'Dr. Marcus Aurelius', 
      email: 'maurelius@zefiro.com', 
      role: 'PHARMACIST', 
      roleLabel: 'Químico Regente', 
      branch: 'Todas (Corporativo)', 
      status: 'suspended', 
      lastAccess: 'Ayer, 18:40', 
      color: 'emerald',
      permissions: { processSale: true, applyDiscount: true, voidInvoice: true, adjustStock: true, purchaseOrder: true }
    },
  ]);

  // ESTADOS DEL SLIDE-OVER DE USUARIO
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  // CAMPOS DEL FORMULARIO DEL SLIDE-OVER
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('CASHIER');
  const [userBranch, setUserBranch] = useState('Sucursal Centro');
  const [permProcessSale, setPermProcessSale] = useState(true);
  const [permApplyDiscount, setPermApplyDiscount] = useState(false);
  const [permVoidInvoice, setPermVoidInvoice] = useState(false);
  const [permAdjustStock, setPermAdjustStock] = useState(false);
  const [permPurchaseOrder, setPermPurchaseOrder] = useState(false);

  // ACCIONES CONTEXTUALES (...)
  const [activeUserDropdown, setActiveUserDropdown] = useState<string | null>(null);
  const userMenuRef = useRef<any>(null);

  // ESTADOS DE SEGURIDAD (TRIGGERS / TOGGLES)
  const [security2FA, setSecurity2FA] = useState(true);
  const [securityPassExpiry, setSecurityPassExpiry] = useState(false);
  const [securityMaxAttempts, setSecurityMaxAttempts] = useState(true);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [saveSecuritySuccess, setSaveSecuritySuccess] = useState(false);

  // ESTADOS DE HARDWARE & POS
  const [printerPort, setPrinterPort] = useState('USB001');
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [cashDrawerEnabled, setCashDrawerEnabled] = useState(true);
  const [cashDrawerPulse, setCashDrawerPulse] = useState('24V');
  const [scannerSuffix, setScannerSuffix] = useState('Enter');
  const [scannerPrefix, setScannerPrefix] = useState('*');
  const [isSavingHardware, setIsSavingHardware] = useState(false);
  const [saveHardwareSuccess, setSaveHardwareSuccess] = useState(false);

  // Cierra menú contextual de usuarios al clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setActiveUserDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // CARGAR DATOS EN SLIDE-OVER (EDICIÓN)
  const handleEditUserClick = (user: SettingUser) => {
    setIsEditing(true);
    setTargetUserId(user.id);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserBranch(user.branch);
    
    // Matriz de permisos
    setPermProcessSale(user.permissions.processSale);
    setPermApplyDiscount(user.permissions.applyDiscount);
    setPermVoidInvoice(user.permissions.voidInvoice);
    setPermAdjustStock(user.permissions.adjustStock);
    setPermPurchaseOrder(user.permissions.purchaseOrder);

    setActiveUserDropdown(null);
    setShowSlideOver(true);
  };

  // CARGAR DATOS EN SLIDE-OVER (NUEVO)
  const handleNewUserClick = () => {
    setIsEditing(false);
    setTargetUserId(null);
    setUserName('');
    setUserEmail('');
    setUserRole('CASHIER');
    setUserBranch('Sucursal Centro');
    
    // Matriz por defecto
    setPermProcessSale(true);
    setPermApplyDiscount(false);
    setPermVoidInvoice(false);
    setPermAdjustStock(false);
    setPermPurchaseOrder(false);

    setShowSlideOver(true);
  };

  // GUARDAR O CREAR USUARIO DESDE SLIDE-OVER
  const handleSaveUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;

    if (isEditing && targetUserId) {
      // Editar existente
      setUsers(prev => prev.map(u => {
        if (u.id === targetUserId) {
          return {
            ...u,
            name: userName,
            email: userEmail,
            role: userRole,
            roleLabel: userRole === 'CASHIER' ? 'Cajero' : userRole === 'PHARMACIST' ? 'Químico Regente' : 'Gerente Sucursal',
            branch: userBranch,
            permissions: {
              processSale: permProcessSale,
              applyDiscount: permApplyDiscount,
              voidInvoice: permVoidInvoice,
              adjustStock: permAdjustStock,
              purchaseOrder: permPurchaseOrder
            }
          };
        }
        return u;
      }));
      alert(`¡Usuario "${userName}" editado con éxito en la matriz RBAC!`);
    } else {
      // Crear nuevo
      const newUser: SettingUser = {
        id: `u-${Date.now()}`,
        name: userName,
        email: userEmail,
        role: userRole,
        roleLabel: userRole === 'CASHIER' ? 'Cajero' : userRole === 'PHARMACIST' ? 'Químico Regente' : 'Gerente Sucursal',
        branch: userBranch,
        status: 'active',
        lastAccess: 'Nunca',
        color: userRole === 'CASHIER' ? 'slate' : userRole === 'PHARMACIST' ? 'emerald' : 'indigo',
        permissions: {
          processSale: permProcessSale,
          applyDiscount: permApplyDiscount,
          voidInvoice: permVoidInvoice,
          adjustStock: permAdjustStock,
          purchaseOrder: permPurchaseOrder
        }
      };
      setUsers(prev => [...prev, newUser]);
      alert(`¡Usuario "${userName}" aprovisionado con éxito en la matriz de seguridad!`);
    }

    setShowSlideOver(false);
  };

  // SUSPENDER / ACTIVAR USUARIO
  const handleToggleUserStatus = (userId: string, currentStatus: 'active' | 'suspended') => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: currentStatus === 'active' ? 'suspended' : 'active'
        };
      }
      return u;
    }));
    alert(`Estado de acceso modificado con éxito.`);
    setActiveUserDropdown(null);
  };

  // FORZAR CIERRE DE SESIÓN
  const handleForceLogout = (userName: string) => {
    alert(`Enviando socket de desconexión inmediata para el cajero "${userName}". Todas sus terminales POS activas se cerrarán.`);
    setActiveUserDropdown(null);
  };

  // GUARDAR AJUSTES DE SEGURIDAD
  const handleSaveSecurity = async () => {
    setIsSavingSecurity(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setSaveSecuritySuccess(true);
      setTimeout(() => setSaveSecuritySuccess(false), 1500);
    } finally {
      setIsSavingSecurity(false);
    }
  };

  // GUARDAR AJUSTES DE HARDWARE
  const handleSaveHardware = async () => {
    setIsSavingHardware(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setSaveHardwareSuccess(true);
      setTimeout(() => setSaveHardwareSuccess(false), 1500);
    } finally {
      setIsSavingHardware(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300 relative">
      
      {/* ======================================================== */}
      {/* CABECERA PRINCIPAL                                       */}
      {/* ======================================================== */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Panel de Configuración</h1>
        <p className="text-sm font-medium text-slate-500 mt-0.5">Gestiona las políticas globales, accesos de personal y marca.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* MENU LATERAL EXPANDIDO (AJUSTES NAVEGACIÓN)              */}
        {/* ======================================================== */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/70 p-3 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 w-full text-left active:scale-[0.98] cursor-pointer",
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* ======================================================== */}
        {/* VISTAS DE CONFIGURACIÓN ACTIVA                           */}
        {/* ======================================================== */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 md:p-8">
          
          {/* TAB 1: PERFIL CORPORATIVO */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Información de la Cadena</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Detalles de identificación fiscal y razón social principal.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Razón Social</label>
                  <input type="text" defaultValue="Zefiro Pharmacy Group S.A. de C.V." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">RFC Corporativo</label>
                  <input type="text" defaultValue="ZPG202605XYZ" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => alert('Información corporativa actualizada exitosamente.')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: USUARIOS & ROLES (RBAC) ENRIQUECIDO */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Control de Personal (RBAC)</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Asigna permisos granulares y vincula cajeros a sucursales específicas.</p>
                </div>
                <button 
                  onClick={handleNewUserClick}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm whitespace-nowrap transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Nuevo Usuario
                </button>
              </div>

              <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                      <th className="px-4 py-3 uppercase tracking-wider">Nombre / Correo</th>
                      <th className="px-4 py-3 uppercase tracking-wider">Rol Clínico</th>
                      <th className="px-4 py-3 uppercase tracking-wider">Sucursal Asignada</th>
                      <th className="px-4 py-3 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 uppercase tracking-wider">Último Acceso</th>
                      <th className="px-4 py-3 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {users.map((user) => {
                      const isDropdownOpen = activeUserDropdown === user.id;
                      
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 font-medium text-slate-700">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{user.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold border",
                              user.color === 'slate' && "bg-slate-50 border-slate-200 text-slate-700",
                              user.color === 'indigo' && "bg-indigo-50 border-indigo-100 text-indigo-700",
                              user.color === 'emerald' && "bg-emerald-50 border-emerald-100 text-emerald-700"
                            )}>
                              <Shield className="w-3 h-3" /> {user.roleLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-500">{user.branch}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase tracking-wider border",
                              user.status === 'active' 
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                : "bg-rose-50 border-rose-100 text-rose-700"
                            )}>
                              {user.status === 'active' ? 'Activo' : 'Suspendido'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-400">{user.lastAccess}</td>
                          <td className="px-4 py-3 text-right relative" ref={isDropdownOpen ? userMenuRef : null}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveUserDropdown(isDropdownOpen ? null : user.id);
                              }}
                              className="p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-pointer active:scale-95 transition-all"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {isDropdownOpen && (
                              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 text-left z-40">
                                <button 
                                  onClick={() => handleEditUserClick(user)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-colors"
                                >
                                  Editar Usuario
                                </button>
                                <button 
                                  onClick={() => handleToggleUserStatus(user.id, user.status)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-colors"
                                >
                                  {user.status === 'active' ? 'Suspender Acceso' : 'Activar Acceso'}
                                </button>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <button 
                                  onClick={() => handleForceLogout(user.name)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-rose-600 cursor-pointer transition-colors"
                                >
                                  Forzar Cierre Sesión
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SEGURIDAD & AUDITORÍA */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Seguridad & Auditorías</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Controla la seguridad de accesos y visualiza la bitácora técnica corporativa.</p>
              </div>

              {/* POLÍTICAS DE ACCESO (TOGGLES DE INTERRUPTOR) */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-5 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">Políticas de Autenticación</h4>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Forzar Autenticación de Dos Factores (2FA)</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Exigir código OTP adicional vía correo/autenticador al personal.</p>
                  </div>
                  <button 
                    onClick={() => setSecurity2FA(!security2FA)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-all duration-300 relative border cursor-pointer",
                      security2FA ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-300"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                      security2FA ? "left-5.5" : "left-0.5"
                    )}></span>
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Caducidad de Contraseña (90 Días)</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Forzar a los cajeros y regentes a cambiar su contraseña trimestralmente.</p>
                  </div>
                  <button 
                    onClick={() => setSecurityPassExpiry(!securityPassExpiry)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-all duration-300 relative border cursor-pointer",
                      securityPassExpiry ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-300"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                      securityPassExpiry ? "left-5.5" : "left-0.5"
                    )}></span>
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Bloqueo por Intentos Fallidos</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Suspende la cuenta por 30 minutos tras 5 intentos erróneos de inicio.</p>
                  </div>
                  <button 
                    onClick={() => setSecurityMaxAttempts(!securityMaxAttempts)}
                    className={cn(
                      "w-11 h-6 rounded-full transition-all duration-300 relative border cursor-pointer",
                      securityMaxAttempts ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-300"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                      securityMaxAttempts ? "left-5.5" : "left-0.5"
                    )}></span>
                  </button>
                </div>

                <div className="flex justify-end pt-3">
                  <button 
                    onClick={handleSaveSecurity}
                    disabled={isSavingSecurity}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    {isSavingSecurity ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSecuritySuccess ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : null}
                    <span>{isSavingSecurity ? 'Guardando...' : saveSecuritySuccess ? '¡Guardado con Éxito!' : 'Guardar Políticas'}</span>
                  </button>
                </div>
              </div>

              {/* AUDIT LOG (BITÁCORA TÁCTICA) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4.5 h-4.5 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Bitácora de Auditoría (Audit Log)</h4>
                </div>

                <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                        <th className="px-4 py-2.5">Fecha / Hora</th>
                        <th className="px-4 py-2.5">Usuario</th>
                        <th className="px-4 py-2.5">Sucursal</th>
                        <th className="px-4 py-2.5">Evento / Acción</th>
                        <th className="px-4 py-2.5 text-right">Nivel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {INITIAL_AUDIT_LOGS.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-50/30 text-slate-600 font-semibold">
                          <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{log.timestamp}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-700">{log.user}</td>
                          <td className="px-4 py-2.5">{log.branch}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 font-medium">{log.action}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={cn(
                              "inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                              log.severity === 'info' && "bg-slate-100 text-slate-600",
                              log.severity === 'warning' && "bg-amber-50 text-amber-700 border border-amber-100",
                              log.severity === 'critical' && "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                            )}>
                              {log.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HARDWARE Y POS */}
          {activeTab === 'hardware' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Hardware & POS</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Configura puertos de periféricos y comportamientos de escaneo local en sucursal.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CONFIGURACIÓN IMPRESORA TÉRMICA */}
                <div className="border border-slate-200/80 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4" /> Impresora Térmica de Tickets
                  </h4>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Puerto del Dispositivo</label>
                    <select
                      value={printerPort}
                      onChange={(e) => setPrinterPort(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="USB001">USB001 (Impresora Virtual USB)</option>
                      <option value="LPT1">LPT1 (Puerto de Impresora Paralelo)</option>
                      <option value="COM3">COM3 (Puerto Serie Virtual COM)</option>
                      <option value="COM4">COM4 (Puerto Serie Virtual COM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Ancho de Papel Térmico</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaperWidth('80mm')}
                        className={cn(
                          "py-2 rounded-xl text-xs font-black transition-all cursor-pointer border text-center",
                          paperWidth === '80mm' ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        80 mm (Estándar)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperWidth('58mm')}
                        className={cn(
                          "py-2 rounded-xl text-xs font-black transition-all cursor-pointer border text-center",
                          paperWidth === '58mm' ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        58 mm (Compacto)
                      </button>
                    </div>
                  </div>
                </div>

                {/* CAJÓN DE DINERO & ESCÁNER */}
                <div className="border border-slate-200/80 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4" /> Cajón de Dinero & Escáner
                  </h4>
                  
                  {/* Cajón de Dinero Toggle */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Apertura Automática del Cajón</p>
                      <p className="text-[9px] text-slate-400 font-medium">Disparar pulso al completar cobro en POS.</p>
                    </div>
                    <button 
                      onClick={() => setCashDrawerEnabled(!cashDrawerEnabled)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-all duration-300 relative border cursor-pointer",
                        cashDrawerEnabled ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-300"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                        cashDrawerEnabled ? "left-5.5" : "left-0.5"
                      )}></span>
                    </button>
                  </div>

                  {cashDrawerEnabled && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Voltaje del Pulso (Cajón)</label>
                      <select
                        value={cashDrawerPulse}
                        onChange={(e) => setCashDrawerPulse(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="24V">24V (Estándar Impresoras Epson / Star)</option>
                        <option value="12V">12V (Estándar Cajones Serie Directa)</option>
                      </select>
                    </div>
                  )}

                  {/* Escáner de Códigos de Barras */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Prefijo Escáner</label>
                      <input 
                        type="text"
                        value={scannerPrefix}
                        onChange={(e) => setScannerPrefix(e.target.value)}
                        placeholder="Sin prefijo"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Sufijo del Escáner</label>
                      <select
                        value={scannerSuffix}
                        onChange={(e) => setScannerSuffix(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Enter">Enter (Sufijo por Defecto)</option>
                        <option value="Tab">Tab (Salto de Campo)</option>
                        <option value="None">Ninguno (Firma manual)</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={handleSaveHardware}
                  disabled={isSavingHardware}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  {isSavingHardware ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saveHardwareSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : <Save className="w-4 h-4" />}
                  <span>{isSavingHardware ? 'Guardando...' : saveHardwareSuccess ? '¡Guardado!' : 'Guardar Configuración'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: TICKETS & FACTURACIÓN */}
          {activeTab === 'tickets' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Personalización de Recibos</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Configura las cabeceras de tickets físicos y folios de facturación.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Mensaje de Cabecera</label>
                    <textarea rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium transition-all" placeholder="Ej. ¡Gracias por su compra!" defaultValue="Zefiro Pharmacies - Salud Cerca de Ti" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Leyenda de Garantía / Devoluciones</label>
                    <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium transition-all" defaultValue="No se aceptan cambios ni devoluciones en medicamentos controlados, antibióticos o productos de refrigeración por normas sanitarias de la COFEPRIS." />
                  </div>
                </div>
                
                {/* PREVIEW TICKET */}
                <div className="md:col-span-1 bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Vista Previa Impresa</span>
                    <Eye className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="bg-white shadow-inner p-4 border-dashed border-2 border-slate-300 text-[10px] font-mono leading-snug space-y-2 text-center text-slate-600">
                    <div className="font-bold text-slate-800 uppercase">Zefiro Pharmacies - Salud Cerca de Ti</div>
                    <div>Av. Hidalgo #450, Centro</div>
                    <div className="h-px border-b border-dashed border-slate-300 my-2"></div>
                    <div className="flex justify-between">
                      <span>1x Paracetamol</span>
                      <span>C$45.50</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>TOTAL</span>
                      <span>C$45.50</span>
                    </div>
                    <div className="h-px border-b border-dashed border-slate-300 my-2"></div>
                    <div className="text-[8px] uppercase leading-tight mt-1">No se aceptan devoluciones en controlados...</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => alert('Diseño de ticket impreso actualizado exitosamente.')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Guardar Diseño
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ======================================================== */}
      {/* 5. SLIDE-OVER: EDICIÓN / MATRIZ DE PERMISOS GRANULAR     */}
      {/* ======================================================== */}
      {showSlideOver && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          
          {/* Fondo colapsador al hacer clic fuera del panel */}
          <div className="absolute inset-0" onClick={() => setShowSlideOver(false)}></div>
          
          {/* Panel Deslizable */}
          <div className="relative max-w-md w-full bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right-8 duration-300 border-l border-slate-200">
            
            <div>
              {/* Encabezado Panel */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-black text-slate-800 tracking-tight">
                    {isEditing ? 'Editar Perfil & Permisos' : 'Aprovisionar Nuevo Personal'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowSlideOver(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulario de Datos */}
              <form onSubmit={handleSaveUserSubmit} className="space-y-4 mt-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Nombre Completo</label>
                  <input 
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Elena Rostova"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Correo Electrónico (Login)</label>
                  <input 
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="erostova@zefiro.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Rol Clínico Base</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="CASHIER">Cajero Operativo</option>
                      <option value="BRANCH_MANAGER">Gerente Sucursal</option>
                      <option value="PHARMACIST">Químico Regente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Sucursal Asignada</label>
                    <select
                      value={userBranch}
                      onChange={(e) => setUserBranch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Todas (Corporativo)">Todas (Corporativo)</option>
                      {availableBranches.map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* MATRIZ DE PERMISOS GRANULAR                              */}
                {/* ======================================================== */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Matriz de Permisos Granular (RBAC)
                  </h4>

                  {/* CATEGORÍA 1: VENTAS */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                    <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest block">Área de Ventas & POS</span>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Procesar Cobros en Caja</span>
                      <button 
                        type="button"
                        onClick={() => setPermProcessSale(!permProcessSale)}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all duration-300 relative border cursor-pointer",
                          permProcessSale ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-300"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                          permProcessSale ? "left-4.5" : "left-0.5"
                        )}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Aplicar Descuentos Manuales</span>
                      <button 
                        type="button"
                        onClick={() => setPermApplyDiscount(!permApplyDiscount)}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all duration-300 relative border cursor-pointer",
                          permApplyDiscount ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-300"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                          permApplyDiscount ? "left-4.5" : "left-0.5"
                        )}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Anular Facturas o Devoluciones</span>
                      <button 
                        type="button"
                        onClick={() => setPermVoidInvoice(!permVoidInvoice)}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all duration-300 relative border cursor-pointer",
                          permVoidInvoice ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-300"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                          permVoidInvoice ? "left-4.5" : "left-0.5"
                        )}></span>
                      </button>
                    </div>
                  </div>

                  {/* CATEGORÍA 2: INVENTARIOS */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                    <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest block">Área de Logística & Stock</span>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Ajuste de Stock Manual (Auditoría)</span>
                      <button 
                        type="button"
                        onClick={() => setPermAdjustStock(!permAdjustStock)}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all duration-300 relative border cursor-pointer",
                          permAdjustStock ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-300"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                          permAdjustStock ? "left-4.5" : "left-0.5"
                        )}></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Generar Órdenes de Compra (Reabasto)</span>
                      <button 
                        type="button"
                        onClick={() => setPermPurchaseOrder(!permPurchaseOrder)}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all duration-300 relative border cursor-pointer",
                          permPurchaseOrder ? "bg-indigo-600 border-indigo-600" : "bg-slate-200 border-slate-300"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm",
                          permPurchaseOrder ? "left-4.5" : "left-0.5"
                        )}></span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSlideOver(false)}
                    className="w-1/3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 text-center transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {isEditing ? 'Guardar Cambios' : 'Aprovisionar Usuario'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
