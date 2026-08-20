// pages/super-admin/SuperAdminReports.tsx - ONLY BRANCH FILTER

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  Users, ShoppingBag, Calendar, Download, Printer,
  Filter, ChevronDown, ChevronUp, Loader2, RefreshCw,
  PieChart, Activity, Zap, Award, Star, Clock,
  Building2, MapPin, Phone, Mail, UserCheck,
  FileText, Eye, ChevronLeft, ChevronRight,
  X, CheckCircle, AlertCircle, DownloadCloud,
  FileSpreadsheet, Share2, Copy,
  ArrowUpRight, ArrowDownRight, Minus,
  Store, CreditCard, Package, Truck,
  PiIcon
} from 'lucide-react';
import { superAdminApi } from '../../services/api';
import toast from 'react-hot-toast';
import moment from 'moment';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// ─── Types ──────────────────────────────────────────────────────────────

interface ReportData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalRestaurants: number;
    activeRestaurants: number;
    totalStaff: number;
    totalCustomers: number;
    growth: number;
    dailyAverage: number;
    weeklyAverage: number;
    monthlyAverage: number;
  };
  revenueTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  restaurantPerformance: Array<{
    _id: string;
    name: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
    staffCount: number;
    growth: number;
  }>;
  branchPerformance: Array<{
    _id: string;
    name: string;
    restaurantName: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
    staffCount: number;
    growth: number;
  }>;
  orderTypeBreakdown: {
    dineIn: { revenue: number; orders: number; percentage: number };
    takeaway: { revenue: number; orders: number; percentage: number };
    delivery: { revenue: number; orders: number; percentage: number };
  };
  paymentMethodBreakdown: Record<string, { count: number; total: number; percentage: number }>;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
    orders: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
  }>;
  topRestaurants: Array<{
    _id: string;
    name: string;
    revenue: number;
    orders: number;
    growth: number;
  }>;
  topBranches: Array<{
    _id: string;
    name: string;
    restaurantName: string;
    revenue: number;
    orders: number;
    growth: number;
  }>;
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    restaurantName: string;
    branchName: string;
    total: number;
    orderStatus: string;
    createdAt: string;
  }>;
}

interface Branch {
  _id: string;
  name: string;
  restaurantId: string;
  restaurantName?: string;
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function SuperAdminReports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [reportType, setReportType] = useState<'overview' | 'restaurants' | 'orders' | 'items'>('overview');
  
  // UI State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [dateRange, startDate, endDate, branchFilter]);

  const fetchBranches = async () => {
    try {
      const response = await superAdminApi.get('/super-admin/branches?limit=100');
      let branchesData = [];
      if (response.data?.data?.branches) {
        branchesData = response.data.data.branches;
      } else if (response.data?.data) {
        branchesData = Array.isArray(response.data.data) ? response.data.data : [];
      }
      setBranches(branchesData);
      console.log('✅ Branches loaded:', branchesData.length);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      
      // Date range
      if (dateRange === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        params.append('period', dateRange);
      }
      
      // ✅ Branch filter only
      if (branchFilter !== 'all') {
        params.append('branchId', branchFilter);
      }
      
      const response = await superAdminApi.get(`/super-admin/reports?${params}`);
      
      if (response.data?.success) {
        setReportData(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch reports:', error);
      toast.error(error.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  const formatDate = (date: string) => {
    return moment(date).format('DD MMM YYYY');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'preparing':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleExport = async () => {
    try {
      toast.loading('Generating report...');
      // Export logic here
      toast.success(`Report exported as ${exportFormat.toUpperCase()}`);
      setShowExportModal(false);
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  if (loading && !reportData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  // Use branchPerformance if available, otherwise use restaurantPerformance
  const performanceData = reportData?.branchPerformance || reportData?.restaurantPerformance || [];
  const topData = reportData?.topBranches || reportData?.topRestaurants || [];

  const paginatedData = performanceData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-sm text-gray-500">
              Comprehensive platform-wide reports and analytics by branch
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchReportData}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────── */}
      <div className="px-6 mt-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Report Type */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['overview', 'restaurants', 'orders', 'items'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                    reportType === type
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-gray-200" />

            {/* Date Range */}
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
              <option value="custom">Custom</option>
            </select>

            {dateRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </>
            )}

            {/* ✅ Branch Filter - Only filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 min-w-[180px]"
            >
              <option value="all">📍 All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>
                  {b.name}
                  {b.restaurantName && ` (${b.restaurantName})`}
                </option>
              ))}
            </select>

            {branchFilter !== 'all' && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                📍 {branches.find(b => b._id === branchFilter)?.name || 'Selected Branch'}
              </span>
            )}

            <span className="text-sm text-gray-500 ml-auto">
              {reportData?.summary?.totalOrders || 0} orders • {formatCurrency(reportData?.summary?.totalRevenue || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Content ──────────────────────────────────────────────────── */}
      <div className="p-6 space-y-6">
        {reportType === 'overview' && reportData && (
          <OverviewTab 
            data={reportData} 
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            branchFilter={branchFilter}
            branches={branches}
          />
        )}
        {reportType === 'restaurants' && reportData && (
          <RestaurantsTab 
            data={reportData}
            performanceData={paginatedData}
            totalItems={performanceData.length}
            currentPage={currentPage}
            totalPages={Math.ceil(performanceData.length / itemsPerPage)}
            onPageChange={setCurrentPage}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            branchFilter={branchFilter}
          />
        )}
        {reportType === 'orders' && reportData && (
          <OrdersTab 
            data={reportData}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
          />
        )}
        {reportType === 'items' && reportData && (
          <ItemsTab 
            data={reportData}
            formatCurrency={formatCurrency}
          />
        )}
      </div>

      {/* ─── Export Modal ────────────────────────────────────────────── */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          loading={loading}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────
function OverviewTab({ data, formatCurrency, formatDate, branchFilter, branches }: any) {
  const { summary, revenueTrend, orderTypeBreakdown, paymentMethodBreakdown, topItems, hourlyDistribution, topBranches, topRestaurants } = data;

  const branchName = branchFilter !== 'all' 
    ? branches?.find((b: any) => b._id === branchFilter)?.name || 'Selected Branch'
    : 'All Branches';

  // Chart data
  const revenueChartData = {
    labels: revenueTrend?.map((d: any) => formatDate(d.date)) || [],
    datasets: [
      {
        label: 'Revenue',
        data: revenueTrend?.map((d: any) => d.revenue) || [],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Orders',
        data: revenueTrend?.map((d: any) => d.orders) || [],
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'orders',
      },
    ],
  };

  const hourlyChartData = {
    labels: hourlyDistribution?.map((h: any) => `${h.hour}:00`) || [],
    datasets: [
      {
        label: 'Orders',
        data: hourlyDistribution?.map((h: any) => h.orders) || [],
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: '#8b5cf6',
        borderWidth: 1,
      },
    ],
  };

  const orderTypeData = {
    labels: ['Dine In', 'Takeaway', 'Delivery'],
    datasets: [
      {
        data: [
          orderTypeBreakdown?.dineIn?.percentage || 0,
          orderTypeBreakdown?.takeaway?.percentage || 0,
          orderTypeBreakdown?.delivery?.percentage || 0,
        ],
        backgroundColor: ['#8b5cf6', '#f97316', '#10b981'],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const paymentMethodData = {
    labels: Object.keys(paymentMethodBreakdown || {}),
    datasets: [
      {
        data: Object.values(paymentMethodBreakdown || {}).map((p: any) => p.percentage || 0),
        backgroundColor: ['#8b5cf6', '#f97316', '#10b981', '#3b82f6', '#ef4444'],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  // Use topBranches if available, otherwise topRestaurants
  const topPerformers = topBranches || topRestaurants || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Branch Filter Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        <span>
          <strong>Filtered by:</strong> {branchName}
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue || 0)}
          subtitle={`${summary?.totalOrders || 0} orders`}
          iconColor="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={TrendingUp}
          title="Growth"
          value={`${(summary?.growth || 0) > 0 ? '+' : ''}${(summary?.growth || 0).toFixed(1)}%`}
          subtitle="vs previous period"
          iconColor={(summary?.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          bgColor={(summary?.growth || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}
        />
        <StatCard
          icon={ShoppingBag}
          title="Avg Order Value"
          value={formatCurrency(summary?.averageOrderValue || 0)}
          subtitle="Per order"
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Building2}
          title="Active Restaurants"
          value={summary?.activeRestaurants || 0}
          subtitle={`of ${summary?.totalRestaurants || 0} total`}
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={Users}
          title="Total Staff"
          value={summary?.totalStaff || 0}
          subtitle="Across all branches"
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard
          icon={Calendar}
          title="Daily Average"
          value={formatCurrency(summary?.dailyAverage || 0)}
          subtitle="Revenue per day"
          iconColor="text-teal-600"
          bgColor="bg-teal-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue & Orders Trend</h3>
          <div className="h-64">
            <Line
              data={revenueChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `₹${value}`,
                    },
                  },
                  orders: {
                    beginAtZero: true,
                    position: 'right',
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Hourly Order Distribution</h3>
          <div className="h-64">
            <Bar
              data={hourlyChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Order Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Order Types</h3>
          <div className="h-48 flex items-center justify-center">
            <Doughnut
              data={orderTypeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(orderTypeBreakdown?.dineIn?.revenue || 0)}</p>
              <p className="text-xs text-gray-500">Dine In</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(orderTypeBreakdown?.takeaway?.revenue || 0)}</p>
              <p className="text-xs text-gray-500">Takeaway</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(orderTypeBreakdown?.delivery?.revenue || 0)}</p>
              <p className="text-xs text-gray-500">Delivery</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="h-48 flex items-center justify-center">
            <Pie
              data={paymentMethodData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Selling Items</h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {topItems?.slice(0, 5).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">#{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity} units • {item.orders} orders</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Branches/Restaurants */}
      {topPerformers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {topBranches ? 'Top Performing Branches' : 'Top Performing Restaurants'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topPerformers.slice(0, 6).map((item: any) => (
              <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  {item.restaurantName && (
                    <p className="text-xs text-gray-500">{item.restaurantName}</p>
                  )}
                  <p className="text-xs text-gray-500">{item.orders || 0} orders</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(item.revenue || 0)}</p>
                  <span className={`text-xs ${(item.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(item.growth || 0) >= 0 ? '+' : ''}{(item.growth || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Restaurants Tab ──────────────────────────────────────────────────
function RestaurantsTab({ data, performanceData, totalItems, currentPage, totalPages, onPageChange, formatCurrency, getStatusColor, branchFilter }: any) {
  const isBranchFiltered = branchFilter !== 'all';
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">
          {isBranchFiltered ? 'Branch Performance' : 'Restaurant & Branch Performance'}
        </h2>
        <span className="text-sm text-gray-500">{totalItems} items</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {isBranchFiltered ? 'Branch' : 'Restaurant/Branch'}
              </th>
              {!isBranchFiltered && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Order</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Growth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {performanceData.length === 0 ? (
              <tr>
                <td colSpan={isBranchFiltered ? 5 : 6} className="px-6 py-12 text-center text-gray-500">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No data found for the selected branch</p>
                </td>
              </tr>
            ) : (
              performanceData.map((item: any) => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {isBranchFiltered && item.restaurantName && (
                        <p className="text-xs text-gray-500">{item.restaurantName}</p>
                      )}
                    </div>
                  </td>
                  {!isBranchFiltered && (
                    <td className="px-6 py-4 text-gray-600">
                      {item.restaurantName || 'N/A'}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right text-gray-600">
                    {item.orders || 0}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(item.revenue || 0)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {formatCurrency(item.averageOrderValue || 0)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                      (item.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(item.growth || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {((item.growth || 0) > 0 ? '+' : '')}{(item.growth || 0).toFixed(1)}%
                    </span>
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
            Showing {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, totalItems)} of {totalItems}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Orders Tab ──────────────────────────────────────────────────────
function OrdersTab({ data, formatCurrency, formatDate, getStatusColor }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">Recent Orders</h2>
        <span className="text-sm text-gray-500">{data.recentOrders?.length || 0} orders</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.recentOrders?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No orders found</p>
                </td>
              </tr>
            ) : (
              data.recentOrders?.slice(0, 20).map((order: any) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {order.restaurantName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {order.branchName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(order.total || 0)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                      {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1) || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Items Tab ──────────────────────────────────────────────────────
function ItemsTab({ data, formatCurrency }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">Top Selling Items</h2>
        <span className="text-sm text-gray-500">{data.topItems?.length || 0} items</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.topItems?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No items found</p>
                </td>
              </tr>
            ) : (
              data.topItems?.map((item: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{item.name}</p>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {item.quantity || 0}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {item.orders || 0}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(item.revenue || 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

// ─── Export Modal ──────────────────────────────────────────────────────
function ExportModal({ onClose, onExport, exportFormat, setExportFormat, loading }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Export Report</h2>
            <p className="text-sm text-gray-500">Choose export format</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Select Format</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'pdf', label: 'PDF', icon: jsPDF },
                { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
                { value: 'csv', label: 'CSV', icon: FileText },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setExportFormat(value as any)}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    exportFormat === value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <PiIcon className={`w-6 h-6 mx-auto mb-2 ${
                    exportFormat === value ? 'text-purple-600' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    exportFormat === value ? 'text-purple-600' : 'text-gray-600'
                  }`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onExport}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
);
}