import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranchStore } from '../../../stores/branchStore';
import { useAuthRouting } from './useAuthRouting';
import type { AuthUser, BranchInfo } from '../../../stores/branchStore';

export type AuthStep = 'credentials' | 'branch_select';

export function useAuthFlow() {
  const navigate = useNavigate();
  const { handleLoginRedirect } = useAuthRouting();
  const setActiveBranch = useBranchStore((state) => state.setActiveBranch);

  const [step, setStep] = useState<AuthStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Guardamos al usuario de forma temporal para el paso 2 (sólo para administradores)
  const [tempUser, setTempUser] = useState<AuthUser | null>(null);

  // Lista de sucursales disponibles en el sistema (mapeadas desde el store)
  const availableBranches = useBranchStore((state) => state.availableBranches);

  /**
   * Paso 1: Autenticación inicial.
   * Valida credenciales e invoca al router condicional de roles.
   */
  const handleLoginSubmit = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!password) throw new Error('Contraseña requerida');
      
      // SIMULACIÓN DE API CALL
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 1. CONDICIONAL B: Usuario Nuevo -> Redirigir al Wizard de Onboarding
      if (email === 'nuevo@zefiro.com') {
        navigate('/setup');
        return;
      }

      // 2. CONDICIONAL A: Usuario Existente (Cajero Operativo vs Admin)
      let mockUser: AuthUser;

      if (email === 'cajero@zefiropharmacy.com') {
        // CASO OPERATIVO: Cajero amarrado a Sucursal Norte ('b-02')
        mockUser = {
          id: 'u-550',
          name: 'Elena Rostova',
          role: 'CASHIER',
          tenantId: 't-zefiro-global',
          assignedBranchId: 'b-02'
        };
      } else {
        // CASO ADMINISTRATIVO: Dueño/Owner con acceso global
        mockUser = {
          id: 'u-772',
          name: 'Hersan Hernandez',
          role: 'OWNER',
          tenantId: 't-zefiro-global'
        };
      }

      // Procesar redirección RBAC
      const nextStep = handleLoginRedirect(mockUser);

      if (nextStep === 'branch_select') {
        // Si es administrador, guardar tempUser para el selector y cambiar de vista
        setTempUser(mockUser);
        setStep('branch_select');
      }

    } catch (err) {
      setError('Credenciales inválidas o error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Paso 2: Selección de contexto físico (Solo Administradores)
   */
  const handleSelectBranch = (branch: BranchInfo) => {
    if (!tempUser) return;

    // Vincular la sucursal seleccionada
    setActiveBranch(branch);
    
    console.info(`[Zefiro Auth] Admin selected branch: ${branch.name}. Redirecting to app.`);
    
    // Redirección final al Dashboard corporativo
    navigate('/app');
  };

  const goBack = () => {
    setStep('credentials');
    setTempUser(null);
  };

  return {
    step,
    isLoading,
    error,
    availableBranches,
    handleLoginSubmit,
    handleSelectBranch,
    goBack,
  };
}
