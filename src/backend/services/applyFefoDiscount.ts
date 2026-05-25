import { Prisma, PrismaClient } from '@prisma/client';

export interface FefoDiscountParams {
  tx: Prisma.TransactionClient;
  tenantId: string;
  branchId: string;
  productId: string;
  quantityRequired: number;
}

export interface FefoDiscountResult {
  productId: string;
  batchId: string;
  quantity: number;
}

/**
 * Aplica el descuento de inventario usando el algoritmo FEFO (First Expired, First Out)
 * con control de concurrencia atómico (OCC).
 * 
 * @param params Parámetros de ejecución
 * @returns Array con el detalle de los consumos realizados por lote
 * @throws Error si ocurre un faltante de inventario durante el procesamiento
 */
export async function applyFefoDiscount({ tx, tenantId, branchId, productId, quantityRequired }: FefoDiscountParams): Promise<FefoDiscountResult[]> {
  // 1. Obtener los lotes de la sucursal ordenados por fecha de expiración
  // Se aplica bloqueo explícito o implícito por el update posterior.
  const activeBatches = await tx.inventoryBatch.findMany({
    where: {
      tenantId,
      branchId,
      productId,
      quantity: { gt: 0 }
    },
    orderBy: {
      expirationDate: 'asc' // FEFO: Los que caducan primero salen primero
    }
  });

  let remainingQty = quantityRequired;
  const saleItemFragments: FefoDiscountResult[] = [];

  // 2. Descuento en Cascada
  for (const batch of activeBatches) {
    if (remainingQty <= 0) break;

    const qtyToTakeFromBatch = Math.min(batch.quantity, remainingQty);

    try {
      // 3. Decremento Atómico Optimista (OCC)
      // Se exige que la cantidad actual en BD sea mayor o igual a lo que intentamos quitar.
      // Prisma.Transaction asegurará que si esto falla, se revierta todo el proceso.
      await tx.inventoryBatch.update({
        where: {
          id: batch.id,
          // Condición de seguridad (Check and Set / OCC)
          quantity: { gte: qtyToTakeFromBatch }
        },
        data: {
          quantity: { decrement: qtyToTakeFromBatch }
        }
      });
      
      saleItemFragments.push({
        productId: batch.productId,
        batchId: batch.id,
        quantity: qtyToTakeFromBatch,
      });

      remainingQty -= qtyToTakeFromBatch;

    } catch (error: any) {
      // Si otro hilo vació este lote exacto milisegundos antes,
      // Prisma lanzará un error RecordNotFound por no cumplir la condición quantity: { gte... }
      if (error.code === 'P2025') {
         throw new Error(`El lote ${batch.batchNumber} sufrió una alteración concurrente. Transacción abortada.`);
      }
      throw error;
    }
  }

  // 4. Verificación de Completitud
  if (remainingQty > 0) {
    throw new Error(`Stock insuficiente por compra concurrente. Faltan ${remainingQty} unidades para completar la orden.`);
  }

  return saleItemFragments;
}
