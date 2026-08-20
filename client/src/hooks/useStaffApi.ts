// hooks/useStaffApi.ts - COMPLETE FIXED VERSION

import { staffApi } from '../services/api';
import { staffStorage } from '../utils/storage';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StaffApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Staff API Hook ──────────────────────────────────────────────────────────
export const useStaffApi = () => {
  // ─── Helper: Ensure token is set before making requests ──────────────────
  const ensureToken = () => {
    const token = staffStorage.getToken() || localStorage.getItem('staffToken');
    if (token) {
      staffApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return true;
    }
    
    // Try super admin token as fallback (for super admin viewing staff data)
    const superToken = localStorage.getItem('superAdminToken');
    if (superToken) {
      staffApi.defaults.headers.common['Authorization'] = `Bearer ${superToken}`;
      console.log('🔄 Using Super Admin token as fallback for staff API');
      return true;
    }
    
    return false;
  };

  // ─── GET Request ──────────────────────────────────────────────────────────
  const get = async <T = any>(url: string, config?: any): Promise<T> => {
    try {
      console.log(`📤 [STAFF API] GET ${url}`);
      
      // ✅ Ensure token is set
      ensureToken();
      
      const response = await staffApi.get(url, config);
      console.log(`✅ [STAFF API] GET ${url} - Status: ${response.status}`);
      
      return response.data;
    } catch (error: any) {
      console.error(`❌ Staff API GET error for ${url}:`, error);
      
      // ✅ Handle 401/403 - Token expired or invalid
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('🔐 Staff session expired');
        staffStorage.clear();
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffData');
        
        // ✅ Only redirect if on staff page
        if (window.location.pathname.includes('/staff-portal') && 
            !window.location.pathname.includes('/login')) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/staff-portal/login';
        }
      }
      
      throw error;
    }
  };

  // ─── POST Request ─────────────────────────────────────────────────────────
  const post = async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    try {
      console.log(`📤 [STAFF API] POST ${url}`);
      
      // ✅ Ensure token is set
      ensureToken();
      
      const response = await staffApi.post(url, data, config);
      console.log(`✅ [STAFF API] POST ${url} - Status: ${response.status}`);
      
      return response.data;
    } catch (error: any) {
      console.error(`❌ Staff API POST error for ${url}:`, error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('🔐 Staff session expired');
        staffStorage.clear();
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffData');
        
        if (window.location.pathname.includes('/staff-portal') && 
            !window.location.pathname.includes('/login')) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/staff-portal/login';
        }
      }
      
      throw error;
    }
  };

  // ─── PUT Request ──────────────────────────────────────────────────────────
  const put = async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    try {
      console.log(`📤 [STAFF API] PUT ${url}`);
      
      // ✅ Ensure token is set
      ensureToken();
      
      const response = await staffApi.put(url, data, config);
      console.log(`✅ [STAFF API] PUT ${url} - Status: ${response.status}`);
      
      return response.data;
    } catch (error: any) {
      console.error(`❌ Staff API PUT error for ${url}:`, error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('🔐 Staff session expired');
        staffStorage.clear();
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffData');
        
        if (window.location.pathname.includes('/staff-portal') && 
            !window.location.pathname.includes('/login')) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/staff-portal/login';
        }
      }
      
      throw error;
    }
  };

  // ─── PATCH Request ────────────────────────────────────────────────────────
  const patch = async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    try {
      console.log(`📤 [STAFF API] PATCH ${url}`);
      
      // ✅ Ensure token is set
      ensureToken();
      
      const response = await staffApi.patch(url, data, config);
      console.log(`✅ [STAFF API] PATCH ${url} - Status: ${response.status}`);
      
      return response.data;
    } catch (error: any) {
      console.error(`❌ Staff API PATCH error for ${url}:`, error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('🔐 Staff session expired');
        staffStorage.clear();
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffData');
        
        if (window.location.pathname.includes('/staff-portal') && 
            !window.location.pathname.includes('/login')) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/staff-portal/login';
        }
      }
      
      throw error;
    }
  };

  // ─── DELETE Request ──────────────────────────────────────────────────────
  const del = async <T = any>(url: string, config?: any): Promise<T> => {
    try {
      console.log(`📤 [STAFF API] DELETE ${url}`);
      
      // ✅ Ensure token is set
      ensureToken();
      
      const response = await staffApi.delete(url, config);
      console.log(`✅ [STAFF API] DELETE ${url} - Status: ${response.status}`);
      
      return response.data;
    } catch (error: any) {
      console.error(`❌ Staff API DELETE error for ${url}:`, error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('🔐 Staff session expired');
        staffStorage.clear();
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffData');
        
        if (window.location.pathname.includes('/staff-portal') && 
            !window.location.pathname.includes('/login')) {
          toast.error('Session expired. Please login again.');
          window.location.href = '/staff-portal/login';
        }
      }
      
      throw error;
    }
  };

  // ─── Set Token Manually ──────────────────────────────────────────────────
  const setToken = (token: string) => {
    if (token) {
      staffApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('✅ Staff token set in API headers');
    }
  };

  // ─── Clear Token ─────────────────────────────────────────────────────────
  const clearToken = () => {
    delete staffApi.defaults.headers.common['Authorization'];
    console.log('🧹 Staff token cleared from API headers');
  };

  // ─── Check if authenticated ─────────────────────────────────────────────
  const isAuthenticated = (): boolean => {
    const token = staffStorage.getToken() || localStorage.getItem('staffToken');
    return !!token;
  };

  // ─── Get Current Staff Data ─────────────────────────────────────────────
  const getCurrentStaff = () => {
    return staffStorage.getData() || JSON.parse(localStorage.getItem('staffData') || 'null');
  };

  return {
    get,
    post,
    put,
    patch,
    del,
    setToken,
    clearToken,
    isAuthenticated,
    getCurrentStaff,
    // ✅ Alias methods for convenience
    GET: get,
    POST: post,
    PUT: put,
    PATCH: patch,
    DELETE: del,
  };
};

// ─── Default Export ──────────────────────────────────────────────────────────
export default useStaffApi;