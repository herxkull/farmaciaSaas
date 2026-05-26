import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'OWNER' | 'SUPER_ADMIN' | 'EMPLOYEE' | 'CASHIER' | 'PHARMACIST' | 'BRANCH_MANAGER';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  tenantId: string;
  assignedBranchId?: string; // Para personal operativo (relación 1-a-1)
}

export interface SettingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  branch: string;
  status: 'active' | 'suspended';
  lastAccess: string;
  color: string;
  password?: string;
  permissions: {
    processSale: boolean;
    applyDiscount: boolean;
    voidInvoice: boolean;
    adjustStock: boolean;
    purchaseOrder: boolean;
  };
}

export interface BranchConfig {
  allowManualDiscount: boolean;
  requirePrescriptionCapture: boolean;
  taxPercentage: number;
  currency: string;
}

export interface BranchInfo {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  config: BranchConfig;
  city?: string;
  address?: string;
  phone?: string;
  manager?: string;
  activeShifts?: number;
  healthStatus?: 'optimal' | 'warning' | 'critical';
  sales?: string;
  coverage?: string;
  connectivity?: 'online' | 'offline';
  lastSeen?: string;
  pendingTransfers?: number;
  coordinates?: { x: number; y: number };
}

interface BranchState {
  // Data
  user: AuthUser | null;
  activeBranch: BranchInfo | null;
  availableBranches: BranchInfo[];
  users: SettingUser[];

  // Actions
  login: (user: AuthUser) => void;
  logout: () => void;
  setActiveBranch: (branch: BranchInfo | null) => void;
  switchBranchById: (id: string) => void;
  setAvailableBranches: (branches: BranchInfo[]) => void;
  clearBranchContext: () => void;
  canSwitchBranch: () => boolean;
  addBranch: (branch: BranchInfo) => void;
  setUsers: (users: SettingUser[] | ((prev: SettingUser[]) => SettingUser[])) => void;
  
  tenantConfig: { chainName: string; rfc: string; receiptHeader: string; };
  setTenantConfig: (config: Partial<{chainName: string; rfc: string; receiptHeader: string;}>) => void;
}

// Mock de sucursales del sistema
const DEFAULT_BRANCHES: BranchInfo[] = [
  {
    id: 'b-01',
    name: 'Sucursal Centro',
    code: 'SC-01',
    isActive: true,
    config: {
      allowManualDiscount: true,
      requirePrescriptionCapture: true,
      taxPercentage: 15,
      currency: 'NIO',
    },
    city: 'Managua',
    address: 'Av. Hidalgo #450, Col. Centro',
    phone: '555-123-4567',
    manager: 'Elena Rostova',
    activeShifts: 2,
    healthStatus: 'optimal',
    sales: 'C$85,200',
    coverage: '98%',
    connectivity: 'online',
    pendingTransfers: 3,
    coordinates: { x: 35, y: 45 }
  },
  {
    id: 'b-02',
    name: 'Sucursal Norte',
    code: 'SN-02',
    isActive: true,
    config: {
      allowManualDiscount: false,
      requirePrescriptionCapture: true,
      taxPercentage: 15,
      currency: 'NIO',
    },
    city: 'León',
    phone: '555-987-6543',
    manager: 'Juan Pérez',
    activeShifts: 1,
    healthStatus: 'warning',
    sales: 'C$42,300',
    coverage: '85%',
    connectivity: 'online',
    pendingTransfers: 0,
    coordinates: { x: 55, y: 25 }
  },
  {
    id: 'b-03',
    name: 'Sucursal Poniente',
    code: 'b-03',
    isActive: true,
    config: {
      allowManualDiscount: true,
      requirePrescriptionCapture: false,
      taxPercentage: 15,
      currency: 'NIO',
    },
    city: 'Granada',
    address: 'Av. Constituyentes #890',
    phone: '555-223-4455',
    manager: 'Carlos Gómez',
    activeShifts: 2,
    healthStatus: 'critical',
    sales: 'C$68,400',
    coverage: '68%',
    connectivity: 'offline',
    lastSeen: 'Hace 2 horas',
    pendingTransfers: 5,
    coordinates: { x: 20, y: 55 }
  },
  {
    id: 'b-04',
    name: 'Sucursal Oriente',
    code: 'SO-04',
    isActive: true,
    config: {
      allowManualDiscount: true,
      requirePrescriptionCapture: true,
      taxPercentage: 15,
      currency: 'NIO',
    },
    city: 'Estelí',
    address: 'Calzada Ignacio Zaragoza #1102',
    phone: '555-334-5566',
    manager: 'Ana Martínez',
    activeShifts: 1,
    healthStatus: 'optimal',
    sales: 'C$54,100',
    coverage: '95%',
    connectivity: 'online',
    pendingTransfers: 1,
    coordinates: { x: 68, y: 65 }
  },
  {
    id: 'b-05',
    name: 'Sucursal Sur',
    code: 'SS-05',
    isActive: true,
    config: {
      allowManualDiscount: true,
      requirePrescriptionCapture: true,
      taxPercentage: 15,
      currency: 'NIO',
    },
    city: 'Managua',
    address: 'Av. División del Norte #2311',
    phone: '555-445-6677',
    manager: 'Sofía López',
    activeShifts: 0,
    healthStatus: 'optimal',
    sales: 'C$91,800',
    coverage: '99%',
    connectivity: 'online',
    pendingTransfers: 0,
    coordinates: { x: 42, y: 78 }
  }
];

const DEFAULT_USERS: SettingUser[] = [];

/**
 * Branch Store (Zustand + Persist)
 * Centraliza la sesión del usuario (AuthUser), sucursales disponibles
 * y el contexto de auditoría espacial (activeBranch).
 */
export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      user: null,
      activeBranch: DEFAULT_BRANCHES[0], // Por defecto
      availableBranches: DEFAULT_BRANCHES,
      users: DEFAULT_USERS,
      
      tenantConfig: {
        chainName: 'Zefiro Pharmacy Group S.A. de C.V.',
        rfc: 'ZPG202605XYZ',
        receiptHeader: 'Zefiro Pharmacies - Salud Cerca de Ti'
      },

      login: (user) => set({ user }),
      
      logout: () => set({ user: null, activeBranch: null }),

      setTenantConfig: (config) => set((state) => ({
        tenantConfig: { ...state.tenantConfig, ...config }
      })),

      setActiveBranch: (branch) => set({ activeBranch: branch }),

      switchBranchById: (id) => {
        // Bloqueo de seguridad a nivel de store
        if (!get().canSwitchBranch()) {
          console.error('[RBAC Violation] Access Denied. Operative users cannot switch branches.');
          return;
        }

        const found = get().availableBranches.find(b => b.id === id);
        if (!found) return;
        
        console.info(`[Zefiro Security] Hot-switched to Branch ID: ${id}`);
        set({ activeBranch: found });
      },

      setAvailableBranches: (branches) => set({ availableBranches: branches }),

      addBranch: (branch) => set((state) => ({ 
        availableBranches: [...state.availableBranches, branch] 
      })),

      clearBranchContext: () => set({ activeBranch: null }),

      /**
       * canSwitchBranch
       * Retorna true únicamente si el rol es administrativo (OWNER, SUPER_ADMIN)
       */
      canSwitchBranch: () => {
        const role = get().user?.role;
        return role === 'OWNER' || role === 'SUPER_ADMIN';
      },

      setUsers: (users) => set((state) => ({
        users: typeof users === 'function' ? users(state.users) : users
      }))
    }),
    {
      name: 'zefiro-branch-storage',
      // Excluimos funciones no serializables del guardado local
      partialize: (state) => ({
        user: state.user,
        activeBranch: state.activeBranch,
        availableBranches: state.availableBranches,
        users: state.users,
        tenantConfig: state.tenantConfig,
      }),
    }
  )
);
