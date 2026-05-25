import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Estructura esperada del Payload del JWT
interface ZefiroJwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  // Arreglo estricto de IDs físicos de sucursales a las que el empleado tiene acceso
  assignedBranchIds: string[]; 
}

/**
 * Middleware Defensivo Edge (Next.js)
 * Intercepta todas las peticiones a la API para prevenir fugas de datos inter-sucursal (Data Leaks)
 * y suplantación de sucursales (Broken Access Control) causadas por manipulaciones maliciosas del localStorage.
 */
export async function middleware(request: NextRequest) {
  // 1. Extraer el JWT de las cookies HttpOnly (Inmune a inyección de JavaScript de terceros/XSS)
  const token = request.cookies.get('zefiro_auth')?.value;

  if (!token) {
    return NextResponse.json({ error: 'No autorizado. Token de sesión faltante.' }, { status: 401 });
  }

  try {
    // NOTA TÉCNICA: En producción, este token DEBE ser validado criptográficamente 
    // usando la llave secreta (ej. con la librería 'jose'). 
    // Para ilustrar la lógica defensiva, extraemos el payload firmado:
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    
    const jwtPayload: ZefiroJwtPayload = JSON.parse(jsonPayload);

    // 2. Extraer la Sucursal objetivo (Target Branch) que la petición intenta afectar.
    // Patrón recomendado: Enviar siempre 'x-branch-id' en los headers desde el Axios/Fetch del frontend.
    const requestedBranchId = request.headers.get('x-branch-id') || request.nextUrl.searchParams.get('branchId');

    // 3. Validación Defensiva de Aislamiento
    if (requestedBranchId) {
      // ¿La sucursal objetivo está presente en la firma inmutable del servidor?
      const isAuthorizedForBranch = jwtPayload.assignedBranchIds.includes(requestedBranchId);
      
      const isGlobalAdmin = jwtPayload.role === 'TENANT_OWNER' || jwtPayload.role === 'SUPER_ADMIN';

      // Si el rol es operativo y la sucursal pedida NO coincide con sus asignaciones, bloqueamos.
      if (!isAuthorizedForBranch && !isGlobalAdmin) {
        
        // Log de Seguridad Crítica (Para monitorización SIEM)
        console.warn(`[SECURITY AUDIT] Intento de suplantación de sucursal detectado. UserID: ${jwtPayload.userId}, TargetBranch: ${requestedBranchId}, Allowed: [${jwtPayload.assignedBranchIds.join(', ')}]`);
        
        // Retornamos 403 antes de que el motor Next.js si quiera despierte a Prisma
        return NextResponse.json(
          { error: 'Prohibido. Tu perfil no tiene permisos operativos sobre la sucursal solicitada.' }, 
          { status: 403 }
        );
      }
    }

    // 4. Inyección de Contexto Validado (Trusted Context)
    // Para que Prisma no dependa de lo que manda el Frontend, el middleware inyecta los claims verdaderos.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-validated-tenant-id', jwtPayload.tenantId);
    requestHeaders.set('x-validated-user-id', jwtPayload.userId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('[MIDDLEWARE ERROR] Token corrupto o expirado:', error);
    return NextResponse.json({ error: 'Token de sesión inválido.' }, { status: 401 });
  }
}

// Configuración del Middleware
// Interceptar transacciones core (Ventas, Inventario, Reportes)
export const config = {
  matcher: ['/api/v1/sales/:path*', '/api/v1/inventory/:path*'],
};
