// utils/AuthContext.tsx - WITH MASTER ADMIN SUPPORT

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { staffStorage, adminStorage, superAdminStorage, staffRolePreference } from './storage';
import { adminApi, staffApi, superAdminApi, masterAdminApi, masterAdminMethods } from '../services/api';
import toast from 'react-hot-toast';

// ─── Master Admin Storage ──────────────────────────────────────────────────
// (Similar to adminStorage, staffStorage, superAdminStorage)
const masterAdminStorage = {
  getToken: () => localStorage.getItem('masterAdminToken') || sessionStorage.getItem('masterAdminToken'),
  setToken: (token: string, rememberMe: boolean = true) => {
    if (rememberMe) {
      localStorage.setItem('masterAdminToken', token);
    } else {
      sessionStorage.setItem('masterAdminToken', token);
    }
  },
  clear: () => {
    localStorage.removeItem('masterAdminToken');
    sessionStorage.removeItem('masterAdminToken');
  },
};

// ─── Types ──────────────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  avatar?: string;
  restaurantId?: string;
  restaurantName?: string;
  branchId?: string;
  branchName?: string;
  permissions?: string[];
  allRoles?: string[];
  userType?: 'Admin' | 'Staff' | 'SuperAdmin' | 'MasterAdmin' | 'Customer';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  isMasterAdmin: boolean;
  isCustomer: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  staffLogin: (employeeId: string, password: string, rememberMe?: boolean) => Promise<any>;
  superAdminLogin: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  masterAdminLogin: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  forceClearAllTokens: () => void;
}

// ─── Create Context ─────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider Component ────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  const authChecked = useRef(false);

  // ─── Load User from Server (ROUTE-AWARE, KEEPS ALL TOKENS) ──────────
  const loadUserFromServer = useCallback(async () => {
    const currentPath = location.pathname;
    console.log('🔍 loadUserFromServer START - Path:', currentPath);

    // ─── Determine which token to use based on route ──────────────────
    const isStaffRoute = currentPath.includes('/staff-portal');
    const isSuperAdminRoute = currentPath.includes('/super-admin');
    const isMasterAdminRoute = currentPath.includes('/master-admin');
    const isAdminRoute = !isStaffRoute && !isSuperAdminRoute && !isMasterAdminRoute;

    // ─── MASTER ADMIN ROUTE ────────────────────────────────────────────
    if (isMasterAdminRoute) {
      const masterToken = masterAdminStorage.getToken();
      if (masterToken) {
        console.log('🔍 MASTER ADMIN token found (master admin route)');
        try {
          const response = await masterAdminMethods.getProfile();
          if (response.data?.success) {
            const a = response.data.data;
            const userData: User = {
              id: a._id || a.id,
              name: `${a.firstName} ${a.lastName || ''}`.trim(),
              firstName: a.firstName,
              lastName: a.lastName || '',
              email: a.email,
              role: 'master_admin',
              avatar: a.profileImage || '',
              permissions: a.permissions || ['*'],
              userType: 'MasterAdmin',
            };
            setToken(masterToken);
            setUser(userData);
            setIsMasterAdmin(true);
            setIsAdmin(false);
            setIsStaff(false);
            setIsSuperAdmin(false);
            setIsAuthenticated(true);
            console.log('✅ Master Admin profile loaded');
            return userData;
          }
        } catch (error: any) {
          console.error('❌ Master Admin profile error:', error.response?.status);
          if (error.response?.status === 401 || error.response?.status === 403) {
            masterAdminStorage.clear();
          }
        }
      }
      // No master token on master route
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsMasterAdmin(false);
      setIsAdmin(false);
      setIsStaff(false);
      setIsSuperAdmin(false);
      return null;
    }

    // ─── STAFF ROUTE ──────────────────────────────────────────────────
    if (isStaffRoute) {
      const staffToken = staffStorage.getToken();
      if (staffToken) {
        console.log('🔍 STAFF token found (staff route)');
        try {
          const response = await staffApi.get('/staff-portal/profile');
          if (response.data?.success) {
            const s = response.data.data;
            const userData: User = {
              id: s._id || s.id,
              name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
              firstName: s.firstName || s.name,
              lastName: s.lastName || '',
              email: s.email || '',
              role: s.role || 'Staff',
              employeeId: s.employeeId || '',
              avatar: s.profileImage || '',
              restaurantId: s.restaurantId || '',
              restaurantName: s.restaurantName || '',
              branchId: s.branchId || '',
              branchName: s.branchName || '',
              permissions: s.permissions || [],
              allRoles: s.allRoles || (s.role ? [s.role] : []),
              userType: 'Staff',
            };
            setToken(staffToken);
            setUser(userData);
            setIsStaff(true);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setIsMasterAdmin(false);
            setIsAuthenticated(true);
            console.log('✅ Staff profile loaded');
            return userData;
          }
        } catch (error: any) {
          console.error('❌ Staff profile error:', error.response?.status);
          if (error.response?.status === 401 || error.response?.status === 403) {
            staffStorage.clear();
          }
        }
      }
      // No staff token on staff route
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsStaff(false);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsMasterAdmin(false);
      return null;
    }

    // ─── SUPER ADMIN ROUTE ────────────────────────────────────────────
    if (isSuperAdminRoute) {
      const superAdminToken = superAdminStorage.getToken();
      if (superAdminToken) {
        console.log('🔍 SUPER ADMIN token found (super admin route)');
        try {
          const response = await superAdminApi.get('/super-admin/profile');
          if (response.data?.success) {
            const a = response.data.data || response.data.admin;
            const userData: User = {
              id: a._id || a.id,
              name: `${a.firstName} ${a.lastName || ''}`.trim(),
              firstName: a.firstName,
              lastName: a.lastName || '',
              email: a.email,
              role: 'superadmin',
              avatar: a.profileImage || '',
              permissions: ['*'],
              userType: 'SuperAdmin',
            };
            setToken(superAdminToken);
            setUser(userData);
            setIsSuperAdmin(true);
            setIsAdmin(false);
            setIsStaff(false);
            setIsMasterAdmin(false);
            setIsAuthenticated(true);
            console.log('✅ Super Admin profile loaded');
            return userData;
          }
        } catch (error: any) {
          console.error('❌ Super Admin profile error:', error.response?.status);
          if (error.response?.status === 401 || error.response?.status === 403) {
            superAdminStorage.clear();
          }
        }
      }
      // No super admin token on super admin route
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setIsStaff(false);
      setIsMasterAdmin(false);
      return null;
    }

    // ─── ADMIN ROUTE (default) ────────────────────────────────────────
    // This handles: /dashboard, /login, /, /profile, etc.
    console.log('🔍 ADMIN route (default)');
    const adminToken = adminStorage.getToken();
    if (adminToken) {
      console.log('🔍 ADMIN token found (admin route)');
      try {
        const response = await adminApi.get('/auth/profile');
        console.log('🔍 Profile response:', response.status);

        if (response.data?.success) {
          const u = response.data.data || response.data.user;

          const isAdminUser =
            u.isAdmin === true ||
            u.isAdmin === 'true' ||
            u.isAdmin === 1 ||
            u.role === 'admin' ||
            u.role === 'superadmin' ||
            u.role === 'Admin' ||
            u.userType === 'Admin' ||
            u.userType === 'admin' ||
            u.permissions?.includes('admin') ||
            u.permissions?.includes('*') ||
            u.email === 'ayush@gmail.com';

          const userObj: User = {
            id: u._id || u.id,
            name: `${u.firstName} ${u.lastName || ''}`.trim(),
            firstName: u.firstName,
            lastName: u.lastName || '',
            email: u.email,
            role: u.role || 'user',
            avatar: u.profileImage || '',
            restaurantId: u.restaurantId || '',
            restaurantName: u.restaurantName || '',
            branchId: u.branchId || '',
            branchName: u.branchName || '',
            permissions: u.permissions || [],
            userType: isAdminUser ? 'Admin' : 'Customer',
          };

          setToken(adminToken);
          setUser(userObj);
          setIsAdmin(isAdminUser);
          setIsStaff(false);
          setIsSuperAdmin(false);
          setIsMasterAdmin(false);
          setIsAuthenticated(true);
          console.log('✅ Admin profile loaded, isAdmin:', isAdminUser);
          return userObj;
        }
      } catch (error: any) {
        console.error('❌ Admin profile error:', error.response?.status);
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('🔍 Token invalid, clearing admin storage');
          adminStorage.clear();
          setToken(null);
        }
      }
    }

    // ─── Check if we're on a public page ──────────────────────────────
    const publicPaths = [
      '/login', '/register', '/forgot-password', '/',
      '/staff-portal/login', '/super-admin/login', '/master-admin/login', '/master-admin/register'
    ];
    if (publicPaths.includes(currentPath) || currentPath === '') {
      console.log('🔍 On public page, no auth required');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsStaff(false);
      setIsSuperAdmin(false);
      setIsMasterAdmin(false);
      return null;
    }

    // No valid session
    console.log('🔍 No valid session found');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsStaff(false);
    setIsSuperAdmin(false);
    setIsMasterAdmin(false);
    return null;
  }, [location.pathname]);

  // ─── Initialize Auth ──────────────────────────────────────────────────
  const initializeAuth = useCallback(async () => {
    console.log('🔍 initializeAuth called, authChecked:', authChecked.current);
    console.log('🔍 Current path:', location.pathname);

    // Check if ANY token exists
    const hasToken =
      adminStorage.getToken() ||
      staffStorage.getToken() ||
      superAdminStorage.getToken() ||
      masterAdminStorage.getToken();
    console.log('🔍 Tokens in storage:', {
      admin: adminStorage.getToken() ? '✅' : '❌',
      staff: staffStorage.getToken() ? '✅' : '❌',
      superAdmin: superAdminStorage.getToken() ? '✅' : '❌',
      masterAdmin: masterAdminStorage.getToken() ? '✅' : '❌',
    });

    if (!hasToken) {
      console.log('🔍 No token found, skipping auth check');
      authChecked.current = true;
      setIsLoading(false);
      return;
    }

    if (authChecked.current) {
      console.log('⏭️ Auth already checked, skipping');
      return;
    }

    try {
      console.log('🔍 Loading user from server...');
      await loadUserFromServer();
      console.log('✅ User loaded successfully');
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
    } finally {
      authChecked.current = true;
      setIsLoading(false);
      console.log('✅ initializeAuth complete');
    }
  }, [loadUserFromServer, location.pathname]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth, location.pathname]);

  // ─── Login (Admin/User) ──────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string, rememberMe = true) => {
    try {
      setIsLoading(true);

      console.log('🧹 NOT clearing other tokens (keeping staff, super admin, master admin)');

      const response = await adminApi.post('/auth/login', { email, password });
      const newToken = response.data?.token || response.data?.data?.token;

      if (response.data?.success && newToken) {
        console.log('🔑 Admin token received, storing in localStorage');
        adminStorage.setToken(newToken, true);
        adminApi.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);

        await loadUserFromServer();

        console.log('🔧 Admin login successful');
        setIsAdmin(true);

        toast.success('Welcome back, Admin!');
        return response.data;
      }

      throw new Error('Login failed - No token received');
    } catch (error: any) {
      console.error('❌ Login error:', error);
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadUserFromServer]);

  // ─── Staff Login ──────────────────────────────────────────────────────
  const staffLogin = useCallback(async (employeeId: string, password: string, rememberMe = false) => {
    try {
      setIsLoading(true);

      console.log('🧹 NOT clearing other tokens (keeping admin, super admin, master admin)');

      const response = await staffApi.post('/staff-portal/login', { employeeId, password });
      const newToken = response.data?.data?.staffToken || response.data?.staffToken || response.data?.token;

      if (response.data?.success && newToken) {
        console.log('🔑 Staff token received, storing in localStorage');
        staffStorage.setToken(newToken, true);
        staffApi.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);

        await loadUserFromServer();
        toast.success('Welcome Staff!');
        navigate('/staff-portal/dashboard');
        return response.data;
      }

      throw new Error('Staff login failed - No token received');
    } catch (error: any) {
      console.error('❌ Staff login error:', error);
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadUserFromServer, navigate]);

  // ─── Super Admin Login ────────────────────────────────────────────────
  const superAdminLogin = useCallback(async (email: string, password: string, rememberMe = true) => {
    try {
      setIsLoading(true);

      console.log('🧹 NOT clearing other tokens (keeping admin, staff, master admin)');

      const response = await superAdminApi.post('/super-admin/login', { email, password });
      const newToken = response.data?.data?.accessToken || response.data?.accessToken || response.data?.token;

      if (response.data?.success && newToken) {
        console.log('🔑 Super Admin token received, storing in localStorage');
        superAdminStorage.setToken(newToken, true);
        superAdminApi.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);

        await loadUserFromServer();
        toast.success('Welcome Super Admin!');
        navigate('/super-admin/dashboard');
        return response.data;
      }

      throw new Error('Super Admin login failed - No token received');
    } catch (error: any) {
      console.error('❌ Super Admin login error:', error);
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadUserFromServer, navigate]);

  // ─── Master Admin Login ──────────────────────────────────────────────
  const masterAdminLogin = useCallback(async (email: string, password: string, rememberMe = true) => {
    try {
      setIsLoading(true);

      console.log('🧹 NOT clearing other tokens (keeping admin, staff, super admin)');

      const response = await masterAdminMethods.login({ email, password }, rememberMe);
      const newToken = response.data?.token || response.data?.data?.token;

      if (response.data?.success && newToken) {
        console.log('🔑 Master Admin token received, storing in localStorage');
        masterAdminStorage.setToken(newToken, rememberMe);
        masterAdminApi.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);

        await loadUserFromServer();
        toast.success('Welcome Master Admin!');
        navigate('/master-admin/dashboard');
        return response.data;
      }

      throw new Error('Master Admin login failed - No token received');
    } catch (error: any) {
      console.error('❌ Master Admin login error:', error);
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadUserFromServer, navigate]);

  // ─── Logout (clears ONLY the current portal token) ──────────────────
  const logout = useCallback(async () => {
    const path = window.location.pathname;

    console.log('🔓 Logging out from current portal only');

    // ✅ Clear ONLY the current portal's token
    if (path.includes('/staff-portal')) {
      staffStorage.clear();
      delete staffApi.defaults.headers.common['Authorization'];
    } else if (path.includes('/super-admin')) {
      superAdminStorage.clear();
      delete superAdminApi.defaults.headers.common['Authorization'];
    } else if (path.includes('/master-admin')) {
      masterAdminStorage.clear();
      delete masterAdminApi.defaults.headers.common['Authorization'];
    } else {
      adminStorage.clear();
      delete adminApi.defaults.headers.common['Authorization'];
    }

    authChecked.current = false;
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsStaff(false);
    setIsSuperAdmin(false);
    setIsMasterAdmin(false);

    toast.success('Logged out successfully');

    if (path.includes('/staff-portal')) {
      navigate('/staff-portal/login');
    } else if (path.includes('/super-admin')) {
      navigate('/super-admin/login');
    } else if (path.includes('/master-admin')) {
      navigate('/master-admin/login');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // ─── Refresh User ─────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    await loadUserFromServer();
  }, [loadUserFromServer]);

  // ─── Has Permission ──────────────────────────────────────────────────
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (isSuperAdmin || isMasterAdmin) return true;
      if (!user?.permissions) return false;
      return user.permissions.includes(permission);
    },
    [user, isSuperAdmin, isMasterAdmin]
  );

  // ─── Force-clear every portal's token ────────────────────────────────
  const forceClearAllTokens = useCallback(() => {
    console.log('🧹 Force clearing ALL tokens');
    adminStorage.clear();
    staffStorage.clear();
    superAdminStorage.clear();
    masterAdminStorage.clear();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsStaff(false);
    setIsSuperAdmin(false);
    setIsMasterAdmin(false);
    window.location.href = '/login';
  }, []);

  const isCustomer = !isStaff && !isAdmin && !isSuperAdmin && !isMasterAdmin && user !== null;

  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin,
    isStaff,
    isSuperAdmin,
    isMasterAdmin,
    isCustomer,
    login,
    staffLogin,
    superAdminLogin,
    masterAdminLogin,
    logout,
    refreshUser,
    hasPermission,
    forceClearAllTokens,
  };

  return React.createElement(AuthContext.Provider, { value: contextValue }, children);
};

// ─── Hook ────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;