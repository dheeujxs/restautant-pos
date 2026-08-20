// pages/staff-portal/DeliveryPortal.tsx
import { useState, useEffect } from 'react';
import { staffApi } from '../../services/api';
import {
  Bike, Package, Truck, CheckCircle, XCircle,
  Loader2, RefreshCw, Power, PowerOff, Clock,
  DollarSign, Star, TrendingUp, User, MapPin,
  Phone, Navigation, ChevronRight, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DeliveryOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{ productName: string; quantity: number }>;
  total: number;
  deliveryStatus: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  restaurantName: string;
  distance: number;
  estimatedTime: number;
  isVip: boolean;
  createdAt: string;
}

const STATUS_CONFIG = {
  'assigned': { label: 'Assigned', color: '#3b82f6', bg: '#eff6ff', icon: Package },
  'picked_up': { label: 'Picked Up', color: '#f59e0b', bg: '#fef3c7', icon: Package },
  'in_transit': { label: 'In Transit', color: '#8b5cf6', bg: '#f5f3ff', icon: Truck },
  'delivered': { label: 'Delivered', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle },
  'cancelled': { label: 'Cancelled', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['assigned'];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium`}
      style={{ background: config.bg, color: config.color }}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

export default function DeliveryPortal() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    earnings: 0,
    rating: 4.8
  });

  useEffect(() => {
    fetchOrders();
    fetchStats();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await staffApi.get('/delivery/orders');
      if (response.data.success) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await staffApi.get('/delivery/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const response = await staffApi.patch('/delivery/status', { isAvailable: !isOnline });
      if (response.data.success) {
        setIsOnline(!isOnline);
        toast.success(isOnline ? 'You are now offline' : 'You are now online');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  const assignedOrders = orders.filter(o => o.deliveryStatus === 'assigned');
  const inProgressOrders = orders.filter(o => ['picked_up', 'in_transit'].includes(o.deliveryStatus));
  const completedOrders = orders.filter(o => o.deliveryStatus === 'delivered');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bike size={24} className="text-green-500" />
            Delivery Portal
          </h1>
          <p className="text-gray-500 text-sm">Manage your deliveries</p>
        </div>
        
        <button
          onClick={toggleOnlineStatus}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
            isOnline ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-600'
          }`}
        >
          {isOnline ? <Power size={16} /> : <PowerOff size={16} />}
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Orders</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-100">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
          <p className="text-2xl font-bold text-orange-600">₹{stats.earnings}</p>
          <p className="text-xs text-gray-500">Earnings</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
          <p className="text-2xl font-bold text-purple-600">{stats.rating} ★</p>
          <p className="text-xs text-gray-500">Rating</p>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-600 font-medium">New Assignments</p>
              <p className="text-2xl font-bold text-blue-700">{assignedOrders.length}</p>
            </div>
            <Package size={28} className="text-blue-400" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-yellow-600 font-medium">In Progress</p>
              <p className="text-2xl font-bold text-yellow-700">{inProgressOrders.length}</p>
            </div>
            <Truck size={28} className="text-yellow-400" />
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed Today</p>
              <p className="text-2xl font-bold text-green-700">{completedOrders.length}</p>
            </div>
            <CheckCircle size={28} className="text-green-400" />
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Recent Orders</h3>
          <button onClick={fetchOrders} className="text-xs text-gray-400 hover:text-gray-600">
            <RefreshCw size={14} className="inline mr-1" /> Refresh
          </button>
        </div>
        
        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <Bike size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No orders assigned</p>
            <p className="text-xs text-gray-400 mt-1">Orders will appear here when assigned</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.slice(0, 5).map((order) => (
              <div key={order._id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-gray-800">#{order.orderNumber}</span>
                      {order.isVip && (
                        <span className="px-1.5 py-0.5 bg-yellow-500 text-white text-[10px] rounded font-bold">VIP</span>
                      )}
                      <StatusBadge status={order.deliveryStatus} />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.customerName} • {order.distance} km • {order.estimatedTime} min
                    </p>
                    <p className="text-xs text-gray-400">₹{order.total} • {order.restaurantName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <Phone size={16} className="text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <MapPin size={16} className="text-gray-400" />
                    </button>
                    {order.deliveryStatus === 'assigned' && (
                      <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600">
                        Pick Up
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Navigation size={20} className="text-blue-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-blue-700">Stay Online to Receive Orders</p>
          <p className="text-xs text-blue-600">Keep your status online to get new delivery assignments</p>
        </div>
      </div>
    </div>
  );
}