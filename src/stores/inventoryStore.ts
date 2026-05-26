import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

interface InventoryState {
  // Datos
  inventory: Record<string, InventoryProduct[]>;

  // Acciones
  deductStock: (branchId: string, productId: string, qty: number) => void;
  restockProduct: (branchId: string, productId: string, batchId: string, qty: number) => void;
  initializeBranch: (branchId: string) => void;
  addBatch: (branchId: string, productId: string, newBatch: Batch) => void;
  addProduct: (branchId: string, product: InventoryProduct) => void;
  clearInventory: () => void;
}

// Datos iniciales realistas e idénticos a los escenarios de simulación
const INITIAL_INVENTORY: Record<string, InventoryProduct[]> = {};

/**
 * Inventory Store (Zustand + Persist)
 * Centraliza las existencias del catálogo clínico clínico de lotes por sucursal.
 * Ejecuta deducción de lotes bajo algoritmos estrictos FEFO (First-Expired, First-Out).
 */
export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      inventory: INITIAL_INVENTORY,

      clearInventory: () => set({ inventory: {} }),

      /**
       * deductStock
       * Deducción de stock bajo algoritmo FEFO. Resta unidades empezando
       * por el lote que caduca más temprano.
       */
      deductStock: (branchId, productId, qty) => {
        set((state) => {
          const branchProducts = state.inventory[branchId];
          if (!branchProducts) return state;

          const updatedProducts = branchProducts.map((product) => {
            if (product.id !== productId) return product;

            // 1. Ordenar lotes por fecha de caducidad (FEFO: Primero en caducar, primero en salir)
            const sortedBatches = [...product.batches].sort(
              (a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
            );

            let remainingQty = qty;
            
            // 2. Descontar stock lote por lote de forma secuencial
            const updatedBatches = sortedBatches.map((batch) => {
              if (remainingQty <= 0) return batch;

              if (batch.quantity >= remainingQty) {
                const nextQty = batch.quantity - remainingQty;
                remainingQty = 0;
                return { ...batch, quantity: nextQty };
              } else {
                remainingQty -= batch.quantity;
                return { ...batch, quantity: 0 };
              }
            });

            // 3. Recalcular stock total sumando las cantidades restantes en los lotes
            const nextStockTotal = updatedBatches.reduce((sum, b) => sum + b.quantity, 0);

            return {
              ...product,
              batches: updatedBatches,
              stockTotal: nextStockTotal,
              soldTotal: (product.soldTotal || 0) + qty
            };
          });

          return {
            inventory: {
              ...state.inventory,
              [branchId]: updatedProducts
            }
          };
        });
      },

      /**
       * restockProduct (Conceptual)
       * Añade existencias a un lote específico
       */
      restockProduct: (branchId, productId, batchId, qty) => {
        set((state) => {
          const branchProducts = state.inventory[branchId];
          if (!branchProducts) return state;

          const updatedProducts = branchProducts.map((product) => {
            if (product.id !== productId) return product;

            const updatedBatches = product.batches.map((batch) => {
              if (batch.id === batchId) {
                return { ...batch, quantity: batch.quantity + qty };
              }
              return batch;
            });

            const nextStockTotal = updatedBatches.reduce((sum, b) => sum + b.quantity, 0);

            return {
              ...product,
              batches: updatedBatches,
              stockTotal: nextStockTotal
            };
          });

          return {
            inventory: {
              ...state.inventory,
              [branchId]: updatedProducts
            }
          };
        });
      },

      addProduct: (branchId, product) => {
        set((state) => {
          const branchProducts = state.inventory[branchId] || [];
          return {
            inventory: {
              ...state.inventory,
              [branchId]: [...branchProducts, product]
            }
          };
        });
      },

      addBatch: (branchId, productId, newBatch) => {
        set((state) => {
          const branchProducts = state.inventory[branchId] || [];
          
          // Buscar si el producto ya existe en la sucursal actual
          const existingProductIndex = branchProducts.findIndex(p => p.id === productId);

          let updatedProducts = [...branchProducts];

          if (existingProductIndex >= 0) {
            // El producto ya existe en esta sucursal, actualizar sus lotes
            const product = updatedProducts[existingProductIndex];
            const existingBatch = product.batches.find(b => b.batchNumber === newBatch.batchNumber);
            let updatedBatches;
            
            if (existingBatch) {
              updatedBatches = product.batches.map(b => 
                b.batchNumber === newBatch.batchNumber 
                  ? { ...b, quantity: b.quantity + newBatch.quantity } 
                  : b
              );
            } else {
              updatedBatches = [...product.batches, newBatch];
            }

            const nextStockTotal = updatedBatches.reduce((sum, b) => sum + b.quantity, 0);

            updatedProducts[existingProductIndex] = {
              ...product,
              batches: updatedBatches,
              stockTotal: nextStockTotal
            };
          } else {
            // El producto NO existe en esta sucursal. Buscarlo en otras sucursales para clonar sus datos base.
            let productBaseTemplate = null;
            for (const bId of Object.keys(state.inventory)) {
              const found = state.inventory[bId].find(p => p.id === productId);
              if (found) {
                productBaseTemplate = found;
                break;
              }
            }

            if (productBaseTemplate) {
              // Añadir el producto a la sucursal con el nuevo lote
              updatedProducts.push({
                ...productBaseTemplate,
                batches: [newBatch],
                stockTotal: newBatch.quantity,
                soldTotal: 0
              });
            }
          }

          return {
            inventory: {
              ...state.inventory,
              [branchId]: updatedProducts
            }
          };
        });
      },

      initializeBranch: (branchId) => {
        set((state) => {
          if (state.inventory[branchId]) return state; // Ya existe

          // Catálogo vacío
          const defaultCatalog: InventoryProduct[] = [];

          return {
            inventory: {
              ...state.inventory,
              [branchId]: defaultCatalog
            }
          };
        });
      }
    }),
    {
      name: 'zefiro-inventory-storage',
    }
  )
);
