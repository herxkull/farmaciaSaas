import { supabase } from './supabase';
import type { BranchInfo, SettingUser } from '../stores/branchStore';

async function getTenantId(overrideTenantId?: string) {
  if (overrideTenantId) return overrideTenantId;
  const { useBranchStore } = await import('../stores/branchStore');
  return useBranchStore.getState().user?.tenantId;
}

export async function fetchBranchesFromSupabase(tenantId?: string): Promise<BranchInfo[]> {
  const tId = await getTenantId(tenantId);
  if (!tId) return [];

  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('tenant_id', tId);

  if (error || !data) return [];

  return data.map((b: any) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    isActive: b.is_active,
    city: 'Local',
    address: b.address || '',
    phone: b.phone || '',
    manager: 'Admin',
    activeShifts: 0,
    healthStatus: 'optimal',
    sales: 'C$0',
    coverage: '100%',
    connectivity: 'online',
    pendingTransfers: 0,
    coordinates: { x: 50, y: 50 },
    config: {
      allowManualDiscount: true,
      requirePrescriptionCapture: false,
      taxPercentage: 15,
      currency: 'NIO'
    }
  }));
}

export async function fetchUsersFromSupabase(tenantId?: string): Promise<SettingUser[]> {
  const tId = await getTenantId(tenantId);
  if (!tId) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*, defaultBranch:branches(*)')
    .eq('tenant_id', tId);

  if (error || !data) return [];

  return data.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    password: u.password_hash,
    role: u.role,
    roleLabel: u.role === 'SUPER_ADMIN' || u.role === 'TENANT_OWNER' ? 'Propietario' : u.role === 'CASHIER' ? 'Cajero' : u.role,
    branch: u.defaultBranch ? u.defaultBranch.name : 'Todas (Corporativo)',
    status: u.is_active ? 'active' : 'suspended',
    lastAccess: 'N/A',
    color: 'indigo',
    permissions: { processSale: true, applyDiscount: true, voidInvoice: true, adjustStock: true, purchaseOrder: true }
  }));
}

export async function syncUserToSupabase(user: SettingUser, defaultBranchId?: string, tenantId?: string) {
  const tId = await getTenantId(tenantId);
  if (!tId) throw new Error('No tenant ID available to sync user');

  const roleMap: Record<string, string> = {
    'Propietario': 'TENANT_OWNER',
    'Cajero': 'CASHIER',
    'Químico Regente': 'PHARMACIST'
  };

  const now = new Date().toISOString();
  
  const { error: tError } = await supabase.from('tenants').upsert({ 
    id: tId, 
    name: 'Zefiro Global', 
    slug: `zefiro-${tId}`,
    updated_at: now
  });
  if (tError) throw new Error('Error al crear tenant: ' + tError.message);

  const { error: uError } = await supabase.from('users').upsert({
    id: user.id,
    tenant_id: tId,
    email: user.email,
    password_hash: user.password || '123456',
    name: user.name,
    role: roleMap[user.roleLabel] || 'CASHIER',
    is_active: user.status === 'active',
    default_branch_id: defaultBranchId || null,
    updated_at: now
  });
  if (uError) throw new Error('Error al crear usuario en BD: ' + uError.message);
}

export async function syncBranchToSupabase(branch: BranchInfo, tenantId?: string) {
  const tId = await getTenantId(tenantId);
  if (!tId) throw new Error('No tenant ID available to sync branch');

  const now = new Date().toISOString();

  await supabase.from('tenants').upsert({ 
    id: tId, 
    name: 'Zefiro Global', 
    slug: `zefiro-${tId}`,
    updated_at: now
  });

  await supabase.from('branches').upsert({
    id: branch.id,
    tenant_id: tId,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    phone: branch.phone,
    is_active: branch.isActive,
    updated_at: now
  });
}

export async function deleteUserFromSupabase(userId: string) {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw new Error('Error al eliminar usuario en BD: ' + error.message);
}
