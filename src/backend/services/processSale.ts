import { PrismaClient, SaleStatus } from '@prisma/client';
import { applyFefoDiscount } from './applyFefoDiscount';

const prisma = new PrismaClient();

export interface CheckoutItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface CheckoutPayload {
  tenantId: string;
  branchId: string;
  userId: string;
  cashShiftId: string;
  customerId?: string;
  items: CheckoutItem[];
}

/**
 * Función principal para procesar una venta en caja.
 * Usa Transacciones Interactivas ($transaction) para garantizar que, si el algoritmo FEFO 
 * detecta colisiones o falta de stock a la mitad del carrito, TODO el proceso se revierta (Rollback).
 */
export async function processSale(payload: CheckoutPayload) {
  try {
    const finalSale = await prisma.$transaction(async (tx) => {
      
      let subtotalTotal = 0;
      let taxesTotal = 0;
      let totalTotal = 0;

      // El array que albergará todas las líneas de venta listas para insertarse
      const saleItemsData = [];

      // 1. Procesar cada producto del carrito
      for (const item of payload.items) {
        
        // 2. Aplicar descuento físico (Atomic + FEFO)
        const consumedBatches = await applyFefoDiscount({
          tx,
          tenantId: payload.tenantId,
          branchId: payload.branchId,
          productId: item.productId,
          quantityRequired: item.quantity
        });

        // 3. Transformar los fragmentos FEFO en líneas formales de venta
        for (const batchSplit of consumedBatches) {
          const lineSubtotal = batchSplit.quantity * item.unitPrice;
          
          // Anulación del impuesto si la sucursal es exenta (tasa 0%)
          const branchRecord = await tx.branch.findUnique({ where: { id: payload.branchId } });
          const branchTaxOverride = branchRecord?.taxPercentage === 0 ? 0 : 1;
          const effectiveTaxRate = (item.taxRate / 100) * branchTaxOverride;
          
          const lineTax = lineSubtotal * effectiveTaxRate;
          
          subtotalTotal += lineSubtotal;
          taxesTotal += lineTax;
          totalTotal += (lineSubtotal + lineTax);

          saleItemsData.push({
            productId: batchSplit.productId,
            batchId: batchSplit.batchId, // Trazabilidad estricta al lote específico consumido
            quantity: batchSplit.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            subtotal: lineSubtotal
          });
        }
      }

      // 4. Inserción Atómica del Comprobante y Detalles
      const sale = await tx.sale.create({
        data: {
          tenantId: payload.tenantId,
          branchId: payload.branchId,
          userId: payload.userId,
          cashShiftId: payload.cashShiftId,
          customerId: payload.customerId,
          
          subtotal: subtotalTotal,
          taxes: taxesTotal,
          discount: 0,
          total: totalTotal,
          status: SaleStatus.COMPLETED,
          
          items: {
            create: saleItemsData
          }
        },
        include: {
          items: true
        }
      });

      return sale;
    });

    return { success: true, data: finalSale };
    
  } catch (error: any) {
    // Aquí atrapamos el throw del applyFefoDiscount u otros errores de BD
    console.error('[processSale] Checkout Fallido:', error.message);
    return { success: false, error: error.message };
  }
}
