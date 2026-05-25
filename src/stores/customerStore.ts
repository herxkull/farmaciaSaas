import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addCustomer: (customer: Partial<Customer> & { name: string }) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
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

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: INITIAL_CUSTOMERS,

      addCustomer: (customerData) => {
        const newCustomer: Customer = {
          id: `CLI-${Math.floor(Math.random() * 9000) + 1000}`,
          name: customerData.name,
          phone: customerData.phone || '',
          email: customerData.email || '',
          loyaltyTier: customerData.loyaltyTier || 'Bronce',
          points: customerData.points || 0,
          ltv: customerData.ltv || 0.00,
          lastVisit: customerData.lastVisit || 'Hoy (Registro)',
          status: customerData.status || 'active',
          taxName: customerData.taxName || customerData.name,
          taxId: customerData.taxId || '',
          taxRegime: customerData.taxRegime || '605 - Sueldos y Salarios',
          address: customerData.address || '',
          city: customerData.city || 'CDMX',
          creditLimit: customerData.creditLimit || 0,
          pendingBalance: customerData.pendingBalance || 0,
          purchases: customerData.purchases || [],
          idNumber: customerData.idNumber || '',
        };

        set((state) => ({
          customers: [newCustomer, ...state.customers]
        }));
        
        return newCustomer;
      },

      updateCustomer: (id, data) => {
        set((state) => ({
          customers: state.customers.map(c => 
            c.id === id ? { ...c, ...data } : c
          )
        }));
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter(c => c.id !== id)
        }));
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
    }),
    {
      name: 'zefiro-customers-storage',
    }
  )
);
