import { useCallback } from 'react';
import { useBranchStore } from '../stores/branchStore';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

/**
 * Custom Hook: useApi
 * Encapsula el data-fetching corporativo.
 * Inyecta de forma imperativa y automatizada el branch_id activo en:
 * 1. Headers de Auditoría (X-Branch-Id)
 * 2. Query Parameters de Filtrado de RLS (branch_id)
 */
export function useApi() {
  const activeBranch = useBranchStore((state) => state.activeBranch);
  const tenantId = useBranchStore((state) => state.user?.tenantId);
  const branchId = activeBranch?.id || '';

  const request = useCallback(
    async <T>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
      const { params = {}, headers = {}, ...rest } = options;

      // 1. INYECCIÓN DE QUERY PARAMS (Auto-Filtrado URL)
      const urlParams = new URLSearchParams();
      
      // Añadimos los params que vienen del componente
      Object.entries(params).forEach(([key, val]) => {
        urlParams.append(key, String(val));
      });

      // Auto-inyectamos el contexto espacial de sucursal si existe
      if (branchId && !urlParams.has('branch_id')) {
        urlParams.append('branch_id', branchId);
      }

      // Formar URL final
      const queryString = urlParams.toString();
      const fullUrl = `${endpoint}${queryString ? `?${queryString}` : ''}`;

      // 2. INYECCIÓN EN HEADERS (RLS / Backend Interceptors)
      const customHeaders = new Headers(headers);
      customHeaders.set('Content-Type', 'application/json');
      if (branchId) {
        customHeaders.set('X-Branch-Id', branchId);
        customHeaders.set('X-Tenant-Context', tenantId || 't-unknown'); // Integración futura
      }

      // Simulación conceptual del fetch real
      console.groupCollapsed(`🚀 [API Fetch Wrapper] Outgoing: ${fullUrl}`);
      console.log('Headers:', Object.fromEntries(customHeaders.entries()));
      console.log('Payload/Params:', params);
      console.groupEnd();

      // Simulación de ejecución Fetch con tipado T
      const response = await fetch(fullUrl, {
        ...rest,
        headers: customHeaders,
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    },
    [branchId]
  );

  // Atajos REST conceptuales
  const get = useCallback(
    <T>(endpoint: string, params?: Record<string, string | number | boolean>) =>
      request<T>(endpoint, { method: 'GET', params }),
    [request]
  );

  const post = useCallback(
    <T>(endpoint: string, body: any, params?: Record<string, string | number | boolean>) =>
      request<T>(endpoint, { 
        method: 'POST', 
        body: JSON.stringify(body), 
        params 
      }),
    [request]
  );

  return { request, get, post, activeBranchId: branchId };
}
