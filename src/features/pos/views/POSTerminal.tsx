import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ShoppingCart, 
  UserPlus, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  DollarSign,
  Package,
  Barcode,
  CheckCircle2,
  Printer,
  Loader2,
  Lock
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useBranchStore } from '../../../stores/branchStore';
import { useInventoryStore } from '../../../stores/inventoryStore';
import { useShiftStore } from '../../../stores/shiftStore';
import { useFocusLock } from '../../../hooks/useFocusLock';
import { useCustomerStore } from '../../../stores/customerStore';
import { recordSaleInSupabase } from '../../../lib/supabaseInventory';
import type { Customer } from '../../../stores/customerStore';
import { CustomerSelectorModal } from '../components/CustomerSelectorModal';
import { useTransactionStore } from '../../../stores/transactionStore';

// ==========================================
// DEFINICIONES DE TIPOS (Interfaces de Dominio)
// ==========================================

interface Product {
  id: string;
  name: string;
  barcode: string;
  salePrice: number;
  taxRate: number;
  stockTotal: number;
  category: string;
  hasFractions?: boolean;
  unitsPerBox?: number;
  unitPrice?: number;
}

interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  expirationDate: Date;
  quantity: number;
}

interface CartItem {
  product: Product;
  batch: Batch;
  quantity: number;
  sellingMode: 'box' | 'unit';
}

// Customer type imported from customerStore

// Los datos de inventarios se cargan dinámicamente desde el Zustand useInventoryStore para lograr aislamiento de silos físico.

export default function POSTerminal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  
  // Estados para la culminación de transacciones
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<{
    id: string;
    total: number;
    paymentMethod: string;
    itemsCount: number;
    earnedPoints?: number;
  } | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Bloqueo inteligente del foco del teclado en el input de escaneo de código de barras
  useFocusLock(searchInputRef);

  const activeBranch = useBranchStore((state) => state.activeBranch);
  const activeBranchId = activeBranch?.id || 'b-01';

  const currentShift = useShiftStore((state) => state.shifts[activeBranchId]);
  const fetchActiveShift = useShiftStore((state) => state.fetchActiveShift);
  const isShiftOpen = !!currentShift;
  const { inventory, deductStock, fetchInventory } = useInventoryStore();

  React.useEffect(() => {
    if (activeBranchId) {
      fetchActiveShift(activeBranchId);
      fetchInventory(activeBranchId, activeBranch?.name);
    }
  }, [activeBranchId, fetchActiveShift, fetchInventory, activeBranch?.name]);

  // Mapear los productos de la sucursal activa reactivamente
  const activeBranchProducts = useMemo(() => {
    const products = inventory[activeBranchId] || [];
    return products.map((p, idx) => ({
      id: p.id || `p-missing-${idx}`,
      name: p.name || 'Sin nombre',
      barcode: p.barcode || '',
      salePrice: p.salePrice || 0,
      taxRate: p.taxRate || 0,
      stockTotal: p.stockTotal || 0,
      category: p.category || 'General',
      hasFractions: p.hasFractions,
      unitsPerBox: p.unitsPerBox,
      unitPrice: p.unitPrice
    }));
  }, [inventory, activeBranchId]);

  // Mapear los lotes para soporte FEFO en el POS
  const activeBranchBatches = useMemo(() => {
    const products = inventory[activeBranchId] || [];
    const batchesMap: Record<string, Batch[]> = {};
    
    products.forEach(p => {
      batchesMap[p.id] = (p.batches || []).map(b => ({
        id: b.id,
        productId: p.id,
        batchNumber: b.batchNumber,
        expirationDate: new Date(b.expirationDate),
        quantity: b.quantity
      }));
    });
    
    return batchesMap;
  }, [inventory, activeBranchId]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [activeBranchId]);

  const handleCompleteTransaction = async () => {
    if (cart.length === 0) return;
    setIsCompleting(true);

    try {
      // Simular latencia de validación con API e inventario (FEFO check)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const totalPaid = financialSummary.total;
      const count = cart.reduce((acc, item) => acc + item.quantity, 0);

      // Descontar inventario de forma permanente y reactiva en el store global
      cart.forEach((item) => {
        const qtyToDeduct = item.sellingMode === 'unit' && item.product.unitsPerBox 
          ? item.quantity / item.product.unitsPerBox 
          : item.quantity;
        deductStock(activeBranchId, item.product.id, qtyToDeduct);
      });

      // Registrar la venta en Supabase (en background, sin bloquear UI)
      const sessionUser = useBranchStore.getState().user;
      const currentShiftId = useShiftStore.getState().shifts[activeBranchId]?.id;
      recordSaleInSupabase({
        branchId: activeBranchId,
        userId: sessionUser?.id || 'anonymous',
        cashShiftId: currentShiftId || 'unknown',
        customerId: selectedCustomer?.id,
        subtotal: financialSummary.subtotal,
        taxes: financialSummary.taxes,
        discount: financialSummary.discount || 0,
        total: totalPaid,
        items: cart.map(item => {
          const qtyToDeduct = item.sellingMode === 'unit' && item.product.unitsPerBox
            ? item.quantity / item.product.unitsPerBox
            : item.quantity;
          const firstBatch = activeBranchBatches[item.product.id]?.[0];
          return {
            productId: item.product.id,
            batchId: firstBatch?.id || 'unknown',
            quantity: qtyToDeduct,
            unitPrice: item.product.salePrice,
            taxRate: item.product.taxRate || 0,
            subtotal: item.product.salePrice * qtyToDeduct
          };
        })
      }).catch(console.error);

      // Acumular la venta en el turno activo en caliente
      useShiftStore.getState().addSale(activeBranchId, totalPaid, paymentMethod === 'cash' ? 'cash' : 'card');

      // Guardar la transacción en el historial global de reportes
      const category = cart[0]?.product.category || 'Varios';
      
      const earnedPoints = selectedCustomer ? Math.floor(totalPaid * 0.05) : undefined; // 5% en puntos solo si hay cliente
      
      const newTransaction = {
        branchId: activeBranchId,
        branchName: activeBranch?.name || 'Sucursal Desconocida',
        cashier: sessionUser?.name || 'Cajero Desconocido',
        total: totalPaid,
        paymentMethod: paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta',
        category: category,
        earnedPoints: earnedPoints,
        itemsCount: count
      };

      useTransactionStore.getState().addTransaction(newTransaction);

      // Si hay cliente asociado, actualizar su perfil
      if (selectedCustomer) {
        useCustomerStore.getState().updateCustomer(selectedCustomer.id, {
          points: selectedCustomer.points + (earnedPoints || 0),
          ltv: selectedCustomer.ltv + totalPaid,
          lastVisit: new Date().toLocaleString(),
          purchases: [
            ...(selectedCustomer.purchases || []),
            {
              id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
              date: new Date().toLocaleString(),
              amount: totalPaid,
              pointsEarned: earnedPoints || 0
            }
          ]
        });
      }

      setLastTransaction({
        id: 'TX-' + Math.floor(100000 + Math.random() * 900000),
        total: totalPaid,
        paymentMethod: paymentMethod === 'cash' ? 'Efectivo (Fondo de Caja)' : 'Terminal de Crédito/Débito',
        itemsCount: count,
        earnedPoints: earnedPoints
      });
      
      setShowSuccessModal(true);
      // No limpiar el carrito ni el cliente hasta cerrar el modal, para mostrar datos reales en el ticket
    } catch (error) {
      console.error('Error al procesar la venta:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return activeBranchProducts;
    const term = searchQuery.toLowerCase();
    return activeBranchProducts.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.barcode.includes(term)
    );
  }, [searchQuery, activeBranchProducts]);

  const addToCart = (product: Product) => {
    const productBatches = activeBranchBatches[product.id];
    if (!productBatches || productBatches.length === 0) return;
    
    const activeBatch = [...productBatches].sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime())[0];

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.batch.id === activeBatch.id);
      
      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1
        };
        return newCart;
      }
      
      return [...prevCart, { product, batch: activeBatch, quantity: 1, sellingMode: 'box' }];
    });
    
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const updateQuantity = (batchId: string, delta: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.batch.id === batchId) {
        const newQty = Math.max(1, item.quantity + delta);
        // Validar stock: si está en modo unidad, convertir la cantidad actual a cajas para comparar con el stock en lote
        const stockNeeded = item.sellingMode === 'unit' && item.product.unitsPerBox 
          ? newQty / item.product.unitsPerBox 
          : newQty;
          
        if (stockNeeded > item.batch.quantity) {
          alert('No hay suficiente stock disponible en este lote.');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const toggleSellingMode = (batchId: string) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.batch.id === batchId && item.product.hasFractions) {
        return { ...item, sellingMode: item.sellingMode === 'box' ? 'unit' : 'box', quantity: 1 };
      }
      return item;
    }));
  };

  const removeFromCart = (batchId: string) => {
    setCart(prevCart => prevCart.filter(item => item.batch.id !== batchId));
  };

  const financialSummary = useMemo(() => {
    let subtotal = 0;
    let totalTaxes = 0;

    cart.forEach(item => {
      const price = item.sellingMode === 'unit' && item.product.unitPrice 
        ? item.product.unitPrice 
        : item.product.salePrice;
      const lineSubtotal = price * item.quantity;
      
      // La configuración fiscal de la sucursal tiene prioridad (Ej. 0% de ley)
      const branchTaxOverride = activeBranch?.config?.taxPercentage === 0 ? 0 : 1;
      const effectiveTaxRate = item.product.taxRate * branchTaxOverride;
      
      const lineTax = lineSubtotal * effectiveTaxRate;
      
      subtotal += lineSubtotal;
      totalTaxes += lineTax;
    });

    return {
      subtotal,
      taxes: totalTaxes,
      total: subtotal + totalTaxes
    };
  }, [cart]);

  const isExpiringSoon = (expiryDate: Date) => {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expiryDate < threeMonthsFromNow;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-slate-50 font-sans antialiased text-slate-900 overflow-hidden">

      <main className="flex-1 flex flex-col border-r border-slate-200 bg-slate-50 relative">
        {/* BLOQUEO DE CAJA CERRADA */}
        {!isShiftOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-md text-center animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 border border-slate-200">
                <Lock className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Caja Cerrada</h2>
              <p className="text-sm font-medium text-slate-500 mt-2 mb-6 leading-relaxed">
                El sistema de punto de venta está bloqueado. Para procesar transacciones debes realizar primero el <strong>Fondeo de Apertura</strong> de caja para tu turno actual.
              </p>
              <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                Utiliza el botón "Abrir Caja" en la barra superior
              </div>
            </div>
          </div>
        )}

        <header className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-800">FarmaSaaS Terminal</h1>
              <p className="text-xs text-slate-500 font-medium">
                {activeBranch?.name || 'Sucursal Centro'} • Terminal POS
              </p>
            </div>
          </div>

          <div className="relative w-1/2 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Barcode className="h-5 w-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="F2 - Escanear código o buscar producto..."
              className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length === 1) {
                  addToCart(filteredProducts[0]);
                }
              }}
            />
          </div>

          <button 
            onClick={() => setIsCustomerModalOpen(true)}
            className={cn(
              "flex items-center px-3.5 py-2 rounded-full border transition-colors text-sm font-medium",
              selectedCustomer 
                ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {selectedCustomer ? selectedCustomer.name : 'Venta de Mostrador'}
          </button>
        </header>

        <section className="flex-1 p-6 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700">Productos Frecuentes & Resultados</h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-200/60 px-2 py-1 rounded-md">
              {filteredProducts.length} items encontrados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const primaryBatch = activeBranchBatches[product.id]?.[0];
              const expiring = primaryBatch ? isExpiringSoon(primaryBatch.expirationDate) : false;

              return (
                <div 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group flex flex-col justify-between bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all duration-200 select-none active:scale-[0.98]"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                        {product.category}
                      </span>
                      
                      {expiring && (
                        <div className="flex items-center text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md animate-pulse">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          <span className="text-[10px] font-bold">Caducidad Próxima</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">{product.barcode}</p>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Lote: {primaryBatch?.batchNumber || 'N/A'}</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                        C${product.salePrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500">Stock total: <span className={cn("font-bold", product.stockTotal < 15 ? "text-rose-600" : "text-slate-700")}>{product.stockTotal}</span></p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <aside className="w-96 bg-white flex flex-col shadow-2xl relative z-10 border-l border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800 text-base">Carrito Activo</h2>
          </div>
          {cart.length > 0 && (
            <button 
              onClick={() => setCart([])} 
              className="text-slate-400 hover:text-rose-600 text-xs font-medium transition-colors"
            >
              Limpiar Todo
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
              <ShoppingCart className="w-12 h-12 stroke-[1.5] mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-medium">El carrito está vacío</p>
              <p className="text-xs text-slate-400 mt-1">Escanea o selecciona productos para iniciar.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div 
                key={item.batch.id}
                className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 relative group overflow-hidden"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="pr-4">
                    <h4 className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">{item.product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                        Lote: {item.batch.batchNumber}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        C${(item.sellingMode === 'unit' && item.product.unitPrice ? item.product.unitPrice : item.product.salePrice).toFixed(2)} c/u
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button 
                      onClick={() => removeFromCart(item.batch.id)}
                      className="text-slate-300 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {item.product.hasFractions && (
                      <button 
                        onClick={() => toggleSellingMode(item.batch.id)}
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider transition-all",
                          item.sellingMode === 'unit' 
                            ? "bg-amber-100 text-amber-700 border border-amber-200" 
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                        )}
                      >
                        {item.sellingMode === 'unit' ? 'Unidad' : 'Caja'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 bg-white rounded-lg border border-slate-200 p-1">
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => updateQuantity(item.batch.id, -1)}
                      className="p-1 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(item.batch.id, 1)}
                      className="p-1 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 pr-1">
                    C${((item.sellingMode === 'unit' && item.product.unitPrice ? item.product.unitPrice : item.product.salePrice) * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50/50 space-y-4 shadow-[0_-4px_15px_rgba(0,0,0,0.03)]">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-medium">C${financialSummary.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Impuestos (IVA)</span>
              <span className="font-medium">C${financialSummary.taxes.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-900">
              <span className="font-bold">Total a Pagar</span>
              <span className="text-xl font-extrabold tracking-tight">C${financialSummary.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button 
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={cn(
                "flex items-center justify-center py-2 rounded-lg text-xs font-bold border transition-all duration-150",
                paymentMethod === 'cash' 
                  ? "bg-blue-50 border-blue-500 text-blue-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
            >
              <DollarSign className="w-4 h-4 mr-1.5" />
              Efectivo
            </button>
            <button 
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={cn(
                "flex items-center justify-center py-2 rounded-lg text-xs font-bold border transition-all duration-150",
                paymentMethod === 'card' 
                  ? "bg-blue-50 border-blue-500 text-blue-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              Tarjeta
            </button>
          </div>

          <button 
            disabled={cart.length === 0 || isCompleting}
            onClick={handleCompleteTransaction}
            className={cn(
              "w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center transition-all active:scale-[0.99]",
              cart.length > 0 && !isCompleting
                ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 cursor-pointer" 
                : "bg-slate-300 cursor-not-allowed shadow-none"
            )}
          >
            {isCompleting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            <span>
              {isCompleting ? 'Procesando Venta...' : `Completar Transacción (C$${financialSummary.total.toFixed(2)})`}
            </span>
          </button>
        </div>
      </aside>

      <CustomerSelectorModal 
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        selectedCustomerId={selectedCustomer?.id}
        onSelectCustomer={setSelectedCustomer}
      />

      {/* MODAL DE ÉXITO DE TRANSACCIÓN (TICKET TÉRMICO) */}
      {showSuccessModal && lastTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] bg-[#f9f9f9] border-t-8 border-slate-800 rounded-b-md shadow-2xl p-6 relative font-mono text-sm text-slate-800 animate-in slide-in-from-bottom-4 duration-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-black/5 blur-sm rounded-full"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-slate-800" />
              </div>
              
              <h3 className="font-bold text-lg uppercase tracking-widest mb-1">Zefiro POS</h3>
              <p className="text-xs text-slate-500 uppercase">{activeBranch?.name || 'Sucursal Centro'}</p>
              <p className="text-[10px] text-slate-500 mt-1">Ticket: {lastTransaction.id}</p>
              <p className="text-[10px] text-slate-500">{new Date().toLocaleString()}</p>
              
              <div className="w-full border-t border-dashed border-slate-400 my-4"></div>

              <div className="w-full space-y-2 text-xs">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between items-start text-left">
                    <div className="pr-2 leading-tight">
                      <span className="font-bold block">
                        {item.quantity}x {item.product.name} 
                        {item.sellingMode === 'unit' && <span className="text-[9px] ml-1 bg-slate-200 px-1 py-0.5 rounded text-slate-600">Unidades</span>}
                      </span>
                      <span className="text-[10px] text-slate-500">Lote: {item.batch.batchNumber}</span>
                    </div>
                    <span className="font-bold shrink-0">C${((item.sellingMode === 'unit' && item.product.unitPrice ? item.product.unitPrice : item.product.salePrice) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="w-full border-t border-dashed border-slate-400 my-4"></div>

              <div className="w-full space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>C${financialSummary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA:</span>
                  <span>C${financialSummary.taxes.toFixed(2)}</span>
                </div>
                {lastTransaction.earnedPoints !== undefined && (
                  <div className="flex justify-between text-slate-600">
                    <span>Puntos Ganados:</span>
                    <span className="font-bold">+{lastTransaction.earnedPoints}</span>
                  </div>
                )}
                {selectedCustomer && (
                  <div className="flex justify-between text-slate-600">
                    <span>Cliente:</span>
                    <span className="truncate max-w-[150px]">{selectedCustomer.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Pago con:</span>
                  <span>{lastTransaction.paymentMethod.includes('Efectivo') ? 'Efectivo' : 'Tarjeta'}</span>
                </div>
                
                <div className="flex justify-between text-lg font-black uppercase mt-3 pt-3 border-t border-slate-800">
                  <span>Total:</span>
                  <span>C${lastTransaction.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="w-full border-t border-dashed border-slate-400 my-4"></div>
              
              <p className="text-[10px] text-center font-bold uppercase mb-6">*** GRACIAS POR SU COMPRA ***</p>

              <div className="grid grid-cols-2 gap-3 w-full font-sans">
                <button
                  onClick={() => {
                    alert('Imprimiendo recibo térmico...');
                  }}
                  className="py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  Imprimir
                </button>
                
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setLastTransaction(null);
                    setCart([]); // Limpiar ahora
                    setSelectedCustomer(null);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  Nueva Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
