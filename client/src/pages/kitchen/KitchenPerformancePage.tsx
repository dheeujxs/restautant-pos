import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  TrendingUp, TrendingDown, Clock, CheckCircle, XCircle,
  ChefHat, Zap, Flame, Award, BarChart3, PieChart,
  Calendar, RefreshCw, Loader2, Crown, Target,
  Timer, Users, Coffee, ShoppingBag, Truck, AlertCircle,
  ArrowLeft, Download, Filter, ChevronDown
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import toast from 'react-hot-toast';

interface PerformanceStats {
  totalOrders: number;
  completedOrders: number;
  averagePrepTime: number;
  averageWaitTime: number;
  onTimeRate: number;
  delayedOrders: number;
  chefEfficiency: number;
  vipPriorityTime: number;
  normalPriorityTime: number;
}

interface DailyPerformance {
  date: string;
  orders: number;
  avgPrepTime: number;
  onTimeRate: number;
}

interface ChefPerformance {
  chefName: string;
  ordersCompleted: number;
  averageTime: number;
  onTimeRate: number;
  efficiency: number;
}

interface CategoryPerformance {
  name: string;
  value: number;
  color: string;
  avgTime: number;
}

interface OrderTiming {
  orderNumber: string;
  orderType: string;
  expectedTime: number;
  actualTime: number;
  status: 'on-time' | 'delayed' | 'urgent';
}

const COLORS = ['#f97316', '#22c55e', '#8b5cf6', '#3b82f6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];

export default function KitchenPerformancePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PerformanceStats>({
    totalOrders: 0,
    completedOrders: 0,
    averagePrepTime: 0,
    averageWaitTime: 0,
    onTimeRate: 0,
    delayedOrders: 0,
    chefEfficiency: 0,
    vipPriorityTime: 0,
    normalPriorityTime: 0,
  });
  const [dailyData, setDailyData] = useState<DailyPerformance[]>([]);
  const [chefData, setChefData] = useState<ChefPerformance[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryPerformance[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderTiming[]>([]);
  const [timeRange, setTimeRange] = useState('week');
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowRangeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      // Fetch completed orders from last 30 days
      const ordersRes = await api.get('/orders?limit=500');
      const orders = ordersRes.data.data?.orders || [];
      
      const completedOrders = orders.filter((o: any) => o.orderStatus === 'completed');
      const today = new Date();
      let filteredOrders = completedOrders;
      
      if (timeRange === 'week') {
        const weekAgo = new Date(today.setDate(today.getDate() - 7));
        filteredOrders = completedOrders.filter((o: any) => new Date(o.createdAt) > weekAgo);
      } else if (timeRange === 'month') {
        const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
        filteredOrders = completedOrders.filter((o: any) => new Date(o.createdAt) > monthAgo);
      }
      
      // Calculate average prep times
      let totalPrepTime = 0;
      let totalWaitTime = 0;
      let onTimeCount = 0;
      let delayedCount = 0;
      let vipTotalTime = 0;
      let vipCount = 0;
      let normalTotalTime = 0;
      let normalCount = 0;
      
      const orderTimings: OrderTiming[] = [];
      
      for (const order of filteredOrders) {
        const createdAt = new Date(order.createdAt);
        const completedAt = order.updatedAt ? new Date(order.updatedAt) : new Date();
        const actualTime = Math.floor((completedAt.getTime() - createdAt.getTime()) / 60000);
        const expectedTime = Math.max(...(order.items?.map((i: any) => i.prepTimeMinutes || 15) || [15]));
        
        totalPrepTime += actualTime;
        totalWaitTime += actualTime - expectedTime > 0 ? actualTime - expectedTime : 0;
        
        if (actualTime <= expectedTime + 5) {
          onTimeCount++;
        } else {
          delayedCount++;
        }
        
        if (order.isVip) {
          vipTotalTime += actualTime;
          vipCount++;
        } else {
          normalTotalTime += actualTime;
          normalCount++;
        }
        
        orderTimings.push({
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          expectedTime,
          actualTime,
          status: actualTime <= expectedTime + 5 ? 'on-time' : actualTime > expectedTime + 15 ? 'urgent' : 'delayed'
        });
      }
      
      // Daily data for chart
      const last7Days = getLast7Days();
      const dailyMap = new Map();
      last7Days.forEach(day => dailyMap.set(day, { date: day, orders: 0, avgPrepTime: 0, onTimeRate: 0, totalTime: 0, count: 0, onTimeCount: 0 }));
      
      filteredOrders.forEach((order: any) => {
        const date = new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'short' });
        if (dailyMap.has(date)) {
          const existing = dailyMap.get(date);
          const actualTime = Math.floor((new Date(order.updatedAt || order.createdAt).getTime() - new Date(order.createdAt).getTime()) / 60000);
          const expectedTime = Math.max(...(order.items?.map((i: any) => i.prepTimeMinutes || 15) || [15]));
          const isOnTime = actualTime <= expectedTime + 5;
          
          dailyMap.set(date, {
            ...existing,
            orders: existing.orders + 1,
            totalTime: existing.totalTime + actualTime,
            count: existing.count + 1,
            onTimeCount: existing.onTimeCount + (isOnTime ? 1 : 0)
          });
        }
      });
      
      const dailyDataArray = Array.from(dailyMap.values()).map((d: any) => ({
        date: d.date,
        orders: d.orders,
        avgPrepTime: d.count > 0 ? Math.round(d.totalTime / d.count) : 0,
        onTimeRate: d.orders > 0 ? Math.round((d.onTimeCount / d.orders) * 100) : 0
      }));
      
      // Category performance from products
      const productsRes = await api.get('/products?limit=200');
      const products = productsRes.data.data?.products || [];
      const categoryMap = new Map();
      products.forEach((product: any) => {
        const cat = product.category || 'Other';
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { count: 0, totalPrepTime: 0 });
        }
        const existing = categoryMap.get(cat);
        categoryMap.set(cat, {
          count: existing.count + 1,
          totalPrepTime: existing.totalPrepTime + (product.prepTimeMinutes || 15)
        });
      });
      
      const categoryColors = ['#f97316', '#22c55e', '#8b5cf6', '#3b82f6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899'];
      let colorIdx = 0;
      const categoryArray = Array.from(categoryMap.entries()).map(([name, data]: [string, any]) => ({
        name,
        value: data.count,
        avgTime: Math.round(data.totalPrepTime / data.count),
        color: categoryColors[colorIdx++ % categoryColors.length]
      }));
      
      setStats({
        totalOrders: filteredOrders.length,
        completedOrders: filteredOrders.length,
        averagePrepTime: filteredOrders.length > 0 ? Math.round(totalPrepTime / filteredOrders.length) : 0,
        averageWaitTime: filteredOrders.length > 0 ? Math.round(totalWaitTime / filteredOrders.length) : 0,
        onTimeRate: filteredOrders.length > 0 ? Math.round((onTimeCount / filteredOrders.length) * 100) : 0,
        delayedOrders: delayedCount,
        chefEfficiency: filteredOrders.length > 0 ? Math.round(((onTimeCount / filteredOrders.length) * 0.7 + (1 - (totalWaitTime / totalPrepTime || 0)) * 0.3) * 100) : 0,
        vipPriorityTime: vipCount > 0 ? Math.round(vipTotalTime / vipCount) : 0,
        normalPriorityTime: normalCount > 0 ? Math.round(normalTotalTime / normalCount) : 0,
      });
      
      setDailyData(dailyDataArray);
      setCategoryData(categoryArray);
      setRecentOrders(orderTimings.slice(0, 10));
      
      // Mock chef data (in real app, fetch from users with chef role)
      setChefData([
        { chefName: 'Chef Ramesh', ordersCompleted: 45, averageTime: 18, onTimeRate: 88, efficiency: 85 },
        { chefName: 'Chef Suresh', ordersCompleted: 38, averageTime: 22, onTimeRate: 76, efficiency: 72 },
        { chefName: 'Chef Priya', ordersCompleted: 52, averageTime: 16, onTimeRate: 92, efficiency: 90 },
        { chefName: 'Chef Amit', ordersCompleted: 31, averageTime: 20, onTimeRate: 82, efficiency: 78 },
      ]);
      
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getLast7Days = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
    return days.map((_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + mondayOffset + i);
      return date.toLocaleDateString('en-IN', { weekday: 'short' });
    });
  };

  const timeRanges = [
    { label: 'Last 7 Days', value: 'week' },
    { label: 'Last 30 Days', value: 'month' },
    { label: 'All Time', value: 'all' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'bg-green-100 text-green-700';
      case 'delayed': return 'bg-yellow-100 text-yellow-700';
      case 'urgent': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/kitchen')} className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition">
                <ArrowLeft size={18} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 size={26} className="text-orange-500" />
                  Kitchen Performance
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">Real-time efficiency metrics & analytics</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Calendar size={14} />
                  {timeRanges.find(r => r.value === timeRange)?.label}
                  <ChevronDown size={14} />
                </button>
                {showRangeDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 z-10">
                    {timeRanges.map(range => (
                      <button
                        key={range.value}
                        onClick={() => { setTimeRange(range.value); setShowRangeDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={fetchPerformanceData} className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                <RefreshCw size={16} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
                <p className="text-xs text-gray-500">Completed Orders</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={18} className="text-green-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <TrendingUp size={12} className="text-green-500" />
              <span className="text-xs text-green-600">+{stats.onTimeRate}% on-time</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.averagePrepTime} min</p>
                <p className="text-xs text-gray-500">Avg Prep Time</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Timer size={18} className="text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <Target size={12} className="text-gray-400" />
              <span className="text-xs text-gray-500">Target: 20 min</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.onTimeRate}%</p>
                <p className="text-xs text-gray-500">On-Time Rate</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Award size={18} className="text-purple-500" />
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${stats.onTimeRate}%` }} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.chefEfficiency}%</p>
                <p className="text-xs text-gray-500">Chef Efficiency</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <ChefHat size={18} className="text-orange-500" />
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${stats.chefEfficiency}%` }} />
            </div>
          </div>
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.delayedOrders}</p>
                <p className="text-xs text-gray-500">Delayed Orders</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Flame size={18} className="text-red-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.vipPriorityTime} min</p>
                <p className="text-xs text-gray-500">VIP Order Avg Time</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Crown size={18} className="text-amber-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-600">{stats.normalPriorityTime} min</p>
                <p className="text-xs text-gray-500">Normal Order Avg Time</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock size={18} className="text-gray-500" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-green-600">{stats.vipPriorityTime - stats.normalPriorityTime > 0 ? `VIP faster by ${stats.vipPriorityTime - stats.normalPriorityTime} min` : 'VIP priority active'}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-teal-600">{stats.averageWaitTime} min</p>
                <p className="text-xs text-gray-500">Avg Wait Time (Extra)</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Clock size={18} className="text-teal-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Performance Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Daily Performance Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
                <XAxis dataKey="date" tick={{ fill: '#a8a29e', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#a8a29e', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#a8a29e', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: 'none', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="avgPrepTime" stroke="#f97316" strokeWidth={2} name="Avg Prep Time (min)" dot={{ fill: '#f97316', r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} name="Orders" dot={{ fill: '#22c55e', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-3">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-xs text-gray-500">Avg Prep Time</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs text-gray-500">Orders Count</span></div>
            </div>
          </div>

          {/* Category Performance Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Category Distribution</h3>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3 w-full">
                {categoryData.map((cat) => (
                  <div key={cat.name} className="flex justify-between text-xs">
                    <span className="text-gray-600">{cat.name}</span>
                    <span className="font-medium text-gray-800">{cat.avgTime} min avg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chef Performance Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ChefHat size={18} className="text-orange-500" />
              Chef Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Chef</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Orders</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Avg Time</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">On-Time Rate</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Efficiency</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {chefData.map((chef, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{chef.chefName}</td>
                    <td className="px-5 py-3 text-center text-gray-600">{chef.ordersCompleted}</td>
                    <td className="px-5 py-3 text-center text-gray-600">{chef.averageTime} min</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-gray-600">{chef.onTimeRate}%</span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${chef.onTimeRate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-gray-600">{chef.efficiency}%</span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${chef.efficiency}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${chef.efficiency >= 85 ? 'bg-green-100 text-green-700' : chef.efficiency >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {chef.efficiency >= 85 ? 'Excellent' : chef.efficiency >= 70 ? 'Good' : 'Needs Improvement'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders Timing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              Recent Order Timings
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Order #</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Expected</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Actual</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Variance</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((order, idx) => {
                  const variance = order.actualTime - order.expectedTime;
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono font-medium text-gray-800">{order.orderNumber}</td>
                      <td className="px-5 py-3 text-gray-600 capitalize">{order.orderType}</td>
                      <td className="px-5 py-3 text-center text-gray-600">{order.expectedTime} min</td>
                      <td className="px-5 py-3 text-center text-gray-600">{order.actualTime} min</td>
                      <td className={`px-5 py-3 text-center font-medium ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {variance > 0 ? `+${variance}` : variance < 0 ? `${variance}` : '0'} min
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status === 'on-time' ? '✓ On Time' : order.status === 'delayed' ? '⚠️ Delayed' : '🔥 Urgent'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}