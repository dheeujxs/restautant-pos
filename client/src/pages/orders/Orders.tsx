// pages/Orders.tsx - FIXED PAGINATION + CANCELLATION BILL REDIRECT

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { adminStorage } from '../../utils/storage';
import {
  Plus, Eye, RefreshCw, Search, X,
  Package2, Clock, CheckCircle,
  Coffee, ShoppingBag, Truck,
  TrendingUp, Receipt, PlusCircle,
  Wallet, AlertCircle, CheckCircle2, Loader2, Info,
  AlertTriangle, RefreshCcw,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Ban,
  ChefHat
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatPrice = (price: number): string => {
  return `₹${(price || 0).toFixed(2)}`;
};

interface IOrder {
  _id: string;
  orderNumber: string;
  orderType: string;
  tableNumber?: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<any>;
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  discountType: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  notes?: string;
  createdAt: string;
  currentRound?: number;
}

const STATUS_CONFIG: Record<string, any> = {
  pending:   { label: 'Pending',   dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#b45309' },
  confirmed: { label: 'Confirmed', dot: '#3b82f6', bg: 'rgba(59,130,246,0.12)', text: '#1d4ed8' },
  preparing: { label: 'Preparing', dot: '#a855f7', bg: 'rgba(168,85,247,0.12)', text: '#7e22ce' },
  ready:     { label: 'Ready',     dot: '#10b981', bg: 'rgba(16,185,129,0.12)', text: '#047857' },
  completed: { label: 'Completed', dot: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: '#374151' },
  cancelled: { label: 'Cancelled', dot: '#ef4444', bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
  refunded:  { label: 'Refunded',  dot: '#10b981', bg: 'rgba(16,185,129,0.12)', text: '#047857' },
};

const TYPE_CONFIG: Record<string, any> = {
  'dine-in':  { label: 'Dine In',  Icon: Coffee,      accent: '#f97316' },
  'takeaway': { label: 'Takeaway', Icon: ShoppingBag, accent: '#8b5cf6' },
  'delivery': { label: 'Delivery', Icon: Truck,       accent: '#06b6d4' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status || 'Unknown', dot: '#999', bg: '#f5f5f5', text: '#666' };
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: cfg.bg, color: cfg.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, Icon, accent }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${accent}15` }}>
          <Icon size={18} color={accent} />
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [editingTable, setEditingTable] = useState(false);
  const [newTableId, setNewTableId] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [generatingBill, setGeneratingBill] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const itemsPerPage = 5;

  // ✅ Check authentication on mount
  useEffect(() => {
    const token = adminStorage.getToken();
    if (!token) {
      toast.error('Please login again');
      navigate('/login');
      return;
    }
    adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }, [navigate]);

  // ✅ Fetch Tables
  const fetchTables = useCallback(async () => {
    try {
      const token = adminStorage.getToken();
      if (!token) {
        console.warn('No admin token found for fetching tables');
        return;
      }
      
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('📤 Fetching tables...');
      const response = await adminApi.get('/tables?limit=100');
      
      if (response.data?.success) {
        setTables(response.data.data?.tables || []);
        console.log('✅ Tables fetched:', response.data.data?.tables?.length || 0);
      }
    } catch (error: any) {
      console.error('❌ Error fetching tables:', error.response?.status, error.response?.data);
      if (error.response?.status !== 403) {
        toast.error('Failed to fetch tables');
      }
    }
  }, []);

  // ─── ✅ FIXED: fetchOrders with proper pagination ──────────────────────
  const fetchOrders = useCallback(async (page: number = currentPage) => {
    setLoading(true);
    try {
      const token = adminStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // ✅ Build URL with ALL parameters including page
      let url = `/orders?limit=${itemsPerPage}&page=${page}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&orderStatus=${statusFilter}`;
      if (typeFilter) url += `&orderType=${typeFilter}`;

      console.log('📤 Fetching orders with URL:', url);
      const res = await adminApi.get(url);
      
      if (res.data.success) {
        const ordersData = res.data.data?.orders || [];
        const total = res.data.data?.pagination?.total || res.data.data?.total || 0;
        
        setOrders(ordersData);
        setTotalOrdersCount(total);
        setTotalPages(Math.ceil(total / itemsPerPage) || 1);
        setCurrentPage(page);
        
        console.log(`✅ Orders fetched: ${ordersData.length} orders, total: ${total}`);
      }
    } catch (error: any) {
      console.error('❌ Fetch error:', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        adminStorage.clear();
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('You don\'t have permission to view orders');
      } else {
        toast.error('Failed to fetch orders');
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, itemsPerPage, navigate]);

  // ─── ✅ FIXED: Initial fetch and filter changes ──────────────────────
  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
    fetchOrders(1);
  }, [search, statusFilter, typeFilter]); // Re-run when filters change

  // ─── ✅ FIXED: Re-fetch when currentPage changes (but not from filters) ──
  useEffect(() => {
    // Only fetch if currentPage is not 1 (to avoid duplicate fetch)
    if (currentPage > 1) {
      fetchOrders(currentPage);
    }
  }, [currentPage]);

  // Fetch tables when needed
  useEffect(() => {
    if (editingTable) {
      fetchTables();
    }
  }, [editingTable, fetchTables]);

  // Listen for kitchen completion refresh
  useEffect(() => {
    const handleStorageChange = () => {
      const needsRefresh = localStorage.getItem('ordersNeedRefresh');
      if (needsRefresh) {
        localStorage.removeItem('ordersNeedRefresh');
        fetchOrders(currentPage);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchOrders, currentPage]);

  // ─── ✅ FIXED: Navigation handlers ──────────────────────────────────────
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
    }
  };

  const goToPage = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // ─── Refresh handler ──────────────────────────────────────────────────
  const handleRefresh = () => {
    fetchOrders(currentPage);
    toast.success('Refreshed');
  };

  // Navigate to Kitchen Portal
  const goToKitchen = () => {
    navigate('/kitchen');
  };

  // ─── Generate Bill ──────────────────────────────────────────────────
  const handleGenerateBill = async (orderId: string) => {
    if (generatingBill === orderId) return;
    
    setGeneratingBill(orderId);
    const loadingToast = toast.loading('Generating bill...');
    
    try {
      const token = adminStorage.getToken();
      if (!token) {
        toast.error('Please login again', { id: loadingToast });
        navigate('/login');
        return;
      }
      
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await adminApi.post(`/bills/generate/${orderId}`);
      
      let billData = response.data;
      if (response.data?.success) {
        billData = response.data.data || response.data;
      }
      
      const billId = billData?._id || billData?.id || billData?.billId;
      
      if (billId) {
        toast.success('Bill generated successfully!', { id: loadingToast });
        navigate(`/billing/${billId}`);
      } else {
        toast.error('Bill ID missing - check console', { id: loadingToast });
        
        try {
          const existingRes = await adminApi.get(`/bills/by-order/${orderId}`);
          if (existingRes.data?.success) {
            const existingBill = existingRes.data.data || existingRes.data;
            const existingBillId = existingBill?._id || existingBill?.id;
            if (existingBillId) {
              toast.success('Found existing bill!', { id: loadingToast });
              navigate(`/billing/${existingBillId}`);
              return;
            }
          }
        } catch (fallbackError) {
          console.error('❌ Fallback failed:', fallbackError);
        }
      }
    } catch (error: any) {
      console.error('Generate bill error:', error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.', { id: loadingToast });
        adminStorage.clear();
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to generate bills. Please contact admin.', { id: loadingToast });
      } else if (error.response?.status === 409) {
        try {
          const existingRes = await adminApi.get(`/bills/by-order/${orderId}`);
          if (existingRes.data?.success) {
            const existingBill = existingRes.data.data || existingRes.data;
            const existingBillId = existingBill?._id || existingBill?.id;
            if (existingBillId) {
              toast.success('Opening existing bill...', { id: loadingToast });
              navigate(`/billing/${existingBillId}`);
            } else {
              toast.error('Bill exists but cannot open', { id: loadingToast });
            }
          }
        } catch (err) {
          toast.error('Bill exists but cannot open', { id: loadingToast });
        }
      } else if (error.response?.status === 404) {
        toast.error('Bill generation endpoint not found. Please check configuration.', { id: loadingToast });
      } else {
        toast.error(error.response?.data?.error || 'Failed to generate bill', { id: loadingToast });
      }
    } finally {
      setGeneratingBill(null);
    }
  };

  // ─── ✅ ENHANCED: Cancel Order – always redirect to billing if charge applies ───
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    const canCharge = ['preparing', 'ready', 'confirmed'].includes(selectedOrder.orderStatus);

    setCancellingOrder(true);
    try {
      const token = adminStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }

      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const res = await adminApi.post(`/orders/${selectedOrder._id}/cancel-with-bill`, {
        reason: cancelReason,
        applyCancellationCharge: canCharge,
        orderStatus: selectedOrder.orderStatus
      });

      if (res.data.success) {
        let billId = res.data.billId;
        const cancellationCharge = res.data.cancellationCharge || 0;

        // If charge applies but no billId, try to fetch the bill by order
        if (canCharge && cancellationCharge > 0 && !billId) {
          toast.loading('Locating cancellation bill...');
          try {
            const billRes = await adminApi.get(`/bills/by-order/${selectedOrder._id}`);
            if (billRes.data.success) {
              const bill = billRes.data.data || billRes.data;
              billId = bill._id || bill.id;
            }
          } catch (err) {
            console.error('Could not fetch bill by order:', err);
          }
        }

        if (canCharge && cancellationCharge > 0) {
          if (billId) {
            toast.success(`Order cancelled! Cancellation charge of ${formatPrice(cancellationCharge)} applied.`);
            navigate(`/billing/${billId}`, {
              state: {
                cancelledOrder: true,
                cancellationCharge,
                orderNumber: selectedOrder.orderNumber,
                isCancellationBill: true
              }
            });
          } else {
            // Fallback: go to billing list
            toast.error('Cancellation charge applied, but bill details not found. Redirecting to billing list.');
            navigate('/bills', {
              state: {
                cancelledOrder: true,
                orderNumber: selectedOrder.orderNumber,
                isCancellationBill: true
              }
            });
          }
        } else {
          // No charge – just cancel and refresh list
          toast.success('Order cancelled successfully');
          fetchOrders(currentPage);
        }

        setShowCancelModal(false);
        setSelectedOrder(null);
        setCancelReason('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancellingOrder(false);
    }
  };

  // Handle Refund
  const handleRefund = async (orderId: string) => {
    try {
      const token = adminStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const res = await adminApi.post(`/orders/${orderId}/refund`, {
        reason: 'Customer requested refund'
      });
      
      if (res.data.success) {
        const billId = res.data.billId;
        toast.success('Refund processed successfully');
        
        if (billId) {
          navigate(`/billing/${billId}`, { 
            state: { 
              refundOrder: true,
              orderNumber: selectedOrder?.orderNumber
            }
          });
        }
        fetchOrders(currentPage);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process refund');
    }
  };

  // Handle Edit Table
  const handleEditTable = async () => {
    if (!selectedOrder || !newTableId) return;
    
    try {
      const token = adminStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const newTable = tables.find(t => t._id === newTableId);
      const res = await adminApi.patch(`/orders/${selectedOrder._id}/table`, {
        tableId: newTableId,
        tableNumber: newTable?.number
      });
      
      if (res.data.success) {
        toast.success(`Order moved to Table ${newTable?.number}`);
        fetchOrders(currentPage);
        setEditingTable(false);
        setSelectedOrder(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update table');
    }
  };

  const totalOrders = totalOrdersCount;
  const pendingOrders = orders.filter(o => o.orderStatus === 'pending').length;
  const activeDineIn = orders.filter(o => o.orderType === 'dine-in' && !['completed', 'cancelled'].includes(o.orderStatus)).length;
  const todayRevenue = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).reduce((s, o) => s + (o.total || 0), 0);
  const cancelledOrders = orders.filter(o => o.orderStatus === 'cancelled').length;
  const completedOrders = orders.filter(o => o.orderStatus === 'completed' && o.paymentStatus !== 'paid').length;

  const getCancellationChargeMessage = (orderStatus: string, total: number) => {
    if (orderStatus === 'pending') {
      return "No cancellation charges apply.";
    } else if (['confirmed', 'preparing', 'ready'].includes(orderStatus)) {
      const charge = total * 0.1;
      return `⚠️ Cancellation charges of ${formatPrice(charge)} (10% of order total) will apply.`;
    }
    return "";
  };

  // Calculate the start index for display
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalOrdersCount);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          <p className="text-gray-500 text-sm">Track and manage all orders</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={goToKitchen}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-sm"
          >
            <ChefHat size={18} /> Kitchen Portal
          </button>
          
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-sm"
          >
            <Plus size={18} /> New Order
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Orders" value={totalOrders} Icon={Package2} accent="#6366f1" />
        <StatCard label="Pending" value={pendingOrders} Icon={Clock} accent="#f59e0b" />
        <StatCard label="Active Tables" value={activeDineIn} Icon={Coffee} accent="#f97316" />
        <StatCard label="Cancelled" value={cancelledOrders} Icon={Ban} accent="#ef4444" />
        <StatCard label="Today's Revenue" value={`₹${todayRevenue.toFixed(2)}`} Icon={TrendingUp} accent="#10b981" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All Types</option>
            <option value="dine-in">Dine In</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
          <button onClick={handleRefresh} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Package2 size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-600">No orders found</h3>
          <button onClick={() => navigate('/pos')} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">
            Create Order
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer/Table</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Payment</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const typeCfg = TYPE_CONFIG[order.orderType];
                    const TypeIcon = typeCfg?.Icon || Coffee;
                    const isDineIn = order.orderType === 'dine-in';
                    const isCancelled = order.orderStatus === 'cancelled';
                    const isRefunded = order.orderStatus === 'refunded';
                    const isPaid = order.paymentStatus === 'paid';
                    const isCompleted = order.orderStatus === 'completed';
                    
                    const showAddRound = isDineIn && !isCancelled && !isPaid;
                    const showCancelButton = !isCancelled && !isRefunded && !isPaid && order.orderStatus !== 'completed';
                    const showEditTable = isDineIn && !isCancelled && !isPaid;
                    const showRefundButton = isCancelled && !isRefunded && order.paymentStatus === 'paid';
                    const showKitchenButton = order.orderStatus === 'pending' || order.orderStatus === 'confirmed';
                    const showGenerateBill = isCompleted && !isPaid;
                    
                    const totalRounds = order.currentRound || 1;
                    const itemCount = order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;

                    return (
                      <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-gray-800">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</p>
                          {totalRounds > 1 && <p className="text-xs text-orange-500 mt-1">{totalRounds} rounds</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium">
                            <TypeIcon size={12} /> {typeCfg?.label || order.orderType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">
                            {order.orderType === 'dine-in' ? `Table ${order.tableNumber}` : order.customerName || 'Guest'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold text-sm">
                            {itemCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatPrice(order.total)}</td>
                        <td className="px-4 py-3 text-center"><StatusPill status={order.orderStatus} /></td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            isPaid ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                          }`}>
                            {isPaid ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                            {order.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center flex-wrap">
                            <button
                              onClick={() => { setSelectedOrder(order); setShowDialog(true); }}
                              className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              title="View Order"
                            >
                              <Eye size={14} className="text-blue-600" />
                            </button>

                            {showKitchenButton && (
                              <button
                                onClick={() => navigate('/kitchen')}
                                className="p-1.5 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                                title="View in Kitchen"
                              >
                                <ChefHat size={14} className="text-orange-600" />
                              </button>
                            )}

                            {showEditTable && (
                              <button
                                onClick={() => { setSelectedOrder(order); setEditingTable(true); setNewTableId(order.tableId || ''); }}
                                className="p-1.5 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                                title="Change Table"
                              >
                                <Edit2 size={14} className="text-yellow-600" />
                              </button>
                            )}

                            {showAddRound && (
                              <button
                                onClick={() => navigate(`/pos?orderId=${order._id}&round=${totalRounds + 1}&tableId=${order.tableId}`)}
                                className="p-1.5 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                                title="Add More Items"
                              >
                                <PlusCircle size={14} className="text-orange-600" />
                              </button>
                            )}

                            {showGenerateBill && (
                              <button
                                onClick={() => handleGenerateBill(order._id)}
                                disabled={generatingBill === order._id}
                                className="p-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                title="Generate Bill"
                              >
                                {generatingBill === order._id ? (
                                  <Loader2 size={14} className="text-green-600 animate-spin" />
                                ) : (
                                  <Wallet size={14} className="text-green-600" />
                                )}
                              </button>
                            )}

                            {showCancelButton && (
                              <button
                                onClick={() => { setSelectedOrder(order); setShowCancelModal(true); }}
                                className="p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                title="Cancel Order"
                              >
                                <Ban size={14} className="text-red-600" />
                              </button>
                            )}

                            {showRefundButton && (
                              <button
                                onClick={() => handleRefund(order._id)}
                                className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Process Refund"
                              >
                                <RefreshCcw size={14} className="text-blue-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── ✅ FIXED: Pagination ────────────────────────────────────── */}
          {totalOrdersCount > 0 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Showing {startIndex} to {endIndex} of {totalOrdersCount} orders
              </div>
              <div className="flex gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                        className={`w-9 h-9 rounded-lg border text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Details Dialog */}
      {showDialog && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Order #{selectedOrder.orderNumber}</h2>
                <p className="text-sm text-gray-500">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setShowDialog(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Order Type</p>
                  <p className="font-medium mt-1">{selectedOrder.orderType}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Table / Customer</p>
                  <p className="font-medium mt-1">
                    {selectedOrder.orderType === 'dine-in' ? `Table ${selectedOrder.tableNumber}` : selectedOrder.customerName || 'Guest'}
                  </p>
                </div>
              </div>

              <h3 className="font-semibold mb-3">Order Items</h3>
              <div className="space-y-2 mb-4">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-gray-500">x{item.quantity} · ₹{item.unitPrice} each</p>
                      {item.notes && <p className="text-xs text-orange-500 mt-1">📝 {item.notes}</p>}
                    </div>
                    <p className="font-semibold">₹{item.totalPrice}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between py-1">
                  <span>Subtotal</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tax (5%)</span>
                  <span>{formatPrice(selectedOrder.tax)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between py-1 text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t mt-2">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-xl text-orange-500">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t flex gap-2">
                {selectedOrder.orderType === 'dine-in' && selectedOrder.paymentStatus !== 'paid' && selectedOrder.orderStatus !== 'cancelled' && (
                  <button
                    onClick={() => {
                      setShowDialog(false);
                      navigate(`/pos?orderId=${selectedOrder._id}&round=${(selectedOrder.currentRound || 1) + 1}&tableId=${selectedOrder.tableId}`);
                    }}
                    className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-semibold text-sm"
                  >
                    <PlusCircle size={14} className="inline mr-1" /> Add Round
                  </button>
                )}
                
                {(selectedOrder.orderStatus === 'pending' || selectedOrder.orderStatus === 'confirmed') && (
                  <button
                    onClick={() => {
                      setShowDialog(false);
                      navigate('/kitchen');
                    }}
                    className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <ChefHat size={14} /> View in Kitchen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                Cancel Order
              </h3>
              <p className="text-sm text-gray-500 mt-1">Are you sure you want to cancel this order?</p>
            </div>
            
            <div className="p-5 space-y-4">
              <div className={`p-3 rounded-lg ${['confirmed', 'preparing', 'ready'].includes(selectedOrder.orderStatus) ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className={['confirmed', 'preparing', 'ready'].includes(selectedOrder.orderStatus) ? 'text-orange-500' : 'text-green-500'} />
                  <div>
                    <p className="text-sm font-medium">Order Status: {selectedOrder.orderStatus.toUpperCase()}</p>
                    <p className="text-xs mt-1">{getCancellationChargeMessage(selectedOrder.orderStatus, selectedOrder.total)}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation (optional)</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Customer changed mind, Out of stock, etc."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-blue-700">
                      After cancellation, you will be redirected to the bill page 
                      {['confirmed', 'preparing', 'ready'].includes(selectedOrder.orderStatus) ? ' to collect cancellation charges.' : '.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t flex gap-3 bg-gray-50">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancellingOrder}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancellingOrder ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                Cancel Order & {['confirmed', 'preparing', 'ready'].includes(selectedOrder.orderStatus) ? 'Pay Charges' : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {editingTable && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingTable(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Edit2 size={20} className="text-yellow-500" />
                Change Table
              </h3>
              <p className="text-sm text-gray-500 mt-1">Move order to a different table</p>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Table</label>
                <p className="text-sm font-semibold text-gray-800">Table {selectedOrder.tableNumber}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Table</label>
                <select
                  value={newTableId}
                  onChange={(e) => setNewTableId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value="">Select a table</option>
                  {tables.filter(t => t.status === 'available' || t._id === selectedOrder.tableId).map(table => (
                    <option key={table._id} value={table._id}>
                      Table {table.number} - {table.name} ({table.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="p-5 border-t flex gap-3 bg-gray-50">
              <button
                onClick={() => setEditingTable(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTable}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Change Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}