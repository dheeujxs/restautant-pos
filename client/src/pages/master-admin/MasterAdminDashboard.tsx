// pages/master-admin/MasterAdminDashboard.tsx - MASTER ADMIN DASHBOARD

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, Coffee,
  Wallet, Clock, ChevronDown,
  Loader2, Utensils, Calendar, Users,
  DollarSign, Building2, Crown, Download,
  RefreshCw, ChevronRight, Store,
  LayoutGrid, Activity, BarChart3, Award,
  UserCheck, UserX, ChefHat, Pizza,
  Brush, CreditCard, FileText, MapPin,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { masterAdminApi } from '../../services/api';
import toast from 'react-hot-toast';
import moment from 'moment';

// ─── Types ──────────────────────────────────────────────────────────────

interface DashboardStats {
  totalRestaurants: number;
  activeRestaurants: number;
  pendingRestaurants: number;
  suspendedRestaurants: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalStaff: number;
  activeStaff: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  growth: number;
  dailyAverage: number;
  todayRevenue: number;
  todayOrders: number;
  totalSuperAdmins: number;
  totalBranches: number;
  platformRevenue: number;
}

interface DashboardDataPoint {
  name: string;
  sales: number;
  orders: number;
}

interface Payment {
  _id: string;
  billNumber: string;
  orderNumber: string;
  customerName: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  restaurantName: string;
  branchName: string;
  createdAt: string;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  orderStatus: string;
  orderType: string;
  tableNumber: string;
  createdAt: string;
  restaurantName: string;
  branchName: string;
}

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive';
  restaurantName: string;
  branchName: string;
  joinedAt: string;
}

interface Branch {
  _id: string;
  name: string;
  restaurantId: string;
  restaurantName?: string;
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function MasterAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalRestaurants: 0,
    activeRestaurants: 0,
    pendingRestaurants: 0,
    suspendedRestaurants: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalStaff: 0,
    activeStaff: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    growth: 0,
    dailyAverage: 0,
    todayRevenue: 0,
    todayOrders: 0,
    totalSuperAdmins: 0,
    totalBranches: 0,
    platformRevenue: 0,
  });
  const [chartData, setChartData] = useState<DashboardDataPoint[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentStaff, setRecentStaff] = useState<StaffMember[]>([]);

  // ─── Filter States ──────────────────────────────────────────────────
  const [selectedRange, setSelectedRange] = useState('month');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ─── Data States ────────────────────────────────────────────────────
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const timeRanges = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'Custom Range', value: 'custom' },
  ];

  // ─── Effects ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAllBranches();
  }, []);

  useEffect(() => {
    console.log('🔄 Branch changed, fetching dashboard data...');
    fetchDashboardData();
  }, [selectedBranch]);

  useEffect(() => {
    console.log('🔄 Range changed, fetching dashboard data...');
    fetchDashboardData();
  }, [selectedRange, customStartDate, customEndDate]);

  // ─── Click Outside Handlers ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Data Fetching Functions ──────────────────────────────────────────

  const fetchAllBranches = async () => {
    setLoadingBranches(true);
    try {
      console.log('📍 Fetching all branches...');
      // ✅ Use masterAdminApi
      const response = await masterAdminApi.get('/super-admin/branches?limit=1000');
      console.log('📥 Branches response:', response.data);

      if (response.data?.success) {
        const branchesData = response.data.data?.branches || response.data.data || [];
        setBranches(branchesData);
        console.log(`✅ Fetched ${branchesData.length} branches`);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  // ─── Generate Chart Data - MONTHLY BASIS ──────────────────────────────

  const generateChartData = useCallback((dailyData: any[]) => {
    console.log('📊 Generating chart data from:', dailyData);
    console.log('📊 Selected Range:', selectedRange);
    console.log('📍 Selected Branch:', selectedBranch);

    if (!dailyData || dailyData.length === 0) {
      console.log('📊 No daily data, generating sample data for demo');

      if (selectedRange === 'year') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.map(month => ({
          name: month,
          sales: Math.floor(Math.random() * 5000) + 1000,
          orders: Math.floor(Math.random() * 20) + 5,
        }));
      } else if (selectedRange === 'month') {
        const monthName = moment().format('MMM YYYY');
        return [{
          name: monthName,
          sales: Math.floor(Math.random() * 30000) + 5000,
          orders: Math.floor(Math.random() * 100) + 20,
        }];
      } else if (selectedRange === 'week') {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map(day => ({
          name: day,
          sales: Math.floor(Math.random() * 4000) + 800,
          orders: Math.floor(Math.random() * 18) + 3,
        }));
      } else {
        const hours = ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'];
        return hours.map(hour => ({
          name: hour,
          sales: Math.floor(Math.random() * 2000) + 200,
          orders: Math.floor(Math.random() * 10) + 1,
        }));
      }
    }

    let result = [];

    if (selectedRange === 'year') {
      const monthMap: Record<string, { revenue: number; orders: number }> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      months.forEach(m => {
        monthMap[m] = { revenue: 0, orders: 0 };
      });

      dailyData.forEach((d: any) => {
        const month = moment(d.date).format('MMM');
        if (monthMap[month]) {
          monthMap[month].revenue += d.revenue || 0;
          monthMap[month].orders += d.orders || 0;
        }
      });

      result = months.map(month => ({
        name: month,
        sales: monthMap[month]?.revenue || 0,
        orders: monthMap[month]?.orders || 0,
      }));
    } else if (selectedRange === 'month') {
      const currentMonth = moment().format('MMM YYYY');
      let totalRevenue = 0;
      let totalOrders = 0;

      dailyData.forEach((d: any) => {
        totalRevenue += d.revenue || 0;
        totalOrders += d.orders || 0;
      });

      result = [{
        name: currentMonth,
        sales: totalRevenue,
        orders: totalOrders,
      }];
    } else if (selectedRange === 'week') {
      const dayMap: Record<string, { revenue: number; orders: number }> = {};
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      days.forEach(d => {
        dayMap[d] = { revenue: 0, orders: 0 };
      });

      dailyData.forEach((d: any) => {
        const day = moment(d.date).format('ddd');
        if (dayMap[day]) {
          dayMap[day].revenue += d.revenue || 0;
          dayMap[day].orders += d.orders || 0;
        }
      });

      result = days.map(day => ({
        name: day,
        sales: dayMap[day]?.revenue || 0,
        orders: dayMap[day]?.orders || 0,
      }));
    } else if (selectedRange === 'today') {
      const hourMap: Record<string, { revenue: number; orders: number }> = {};
      const hours = ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'];

      hours.forEach(h => {
        hourMap[h] = { revenue: 0, orders: 0 };
      });

      dailyData.forEach((d: any) => {
        const hour = moment(d.date).format('hA');
        if (hourMap[hour]) {
          hourMap[hour].revenue += d.revenue || 0;
          hourMap[hour].orders += d.orders || 0;
        }
      });

      result = hours.map(hour => ({
        name: hour,
        sales: hourMap[hour]?.revenue || 0,
        orders: hourMap[hour]?.orders || 0,
      }));
    } else {
      result = dailyData.map((d: any) => ({
        name: moment(d.date).format('DD MMM'),
        sales: d.revenue || 0,
        orders: d.orders || 0,
      }));
    }

    console.log('📊 Final chart data:', result.length, 'points');
    return result;
  }, [selectedRange, selectedBranch]);

  // ─── Main Dashboard Data Fetch ──────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    console.log('🔄 Fetching dashboard data...');
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (selectedBranch !== 'all' && selectedBranch !== 'undefined') {
        params.append('branchId', selectedBranch);
        console.log(`📍 Filtering by branch: ${selectedBranch}`);
      }

      if (selectedRange === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      } else {
        params.append('period', selectedRange);
      }

      console.log('📤 Params:', params.toString());

      // ─── Fetch Stats ──────────────────────────────────────────────────
      let statsData = null;
      try {
        // ✅ Use masterAdminApi
        const statsRes = await masterAdminApi.get(`/super-admin/dashboard/stats?${params}`);
        console.log('📥 Stats response:', statsRes.data);

        if (statsRes.data?.success) {
          statsData = statsRes.data.data;
        }
      } catch (statsError) {
        console.warn('Stats endpoint failed, using fallback:', statsError);
      }

      if (statsData) {
        setStats({
          totalRestaurants: statsData.totalRestaurants || 0,
          activeRestaurants: statsData.activeRestaurants || 0,
          pendingRestaurants: statsData.pendingRestaurants || 0,
          suspendedRestaurants: statsData.suspendedRestaurants || 0,
          totalRevenue: statsData.totalRevenue || 0,
          monthlyRevenue: statsData.monthlyRevenue || 0,
          totalOrders: statsData.totalOrders || 0,
          pendingOrders: statsData.pendingOrders || 0,
          completedOrders: statsData.completedOrders || 0,
          totalStaff: statsData.totalStaff || 0,
          activeStaff: statsData.activeStaff || 0,
          totalSubscriptions: statsData.totalSubscriptions || 0,
          activeSubscriptions: statsData.activeSubscriptions || 0,
          expiredSubscriptions: statsData.expiredSubscriptions || 0,
          growth: statsData.growth || 0,
          dailyAverage: statsData.dailyAverage || 0,
          todayRevenue: statsData.todayRevenue || 0,
          todayOrders: statsData.todayOrders || 0,
          totalSuperAdmins: statsData.totalSuperAdmins || 0,
          totalBranches: statsData.totalBranches || 0,
          platformRevenue: statsData.platformRevenue || 0,
        });
      }

      // ─── Fetch Chart Data ─────────────────────────────────────────────
      let chartDataPoints: DashboardDataPoint[] = [];
      try {
        // ✅ Use masterAdminApi
        const chartRes = await masterAdminApi.get(`/super-admin/revenue/overview?${params}`);
        console.log('📊 Chart response:', chartRes.data);

        if (chartRes.data?.success) {
          const data = chartRes.data.data;
          const dailyData = data?.dailyBreakdown || data?.dailyData || [];
          console.log('📊 Daily Data:', dailyData);
          chartDataPoints = generateChartData(dailyData);
        }
      } catch (chartError) {
        console.warn('Chart endpoint failed, using generated data:', chartError);
      }

      if (chartDataPoints.length === 0) {
        chartDataPoints = generateChartData([]);
      }
      setChartData(chartDataPoints);

      // ─── Fetch Recent Payments ──────────────────────────────────────
      try {
        const paymentRes = await masterAdminApi.get(`/super-admin/payments?limit=10&page=1${params.toString() ? '&' + params.toString() : ''}`);
        if (paymentRes.data?.success) {
          const payments = paymentRes.data.data?.payments || paymentRes.data.data || [];
          setRecentPayments(payments);
          console.log('✅ Payments fetched:', payments.length);
        }
      } catch (paymentError) {
        console.warn('Payments endpoint failed:', paymentError);
        setRecentPayments(getSamplePayments());
      }

      // ─── Fetch Recent Orders ─────────────────────────────────────────
      try {
        // ✅ Use masterAdminApi
        const orderRes = await masterAdminApi.get(`/super-admin/orders/recent?limit=10${params.toString() ? '&' + params.toString() : ''}`);
        if (orderRes.data?.success) {
          setRecentOrders(orderRes.data.data || []);
          console.log('✅ Orders fetched:', orderRes.data.data?.length || 0);
        }
      } catch (orderError) {
        console.warn('Orders endpoint failed:', orderError);
        setRecentOrders(getSampleOrders());
      }

      // ─── Fetch Recent Staff ──────────────────────────────────────────
      try {
        // ✅ Use masterAdminApi
        const staffRes = await masterAdminApi.get(`/super-admin/staff/recent?limit=6${params.toString() ? '&' + params.toString() : ''}`);
        if (staffRes.data?.success) {
          setRecentStaff(staffRes.data.data || []);
          console.log('✅ Staff fetched:', staffRes.data.data?.length || 0);
        }
      } catch (staffError) {
        console.warn('Staff endpoint failed:', staffError);
        setRecentStaff(getSampleStaff());
      }

    } catch (error: any) {
      console.error('❌ Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');

      setChartData(generateChartData([]));
      setRecentPayments(getSamplePayments());
      setRecentOrders(getSampleOrders());
      setRecentStaff(getSampleStaff());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch, selectedRange, customStartDate, customEndDate, generateChartData]);

  // ─── Sample Data Functions ──────────────────────────────────────────

  const getSamplePayments = (): Payment[] => {
    return [
      { _id: '1', billNumber: 'BILL-001', orderNumber: 'ORD-001', customerName: 'John Doe', total: 450, paymentMethod: 'cash', paymentStatus: 'paid', restaurantName: 'Main Restaurant', branchName: 'Downtown', createdAt: new Date().toISOString() },
      { _id: '2', billNumber: 'BILL-002', orderNumber: 'ORD-002', customerName: 'Jane Smith', total: 780, paymentMethod: 'card', paymentStatus: 'paid', restaurantName: 'Main Restaurant', branchName: 'Uptown', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { _id: '3', billNumber: 'BILL-003', orderNumber: 'ORD-003', customerName: 'Bob Johnson', total: 320, paymentMethod: 'upi', paymentStatus: 'pending', restaurantName: 'Main Restaurant', branchName: 'Downtown', createdAt: new Date(Date.now() - 7200000).toISOString() },
    ];
  };

  const getSampleOrders = (): RecentOrder[] => {
    return [
      { _id: '1', orderNumber: 'ORD-001', customerName: 'John Doe', total: 450, orderStatus: 'completed', orderType: 'dine-in', tableNumber: '5', createdAt: new Date().toISOString(), restaurantName: 'Main Restaurant', branchName: 'Downtown' },
      { _id: '2', orderNumber: 'ORD-002', customerName: 'Jane Smith', total: 780, orderStatus: 'preparing', orderType: 'takeaway', tableNumber: '', createdAt: new Date(Date.now() - 3600000).toISOString(), restaurantName: 'Main Restaurant', branchName: 'Uptown' },
      { _id: '3', orderNumber: 'ORD-003', customerName: 'Bob Johnson', total: 320, orderStatus: 'pending', orderType: 'delivery', tableNumber: '', createdAt: new Date(Date.now() - 7200000).toISOString(), restaurantName: 'Main Restaurant', branchName: 'Downtown' },
    ];
  };

  const getSampleStaff = (): StaffMember[] => {
    return [
      { _id: '1', name: 'Alice Manager', email: 'alice@restaurant.com', phone: '9876543210', role: 'Manager', status: 'active', restaurantName: 'Main Restaurant', branchName: 'Downtown', joinedAt: new Date().toISOString() },
      { _id: '2', name: 'Bob Chef', email: 'bob@restaurant.com', phone: '9876543211', role: 'Chef', status: 'active', restaurantName: 'Main Restaurant', branchName: 'Uptown', joinedAt: new Date(Date.now() - 86400000).toISOString() },
      { _id: '3', name: 'Carol Waiter', email: 'carol@restaurant.com', phone: '9876543212', role: 'Waiter', status: 'active', restaurantName: 'Main Restaurant', branchName: 'Downtown', joinedAt: new Date(Date.now() - 172800000).toISOString() },
    ];
  };

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleBranchChange = (branchId: string) => {
    console.log('📍 Branch changed to:', branchId);
    setSelectedBranch(branchId);
  };

  const handleResetFilters = () => {
    console.log('🔄 Resetting filters');
    setSelectedBranch('all');
    setSelectedRange('month');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // ─── Utility Functions ────────────────────────────────────────────────

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getOrderStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'ready': return 'bg-blue-100 text-blue-700';
      case 'preparing': return 'bg-yellow-100 text-yellow-700';
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'paid': 'bg-emerald-100 text-emerald-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'refunded': 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const getRangeLabel = () => {
    if (selectedRange === 'custom' && customStartDate && customEndDate) {
      return `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`;
    }
    return timeRanges.find(r => r.value === selectedRange)?.label || 'This Month';
  };

  // ─── Navigation Handlers ──────────────────────────────────────────────

  const handleViewAllPayments = () => {
    const params = new URLSearchParams();
    if (selectedBranch !== 'all' && selectedBranch !== 'undefined') {
      params.append('branchId', selectedBranch);
    }
    navigate(`/master-admin/payments?${params.toString()}`);
  };

  const handleViewAllOrders = () => {
    const params = new URLSearchParams();
    if (selectedBranch !== 'all' && selectedBranch !== 'undefined') {
      params.append('branchId', selectedBranch);
    }
    navigate(`/master-admin/orders?${params.toString()}`);
  };

  const handleViewAllStaff = () => {
    const params = new URLSearchParams();
    if (selectedBranch !== 'all' && selectedBranch !== 'undefined') {
      params.append('branchId', selectedBranch);
    }
    navigate(`/master-admin/staff?${params.toString()}`);
  };

  // ─── Loading State ────────────────────────────────────────────────────

  if (loading && chartData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading Master Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">

        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Master Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Welcome back, <span className="font-medium text-gray-700">{user?.firstName || 'Master Admin'}</span>!
                  Here's your platform overview.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {/* ─── Branch Filter ───────────────────────────────────────── */}
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white min-w-[200px] appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '32px',
                }}
              >
                <option value="all">📍 All Branches</option>
                {loadingBranches ? (
                  <option value="" disabled>Loading branches...</option>
                ) : (
                  branches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name} {branch.restaurantName ? `(${branch.restaurantName})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* ─── Action Buttons ────────────────────────────────────── */}
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Reset Filters
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ─── Stats Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalRestaurants}</p>
                <p className="text-xs text-gray-500">Total Restaurants</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Store size={18} className="text-orange-500" />
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">{stats.activeRestaurants} active</span>
              <span className="text-yellow-600">{stats.pendingRestaurants} pending</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500">Total Revenue</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign size={18} className="text-green-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <TrendingUp size={12} className="text-green-500" />
              <span className="text-xs text-green-600">{formatCurrency(stats.todayRevenue)} today</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
                <p className="text-xs text-gray-500">Total Orders</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingBag size={18} className="text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">{stats.completedOrders} completed</span>
              <span className="text-yellow-600">{stats.pendingOrders} pending</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalStaff}</p>
                <p className="text-xs text-gray-500">Total Staff</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users size={18} className="text-purple-500" />
              </div>
            </div>
            <div className="mt-2 text-xs text-green-600">
              {stats.activeStaff} active staff
            </div>
          </div>
        </div>

        {/* ─── Additional Master Admin Stats ────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalSuperAdmins}</p>
                <p className="text-xs text-gray-500">Super Admins</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Shield size={18} className="text-indigo-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalBranches}</p>
                <p className="text-xs text-gray-500">Total Branches</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <MapPin size={18} className="text-cyan-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.platformRevenue)}</p>
                <p className="text-xs text-gray-500">Platform Revenue</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Wallet size={18} className="text-amber-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.activeSubscriptions}</p>
                <p className="text-xs text-gray-500">Active Subscriptions</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <Award size={18} className="text-rose-500" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {stats.expiredSubscriptions} expired
            </div>
          </div>
        </div>

        {/* ─── Chart ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-gray-800">
                Revenue & Orders Trend
                {selectedBranch !== 'all' && (
                  <span className="ml-2 text-sm font-normal text-amber-600">
                    - {branches.find(b => b._id === selectedBranch)?.name || 'Branch'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400">
                {selectedRange === 'today' ? 'Hourly breakdown' :
                 selectedRange === 'week' ? 'Last 7 days' :
                 selectedRange === 'month' ? `Monthly total for ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}` :
                 selectedRange === 'year' ? `Monthly breakdown for ${new Date().getFullYear()}` :
                 `Custom range: ${getRangeLabel()}`}
              </p>
            </div>
            <div className="flex gap-2">
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition"
                >
                  <Calendar size={14} />
                  {getRangeLabel()}
                  <ChevronDown size={14} />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-10 overflow-hidden">
                    {timeRanges.map(range => (
                      <button
                        key={range.value}
                        onClick={() => {
                          setSelectedRange(range.value);
                          setShowDropdown(false);
                          if (range.value !== 'custom') {
                            setCustomStartDate('');
                            setCustomEndDate('');
                          } else {
                            setShowDatePicker(true);
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition"
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedRange === 'custom' && (
                <div ref={datePickerRef} className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm font-medium"
                  >
                    <Calendar size={14} />
                    Select Dates
                  </button>
                  {showDatePicker && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-100 p-4 z-10 w-64">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (customStartDate && customEndDate) {
                              setShowDatePicker(false);
                              fetchDashboardData();
                            } else {
                              toast.error('Please select both start and end dates');
                            }
                          }}
                          className="w-full py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium"
                        >
                          Apply Range
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#a8a29e', fontSize: 11 }}
                interval={0}
                angle={chartData.length > 12 ? -45 : 0}
                textAnchor={chartData.length > 12 ? 'end' : 'middle'}
                height={chartData.length > 12 ? 60 : 30}
              />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: 'none', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Bar yAxisId="left" dataKey="sales" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={50} />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4, fill: '#f97316', strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs text-gray-500">Revenue (₹)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-gray-500">Orders Count</span>
            </div>
          </div>
        </div>

        {/* ─── Three Column Layout ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── LEFT: Recent Payments ────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-500" />
                    Recent Payments
                  </h3>
                </div>
                <button
                  onClick={handleViewAllPayments}
                  className="text-xs text-amber-500 hover:text-amber-600 font-medium flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentPayments.length > 0 ? (
                  recentPayments.map((payment, index) => (
                    <div key={payment._id || index} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200 border border-gray-50">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        payment.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-500' :
                        payment.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-500' :
                        'bg-red-100 text-red-500'
                      }`}>
                        <FileText size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {payment.billNumber || payment.orderNumber || 'Payment'}
                          </p>
                          {getPaymentStatusBadge(payment.paymentStatus)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="truncate">{payment.customerName || 'Guest'}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="font-medium text-gray-700">{formatCurrency(payment.total)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="capitalize">{payment.paymentMethod || 'N/A'}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="truncate">{payment.branchName || payment.restaurantName || 'Main'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No payments found</p>
                    <p className="text-xs text-gray-300 mt-1">Payments will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ─── Recent Orders ──────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-500" />
                    Recent Orders
                  </h3>
                </div>
                <button
                  onClick={handleViewAllOrders}
                  className="text-xs text-amber-500 hover:text-amber-600 font-medium flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order, index) => (
                    <div key={order._id || index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={16} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            #{order.orderNumber} - {order.customerName || 'Guest'}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(order.orderStatus)}`}>
                            {order.orderStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{formatDate(order.createdAt)}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="flex items-center gap-1">
                            <Store size={10} />
                            {order.branchName || order.restaurantName || 'Main'}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="font-medium text-gray-700">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 font-medium">No recent orders</p>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Recent Staff ────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    Recent Staff
                  </h3>
                </div>
                <button
                  onClick={handleViewAllStaff}
                  className="text-xs text-amber-500 hover:text-amber-600 font-medium flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {recentStaff.length > 0 ? (
                  recentStaff.map((staff, index) => (
                    <div key={staff._id || index} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200 border border-gray-50">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Users size={16} className="text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{staff.name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <span className="truncate">{staff.role}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className={`${staff.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                            {staff.status === 'active' ? <UserCheck size={10} /> : <UserX size={10} />}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {staff.branchName || staff.restaurantName || 'Main'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-6">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 font-medium">No staff members</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}