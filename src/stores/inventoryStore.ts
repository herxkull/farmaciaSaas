import { create } from 'zustand';
import { fetchInventoryFromSupabase } from '../lib/supabaseInventory';
import { supabase } from '../lib/supabase';

export interface Batch {
  id: string;
  batchNumber: string;
  expirationDate: string; // Formato YYYY-MM-DD
  quantity: number;
}

export interface InventoryProduct {
  id: string;
  name: string;
  activeIngredient: string;
  barcode: string;
  sku: string;
  salePrice: number;
  taxRate: number;
  stockTotal: number;
  isControlled: boolean;
  category: string;
  batches: Batch[];
  soldTotal?: number;
  // Soporte para venta fraccionada
  hasFractions?: boolean;
  unitsPerBox?: number;
  unitPrice?: number;
}

interface InventoryState {
  // Datos
  inventory: Record<string, InventoryProduct[]>;

  fetchInventory: (branchId: string, branchName?: string) => Promise<void>;
  clearInventory: () => void;
  setBranchInventory: (branchId: string, data: InventoryProduct[]) => void;
  importInventoryToCloud: (branchId: string, data: InventoryProduct[]) => Promise<void>;
  clearInventoryInCloud: (branchId: string) => Promise<void>;
  deductStock: (branchId: string, productId: string, qty: number) => void;
  restockProduct: (branchId: string, productId: string, batchId: string, qty: number) => void;
  initializeBranch: (branchId: string) => void;
  addBatch: (branchId: string, productId: string, newBatch: Batch) => Promise<void>;
  addProduct: (branchId: string, product: InventoryProduct) => Promise<void>;
  updateProduct: (branchId: string, productId: string, updates: Partial<InventoryProduct>) => void;
}

// Datos iniciales realistas e idénticos a los escenarios de simulación
const INITIAL_INVENTORY: Record<string, InventoryProduct[]> = {};

/**
 * Inventory Store (Zustand + Persist)
 * Centraliza las existencias del catálogo clínico clínico de lotes por sucursal.
 * Ejecuta deducción de lotes bajo algoritmos estrictos FEFO (First-Expired, First-Out).
 */
export const useInventoryStore = create<InventoryState>()((set, get) => ({
  inventory: {},

  fetchInventory: async (branchId, branchName) => {
    const products = await fetchInventoryFromSupabase(branchId, branchName);
    set((state) => ({
      inventory: {
        ...state.inventory,
        [branchId]: products
      }
    }));
  },

  clearInventory: () => set({ inventory: {} }),

  setBranchInventory: (branchId, data) => set((state) => ({
    inventory: {
      ...state.inventory,
      [branchId]: data
    }
  })),

  importInventoryToCloud: async (branchId, products) => {
    const tenantId = useBranchStore.getState().user?.tenantId;
    if (!tenantId) return;
    const now = new Date().toISOString();
    
    // Guardar en Supabase producto por producto y sus lotes
    for (const product of products) {
      if (product.salePrice < 0) {
        throw new Error(`El precio del producto ${product.name} no puede ser negativo.`);
      }
      
      const productId = product.id || ('PROD-' + Math.random().toString(36).slice(2, 9).toUpperCase());
      
      const { error: pErr } = await supabase.from('products').upsert({
        id: productId,
        tenant_id: tenantId,
        name: product.name,
        barcode: product.barcode || productId,
        sku: product.sku || '',
        active_ingredient: product.activeIngredient || 'No especificado',
        concentration: '—',
        is_controlled: product.isControlled || false,
        requires_prescription: false,
        base_price: product.salePrice,
        sale_price: product.salePrice,
        tax_rate: product.taxRate || 0,
        has_fractions: product.hasFractions || false,
        units_per_box: product.unitsPerBox || null,
        unit_price: product.unitPrice || null,
        updated_at: now
      });
      if (pErr) console.error('Error importing product:', pErr);

      for (const batch of product.batches || []) {
        if (batch.quantity < 0) {
          throw new Error(`El lote del producto ${product.name} no puede tener stock negativo.`);
        }
        await supabase.from('inventory_batches').upsert({
          id: batch.id || ('BATCH-' + Math.random().toString(36).slice(2, 9)),
          tenant_id: tenantId,
          branch_id: branchId,
          product_id: productId,
          batch_number: batch.batchNumber || 'L001',
          expiration_date: batch.expirationDate || '2027-01-01',
          cost_price: product.salePrice * 0.7,
          quantity: batch.quantity,
          updated_at: now
        });
      }
    }
    
    // Reflejar localmente
    set((state) => ({
      inventory: { ...state.inventory, [branchId]: products }
    }));
  },

  clearInventoryInCloud: async (branchId) => {
    // Delete batches in this branch
    await supabase.from('inventory_batches').delete().eq('branch_id', branchId);
    
    // Limpiar localmente
    set((state) => ({
      inventory: { ...state.inventory, [branchId]: [] }
    }));
  },

  /**
   * deductStock
   * Deducción local inmediata + sincronización con Supabase en segundo plano.
   */
  deductStock: (branchId, productId, qty) => {
    // 1. Actualización local instantánea (UI)
    set((state) => {
      const branchProducts = state.inventory[branchId];
      if (!branchProducts) return state;

      const updatedProducts = branchProducts.map((product) => {
        if (product.id !== productId) return product;

        const sortedBatches = [...product.batches].sort(
          (a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
        );

        let remainingQty = qty;
        const updatedBatches = sortedBatches.map((batch) => {
          if (remainingQty <= 0) return batch;
          if (batch.quantity >= remainingQty) {
            const nextQty = Math.round((batch.quantity - remainingQty) * 10000) / 10000;
            remainingQty = 0;
            return { ...batch, quantity: nextQty };
          } else {
            remainingQty = Math.round((remainingQty - batch.quantity) * 10000) / 10000;
            return { ...batch, quantity: 0 };
          }
        });

        const nextStockTotal = Math.round(updatedBatches.reduce((sum, b) => sum + b.quantity, 0) * 10000) / 10000;
        return { ...product, batches: updatedBatches, stockTotal: nextStockTotal, soldTotal: Math.round(((product.soldTotal || 0) + qty) * 10000) / 10000 };
      });

      return { inventory: { ...state.inventory, [branchId]: updatedProducts } };
    });

    // 2. Sincronización en background con Supabase (manejado vía RPC process_sale en POSTerminal)
  },

  restockProduct: (branchId, productId, batchId, qty) => {
    set((state) => {
      const branchProducts = state.inventory[branchId];
      if (!branchProducts) return state;

      const updatedProducts = branchProducts.map((product) => {
        if (product.id !== productId) return product;
        const updatedBatches = (product.batches || []).map((batch) => {
          if (batch.id === batchId) return { ...batch, quantity: batch.quantity + qty };
          return batch;
        });
        const nextStockTotal = updatedBatches.reduce((sum, b) => sum + b.quantity, 0);
        return { ...product, batches: updatedBatches, stockTotal: nextStockTotal };
      });

      return { inventory: { ...state.inventory, [branchId]: updatedProducts } };
    });
  },

  addProduct: async (branchId, product) => {
    const tenantId = useBranchStore.getState().user?.tenantId;
    if (!tenantId) throw new Error('No session');

    if (product.salePrice < 0) {
      throw new Error('El precio de venta no puede ser negativo.');
    }
    
    for (const batch of product.batches || []) {
      if (batch.quantity < 0) {
        throw new Error('La cantidad en stock no puede ser negativa.');
      }
    }

    const productId = product.id || ('PROD-' + Math.random().toString(36).slice(2, 9).toUpperCase());
    const now = new Date().toISOString();

    // Upsert tenant FK first
    await supabase.from('tenants').upsert({ id: tenantId, name: 'Zefiro Global', slug: 'zefiro', is_active: true, updated_at: now });

    // Insert product into Supabase master catalogue
    const { error: pErr } = await supabase.from('products').upsert({
      id: productId,
      tenant_id: tenantId,
      name: product.name,
      barcode: product.barcode || productId,
      sku: product.sku || '',
      active_ingredient: product.activeIngredient || 'No especificado',
      concentration: '—',
      is_controlled: product.isControlled || false,
      requires_prescription: false,
      base_price: product.salePrice,
      sale_price: product.salePrice,
      tax_rate: product.taxRate || 0,
      has_fractions: product.hasFractions || false,
      units_per_box: product.unitsPerBox || null,
      unit_price: product.unitPrice || null,
      updated_at: now
    });
    if (pErr) { console.error('Error adding product to Supabase', pErr); }

    // Insert each batch into inventory_batches
    for (const batch of product.batches || []) {
      await supabase.from('inventory_batches').upsert({
        id: batch.id || ('BATCH-' + Math.random().toString(36).slice(2, 9)),
        tenant_id: tenantId,
        branch_id: branchId,
        product_id: productId,
        batch_number: batch.batchNumber || 'L001',
        expiration_date: batch.expirationDate || '2027-01-01',
        cost_price: product.salePrice * 0.7,
        quantity: batch.quantity,
        updated_at: now
      });
    }

    // Update local store
    set((state) => {
      const branchProducts = state.inventory[branchId] || [];
      return { inventory: { ...state.inventory, [branchId]: [...branchProducts, { ...product, id: productId }] } };
    });
  },

  updateProduct: (branchId, productId, updates) => {
    set((state) => {
      const branchProducts = state.inventory[branchId];
      if (!branchProducts) return state;
      return {
        inventory: {
          ...state.inventory,
          [branchId]: branchProducts.map((p) => p.id === productId ? { ...p, ...updates } : p)
        }
      };
    });
  },

  addBatch: async (branchId, productId, newBatch) => {
    const tenantId = useBranchStore.getState().user?.tenantId;
    const now = new Date().toISOString();
    const batchId = newBatch.id || ('BATCH-' + Math.random().toString(36).slice(2, 9));

    // Upsert to Supabase
    const { error } = await supabase.from('inventory_batches').upsert({
      id: batchId,
      tenant_id: tenantId,
      branch_id: branchId,
      product_id: productId,
      batch_number: newBatch.batchNumber,
      expiration_date: newBatch.expirationDate,
      cost_price: 0,
      quantity: newBatch.quantity,
      updated_at: now
    });
    if (error) console.error('Error adding batch to Supabase', error);

    // Update local store
    set((state) => {
      const branchProducts = state.inventory[branchId] || [];
      const existingIdx = branchProducts.findIndex(p => p.id === productId);
      let updatedProducts = [...branchProducts];

      if (existingIdx >= 0) {
        const product = updatedProducts[existingIdx];
        const existingBatch = (product.batches || []).find(b => b.batchNumber === newBatch.batchNumber);
        let updatedBatches = existingBatch
          ? product.batches.map(b => b.batchNumber === newBatch.batchNumber ? { ...b, quantity: b.quantity + newBatch.quantity } : b)
          : [...product.batches, { ...newBatch, id: batchId }];
        const nextStockTotal = updatedBatches.reduce((sum, b) => sum + b.quantity, 0);
        updatedProducts[existingIdx] = { ...product, batches: updatedBatches, stockTotal: nextStockTotal };
      }

      return { inventory: { ...state.inventory, [branchId]: updatedProducts } };
    });
  },

  initializeBranch: (branchId) => {
    set((state) => {
      if (state.inventory[branchId]) return state;
      return { inventory: { ...state.inventory, [branchId]: [] } };
    });
  }
}));


