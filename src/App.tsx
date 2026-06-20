import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Fase 1: Acceso y Onboarding
import AuthView from './features/auth/views/AuthView';
import TenantSetup from './features/onboarding/views/TenantSetup';

// Fase 2: Operativa Core
import DashboardScreen from './features/dashboard/views/DashboardScreen';
import POSTerminal from './features/pos/views/POSTerminal';
import InventoryScreen from './features/inventory/views/InventoryScreen';

// Fase 3: Gestión
import ReportsScreen from './features/reports/views/ReportsScreen';
import BranchListScreen from './features/branches/views/BranchListScreen';
import SettingsScreen from './features/settings/views/SettingsScreen';
import CustomersScreen from './features/customers/views/CustomersScreen';

import React, { useEffect } from 'react';
import { useBranchStore } from './stores/branchStore';
import { useTransactionStore } from './stores/transactionStore';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user } = useBranchStore();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirigir según rol
    if (user.role === 'CASHIER' || user.role === 'PHARMACIST') {
      return <Navigate to="/app/pos" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

function App() {
  const fetchCloudData = useBranchStore(state => state.fetchCloudData);
  const fetchTransactionsFromSupabase = useTransactionStore(state => state.fetchTransactionsFromSupabase);

  useEffect(() => {
    fetchCloudData().catch(console.error);
    fetchTransactionsFromSupabase().catch(console.error);
  }, [fetchCloudData, fetchTransactionsFromSupabase]);

  return (
    <BrowserRouter>
      <Routes>
        {/* RUTAS PÚBLICAS (Acceso y Onboarding) */}
        <Route path="/login" element={<AuthView />} />
        <Route path="/setup" element={<TenantSetup />} />

        {/* RUTAS INTERNAS PROTEGIDAS (Dashboard y Módulos) */}
        <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<ProtectedRoute allowedRoles={['TENANT_OWNER', 'OWNER', 'SUPER_ADMIN', 'BRANCH_MANAGER']}><DashboardScreen /></ProtectedRoute>} />
          <Route path="pos" element={<POSTerminal />} />
          <Route path="inventory" element={<ProtectedRoute allowedRoles={['TENANT_OWNER', 'OWNER', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'PHARMACIST']}><InventoryScreen /></ProtectedRoute>} />
          <Route path="customers" element={<CustomersScreen />} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={['TENANT_OWNER', 'OWNER', 'SUPER_ADMIN', 'BRANCH_MANAGER']}><ReportsScreen /></ProtectedRoute>} />
          <Route path="branches" element={<ProtectedRoute allowedRoles={['TENANT_OWNER', 'OWNER', 'SUPER_ADMIN', 'BRANCH_MANAGER']}><BranchListScreen /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute allowedRoles={['TENANT_OWNER', 'OWNER', 'SUPER_ADMIN']}><SettingsScreen /></ProtectedRoute>} />
        </Route>

        {/* REDIRECCIÓN PREDETERMINADA */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
