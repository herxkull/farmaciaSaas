import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranchStore } from '../../../stores/branchStore';
import { useAuthRouting } from './useAuthRouting';
import type { AuthUser, BranchInfo, UserRole, SettingUser } from '../../../stores/branchStore';
import { supabase } from '../../../lib/supabase';
import { syncUserToSupabase, fetchUsersFromSupabase } from '../../../lib/supabaseAuth';

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

      // 2. Query Supabase users table directly
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*, branch:default_branch_id(*)')
        .eq('email', email.trim())
        .single();

      let matchedUser: SettingUser | null = null;
      let mockUser: AuthUser;

      if (dbUser && dbUser.password_hash === password) {
        if (!dbUser.is_active) throw new Error('Su cuenta ha sido suspendida. Contacte al administrador.');

        matchedUser = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          roleLabel: dbUser.role === 'TENANT_OWNER' ? 'Propietario' : 'Cajero',
          branch: dbUser.branch ? dbUser.branch.name : 'Todas (Corporativo)',
          status: 'active',
          lastAccess: 'Ahora mismo',
          color: 'indigo',
          permissions: { processSale: true, applyDiscount: true, voidInvoice: true, adjustStock: true, purchaseOrder: true }
        };

        mockUser = {
          id: dbUser.id,
          name: dbUser.name,
          role: dbUser.role as UserRole,
          tenantId: dbUser.tenant_id,
          assignedBranchId: dbUser.default_branch_id
        };
      } else {
        // Fallback: Si no está en Supabase Users, probamos si es una cuenta de Auth validada
        // Esto pasa en el primer login después del onboarding si no sembramos el usuario.
        const { data: sbData, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        
        if (error) {
          throw new Error('Credenciales inválidas o correo no encontrado.');
        }

        matchedUser = {
           id: sbData.user?.id || `u-${Date.now()}`,
           name: sbData.user?.user_metadata?.full_name || email.split('@')[0],
           email: email.trim(),
           role: sbData.user?.user_metadata?.role || 'OWNER',
           roleLabel: 'Propietario',
           branch: 'Todas (Corporativo)',
           status: 'active',
           lastAccess: 'Ahora mismo',
           color: 'indigo',
           password: password,
           permissions: { processSale: true, applyDiscount: true, voidInvoice: true, adjustStock: true, purchaseOrder: true }
        };

        // Generar un Tenant ID único para la nueva cuenta
        const newTenantId = `t-${sbData.user?.id || Date.now()}`;

        // Sync to Supabase so next time it logs in fast
        await syncUserToSupabase(matchedUser, undefined, newTenantId);

        // Actualizar el estado local para que aparezca en Configuraciones sin tener que recargar
        useBranchStore.getState().setUsers(prev => {
          const exists = prev.find(u => u.id === matchedUser.id);
          if (exists) return prev;
          return [...prev, matchedUser];
        });

        mockUser = {
          id: matchedUser.id,
          name: matchedUser.name,
          role: matchedUser.role as UserRole,
          tenantId: `t-${sbData.user?.id || Date.now()}`,
        };
      }

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
