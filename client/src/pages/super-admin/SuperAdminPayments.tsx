// pages/super-admin/SuperAdminPayments.tsx - ONLY BRANCH FILTER

import { useState, useEffect } from 'react';
import {
  DollarSign, CreditCard, Wallet, TrendingUp, TrendingDown,
  Search, Filter, ChevronDown, ChevronUp, Eye, Download,
  RefreshCw, Loader2, X, CheckCircle, XCircle, AlertCircle,
  Clock, Calendar, Building2, MapPin, User, Phone,
  Receipt, Printer, Mail, FileText, PieChart,
  BarChart3, ArrowUpRight, ArrowDownRight, Zap,
  Award, Star, Users, ShoppingBag, Coffee,
  CreditCard as CreditCardIcon, IndianRupee, Store,
  AlertTriangle
} from 'lucide-react';
import { superAdminApi } from '../../services/api';
import toast from 'react-hot-toast';
import moment from 'moment';

// ─── Types ──────────────────────────────────────────────────────────────

interface Payment {
  _id: string;
  billNumber: string;
  orderId: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  customerName: string;
  customerPhone: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'online';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paidAt: string | null;
  restaurantId: string;
  restaurantName: string;
  branchId: string | null;
  branchName: string | null;
  generatedBy: string;
  generatedByName: string;
  items?: any[];
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  _id: string;
  name: string;
  restaurantId: string;
  restaurantName?: string;
  isActive?: boolean;
}

interface PaymentStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  pendingPayments: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  byPaymentMethod: Record<string, number>;
  byRestaurant: Record<string, number>;
  growth: number;
}

// ─── Default Stats ──────────────────────────────────────────────────────
const DEFAULT_STATS: PaymentStats = {
  totalRevenue: 0,
  totalOrders: 0,
  averageOrderValue: 0,
  pendingPayments: 0,
  todayRevenue: 0,
  weeklyRevenue: 0,
  monthlyRevenue: 0,
  byPaymentMethod: {},
  byRestaurant: {},
  growth: 0,
};

// ─── Main Component ─────────────────────────────────────────────────────

export default function SuperAdminPayments() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>(DEFAULT_STATS);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [sortBy, setSortBy] = useState<'createdAt' | 'total' | 'paymentStatus'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchPayments();
    fetchBranches();
  }, [dateRange]);

  useEffect(() => {
    applyFilters();
  }, [payments, searchTerm, statusFilter, methodFilter, branchFilter, sortBy, sortOrder]);

  // ─── Fetch Payments ──────────────────────────────────────────────────────
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '1000',
        ...(dateRange === 'today' && { date: 'today' }),
        ...(dateRange === 'week' && { week: 'this' }),
        ...(dateRange === 'month' && { month: 'this' }),
      });
      
      if (branchFilter !== 'all') {
        params.append('branchId', branchFilter);
      }
      
      let response;
      try {
        response = await superAdminApi.get(`/super-admin/payments?${params}`);
      } catch (error) {
        console.log('Falling back to bills endpoint...');
        response = await superAdminApi.get(`/bills?${params}`);
      }
      
      let paymentData = [];
      let statsData = null;
      
      if (response.data?.success) {
        paymentData = response.data.data?.payments || response.data.data?.bills || [];
        statsData = response.data.data?.stats || null;
        
        // Calculate branch counts from payment data
        const counts: Record<string, number> = {};
        paymentData.forEach((p: Payment) => {
          if (p.branchId) {
            counts[p.branchId] = (counts[p.branchId] || 0) + 1;
          }
        });
        setBranchCounts(counts);
      }
      
      setPayments(paymentData);
      if (statsData) {
        setStats({
          ...DEFAULT_STATS,
          ...statsData,
          growth: statsData.growth || 0,
        });
      } else {
        calculateStats(paymentData);
      }
    } catch (error: any) {
      console.error('Failed to fetch payments:', error);
      toast.error(error.response?.data?.error || 'Failed to load payments');
      setPayments([]);
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Branches ──────────────────────────────────────────────────────
  const fetchBranches = async () => {
    try {
      let branchesData = [];
      
      try {
        const branchesRes = await superAdminApi.get('/super-admin/branches?limit=1000');
        if (branchesRes.data?.success) {
          branchesData = branchesRes.data.data?.branches || [];
          console.log('✅ Branches loaded:', branchesData.length);
        }
      } catch (err1) {
        console.log('⚠️ /super-admin/branches failed, trying /branches...');
        try {
          const branchesRes = await superAdminApi.get('/branches?limit=1000');
          if (branchesRes.data?.success) {
            branchesData = branchesRes.data.data?.branches || [];
            console.log('✅ Branches loaded from /branches:', branchesData.length);
          }
        } catch (err2) {
          console.error('❌ All branch endpoints failed:', err2);
        }
      }
      
      setBranches(branchesData);
      console.log(`📋 Loaded ${branchesData.length} branches`);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      setBranches([]);
    }
  };

  // ─── Calculate Stats ──────────────────────────────────────────────────────
  const calculateStats = (paymentData: Payment[]) => {
    const paid = paymentData.filter(p => p.paymentStatus === 'paid');
    const pending = paymentData.filter(p => p.paymentStatus === 'pending');
    
    const totalRevenue = paid.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalOrders = paid.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayRevenue = paid
      .filter(p => p.paidAt && new Date(p.paidAt) >= todayStart)
      .reduce((sum, p) => sum + (p.total || 0), 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyRevenue = paid
      .filter(p => p.paidAt && new Date(p.paidAt) >= weekStart)
      .reduce((sum, p) => sum + (p.total || 0), 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenue = paid
      .filter(p => p.paidAt && new Date(p.paidAt) >= monthStart)
      .reduce((sum, p) => sum + (p.total || 0), 0);
    
    const byPaymentMethod: Record<string, number> = {};
    paid.forEach(p => {
      const method = p.paymentMethod || 'unknown';
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + (p.total || 0);
    });
    
    const byRestaurant: Record<string, number> = {};
    paid.forEach(p => {
      const name = p.restaurantName || 'Unknown';
      byRestaurant[name] = (byRestaurant[name] || 0) + (p.total || 0);
    });
    
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthRevenue = paid
      .filter(p => p.paidAt && new Date(p.paidAt) >= previousMonthStart && new Date(p.paidAt) < monthStart)
      .reduce((sum, p) => sum + (p.total || 0), 0);
    let growth = 0;
    if (previousMonthRevenue > 0) {
      growth = ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
    }
    
    setStats({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      pendingPayments: pending.length,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      byPaymentMethod,
      byRestaurant,
      growth: growth || 0,
    });
  };

  // ─── Apply Filters ──────────────────────────────────────────────────────
  const applyFilters = () => {
    let filtered = [...payments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.billNumber || '').toLowerCase().includes(term) ||
        (p.orderNumber || '').toLowerCase().includes(term) ||
        (p.customerName || '').toLowerCase().includes(term) ||
        (p.customerPhone || '').includes(term) ||
        (p.restaurantName || '').toLowerCase().includes(term) ||
        (p.branchName || '').toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.paymentStatus === statusFilter);
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(p => p.paymentMethod === methodFilter);
    }

    if (branchFilter !== 'all') {
      filtered = filtered.filter(p => p.branchId === branchFilter);
    }

    filtered.sort((a, b) => {
      let compareA, compareB;
      switch (sortBy) {
        case 'createdAt':
          compareA = new Date(a.createdAt || 0).getTime();
          compareB = new Date(b.createdAt || 0).getTime();
          break;
        case 'total':
          compareA = a.total || 0;
          compareB = b.total || 0;
          break;
        case 'paymentStatus':
          compareA = a.paymentStatus || '';
          compareB = b.paymentStatus || '';
          break;
        default:
          compareA = new Date(a.createdAt || 0).getTime();
          compareB = new Date(b.createdAt || 0).getTime();
      }
      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

    setFilteredPayments(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1);
  };

  // ─── UI Helpers ──────────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'refunded':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'refunded':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-700';
      case 'card':
        return 'bg-blue-100 text-blue-700';
      case 'upi':
        return 'bg-purple-100 text-purple-700';
      case 'online':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return moment(date).format('DD MMM YYYY, h:mm A');
  };

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const safeStats = stats || DEFAULT_STATS;
  const growthValue = safeStats.growth !== undefined && safeStats.growth !== null ? safeStats.growth : 0;
  const growthDisplay = `${growthValue > 0 ? '+' : ''}${growthValue.toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .card-hover { transition: all 0.2s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
      `}</style>

      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-sm text-gray-500">Monitor payments across all branches</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchPayments}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6">
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={formatCurrency(safeStats.totalRevenue || 0)}
          subtitle={`${safeStats.totalOrders || 0} orders`}
          iconColor="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={TrendingUp}
          title="Growth"
          value={growthDisplay}
          subtitle="vs last month"
          iconColor={growthValue >= 0 ? 'text-green-600' : 'text-red-600'}
          bgColor={growthValue >= 0 ? 'bg-green-50' : 'bg-red-50'}
        />
        <StatCard
          icon={ShoppingBag}
          title="Avg Order Value"
          value={formatCurrency(safeStats.averageOrderValue || 0)}
          subtitle="Per order"
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Clock}
          title="Pending"
          value={(safeStats.pendingPayments || 0).toString()}
          subtitle="Awaiting payment"
          iconColor="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <StatCard
          icon={Calendar}
          title="Today"
          value={formatCurrency(safeStats.todayRevenue || 0)}
          subtitle="Today's revenue"
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={BarChart3}
          title="This Month"
          value={formatCurrency(safeStats.monthlyRevenue || 0)}
          subtitle="Monthly revenue"
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
        />
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────── */}
      <div className="px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by bill, order, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="online">Online</option>
            </select>

            {/* ✅ ONLY BRANCH FILTER - No Restaurant Filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 min-w-[180px]"
              disabled={branches.length === 0}
            >
              <option value="all">📍 All Branches</option>
              {branches.length > 0 ? (
                branches.map((b) => {
                  const count = branchCounts[b._id] || 0;
                  return (
                    <option key={b._id} value={b._id}>
                      {b.name}
                      {count > 0 ? ` (${count} payments)` : ' (No Payments)'}
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>No branches available</option>
              )}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="createdAt">Sort by Date</option>
              <option value="total">Sort by Amount</option>
              <option value="paymentStatus">Sort by Status</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'cards' : 'list')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {viewMode === 'list' ? '📋 List' : '📇 Cards'}
            </button>

            {/* Active Filters Display */}
            {(branchFilter !== 'all' || statusFilter !== 'all' || methodFilter !== 'all') && (
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {branchFilter !== 'all' && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    📍 {branches.find(b => b._id === branchFilter)?.name}
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {statusFilter}
                  </span>
                )}
                {methodFilter !== 'all' && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {methodFilter}
                  </span>
                )}
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setMethodFilter('all');
                    setBranchFilter('all');
                    setSearchTerm('');
                  }}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Clear All
                </button>
              </div>
            )}

            <span className="text-sm text-gray-500 ml-auto">
              {filteredPayments.length} payments
            </span>
          </div>
        </div>
      </div>

      {/* ─── Payment List ────────────────────────────────────────────── */}
      <div className="p-6">
        {viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-lg font-medium text-gray-600">No payments found</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {branchFilter !== 'all' 
                              ? `No payments for ${branches.find(b => b._id === branchFilter)?.name} branch`
                              : 'Try adjusting your filters or date range'}
                          </p>
                          {branchFilter !== 'all' && (
                            <button
                              onClick={() => {
                                setBranchFilter('all');
                                setStatusFilter('all');
                                setMethodFilter('all');
                                setSearchTerm('');
                              }}
                              className="mt-3 text-sm text-purple-600 hover:text-purple-700"
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{payment.billNumber || 'N/A'}</p>
                            <p className="text-xs text-gray-500">Order: {payment.orderNumber || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{payment.customerName || 'Guest'}</p>
                            <p className="text-xs text-gray-500">{payment.customerPhone || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                              <MapPin size={14} /> {payment.branchName || 'Main Branch'}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Store size={12} /> {payment.restaurantName || 'Unknown'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(payment.total || 0)}</p>
                          <p className="text-xs text-gray-500">Tax: {formatCurrency(payment.tax || 0)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(payment.paymentMethod)}`}>
                            {payment.paymentMethod ? payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.paymentStatus)}`}>
                            {getStatusIcon(payment.paymentStatus)}
                            {payment.paymentStatus ? payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowDetailsModal(true);
                            }}
                            className="p-1 text-purple-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPayments.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No payments found</p>
                {branchFilter !== 'all' && (
                  <button
                    onClick={() => {
                      setBranchFilter('all');
                      setStatusFilter('all');
                      setMethodFilter('all');
                      setSearchTerm('');
                    }}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              paginatedPayments.map((payment) => (
                <PaymentCard
                  key={payment._id}
                  payment={payment}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getMethodColor={getMethodColor}
                  onView={() => {
                    setSelectedPayment(payment);
                    setShowDetailsModal(true);
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── Details Modal ───────────────────────────────────────────── */}
      {showDetailsModal && selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getMethodColor={getMethodColor}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────
function StatCard({ icon: Icon, title, value, subtitle, iconColor, bgColor }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 card-hover">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-2">
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{title}</p>
        {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Payment Card Component ────────────────────────────────────────────
function PaymentCard({ payment, formatCurrency, formatDate, getStatusColor, getStatusIcon, getMethodColor, onView }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 card-hover">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-gray-900">{payment.billNumber || 'N/A'}</p>
          <p className="text-xs text-gray-500">Order: {payment.orderNumber || 'N/A'}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.paymentStatus)}`}>
          {getStatusIcon(payment.paymentStatus)}
          {payment.paymentStatus ? payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1) : 'Unknown'}
        </span>
      </div>
      
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(payment.total || 0)}</p>
        <p className="text-xs text-gray-500">{payment.customerName || 'Guest'} • {payment.customerPhone || 'N/A'}</p>
      </div>
      
      <div className="mt-3 flex items-center gap-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(payment.paymentMethod)}`}>
          {payment.paymentMethod ? payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1) : 'Unknown'}
        </span>
        <span className="text-xs text-gray-500">{payment.orderType || 'N/A'}</span>
      </div>
      
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-900 flex items-center gap-1">
            <MapPin size={12} /> {payment.branchName || 'Main Branch'}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Store size={10} /> {payment.restaurantName || 'Unknown'}
          </p>
        </div>
        <button
          onClick={onView}
          className="p-1 text-purple-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        {formatDate(payment.createdAt)}
      </div>
    </div>
  );
}

// ─── Payment Details Modal ────────────────────────────────────────────
function PaymentDetailsModal({ payment, formatCurrency, formatDate, getStatusColor, getStatusIcon, getMethodColor, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
            <p className="text-sm text-gray-500">{payment.billNumber || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{payment.customerName || 'Guest'}</h3>
              <p className="text-sm text-gray-500">{payment.customerPhone || 'No phone'}</p>
            </div>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.paymentStatus)}`}>
              {getStatusIcon(payment.paymentStatus)}
              {payment.paymentStatus ? payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1) : 'Unknown'}
            </span>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Branch</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <MapPin size={14} /> {payment.branchName || 'Main Branch'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Restaurant</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <Store size={14} /> {payment.restaurantName || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Type</p>
                <p className="font-medium text-gray-900 capitalize">{payment.orderType || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="font-medium text-gray-900">{payment.orderNumber || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Amount Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(payment.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({payment.taxRate || 0}%)</span>
                <span className="text-gray-900">{formatCurrency(payment.tax || 0)}</span>
              </div>
              {(payment.discount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-red-600">-{formatCurrency(payment.discount || 0)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-purple-600">{formatCurrency(payment.total || 0)}</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Payment Method</h4>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getMethodColor(payment.paymentMethod)}`}>
                {payment.paymentMethod ? payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1) : 'Unknown'}
              </span>
              {payment.paidAt && (
                <span className="text-sm text-gray-500">
                  Paid at: {formatDate(payment.paidAt)}
                </span>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Generated By</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{payment.generatedByName || 'System'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">{formatDate(payment.createdAt)}</p>
              </div>
            </div>
          </div>

          {payment.items && payment.items.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {payment.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.productName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{item.quantity || 0} × {formatCurrency(item.unitPrice || 0)}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice || 0)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}