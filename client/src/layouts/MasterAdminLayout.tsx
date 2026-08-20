// layouts/MasterAdminLayout.tsx - LIGHT THEME (SAME AS SUPER ADMIN)

import { Outlet } from 'react-router-dom';
import MasterAdminSidebar from '../pages/master-admin/MasterAdminSidebar';
import MasterAdminNavbar from '../pages/master-admin/MasterAdminNavbar';


export default function MasterAdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#faf9f7]">
      <MasterAdminSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Fixed Navbar */}
        <div className="flex-shrink-0 z-10">
          <MasterAdminNavbar />
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