import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useUser } from '@clerk/clerk-react';

interface UseRequireAuthOptions {
  redirectTo?: string;
  requiredRoles?: string[];
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { 
    redirectTo = '/login',
    requiredRoles = []
  } = options;
  
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  const isAuthenticated = isLoaded && !!user;
  const isApproved = true;
  
  const hasRole = (roles: string[]) => {
    if (!user) return false;
    const role = (user.unsafeMetadata as any)?.role;
    return roles.includes(role);
  };

  useEffect(() => {
    if (!isLoaded) return; // Wait for auth to initialize

    // Only handle role-based redirects, not authentication redirects
    // Authentication redirects should be handled by ProtectedRoute component
    if (requiredRoles.length > 0 && isAuthenticated && !hasRole(requiredRoles)) {
      navigate('/unauthorized', { replace: true });
      return;
    }

    // No approval gating anymore
  }, [isAuthenticated, user, isLoaded, isApproved, navigate, redirectTo, requiredRoles]);

  return {
    user,
    isAuthenticated,
    isLoading: !isLoaded,
    isApproved,
    isAuthorized: isAuthenticated && 
                  user &&
                  (requiredRoles.length === 0 || hasRole(requiredRoles))
  };
}

export function useRequireRole(roles: string[]) {
  return useRequireAuth({ 
    requiredRoles: roles,
    redirectTo: '/unauthorized'
  });
}