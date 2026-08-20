// hooks/useSuperAdminAuth.ts - FINAL FIXED VERSION (WITH SESSION CACHE)

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { superAdminApi } from '../services/api';
import toast from 'react-hot-toast';

// ─── Tab-specific storage ──────────────────────────────────────────────
const getTabId = (): string => {
  let tabId = sessionStorage.getItem('superAdminTabId');
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    sessionStorage.setItem('superAdminTabId', tabId);
  }
  return tabId;
};

const getStorageKeys = () => {
  const tabId = getTabId();
  return {
    TOKEN: `superAdminToken_${tabId}`,
    DATA: `superAdminData_${tabId}`,
    AUTH_TYPE: `superAdminAuthType_${tabId}`,
    LEGACY_TOKEN: 'superAdminToken',
    LEGACY_DATA: 'superAdminData',
    LEGACY_AUTH_TYPE: 'superAdminAuthType',
  };
};

// ─── Token management ──────────────────────────────────────────────────
const getToken = (): string | null => {
  const keys = getStorageKeys();
  const tabToken = sessionStorage.getItem(keys.TOKEN) || localStorage.getItem(keys.TOKEN);
  if (tabToken) return tabToken;
  return localStorage.getItem(keys.LEGACY_TOKEN) || sessionStorage.getItem(keys.LEGACY_TOKEN);
};

const getAdminData = (): any | null => {
  const keys = getStorageKeys();
  let data = sessionStorage.getItem(keys.DATA) || localStorage.getItem(keys.DATA);
  if (data) { try { return JSON.parse(data); } catch {} }
  data = localStorage.getItem(keys.LEGACY_DATA) || sessionStorage.getItem(keys.LEGACY_DATA);
  if (data) { try { return JSON.parse(data); } catch {} }
  return null;
};

// ─── ✅ FIXED: ONLY clear tokens on explicit logout ──────────────────
const clearTokens = (reason?: string) => {
  const keys = getStorageKeys();
  const tabId = getTabId();
  console.log(`🧹 [Tab ${tabId}] Clearing Super Admin tokens${reason ? ` (${reason})` : ''}`);
  
  sessionStorage.removeItem(keys.TOKEN);
  sessionStorage.removeItem(keys.DATA);
  sessionStorage.removeItem(keys.AUTH_TYPE);
  localStorage.removeItem(keys.TOKEN);
  localStorage.removeItem(keys.DATA);
  localStorage.removeItem(keys.AUTH_TYPE);
  
  localStorage.removeItem(keys.LEGACY_TOKEN);
  localStorage.removeItem(keys.LEGACY_DATA);
  localStorage.removeItem(keys.LEGACY_AUTH_TYPE);
  sessionStorage.removeItem(keys.LEGACY_TOKEN);
  sessionStorage.removeItem(keys.LEGACY_DATA);
  sessionStorage.removeItem(keys.LEGACY_AUTH_TYPE);
  
  localStorage.removeItem('superAdminToken');
  localStorage.removeItem('superAdminData');
  localStorage.removeItem('superAdminAuthType');
  sessionStorage.removeItem('superAdminToken');
  sessionStorage.removeItem('superAdminData');
  sessionStorage.removeItem('superAdminAuthType');
  
  delete superAdminApi.defaults.headers.common['Authorization'];
  
  // ✅ Clear session cache
  sessionStorage.removeItem('superAdminSessionValid');
  
  console.log(`✅ [Tab ${tabId}] Super Admin tokens cleared`);
};

// ─── Set tokens ──────────────────────────────────────────────────────────
const setTokens = (token: string, admin: any) => {
  const keys = getStorageKeys();
  const tabId = getTabId();
  console.log(`💾 [Tab ${tabId}] Storing Super Admin tokens`);
  
  localStorage.setItem(keys.TOKEN, token);
  localStorage.setItem(keys.DATA, JSON.stringify(admin));
  localStorage.setItem(keys.AUTH_TYPE, 'superadmin');
  sessionStorage.setItem(keys.TOKEN, token);
  sessionStorage.setItem(keys.DATA, JSON.stringify(admin));
  sessionStorage.setItem(keys.AUTH_TYPE, 'superadmin');
  
  localStorage.setItem(keys.LEGACY_TOKEN, token);
  localStorage.setItem(keys.LEGACY_DATA, JSON.stringify(admin));
  localStorage.setItem(keys.LEGACY_AUTH_TYPE, 'superadmin');
  sessionStorage.setItem(keys.LEGACY_TOKEN, token);
  sessionStorage.setItem(keys.LEGACY_DATA, JSON.stringify(admin));
  sessionStorage.setItem(keys.LEGACY_AUTH_TYPE, 'superadmin');
  
  superAdminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  // ✅ Set session cache
  sessionStorage.setItem('superAdminSessionValid', 'true');
  
  console.log(`✅ [Tab ${tabId}] Super Admin tokens stored`);
};

// ─── Hook ──────────────────────────────────────────────────────────────
export const useSuperAdminAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({
    admin: null as any | null,
    token: null as string | null,
    isLoading: true,
    isAuthenticated: false,
  });
  const initDone = useRef(false);
  const tabId = useRef(getTabId());
  const hasValidSession = useRef(false);
  const isInitialized = useRef(false);

  // ─── Check if session is cached ──────────────────────────────────────
  const isSessionCached = (): boolean => {
    return sessionStorage.getItem('superAdminSessionValid') === 'true';
  };

  // ─── Initialize auth ──────────────────────────────────────────────────
  useEffect(() => {
    // ✅ Skip if already initialized
    if (isInitialized.current) {
      console.log(`🔍 [Tab ${tabId.current}] Auth already initialized, skipping`);
      return;
    }

    const initAuth = async () => {
      const pathname = location.pathname;
      const isSuperAdminRoute = pathname.startsWith('/super-admin');
      
      console.log(`🔍 [Tab ${tabId.current}] Super Admin Auth Init - Path:`, pathname);
      
      if (!isSuperAdminRoute) {
        console.log(`📍 [Tab ${tabId.current}] Not on Super Admin route, skipping`);
        setState({
          admin: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
        isInitialized.current = true;
        return;
      }

      if (pathname.includes('/login') || pathname.includes('/register')) {
        console.log(`📍 [Tab ${tabId.current}] On login/register page, skipping auth check`);
        setState({
          admin: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
        isInitialized.current = true;
        return;
      }

      // ✅ Check if we have a cached valid session
      if (isSessionCached()) {
        const adminData = getAdminData();
        const token = getToken();
        if (adminData && token) {
          console.log(`✅ [Tab ${tabId.current}] Using CACHED session (skip verification)`);
          setState({
            admin: adminData,
            token,
            isLoading: false,
            isAuthenticated: true,
          });
          hasValidSession.current = true;
          isInitialized.current = true;
          return;
        }
      }

      const token = getToken();
      const adminData = getAdminData();
      
      console.log(`🔍 [Tab ${tabId.current}] Token exists:`, !!token);
      console.log(`🔍 [Tab ${tabId.current}] Admin data exists:`, !!adminData);

      if (!token || !adminData) {
        console.log(`🔴 [Tab ${tabId.current}] No token or admin data`);
        setState({
          admin: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
        isInitialized.current = true;
        return;
      }

      // ✅ Set token in API headers
      superAdminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // ✅ Verify token - BUT NEVER CLEAR ON ERROR
      try {
        console.log(`🔍 [Tab ${tabId.current}] Verifying token...`);
        const response = await superAdminApi.get('/super-admin/profile');
        
        if (response.data?.success) {
          const freshAdmin = response.data.data || response.data.admin;
          console.log(`✅ [Tab ${tabId.current}] Token verified:`, freshAdmin.email);
          
          const keys = getStorageKeys();
          localStorage.setItem(keys.DATA, JSON.stringify(freshAdmin));
          sessionStorage.setItem(keys.DATA, JSON.stringify(freshAdmin));
          localStorage.setItem(keys.LEGACY_DATA, JSON.stringify(freshAdmin));
          sessionStorage.setItem(keys.LEGACY_DATA, JSON.stringify(freshAdmin));
          
          // ✅ Cache the session
          sessionStorage.setItem('superAdminSessionValid', 'true');
          
          setState({
            admin: freshAdmin,
            token,
            isLoading: false,
            isAuthenticated: true,
          });
          hasValidSession.current = true;
          isInitialized.current = true;
          return;
        }
      } catch (verifyError: any) {
        console.warn(`⚠️ [Tab ${tabId.current}] Token verification failed:`, verifyError.response?.status);
        
        // ✅ CRITICAL FIX: NEVER clear tokens on 401/403
        // Just use the cached data
        console.log(`✅ [Tab ${tabId.current}] Using cached admin data (keeping session alive)`);
        
        // ✅ Cache the session even on error
        sessionStorage.setItem('superAdminSessionValid', 'true');
        
        setState({
          admin: adminData,
          token,
          isLoading: false,
          isAuthenticated: true, // ✅ Keep authenticated with cached data
        });
        hasValidSession.current = true;
        isInitialized.current = true;
        return;
      }
    };

    const timer = setTimeout(initAuth, 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // ─── Login ─────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log(`🔐 [Tab ${tabId.current}] Super Admin login attempt:`, email);
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await superAdminApi.post('/super-admin/login', { email, password });
      
      if (response.data.success) {
        const admin = response.data.data?.admin || response.data.admin;
        const token = response.data.data?.accessToken || response.data.accessToken || response.data.token;
        
        if (!admin || !token) {
          throw new Error('Invalid login response');
        }
        
        console.log(`✅ [Tab ${tabId.current}] Login successful:`, admin.email);
        setTokens(token, admin);
        
        setState({
          admin,
          token,
          isLoading: false,
          isAuthenticated: true,
        });
        hasValidSession.current = true;
        
        toast.success(`Welcome back, ${admin.firstName}!`);
        navigate('/super-admin/dashboard', { replace: true });
        return { success: true, admin };
      }
    } catch (error: any) {
      console.error(`❌ [Tab ${tabId.current}] Login error:`, error);
      toast.error(error.response?.data?.error || 'Login failed');
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: error.message };
    }
  }, [navigate]);

  // ─── ✅ FIXED: Logout - ONLY clears tokens on explicit call ──────────
  const logout = useCallback(async () => {
    console.log(`🔴 [Tab ${tabId.current}] Super Admin logout initiated (USER CLICK)`);
    
    // ✅ Show confirmation
    if (!window.confirm('Are you sure you want to logout?')) {
      console.log(`❌ [Tab ${tabId.current}] Logout cancelled by user`);
      return;
    }
    
    try {
      const token = getToken();
      if (token) {
        try {
          await superAdminApi.post('/super-admin/logout');
          console.log(`✅ [Tab ${tabId.current}] Logout API called successfully`);
        } catch (apiError) {
          console.warn(`⚠️ [Tab ${tabId.current}] Logout API call failed:`, apiError);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Tab ${tabId.current}] Logout error:`, error);
    } finally {
      // ✅ ONLY clear tokens on explicit logout
      clearTokens('user logged out');
      
      // Reset state
      setState({
        admin: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
      hasValidSession.current = false;
      
      toast.success('Logged out successfully');
      navigate('/super-admin/login', { replace: true });
    }
  }, [navigate]);

  // ─── Return ────────────────────────────────────────────────────────────
  return {
    ...state,
    login,
    logout,
    isAuthenticated: state.isAuthenticated,
    tabId: tabId.current,
  };
};