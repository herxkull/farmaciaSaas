import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wind, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  Building2, 
  CheckCircle2, 
  Loader2,
  ShieldAlert,
  Sparkles,
  Check
} from 'lucide-react';
import { useAuthFlow } from '../hooks/useAuthFlow';
import { cn } from '../../../lib/utils';
import { useBranchStore } from '../../../stores/branchStore';
import type { SettingUser } from '../../../stores/branchStore';
import { useTransactionStore } from '../../../stores/transactionStore';
import { useCustomerStore } from '../../../stores/customerStore';
import { useShiftStore } from '../../../stores/shiftStore';
import { useInventoryStore } from '../../../stores/inventoryStore';

export default function AuthView() {
  const navigate = useNavigate();
  const {
    step,
    isLoading: isLoginLoading,
    error: loginError,
    availableBranches,
    handleLoginSubmit,
    handleSelectBranch,
    goBack
  } = useAuthFlow();

  const login = useBranchStore((state) => state.login);
  const setUsers = useBranchStore((state) => state.setUsers);

  // --- MODO: INICIAR SESIÓN vs. REGISTRO (GROWTH HACKING) ---
  const [isLoginMode, setIsLoginMode] = useState(true);

  // --- ESTADOS DE REGISTRO ---
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isGmailWarning, setIsGmailWarning] = useState(false);

  // --- ESTADOS DE LOGIN (COMPATIBILIDAD CON useAuthFlow) ---
  const [loginEmail, setLoginEmail] = useState('admin@zefiropharmacy.com');
  const [loginPassword, setLoginPassword] = useState('••••••••');

  // Validación de dominio de correo corporativo en tiempo real
  useEffect(() => {
    if (!email) {
      setIsGmailWarning(false);
      return;
    }
    const genericDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'live.com', 'icloud.com'];
    const domain = email.split('@')[1];
    if (domain && genericDomains.includes(domain.toLowerCase())) {
      setIsGmailWarning(true);
    } else {
      setIsGmailWarning(false);
    }
  }, [email]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginSubmit(loginEmail, loginPassword);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    // Validaciones básicas
    if (!fullName.trim()) {
      setRegisterError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setRegisterError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setRegisterError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setRegisterError('Las contraseñas no coinciden.');
      return;
    }

    setIsRegisterLoading(true);

    try {
      // Simular latencia de creación de tenant en la base de datos SaaS
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.info('[Zefiro Growth Engine] New Tenant Registered successfully.');
      console.info(`[SaaS Security] Created base user: ${fullName} (${email}) with role PENDING_TENANT.`);

      const newUser: SettingUser = {
        id: `u-${Date.now()}`,
        name: fullName,
        email: email.trim(),
        role: 'OWNER',
        roleLabel: 'Propietario',
        branch: 'Todas (Corporativo)',
        status: 'active',
        lastAccess: 'Ahora mismo',
        color: 'indigo',
        password: password,
        permissions: { processSale: true, applyDiscount: true, voidInvoice: true, adjustStock: true, purchaseOrder: true }
      };

      setUsers([newUser]);
      
      // Limpiar las transacciones mock de prueba
      useTransactionStore.getState().clearTransactions();
      
      // Limpiar los clientes mock de prueba
      useCustomerStore.getState().clearCustomers();
      
      // Limpiar el inventario mock de prueba
      useInventoryStore.getState().clearInventory();
      
      // Limpiar las sucursales mock
      useBranchStore.getState().setAvailableBranches([]);
      useBranchStore.getState().setActiveBranch(null);
      
      // Asegurarnos que la caja (turno) nazca cerrada
      useShiftStore.getState().closeShift();

      login({
        id: newUser.id,
        name: newUser.name,
        role: 'OWNER',
        tenantId: `t-${Date.now()}`,
      });

      // Redireccionar programáticamente al Onboarding Wizard (/setup)
      navigate('/setup');
    } catch (err) {
      setRegisterError('Hubo un problema al crear tu cuenta. Intenta de nuevo.');
    } finally {
      setIsRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans antialiased text-slate-900 bg-white overflow-hidden">
      
      {/* ======================================================== */}
      {/* COLUMNA IZQUIERDA: FORMULARIOS DINÁMICOS                 */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:flex-none lg:w-[540px] relative z-10 bg-white shadow-2xl transition-all duration-300">
        <div className="mx-auto w-full max-w-md transition-all duration-300 py-8">
          
          {/* LOGO CORPORATIVO */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="bg-indigo-600 text-white p-2 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center">
              <Wind className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Zefiro</span>
            {!isLoginMode && (
              <span className="ml-2 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100/50">
                Sign Up
              </span>
            )}
          </div>

          {/* MENSAJES DE ERROR */}
          {isLoginMode && loginError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-extrabold animate-in fade-in duration-200 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {!isLoginMode && registerError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-extrabold animate-in fade-in duration-200 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{registerError}</span>
            </div>
          )}

          {/* RENDERIZADO CONDICIONAL DE PASOS / VISTAS */}
          {step === 'credentials' ? (
            isLoginMode ? (
              /* ==================================================== */
              /* VISTA A-1: FORMULARIO DE ACCESO (LOGIN)             */
              /* ==================================================== */
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900">Bienvenido de nuevo</h1>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Ingresa a tu suite farmacéutica empresarial.
                  </p>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleLogin}>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Correo Corporativo</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold placeholder-slate-400 outline-none"
                        placeholder="nombre@empresa.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">Contraseña</label>
                      <a href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors">¿La olvidaste?</a>
                    </div>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold placeholder-slate-400 outline-none"
                        placeholder="Ingresa tu contraseña"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 select-none">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer" />
                      Mantener sesión activa
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoginLoading}
                    className="group w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:bg-slate-200 disabled:shadow-none active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >
                    {isLoginLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Ingresar a mi Cuenta
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {/* 🚀 ENTRADA DE ADQUISICIÓN DE NUEVOS CLIENTES (GROWTH CTA) */}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-xs font-semibold text-slate-500">
                    ¿Quieres gestionar tu farmacia con Zefiro?{' '}
                    <button 
                      onClick={() => {
                        setIsLoginMode(false);
                        setRegisterError(null);
                      }}
                      className="font-extrabold text-indigo-600 hover:text-indigo-500 cursor-pointer hover:underline underline-offset-2 transition-all"
                    >
                      Registra tu cadena aquí.
                    </button>
                  </p>
                </div>

                {/* MOCK ACCOUNTS LEGEND */}
                <div className="mt-8 pt-5 border-t border-slate-100/80 text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center mb-2.5">
                    Panel de Simulación RBAC & Demo
                  </p>
                  <div className="space-y-1.5 bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[11px] font-semibold text-slate-500 shadow-inner-sm">
                    <div className="flex justify-between">
                      <span>👑 Admin Corporativo:</span>
                      <span className="font-extrabold text-indigo-600">admin@zefiropharmacy.com</span>
                    </div>
                    <div className="flex justify-between">
                      <span>💊 Cajero Operativo:</span>
                      <span className="font-extrabold text-indigo-600">cajero@zefiropharmacy.com</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ==================================================== */
              /* VISTA A-2: FORMULARIO DE REGISTRO (SIGN UP)          */
              /* ==================================================== */
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900">Prueba Zefiro Gratis</h1>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Lleva tu red de farmacias al siguiente nivel. Sin tarjeta de crédito.
                  </p>
                </div>

                <form className="mt-8 space-y-4" onSubmit={handleRegister}>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Nombre del Propietario</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold placeholder-slate-400 outline-none"
                        placeholder="Ej: Marcos Silva"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Correo Corporativo</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold placeholder-slate-400 outline-none"
                        placeholder="ejemplo@farmacia.com"
                      />
                    </div>
                    {/* ADVERTENCIA DE CORREO GENÉRICO (GROWTH HACK DETECTOR) */}
                    {isGmailWarning && (
                      <div className="mt-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-[10px] font-bold animate-in slide-in-from-top-1 duration-200 flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>Recomendamos usar tu correo corporativo para habilitar la facturación multi-sucursal y los registros de auditoría oficiales.</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Contraseña</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold placeholder-slate-400 outline-none"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Confirmar Contraseña</label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold placeholder-slate-400 outline-none"
                        placeholder="Repite tu contraseña"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isRegisterLoading}
                    className="group w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:bg-slate-200 disabled:shadow-none active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >
                    {isRegisterLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Comenzar mi Prueba Gratuita
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {/* VOLVER AL LOGIN */}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-xs font-semibold text-slate-500">
                    ¿Ya tienes una cuenta corporativa?{' '}
                    <button 
                      onClick={() => {
                        setIsLoginMode(true);
                        setRegisterError(null);
                      }}
                      className="font-extrabold text-indigo-600 hover:text-indigo-500 cursor-pointer hover:underline underline-offset-2 transition-all"
                    >
                      Inicia Sesión aquí.
                    </button>
                  </p>
                </div>
              </div>
            )
          ) : (
            /* ==================================================== */
            /* B: SELECCIÓN DE SUCURSAL (SOLO LOGIN ADMIN)          */
            /* ==================================================== */
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={goBack}
                className="mb-4 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors group cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Regresar a login
              </button>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">¿Dónde vas a trabajar hoy?</h1>
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  Selecciona la sucursal física para vincular tu turno y auditar tus movimientos de caja.
                </p>
              </div>

              {/* REJILLA DE TARJETAS DE SUCURSALES */}
              <div className="mt-8 space-y-3">
                {availableBranches.map((branch) => (
                  <div
                    key={branch.id}
                    onClick={() => handleSelectBranch(branch)}
                    className={cn(
                      "group p-4 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer transition-all bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-50 active:scale-[0.99]"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-indigo-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-800 group-hover:text-indigo-950 transition-colors">{branch.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 flex items-center gap-2">
                          Código: {branch.code}
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> En línea
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">Seguridad de Auditoría Activa</h4>
                  <p className="text-[11px] font-medium text-slate-500 leading-relaxed mt-0.5">Tus ventas, arqueos de caja y firmas de recetas médicas quedarán bloqueadas bajo el identificador de esta sucursal.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ======================================================== */}
      {/* COLUMNA DERECHA: PANEL DE BRANDING / COPY DINÁMICO       */}
      {/* ======================================================== */}
      <section className="hidden lg:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center transition-all duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-850 via-slate-950 to-slate-950 z-0 opacity-90 transition-all"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl"></div>
        
        {isLoginMode ? (
          /* ==================================================== */
          /* COPY DE LOGIN: ENFOQUE EN VELOCIDAD Y PRECISIÓN      */
          /* ==================================================== */
          <div className="relative z-10 max-w-lg px-12 text-center text-white animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-extrabold tracking-wide uppercase mb-8 backdrop-blur-sm">
              🚀 Zefiro Ecosistema v4.0
            </div>
            
            <h2 className="text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
              Administra tu cadena de farmacias sin fricción clínica
            </h2>
            <p className="mt-6 text-lg text-indigo-100/80 font-medium leading-relaxed">
              SaaS integrado con trazabilidad FEFO avanzada, gestión multi-sucursal integrada y control automático de medicamentos regulados en tiempo real.
            </p>

            <div className="mt-12 grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-5 rounded-2xl text-left">
                <span className="block text-xl font-black text-white">99.9%</span>
                <span className="text-xs font-bold text-indigo-200/70 uppercase tracking-wider mt-1 block">Precisión de Lote</span>
              </div>
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-5 rounded-2xl text-left">
                <span className="block text-xl font-black text-white">{"< 1.2s"}</span>
                <span className="text-xs font-bold text-indigo-200/70 uppercase tracking-wider mt-1 block">Velocidad Checkout</span>
              </div>
            </div>
          </div>
        ) : (
          /* ==================================================== */
          /* COPY DE SIGN UP: VALOR DE ADQUISICIÓN / PRUEBA       */
          /* ==================================================== */
          <div className="relative z-10 max-w-lg px-12 text-center text-white animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-extrabold tracking-wide uppercase mb-8 backdrop-blur-sm">
              ✨ Acceso Gratuito Inmediato
            </div>
            
            <h2 className="text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
              Únete a la nueva era de la gestión farmacéutica
            </h2>
            <p className="mt-6 text-lg text-emerald-100/80 font-medium leading-relaxed">
              Configura tu primera sucursal en menos de 5 minutos y obtén 14 días de prueba con trazabilidad FEFO total y soporte premium 24/7.
            </p>

            <div className="mt-12 grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-5 rounded-2xl text-left">
                <span className="block text-xl font-black text-white">14 Días</span>
                <span className="text-xs font-bold text-indigo-200/70 uppercase tracking-wider mt-1 block">Prueba Total Gratis</span>
              </div>
              <div className="bg-white/5 border border-white/10 backdrop-blur-md p-5 rounded-2xl text-left">
                <span className="block text-xl font-black text-white">{"< 5 Min"}</span>
                <span className="text-xs font-bold text-indigo-200/70 uppercase tracking-wider mt-1 block">Configuración Inicial</span>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-[11px] font-bold text-indigo-200/60">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" /> No se requiere tarjeta de crédito • Cancela cuando quieras
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-slate-950 to-transparent opacity-50"></div>
      </section>
    </div>
  );
}
