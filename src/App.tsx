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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTAS PÚBLICAS (Acceso y Onboarding) */}
        <Route path="/login" element={<AuthView />} />
        <Route path="/setup" element={<TenantSetup />} />

        {/* RUTAS INTERNAS PROTEGIDAS (Dashboard y Módulos) */}
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<DashboardScreen />} />
          <Route path="pos" element={<POSTerminal />} />
          <Route path="inventory" element={<InventoryScreen />} />
          <Route path="customers" element={<CustomersScreen />} />
          <Route path="reports" element={<ReportsScreen />} />
          <Route path="branches" element={<BranchListScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>

        {/* REDIRECCIÓN PREDETERMINADA */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
