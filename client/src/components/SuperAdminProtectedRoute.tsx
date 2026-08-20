// components/SuperAdminProtectedRoute.tsx - FIXED (uses AuthContext, no duplicate fetch)
//
// Previously this component ran its own independent auth check (its own
// token read, its own call to /super-admin/profile, its own loading/
// authenticated state) — completely separate from AuthContext's
// loadUserFromServer(), which already fetches this same profile. That
// meant a duplicate network call on every super-admin route load, and a
// risk of this guard disagreeing with AuthContext (which the Navbar and
// Sidebar read from) about whether the admin is logged in.
//
// Now it just reads the single source of truth from AuthContext.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

export const SuperAdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, isSuperAdmin } = useAuth();
  const location = useLocation();

  const publicPaths = [
    '/super-admin/login',
    '/super-admin/register',
    '/super-admin/forgot-password',
    '/super-admin/reset-password',
  ];

  if (publicPaths.includes(location.pathname)) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return <>{children}</>;
};

export default SuperAdminProtectedRoute;