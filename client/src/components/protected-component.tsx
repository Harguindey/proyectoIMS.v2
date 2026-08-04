import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedComponentProps {
  children: ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredPermission?: { module: string; action: string };
  requiredPermissions?: Array<{ module: string; action: string }>;
  requireAny?: boolean; // Si es true, cualquier rol/permiso es suficiente
  fallback?: ReactNode;
  adminOnly?: boolean;
}

export function ProtectedComponent({
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiredPermissions,
  requireAny = false,
  fallback = null,
  adminOnly = false,
}: ProtectedComponentProps) {
  const { 
    isLoading, 
    isAuthenticated, 
    hasRole, 
    hasPermission, 
    hasAnyRole, 
    hasAnyPermission, 
    isAdmin 
  } = useAuth();

  // Mostrar nada mientras carga
  if (isLoading) {
    return null;
  }

  // Si no está autenticado, no mostrar el componente
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Verificar si es solo para admin
  if (adminOnly && !isAdmin) {
    return <>{fallback}</>;
  }

  // Verificar roles individuales
  if (requiredRole && !hasRole(requiredRole)) {
    return <>{fallback}</>;
  }

  // Verificar múltiples roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requireAny 
      ? hasAnyRole(requiredRoles)
      : requiredRoles.every(role => hasRole(role));
    
    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // Verificar permiso individual
  if (requiredPermission && !hasPermission(requiredPermission.module, requiredPermission.action)) {
    return <>{fallback}</>;
  }

  // Verificar múltiples permisos
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermission = requireAny
      ? hasAnyPermission(requiredPermissions)
      : requiredPermissions.every(perm => hasPermission(perm.module, perm.action));
    
    if (!hasRequiredPermission) {
      return <>{fallback}</>;
    }
  }

  // Si pasa todas las verificaciones, mostrar el componente
  return <>{children}</>;
}

// Componentes de conveniencia
export const AdminOnly = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <ProtectedComponent adminOnly fallback={fallback}>
    {children}
  </ProtectedComponent>
);

export const SupervisorOrAdmin = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <ProtectedComponent 
    requiredRoles={['admin', 'supervisor']} 
    requireAny 
    fallback={fallback}
  >
    {children}
  </ProtectedComponent>
);

export const WithPermission = ({ 
  children, 
  module, 
  action, 
  fallback 
}: { 
  children: ReactNode; 
  module: string; 
  action: string; 
  fallback?: ReactNode;
}) => (
  <ProtectedComponent 
    requiredPermission={{ module, action }} 
    fallback={fallback}
  >
    {children}
  </ProtectedComponent>
);