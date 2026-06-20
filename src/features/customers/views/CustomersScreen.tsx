import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical,
  X,
  CreditCard,
  Award,
  History,
  Building,
  Mail,
  Phone,
  MapPin,
  Percent,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../../lib/utils';

import { useCustomerStore } from '../../../stores/customerStore';
import type { Customer } from '../../../stores/customerStore';

export default function CustomersScreen() {
  const { customers, addCustomer, updateCustomer, fetchCustomers } = useCustomerStore();
  
  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  // FILTRADO Y BÚSQUEDA
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'credit' | 'loyalty'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // SLIDE-OVER CONTROL
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<'general' | 'purchases' | 'credit'>('general');

  // FORMULARIO DE CLIENTE (CREAR / EDITAR)
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cLoyalty, setCLoyalty] = useState<'VIP' | 'Oro' | 'Plata' | 'Bronce'>('Bronce');
  const [cPoints, setCPoints] = useState(0);
  const [cCreditLimit, setCCreditLimit] = useState(0);
  const [cPendingBalance, setCPendingBalance] = useState(0);
  const [cTaxName, setCTaxName] = useState('');
  const [cTaxId, setCTaxId] = useState('');
  const [cTaxRegime, setCTaxRegime] = useState('605 - Sueldos y Salarios');
  const [cAddress, setCAddress] = useState('');
  const [cCity, setCCity] = useState('CDMX');

  // DROPDOWN ACCIONES POR FILA
  const [activeRowDropdown, setActiveRowDropdown] = useState<string | null>(null);

  // EFECTO SKELETON SIMULADO AL CAMBIAR FILTRO
  const handleFilterChange = (filter: 'all' | 'credit' | 'loyalty') => {
    setIsLoading(true);
    setActiveFilter(filter);
    setTimeout(() => {
      setIsLoading(false);
    }, 350);
  };

  // BUSCADOR Y FILTRADO REAL
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = term === '' ||
        (c.name || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.id || '').toLowerCase().includes(term) ||
        (c.taxId && c.taxId.toLowerCase().includes(term));

      let matchesFilter = true;
      if (activeFilter === 'credit') {
        matchesFilter = c.creditLimit > 0;
      } else if (activeFilter === 'loyalty') {
        matchesFilter = c.points > 1000 || c.loyaltyTier === 'VIP' || c.loyaltyTier === 'Oro';
      }

      return matchesSearch && matchesFilter;
    });
  }, [customers, searchQuery, activeFilter]);

  // ABRIR DETALLE EN SLIDE-OVER
  const handleOpenProfile = (customer: Customer) => {
    setSelectedCustomer(customer);
    setProfileActiveTab('general');
    
    // Rellenar variables de formulario por si decide editar
    setCName(customer.name);
    setCPhone(customer.phone);
    setCEmail(customer.email);
    setCLoyalty(customer.loyaltyTier);
    setCPoints(customer.points);
    setCCreditLimit(customer.creditLimit);
    setCPendingBalance(customer.pendingBalance);
    setCTaxName(customer.taxName || '');
    setCTaxId(customer.taxId || '');
    setCTaxRegime(customer.taxRegime || '605 - Sueldos y Salarios');
    setCAddress(customer.address || '');
    setCCity(customer.city || 'CDMX');

    setIsEditing(false);
    setShowSlideOver(true);
    setActiveRowDropdown(null);
  };

  // ABRIR CREACIÓN
  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setCName('');
    setCPhone('');
    setCEmail('');
    setCLoyalty('Bronce');
    setCPoints(0);
    setCCreditLimit(0);
    setCPendingBalance(0);
    setCTaxName('');
    setCTaxId('');
    setCTaxRegime('605 - Sueldos y Salarios');
    setCAddress('');
    setCCity('CDMX');

    setIsEditing(true);
    setProfileActiveTab('general');
    setShowSlideOver(true);
  };

  // GUARDAR CLIENTE (SUBMIT)
  const handleSaveCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName) return;

    try {
      if (selectedCustomer) {
        // ACTUALIZAR EXISTENTE
        await updateCustomer(selectedCustomer.id, {
          name: cName,
          phone: cPhone,
          email: cEmail,
          loyaltyTier: cLoyalty,
          points: Number(cPoints),
          creditLimit: Number(cCreditLimit),
          pendingBalance: Number(cPendingBalance),
          taxName: cTaxName,
          taxId: cTaxId,
          taxRegime: cTaxRegime,
          address: cAddress,
          city: cCity,
          idNumber: document.getElementById('id_number') ? (document.getElementById('id_number') as HTMLInputElement).value : undefined, // Quick patch to fetch id_number if it exists in form
        });
        alert(`Expediente de "${cName}" actualizado con éxito.`);
      } else {
        // CREAR NUEVO
        await addCustomer({
          name: cName,
          phone: cPhone,
          email: cEmail,
          loyaltyTier: cLoyalty,
          points: Number(cPoints) || 0,
          taxName: cTaxName,
          taxId: cTaxId,
          taxRegime: cTaxRegime,
          address: cAddress,
          city: cCity,
          creditLimit: Number(cCreditLimit) || 0,
          pendingBalance: Number(cPendingBalance) || 0,
          idNumber: document.getElementById('id_number') ? (document.getElementById('id_number') as HTMLInputElement).value : undefined,
        });
        alert(`Paciente "${cName}" registrado e incorporado al programa de fidelidad.`);
      }

      setShowSlideOver(false);
    } catch (err: any) {
      alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300 relative">
      
      {/* ======================================================== */}
      {/* HEADER Y ACCIÓN DE NUEVO CLIENTE                         */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Directorio de Clientes</h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">Gestión centralizada de expedientes de pacientes, programas de fidelidad y facturación corporativa.</p>
        </div>

        <button 
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 flex items-center gap-2 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {/* ======================================================== */}
      {/* BARRA DE HERRAMIENTAS, FILTROS Y BÚSQUEDA                */}
      {/* ======================================================== */}
      <div className="bg-white p-4 border border-slate-200/70 rounded-2xl shadow-sm space-y-4">
        
        {/* Input Buscador */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, RUC/RFC o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-400"
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

        {/* Pills de Filtrado Rápido */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => handleFilterChange('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border",
              activeFilter === 'all' 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            Todos los Clientes
          </button>
          <button
            onClick={() => handleFilterChange('credit')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5",
              activeFilter === 'credit' 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Con Crédito Aprobado</span>
          </button>
          <button
            onClick={() => handleFilterChange('loyalty')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5",
              activeFilter === 'loyalty' 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Frecuentes (Programa de Lealtad)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DATA GRID: DIRECTORIO DE PACIENTES / CLIENTES            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 font-black text-slate-400 uppercase tracking-wider select-none">
                <th className="px-6 py-4">ID de Cliente</th>
                <th className="px-6 py-4">Nombre & Contacto</th>
                <th className="px-6 py-4">Programa de Fidelidad</th>
                <th className="px-6 py-4">Consumido LTV (Total)</th>
                <th className="px-6 py-4">Última Visita</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                // Skeletons de Carga
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-36 mb-1.5"></div>
                      <div className="h-3 bg-slate-100 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-5 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-28"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 bg-slate-100 rounded-lg w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No se encontraron clientes registrados con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const safeName = customer.name || 'Sin Nombre';
                  const initials = safeName.split(' ').map(n => n[0] || '').slice(0, 2).join('');
                  const hasCredit = customer.creditLimit > 0;
                  
                  return (
                    <tr 
                      key={customer.id} 
                      onClick={() => handleOpenProfile(customer)}
                      className="hover:bg-slate-50/50 group transition-all duration-150 cursor-pointer text-slate-600 font-medium"
                    >
                      {/* ID */}
                      <td className="px-6 py-3.5">
                        <span className="font-mono font-black text-slate-500 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-700 px-2 py-0.5 border border-slate-200/50 rounded transition-colors">
                          {customer.id}
                        </span>
                      </td>

                      {/* Nombre y Contacto */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner border",
                            customer.loyaltyTier === 'VIP' && "bg-amber-50 border-amber-200 text-amber-700",
                            customer.loyaltyTier === 'Oro' && "bg-indigo-50 border-indigo-200 text-indigo-700",
                            customer.loyaltyTier === 'Plata' && "bg-slate-50 border-slate-200 text-slate-700",
                            customer.loyaltyTier === 'Bronce' && "bg-slate-100 border-slate-200 text-slate-600",
                            !customer.loyaltyTier && "bg-slate-100 border-slate-200 text-slate-600"
                          )}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm leading-tight">{safeName}</div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                              <span>{customer.phone}</span>
                              <span>•</span>
                              <span>{customer.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Lealtad */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase tracking-wider border",
                            customer.loyaltyTier === 'VIP' && "bg-amber-50 border-amber-200 text-amber-700",
                            customer.loyaltyTier === 'Oro' && "bg-indigo-50 border-indigo-100 text-indigo-700",
                            customer.loyaltyTier === 'Plata' && "bg-slate-50 border-slate-200 text-slate-700",
                            customer.loyaltyTier === 'Bronce' && "bg-slate-100 border-slate-200 text-slate-600"
                          )}>
                            {customer.loyaltyTier}
                          </span>
                          <span className="font-extrabold text-[11px] text-slate-700">{(customer.points || 0).toLocaleString()} pts</span>
                        </div>
                      </td>

                      {/* Consumo LTV */}
                      <td className="px-6 py-3.5">
                        <div>
                          <div className="font-black text-slate-800 text-sm">C${(customer.ltv || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          {hasCredit && (
                            <div className="text-[9px] text-indigo-600 font-black uppercase tracking-wider mt-0.5">
                              Línea de Crédito Activa
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Última Visita */}
                      <td className="px-6 py-3.5 font-bold text-slate-400">{customer.lastVisit}</td>

                      {/* Acciones */}
                      <td className="px-6 py-3.5 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveRowDropdown(activeRowDropdown === customer.id ? null : customer.id);
                          }}
                          className="p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-pointer active:scale-95 transition-all"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeRowDropdown === customer.id && (
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 text-left z-40">
                            <button 
                              onClick={() => handleOpenProfile(customer)}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-colors"
                            >
                              Ver Expediente
                            </button>
                            <button 
                              onClick={() => {
                                handleOpenProfile(customer);
                                setIsEditing(true);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-colors"
                            >
                              Editar Datos
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button 
                              onClick={() => {
                                alert(`Ajustando línea de crédito corporativa para ${customer.name}`);
                                setActiveRowDropdown(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-indigo-600 cursor-pointer transition-colors"
                            >
                              Ajustar Crédito
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 select-none">
          <span>Total de {filteredCustomers.length} perfiles en la cartera CRM</span>
          <div className="flex items-center gap-1.5">
            <button disabled className="px-2 py-0.5 bg-white border border-slate-200 text-slate-300 rounded cursor-not-allowed">1</button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SLIDE-OVER: PERFIL DEL PACIENTE / CLIENTE / FORMULARIO   */}
      {/* ======================================================== */}
      {showSlideOver && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          
          {/* Fondo colapsador al hacer clic fuera del panel */}
          <div className="absolute inset-0" onClick={() => setShowSlideOver(false)}></div>
          
          {/* Panel Deslizable */}
          <div className="relative max-w-md w-full bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right-8 duration-300 border-l border-slate-200">
            
            <div>
              {/* Encabezado Perfil / Formulario */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-inner">
                    {selectedCustomer 
                      ? (selectedCustomer.name || 'SN').split(' ').map(n => n[0] || '').slice(0, 2).join('') 
                      : 'NC'}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight leading-tight">
                      {isEditing 
                        ? selectedCustomer ? 'Editar Expediente' : 'Nuevo Paciente / Cliente' 
                        : (selectedCustomer?.name || 'Sin Nombre')}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                      <span>{selectedCustomer ? selectedCustomer.id : 'REGISTRO DE CLIENTE'}</span>
                      {selectedCustomer && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 font-black uppercase">Facturación Activa</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowSlideOver(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Botón para cambiar a modo Edición en Visualización */}
              {selectedCustomer && !isEditing && (
                <div className="py-3 flex justify-end">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 text-[10px] font-black rounded-lg cursor-pointer transition-all"
                  >
                    Editar Expediente
                  </button>
                </div>
              )}

              {/* Sistema de Pestañas (Solo visible al visualizar, no en creación pura de nuevo cliente) */}
              {selectedCustomer && !isEditing && (
                <div className="flex border-b border-slate-100 my-4 text-xs font-bold text-slate-400 gap-4">
                  <button 
                    onClick={() => setProfileActiveTab('general')}
                    className={cn("pb-2 flex items-center gap-1.5 relative cursor-pointer", profileActiveTab === 'general' && "text-indigo-600")}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>General</span>
                    {profileActiveTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
                  </button>
                  <button 
                    onClick={() => setProfileActiveTab('purchases')}
                    className={cn("pb-2 flex items-center gap-1.5 relative cursor-pointer", profileActiveTab === 'purchases' && "text-indigo-600")}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Compras ({(selectedCustomer.purchases || []).length})</span>
                    {profileActiveTab === 'purchases' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
                  </button>
                  <button 
                    onClick={() => setProfileActiveTab('credit')}
                    className={cn("pb-2 flex items-center gap-1.5 relative cursor-pointer", profileActiveTab === 'credit' && "text-indigo-600")}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Crédito & Fidelidad</span>
                    {profileActiveTab === 'credit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
                  </button>
                </div>
              )}

              {/* CONTENIDO INTERACTIVO */}
              {isEditing ? (
                
                // MODO FORMULARIO: CREAR O EDITAR DATOS
                <form onSubmit={handleSaveCustomerSubmit} className="space-y-4 mt-5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">Información de Contacto</span>
                  
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Nombre Completo del Paciente</label>
                    <input 
                      type="text"
                      required
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="Carlos Slim Domit"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Teléfono</label>
                      <input 
                        type="text"
                        value={cPhone}
                        onChange={(e) => setCPhone(e.target.value)}
                        placeholder="555-492-3011"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Cédula / Identificación</label>
                      <input 
                        type="text"
                        value={cTaxId}
                        onChange={(e) => setCTaxId(e.target.value)}
                        placeholder="001-000000-0000A"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCustomer) {
                          setIsEditing(false);
                        } else {
                          setShowSlideOver(false);
                        }
                      }}
                      className="w-1/3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 text-center transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Guardar Expediente
                    </button>
                  </div>
                </form>

              ) : (
                
                // MODO VISUALIZACIÓN DE PESTAÑAS (FICHAS)
                selectedCustomer && (
                  <div className="space-y-5 mt-4">
                    
                    {/* TAB 1: INFORMACIÓN GENERAL Y FISCAL */}
                    {profileActiveTab === 'general' && (
                      <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                        
                        {/* Contacto */}
                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                          <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Datos de Contacto</span>
                          
                          <div className="flex items-center gap-2.5 text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold">{selectedCustomer.phone}</span>
                          </div>
                          
                          <div className="flex items-center gap-2.5 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold truncate">{selectedCustomer.email}</span>
                          </div>
                        </div>

                        {/* Datos Fiscales */}
                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                          <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Datos Fiscales de Facturación</span>
                          
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Razón Social</p>
                            <p className="font-bold text-slate-800 text-[11px] mt-0.5">{selectedCustomer.taxName || 'Sin Razón Social asignada'}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">RFC / RUC</p>
                              <p className="font-mono font-black text-slate-800 text-[11px] mt-0.5">{selectedCustomer.taxId || 'XAXX010101000'}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Régimen Fiscal</p>
                              <p className="font-bold text-slate-500 text-[10px] mt-0.5">{selectedCustomer.taxRegime || 'Sueldos y Salarios'}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Dirección Fiscal</p>
                            <p className="font-bold text-slate-600 text-[10px] mt-0.5 leading-snug flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>{selectedCustomer.address}, {selectedCustomer.city || 'CDMX'}</span>
                            </p>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* TAB 2: HISTORIAL DE COMPRAS */}
                    {profileActiveTab === 'purchases' && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Historial de Tickets Recientes</span>
                        
                        {(selectedCustomer.purchases || []).length === 0 ? (
                          <p className="text-xs text-slate-400 font-bold text-center py-6">Este cliente aún no ha registrado transacciones en caja.</p>
                        ) : (
                          <div className="space-y-3">
                            {(selectedCustomer.purchases || []).map((ticket, i) => (
                              <div key={ticket.ticketId || i} className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-all text-xs font-semibold">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-mono font-black text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded text-[9px] border border-slate-300/40">
                                      {ticket.ticketId}
                                    </span>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-1">{ticket.date} • {ticket.branch}</p>
                                  </div>
                                  <span className="font-black text-slate-800 text-sm">C${(ticket.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-semibold mt-2.5 pt-2 border-t border-slate-200/50 leading-relaxed italic">
                                  {ticket.itemsSummary}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: LEALTAD Y CRÉDITO CORPORATIVO */}
                    {profileActiveTab === 'credit' && (
                      <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                        
                        {/* Estado de Cuenta de Crédito */}
                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-4">
                          <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Línea de Crédito Corporativa</span>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Límite de Crédito Autorizado</p>
                              <p className="font-black text-slate-800 text-base mt-0.5">C${(selectedCustomer.creditLimit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle className="w-5 h-5" /></div>
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Saldo Pendiente</span>
                              <p className={cn("font-black text-base mt-0.5", (selectedCustomer.pendingBalance || 0) > 0 ? "text-rose-600" : "text-slate-800")}>
                                C${(selectedCustomer.pendingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3.5 border-t border-slate-200/50 flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Crédito Disponible</span>
                              <p className="font-black text-slate-800 text-base mt-0.5">
                                C${((selectedCustomer.creditLimit || 0) - (selectedCustomer.pendingBalance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                          </div>
                        </div>

                        {/* Fidelidad / Programa Lealtad */}
                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-4">
                          <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Métricas del Programa de Fidelidad</span>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-amber-500" />
                              <div>
                                <p className="font-black text-slate-800">Nivel {selectedCustomer.loyaltyTier}</p>
                                <p className="text-[9px] text-slate-400 font-semibold">Cashback y descuentos exclusivos activos</p>
                              </div>
                            </div>
                            <span className="font-black text-slate-800 text-base">{(selectedCustomer.points || 0).toLocaleString()} Puntos</span>
                          </div>

                          <div className="pt-3 border-t border-slate-200/50 flex justify-between text-[10px] font-bold text-slate-500">
                            <span>Cashback en Compras:</span>
                            <span className="text-indigo-600 flex items-center gap-0.5"><Percent className="w-3 h-3" /> {selectedCustomer.loyaltyTier === 'VIP' ? '5%' : selectedCustomer.loyaltyTier === 'Oro' ? '3%' : '1%'}</span>
                          </div>
                        </div>

                      </div>
                    )}

                    <div className="pt-5 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => setShowSlideOver(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Cerrar Expediente
                      </button>
                    </div>

                  </div>
                )
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
