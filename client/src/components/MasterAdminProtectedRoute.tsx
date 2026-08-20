// components/MasterAdminProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { Loader2 } from 'lucide-react';

export function MasterAdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isMasterAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f1a]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isMasterAdmin) {
    return <Navigate to="/master-admin/login" replace />;
  }

  return <>{children}</>;
}

export default MasterAdminProtectedRoute;