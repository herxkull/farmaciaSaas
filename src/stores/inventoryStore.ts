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
}

// Datos iniciales realistas e idénticos a los escenarios de simulación
const INITIAL_INVENTORY: Record<string, InventoryProduct[]> = {
  // SUCURSAL CENTRO (SC-01)
  'b-01': [
    {
      id: 'p1',
      name: 'Paracetamol 500mg - Caja 20 tabs',
      activeIngredient: 'Paracetamol',
      barcode: '7501234567890',
      sku: 'MED-PARA-500',
      salePrice: 45.50,
      taxRate: 0.16,
      stockTotal: 150,
      isControlled: false,
      category: 'Analgésicos',
      batches: [
        { id: 'b1', batchNumber: 'L-2349', expirationDate: '2027-12-01', quantity: 150 },
      ]
    },
    {
      id: 'p2',
      name: 'Amoxicilina Suspensión 250mg/5ml',
      activeIngredient: 'Amoxicilina',
      barcode: '7509876543210',
      sku: 'ABX-AMOX-250',
      salePrice: 120.00,
      taxRate: 0.0,
      stockTotal: 12,
      isControlled: false,
      category: 'Antibióticos',
      batches: [
        { id: 'b2', batchNumber: 'L-8890', expirationDate: '2026-06-15', quantity: 12 },
      ]
    },
    {
      id: 'p3',
      name: 'Clonazepam 2mg - 30 tabletas',
      activeIngredient: 'Clonazepam',
      barcode: '7507788991122',
      sku: 'MED-CLON-002',
      salePrice: 185.00,
      taxRate: 0.16,
      stockTotal: 85,
      isControlled: true,
      category: 'Controlados',
      batches: [
        { id: 'b3_1', batchNumber: 'L-5512', expirationDate: '2026-10-01', quantity: 35 },
        { id: 'b3_2', batchNumber: 'L-5513', expirationDate: '2027-04-15', quantity: 50 },
      ]
    },
    {
      id: 'p4',
      name: 'Omeprazol 20mg - Caja 30 cápsulas',
      activeIngredient: 'Omeprazol',
      barcode: '7506677889900',
      sku: 'MED-OMEP-020',
      salePrice: 85.00,
      taxRate: 0.16,
      stockTotal: 60,
      isControlled: false,
      category: 'Gastroenterología',
      batches: [
        { id: 'b4', batchNumber: 'L-9902', expirationDate: '2027-05-20', quantity: 60 },
      ]
    }
  ],
  // SUCURSAL NORTE (SN-02)
  'b-02': [
    {
      id: 'p5',
      name: 'Insulina Humana Acción Rápida 100 UI/ml',
      activeIngredient: 'Insulina Humana',
      barcode: '7505544332211',
      sku: 'MED-INSU-100',
      salePrice: 450.00,
      taxRate: 0.0,
      stockTotal: 45,
      isControlled: false,
      category: 'Endocrinología',
      batches: [
        { id: 'b5', batchNumber: 'L-7711', expirationDate: '2026-09-30', quantity: 45 },
      ]
    },
    {
      id: 'p6',
      name: 'Ibuprofeno 400mg - Caja 10 tabs',
      activeIngredient: 'Ibuprofeno',
      barcode: '7501122334455',
      sku: 'MED-IBUP-400',
      salePrice: 55.00,
      taxRate: 0.16,
      stockTotal: 320,
      isControlled: false,
      category: 'Analgésicos',
      batches: [
        { id: 'b6', batchNumber: 'L-1200', expirationDate: '2028-02-14', quantity: 320 },
      ]
    },
    {
      id: 'p3',
      name: 'Clonazepam 2mg - 30 tabletas',
      activeIngredient: 'Clonazepam',
      barcode: '7507788991122',
      sku: 'MED-CLON-002',
      salePrice: 185.00,
      taxRate: 0.16,
      stockTotal: 15,
      isControlled: true,
      category: 'Controlados',
      batches: [
        { id: 'b3_3', batchNumber: 'L-5514', expirationDate: '2026-07-20', quantity: 15 },
      ]
    },
    {
      id: 'p7',
      name: 'Atorvastatina 20mg - Caja 30 tabs',
      activeIngredient: 'Atorvastatina',
      barcode: '7504433221100',
      sku: 'MED-ATOR-020',
      salePrice: 140.00,
      taxRate: 0.16,
      stockTotal: 90,
      isControlled: false,
      category: 'Cardiología',
      batches: [
        { id: 'b7', batchNumber: 'L-4411', expirationDate: '2027-11-05', quantity: 90 },
      ]
    },
    {
      id: 'p8',
      name: 'Loratadina 10mg - Caja 20 tabs',
      activeIngredient: 'Loratadina',
      barcode: '7502233445566',
      sku: 'MED-LORA-010',
      salePrice: 32.00,
      taxRate: 0.16,
      stockTotal: 8,
      isControlled: false,
      category: 'Antihistamínicos',
      batches: [
        { id: 'b8', batchNumber: 'L-3310', expirationDate: '2026-06-01', quantity: 8 },
      ]
    }
  ]
};

/**
 * Inventory Store (Zustand + Persist)
 * Centraliza las existencias del catálogo clínico clínico de lotes por sucursal.
 * Ejecuta deducción de lotes bajo algoritmos estrictos FEFO (First-Expired, First-Out).
 */
export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      inventory: INITIAL_INVENTORY,

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
          const branchProducts = state.inventory[branchId];
          if (!branchProducts) return state;

          const updatedProducts = branchProducts.map((product) => {
            if (product.id !== productId) return product;

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

      initializeBranch: (branchId) => {
        set((state) => {
          if (state.inventory[branchId]) return state; // Ya existe

          // Generar catálogo clínico inicial
          const defaultCatalog = [
            {
              id: 'p1',
              name: 'Paracetamol 500mg - Caja 20 tabs',
              activeIngredient: 'Paracetamol',
              barcode: '7501234567890',
              sku: 'MED-PARA-500',
              salePrice: 45.50,
              taxRate: 0.16,
              stockTotal: 100,
              isControlled: false,
              category: 'Analgésicos',
              batches: [
                { id: `b1_${branchId}`, batchNumber: 'L-NEW1', expirationDate: '2028-06-30', quantity: 100 },
              ]
            },
            {
              id: 'p2',
              name: 'Amoxicilina Suspensión 250mg/5ml',
              activeIngredient: 'Amoxicilina',
              barcode: '7509876543210',
              sku: 'ABX-AMOX-250',
              salePrice: 120.00,
              taxRate: 0.0,
              stockTotal: 40,
              isControlled: false,
              category: 'Antibióticos',
              batches: [
                { id: `b2_${branchId}`, batchNumber: 'L-NEW2', expirationDate: '2026-06-15', quantity: 40 },
              ]
            },
            {
              id: 'p3',
              name: 'Clonazepam 2mg - 30 tabletas',
              activeIngredient: 'Clonazepam',
              barcode: '7507788991122',
              sku: 'MED-CLON-002',
              salePrice: 185.00,
              taxRate: 0.16,
              stockTotal: 15,
              isControlled: true,
              category: 'Controlados',
              batches: [
                { id: `b3_${branchId}`, batchNumber: 'L-NEW3', expirationDate: '2026-10-01', quantity: 15 },
              ]
            },
            {
              id: 'p4',
              name: 'Omeprazol 20mg - Caja 30 cápsulas',
              activeIngredient: 'Omeprazol',
              barcode: '7506677889900',
              sku: 'MED-OMEP-020',
              salePrice: 85.00,
              taxRate: 0.16,
              stockTotal: 50,
              isControlled: false,
              category: 'Gastroenterología',
              batches: [
                { id: `b4_${branchId}`, batchNumber: 'L-NEW4', expirationDate: '2027-12-31', quantity: 50 },
              ]
            },
            {
              id: 'p5',
              name: 'Loratadina 10mg - Caja 20 tabs',
              activeIngredient: 'Loratadina',
              barcode: '7502233445566',
              sku: 'MED-LORA-010',
              salePrice: 32.00,
              taxRate: 0.16,
              stockTotal: 8,
              isControlled: false,
              category: 'Antihistamínicos',
              batches: [
                { id: `b5_${branchId}`, batchNumber: 'L-NEW5', expirationDate: '2026-06-01', quantity: 8 },
              ]
            }
          ];

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
