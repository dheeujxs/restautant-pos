// pages/staff-portal/StaffNavbar.tsx
// Staff profile data now comes from AuthContext's `user` (server-fetched via
// /staff-portal/profile) — staffStorage only holds the auth token now (see
// utils/storage.ts). This file previously still called the removed
// staffStorage.getData().

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  User, 
  Settings, 
  Bell, 
  ChevronDown,
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react';
import { staffRolePreference } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';
import RoleSwitcher from '../../components/RoleSwitcher';

// ─── Normalize a role entry to a plain string ────────────────────────────
// Same helper used in StaffDashboard.tsx / RoleSwitcher.tsx / StaffSidebar.tsx
// — roles can come back from the API as a string ("chef") or a populated
// object ({ name: "chef", ... }).
const normalizeRoleName = (r: any): string | null => {
  if (typeof r === 'string' && r.trim().length > 0) return r;
  if (r && typeof r === 'object' && typeof r.name === 'string' && r.name.trim().length > 0) return r.name;
  return null;
};

const getRoleDisplay = (role: any) => {
  const labels: Record<string, string> = {
    admin: '👑 Admin',
    manager: '👔 Manager',
    chef: '👨‍🍳 Chef',
    cook: '🍳 Cook',
    section_chef: '👨‍🍳 Section Chef',
    kot_staff: '📋 KOT Staff',
    waiter: '👨‍💼 Waiter',
    cashier: '💰 Cashier',
    helper: '🫂 Helper',
  };
  const name = normalizeRoleName(role) || 'Staff';
  return labels[name.toLowerCase()] || name;
};

export default function StaffNavbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [displayRole, setDisplayRole] = useState<string>('Staff');

  // ─── Pick the role to display: the RoleSwitcher-selected preference
  // (if it's still one of this person's actual roles) → their primary role.
  useEffect(() => {
    const pickDisplayRole = () => {
      if (!user) {
        setDisplayRole('Staff');
        return;
      }

      const rawRoles: any[] =
        user.allRoles && user.allRoles.length > 0 ? user.allRoles : user.role ? [user.role] : [];
      const roles = [...new Set(rawRoles.map(normalizeRoleName).filter((r): r is string => !!r))];

      const preferred = staffRolePreference.get();
      const primaryRole =
        (preferred && roles.includes(preferred) ? preferred : null) ||
        normalizeRoleName(user.role) ||
        roles[0] ||
        'Staff';

      setDisplayRole(primaryRole);
    };

    pickDisplayRole();

    // staffRolePreference.set() (called by RoleSwitcher) dispatches this
    // event — this previously listened for 'roleChanged', which nothing
    // ever fires, so switching roles never updated the navbar.
    window.addEventListener('staffRoleChanged', pickDisplayRole);
    return () => window.removeEventListener('staffRoleChanged', pickDisplayRole);
  }, [user]);

  const handleLogout = () => {
    // AuthContext's logout() clears the right portal's storage, shows the
    // toast, and navigates to the correct login page — no need to duplicate
    // that here.
    logout();
  };

  const getInitials = (name: string) => {
    if (!name) return 'S';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentRoleDisplay = getRoleDisplay(displayRole);
  const staffName = user?.name || 'Staff';
  const initials = getInitials(staffName);

  return (
    <nav className="flex items-center justify-between px-4 md:px-6 h-16 w-full bg-white border-b border-gray-200">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-gray-700 text-sm hidden md:block">
            Staff Portal
          </span>
        </div>

        {/* Role Switcher - Desktop */}
        <div className="hidden lg:block">
          <RoleSwitcher />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setNotifications(0)}
        >
          <Bell size={20} className="text-gray-500" />
          {notifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>

        {/* Role Switcher - Mobile/Tablet */}
        <div className="lg:hidden">
          <RoleSwitcher />
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
              {initials}
            </div>
            
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-700 leading-tight">
                {staffName}
              </p>
              <p className="text-xs text-gray-400 leading-tight">
                {currentRoleDisplay}
              </p>
            </div>
            
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform duration-200 ${
                showProfileMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {staffName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.employeeId || 'Staff'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/staff-portal/profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <User size={16} className="text-gray-400" />
                    My Profile
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/staff-portal/dashboard');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <LayoutDashboard size={16} className="text-gray-400" />
                    Dashboard
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/staff-portal/settings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={16} className="text-gray-400" />
                    Settings
                  </button>

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50 lg:hidden overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{staffName}</p>
                  <p className="text-xs text-gray-500">{currentRoleDisplay}</p>
                </div>
              </div>
            </div>
            
            <div className="py-2">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/staff-portal/dashboard');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <LayoutDashboard size={18} className="text-gray-400" />
                Dashboard
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/staff-portal/profile');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <User size={18} className="text-gray-400" />
                Profile
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/staff-portal/settings');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Settings size={18} className="text-gray-400" />
                Settings
              </button>
              <div className="border-t border-gray-100 my-2" />
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}