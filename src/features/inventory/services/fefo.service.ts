/**
 * Representa la asignación de un lote a una línea de venta
 */
export interface FEFOAllocation {
  batchId: string;
  batchNumber: string;
  expirationDate: Date;
  quantityAllocated: number;
}

/**
 * Estructura del inventario por lote retornado de la base de datos
 */
export interface BranchBatchInventoryItem {
  batchId: string;
  quantity: number; // Stock disponible físico
  batch: {
    batchNumber: string;
    expirationDate: Date;
    costPrice: number;
  };
}

/**
 * Servicio de Gestión de Inventario Avanzado
 */
export class InventoryFEFOService {
  
  /**
   * Implementa la lógica FEFO (First Expired, First Out) empresarial.
   * Dado un producto y una cantidad solicitada en una sucursal específica,
   * distribuye automáticamente las unidades descontando de los lotes más próximos a vencer.
   * 
   * @param branchBatches Listado de inventarios por lote en la sucursal (típicamente recuperado vía Prisma)
   * @param requestedQty Cantidad total requerida por el cliente en la terminal POS
   * @returns Un arreglo de distribuciones por lote (FEFOAllocation[])
   * @throws Error si el stock total de todos los lotes es insuficiente.
   */
  public static calculateFEFOAllocation(
    branchBatches: BranchBatchInventoryItem[],
    requestedQty: number
  ): FEFOAllocation[] {
    
    if (requestedQty <= 0) {
      throw new Error("La cantidad solicitada debe ser mayor a cero.");
    }

    // 1. Validar inventario y filtrar lotes con stock > 0 y no caducados (regla sanitaria)
    const today = new Date();
    const validBatches = branchBatches
      .filter(item => item.quantity > 0)
      .filter(item => item.batch.expirationDate > today); // Excluir caducados por seguridad clínica

    // 2. ALGORITMO CORE: Ordenar estrictamente por FEFO (Fecha de Vencimiento ascendente)
    const sortedBatches = [...validBatches].sort((a, b) => {
      return a.batch.expirationDate.getTime() - b.batch.expirationDate.getTime();
    });

    // 3. Validar existencia total acumulada antes de procesar
    const totalAvailableStock = sortedBatches.reduce((acc, item) => acc + item.quantity, 0);
    if (totalAvailableStock < requestedQty) {
      throw new Error(
        `Existencias insuficientes en sucursal. Solicitado: ${requestedQty}, Disponible: ${totalAvailableStock}`
      );
    }

    // 4. Distribución de cantidades
    let remainingToAllocate = requestedQty;
    const allocations: FEFOAllocation[] = [];

    for (const item of sortedBatches) {
      if (remainingToAllocate <= 0) break;

      const amountFromThisBatch = Math.min(item.quantity, remainingToAllocate);
      
      allocations.push({
        batchId: item.batchId,
        batchNumber: item.batch.batchNumber,
        expirationDate: item.batch.expirationDate,
        quantityAllocated: amountFromThisBatch
      });

      remainingToAllocate -= amountFromThisBatch;
    }

    return allocations;
  }

  /**
   * EJEMPLO CONCEPTUAL DE INTEGRACIÓN CON PRISMA TRANSACTIONS:
   * Demuestra cómo aplicar esta lógica directamente en el backend.
   * 
   * async processFefoReduction(prisma: PrismaClient, tx: PrismaTransaction, data: { productId: string, branchId: string, qty: number }) {
   *    // 1. Bloquear registros (Row Lock) para evitar condiciones de carrera (Race Conditions)
   *    const dbBatches = await tx.branchBatchInventory.findMany({
   *       where: { branchId: data.branchId, batch: { productId: data.productId } },
   *       include: { batch: true },
   *    });
   * 
   *    // 2. Calcular distribución FEFO
   *    const allocations = this.calculateFEFOAllocation(dbBatches, data.qty);
   * 
   *    // 3. Ejecutar actualizaciones secuenciales en BD
   *    for (const alloc of allocations) {
   *       await tx.branchBatchInventory.update({
   *          where: { branchId_batchId: { branchId: data.branchId, batchId: alloc.batchId } },
   *          data: { quantity: { decrement: alloc.quantityAllocated } }
   *       });
   *    }
   *    return allocations;
   * }
   */
}
