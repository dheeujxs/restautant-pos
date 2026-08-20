import { Outlet } from 'react-router-dom';
import SuperAdminSidebar from '../pages/super-admin/SuperAdminSidebar';
import SuperAdminNavbar  from  '../pages/super-admin/SuperAdminNavbar';

export default function SuperAdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#faf9f7]">
      <SuperAdminSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Fixed Navbar */}
        <div className="flex-shrink-0 z-10">
          <SuperAdminNavbar />
        </div>
        
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#faf9f7] to-[#f5f3ef]">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}