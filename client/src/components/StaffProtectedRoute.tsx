

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import type { Permission } from '../types/permissions';

interface StaffProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export default function StaffProtectedRoute({
  children,
  requiredPermission,
}: StaffProtectedRouteProps) {
  const { isLoading, isAuthenticated, isStaff, hasPermission } = useAuth();
  const location = useLocation();

  if (location.pathname === '/staff-portal/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated || !isStaff) {
    return <Navigate to="/staff-portal/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Access Denied</h2>
        <p className="text-gray-500 text-sm mt-2 text-center max-w-md">
          You don't have permission to access this page. Required: {requiredPermission}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}