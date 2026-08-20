// pages/staff-portal/WaiterReadyOrders.tsx - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Clock, Users, Coffee, ShoppingBag, Truck,
  Loader2, RefreshCw, Utensils, Crown, Bell, Table2,
  User, Phone, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import { staffStorage } from '../../utils/storage';
// ✅ Remove useAuth - don't check isStaff

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
  orderStatus: 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  total: number;
  createdAt: string;
  isVip: boolean;
  notes?: string;
  subtotal?: number;
  tax?: number;
  branchName?: string;
  restaurantName?: string;
}

// ─── Demo Orders Data ────────────────────────────────────────────────────
const getDemoOrders = (): Order[] => {
  return [
    {
      _id: 'demo_order_1',
      orderNumber: 'DEMO-001',
      orderType: 'dine-in',
      tableNumber: '5',
      customerName: 'John Doe',
      customerPhone: '9876543210',
      items: [
        { productId: '1', productName: 'Pizza Margherita', quantity: 2, unitPrice: 250, totalPrice: 500, roundNumber: 1 },
        { productId: '2', productName: 'Pasta Alfredo', quantity: 1, unitPrice: 350, totalPrice: 350, roundNumber: 1 },
      ],
      orderStatus: 'ready',
      paymentStatus: 'pending',
      total: 850,
      createdAt: new Date().toISOString(),
      isVip: false,
      notes: 'Extra cheese on pizza',
      subtotal: 850,
      tax: 0,
    },
    {
      _id: 'demo_order_2',
      orderNumber: 'DEMO-002',
      orderType: 'dine-in',
      tableNumber: '2',
      customerName: 'Jane Smith',
      customerPhone: '9876543211',
      items: [
        { productId: '3', productName: 'Burger Deluxe', quantity: 1, unitPrice: 450, totalPrice: 450, roundNumber: 1 },
        { productId: '4', productName: 'French Fries', quantity: 2, unitPrice: 100, totalPrice: 200, roundNumber: 1 },
        { productId: '5', productName: 'Milkshake', quantity: 1, unitPrice: 150, totalPrice: 150, roundNumber: 1 },
      ],
      orderStatus: 'ready',
      paymentStatus: 'pending',
      total: 800,
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      isVip: true,
      notes: 'No onions',
      subtotal: 800,
      tax: 0,
    },
    {
      _id: 'demo_order_3',
      orderNumber: 'DEMO-003',
      orderType: 'takeaway',
      customerName: 'Mike Johnson',
      customerPhone: '9876543212',
      items: [
        { productId: '6', productName: 'Sushi Roll', quantity: 3, unitPrice: 200, totalPrice: 600, roundNumber: 1 },
        { productId: '7', productName: 'Miso Soup', quantity: 2, unitPrice: 80, totalPrice: 160, roundNumber: 1 },
      ],
      orderStatus: 'ready',
      paymentStatus: 'paid',
      total: 760,
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
      isVip: false,
      subtotal: 760,
      tax: 0,
    },
  ];
};

export default function WaiterReadyOrders() {
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [serving, setServing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isUsingDemoData, setIsUsingDemoData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ─── Fetch Ready Orders ────────────────────────────────────────────────
  const fetchReadyOrders = async () => {
    setLoading(true);
    setApiError(null);
    setIsUsingDemoData(false);
    
    try {
      const token = staffStorage.getToken();
      
      console.log('🔍 [WaiterReadyOrders] Token:', token ? '✅ Present' : '❌ Missing');
      
      if (!token) {
        console.warn('⚠️ No staff token found');
        const demos = getDemoOrders();
        setOrders(demos);
        setIsUsingDemoData(true);
        setLoading(false);
        toast.error('Please login as staff to see real orders');
        return;
      }

      // ✅ Set token in headers
      staffApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('📤 [WaiterReadyOrders] Fetching ready orders...');
      
      // ✅ First try: Get orders with status 'ready' directly
      let readyOrders = [];
      let response;
      
      try {
        // Try the staff ready orders endpoint
        response = await staffApi.get('/staff/orders/ready');
        console.log('📥 [WaiterReadyOrders] /staff/orders/ready response:', response?.status);
      } catch (err: any) {
        console.log('⚠️ Staff orders endpoint failed, trying admin orders...');
        // Fallback: fetch all orders and filter
        response = await staffApi.get('/orders');
        console.log('📥 [WaiterReadyOrders] /orders response:', response?.status);
      }
      
      if (response?.data?.success) {
        // If we got all orders, filter for ready status
        if (response.config?.url?.includes('/orders') && !response.config?.url?.includes('/ready')) {
          const allOrders = response.data.data?.orders || response.data.data || [];
          readyOrders = allOrders.filter((o: any) => o.orderStatus === 'ready');
          console.log(`📊 Filtered ${readyOrders.length} ready orders from ${allOrders.length} total orders`);
        } else {
          readyOrders = response.data.data?.orders || response.data.data || [];
          console.log(`📊 Got ${readyOrders.length} ready orders from staff endpoint`);
        }
      }
      
      if (readyOrders.length === 0) {
        console.log('⚠️ No ready orders found, using demo data');
        const demos = getDemoOrders();
        setOrders(demos);
        setIsUsingDemoData(true);
        toast.success('No ready orders found. Showing demo data.');
      } else {
        // ✅ Enrich orders with branch info from items
        const enrichedOrders = readyOrders.map((order: any) => {
          let branchName = order.branchName || 'Main Branch';
          let restaurantName = order.restaurantName || 'Restaurant';
          
          // Try to get branch from items
          if (order.items && order.items.length > 0) {
            const firstItem = order.items[0];
            if (firstItem.branchName && firstItem.branchName !== 'Main Branch') {
              branchName = firstItem.branchName;
            }
            if (firstItem.restaurantName && firstItem.restaurantName !== 'Restaurant') {
              restaurantName = firstItem.restaurantName;
            }
          }
          
          return {
            ...order,
            branchName,
            restaurantName,
          };
        });
        
        setOrders(enrichedOrders);
        console.log(`✅ Found ${enrichedOrders.length} ready orders`);
      }
    } catch (error: any) {
      console.error('❌ [WaiterReadyOrders] Error fetching ready orders:', error);
      
      if (error.response?.status === 401) {
        console.warn('🔐 Staff session expired');
        staffStorage.clear();
        const demos = getDemoOrders();
        setOrders(demos);
        setIsUsingDemoData(true);
        toast.error('Session expired. Showing demo data.');
        return;
      }
      
      // ✅ Use demo data on error
      const demos = getDemoOrders();
      setOrders(demos);
      setIsUsingDemoData(true);
      setApiError(error.response?.data?.error || error.message || 'Failed to load orders');
      toast.error('Could not load ready orders. Showing demo data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadyOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm]);

  const filterOrders = () => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = orders.filter(o =>
      o.orderNumber.toLowerCase().includes(term) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(term)) ||
      (o.customerName && o.customerName.toLowerCase().includes(term))
    );
    setFilteredOrders(filtered);
  };

  const handleServeOrder = async (orderId: string) => {
    if (serving === orderId) return;
    
    setServing(orderId);
    try {
      // ✅ Handle demo orders
      if (orderId.startsWith('demo_')) {
        toast.success('🍽️ Demo order served successfully!');
        setOrders(prev => prev.filter(o => o._id !== orderId));
        setFilteredOrders(prev => prev.filter(o => o._id !== orderId));
        if (selectedOrder?._id === orderId) {
          setShowOrderModal(false);
          setSelectedOrder(null);
        }
        setServing(null);
        return;
      }
      
      console.log(`📤 [WaiterReadyOrders] Serving order: ${orderId}`);
      
      // ✅ Try to serve order
      let response;
      try {
        response = await staffApi.patch(`/staff/orders/${orderId}/serve`);
      } catch (err: any) {
        // If staff endpoint fails, try admin endpoint
        console.log('⚠️ Staff serve failed, trying admin endpoint...');
        response = await staffApi.patch(`/orders/${orderId}/status`, {
          orderStatus: 'completed'
        });
      }
      
      if (response?.data?.success) {
        toast.success('Order served successfully! 🍽️');
        setOrders(prev => prev.filter(o => o._id !== orderId));
        setFilteredOrders(prev => prev.filter(o => o._id !== orderId));
        
        if (selectedOrder?._id === orderId) {
          setShowOrderModal(false);
          setSelectedOrder(null);
        }
        
        setTimeout(() => {
          fetchReadyOrders();
        }, 1000);
      } else {
        toast.error(response?.data?.error || 'Failed to serve order');
      }
    } catch (error: any) {
      console.error('❌ [WaiterReadyOrders] Serve error:', error);
      
      const errorMsg = error.response?.data?.error || error.message || 'Failed to serve order';
      const errorData = error.response?.data;
      
      if (errorData?.orderStatus === 'completed' || 
          errorMsg.includes('already been served') || 
          errorMsg.includes('already completed')) {
        
        toast.error('This order has already been served. Removing from list.');
        setOrders(prev => prev.filter(o => o._id !== orderId));
        setFilteredOrders(prev => prev.filter(o => o._id !== orderId));
        
        if (selectedOrder?._id === orderId) {
          setShowOrderModal(false);
          setSelectedOrder(null);
        }
        
        setTimeout(() => {
          fetchReadyOrders();
        }, 1000);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setServing(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'dine-in': return <Coffee size={14} className="text-gray-500" />;
      case 'takeaway': return <ShoppingBag size={14} className="text-gray-500" />;
      case 'delivery': return <Truck size={14} className="text-gray-500" />;
      default: return <Users size={14} className="text-gray-500" />;
    }
  };

  const handleRefresh = () => {
    fetchReadyOrders();
    toast.success('Refreshed');
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading ready orders...</p>
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
              <Bell size={24} className="text-green-500" />
              Ready to Serve
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {orders.length} order{orders.length !== 1 ? 's' : ''} ready to be served
              {isUsingDemoData && (
                <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                  Demo Mode
                </span>
              )}
              {apiError && (
                <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                  Error: {apiError}
                </span>
              )}
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

        {/* Search */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search by order #, table #, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Utensils size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">No ready orders</h3>
            <p className="text-gray-400 text-sm mt-1">
              {orders.length === 0 
                ? 'No orders are currently ready to serve.' 
                : 'Try adjusting your search terms.'}
            </p>
            <button
              onClick={() => {
                const demos = getDemoOrders();
                setOrders(demos);
                setIsUsingDemoData(true);
                toast.success('Showing demo ready orders');
              }}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Load Demo Orders
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition hover:shadow-md ${
                  order.isVip ? 'border-yellow-300 bg-yellow-50/30' : 'border-green-200'
                } ${order._id.startsWith('demo_') ? 'opacity-90' : ''}`}
              >
                {/* Card Header */}
                <div className={`p-4 border-b flex justify-between items-center ${
                  order.isVip ? 'bg-yellow-50' : 'bg-green-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getOrderTypeIcon(order.orderType)}
                      <span className="font-mono text-sm font-bold text-gray-800">
                        #{order.orderNumber}
                      </span>
                    </div>
                    {order.isVip && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white flex items-center gap-1">
                        <Crown size={10} /> VIP
                      </span>
                    )}
                    {order._id.startsWith('demo_') && (
                      <span className="text-[8px] bg-yellow-400 text-yellow-800 px-1.5 py-0.5 rounded-full">DEMO</span>
                    )}
                    {order.branchName && !order._id.startsWith('demo_') && (
                      <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                        {order.branchName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Ready
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      {order.tableNumber && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Table2 size={14} />
                          <span className="font-medium">Table {order.tableNumber}</span>
                          {order.orderType === 'dine-in' && (
                            <span className="text-xs text-gray-400">(Dine In)</span>
                          )}
                        </div>
                      )}
                      {order.customerName && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <User size={14} />
                          <span>{order.customerName}</span>
                        </div>
                      )}
                      {order.customerPhone && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <Phone size={12} />
                          <span>{order.customerPhone}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Ready at: {formatTime(order.createdAt)}
                        <span className="ml-2">({formatDate(order.createdAt)})</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                    >
                      View Details →
                    </button>
                  </div>

                  {/* Items Preview */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600">
                          {item.quantity}× {item.productName}
                        </span>
                        {item.roundNumber > 1 && (
                          <span className="text-xs text-gray-400">Round {item.roundNumber}</span>
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="text-xs text-gray-400 mt-1">
                        +{order.items.length - 3} more items
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mb-3 pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="text-lg font-bold text-gray-800">{formatCurrency(order.total)}</span>
                  </div>

                  {/* Serve Button */}
                  <button
                    onClick={() => handleServeOrder(order._id)}
                    disabled={serving === order._id}
                    className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm shadow-green-200 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {serving === order._id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Utensils size={16} />
                    )}
                    {serving === order._id ? 'Serving...' : '🍽️ Serve Order'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Order Details Modal ─────────────────────────────────────────── */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowOrderModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowOrderModal(false)} />
            <div className="relative bg-white rounded-xl max-w-2xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className={`p-5 border-b flex justify-between items-center ${
                selectedOrder.isVip ? 'bg-yellow-50' : 'bg-green-50'
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
                  <div>
                    <p className="text-xs text-gray-400">Order Number</p>
                    <p className="font-mono font-semibold">#{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Order Type</p>
                    <p className="capitalize flex items-center gap-1">{getOrderTypeIcon(selectedOrder.orderType)}{selectedOrder.orderType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Table Number</p>
                    <p className="font-semibold">{selectedOrder.tableNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="font-semibold">{selectedOrder.customerName || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="font-semibold">{selectedOrder.customerPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Ready At</p>
                    <p className="font-semibold">{formatTime(selectedOrder.createdAt)}</p>
                  </div>
                  {selectedOrder.branchName && (
                    <div>
                      <p className="text-xs text-gray-400">Branch</p>
                      <p className="font-semibold text-sm">{selectedOrder.branchName}</p>
                    </div>
                  )}
                </div>

                <h4 className="font-semibold text-gray-800 mb-3">Order Items</h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden mb-5">
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
                        <td className="px-4 py-2 text-right">{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium">Tax</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(selectedOrder.tax || 0)}</td>
                      </tr>
                      <tr className="bg-gray-100">
                        <td colSpan={3} className="px-4 py-2 text-right font-bold">Total</td>
                        <td className="px-4 py-2 text-right font-bold">{formatCurrency(selectedOrder.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {selectedOrder.notes && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Order Notes</h4>
                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div className="p-5 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleServeOrder(selectedOrder._id);
                    setShowOrderModal(false);
                  }}
                  disabled={serving === selectedOrder._id}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 disabled:opacity-50"
                >
                  {serving === selectedOrder._id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Utensils size={16} />
                  )}
                  Serve Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}