import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function seed() {
  console.log("Seeding dependencies...");
  
  // 1. Tenant
  await supabase.from('tenants').upsert({
    id: 't-zefiro-global',
    name: 'Zefiro Pharmacy Group',
    slug: 'zefiro',
    is_active: true
  });

  // 2. Branch
  await supabase.from('branches').upsert({
    id: 'b-01',
    tenant_id: 't-zefiro-global',
    name: 'Sucursal Centro',
    code: 'SC-01',
    is_active: true
  });

  // 3. Mock User
  await supabase.from('users').upsert({
    id: 'mock-user-id',
    tenant_id: 't-zefiro-global',
    email: 'mock@zefiro.com',
    password_hash: 'none',
    name: 'Mock User',
    role: 'CASHIER',
    is_active: true
  });

  console.log("Seeding complete. Foreign keys are satisfied.");
}

seed().catch(console.error);
