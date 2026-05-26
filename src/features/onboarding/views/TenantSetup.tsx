import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wind, Building2, Store, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useBranchStore } from '../../../stores/branchStore';
import type { BranchInfo } from '../../../stores/branchStore';
import { useInventoryStore } from '../../../stores/inventoryStore';

export default function TenantSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const setAvailableBranches = useBranchStore((state) => state.setAvailableBranches);
  const setActiveBranch = useBranchStore((state) => state.setActiveBranch);

  const [chainName, setChainName] = useState('');
  const [rfc, setRfc] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [address, setAddress] = useState('');

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Termina el wizard: crear la primera sucursal
      const newBranch: BranchInfo = {
        id: `b-${Date.now()}`,
        name: branchName || 'Mi Sucursal',
        code: branchCode || 'SUC-01',
        isActive: true,
        config: {
          allowManualDiscount: true,
          requirePrescriptionCapture: true,
          taxPercentage: 0,
          currency: 'NIO',
        },
        city: 'Ciudad',
        address: address || 'Dirección',
        healthStatus: 'optimal',
        connectivity: 'online',
        manager: 'Propietario',
        activeShifts: 0,
        pendingTransfers: 0,
        coverage: '100%',
        sales: '$0',
      };

      // Reemplazamos los datos de prueba (test pharmacy) por la nueva sucursal real
      setAvailableBranches([newBranch]);
      setActiveBranch(newBranch);
      
      const setTenantConfig = useBranchStore.getState().setTenantConfig;
      setTenantConfig({
        chainName: chainName || 'Mi Cadena Farmacéutica',
        rfc: rfc || 'XAXX010101000',
        receiptHeader: chainName || 'Mi Cadena Farmacéutica'
      });

      // Inicializar el inventario base para la nueva sucursal
      const initializeBranch = useInventoryStore.getState().initializeBranch;
      initializeBranch(newBranch.id);
      
      navigate('/app');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-xl w-full bg-white shadow-2xl shadow-slate-200/80 rounded-3xl p-8 sm:p-12 relative border border-slate-200/50">
        
        {/* Background subtle accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-t-3xl"></div>

        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl inline-flex items-center justify-center mb-4">
            <Wind className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Configura tu Cadena</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Demos de alta tu organización en el ecosistema Zefiro.</p>
        </div>

        {/* Barra de progreso visual (Pasos) */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all",
            step >= 1 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"
          )}>
            <Building2 className="w-4 h-4" />
            <span>1. Empresa</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200"></div>
          <div className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all",
            step === 2 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"
          )}>
            <Store className="w-4 h-4" />
            <span>2. Primera Sucursal</span>
          </div>
        </div>

        {/* FORMULARIOS DEPENDIENTES DEL PASO */}
        <div className="space-y-6 min-h-[240px]">
          
          {step === 1 && (
            <div className="animate-in fade-in-50 duration-300">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Información Corporativa
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nombre de la Cadena / Farmacia</label>
                  <input
                    type="text"
                    value={chainName}
                    onChange={(e) => setChainName(e.target.value)}
                    className="mt-2 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Ej. Farmacias del Puerto"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">RFC / Identificación Fiscal</label>
                  <input
                    type="text"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value)}
                    className="mt-2 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Ej. FDP990101XYZ"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in-50 duration-300">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Datos de la Sucursal Matriz
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nombre de Sucursal</label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="mt-2 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Ej. Matriz Centro"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Código de Sucursal</label>
                    <input
                      type="text"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      className="mt-2 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Ej. SC-01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Dirección Física</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-2 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Av. Libertad 123, Ciudad de México"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* CONTROLES ACCIÓN */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="text-sm font-bold text-slate-500 hover:text-slate-800 px-4 py-2 cursor-pointer"
            >
              Atrás
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-98 transition-all cursor-pointer"
          >
            {step === 1 ? "Continuar a Sucursal" : "Finalizar e Iniciar"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
