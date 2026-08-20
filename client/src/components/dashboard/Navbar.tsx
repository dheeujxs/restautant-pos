import { Bell, Search, User, LogOut, UserCircle, Settings, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../utils/AuthContext';
import { useNavigate } from 'react-router-dom';
import {adminApi}   from '../../services/api';

export default function Navbar() {
  const { user, logout,token } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [profileImage, setProfileImage] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch latest profile image
  useEffect(() => {
    fetchProfileImage();
  }, [token, user]);

  const fetchProfileImage = async () => {
    if (!token) return;
    try {
      const res = await adminApi.get('/auth/profile');
      if (res.data.success && res.data.data?.profileImage) {
        setProfileImage(res.data.data.profileImage);
      }
    } catch (error) {
      console.error('Failed to fetch profile image:', error);
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 right-0 left-[var(--sidebar-w,68px)] h-16 bg-white/95 backdrop-blur-sm border-b border-stone-100 flex items-center justify-between px-6 z-30 transition-all duration-300">
      {/* Search Bar */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {/* Right Side - Notifications & User */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="w-9 h-9 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors relative">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">3</span>
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-stone-50 transition-colors"
          >
            {/* Avatar - Show profile image if available */}
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border-2 border-orange-200 shadow-md"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {getInitials()}
              </div>
            )}
            {/* User Info - only show when sidebar is expanded */}
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-stone-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-stone-400">{user?.email}</p>
            </div>
            <ChevronDown size={16} className={`text-stone-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3">
                {/* Larger avatar in dropdown */}
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover border-2 border-orange-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                    {getInitials()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-stone-800">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-stone-500">{user?.email}</p>
                  <p className="text-xs text-stone-400 mt-1">Role: {user?.role || 'Admin'}</p>
                </div>
              </div>
              <div className="py-1">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <UserCircle size={16} />
                  Profile Settings
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </button>
                <div className="border-t border-stone-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}