

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Settings, 
  Bell, 
  ChevronDown,
  LayoutDashboard,
  Menu,
  X,
  Shield,
  Building2,
  DollarSign,
  Users,
  Store,
  TrendingUp,
  CreditCard,
  Clock,
  ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../utils/AuthContext';
import { superAdminApi } from '../../services/api';

interface NavbarStats {
  totalRestaurants: number;
  totalRevenue: number;
  totalStaff: number;
  pendingOrders: number;
  todayRevenue: number;
}

export default function SuperAdminNavbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [stats, setStats] = useState<NavbarStats>({
    totalRestaurants: 0,
    totalRevenue: 0,
    totalStaff: 0,
    pendingOrders: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'SA';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const adminName = user?.name || 'Super Admin';
  const adminEmail = user?.email || 'admin@apos.com';
  const initials = getInitials(user?.firstName, user?.lastName);

  // ─── Fetch Dashboard Data ──────────────────────────────────────────
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.get('/super-admin/dashboard/stats?period=month');
      
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setStats({
          totalRestaurants: data.totalRestaurants || 0,
          totalRevenue: data.totalRevenue || 0,
          totalStaff: data.totalStaff || 0,
          pendingOrders: data.pendingOrders || 0,
          todayRevenue: data.todayRevenue || 0,
        });
        
        // Show notification dot if there are pending orders
        setHasUnreadNotifications((data.pendingOrders || 0) > 0);
      } else {
        console.warn('Unexpected API response structure:', response.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Don't show toast here to avoid spam on auto-refresh
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // ─── Mark Notifications as Read ────────────────────────────────────
  const handleMarkNotificationsRead = async () => {
    setHasUnreadNotifications(false);
    // Optional: Call API to mark notifications as read
    // try {
    //   await superAdminApi.post('/super-admin/notifications/mark-read');
    // } catch (error) {
    //   console.error('Failed to mark notifications as read:', error);
    // }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  return (
    <nav className="flex items-center justify-between px-4 md:px-6 h-16 w-full bg-white border-b border-gray-200 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <span className="font-semibold text-gray-700 text-sm hidden md:block">
            Super Admin
          </span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Stats - Desktop */}
        <div className="hidden lg:flex items-center gap-4 mr-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Store size={14} className="text-purple-500" />
            <span>{loading ? '...' : stats.totalRestaurants} Restaurants</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <TrendingUp size={14} className="text-green-500" />
            <span>{loading ? '...' : formatCurrency(stats.totalRevenue)} Revenue</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <DollarSign size={14} className="text-emerald-500" />
            <span>{loading ? '...' : formatCurrency(stats.todayRevenue)} Today</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users size={14} className="text-blue-500" />
            <span>{loading ? '...' : stats.totalStaff} Staff</span>
          </div>
          {stats.pendingOrders > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                <Clock size={14} />
                <span>{stats.pendingOrders} Pending</span>
              </div>
            </>
          )}
        </div>

        {/* Notifications Bell */}
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={handleMarkNotificationsRead}
          aria-label="Notifications"
        >
          <Bell size={20} className="text-gray-500" />
          {hasUnreadNotifications && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
            aria-label="Profile menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
              {initials}
            </div>
            
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-700 leading-tight">
                {adminName}
              </p>
              <p className="text-xs text-purple-500 leading-tight">
                Super Admin
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
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                {/* User Info */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {adminName}
                      </p>
                      <p className="text-xs text-purple-500 truncate">
                        {adminEmail}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/super-admin/settings');
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{adminName}</p>
                  <p className="text-xs text-purple-500">Super Admin</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-purple-600 font-medium">{stats.totalRestaurants}</p>
                  <p className="text-[10px] text-gray-500">Restaurants</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-600 font-medium">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-[10px] text-gray-500">Revenue</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-blue-600 font-medium">{stats.totalStaff}</p>
                  <p className="text-[10px] text-gray-500">Staff</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-orange-600 font-medium">{stats.pendingOrders}</p>
                  <p className="text-[10px] text-gray-500">Pending</p>
                </div>
              </div>
            </div>
            
            <div className="py-2">
              {/* Navigation links */}
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/super-admin/dashboard');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <LayoutDashboard size={18} className="text-gray-400" />
                Dashboard
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/super-admin/restaurants');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Building2 size={18} className="text-gray-400" />
                Restaurants
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/super-admin/orders');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <ShoppingBag size={18} className="text-gray-400" />
                Orders
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/super-admin/payments');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <CreditCard size={18} className="text-gray-400" />
                Payments
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/super-admin/staff');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Users size={18} className="text-gray-400" />
                Staff
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/super-admin/revenue');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <DollarSign size={18} className="text-gray-400" />
                Revenue
              </button>
              
              <div className="border-t border-gray-100 my-2" />
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/super-admin/settings');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Settings size={18} className="text-gray-400" />
                Settings
              </button>
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
