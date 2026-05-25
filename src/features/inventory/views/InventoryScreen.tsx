import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Calendar, AlertCircle, Layers, Download, Filter, Plus } from 'lucide-react';
import { useBranchStore } from '../../../stores/branchStore';
import { useInventoryStore } from '../../../stores/inventoryStore';
import { cn } from '../../../lib/utils';



// Inventario conectado dinámicamente al store global useInventoryStore

export default function InventoryScreen() {
  const activeBranch = useBranchStore((state) => state.activeBranch);
  const activeBranchId = activeBranch?.id || 'b-01';

  // Suscribirse de forma reactiva al store de inventario central
  const inventory = useInventoryStore((state) => state.inventory);
  const initializeBranch = useInventoryStore((state) => state.initializeBranch);
  const currentInventory = inventory[activeBranchId] || [];

  React.useEffect(() => {
    if (!inventory[activeBranchId]) {
      initializeBranch(activeBranchId);
    }
  }, [activeBranchId, inventory, initializeBranch]);

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBatch, setNewBatch] = useState({ productId: '', batchNumber: '', quantity: 0, expirationDate: '' });
  const addBatch = useInventoryStore((state) => state.addBatch);

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatch.productId || !newBatch.batchNumber || !newBatch.expirationDate) return;
    
    addBatch(activeBranchId, newBatch.productId, {
      id: 'b-' + Date.now(),
      batchNumber: newBatch.batchNumber,
      expirationDate: newBatch.expirationDate,
      quantity: Number(newBatch.quantity)
    });
    
    setShowAddModal(false);
    setNewBatch({ productId: '', batchNumber: '', quantity: 0, expirationDate: '' });
  };

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: '', activeIngredient: '', sku: '', salePrice: 0, isControlled: false, category: 'General'
  });
  const addProduct = useInventoryStore((state) => state.addProduct);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) return;
    
    addProduct(activeBranchId, {
      id: 'p-' + Date.now(),
      name: newProduct.name,
      activeIngredient: newProduct.activeIngredient || newProduct.name,
      barcode: newProduct.sku,
      sku: newProduct.sku,
      salePrice: Number(newProduct.salePrice),
      taxRate: 0.16,
      stockTotal: 0,
      isControlled: newProduct.isControlled,
      category: newProduct.category,
      batches: []
    });
    
    setShowAddProductModal(false);
    setNewProduct({ name: '', activeIngredient: '', sku: '', salePrice: 0, isControlled: false, category: 'General' });
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = currentInventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpiringSoon = (dateStr: string) => {
    const expiryDate = new Date(dateStr);
    const limit = new Date();
    limit.setMonth(limit.getMonth() + 3);
    return expiryDate < limit;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
      
      {/* CABECERA CON BOTONES DE ACCIÓN */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Inventario & Trazabilidad
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Gestión clínica de lotes y cumplimiento sanitario para <span className="font-extrabold text-indigo-600">{activeBranch?.name || 'Sucursal Centro'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2 hover:bg-slate-50">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button 
            onClick={() => setShowAddProductModal(true)}
            className="px-4 py-2.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-50 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Nuevo Lote
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BUSCADOR */}
      <div className="bg-white p-4 border border-slate-200/70 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por producto, principio activo o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-semibold outline-none shadow-inner-sm"
          />
        </div>
        
        <div className="flex items-center gap-2.5">
          <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
            <option>Todas las Categorías</option>
            <option>Controlados</option>
            <option>Próximos a Caducar</option>
          </select>
          <button className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TABLA DE DATOS AVANZADA */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Producto / Detalle Clínico</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Stock Total</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Regulación</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">Lotes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold">
                    No se encontraron productos en esta sucursal.
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const isExpanded = expandedRows[product.id];
                  return (
                    <React.Fragment key={product.id}>
                      <tr className={cn(
                        "group hover:bg-slate-50/50 transition-colors",
                        isExpanded && "bg-indigo-50/20 hover:bg-indigo-50/30"
                      )}>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 leading-tight">{product.name}</div>
                          <div className="text-xs font-semibold text-slate-400 mt-0.5">{product.activeIngredient}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            {product.sku}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-extrabold text-base tracking-tight",
                              product.stockTotal < 15 ? "text-rose-600" : "text-slate-800"
                            )}>
                              {product.stockTotal}
                            </span>
                            {product.stockTotal < 15 && (
                              <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {product.isControlled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-rose-50 border border-rose-100 text-rose-700 uppercase tracking-wider">
                              Controlado
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">General</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => toggleRow(product.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all select-none hover:shadow-sm active:scale-95",
                              isExpanded 
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100" 
                                : "bg-white text-indigo-600 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                            )}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>{product.batches.length}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* FILA DESPLEGABLE DE DETALLE FEFO */}
                      {isExpanded && (
                        <tr className="bg-indigo-50/10 animate-in slide-in-from-top-1 duration-200">
                          <td colSpan={5} className="px-6 py-0 border-b-0">
                            <div className="py-4 border-t border-slate-100 mt-[-1px]">
                              <div className="bg-white rounded-xl border border-indigo-100/50 shadow-inner-sm overflow-hidden mx-4 my-2">
                                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-indigo-600" />
                                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-indigo-900">
                                    Detalle FEFO por Lote ({activeBranch?.name || 'Sucursal Centro'})
                                  </h4>
                                </div>
                                <div className="p-0">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-100 text-slate-400 bg-white">
                                        <th className="px-6 py-3 font-bold">No. Lote</th>
                                        <th className="px-6 py-3 font-bold">Fecha Caducidad</th>
                                        <th className="px-6 py-3 font-bold">Disponibilidad</th>
                                        <th className="px-6 py-3 font-bold">Prioridad de Salida</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 bg-white">
                                      {product.batches.map((batch, idx) => {
                                        const expiring = isExpiringSoon(batch.expirationDate);
                                        return (
                                          <tr key={batch.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-3.5 font-mono font-bold text-slate-700">{batch.batchNumber}</td>
                                            <td className="px-6 py-3.5">
                                              <div className="flex items-center gap-2">
                                                <Calendar className={cn("w-4 h-4", expiring ? "text-rose-500" : "text-slate-400")} />
                                                <span className={cn("font-bold", expiring ? "text-rose-600" : "text-slate-700")}>
                                                  {new Date(batch.expirationDate).toLocaleDateString()}
                                                </span>
                                                {expiring && (
                                                  <span className="text-[9px] font-extrabold bg-rose-100 text-rose-700 px-1.5 rounded animate-pulse">Próximo a Caducar</span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-6 py-3.5 font-extrabold text-slate-700">{batch.quantity} uds</td>
                                            <td className="px-6 py-3.5">
                                              <span className={cn(
                                                "inline-flex px-2 py-0.5 rounded font-bold text-[10px]",
                                                idx === 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                                              )}>
                                                {idx === 0 ? "1ª Salida (FEFO)" : `${idx + 1}ª Salida`}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NUEVO LOTE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200 relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-4">Registrar Nuevo Lote</h3>
            
            <form onSubmit={handleAddBatch} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Producto</label>
                <select 
                  required
                  value={newBatch.productId}
                  onChange={(e) => setNewBatch({...newBatch, productId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Selecciona un producto...</option>
                  {currentInventory.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">No. de Lote</label>
                  <input 
                    type="text" required
                    value={newBatch.batchNumber}
                    onChange={(e) => setNewBatch({...newBatch, batchNumber: e.target.value})}
                    placeholder="L-1234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Cantidad</label>
                  <input 
                    type="number" required min="1"
                    value={newBatch.quantity || ''}
                    onChange={(e) => setNewBatch({...newBatch, quantity: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Fecha de Caducidad</label>
                <input 
                  type="date" required
                  value={newBatch.expirationDate}
                  onChange={(e) => setNewBatch({...newBatch, expirationDate: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-95"
              >
                Guardar Lote
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE NUEVO PRODUCTO */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200 relative overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setShowAddProductModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-4">Registrar Nuevo Producto</h3>
            
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Nombre del Producto</label>
                <input 
                  type="text" required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  placeholder="Ej: Paracetamol 500mg - Caja 20 tabs"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Principio Activo</label>
                <input 
                  type="text"
                  value={newProduct.activeIngredient}
                  onChange={(e) => setNewProduct({...newProduct, activeIngredient: e.target.value})}
                  placeholder="Ej: Paracetamol"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">SKU / Código</label>
                  <input 
                    type="text" required
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                    placeholder="Ej: MED-PARA-500"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Precio Venta (C$)</label>
                  <input 
                    type="number" required min="0" step="0.01"
                    value={newProduct.salePrice || ''}
                    onChange={(e) => setNewProduct({...newProduct, salePrice: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Categoría</label>
                  <select 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Analgésicos">Analgésicos</option>
                    <option value="Antibióticos">Antibióticos</option>
                    <option value="Controlados">Controlados</option>
                    <option value="Cardiología">Cardiología</option>
                  </select>
                </div>
                <div className="flex items-center justify-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={newProduct.isControlled}
                      onChange={(e) => setNewProduct({...newProduct, isControlled: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-rose-600">Es Controlado</span>
                  </label>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-95"
              >
                Guardar Producto
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
