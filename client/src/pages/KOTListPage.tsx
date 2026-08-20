// src/pages/kot/KOTListPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { 
  Printer, Eye, CheckCircle, XCircle, Clock, 
  CookingPot, RefreshCw, Search,
  CheckSquare, Coffee, ShoppingBag, Truck,
  Bell, Play, Timer, Flame, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  orderStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  total: number;
  createdAt: string;
  notes?: string;
}

const statusConfig = {
  pending: { label: 'New Order', color: '#F59E0B', bg: '#FEF3C7', icon: Bell, nextStatus: 'confirmed' },
  confirmed: { label: 'Confirmed', color: '#3B82F6', bg: '#EFF6FF', icon: CheckCircle, nextStatus: 'preparing' },
  preparing: { label: 'Preparing', color: '#8B5CF6', bg: '#F5F3FF', icon: CookingPot, nextStatus: 'ready' },
  ready: { label: 'Ready', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle, nextStatus: 'completed' },
  completed: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6', icon: CheckSquare, nextStatus: null },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2', icon: XCircle, nextStatus: null },
};

const orderTypeIcons = {
  'dine-in': Coffee,
  'takeaway': ShoppingBag,
  'delivery': Truck,
};

const elapsed = (createdAt: string) => {
  const m = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
};

const getPriority = (createdAt: string, total: number) => {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (minutes > 30) return { label: 'URGENT', color: '#DC2626', bg: '#FEF2F2' };
  if (minutes > 20) return { label: 'HIGH', color: '#EA580C', bg: '#FFF7ED' };
  if (total > 5000) return { label: 'HIGH VALUE', color: '#D97706', bg: '#FFFBEB' };
  return null;
};

export default function KOTListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching orders from /api/orders...');
      const res = await adminApi.get('/orders?limit=100');
      console.log('API Response:', res.data);
      
      if (res.data.success) {
        const allOrders = res.data.data?.orders || [];
        console.log('All orders:', allOrders);
        console.log('Total orders count:', allOrders.length);
        
        // Filter out completed and cancelled for active view
        const activeOrders = allOrders.filter(
          (o: Order) => !['completed', 'cancelled'].includes(o.orderStatus)
        );
        console.log('Active orders:', activeOrders);
        console.log('Active orders count:', activeOrders.length);
        
        setOrders(activeOrders);
      } else {
        console.error('API returned success false');
        setError('Failed to fetch orders');
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to fetch orders');
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, currentStatus: string) => {
    const nextStatus = statusConfig[currentStatus as keyof typeof statusConfig]?.nextStatus;
    if (!nextStatus) return;
    
    try {
      await adminApi.patch(`/orders/${orderId}/status`, { orderStatus: nextStatus });
      toast.success(`Order status updated to ${statusConfig[nextStatus].label}`);
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>KOT - ${order.orderNumber}</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              .container { max-width: 300px; margin: 0 auto; border: 2px dashed #333; padding: 15px; }
              .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 10px; }
              .kot-title { font-size: 18px; font-weight: bold; color: #f97316; }
              .item { margin: 10px 0; border-bottom: 1px dotted #ccc; padding: 5px; }
              .qty { background: #f97316; color: white; padding: 2px 6px; border-radius: 4px; }
              .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="kot-title">KITCHEN ORDER TICKET</div>
                <div>Order #${order.orderNumber}</div>
              </div>
              <div><strong>Type:</strong> ${order.orderType.toUpperCase()}</div>
              ${order.tableNumber ? `<div><strong>Table:</strong> ${order.tableNumber}</div>` : ''}
              <div><strong>Time:</strong> ${new Date(order.createdAt).toLocaleTimeString()}</div>
              <div style="margin: 15px 0;"><strong>ITEMS:</strong></div>
              ${order.items.map(item => `
                <div class="item">
                  <span class="qty">${item.quantity}x</span> ${item.productName}
                  ${item.notes ? `<br/><small>📝 ${item.notes}</small>` : ''}
                </div>
              `).join('')}
              <div class="footer">Printed: ${new Date().toLocaleString()}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      toast.success('KOT printed');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (search && !order.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && order.orderStatus !== statusFilter) return false;
    return true;
  });

  const stats = {
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
    preparing: orders.filter(o => o.orderStatus === 'preparing').length,
    ready: orders.filter(o => o.orderStatus === 'ready').length,
    total: orders.length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kitchen Order Tickets</h1>
            <p className="text-gray-500 text-sm">Manage all active kitchen orders</p>
          </div>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg flex items-center gap-2 hover:bg-orange-600"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Debug Info - Remove after testing */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 text-sm">
          <strong>Debug:</strong> Total orders in DB: {orders.length} | 
          Pending: {stats.pending} | Confirmed: {stats.confirmed} | 
          Preparing: {stats.preparing} | Ready: {stats.ready}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'New Orders', count: stats.pending, color: '#F59E0B', bg: '#FEF3C7' },
            { label: 'Confirmed', count: stats.confirmed, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Preparing', count: stats.preparing, color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Ready', count: stats.ready, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Total Active', count: stats.total, color: '#6B7280', bg: '#F3F4F6' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="pending">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
            </select>
          </div>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <CookingPot size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-600">No active orders</h3>
            <p className="text-gray-400">
              {stats.total === 0 ? 'No orders in database' : 'All orders are completed or cancelled'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredOrders.map((order) => {
              const Status = statusConfig[order.orderStatus];
              const TypeIcon = orderTypeIcons[order.orderType];
              const rush = getPriority(order.createdAt, order.total);
              
              return (
                <div key={order._id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all">
                  
                  {/* Rush Banner */}
                  {rush && (
                    <div className="px-4 py-1.5 flex items-center gap-2" style={{ background: rush.bg }}>
                      <Flame size={12} color={rush.color} />
                      <span className="text-xs font-medium" style={{ color: rush.color }}>{rush.label}</span>
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-800">{order.orderNumber}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium`} style={{ background: Status.bg, color: Status.color }}>
                            <Status.icon size={10} />
                            {Status.label}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                            <TypeIcon size={10} />
                            {order.orderType === 'dine-in' ? 'Dine In' : order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {order.tableNumber && <span>Table {order.tableNumber}</span>}
                          {order.customerName && <span>{order.customerName}</span>}
                          <span className="flex items-center gap-1"><Clock size={10} /> {elapsed(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800">₹{order.total}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="p-4 space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-orange-500">{item.quantity}×</span>
                          <span className="text-gray-700">{item.productName}</span>
                        </div>
                        {item.notes && <span className="text-xs text-orange-500">📝</span>}
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="mx-4 mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                      <p className="text-xs text-yellow-700">📝 {order.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="p-4 bg-gray-50 flex gap-2">
                    <button
                      onClick={() => handlePrint(order)}
                      className="flex-1 py-2 bg-gray-600 text-white rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-gray-700"
                    >
                      <Printer size={14} /> Print
                    </button>
                    {Status.nextStatus && (
                      <button
                        onClick={() => updateStatus(order._id, order.orderStatus)}
                        className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all"
                        style={{ backgroundColor: statusConfig[Status.nextStatus]?.color || Status.color }}
                      >
                        <Play size={14} className="inline mr-1" />
                        {Status.nextStatus === 'confirmed' && 'Confirm'}
                        {Status.nextStatus === 'preparing' && 'Start Prep'}
                        {Status.nextStatus === 'ready' && 'Mark Ready'}
                        {Status.nextStatus === 'completed' && 'Complete'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}