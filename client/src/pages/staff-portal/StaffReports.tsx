import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Clock,
  Calendar, Download, Filter, Loader2, RefreshCw,
  Coffee, ShoppingBag, Truck, Crown, Package,
  DollarSign, PieChart, Activity, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api'; // ✅ Use staffApi

interface ReportStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  vipOrders: number;
  dineIn: number;
  takeaway: number;
  delivery: number;
  topItems: Array<{ name: string; count: number; revenue: number }>;
  peakHours: Array<{ hour: string; orders: number }>;
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    total: number;
    orderStatus: string;
    createdAt: string;
    tableNumber?: string;
  }>;
}

export default function StaffReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    vipOrders: 0,
    dineIn: 0,
    takeaway: 0,
    delivery: 0,
    topItems: [],
    peakHours: [],
    recentOrders: [],
  });
  const [dateRange, setDateRange] = useState('today');

  useEffect(() => {
    const staffToken = localStorage.getItem('staffToken');
    if (!staffToken) {
      toast.error('Please login again');
      navigate('/staff-portal/login');
      return;
    }
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching reports for range:', dateRange);
      // ✅ Use staffApi instead of api
      const response = await staffApi.get(`/staff-portal/reports?range=${dateRange}`);
      
      console.log('📊 Reports response:', response.data);
      
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        toast.error(response.data.error || 'Failed to load reports');
      }
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffData');
        navigate('/staff-portal/login');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to view reports.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to load reports');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-purple-100 text-purple-700',
      ready: 'bg-green-100 text-green-700',
      completed: 'bg-teal-100 text-teal-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  const staffData = JSON.parse(localStorage.getItem('staffData') || '{}');
  const role = staffData?.role || 'Staff';

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 size={24} className="text-orange-500" />
              Reports
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {role === 'chef' ? 'Kitchen performance and order analytics' : 
               role === 'waiter' ? 'Your service performance and order insights' : 
               'Sales and order analytics'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <button
              onClick={() => fetchReports()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
                <p className="text-xs text-gray-500">Total Orders</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Package size={18} className="text-orange-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500">Total Revenue</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign size={18} className="text-green-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.averageOrderValue)}</p>
                <p className="text-xs text-gray-500">Avg. Order Value</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp size={18} className="text-purple-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.vipOrders}</p>
                <p className="text-xs text-gray-500">VIP Orders</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Crown size={18} className="text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Order Type Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Coffee size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">{stats.dineIn}</p>
                <p className="text-xs text-gray-500">Dine In</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <ShoppingBag size={18} className="text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">{stats.takeaway}</p>
                <p className="text-xs text-gray-500">Takeaway</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Truck size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">{stats.delivery}</p>
                <p className="text-xs text-gray-500">Delivery</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-orange-500" />
              Top Selling Items
            </h3>
            <div className="space-y-3">
              {stats.topItems.length === 0 ? (
                <p className="text-center text-gray-400 py-4">No items sold in this period</p>
              ) : (
                stats.topItems.slice(0, 8).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${
                        idx === 0 ? 'text-yellow-500' :
                        idx === 1 ? 'text-gray-400' :
                        idx === 2 ? 'text-orange-400' : 'text-gray-400'
                      }`}>#{idx + 1}</span>
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span className="text-xs text-gray-400">({item.count} orders)</span>
                    </div>
                    <span className="font-semibold text-gray-800">{formatCurrency(item.revenue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />
              Peak Hours
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {stats.peakHours.length === 0 ? (
                <p className="text-center text-gray-400 py-4 col-span-full">No data available</p>
              ) : (
                stats.peakHours.map((hour, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition">
                    <p className="text-xs text-gray-400">{hour.hour}</p>
                    <p className="text-lg font-bold text-gray-800">{hour.orders}</p>
                    <p className="text-xs text-gray-400">orders</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-orange-500" />
            Recent Orders
          </h3>
          {stats.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Order #</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Table</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Total</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentOrders.slice(0, 10).map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 font-mono text-gray-800">#{order.orderNumber}</td>
                      <td className="px-4 py-2 text-gray-600">{order.tableNumber || 'N/A'}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-4">No recent orders</p>
          )}
        </div>
      </div>
    </div>
  );
}