import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import StaffSidebar from '../pages/staff-portal/StaffSidebar';
import StaffNavbar from '../pages/staff-portal/StaffNavbar';
import { staffStorage } from '../utils/storage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import toast from 'react-hot-toast';

export default function StaffLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useDocumentTitle('Staff Portal');

  useEffect(() => {
    // Check if user is logged in
    if (!staffStorage.isLoggedIn()) {
      toast.error('Session expired. Please login again.');
      navigate('/staff-portal/login');
      return;
    }

    // Log navigation without tab ID since we simplified the storage
    console.log(`📍 Navigation occurred to:`, location.pathname);
  }, [location, navigate]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <StaffSidebar />
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginLeft: 'var(--sidebar-w, 68px)' }}
      >
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          <StaffNavbar />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}