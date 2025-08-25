import type { ReactNode } from 'react';
import { useRequireAuth } from '../hooks/useBetterAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requireApproval?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  requireApproval = true,
  redirectTo,
  fallback
}: ProtectedRouteProps) {
  const { isLoading, isAuthorized } = useRequireAuth({
    redirectTo,
    requiredRoles,
    requireApproval
  });

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Only render children if authorized
  // The useRequireAuth hook handles redirects
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}

// Convenience components for common protection scenarios
export function RequireAuth({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function RequireRole({ 
  children, 
  roles, 
  fallback 
}: { 
  children: ReactNode; 
  roles: string[]; 
  fallback?: ReactNode;
}) {
  return (
    <ProtectedRoute 
      requiredRoles={roles} 
      redirectTo="/unauthorized"
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequireApproval({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute 
      requireApproval={true}
      redirectTo="/pending-approval"
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  );
}