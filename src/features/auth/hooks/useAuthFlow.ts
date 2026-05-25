import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranchStore } from '../../../stores/branchStore';
import { useAuthRouting } from './useAuthRouting';
import type { AuthUser, BranchInfo, UserRole } from '../../../stores/branchStore';

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

  // Lista de usuarios y sucursales (mapeadas desde el store)
  const users = useBranchStore((state) => state.users) || [];
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

      // 2. CONDICIONAL A: Búsqueda dinámica en el store de usuarios (RBAC)
      const matchedUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      
      if (!matchedUser) {
        throw new Error('Usuario no registrado o credenciales inválidas.');
      }

      // Detalle Premium: Soportar la clave prellenada de la demo
      const isDummyPrefilled = password === '••••••••';
      const isPasswordMatch = isDummyPrefilled || matchedUser.password === password;

      if (!isPasswordMatch) {
        throw new Error('Contraseña incorrecta.');
      }

      if (matchedUser.status === 'suspended') {
        throw new Error('Su cuenta ha sido suspendida. Contacte al administrador.');
      }

      // Mapear la sucursal asignada por texto al id correspondiente de la sucursal
      const assignedBranch = availableBranches.find(b => b.name === matchedUser.branch);
      const assignedBranchId = assignedBranch ? assignedBranch.id : undefined;

      const mockUser: AuthUser = {
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role as UserRole,
        tenantId: 't-zefiro-global',
        assignedBranchId: assignedBranchId
      };

      // Procesar redirección RBAC
      const nextStep = handleLoginRedirect(mockUser);

      if (nextStep === 'branch_select') {
        // Si es administrador, guardar tempUser para el selector y cambiar de vista
        setTempUser(mockUser);
        setStep('branch_select');
      }

    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas o error de conexión.');
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
