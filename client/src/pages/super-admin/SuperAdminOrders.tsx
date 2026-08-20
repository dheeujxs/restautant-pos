// pages/super-admin/SuperAdminOrders.tsx - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Filter, Eye, RefreshCw,
  Clock, CheckCircle, XCircle, Loader2,
  Coffee, ShoppingBag as TakeawayIcon, Truck,
  Users, Calendar, ChevronDown, ChevronUp,
  AlertCircle, Printer, Download, FileText,
  Edit, Trash2, MoreVertical, DollarSign, XIcon,
  Store, MapPin, Building2, LayoutGrid, List,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminApi } from '../../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────
interface OrderItem {
  _id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  roundNumber?: number;
  personName?: string;
  seatNumber?: number;
  branchId?: string;
  branchName?: string;
  restaurantId?: string;
  restaurantName?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableId?: string;
  tableNumber?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerLandmark?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  total: number;
  orderStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod: 'cash' | 'card' | 'upi' | 'online';
  restaurantId?: string;
  restaurantName?: string;
  branchId?: string;
  branchName?: string;
  createdAt: string;
  updatedAt: string;
  isVip: boolean;
  vipNotes?: string;
  notes?: string;
  currentRound: number;
  kotPrinted: boolean;
  kitchenAcknowledged: boolean;
  createdBy?: string;
  createdByName?: string;
}

interface Branch {
  _id: string;
  name: string;
  restaurantId: string;
  restaurantName?: string;
  code?: string;
  status?: string;
  isActive?: boolean;
}

interface Restaurant {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'confirmed': 'bg-blue-100 text-blue-700 border-blue-200',
  'preparing': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'ready': 'bg-green-100 text-green-700 border-green-200',
  'completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'cancelled': 'bg-red-100 text-red-700 border-red-200',
  'refunded': 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_ICONS: Record<string, JSX.Element> = {
  'pending': <Clock size={14} />,
  'confirmed': <CheckCircle size={14} />,
  'preparing': <Clock size={14} />,
  'ready': <CheckCircle size={14} />,
  'completed': <CheckCircle size={14} />,
  'cancelled': <XCircle size={14} />,
  'refunded': <XCircle size={14} />,
};

const STATUS_LABELS: Record<string, string> = {
  'pending': 'Pending',
  'confirmed': 'Confirmed',
  'preparing': 'Preparing',
  'ready': 'Ready',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'refunded': 'Refunded',
};

const STATUS_ORDER: string[] = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded'];

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-700',
  'paid': 'bg-green-100 text-green-700',
  'refunded': 'bg-gray-100 text-gray-700',
};

const ORDER_TYPE_ICONS: Record<string, JSX.Element> = {
  'dine-in': <Coffee size={14} />,
  'takeaway': <TakeawayIcon size={14} />,
  'delivery': <Truck size={14} />,
};

const ITEMS_PER_PAGE = 10;

// ─── Main Component ──────────────────────────────────────────────────────
export default function SuperAdminOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [restaurantFilter, setRestaurantFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
    refunded: 0,
  });
  const [totalStats, setTotalStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    todayOrders: 0,
    todayRevenue: 0,
  });

  // ─── Fetch All Restaurants ──────────────────────────────────────────────
  const fetchAllRestaurants = async () => {
    try {
      const response = await superAdminApi.get('/super-admin/restaurants?limit=1000');
      if (response.data?.success) {
        let restaurantsData = [];
        if (response.data.data?.restaurants) {
          restaurantsData = response.data.data.restaurants;
        } else if (response.data.data) {
          restaurantsData = response.data.data;
        } else if (Array.isArray(response.data.restaurants)) {
          restaurantsData = response.data.restaurants;
        }
        setRestaurants(restaurantsData);
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    }
  };

  // ─── Fetch All Branches ──────────────────────────────────────────────────
  const fetchAllBranches = async () => {
    try {
      const response = await superAdminApi.get('/super-admin/branches?limit=1000');
      if (response.data?.success) {
        let branchesData = [];
        if (response.data.data?.branches) {
          branchesData = response.data.data.branches;
        } else if (response.data.data) {
          branchesData = response.data.data;
        } else if (Array.isArray(response.data.branches)) {
          branchesData = response.data.branches;
        }
        
        const formattedBranches = branchesData.map((b: any) => ({
          _id: b._id || b.id,
          name: b.name || b.branchName || 'Unnamed Branch',
          restaurantId: b.restaurantId?._id || b.restaurantId || b.restaurant_id,
          restaurantName: b.restaurantName || b.restaurantId?.name || 'Unknown',
          code: b.code || b.branchCode || '',
          status: b.status || 'active',
          isActive: b.isActive !== undefined ? b.isActive : true,
        }));
        
        setBranches(formattedBranches);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  // ─── Fetch Orders ──────────────────────────────────────────────────────
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 1000 };
      
      if (statusFilter !== 'all') params.orderStatus = statusFilter;
      if (orderTypeFilter !== 'all') params.orderType = orderTypeFilter;
      if (restaurantFilter !== 'all') params.restaurantId = restaurantFilter;
      if (branchFilter !== 'all') params.branchId = branchFilter;
      
      console.log('📦 Fetching orders with params:', params);
      
      const response = await superAdminApi.get('/super-admin/orders', { params });
      console.log('📦 Orders API Response:', response.data);

      let ordersData: Order[] = [];
      let statsData = {};
      
      if (response.data?.success) {
        if (response.data.data?.orders) {
          ordersData = response.data.data.orders;
        } else if (Array.isArray(response.data.data)) {
          ordersData = response.data.data;
        } else if (response.data.orders) {
          ordersData = response.data.orders;
        }
        
        if (response.data.data?.stats) {
          statsData = response.data.data.stats;
          setTotalStats({
            totalOrders: statsData.totalOrders || 0,
            totalRevenue: statsData.totalRevenue || 0,
            pendingOrders: statsData.pendingOrders || 0,
            preparingOrders: statsData.preparingOrders || 0,
            completedOrders: statsData.completedOrders || 0,
            cancelledOrders: statsData.cancelledOrders || 0,
            todayOrders: statsData.todayOrders || 0,
            todayRevenue: statsData.todayRevenue || 0,
          });
        }
      }

      // ✅ Process orders - USE BRANCH FROM ITEMS (MOST RELIABLE)
      const processedOrders = ordersData.map((order: any) => {
        // Default to order's branch data
        let branchName = order.branchName || 'Unknown Branch';
        let restaurantName = order.restaurantName || 'Unknown Restaurant';
        let branchId = order.branchId;
        let restaurantId = order.restaurantId;
        
        // ✅ If order has items, use branch from first item
        if (order.items && order.items.length > 0) {
          const firstItem = order.items[0];
          if (firstItem.branchName && firstItem.branchName !== 'Unknown Branch' && firstItem.branchName !== 'Main Branch') {
            branchName = firstItem.branchName;
            branchId = firstItem.branchId || order.branchId;
            console.log(`📍 Order ${order.orderNumber}: Using branch from items: ${branchName}`);
          }
          if (firstItem.restaurantName && firstItem.restaurantName !== 'Unknown Restaurant') {
            restaurantName = firstItem.restaurantName;
            restaurantId = firstItem.restaurantId || order.restaurantId;
          }
        }
        
        return {
          ...order,
          branchName: branchName,
          restaurantName: restaurantName,
          branchId: branchId,
          restaurantId: restaurantId,
          // Keep original data for debugging
          _originalBranchName: order.branchName,
          _itemBranchName: order.items?.[0]?.branchName,
        };
      });

      console.log(`✅ Setting ${processedOrders.length} orders`);
      if (processedOrders.length > 0) {
        console.log('📋 Sample processed order:', {
          orderNumber: processedOrders[0]?.orderNumber,
          branchName: processedOrders[0]?.branchName,
          restaurantName: processedOrders[0]?.restaurantName,
          originalBranchName: processedOrders[0]?._originalBranchName,
          itemBranchName: processedOrders[0]?._itemBranchName,
        });
      }
      
      setOrders(processedOrders);
      calculateStats(processedOrders);

    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // ─── Calculate Stats ──────────────────────────────────────────────────
  const calculateStats = (ordersData: Order[]) => {
    const statsData = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0,
    };
    ordersData.forEach(order => {
      if (statsData[order.orderStatus as keyof typeof statsData] !== undefined) {
        statsData[order.orderStatus as keyof typeof statsData]++;
      }
    });
    setStats(statsData);
  };

  // ─── Initial Load ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchOrders(),
      fetchAllRestaurants(),
      fetchAllBranches(),
    ]);
  }, []);

  // ─── Update filtered branches when restaurant filter changes ──────────
  useEffect(() => {
    if (restaurantFilter !== 'all') {
      const filtered = branches.filter(b => b.restaurantId === restaurantFilter);
      setFilteredBranches(filtered);
      if (branchFilter !== 'all') {
        const branchExists = filtered.some(b => b._id === branchFilter);
        if (!branchExists) {
          setBranchFilter('all');
        }
      }
    } else {
      setFilteredBranches(branches);
    }
  }, [restaurantFilter, branches]);

  // ─── Filter Orders ─────────────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...orders];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber?.toLowerCase().includes(term) ||
        o.customerName?.toLowerCase().includes(term) ||
        o.customerPhone?.includes(term) ||
        o.tableNumber?.toLowerCase().includes(term) ||
        o.restaurantName?.toLowerCase().includes(term) ||
        o.branchName?.toLowerCase().includes(term) ||
        // Also search in items
        o.items?.some(item => item.productName?.toLowerCase().includes(term))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.orderStatus === statusFilter);
    }

    if (orderTypeFilter !== 'all') {
      filtered = filtered.filter(o => o.orderType === orderTypeFilter);
    }

    if (restaurantFilter !== 'all') {
      filtered = filtered.filter(o => o.restaurantId === restaurantFilter);
    }

    if (branchFilter !== 'all') {
      filtered = filtered.filter(o => o.branchId === branchFilter);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, searchTerm, statusFilter, orderTypeFilter, restaurantFilter, branchFilter]);

  // ─── Pagination ──────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // ─── Clear All Filters ──────────────────────────────────────────────────
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setOrderTypeFilter('all');
    setRestaurantFilter('all');
    setBranchFilter('all');
    setCurrentPage(1);
  };

  // ─── Format Helpers ──────────────────────────────────────────────────
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_ICONS[status]}
      {STATUS_LABELS[status] || status}
    </span>
  );

  const getPaymentStatusBadge = (status: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.toUpperCase()}
    </span>
  );

  const getOrderTypeIcon = (type: string) => ORDER_TYPE_ICONS[type] || <Users size={14} />;

  // ─── Refresh ──────────────────────────────────────────────────────────
  const handleRefresh = () => {
    fetchOrders();
    fetchAllRestaurants();
    fetchAllBranches();
    toast.success('Refreshed');
  };

  // ─── Apply Filters ──────────────────────────────────────────────────────
  const applyFilters = () => {
    fetchOrders();
    setCurrentPage(1);
  };

  // ─── Loading State ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  // ─── Check if any filters are active ──────────────────────────────────
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || orderTypeFilter !== 'all' || restaurantFilter !== 'all' || branchFilter !== 'all';

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingBag size={24} className="text-purple-600" />
              All Orders
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {filteredOrders.length} orders found • {orders.length} total
              {restaurants.length > 0 && ` • ${restaurants.length} restaurants`}
              {branches.length > 0 && ` • ${branches.length} branches`}
              {hasActiveFilters && (
                <span className="ml-2 text-purple-600">(filtered)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition ${viewMode === 'list' ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="List View"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition ${viewMode === 'grid' ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
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

        {/* ─── Total Stats Cards ───────────────────────────────────────────── */}
        {totalStats.totalOrders > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-xl font-bold text-gray-800">{totalStats.totalOrders}</p>
              <p className="text-xs text-gray-500">Total Orders</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalStats.totalRevenue)}</p>
              <p className="text-xs text-gray-500">Total Revenue</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-xl font-bold text-yellow-600">{totalStats.pendingOrders}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-xl font-bold text-indigo-600">{totalStats.preparingOrders}</p>
              <p className="text-xs text-gray-500">Preparing</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-xl font-bold text-emerald-600">{totalStats.completedOrders}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-xl font-bold text-red-600">{totalStats.cancelledOrders}</p>
              <p className="text-xs text-gray-500">Cancelled</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <p className="text-xl font-bold text-blue-600">{totalStats.todayOrders}</p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
          </div>
        )}

        {/* ─── Status Stats Cards ──────────────────────────────────────────── */}
        {orders.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mb-6">
            {STATUS_ORDER.map((status) => (
              <div
                key={status}
                onClick={() => {
                  if (statusFilter === status) {
                    setStatusFilter('all');
                  } else {
                    setStatusFilter(status);
                  }
                  setCurrentPage(1);
                }}
                className={`bg-white rounded-xl p-3 shadow-sm border transition cursor-pointer hover:shadow-md ${
                  statusFilter === status ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-100'
                }`}
              >
                <p className={`text-xl font-bold ${
                  status === 'pending' ? 'text-yellow-600' : 
                  status === 'confirmed' ? 'text-blue-600' : 
                  status === 'preparing' ? 'text-indigo-600' : 
                  status === 'ready' ? 'text-green-600' : 
                  status === 'completed' ? 'text-emerald-600' : 
                  status === 'refunded' ? 'text-gray-600' : 
                  'text-red-600'
                }`}>
                  {stats[status as keyof typeof stats] || 0}
                </p>
                <p className="text-xs text-gray-500">{STATUS_LABELS[status]}</p>
              </div>
            ))}
          </div>
        )}

        {/* ─── Filters ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order #, customer, phone, branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
            
            {/* Restaurant Filter */}
            <select
              value={restaurantFilter}
              onChange={(e) => {
                setRestaurantFilter(e.target.value);
                setBranchFilter('all');
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white min-w-[180px]"
            >
              <option value="all">🏪 All Restaurants</option>
              {restaurants.map(r => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>

            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white min-w-[180px]"
              disabled={filteredBranches.length === 0}
            >
              <option value="all">📍 All Branches</option>
              {filteredBranches.map(b => (
                <option key={b._id} value={b._id}>
                  {b.name} {b.restaurantName ? `(${b.restaurantName})` : ''}
                </option>
              ))}
              {filteredBranches.length === 0 && restaurantFilter !== 'all' && (
                <option value="" disabled>No branches for this restaurant</option>
              )}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition ${
                showFilters || hasActiveFilters
                  ? 'border-purple-400 bg-purple-50 text-purple-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={14} />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-purple-500" />
              )}
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition"
            >
              Apply Filters
            </button>
            
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <XIcon size={14} />
                Clear All
              </button>
            )}
          </div>

          {showFilters && (
            <div className="border-t border-gray-100 p-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                  <option value="all">All Status</option>
                  {STATUS_ORDER.map(status => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Order Type</label>
                <select
                  value={orderTypeFilter}
                  onChange={(e) => {
                    setOrderTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                  <option value="all">All Types</option>
                  <option value="dine-in">Dine In</option>
                  <option value="takeaway">Takeaway</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ─── Orders Display ───────────────────────────────────────────────── */}
        {paginatedOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">No orders found</h3>
            <p className="text-gray-400 text-sm mt-1">
              {orders.length === 0 
                ? 'No orders have been placed yet. Create an order from POS.' 
                : 'Try adjusting your filters'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-3 text-purple-500 hover:text-purple-600 text-sm font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          // ─── Grid View ──────────────────────────────────────────────────
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedOrders.map((order) => (
                <div key={order._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition cursor-pointer" onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-mono font-semibold text-gray-800">{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">{formatTime(order.createdAt)}</p>
                    </div>
                    {getStatusBadge(order.orderStatus)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    {getOrderTypeIcon(order.orderType)}
                    <span className="capitalize">{order.orderType}</span>
                    {order.tableNumber && <span>• Table {order.tableNumber}</span>}
                    {order.isVip && <span className="text-yellow-500">⭐</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{order.customerName || 'Guest'}</p>
                  {order.restaurantName && (
                    <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                      <Store size={12} /> {order.restaurantName}
                    </p>
                  )}
                  {order.branchName && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={10} /> {order.branchName}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</p>
                    {getPaymentStatusBadge(order.paymentStatus)}
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 px-4 py-3 bg-white rounded-lg border border-gray-100">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition ${
                      currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-4 py-2 rounded-lg border transition ${
                          currentPage === pageNum
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition ${
                      currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          // ─── List View ──────────────────────────────────────────────────
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant / Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getOrderTypeIcon(order.orderType)}
                            <div>
                              <p className="font-mono text-sm font-semibold text-gray-800">{order.orderNumber}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                <span>{formatTime(order.createdAt)}</span>
                                {order.tableNumber && <span>• Table {order.tableNumber}</span>}
                                {order.isVip && <span className="text-yellow-500">⭐ VIP</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-800">{order.customerName || 'Guest'}</p>
                          {order.customerPhone && (
                            <p className="text-xs text-gray-500">{order.customerPhone}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            {order.restaurantName && (
                              <p className="text-sm text-purple-600 flex items-center gap-1">
                                <Store size={12} /> {order.restaurantName}
                              </p>
                            )}
                            {order.branchName && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin size={10} /> {order.branchName}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="text-sm text-gray-600">
                                {item.quantity}× {item.productName}
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="text-xs text-gray-400">+{order.items.length - 3} more</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {getStatusBadge(order.orderStatus)}
                            {getPaymentStatusBadge(order.paymentStatus)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowOrderModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handlePrintOrder(order)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Print"
                            >
                              <Printer size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 px-4 py-3 bg-white rounded-lg border border-gray-100">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition ${
                      currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-4 py-2 rounded-lg border transition ${
                          currentPage === pageNum
                            ? 'bg-purple-500 text-white border-purple-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition ${
                      currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Order Detail Modal ──────────────────────────────────────────── */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowOrderModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-xl max-w-3xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-purple-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Order Details</h3>
                    <p className="text-sm text-gray-500 font-mono">#{selectedOrder.orderNumber}</p>
                  </div>
                </div>
                <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XIcon size={24} />
                </button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {/* Order Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Order Type</p>
                    <p className="text-sm font-medium capitalize flex items-center gap-1 mt-1">
                      {getOrderTypeIcon(selectedOrder.orderType)} {selectedOrder.orderType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Table</p>
                    <p className="text-sm font-medium">{selectedOrder.tableNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedOrder.orderStatus)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Payment</p>
                    <div className="mt-1 space-y-1">
                      {getPaymentStatusBadge(selectedOrder.paymentStatus)}
                      <p className="text-xs text-gray-400 capitalize">{selectedOrder.paymentMethod}</p>
                    </div>
                  </div>
                </div>

                {/* Restaurant & Branch Info */}
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Restaurant Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Restaurant</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Store size={14} /> {selectedOrder.restaurantName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Branch</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <MapPin size={14} /> {selectedOrder.branchName || 'N/A'}
                      </p>
                      {/* Debug: Show item branch if different */}
                      {selectedOrder.items?.[0]?.branchName && selectedOrder.items[0].branchName !== selectedOrder.branchName && (
                        <p className="text-xs text-gray-400 mt-1">
                          (Item branch: {selectedOrder.items[0].branchName})
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-sm font-medium">{selectedOrder.customerName || 'Guest'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="text-sm font-medium">{selectedOrder.customerPhone || 'N/A'}</p>
                    </div>
                  </div>
                  {selectedOrder.customerAddress && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400">Address</p>
                      <p className="text-sm font-medium">{selectedOrder.customerAddress}</p>
                    </div>
                  )}
                  {selectedOrder.isVip && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-600">⭐ VIP Customer</p>
                      {selectedOrder.vipNotes && <p className="text-xs text-yellow-600 mt-1">{selectedOrder.vipNotes}</p>}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Items</h4>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left">Item</th>
                          <th className="px-4 py-2 text-center">Qty</th>
                          <th className="px-4 py-2 text-right">Price</th>
                          <th className="px-4 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedOrder.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">
                              {item.productName}
                              {item.notes && <p className="text-xs text-amber-500">📝 {item.notes}</p>}
                              {item.personName && <p className="text-xs text-gray-400">👤 {item.personName}</p>}
                              {item.branchName && item.branchName !== selectedOrder.branchName && (
                                <p className="text-xs text-purple-500">📍 {item.branchName}</p>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right font-medium">Subtotal</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(selectedOrder.subtotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right font-medium">Tax</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(selectedOrder.tax)}</td>
                        </tr>
                        {selectedOrder.discount > 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-right font-medium text-green-600">Discount</td>
                            <td className="px-4 py-2 text-right text-green-600">-{formatCurrency(selectedOrder.discount)}</td>
                          </tr>
                        )}
                        <tr className="border-t-2 border-gray-300">
                          <td colSpan={3} className="px-4 py-2 text-right font-bold">Total</td>
                          <td className="px-4 py-2 text-right font-bold text-lg">{formatCurrency(selectedOrder.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-600">📝 {selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div className="p-5 bg-gray-50 border-t flex flex-wrap gap-2">
                <button onClick={() => setShowOrderModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                  Close
                </button>
                <button onClick={() => handlePrintOrder(selectedOrder)} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2">
                  <Printer size={16} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Handle Print ──────────────────────────────────────────────────────────
const handlePrintOrder = (order: Order) => {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order - ${order.orderNumber}</title>
      <style>
        body { font-family: monospace; padding: 20px; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 15px; }
        .order-number { font-size: 20px; font-weight: bold; }
        .vip { color: #b45309; font-weight: bold; }
        .restaurant-info { margin: 10px 0; padding: 8px; background: #f5f3ff; border-radius: 4px; }
        .details { margin: 15px 0; }
        .details table { width: 100%; }
        .details td { padding: 2px 0; }
        .items { margin: 15px 0; }
        .items table { width: 100%; border-collapse: collapse; }
        .items th { text-align: left; border-bottom: 1px solid #333; padding: 5px 0; }
        .items td { padding: 5px 0; border-bottom: 1px dotted #ccc; }
        .totals { margin-top: 15px; border-top: 2px solid #333; padding-top: 10px; }
        .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #333; font-size: 10px; color: #666; }
        .payment-status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
        .paid { background: #d1fae5; color: #065f46; }
        .pending { background: #fef3c7; color: #92400e; }
        .refunded { background: #f3f4f6; color: #4b5563; }
        .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-size: 24px; font-weight: bold; color: #7c3aed;">🧾 ORDER RECEIPT</div>
        <div class="order-number">${order.orderNumber}</div>
        <div>${new Date(order.createdAt).toLocaleString()}</div>
        ${order.isVip ? '<div class="vip">⭐ VIP ORDER ⭐</div>' : ''}
      </div>

      <div class="restaurant-info">
        <div><strong>🏪 Restaurant:</strong> ${order.restaurantName || 'N/A'}</div>
        ${order.branchName ? `<div><strong>📍 Branch:</strong> ${order.branchName}</div>` : ''}
      </div>

      <div class="details">
        <table>
          <tr><td><strong>Type:</strong></td><td>${order.orderType.toUpperCase()}</td></tr>
          ${order.tableNumber ? `<tr><td><strong>Table:</strong></td><td>${order.tableNumber}</td></tr>` : ''}
          <tr><td><strong>Customer:</strong></td><td>${order.customerName || 'Guest'}</td></tr>
          ${order.customerPhone ? `<tr><td><strong>Phone:</strong></td><td>${order.customerPhone}</td></tr>` : ''}
          ${order.customerAddress ? `<tr><td><strong>Address:</strong></td><td>${order.customerAddress}</td></tr>` : ''}
          <tr>
            <td><strong>Status:</strong></td>
            <td><span class="status">${order.orderStatus.toUpperCase()}</span></td>
          </tr>
          <tr>
            <td><strong>Payment:</strong></td>
            <td><span class="payment-status ${order.paymentStatus}">${order.paymentStatus.toUpperCase()}</span></td>
          </tr>
          ${order.paymentMethod ? `<tr><td><strong>Method:</strong></td><td>${order.paymentMethod.toUpperCase()}</td></tr>` : ''}
        </table>
      </div>

      <div class="items">
        <h3>Items</h3>
        <table>
          <thead>
            <tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td style="text-align:right;">₹${item.unitPrice.toFixed(2)}</td>
                <td style="text-align:right;">₹${item.totalPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <table style="width:100%;">
          <tr><td style="text-align:right;"><strong>Subtotal:</strong></td><td style="text-align:right;width:100px;">₹${order.subtotal.toFixed(2)}</td></tr>
          <tr><td style="text-align:right;"><strong>Tax:</strong></td><td style="text-align:right;">₹${order.tax.toFixed(2)}</td></tr>
          ${order.discount > 0 ? `<tr><td style="text-align:right;color:#059669;"><strong>Discount:</strong></td><td style="text-align:right;color:#059669;">-₹${order.discount.toFixed(2)}</td></tr>` : ''}
          <tr style="border-top:2px solid #333;font-size:18px;">
            <td style="text-align:right;"><strong>TOTAL:</strong></td>
            <td style="text-align:right;"><strong>₹${order.total.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      ${order.notes ? `<div style="margin-top:15px;padding:10px;background:#fef3c7;border-radius:4px;font-size:12px;"><strong>📝 Notes:</strong> ${order.notes}</div>` : ''}

      <div class="footer">
        <p>Thank you for ordering with us! 🙏</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  win.print();
};