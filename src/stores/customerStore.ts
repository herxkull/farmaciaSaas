import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useBranchStore } from './branchStore';

export interface CustomerPurchase {
  ticketId: string;
  date: string;
  branch: string;
  total: number;
  itemsSummary: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string; // Keep as string, can be empty
  email: string; // Keep as string, can be empty
  loyaltyTier: 'VIP' | 'Oro' | 'Plata' | 'Bronce';
  points: number;
  ltv: number;
  lastVisit: string;
  status: 'active' | 'inactive';
  taxName?: string;
  taxId?: string;
  taxRegime?: string;
  address?: string;
  city?: string;
  creditLimit: number;
  pendingBalance: number;
  purchases: CustomerPurchase[];
  idNumber?: string; // Mantenido para compatibilidad con el modal del POS
}

interface CustomerState {
  customers: Customer[];
  
  // Actions
  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Partial<Customer> & { name: string }) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  searchCustomers: (query: string) => Customer[];
  clearCustomers: () => void;
}

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'CLI-8801',
    name: 'Carlos Slim Domit',
    phone: '555-492-3011',
    email: 'cslim@grupo-carso.com.mx',
    loyaltyTier: 'VIP',
    points: 4850,
    ltv: 185400.00,
    lastVisit: 'Hoy, 10:12 AM',
    status: 'active',
    taxName: 'Grupo Carso S.A.B. de C.V.',
    taxId: 'GCA9208223B2',
    taxRegime: '601 - General de Ley Personas Morales',
    address: 'Av. Paseo de las Palmas #736, Lomas de Chapultepec',
    city: 'CDMX',
    creditLimit: 200000.00,
    pendingBalance: 42500.00,
    purchases: [
      { ticketId: 'TX-99012', date: '2026-05-18 10:12', branch: 'Sucursal Centro', total: 1250.00, itemsSummary: '1x Insulina Glargina, 2x Jeringas 1ml' },
      { ticketId: 'TX-98401', date: '2026-05-10 14:22', branch: 'Sucursal Centro', total: 24500.00, itemsSummary: '1x Medicamento de alta especialidad refrig.' },
      { ticketId: 'TX-97810', date: '2026-05-02 09:05', branch: 'Sucursal Centro', total: 3400.00, itemsSummary: '3x Ciprofloxacino 500mg, 1x Multivitamínico' }
    ]
  },
  {
    id: 'CLI-3024',
    name: 'Ana Gabriela Guevara',
    phone: '555-102-4955',
    email: 'aguevara@conade.gob.mx',
    loyaltyTier: 'Oro',
    points: 1250,
    ltv: 24850.50,
    lastVisit: 'Ayer, 04:30 PM',
    status: 'active',
    taxName: 'Ana Gabriela Guevara Espinoza',
    taxId: 'GUEA770304HP9',
    taxRegime: '605 - Sueldos y Salarios',
    address: 'Camino a Santa Teresa #482, Col. Peña Pobre',
    city: 'CDMX',
    creditLimit: 50000.00,
    pendingBalance: 18200.00,
    purchases: [
      { ticketId: 'TX-99017', date: '2026-05-17 16:30', branch: 'Sucursal Sur', total: 450.00, itemsSummary: '2x Suplemento Alimenticio Whey, 1x Shaker' },
      { ticketId: 'TX-98112', date: '2026-05-05 11:15', branch: 'Sucursal Norte', total: 8900.00, itemsSummary: '1x Tratamiento Regenerativo Articular' }
    ]
  },
  {
    id: 'CLI-0001',
    name: 'Ing. Hersan Hernandez',
    phone: '555-123-4567',
    email: 'hhernandez@zefiro.com',
    loyaltyTier: 'VIP',
    points: 3200,
    ltv: 92400.00,
    lastVisit: '15 de Mayo, 11:20 AM',
    status: 'active',
    taxName: 'Hersan Hernandez Posadas',
    taxId: 'HEPH880214ABC',
    taxRegime: '612 - Personas Físicas con Actividades Empresariales',
    address: 'Av. Insurgentes Sur #1602, Col. San Ángel',
    city: 'CDMX',
    creditLimit: 100000.00,
    pendingBalance: 0.00,
    purchases: [
      { ticketId: 'TX-99014', date: '2026-05-15 11:20', branch: 'Sucursal Centro', total: 420.50, itemsSummary: '1x Clonazepam 2mg (Receta Retenida)' },
      { ticketId: 'TX-98502', date: '2026-05-11 15:45', branch: 'Sucursal Sur', total: 950.00, itemsSummary: '2x Complejo B Forte, 1x Termómetro Infrarrojo' }
    ]
  },
  {
    id: 'CLI-4022',
    name: 'Beatriz Gutiérrez Müller',
    phone: '555-998-1122',
    email: 'bgutierrez@conahcyt.mx',
    loyaltyTier: 'Plata',
    points: 850,
    ltv: 15300.00,
    lastVisit: '12 de Mayo, 03:40 PM',
    status: 'active',
    taxName: 'Beatriz Gutiérrez Müller',
    taxId: 'GUMB690113XYZ',
    taxRegime: '605 - Sueldos y Salarios',
    address: 'Calle Pino Suárez #30, Centro Histórico',
    city: 'CDMX',
    creditLimit: 0.00,
    pendingBalance: 0.00,
    purchases: [
      { ticketId: 'TX-98601', date: '2026-05-12 15:40', branch: 'Sucursal Oriente', total: 1200.00, itemsSummary: '2x Ibuprofeno 400mg, 1x Antihistamínico Loratadina' }
    ]
  }
];

export const useCustomerStore = create<CustomerState>()((set, get) => ({
  customers: [],

  fetchCustomers: async () => {
    const tenantId = useBranchStore.getState().user?.tenantId;
    if (!tenantId) return;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const parsed = data.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        loyaltyTier: (c.loyalty_tier as any) || 'Bronce',
        points: c.loyalty_points || 0,
        ltv: parseFloat(c.ltv || 0),
        lastVisit: c.last_visit || '',
        status: (c.status as any) || 'active',
        taxName: c.tax_name || '',
        taxId: c.tax_id || '',
        taxRegime: c.tax_regime || '',
        address: c.address || '',
        city: c.city || '',
        creditLimit: parseFloat(c.credit_limit || 0),
        pendingBalance: parseFloat(c.pending_balance || 0),
        idNumber: c.id_number || '',
        purchases: [] // we can join purchases later if needed
      }));
      set({ customers: parsed });
    }
  },

  addCustomer: async (customerData) => {
    const tenantId = useBranchStore.getState().user?.tenantId;
    if (!tenantId) throw new Error('No session');
    const customerId = `CLI-${Math.floor(Math.random() * 9000) + 1000}`;
    const now = new Date().toISOString();
    
    if (customerData.phone) {
      if (!/^\d{8}$/.test(customerData.phone)) {
        throw new Error('El número de teléfono debe tener exactamente 8 dígitos.');
      }
      const existingPhone = get().customers.find(c => c.phone === customerData.phone);
      if (existingPhone) {
        throw new Error('Este número de teléfono ya está registrado.');
      }
    }

    if (customerData.idNumber) {
      const existingId = get().customers.find(c => c.idNumber === customerData.idNumber);
      if (existingId) {
        throw new Error('Esta cédula ya está registrada.');
      }
    }

    // Convert to DB snake_case
    const dbPayload = {
      id: customerId,
      tenant_id: tenantId,
      name: customerData.name,
      phone: customerData.phone || '',
      email: customerData.email || '',
      loyalty_tier: customerData.loyaltyTier || 'Bronce',
      loyalty_points: customerData.points || 0,
      ltv: customerData.ltv || 0.00,
      last_visit: customerData.lastVisit || 'Hoy (Registro)',
      status: customerData.status || 'active',
      tax_name: customerData.taxName || customerData.name,
      tax_id: customerData.taxId || '',
      tax_regime: customerData.taxRegime || '605 - Sueldos y Salarios',
      address: customerData.address || '',
      city: customerData.city || 'CDMX',
      credit_limit: customerData.creditLimit || 0,
      pending_balance: customerData.pendingBalance || 0,
      id_number: customerData.idNumber || '',
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      throw error;
    }

    const newCustomer: Customer = {
      id: data.id,
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      loyaltyTier: data.loyalty_tier as any,
      points: data.loyalty_points || 0,
      ltv: parseFloat(data.ltv || 0),
      lastVisit: data.last_visit || '',
      status: data.status as any,
      taxName: data.tax_name || '',
      taxId: data.tax_id || '',
      taxRegime: data.tax_regime || '',
      address: data.address || '',
      city: data.city || '',
      creditLimit: parseFloat(data.credit_limit || 0),
      pendingBalance: parseFloat(data.pending_balance || 0),
      idNumber: data.id_number || '',
      purchases: [],
    };

    set((state) => ({
      customers: [newCustomer, ...state.customers]
    }));
    
    return newCustomer;
  },

  updateCustomer: async (id, data) => {
    if (data.phone !== undefined && data.phone !== '') {
      if (!/^\d{8}$/.test(data.phone)) {
        throw new Error('El número de teléfono debe tener exactamente 8 dígitos.');
      }
      const existingPhone = get().customers.find(c => c.phone === data.phone && c.id !== id);
      if (existingPhone) {
        throw new Error('Este número de teléfono ya está registrado.');
      }
    }

    if (data.idNumber !== undefined && data.idNumber !== '') {
      const existingId = get().customers.find(c => c.idNumber === data.idNumber && c.id !== id);
      if (existingId) {
        throw new Error('Esta cédula ya está registrada.');
      }
    }

    const dbPayload: any = {
      updated_at: new Date().toISOString()
    };
    if (data.name !== undefined) dbPayload.name = data.name;
    if (data.phone !== undefined) dbPayload.phone = data.phone;
    if (data.email !== undefined) dbPayload.email = data.email;
    if (data.loyaltyTier !== undefined) dbPayload.loyalty_tier = data.loyaltyTier;
    if (data.points !== undefined) dbPayload.loyalty_points = data.points;
    if (data.ltv !== undefined) dbPayload.ltv = data.ltv;
    if (data.lastVisit !== undefined) dbPayload.last_visit = data.lastVisit;
    if (data.status !== undefined) dbPayload.status = data.status;
    if (data.taxName !== undefined) dbPayload.tax_name = data.taxName;
    if (data.taxId !== undefined) dbPayload.tax_id = data.taxId;
    if (data.taxRegime !== undefined) dbPayload.tax_regime = data.taxRegime;
    if (data.address !== undefined) dbPayload.address = data.address;
    if (data.city !== undefined) dbPayload.city = data.city;
    if (data.creditLimit !== undefined) dbPayload.credit_limit = data.creditLimit;
    if (data.pendingBalance !== undefined) dbPayload.pending_balance = data.pendingBalance;
    if (data.idNumber !== undefined) dbPayload.id_number = data.idNumber;

    const { error } = await supabase
      .from('customers')
      .update(dbPayload)
      .eq('id', id);

    if (!error) {
      set((state) => ({
        customers: state.customers.map(c => 
          c.id === id ? { ...c, ...data } : c
        )
      }));
    }
  },

  deleteCustomer: async (id) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (!error) {
      set((state) => ({
        customers: state.customers.filter(c => c.id !== id)
      }));
    }
  },

  searchCustomers: (query) => {
    const { customers } = get();
    if (!query.trim()) return customers;
    
    const lowerQuery = query.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      (c.phone && c.phone.includes(lowerQuery)) ||
      (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
      (c.id && c.id.toLowerCase().includes(lowerQuery)) ||
      (c.taxId && c.taxId.toLowerCase().includes(lowerQuery)) ||
      (c.idNumber && c.idNumber.toLowerCase().includes(lowerQuery))
    );
  },

  clearCustomers: () => set({ customers: [] })
}));
