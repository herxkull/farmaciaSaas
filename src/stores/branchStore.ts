import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchBranchesFromSupabase, fetchUsersFromSupabase } from '../lib/supabaseAuth';

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
  
  fetchCloudData: () => Promise<void>;
}

// Mock de sucursales del sistema (vaciado para operar en la nube)
const DEFAULT_BRANCHES: BranchInfo[] = [];

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
      activeBranch: null,
      availableBranches: [],
      users: [],
      
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
        return role !== 'CASHIER' && role !== 'PHARMACIST' && role !== 'BRANCH_MANAGER' && role !== 'EMPLOYEE';
      },

      setUsers: (users) => set((state) => ({
        users: typeof users === 'function' ? users(state.users) : users
      })),

      fetchCloudData: async () => {
        const branches = await fetchBranchesFromSupabase();
        const users = await fetchUsersFromSupabase();
        
        // Verificar si el usuario actual sigue existiendo en Supabase
        const currentUser = get().user;
        if (currentUser && !users.some(u => u.id === currentUser.id || u.email === currentUser.id || u.email === currentUser.name)) {
          console.warn('[Zefiro Security] User session invalid or deleted in cloud. Forcing logout.');
          get().logout();
        }

        set({
          availableBranches: branches,
          users: users
        });
      }
    }),
    {
      name: 'zefiro-branch-storage',
      partialize: (state) => ({
        user: state.user,
        activeBranch: state.activeBranch,
        tenantConfig: state.tenantConfig,
      }),
    }
  )
);
