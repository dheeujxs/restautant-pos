import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import Navbar from '../components/dashboard/Navbar';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function DashboardLayout() {
  useDocumentTitle('Admin Dashboard');

  return (
    <div className="flex h-screen overflow-hidden bg-[#faf9f7]">
      <Sidebar />
      <main className="relative flex-1 min-w-0 overflow-y-auto pt-16 bg-gradient-to-br from-[#faf9f7] to-[#f5f3ef]">
        <Navbar />
        <div className="min-h-[calc(100vh-64px)] p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}