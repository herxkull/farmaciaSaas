import { useState } from 'react';
import { Wind, Mail, Lock, ArrowRight, ArrowLeft, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuthFlow } from '../hooks/useAuthFlow';
import { cn } from '../../../lib/utils';

export default function LoginScreen() {
  const {
    step,
    isLoading,
    error,
    availableBranches,
    handleLoginSubmit,
    handleSelectBranch,
    goBack
  } = useAuthFlow();

  const [email, setEmail] = useState('admin@zefiropharmacy.com');
  const [password, setPassword] = useState('••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginSubmit(email, password);
  };

  return (
    <div className="min-h-screen w-full flex font-sans antialiased text-slate-900 bg-white overflow-hidden">
      
      {/* ======================================================== */}
      {/* COLUMNA DE ACCESO (IZQUIERDA) */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:flex-none lg:w-[520px] relative z-10 bg-white shadow-2xl">
        <div className="mx-auto w-full max-w-md transition-all duration-300">
          
          {/* LOGO ESTÁTICO */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="bg-indigo-600 text-white p-2 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center">
              <Wind className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Zefiro</span>
          </div>

          {/* ERROR ALERTS */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* CONTENEDOR DINÁMICO CON TRANSICIÓN */}
          {step === 'credentials' ? (
            /* ==================================================== */
            /* SUB-VISTA A: INGRESO DE CREDENCIALES                 */
            /* ==================================================== */
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Bienvenido de nuevo</h1>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Ingresa a tu suite farmacéutica empresarial.
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold placeholder-slate-400 outline-none"
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold placeholder-slate-400 outline-none"
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
                  disabled={isLoading}
                  className="group w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:bg-slate-200 disabled:shadow-none active:scale-[0.98] transition-all duration-150"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                  Panel de Simulación RBAC & Onboarding
                </p>
                <div className="mt-3 space-y-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs font-semibold text-slate-600 shadow-inner-sm">
                  <div className="flex justify-between">
                    <span>👑 Admin (Owner):</span>
                    <span className="font-extrabold text-indigo-600">admin@zefiropharmacy.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💊 Operativo (Cajero):</span>
                    <span className="font-extrabold text-indigo-600">cajero@zefiropharmacy.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🚀 Nuevo (Wizard):</span>
                    <span className="font-extrabold text-indigo-600">nuevo@zefiro.com</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ==================================================== */
            /* SUB-VISTA B: SELECCIÓN DE SUCURSAL                   */
            /* ==================================================== */
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={goBack}
                className="mb-4 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors group"
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
      {/* BANNER DE PROPUESTA A LA DERECHA (FIJO) */}
      {/* ======================================================== */}
      <section className="hidden lg:flex flex-1 relative bg-slate-900 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-800 via-slate-950 to-slate-950 z-0 opacity-90"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-lg px-12 text-center text-white">
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

        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-slate-950 to-transparent opacity-50"></div>
      </section>
    </div>
  );
}
