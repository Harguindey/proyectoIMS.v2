import { useQuery } from "@tanstack/react-query";
import { User, Permission } from "@shared/schema";

interface AuthUser extends User {
  roles?: Array<{
    id: number;
    roleId: number;
    assignedAt: Date | null;
    role: {
      id: number;
      name: string;
      displayName: string;
      description: string | null;
    };
  }>;
}

interface UseAuthReturn {
  user: AuthUser | undefined;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (roleName: string) => boolean;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  hasAnyPermission: (permissions: Array<{module: string, action: string}>) => boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isOperator: boolean;
  isViewer: boolean;
}

interface AuthResponse {
  user?: AuthUser;
  permissions?: Permission[];
}

export function useAuth(): UseAuthReturn {
  const { data: authData, isLoading } = useQuery<AuthResponse | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchInterval: false, // No auto-refetch para auth
    refetchOnWindowFocus: false, // No refetch en focus para auth
    staleTime: 10 * 60 * 1000, // 10 minutos - auth data dura más tiempo
    gcTime: 15 * 60 * 1000, // 15 minutos en cache
  });

  const user = authData?.user;
  const permissions = authData?.permissions || [];
  
  // Type guard para authData
  const hasAuthData = authData && typeof authData === 'object';

  const hasRole = (roleName: string): boolean => {
    if (!user?.roles) return false;
    return user.roles.some((userRole: any) => userRole.role.name === roleName);
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!permissions) return false;
    return permissions.some((permission: any) => 
      permission.module === module && permission.action === action
    );
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    if (!user?.roles) return false;
    return user.roles.some((userRole: any) => 
      roleNames.includes(userRole.role.name)
    );
  };

  const hasAnyPermission = (requiredPermissions: Array<{module: string, action: string}>): boolean => {
    if (!permissions) return false;
    return requiredPermissions.some(required => 
      permissions.some((permission: any) => 
        permission.module === required.module && permission.action === required.action
      )
    );
  };

  return {
    user: hasAuthData ? user : undefined,
    permissions: hasAuthData ? permissions : [],
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAnyPermission,
    isAdmin: hasRole('admin'),
    isSupervisor: hasRole('supervisor'),
    isOperator: hasRole('operador'),
    isViewer: hasRole('viewer'),
  };
}

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}
