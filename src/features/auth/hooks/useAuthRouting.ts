import { useNavigate } from 'react-router-dom';
import { useBranchStore } from '../../../stores/branchStore';
import type { AuthUser } from '../../../stores/branchStore';

/**
 * Hook: useAuthRouting
 * Gobierna las reglas de redirección post-login basadas en RBAC corporativo.
 */
export function useAuthRouting() {
  const navigate = useNavigate();
  const { login, setActiveBranch, availableBranches } = useBranchStore();

  const handleLoginRedirect = (user: AuthUser) => {
    // 1. Guardar la sesión de usuario en el Store Global
    login(user);

    // 2. Ejecutar bifurcación de roles (RBAC Flow)
    const isAdministrative = user.role === 'OWNER' || user.role === 'SUPER_ADMIN';

    if (isAdministrative) {
      // CASO A: Administrador -> Redirigir al selector de sucursales para auditoría
      // (En la SPA se maneja cambiando el step a 'branch_select')
      console.info(`[RBAC Route] Administrative user ${user.name} logged in. Awaiting branch selection.`);
      return 'branch_select';
    } else {
      // CASO B: Operativo (Cajero/Empleado) -> Relación 1-a-1 con sucursal
      const assignedId = user.assignedBranchId || 'b-01';
      const branchToBind = availableBranches.find(b => b.id === assignedId) || null;

      // Inyectar sucursal asignada de forma obligatoria en el store
      setActiveBranch(branchToBind);
      
      console.info(`[RBAC Route] Operative user ${user.name} logged in. Skips selector. Bound to: ${branchToBind?.name}`);
      
      // Redirección forzada e inmediata a la terminal de ventas (POS)
      navigate('/app/pos');
      return 'direct_redirect';
    }
  };

  return { handleLoginRedirect };
}
