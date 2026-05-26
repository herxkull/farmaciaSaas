import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranchStore } from '../../../stores/branchStore';
import { useAuthRouting } from './useAuthRouting';
import type { AuthUser, BranchInfo, UserRole, SettingUser } from '../../../stores/branchStore';
import { supabase } from '../../../lib/supabase';

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

      // Llamada Real a Supabase para verificar credenciales
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      
      if (error) {
        throw new Error('Credenciales inválidas o correo no verificado.');
      }

      // 2. Búsqueda dinámica en el store de usuarios (RBAC Mock)
      let matchedUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      
      if (!matchedUser) {
        // El usuario existe y verificó su correo en Supabase, pero es nuevo en el almacenamiento local.
        // Lo inyectamos como Propietario (OWNER).
        const newUser: SettingUser = {
           id: data.user?.id || `u-${Date.now()}`,
           name: data.user?.user_metadata?.full_name || email.split('@')[0],
           email: email.trim(),
           role: 'OWNER',
           roleLabel: 'Propietario',
           branch: 'Todas (Corporativo)',
           status: 'active',
           lastAccess: 'Ahora mismo',
           color: 'indigo',
           password: password,
           permissions: { processSale: true, applyDiscount: true, voidInvoice: true, adjustStock: true, purchaseOrder: true }
        };
        
        const currentUsers = useBranchStore.getState().users || [];
        useBranchStore.getState().setUsers([...currentUsers, newUser]);
        
        matchedUser = newUser;
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
        // Si es administrador y no hay sucursales, enviarlo al Onboarding
        if (availableBranches.length === 0) {
          navigate('/setup');
          return;
        }
        
        // Si es administrador y SÍ hay sucursales, guardar tempUser para el selector y cambiar de vista
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
