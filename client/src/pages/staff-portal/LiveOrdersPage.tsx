// pages/staff-portal/LiveOrdersPage.tsx - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Filter, Clock, ChefHat, Flame, CheckCircle,
  XCircle, Eye, ShoppingBag, Users, Coffee, Truck,
  AlertCircle, ChevronDown, ChevronUp, Loader2,
  RefreshCw, Printer, Utensils, Award, Bell, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

// ─── Types ────────────────────────────────────────────────────────────────
interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  roundNumber: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  orderStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  isVip: boolean;
  vipNotes?: string;
  kitchenAcknowledged: boolean;
  readyRequested: boolean;
  kotPrinted: boolean;
  notes?: string;
  taxRate?: number;
}

interface OrderFilters {
  status: string;
  orderType: string;
  search: string;
  showVIPOnly: boolean;
}

const statusOptions = [
  { value: 'all', label: 'All Orders', color: 'gray' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'preparing', label: 'Preparing', color: 'purple' },
  { value: 'ready', label: 'Ready', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'teal' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
];

const orderTypeOptions = [
  { value: 'all', label: 'All Types', icon: Users },
  { value: 'dine-in', label: 'Dine In', icon: Coffee },
  { value: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
  { value: 'delivery', label: 'Delivery', icon: Truck },
];

// ─── Helper Functions ─────────────────────────────────────────────────────
const isKitchenRole = (role: string): boolean => {
  const kitchenRoles = ['chef', 'cook', 'section_chef', 'helper', 'kot_staff'];
  return kitchenRoles.includes(role?.toLowerCase());
};

const isWaiterRole = (role: string): boolean => {
  return role?.toLowerCase() === 'waiter';
};

const isManagerRole = (role: string): boolean => {
  const mgmtRoles = ['manager', 'admin'];
  return mgmtRoles.includes(role?.toLowerCase());
};

// ─── Component ─────────────────────────────────────────────────────────────
export default function LiveOrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({
    status: 'all',
    orderType: 'all',
    search: '',
    showVIPOnly: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string>('');
  const [staffPermissions, setStaffPermissions] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // ─── Load Staff Data ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const data = localStorage.getItem('staffData');
      if (data) {
        const parsed = JSON.parse(data);
        setStaffRole(parsed?.role || '');
        setStaffPermissions(parsed?.permissions || []);
        console.log('📋 Staff role loaded:', parsed?.role);
      }
    } catch (e) {
      console.warn('Could not parse staffData');
    }
  }, []);

  // ─── Live Timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Get Order from URL ─────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      fetchAndShowOrder(orderId);
    }
  }, [location.search]);

  // ─── Fetch Orders ────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await staffApi.get('/staff-portal/orders', {
        params: { 
          limit: 1000,
          showAll: 'true'
        }
      });
      
      let allOrders = [];
      if (response.data?.success) {
        allOrders = response.data.data?.orders || [];
      }
      
      setOrders(allOrders);
      console.log('📦 Orders fetched:', allOrders.length);
      
    } catch (error: any) {
      console.error('❌ Error fetching orders:', error);
      // Don't show toast for 401 as it will be handled by interceptor
      if (error.response?.status !== 401) {
        toast.error('Failed to load orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAndShowOrder = async (orderId: string) => {
    try {
      const response = await staffApi.get(`/staff-portal/orders/${orderId}`);
      if (response.data.success) {
        setSelectedOrder(response.data.data);
        setShowOrderModal(true);
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
      if (error.response?.status !== 401) {
        toast.error(error.response?.data?.error || 'Failed to load order details');
      }
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, filters]);

  // ─── Filter Orders ──────────────────────────────────────────────────────
  const filterOrders = () => {
    let filtered = [...orders];
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(o => o.orderStatus === filters.status);
    }
    if (filters.orderType !== 'all') {
      filtered = filtered.filter(o => o.orderType === filters.orderType);
    }
    if (filters.showVIPOnly) {
      filtered = filtered.filter(o => o.isVip);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(searchLower) ||
        (o.tableNumber && o.tableNumber.toLowerCase().includes(searchLower)) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort: VIP first, then by status priority, then by date
    filtered.sort((a, b) => {
      if (a.isVip && !b.isVip) return -1;
      if (!a.isVip && b.isVip) return 1;
      const statusPriority = { pending: 1, confirmed: 2, preparing: 3, ready: 4, completed: 5, cancelled: 6 };
      const priorityA = statusPriority[a.orderStatus as keyof typeof statusPriority] || 99;
      const priorityB = statusPriority[b.orderStatus as keyof typeof statusPriority] || 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    setFilteredOrders(filtered);
  };

  // ─── Actions ─────────────────────────────────────────────────────────────
  
  // ✅ FIXED: Use PATCH for kitchen-acknowledge (matches route)
  const handleKitchenAcknowledge = async (orderId: string) => {
    setAcknowledging(orderId);
    try {
      const response = await staffApi.patch(`/staff-portal/orders/${orderId}/kitchen-acknowledge`, {});
      if (response.data.success) {
        toast.success('Order acknowledged! Ready to prepare.');
        fetchOrders();
        if (selectedOrder?._id === orderId) fetchAndShowOrder(orderId);
      }
    } catch (error: any) {
      console.error('Acknowledge error:', error.response?.data);
      if (error.response?.status !== 401) {
        toast.error(error.response?.data?.error || 'Failed to acknowledge order');
      }
    } finally {
      setAcknowledging(null);
    }
  };

  // ✅ FIXED: Use PUT for status updates (matches route)
  const handleMarkReady = async (orderId: string) => {
    setUpdatingStatus(orderId);
    try {
      const response = await staffApi.put(`/staff-portal/orders/${orderId}/status`, 
        { orderStatus: 'ready' }
      );
      if (response.data.success) {
        toast.success('Order marked as ready!');
        fetchOrders();
        if (selectedOrder?._id === orderId) fetchAndShowOrder(orderId);
      }
    } catch (error: any) {
      console.error('Mark ready error:', error.response?.data);
      if (error.response?.status !== 401) {
        toast.error(error.response?.data?.error || 'Failed to mark ready');
      }
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ✅ FIXED: Use PUT for status updates (matches route)
  const handleComplete = async (orderId: string) => {
    setUpdatingStatus(orderId);
    try {
      const response = await staffApi.put(`/staff-portal/orders/${orderId}/status`, 
        { orderStatus: 'completed' }
      );
      if (response.data.success) {
        toast.success('Order completed!');
        fetchOrders();
        if (selectedOrder?._id === orderId) fetchAndShowOrder(orderId);
      }
    } catch (error: any) {
      console.error('Complete error:', error.response?.data);
      if (error.response?.status !== 401) {
        toast.error(error.response?.data?.error || 'Failed to complete order');
      }
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ─── UI Helpers ─────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
      preparing: 'bg-purple-100 text-purple-700 border-purple-200',
      ready: 'bg-green-100 text-green-700 border-green-200',
      completed: 'bg-teal-100 text-teal-700 border-teal-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} />;
      case 'confirmed': return <CheckCircle size={14} />;
      case 'preparing': return <ChefHat size={14} />;
      case 'ready': return <Flame size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'dine-in': return <Coffee size={14} />;
      case 'takeaway': return <ShoppingBag size={14} />;
      case 'delivery': return <Truck size={14} />;
      default: return <Users size={14} />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getWaitTime = (createdAt: string, orderStatus: string) => {
    if (!createdAt) return { text: '0s', color: 'text-gray-500', minutes: 0 };
    
    if (orderStatus === 'completed' || orderStatus === 'cancelled') {
      return { text: '', color: 'text-gray-400', minutes: 0, show: false };
    }
    
    const created = new Date(createdAt).getTime();
    const now = currentTime.getTime();
    const totalSeconds = Math.floor((now - created) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    let text = '';
    if (hours > 0) {
      text = `${hours}h ${remainingMinutes}m ${seconds}s`;
    } else if (minutes > 0) {
      text = `${minutes}m ${seconds}s`;
    } else {
      text = `${seconds}s`;
    }

    let color = 'text-green-600';
    if (minutes > 30) color = 'text-red-600';
    else if (minutes > 15) color = 'text-orange-500';
    else if (minutes > 5) color = 'text-yellow-600';

    return { text, color, minutes, show: true };
  };

  const handleRefresh = () => {
    fetchOrders();
    toast.success('Orders refreshed');
  };

  // ─── Permissions ────────────────────────────────────────────────────────
  const canAcknowledge = hasPermission(staffPermissions, PERMISSIONS.ACKNOWLEDGE_ORDER);
  const canMarkReady = hasPermission(staffPermissions, PERMISSIONS.UPDATE_ORDER_STATUS) || 
                       hasPermission(staffPermissions, PERMISSIONS.APPROVE_READY) || 
                       isKitchenRole(staffRole) || 
                       isManagerRole(staffRole);
  const canServe = hasPermission(staffPermissions, PERMISSIONS.COMPLETE_ORDER) || 
                   hasPermission(staffPermissions, PERMISSIONS.UPDATE_ORDER_STATUS) || 
                   isKitchenRole(staffRole) || 
                   isWaiterRole(staffRole) || 
                   isManagerRole(staffRole);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Flame size={24} className="text-orange-500" />
              Live Orders
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {orders.length > 0 ? `Showing ${filteredOrders.length} of ${orders.length} orders` : 'No orders found'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
            <p className="text-xs text-gray-500">Total Orders</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-100">
            <p className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => o.orderStatus === 'pending' || o.orderStatus === 'confirmed').length}
            </p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
            <p className="text-2xl font-bold text-purple-600">
              {orders.filter(o => o.orderStatus === 'preparing').length}
            </p>
            <p className="text-xs text-gray-500">Preparing</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
            <p className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.orderStatus === 'ready').length}
            </p>
            <p className="text-xs text-gray-500">Ready</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-teal-100">
            <p className="text-2xl font-bold text-teal-600">
              {orders.filter(o => o.orderStatus === 'completed').length}
            </p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
            <p className="text-2xl font-bold text-red-600">
              {orders.filter(o => o.orderStatus === 'cancelled').length}
            </p>
            <p className="text-xs text-gray-500">Cancelled</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order #, table #, customer..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
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
              onClick={() => setFilters(prev => ({ ...prev, showVIPOnly: !prev.showVIPOnly }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
                filters.showVIPOnly
                  ? 'bg-yellow-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Award size={14} />
              VIP Only
            </button>
          </div>
          {showFilters && (
            <div className="border-t border-gray-100 p-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-gray-500 mb-1 block">Order Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-gray-500 mb-1 block">Order Type</label>
                <select
                  value={filters.orderType}
                  onChange={(e) => setFilters(prev => ({ ...prev, orderType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {orderTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Utensils size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">No orders found</h3>
            <p className="text-gray-400 text-sm mt-1">
              {orders.length === 0 ? 'No orders have been placed yet' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const waitTime = getWaitTime(order.createdAt, order.orderStatus);
              const isCompleted = order.orderStatus === 'completed' || order.orderStatus === 'cancelled';
              const isPreparing = order.orderStatus === 'preparing';
              const isReady = order.orderStatus === 'ready';
              const isUpdating = updatingStatus === order._id;
              const isAcknowledging = acknowledging === order._id;

              const showAcknowledge = order.orderStatus === 'pending' && !order.kitchenAcknowledged && canAcknowledge;
              const showMarkReady = isPreparing && canMarkReady;
              const showComplete = isReady && canServe;

              return (
                <div
                  key={order._id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden transition hover:shadow-md ${
                    order.isVip ? 'border-yellow-300 bg-yellow-50/30' : 
                    isCompleted ? 'border-gray-200 bg-gray-50/50' :
                    'border-gray-100'
                  }`}
                >
                  {/* Header */}
                  <div className={`p-4 border-b flex justify-between items-center ${
                    order.isVip ? 'bg-yellow-50' : 
                    isCompleted ? 'bg-gray-50' :
                    'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getOrderTypeIcon(order.orderType)}
                        <span className="font-mono text-sm font-bold text-gray-800">
                          #{order.orderNumber}
                        </span>
                      </div>
                      {order.isVip && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">
                          VIP
                        </span>
                      )}
                      {isCompleted && order.orderStatus === 'completed' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500 text-white">
                          ✅ Completed
                        </span>
                      )}
                      {isCompleted && order.orderStatus === 'cancelled' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                          ❌ Cancelled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusBadge(order.orderStatus)}`}>
                        {getStatusIcon(order.orderStatus)}
                        {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        {order.tableNumber && <p className="text-sm text-gray-600">Table {order.tableNumber}</p>}
                        {order.customerName && <p className="text-sm text-gray-600">{order.customerName}</p>}
                        <p className="text-xs text-gray-400 mt-1">{formatTime(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        {!isCompleted ? (
                          <>
                            <p className="text-xs text-gray-400">Wait Time</p>
                            {waitTime.show ? (
                              <p className={`text-sm font-semibold font-mono ${waitTime.color}`}>
                                {waitTime.text}
                              </p>
                            ) : (
                              <p className="text-sm font-semibold text-green-600">Ready!</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-gray-400">Completed</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                          <span className="text-gray-600">
                            {item.quantity}× {item.productName}
                          </span>
                          {item.roundNumber > 1 && (
                            <span className="text-xs text-gray-400">Round {item.roundNumber}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mb-3 pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="text-lg font-bold text-gray-800">{formatCurrency(order.total)}</span>
                    </div>

                    {/* ─── ACTION BUTTONS ─── */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        <Eye size={14} />
                        Details
                      </button>

                      {!isCompleted && showAcknowledge && (
                        <button
                          onClick={() => handleKitchenAcknowledge(order._id)}
                          disabled={isAcknowledging}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition disabled:opacity-50"
                        >
                          {isAcknowledging ? <Loader2 size={14} className="animate-spin" /> : <ChefHat size={14} />}
                          Acknowledge
                        </button>
                      )}

                      {!isCompleted && showMarkReady && (
                        <button
                          onClick={() => handleMarkReady(order._id)}
                          disabled={isUpdating}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition disabled:opacity-50"
                        >
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />}
                          Mark Ready
                        </button>
                      )}

                      {!isCompleted && showComplete && (
                        <button
                          onClick={() => handleComplete(order._id)}
                          disabled={isUpdating}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 transition disabled:opacity-50"
                        >
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Order Details Modal ──────────────────────────────────── */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowOrderModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowOrderModal(false)} />
            <div className="relative bg-white rounded-xl max-w-2xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className={`p-5 border-b flex justify-between items-center ${
                selectedOrder.isVip ? 'bg-yellow-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-800">Order Details</h3>
                  {selectedOrder.isVip && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 text-white">VIP</span>
                  )}
                </div>
                <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 mb-5 pb-4 border-b border-gray-100">
                  <div><p className="text-xs text-gray-400">Order Number</p><p className="font-mono font-semibold">#{selectedOrder.orderNumber}</p></div>
                  <div><p className="text-xs text-gray-400">Order Type</p><p className="capitalize flex items-center gap-1">{getOrderTypeIcon(selectedOrder.orderType)}{selectedOrder.orderType}</p></div>
                  <div><p className="text-xs text-gray-400">Table Number</p><p>{selectedOrder.tableNumber || 'N/A'}</p></div>
                  <div><p className="text-xs text-gray-400">Customer</p><p>{selectedOrder.customerName || 'Guest'}</p></div>
                  <div><p className="text-xs text-gray-400">Created At</p><p>{new Date(selectedOrder.createdAt).toLocaleString()}</p></div>
                  <div><p className="text-xs text-gray-400">Status</p><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedOrder.orderStatus)}`}>{getStatusIcon(selectedOrder.orderStatus)}{selectedOrder.orderStatus}</span></div>
                </div>

                <h4 className="font-semibold text-gray-800 mb-3">Order Items</h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden mb-5">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr><th className="px-4 py-2 text-left">Item</th><th className="px-4 py-2 text-center">Qty</th><th className="px-4 py-2 text-right">Price</th><th className="px-4 py-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">{item.productName}{item.notes && <p className="text-xs text-gray-400">📝 {item.notes}</p>}</td>
                          <td className="px-4 py-2 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr><td colSpan={3} className="px-4 py-2 text-right font-medium">Subtotal</td><td className="px-4 py-2 text-right">{formatCurrency(selectedOrder.subtotal)}</td></tr>
                      <tr><td colSpan={3} className="px-4 py-2 text-right font-medium">Tax ({selectedOrder.taxRate || 5}%)</td><td className="px-4 py-2 text-right">{formatCurrency(selectedOrder.tax)}</td></tr>
                      <tr className="bg-gray-100"><td colSpan={3} className="px-4 py-2 text-right font-bold">Total</td><td className="px-4 py-2 text-right font-bold">{formatCurrency(selectedOrder.total)}</td></tr>
                    </tfoot>
                  </table>
                </div>

                {selectedOrder.notes && (
                  <div className="mb-4"><h4 className="font-semibold text-gray-800 mb-2">Order Notes</h4><p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">{selectedOrder.notes}</p></div>
                )}
                {selectedOrder.vipNotes && (
                  <div className="mb-4"><h4 className="font-semibold text-gray-800 mb-2">VIP Notes</h4><p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">👑 {selectedOrder.vipNotes}</p></div>
                )}
              </div>

              <div className="p-5 bg-gray-50 border-t flex justify-end gap-3 flex-wrap">
                <button onClick={() => setShowOrderModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Close</button>
                {selectedOrder.orderStatus === 'pending' && !selectedOrder.kitchenAcknowledged && canAcknowledge && (
                  <button onClick={() => { handleKitchenAcknowledge(selectedOrder._id); setShowOrderModal(false); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
                    <ChefHat size={16} /> Acknowledge
                  </button>
                )}
                {selectedOrder.orderStatus === 'preparing' && canMarkReady && (
                  <button onClick={() => { handleMarkReady(selectedOrder._id); setShowOrderModal(false); }} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2">
                    <Flame size={16} /> Mark Ready
                  </button>
                )}
                {selectedOrder.orderStatus === 'ready' && canServe && (
                  <button onClick={() => { handleComplete(selectedOrder._id); setShowOrderModal(false); }} className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center gap-2">
                    <CheckCircle size={16} /> Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}