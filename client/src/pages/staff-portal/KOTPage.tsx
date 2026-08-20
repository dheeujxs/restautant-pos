// pages/staff-portal/KOTPage.tsx - COMPLETE FIXED VERSION

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Search, Clock, ChefHat, Flame,
  CheckCircle, AlertCircle, Users, Utensils,
  Loader2, Eye, Award, Printer, RefreshCw,
  Crown, AlertTriangle, XCircle, Play,
  Fingerprint, ListChecks, Package, Coffee,
  ShoppingBag, Truck, ChevronDown, ChevronUp,
  Filter, Plus, Minus, Edit, Trash, Save, X,
  ChevronLeft, ChevronRight, History, LayoutGrid,
  Bell, ThumbsUp,
  ClipboardCheck, Shield, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import { staffStorage } from '../../utils/storage';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import { useAuth } from '../../utils/AuthContext';

// ─── Helper to normalize role names ──────────────────────────────────────
// Roles can come back from the API as a plain string ("chef") OR as a
// populated object ({ name: "chef", ... }). This normalizes both forms.
const normalizeRoleName = (r: any): string => {
  if (typeof r === 'string') return r;
  if (r && typeof r === 'object' && typeof r.name === 'string') return r.name;
  return '';
};

// ─── Type Definitions ──────────────────────────────────────────────────────
interface KOTItem {
  _id: string;
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
  status: 'pending' | 'cooking' | 'done' | 'voided';
  cookingStartedAt?: string;
  doneAt?: string;
  prepTimeMinutes: number;
}

interface KOT {
  _id: string;
  kotNumber: string;
  orderId: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableId?: string;
  tableNumber?: string;
  floorName?: string;
  covers?: number;
  waiterName?: string;
  waiterId?: string;
  kotStation: string;
  platform?: string;
  deliveryOrderId?: string;
  riderETA?: string;
  items: KOTItem[];
  status: 'new' | 'acknowledged' | 'preparing' | 'partially_ready' | 'ready' | 'served' | 'cancelled';
  priority: 'normal' | 'urgent';
  priorityScore: number;
  isVip: boolean;
  allergyAlerts: string[];
  notes?: string;
  kotPrinted: boolean;
  isReprint: boolean;
  targetReadyAt: string;
  createdAt: string;
  prepStartedAt?: string;
  readyAt?: string;
  servedAt?: string;
  elapsedMinutes: number;
  isDelayed: boolean;
  actualPrepTimeMinutes?: number;
  kitchenAcknowledged?: boolean;
  readyRequested?: boolean;
  readyNotes?: string;
}

interface KOTStats {
  total: number;
  new: number;
  preparing: number;
  ready: number;
  delayed: number;
  vipPending: number;
  completed: number;
  cancelled: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const REFRESH_INTERVAL = 60000; // 60 seconds

const STATUS_COLORS: Record<string, string> = {
  'new': 'bg-blue-100 text-blue-700 border-blue-200',
  'acknowledged': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'preparing': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'partially_ready': 'bg-orange-100 text-orange-700 border-orange-200',
  'ready': 'bg-green-100 text-green-700 border-green-200',
  'served': 'bg-gray-100 text-gray-700 border-gray-200',
  'cancelled': 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  'new': 'New',
  'acknowledged': 'Acknowledged',
  'preparing': 'Preparing',
  'partially_ready': 'Partially Ready',
  'ready': 'Ready',
  'served': 'Served',
  'cancelled': 'Cancelled',
};

const stations = ['Main Kitchen', 'Tandoor', 'Bar', 'Cold Kitchen', 'Bakery'];

// ─── Component ─────────────────────────────────────────────────────────────
export default function KOTPage() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, hasPermission: hasAuthPermission } = useAuth();
  
  // ─── Permission Check ──────────────────────────────────────────────────
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [staffRole, setStaffRole] = useState<string>('');

  useEffect(() => {
    const checkPermission = () => {
      try {
        // Use AuthContext user data
        const permissions = user?.permissions || [];
        
        // Normalize the role - it could be a string or an object with a name property
        const rawRole = user?.role || user?.userType || '';
        const role = normalizeRoleName(rawRole);
        
        console.log('📋 KOTPage - User role:', role, 'raw:', rawRole);
        setStaffRole(role);

        const isKitchen = ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'].includes(role?.toLowerCase() || '');
        const hasKotPerm = hasPermission(permissions, PERMISSIONS.VIEW_KOT) || 
                          hasPermission(permissions, PERMISSIONS.UPDATE_KOT) ||
                          hasAuthPermission(PERMISSIONS.VIEW_KOT) ||
                          hasAuthPermission(PERMISSIONS.UPDATE_KOT);

        if (isKitchen || hasKotPerm || isSuperAdmin) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking KOT permissions:', error);
        setHasAccess(false);
      }
    };

    checkPermission();
  }, [user, isSuperAdmin, hasAuthPermission]);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [kots, setKots] = useState<KOT[]>([]);
  const [filteredKots, setFilteredKots] = useState<KOT[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'all'>('all');
  const [stats, setStats] = useState<KOTStats>({
    total: 0,
    new: 0,
    preparing: 0,
    ready: 0,
    delayed: 0,
    vipPending: 0,
    completed: 0,
    cancelled: 0,
  });
  const [selectedKOT, setSelectedKOT] = useState<KOT | null>(null);
  const [showKOTModal, setShowKOTModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [updatingKOT, setUpdatingKOT] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedKOT, setExpandedKOT] = useState<string | null>(null);
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [readyNotes, setReadyNotes] = useState('');
  const [selectedKOTForReady, setSelectedKOTForReady] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  
  // ─── Pagination State ────────────────────────────────────────────────────
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    pages: 0,
    hasMore: false,
  });
  const [allKots, setAllKots] = useState<KOT[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useRef<HTMLDivElement | null>(null);
  const isMounted = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  // ─── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  // ─── Data Fetching ──────────────────────────────────────────────────────
  const fetchKOTs = useCallback(async (pageNum = 1, append = false) => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;

    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      const limit = Math.min(pagination.limit, MAX_LIMIT);
      
      // ✅ Fetch ALL orders - show all orders regardless of status
      const response = await staffApi.get('/staff-portal/orders', {
        params: { 
          limit: 1000,
          showAll: 'true'
        }
      });
      
      console.log('📊 Orders API response:', response.data);
      
      let ordersData = [];
      if (response.data?.success) {
        ordersData = response.data.data?.orders || [];
      }
      
      console.log(`📊 Fetched ${ordersData.length} orders`);
      
      // ✅ Convert ALL orders to KOT format
      let kotsData: KOT[] = [];
      
      ordersData.forEach((order: any) => {
        // Map order status to KOT status
        let kotStatus: KOT['status'] = 'new';
        if (order.orderStatus === 'pending') kotStatus = 'new';
        else if (order.orderStatus === 'confirmed') kotStatus = 'acknowledged';
        else if (order.orderStatus === 'preparing') kotStatus = 'preparing';
        else if (order.orderStatus === 'ready') kotStatus = 'ready';
        else if (order.orderStatus === 'completed') kotStatus = 'served';
        else if (order.orderStatus === 'cancelled') kotStatus = 'cancelled';
        
        // ✅ Create KOT object from order - even if items are empty
        const kot: KOT = {
          _id: order._id,
          kotNumber: `KOT-${order.orderNumber || 'N/A'}`,
          orderId: order._id,
          orderNumber: order.orderNumber || 'N/A',
          orderType: order.orderType || 'dine-in',
          tableNumber: order.tableNumber || '',
          items: (order.items || []).map((item: any) => ({
            _id: item.productId || `item-${Math.random()}`,
            productId: item.productId,
            productName: item.productName || 'Unknown Item',
            quantity: item.quantity || 1,
            notes: item.notes || '',
            status: item.status || 'pending',
            prepTimeMinutes: item.prepTimeMinutes || 15,
          })),
          status: kotStatus,
          priority: order.isVip ? 'urgent' : 'normal',
          priorityScore: order.isVip ? 100 : 0,
          isVip: order.isVip || false,
          allergyAlerts: [],
          notes: order.notes || '',
          kotPrinted: false,
          isReprint: false,
          targetReadyAt: new Date(Date.now() + 15 * 60000).toISOString(),
          createdAt: order.createdAt || new Date().toISOString(),
          elapsedMinutes: Math.floor((Date.now() - new Date(order.createdAt || Date.now()).getTime()) / 60000),
          isDelayed: Math.floor((Date.now() - new Date(order.createdAt || Date.now()).getTime()) / 60000) > 20,
          kitchenAcknowledged: order.kitchenAcknowledged || false,
          readyRequested: order.readyRequested || false,
          readyNotes: order.readyNotes || '',
          kotStation: order.kotStation || 'Main Kitchen',
          waiterName: order.waiterName || '',
          waiterId: order.waiterId || '',
          covers: order.covers || 0,
        };
        kotsData.push(kot);
      });
      
      // ✅ Filter based on view mode
      let filteredData = kotsData;
      if (viewMode === 'active') {
        filteredData = kotsData.filter(k => 
          ['new', 'acknowledged', 'preparing', 'partially_ready', 'ready'].includes(k.status)
        );
      }
      // If viewMode === 'all', show ALL orders (no filtering)
      
      const totalItems = filteredData.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      
      // Paginate
      const start = (pageNum - 1) * limit;
      const end = start + limit;
      const paginatedKots = filteredData.slice(start, end);
      
      if (isMounted.current) {
        if (append) {
          setAllKots(prev => [...prev, ...paginatedKots]);
        } else {
          setAllKots(paginatedKots);
        }
        
        setPagination({
          page: pageNum,
          limit: limit,
          total: totalItems,
          pages: totalPages,
          hasMore: pageNum < totalPages,
        });
        
        // ✅ Apply filters to data
        let filtered = paginatedKots;
        
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(k =>
            k.kotNumber?.toLowerCase().includes(term) ||
            k.orderNumber?.toLowerCase().includes(term) ||
            k.tableNumber?.toLowerCase().includes(term) ||
            k.waiterName?.toLowerCase().includes(term)
          );
        }
        
        if (statusFilter !== 'all') {
          filtered = filtered.filter(k => k.status === statusFilter);
        }
        
        if (stationFilter !== 'all') {
          filtered = filtered.filter(k => k.kotStation === stationFilter);
        }
        
        if (priorityFilter !== 'all') {
          if (priorityFilter === 'vip') {
            filtered = filtered.filter(k => k.isVip);
          } else if (priorityFilter === 'urgent') {
            filtered = filtered.filter(k => k.priority === 'urgent');
          }
        }
        
        setKots(filtered);
        setFilteredKots(filtered);
        
        console.log(`✅ Found ${paginatedKots.length} KOTs, total: ${totalItems}, page: ${pageNum}/${totalPages}`);
      }
      
    } catch (error: any) {
      console.error('Error fetching KOTs:', error);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
      } else {
        setError(error.response?.data?.error || 'Failed to load KOTs');
        toast.error(error.response?.data?.error || 'Failed to load KOTs');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setLoadingMore(false);
      }
      isFetchingRef.current = false;
    }
  }, [navigate, pagination.limit, viewMode, searchTerm, statusFilter, stationFilter, priorityFilter]);

  // ─── Fetch Stats ──────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) return;
      
      const response = await staffApi.get('/staff-portal/kot/stats', {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      
      let statsData = response.data?.data || response.data;
      if (statsData) {
        setStats({
          total: statsData.total || 0,
          new: statsData.new || 0,
          preparing: statsData.preparing || 0,
          ready: statsData.ready || 0,
          delayed: statsData.delayed || 0,
          vipPending: statsData.vipPending || 0,
          completed: statsData.completed || 0,
          cancelled: statsData.cancelled || 0,
        });
      }
    } catch (error: any) {
      console.error('Error fetching KOT stats:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
      }
    }
  }, [navigate]);

  // ─── Initial Load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (hasAccess === true) {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        fetchKOTs(1, false);
        fetchStats();
      }
      
      intervalRef.current = setInterval(() => {
        if (!isFetchingRef.current) {
          fetchKOTs(1, false);
          fetchStats();
        }
      }, REFRESH_INTERVAL);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [hasAccess, fetchKOTs, fetchStats]);

  // ─── View mode change - reset to page 1 ──────────────────────────────
  useEffect(() => {
    if (initialLoadDone.current && hasAccess === true) {
      fetchKOTs(1, false);
    }
  }, [viewMode, hasAccess]);

  // ─── Filter changes ────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (!loading && !isFetchingRef.current && initialLoadDone.current && hasAccess === true) {
        fetchKOTs(1, false);
      }
    }, 600);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [statusFilter, stationFilter, priorityFilter, hasAccess]);

  // ─── Search debounce ──────────────────────────────────────────────────
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (!loading && !isFetchingRef.current && initialLoadDone.current && hasAccess === true) {
        fetchKOTs(1, false);
      }
    }, 800);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [searchTerm, hasAccess]);

  // ─── Infinite Scroll Observer ─────────────────────────────────────────
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!pagination.hasMore || loadingMore || loading || filteredKots.length === 0 || isFetchingRef.current || hasAccess !== true) {
      return;
    }

    const currentLastItem = lastItemRef.current;
    if (!currentLastItem) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !loadingMore && !loading && !isFetchingRef.current && hasAccess === true) {
          const nextPage = pagination.page + 1;
          fetchKOTs(nextPage, true);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(currentLastItem);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [pagination.hasMore, loadingMore, loading, filteredKots.length, fetchKOTs, pagination.page, hasAccess]);

  // ─── Handle Refresh ──────────────────────────────────────────────────
  const handleRefresh = () => {
    if (isFetchingRef.current) {
      toast.info('Already loading...');
      return;
    }
    fetchKOTs(1, false);
    fetchStats();
    toast.success('Refreshed');
  };

  // ─── Punch In - Navigate to PunchInPrepPage ──────────────────────────
  const handlePunchIn = (orderId: string, kotId: string) => {
    if (!orderId || !kotId) {
      toast.error('Invalid order or KOT ID');
      return;
    }
    
    const staffToken = staffStorage.getToken();
    if (!staffToken) {
      toast.error('Please login as staff first');
      navigate('/staff-portal/login');
      return;
    }
    
    navigate(`/staff-portal/punch-in/${kotId}`);
  };

  // ─── Start Cooking ────────────────────────────────────────────────────
  const handleStartCooking = async (orderId: string) => {
    if (!orderId) {
      toast.error('Invalid order ID');
      return;
    }
    
    setUpdatingKOT(orderId);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      const response = await staffApi.patch(
        `/staff-portal/orders/${orderId}/status`,
        { orderStatus: 'preparing' },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      
      if (response.data.success) {
        toast.success('Cooking started!');
        await fetchKOTs(pagination.page, false);
      }
    } catch (error: any) {
      console.error('Start cooking error:', error.response?.data);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to start cooking');
    } finally {
      setUpdatingKOT(null);
    }
  };

  // ─── Mark Served ──────────────────────────────────────────────────────
  const handleMarkServed = async (orderId: string) => {
    if (!orderId) {
      toast.error('Invalid order ID');
      return;
    }
    
    setUpdatingKOT(orderId);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      const response = await staffApi.patch(
        `/staff-portal/orders/${orderId}/status`,
        { orderStatus: 'completed' },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      
      if (response.data.success) {
        toast.success('✅ Order served successfully!');
        await fetchKOTs(pagination.page, false);
      }
    } catch (error: any) {
      console.error('Mark served error:', error.response?.data);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to mark as served');
    } finally {
      setUpdatingKOT(null);
    }
  };

  // ─── Request Ready ────────────────────────────────────────────────────
  const handleRequestReady = async (orderId: string) => {
    if (!orderId) {
      toast.error('Invalid order ID');
      return;
    }
    
    setConfirmingAction(true);
    try {
      const staffToken = staffStorage.getToken();
      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }
      
      const response = await staffApi.post(
        `/staff-portal/orders/${orderId}/request-ready`,
        { notes: readyNotes || '' },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      
      if (response.data.success) {
        toast.success(`✅ Ready request sent. Waiting for manager approval.`);
        setShowReadyModal(false);
        setReadyNotes('');
        setSelectedKOTForReady(null);
        await fetchKOTs(pagination.page, false);
      }
    } catch (error: any) {
      console.error('Request ready error:', error.response?.data);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to request ready');
    } finally {
      setConfirmingAction(false);
      setUpdatingKOT(null);
    }
  };

  // ─── UI Helpers ───────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'dine-in': return <Coffee size={14} />;
      case 'takeaway': return <ShoppingBag size={14} />;
      case 'delivery': return <Truck size={14} />;
      default: return <Users size={14} />;
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getElapsedTime = (createdAt: string) => {
    if (!createdAt) return '';
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const getWaitTime = (kot: KOT) => {
    if (kot.status === 'served' || kot.status === 'cancelled') {
      return { text: '', color: 'text-gray-400', show: false };
    }
    
    const createdAt = kot.createdAt;
    if (!createdAt) return { text: '0 min', color: 'text-gray-500', show: true };
    
    const minutes = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 5) return { text: `${minutes} min`, color: 'text-green-600', show: true };
    if (minutes < 15) return { text: `${minutes} min`, color: 'text-yellow-600', show: true };
    if (minutes < 30) return { text: `${minutes} min`, color: 'text-orange-600', show: true };
    return { text: `${minutes} min`, color: 'text-red-600', show: true };
  };

  const handlePrintKOT = (kot: KOT) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOT - ${kot.kotNumber}</title>
        <style>
          body { font-family: monospace; padding: 20px; }
          .container { max-width: 300px; margin: 0 auto; border: 2px dashed #333; padding: 15px; }
          .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 10px; }
          .vip { color: #b45309; font-weight: bold; }
          .item { margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
          .qty { background: #f97316; color: #fff; padding: 2px 6px; border-radius: 4px; margin-right: 8px; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #333; font-size: 10px; }
          .allergy { color: #dc2626; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 18px; font-weight: bold; color: #f97316;">🍳 KITCHEN ORDER TICKET</div>
            <div><strong>${kot.kotNumber}</strong></div>
            <div>Order: ${kot.orderNumber}</div>
            ${kot.isVip ? '<div class="vip">⭐ VIP ORDER ⭐</div>' : ''}
          </div>
          <div><strong>Type:</strong> ${kot.orderType.toUpperCase()}</div>
          ${kot.tableNumber ? `<div><strong>Table:</strong> ${kot.tableNumber}</div>` : ''}
          ${kot.waiterName ? `<div><strong>Waiter:</strong> ${kot.waiterName}</div>` : ''}
          ${kot.covers ? `<div><strong>Covers:</strong> ${kot.covers}</div>` : ''}
          ${kot.kotStation ? `<div><strong>Station:</strong> ${kot.kotStation}</div>` : ''}
          <div style="margin: 12px 0"><strong>ITEMS:</strong></div>
          ${kot.items.map(item => `
            <div class="item">
              <span class="qty">${item.quantity}×</span> ${item.productName}
              ${item.notes ? `<br/><small>📝 ${item.notes}</small>` : ''}
            </div>
          `).join('')}
          ${kot.allergyAlerts?.length > 0 ? `
            <div style="margin: 10px 0; padding: 8px; background: #fee2e2; border-radius: 4px;">
              <strong style="color: #dc2626;">⚠️ Allergies:</strong>
              ${kot.allergyAlerts.join(', ')}
            </div>
          ` : ''}
          ${kot.notes ? `<div><strong>Notes:</strong><br/>${kot.notes}</div>` : ''}
          <div class="footer">Created: ${new Date(kot.createdAt).toLocaleString()}</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handleChangeLimit = (newLimit: number) => {
    const validLimit = Math.min(newLimit, MAX_LIMIT);
    setPagination(prev => ({ ...prev, limit: validLimit, page: 1 }));
    fetchKOTs(1, false);
  };

  const isCompleted = (status: string) => {
    return status === 'served' || status === 'cancelled';
  };

  // ─── Get button for KOT status ──────────────────────────────────────
  const getKOTActionButton = (kot: KOT) => {
    const isUpdating = updatingKOT === kot._id;
    const status = kot.status;
    
    if (isCompleted(status)) {
      return null;
    }
    
    if (status === 'new' || status === 'acknowledged' || status === 'preparing' || status === 'partially_ready') {
      return (
        <button
          onClick={() => handlePunchIn(kot.orderId, kot._id)}
          disabled={isUpdating}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition disabled:opacity-50"
        >
          <Fingerprint size={14} />
          Punch In
        </button>
      );
    }
    
    if (status === 'ready') {
      return (
        <button
          onClick={() => handleMarkServed(kot.orderId)}
          disabled={isUpdating}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 transition disabled:opacity-50"
        >
          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Mark Served
        </button>
      );
    }
    
    return null;
  };

  // ─── ACCESS DENIED STATE ──────────────────────────────────────────────
  if (hasAccess === false) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Lock size={40} className="text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Access Denied</h3>
          <p className="text-gray-500 mt-2 text-sm">
            You don't have permission to view the KOT page. 
            This page is only accessible to kitchen staff and managers.
          </p>
          <button
            onClick={() => navigate('/staff-portal/dashboard')}
            className="mt-6 px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition shadow-md shadow-orange-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading State ─────────────────────────────────────────────────────
  if (loading && hasAccess === true) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading KOTs...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────
  if (error && hasAccess === true) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">Error Loading KOTs</h3>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Stats for display ──────────────────────────────────────────────
  const displayStats = {
    total: stats.total || pagination.total || 0,
    active: stats.new + stats.preparing + stats.ready || 0,
    new: stats.new || 0,
    preparing: stats.preparing || 0,
    ready: stats.ready || 0,
    delayed: stats.delayed || 0,
    vipPending: stats.vipPending || 0,
    completed: stats.completed || 0,
    cancelled: stats.cancelled || 0,
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList size={24} className="text-orange-500" />
              Kitchen Order Tickets
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {viewMode === 'active' 
                ? `Showing ${filteredKots.length} active KOTs` 
                : `Showing ${filteredKots.length} of ${pagination.total} KOTs`}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
              <button
                onClick={() => setViewMode('active')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'active' 
                    ? 'bg-orange-500 text-white' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Flame size={14} /> Active
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'all' 
                    ? 'bg-orange-500 text-white' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <History size={14} /> All ({pagination.total})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Show:</label>
              <select
                value={pagination.limit}
                onChange={(e) => handleChangeLimit(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* ─── Stats Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-gray-800">{displayStats.total}</p>
            <p className="text-xs text-gray-500">Total Orders</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-blue-600">{displayStats.new}</p>
            <p className="text-xs text-gray-500">New</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-yellow-600">{displayStats.preparing}</p>
            <p className="text-xs text-gray-500">Preparing</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-green-600">{displayStats.ready}</p>
            <p className="text-xs text-gray-500">Ready</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-red-600">{displayStats.delayed}</p>
            <p className="text-xs text-gray-500">Delayed</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-amber-600">{displayStats.vipPending}</p>
            <p className="text-xs text-gray-500">VIP Pending</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-gray-600">{displayStats.completed + displayStats.cancelled}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>

        {/* ─── Filters ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by KOT #, Order #, Table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Filter size={14} />
              Filters
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button
              onClick={() => setPriorityFilter(prev => prev === 'vip' ? 'all' : 'vip')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
                priorityFilter === 'vip'
                  ? 'bg-yellow-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Crown size={14} />
              VIP Only
            </button>
            <button
              onClick={() => setPriorityFilter(prev => prev === 'urgent' ? 'all' : 'urgent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
                priorityFilter === 'urgent'
                  ? 'bg-red-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle size={14} />
              Urgent
            </button>
          </div>
          {showFilters && (
            <div className="border-t border-gray-100 p-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="preparing">Preparing</option>
                  <option value="partially_ready">Partially Ready</option>
                  <option value="ready">Ready</option>
                  <option value="served">Served</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-gray-500 mb-1 block">Station</label>
                <select
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="all">All Stations</option>
                  {stations.map(station => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ─── KOT Grid ────────────────────────────────────────────────────── */}
        {filteredKots.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">No KOTs found</h3>
            <p className="text-gray-400 text-sm mt-1">
              {viewMode === 'active' 
                ? 'No active KOTs. Great job! 🎉' 
                : pagination.total === 0 ? 'No orders have been placed yet' : 'Try adjusting your filters'}
            </p>
            {pagination.total === 0 && (
              <button
                onClick={() => navigate('/pos')}
                className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Go to POS
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredKots.map((kot, index) => {
                const waitTime = getWaitTime(kot);
                const isUpdating = updatingKOT === kot._id;
                const isCompleted = kot.status === 'served' || kot.status === 'cancelled';
                const isLastItem = index === filteredKots.length - 1;
                const isExpanded = expandedKOT === kot._id;
                const isDelayed = kot.isDelayed && !isCompleted;
                const hasRequestedReady = kot.readyRequested || false;

                return (
                  <div
                    key={kot._id}
                    ref={isLastItem ? lastItemRef : null}
                    className={`bg-white rounded-xl shadow-sm border overflow-hidden transition hover:shadow-md ${
                      kot.isVip ? 'border-yellow-300 bg-yellow-50/30' : 
                      isDelayed ? 'border-red-300 bg-red-50/30' :
                      isCompleted ? 'opacity-75' :
                      'border-gray-100'
                    } ${isCompleted && kot.status === 'cancelled' ? 'border-red-200' : ''}`}
                  >
                    {/* Header */}
                    <div className={`p-4 border-b flex justify-between items-center ${
                      kot.isVip ? 'bg-yellow-50' : 
                      isDelayed ? 'bg-red-50' : 
                      isCompleted ? 'bg-gray-50' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getOrderTypeIcon(kot.orderType)}
                          <span className="font-mono text-sm font-bold text-gray-800">
                            #{kot.kotNumber}
                          </span>
                        </div>
                        {kot.isVip && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">
                            VIP
                          </span>
                        )}
                        {isDelayed && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                            Delayed
                          </span>
                        )}
                        {hasRequestedReady && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Approval Pending
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white">
                            {kot.status === 'served' ? '✅ Served' : '❌ Cancelled'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(kot.status)}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Order #{kot.orderNumber}</p>
                          {kot.tableNumber && <p className="text-sm text-gray-600">Table {kot.tableNumber}</p>}
                          {kot.waiterName && <p className="text-sm text-gray-600">👨‍💼 {kot.waiterName}</p>}
                          <p className="text-xs text-gray-400 mt-1">{formatTime(kot.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Wait Time</p>
                          {waitTime.show ? (
                            <p className={`text-sm font-semibold ${waitTime.color}`}>{waitTime.text}</p>
                          ) : (
                            <p className="text-sm font-semibold text-green-600">Ready!</p>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
                        {kot.items.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center">No items in this order</p>
                        ) : (
                          kot.items.slice(0, isExpanded ? undefined : 5).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
                              <span className="text-gray-600">
                                {item.quantity}× {item.productName}
                              </span>
                            </div>
                          ))
                        )}
                        {kot.items.length > 5 && !isExpanded && (
                          <button 
                            onClick={() => setExpandedKOT(isExpanded ? null : kot._id)} 
                            className="text-xs text-orange-500 hover:text-orange-600 mt-1"
                          >
                            + {kot.items.length - 5} more
                          </button>
                        )}
                      </div>

                      {/* Allergies & Notes */}
                      {kot.allergyAlerts && kot.allergyAlerts.length > 0 && (
                        <div className="mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle size={12} /> Allergies: {kot.allergyAlerts.join(', ')}
                          </p>
                        </div>
                      )}
                      {kot.notes && (
                        <div className="mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-xs text-yellow-600">📝 {kot.notes}</p>
                        </div>
                      )}

                      {/* ─── ACTIONS ─────────────────────────────────────────── */}
                      <div className="flex gap-2 flex-wrap mt-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setSelectedKOT(kot);
                            setShowKOTModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                        >
                          <Eye size={14} />
                          Details
                        </button>

                        <button
                          onClick={() => handlePrintKOT(kot)}
                          className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                        >
                          <Printer size={14} />
                          Print
                        </button>

                        {!isCompleted && getKOTActionButton(kot)}
                      </div>
                    </div>

                    {/* Progress Indicator for active orders */}
                    {!isCompleted && (
                      <div className="px-4 pb-3">
                        <div className="flex gap-1">
                          {['new', 'acknowledged', 'preparing', 'ready', 'served'].map((step, i) => {
                            const stepIdx = ['new', 'acknowledged', 'preparing', 'ready', 'served'].indexOf(kot.status);
                            const done = i < stepIdx;
                            const active = i === stepIdx;
                            return (
                              <div key={step} className="flex-1">
                                <div className={`h-1 rounded-full ${done ? 'bg-green-500' : active ? 'bg-orange-500' : 'bg-gray-200'}`} />
                              </div>
                            );
                          })}
                        </div>
                        {kot.status === 'ready' && (
                          <p className="text-xs text-green-600 mt-2 text-center flex items-center justify-center gap-1">
                            <Bell size={12} /> Ready to serve
                          </p>
                        )}
                        {kot.status === 'preparing' && hasRequestedReady && (
                          <p className="text-xs text-blue-600 mt-2 text-center flex items-center justify-center gap-1">
                            <Clock size={12} className="animate-pulse" /> Waiting for manager approval
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Loading More Indicator ────────────────────────────────── */}
            {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 size={24} className="animate-spin text-orange-500" />
                <span className="ml-2 text-sm text-gray-500">Loading more...</span>
              </div>
            )}

            {/* ─── Pagination Info ────────────────────────────────────────── */}
            {pagination.total > 0 && (
              <div className="flex justify-between items-center mt-6 px-2">
                <p className="text-sm text-gray-500">
                  Showing {filteredKots.length} of {pagination.total} KOTs
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchKOTs(pagination.page - 1, false)}
                    disabled={pagination.page <= 1 || loading}
                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => fetchKOTs(pagination.page + 1, false)}
                    disabled={!pagination.hasMore || loading}
                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Request Ready Modal ────────────────────────────────────────── */}
      {showReadyModal && selectedKOTForReady && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReadyModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ClipboardCheck size={20} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Request Ready to Serve</h3>
                  <p className="text-sm text-gray-500">Order #{kots.find(k => k._id === selectedKOTForReady)?.orderNumber || 'Unknown'}</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Items:</span>
                  <span className="font-semibold text-gray-800">
                    {kots.find(k => k._id === selectedKOTForReady)?.items.length || 0} items
                  </span>
                </div>
                {kots.find(k => k._id === selectedKOTForReady)?.isVip && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded-lg">
                    <Crown size={14} className="text-amber-500" />
                    <span className="text-xs font-medium text-amber-700">VIP Customer - Priority</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preparation Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={readyNotes}
                  onChange={(e) => setReadyNotes(e.target.value)}
                  placeholder="e.g., Extra spicy, No onions, Special plating..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              
              <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-yellow-700">Requesting approval will:</p>
                    <ul className="text-xs text-yellow-600 mt-1 space-y-1 list-disc list-inside">
                      <li>Send request to manager for approval</li>
                      <li>Order will be marked as "Ready" ONLY after manager approves</li>
                      <li>Kitchen cannot mark ready directly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t flex gap-3 bg-gray-50">
              <button
                onClick={() => setShowReadyModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestReady(selectedKOTForReady)}
                disabled={confirmingAction}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-green-600 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {confirmingAction ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ThumbsUp size={16} />
                )}
                Request Manager Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── KOT Detail Modal ────────────────────────────────────────────── */}
      {showKOTModal && selectedKOT && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowKOTModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-xl max-w-2xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className={`p-5 border-b flex justify-between items-center ${
                selectedKOT.isVip ? 'bg-yellow-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <ClipboardList size={24} className="text-orange-500" />
                  <h3 className="text-lg font-bold text-gray-800">KOT Details</h3>
                  {selectedKOT.isVip && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 text-white">VIP</span>
                  )}
                </div>
                <button onClick={() => setShowKOTModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 mb-5 pb-4 border-b border-gray-100">
                  <div><p className="text-xs text-gray-400">KOT Number</p><p className="font-mono font-semibold">#{selectedKOT.kotNumber}</p></div>
                  <div><p className="text-xs text-gray-400">Order Number</p><p className="font-mono font-semibold">#{selectedKOT.orderNumber}</p></div>
                  <div><p className="text-xs text-gray-400">Order Type</p><p className="capitalize flex items-center gap-1">{getOrderTypeIcon(selectedKOT.orderType)}{selectedKOT.orderType}</p></div>
                  <div><p className="text-xs text-gray-400">Table</p><p>{selectedKOT.tableNumber || 'N/A'}</p></div>
                  <div><p className="text-xs text-gray-400">Waiter</p><p>{selectedKOT.waiterName || 'N/A'}</p></div>
                  <div><p className="text-xs text-gray-400">Covers</p><p>{selectedKOT.covers || 'N/A'}</p></div>
                  <div><p className="text-xs text-gray-400">Station</p><p>{selectedKOT.kotStation}</p></div>
                  <div><p className="text-xs text-gray-400">Status</p><span>{getStatusBadge(selectedKOT.status)}</span></div>
                  <div><p className="text-xs text-gray-400">Elapsed</p><p>{selectedKOT.elapsedMinutes} min</p></div>
                  <div><p className="text-xs text-gray-400">Priority</p><p>{selectedKOT.isVip ? '⭐ VIP' : selectedKOT.priority === 'urgent' ? '🔴 Urgent' : 'Normal'}</p></div>
                </div>

                <h4 className="font-semibold text-gray-800 mb-3">Items</h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden mb-5">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr><th className="px-4 py-2 text-left">Item</th><th className="px-4 py-2 text-center">Qty</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2 text-right">Prep Time</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedKOT.items.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400">No items in this order</td></tr>
                      ) : (
                        selectedKOT.items.map((item) => (
                          <tr key={item._id}>
                            <td className="px-4 py-2">
                              {item.productName}
                              {item.notes && <p className="text-xs text-amber-500">📝 {item.notes}</p>}
                            </td>
                            <td className="px-4 py-2 text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-center">{getStatusBadge(item.status)}</td>
                            <td className="px-4 py-2 text-right">{item.prepTimeMinutes || 15}m</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedKOT.allergyAlerts?.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle size={14} /> Allergies: {selectedKOT.allergyAlerts.join(', ')}
                    </p>
                  </div>
                )}
                {selectedKOT.notes && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-600">📝 {selectedKOT.notes}</p>
                  </div>
                )}
              </div>

              <div className="p-5 bg-gray-50 border-t flex flex-wrap gap-2">
                <button onClick={() => setShowKOTModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                  Close
                </button>
                <button onClick={() => handlePrintKOT(selectedKOT)} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2">
                  <Printer size={16} /> Print KOT
                </button>

                {selectedKOT.status !== 'served' && selectedKOT.status !== 'cancelled' && getKOTActionButton(selectedKOT)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}