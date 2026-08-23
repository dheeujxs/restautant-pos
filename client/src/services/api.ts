// services/api.ts - COMPLETE WITH MASTER ADMIN

import axios from 'axios';
import { staffStorage, adminStorage, superAdminStorage } from '../utils/storage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Types ──────────────────────────────────────────────────────────────
export interface StaffSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEnabled: boolean;
  language: 'en' | 'hi' | 'ta' | 'te' | 'bn';
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD' | 'DD MMM YYYY';
  timeFormat: '12h' | '24h';
  compactView: boolean;
  autoRefresh: boolean;
  refreshInterval: 5 | 10 | 15 | 30 | 60;
}

// ============================================================
//  ─── MASTER ADMIN STORAGE ──────────────────────────────────
// ============================================================

// Add master admin storage
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

// ============================================================
//  ─── MASTER ADMIN API ──────────────────────────────────────
// ============================================================

export const masterAdminApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

masterAdminApi.interceptors.request.use(
  (config) => {
    const token = masterAdminStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

masterAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ [MASTER_ADMIN] API Error:', error.response?.status);
    if (error.response?.status === 401) {
      masterAdminStorage.clear();
      delete masterAdminApi.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);

// ============================================================
//  ─── STAFF API ─────────────────────────────────────────────
// ============================================================

export const staffApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

staffApi.interceptors.request.use(
  (config) => {
    const token = staffStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

staffApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ [STAFF] API Error:', error.response?.status);
    
    if (error.response?.status === 401) {
      console.warn('⚠️ Staff session expired, clearing token');
      staffStorage.clear();
      delete staffApi.defaults.headers.common['Authorization'];
    }
    
    return Promise.reject(error);
  }
);

// ============================================================
//  ─── SUPER ADMIN API ──────────────────────────────────────
// ============================================================

export const superAdminApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

superAdminApi.interceptors.request.use(
  (config) => {
    const token = superAdminStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

superAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ [SUPER_ADMIN] API Error:', error.response?.status);
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      console.warn('⚠️ Network error - keeping session alive');
    }
    return Promise.reject(error);
  }
);

// ============================================================
//  ─── ADMIN API ─────────────────────────────────────────────
// ============================================================

export const adminApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use(
  (config) => {
    const token = adminStorage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ [ADMIN] API Error:', error.response?.status);
    return Promise.reject(error);
  }
);

// ============================================================
//  ─── MASTER ADMIN METHODS ──────────────────────────────────
// ============================================================

export const masterAdminMethods = {
  // ─── Auth ──────────────────────────────────────────────────────────────
  register: async (data: any) => {
    console.log('📤 [MASTER_ADMIN] POST /master-admin/register');
    console.log('📤 Payload:', { ...data, password: '***', confirmPassword: '***' });
    try {
      const response = await masterAdminApi.post('/master-admin/register', data);
      console.log('📥 Response:', response.data);
      return response;
    } catch (error: any) {
      console.error('❌ Master Admin registration error:', error.response?.status, error.response?.data);
      throw error;
    }
  },

  login: async (data: any, rememberMe: boolean = true) => {
    console.log('📤 [MASTER_ADMIN] POST /master-admin/login');
    try {
      const response = await masterAdminApi.post('/master-admin/login', data);
      const token = response.data?.token || response.data?.data?.token;
      if (response.data?.success && token) {
        masterAdminStorage.setToken(token, rememberMe);
        masterAdminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('✅ Master Admin login successful');
      }
      return response;
    } catch (error: any) {
      console.error('❌ Master Admin login error:', error.response?.status);
      throw error;
    }
  },

  logout: () => {
    console.log('📤 [MASTER_ADMIN] Logout');
    masterAdminStorage.clear();
    delete masterAdminApi.defaults.headers.common['Authorization'];
    window.location.href = '/master-admin/login';
    return Promise.resolve();
  },

  getProfile: () => masterAdminApi.get('/master-admin/profile'),
  
  verifyEmail: (token: string) => masterAdminApi.get(`/master-admin/verify/${token}`),
  
  resendVerification: (email: string) => masterAdminApi.post('/master-admin/resend-verification', { email }),
  
  forgotPassword: (email: string) => masterAdminApi.post('/master-admin/forgot-password', { email }),
  
  resetPassword: (data: any) => masterAdminApi.post('/master-admin/reset-password', data),
};

// ============================================================
//  ─── STAFF METHODS ─────────────────────────────────────────
// ============================================================

export const staffMethods = {
  login: async (data: any, rememberMe: boolean = false) => {
    try {
      const response = await staffApi.post('/staff-portal/login', data);
      const token =
        response.data?.data?.staffToken ||
        response.data?.staffToken ||
        response.data?.token;

      if (response.data?.success && token) {
        staffStorage.setToken(token, rememberMe);
        staffApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      return response;
    } catch (error: any) {
      console.error('❌ Staff login error:', error.response?.status);
      throw new Error(error.response?.data?.error || 'Login failed. Please try again.');
    }
  },

  logout: () => {
    console.log('📤 [STAFF] Logout');
    staffStorage.clear();
    delete staffApi.defaults.headers.common['Authorization'];
    window.location.href = '/staff-portal/login';
    return Promise.resolve();
  },

  getProfile: () => staffApi.get('/staff-portal/profile'),

  // ─── Orders ──────────────────────────────────────────────────────────
  getOrders: (params?: any) => staffApi.get('/staff-portal/orders', { params }),
  getOrderById: (id: string) => staffApi.get(`/staff-portal/orders/${id}`),
  updateOrderStatus: (id: string, data: any) => staffApi.patch(`/staff-portal/orders/${id}/status`, data),
  kitchenAcknowledge: (id: string) => staffApi.patch(`/staff-portal/orders/${id}/kitchen-acknowledge`),
  requestReady: (id: string, notes?: string) => staffApi.post(`/staff-portal/orders/${id}/request-ready`, { notes }),

  // ─── Bills ───────────────────────────────────────────────────────────
  getBills: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.status) queryParams.append('paymentStatus', params.status);
    if (params?.search) queryParams.append('search', params.search);
    const url = `/staff-portal/bills${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return staffApi.get(url);
  },

  generateBill: (orderId: string) => staffApi.post(`/staff/orders/${orderId}/generate-bill`),

  // ─── KOT ─────────────────────────────────────────────────────────────
  getKOTStats: () => staffApi.get('/staff-portal/kot/stats'),
  getKOTQueue: (params?: any) => staffApi.get('/staff-portal/kot/queue', { params }),
  getKOTById: (id: string) => staffApi.get(`/staff-portal/kot/${id}`),
  updateKOTStatus: (id: string, data: any) => staffApi.put(`/staff-portal/kot/${id}/status`, data),
  bulkUpdateKOTStatus: (data: any) => staffApi.put('/staff-portal/kot/bulk/status', data),

  // ─── Menu ────────────────────────────────────────────────────────────
  getMenu: (params?: any) => staffApi.get('/staff-portal/menu', { params }),

  // ─── Dashboard & Reports ────────────────────────────────────────────
  getDashboard: () => staffApi.get('/staff-portal/dashboard'),
  getReports: (params?: any) => staffApi.get('/staff-portal/reports', { params }),

  // ─── Salary & Attendance ────────────────────────────────────────────
  getSalary: (params?: any) => staffApi.get('/staff-portal/salary', { params }),
  getAttendance: (params?: any) => staffApi.get('/staff-portal/attendance', { params }),

  // ─── Tables ──────────────────────────────────────────────────────────
  getTables: () => staffApi.get('/staff-portal/tables'),

  // ─── Settings ──────────────────────────────────────────────────────
  getSettings: (): Promise<{ data: { success: boolean; data: StaffSettings } }> =>
    staffApi.get('/staff-portal/settings'),

  updateSettings: (data: Partial<StaffSettings>): Promise<{ data: { success: boolean; data: StaffSettings } }> =>
    staffApi.patch('/staff-portal/settings', data),

  resetSettings: (): Promise<{ data: { success: boolean; data: StaffSettings } }> =>
    staffApi.post('/staff-portal/settings/reset'),
};

// ============================================================
//  ─── SUPER ADMIN METHODS ──────────────────────────────────
// ============================================================

export const superAdminMethods = {
  login: async (data: any, rememberMe: boolean = true) => {
    console.log('📤 [SUPER_ADMIN] POST /super-admin/login');
    try {
      const response = await superAdminApi.post('/super-admin/login', data);
      const token =
        response.data?.data?.accessToken ||
        response.data?.accessToken ||
        response.data?.token;

      if (response.data?.success && token) {
        superAdminStorage.setToken(token, rememberMe);
        superAdminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('✅ Super Admin login successful');
      }
      return response;
    } catch (error: any) {
      console.error('❌ Super Admin login error:', error.response?.status);
      throw new Error(error.response?.data?.error || 'Login failed. Please try again.');
    }
  },

  logout: () => {
    console.log('📤 [SUPER_ADMIN] Logout');
    superAdminStorage.clear();
    delete superAdminApi.defaults.headers.common['Authorization'];
    window.location.href = '/super-admin/login';
    return Promise.resolve();
  },

  getProfile: () => superAdminApi.get('/super-admin/profile'),
  refreshToken: (data: any) => superAdminApi.post('/super-admin/refresh-token', data),
  getDashboardStats: (params?: any) => superAdminApi.get('/super-admin/dashboard/stats', { params }),
  getRevenueOverview: (params?: any) => superAdminApi.get('/super-admin/revenue/overview', { params }),
  getRestaurants: (params?: any) => superAdminApi.get('/super-admin/restaurants', { params }),
  getRestaurantById: (id: string) => superAdminApi.get(`/super-admin/restaurants/${id}`),
  createRestaurant: (data: any) => superAdminApi.post('/super-admin/restaurants', data),
  updateRestaurant: (id: string, data: any) => superAdminApi.put(`/super-admin/restaurants/${id}`, data),
  deleteRestaurant: (id: string) => superAdminApi.delete(`/super-admin/restaurants/${id}`),
  getBranches: (params?: any) => superAdminApi.get('/super-admin/branches', { params }),
  getBranchById: (id: string) => superAdminApi.get(`/super-admin/branches/${id}`),
  createBranch: (data: any) => superAdminApi.post('/super-admin/branches', data),
  updateBranch: (id: string, data: any) => superAdminApi.put(`/super-admin/branches/${id}`, data),
  deleteBranch: (id: string) => superAdminApi.delete(`/super-admin/branches/${id}`),
  getAllStaff: (params?: Record<string, string>) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== 'undefined') {
          queryParams.append(key, value);
        }
      });
    }
    const url = `/super-admin/staff/all${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return superAdminApi.get(url);
  },
  getStaffRoles: () => superAdminApi.get('/staff/roles/list'),
  createStaff: (data: any) => superAdminApi.post('/super-admin/staff', data),
  updateStaff: (id: string, data: any) => superAdminApi.put(`/super-admin/staff/${id}`, data),
  deleteStaff: (id: string) => superAdminApi.delete(`/super-admin/staff/${id}`),
  toggleStaffStatus: (id: string) => superAdminApi.patch(`/super-admin/staff/${id}/toggle-status`),
  getDishes: (params?: any) => superAdminApi.get('/super-admin/dishes', { params }),
  createDish: (data: any) => superAdminApi.post('/super-admin/dishes', data),
  updateDish: (id: string, data: any) => superAdminApi.put(`/super-admin/dishes/${id}`, data),
  deleteDish: (id: string) => superAdminApi.delete(`/super-admin/dishes/${id}`),
  getSettings: () => superAdminApi.get('/super-admin/settings'),
  updateSettings: (data: any) => superAdminApi.put('/super-admin/settings', data),
  getPayments: (params?: any) => superAdminApi.get('/super-admin/payments', { params }),
  updatePaymentStatus: (id: string, status: string) => superAdminApi.patch(`/super-admin/payments/${id}/status`, { status }),
};

// ============================================================
//  ─── ADMIN METHODS ──────────────────────────────────────────
// ============================================================

export const adminMethods = {
  login: async (data: any, rememberMe: boolean = true) => {
    console.log('📤 [ADMIN] POST /auth/login');
    const response = await adminApi.post('/auth/login', data);
    const token = response.data?.token || response.data?.data?.token;
    if (response.data?.success && token) {
      adminStorage.setToken(token, rememberMe);
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return response;
  },

  logout: () => {
    console.log('📤 [ADMIN] Logout');
    adminStorage.clear();
    delete adminApi.defaults.headers.common['Authorization'];
    window.location.href = '/login';
    return Promise.resolve();
  },

  getProfile: () => adminApi.get('/admin/profile'),
  getDashboard: (params?: any) => adminApi.get('/admin/dashboard', { params }),
};

// ============================================================
//  ─── DEFAULT EXPORT ──────────────────────────────────────────
// ============================================================

export default {
  adminApi,
  staffApi,
  superAdminApi,
  masterAdminApi,
  staffMethods,
  superAdminMethods,
  adminMethods,
  masterAdminMethods,
};
