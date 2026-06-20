import React, { useState, useMemo } from 'react';
import { Search, UserPlus, X, Check, Users } from 'lucide-react';
import { useCustomerStore, type Customer } from '../../../stores/customerStore';
import { cn } from '../../../lib/utils';

interface CustomerSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomerId?: string;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function CustomerSelectorModal({ 
  isOpen, 
  onClose, 
  selectedCustomerId,
  onSelectCustomer 
}: CustomerSelectorModalProps) {
  const { customers, searchCustomers, addCustomer, fetchCustomers } = useCustomerStore();

  React.useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen, fetchCustomers]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newIdNumber, setNewIdNumber] = useState('');

  const filteredCustomers = useMemo(() => {
    return searchCustomers(searchQuery);
  }, [searchQuery, searchCustomers, customers]);

  if (!isOpen) return null;

  const handleSelect = (customer: Customer | null) => {
    onSelectCustomer(customer);
    setSearchQuery('');
    setIsCreatingNew(false);
    onClose();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const newCustomer = await addCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        idNumber: newIdNumber.trim() || undefined,
      });
      
      // Reset form
      setNewName('');
      setNewPhone('');
      setNewIdNumber('');
      
      // Select the new customer
      handleSelect(newCustomer);
    } catch (err: any) {
      alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">
                {isCreatingNew ? 'Nuevo Cliente' : 'Seleccionar Cliente'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isCreatingNew ? 'Registrar para la venta actual' : 'Asignar comprador a la transacción'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {isCreatingNew ? (
            <form id="new-customer-form" onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono (Opcional)</label>
                <input 
                  type="tel" 
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ej. 8888-1234"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Identificación / Cédula (Opcional)</label>
                <input 
                  type="text" 
                  value={newIdNumber}
                  onChange={(e) => setNewIdNumber(e.target.value)}
                  placeholder="Ej. 001-123456-0000A"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </form>
          ) : (
            <>
              {/* Search Box */}
              <div className="relative mb-5">
                <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar por nombre, teléfono o cédula..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400"
                />
              </div>

              {/* Default Walk-in Customer Option */}
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full flex items-center justify-between p-4 mb-4 rounded-xl border transition-all duration-200",
                  !selectedCustomerId 
                    ? "bg-emerald-50 border-emerald-200 shadow-sm" 
                    : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm"
                )}
              >
                <div className="flex items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mr-4",
                    !selectedCustomerId ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                  )}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className={cn("font-bold text-sm", !selectedCustomerId ? "text-emerald-800" : "text-slate-700")}>
                      Venta de Mostrador
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Cliente anónimo (Sin factura nominal)</p>
                  </div>
                </div>
                {!selectedCustomerId && <Check className="w-5 h-5 text-emerald-600" />}
              </button>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Directorio de Clientes</p>
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    No se encontraron clientes con "{searchQuery}"
                  </div>
                ) : (
                  filteredCustomers.map(customer => {
                    const isSelected = selectedCustomerId === customer.id;
                    return (
                      <button
                        key={customer.id}
                        onClick={() => handleSelect(customer)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                          isSelected
                            ? "bg-blue-50 border-blue-200 shadow-sm" 
                            : "bg-white border-slate-100 hover:border-blue-300 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-center text-left">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center mr-4",
                            isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                          )}>
                            <span className="font-bold">{customer.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className={cn("font-bold text-sm leading-tight", isSelected ? "text-blue-800" : "text-slate-800")}>
                              {customer.name}
                            </p>
                            {(customer.phone || customer.idNumber) && (
                              <p className="text-xs text-slate-500 mt-1 font-medium">
                                {customer.phone && <span>📞 {customer.phone}</span>}
                                {customer.phone && customer.idNumber && <span className="mx-2">•</span>}
                                {customer.idNumber && <span>🆔 {customer.idNumber}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          {isCreatingNew ? (
            <>
              <button 
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="new-customer-form"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-200 transition-all active:scale-95"
              >
                Guardar y Seleccionar
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsCreatingNew(true)}
              className="w-full flex items-center justify-center px-4 py-3 bg-white border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-sm font-bold rounded-xl transition-all group"
            >
              <UserPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Registrar Nuevo Cliente
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
