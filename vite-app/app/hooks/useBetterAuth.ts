import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../lib/auth/client';

interface UseRequireAuthOptions {
  redirectTo?: string;
  requiredRoles?: string[];
  requireApproval?: boolean;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { 
    redirectTo = '/login',
    requiredRoles = [],
    requireApproval = true
  } = options;
  
  const { data: session, isPending: isLoading } = useSession();
  const navigate = useNavigate();

  const user = session?.user;
  const isAuthenticated = !!session && !!user;
  const isApproved = user?.status === 'APPROVED';
  
  const hasRole = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  useEffect(() => {
    if (isLoading) return; // Wait for auth to initialize

    if (!isAuthenticated || !user) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // Check role requirement
    if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
      navigate('/unauthorized', { replace: true });
      return;
    }

    // Check approval requirement
    if (requireApproval && !isApproved) {
      navigate('/pending-approval', { replace: true });
      return;
    }
  }, [isAuthenticated, user, isLoading, isApproved, hasRole, navigate, redirectTo, requiredRoles, requireApproval]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isApproved,
    isAuthorized: isAuthenticated && 
                  user &&
                  (requiredRoles.length === 0 || hasRole(requiredRoles)) &&
                  (!requireApproval || isApproved)
  };
}

export function useRequireRole(roles: string[]) {
  return useRequireAuth({ 
    requiredRoles: roles,
    redirectTo: '/unauthorized'
  });
}

export function useRequireApproval() {
  return useRequireAuth({
    requireApproval: true,
    redirectTo: '/login'
  });
}