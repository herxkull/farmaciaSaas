import { supabase } from '../lib/supabase';
import type { InventoryProduct, Batch } from './inventoryStore';

async function getTenantId(overrideTenantId?: string) {
  if (overrideTenantId) return overrideTenantId;
  const { useBranchStore } = await import('../stores/branchStore');
  return useBranchStore.getState().user?.tenantId;
}

/**
 * Fetch all products + batches for a given branch from Supabase.
 * Products are stored in `products` (master catalogue).
 * Stock is stored in `inventory_batches` (per branch).
 *
 * We join them client-side to match the InventoryProduct shape.
 */
export async function fetchInventoryFromSupabase(branchId: string, branchName?: string, tenantId?: string): Promise<InventoryProduct[]> {
  const tId = await getTenantId(tenantId);
  if (!tId) return [];

  // 1. Fetch all batches for this branch (try by branchId first, then branchName)
  let { data: batches, error: batchError } = await supabase
    .from('inventory_batches')
    .select('*, product:products(*)')
    .eq('branch_id', branchId);

  // Fallback: search by branch_id stored as branch name (cross-session issue)
  if ((!batches || batches.length === 0) && branchName) {
    const shortName = branchName.replace(/^Sucursal\s+/i, '').trim();
    const result = await supabase
      .from('inventory_batches')
      .select('*, product:products(*)')
      .ilike('branch_id', `%${shortName}%`);
    batches = result.data;
    batchError = result.error;
  }

  if (batchError || !batches || batches.length === 0) return [];

  // 2. Group batches by product
  const productMap = new Map<string, InventoryProduct>();

  for (const batch of batches) {
    const p = batch.product;
    if (!p) continue;

    const batchObj: Batch = {
      id: batch.id,
      batchNumber: batch.batch_number,
      expirationDate: batch.expiration_date?.split('T')[0] || '',
      quantity: batch.quantity
    };

    if (productMap.has(p.id)) {
      const existing = productMap.get(p.id)!;
      existing.batches.push(batchObj);
      existing.stockTotal += batch.quantity;
    } else {
      productMap.set(p.id, {
        id: p.id,
        name: p.name,
        activeIngredient: p.active_ingredient || '',
        barcode: p.barcode || '',
        sku: p.sku || '',
        salePrice: parseFloat(p.sale_price),
        taxRate: parseFloat(p.tax_rate || '0'),
        stockTotal: batch.quantity,
        isControlled: p.is_controlled || false,
        category: p.category || 'General',
        batches: [batchObj],
        soldTotal: 0,
        hasFractions: p.has_fractions || false,
        unitsPerBox: p.units_per_box || undefined,
        unitPrice: p.unit_price ? parseFloat(p.unit_price) : undefined
      });
    }
  }

  return Array.from(productMap.values());
}

/**
 * Record a sale in Supabase using atomic RPC to prevent race conditions.
 */
export async function recordSaleInSupabase(sale: {
  branchId: string;
  userId: string;
  cashShiftId: string;
  customerId?: string;
  subtotal: number;
  taxes: number;
  discount: number;
  total: number;
  items: Array<{
    productId: string;
    batchId: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    subtotal: number;
  }>;
}): Promise<string | null> {
  const tId = await getTenantId();
  if (!tId) return null;

  const saleId = 'SALE-' + Math.floor(100000 + Math.random() * 900000);

  const { error } = await supabase.rpc('process_sale', {
    p_sale_id: saleId,
    p_tenant_id: tId,
    p_branch_id: sale.branchId,
    p_user_id: sale.userId,
    p_shift_id: sale.cashShiftId,
    p_customer_id: sale.customerId || null,
    p_subtotal: sale.subtotal,
    p_taxes: sale.taxes,
    p_discount: sale.discount,
    p_total: sale.total,
    p_items: sale.items
  });

  if (error) {
    console.error('Error recording sale via RPC:', error);
    return null;
  }

  return saleId;
}
