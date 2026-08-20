// pages/super-admin/SuperAdminRevenue.tsx - COMPLETE WORKING VERSION

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  ShoppingBag, Users, Calendar, Download, Filter,
  ChevronDown, ChevronUp, Loader2, RefreshCw,
  Wallet, Building2, Clock, Award, PieChart,
  Activity, Zap, Star, ArrowUpRight, ArrowDownRight,
  Eye, EyeOff, Maximize2, Minimize2, Printer, MapPin
} from 'lucide-react';
import { superAdminApi } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────
interface RevenueData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    platformCommission: number;
    orderTypeBreakdown: {
      dineIn: { revenue: number; orders: number; percentage: number };
      takeaway: { revenue: number; orders: number; percentage: number };
      delivery: { revenue: number; orders: number; percentage: number };
    };
  };
  restaurantBreakdown: Array<{
    restaurantId: string;
    restaurantName: string;
    revenue: number;
    orders: number;
    commissionRate: number;
    commissionEarned: number;
  }>;
  branchBreakdown: Array<{
    branchId: string;
    branchName: string;
    restaurantId: string;
    restaurantName: string;
    revenue: number;
    orders: number;
    commissionEarned: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    orders: number;
    averageOrderValue: number;
  }>;
  topRestaurants: Array<{
    restaurantId: string;
    restaurantName: string;
    revenue: number;
    orders: number;
    commissionRate: number;
    commissionEarned: number;
  }>;
  topBranches: Array<{
    branchId: string;
    branchName: string;
    restaurantName: string;
    revenue: number;
    orders: number;
  }>;
  period: {
    start: string;
    end: string;
    label: string;
  };
  filterInfo: {
    period: string;
    totalBillsInPeriod: number;
    totalOrdersInPeriod: number;
    itemsProcessed: number;
  };
}

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    revenueGrowth: number;
    averageOrderValue: number;
  };
  timeline: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  hourlyData: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
    orders: number;
  }>;
  customerSegments: {
    vip: { orders: number; revenue: number; averageOrderValue: number };
    regular: { orders: number; revenue: number; averageOrderValue: number };
  };
}

interface Branch {
  _id: string;
  name: string;
  restaurantId: string;
  restaurantName?: string;
}

interface Restaurant {
  _id: string;
  name: string;
}

// ─── Helper: Create empty revenue data ──────────────────────────────────
const createEmptyRevenueData = (period?: any) => ({
  summary: {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    platformCommission: 0,
    orderTypeBreakdown: {
      dineIn: { revenue: 0, orders: 0, percentage: 0 },
      takeaway: { revenue: 0, orders: 0, percentage: 0 },
      delivery: { revenue: 0, orders: 0, percentage: 0 },
    },
  },
  restaurantBreakdown: [],
  branchBreakdown: [],
  dailyBreakdown: [],
  topRestaurants: [],
  topBranches: [],
  period: period || { start: '', end: '', label: '' },
  filterInfo: { period: '', totalBillsInPeriod: 0, totalOrdersInPeriod: 0, itemsProcessed: 0 },
});

// ─── Main Component ─────────────────────────────────────────────────────
export default function SuperAdminRevenue() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'reports'>('overview');
  const [period, setPeriod] = useState('month');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // ─── Fetch branches on mount ──────────────────────────────────────────
  useEffect(() => {
    fetchAllBranches();
  }, []);

  // ─── Fetch data when tab, period, or branch changes ───────────────────
  useEffect(() => {
    console.log('🔄 Fetching data for:', { activeTab, period, selectedBranch });
    if (activeTab === 'overview') {
      fetchRevenueOverview();
    } else if (activeTab === 'analytics') {
      fetchRevenueAnalytics();
    }
  }, [activeTab, period, selectedBranch]);

  // ─── Fetch All Branches with Restaurant Names ──────────────────────────
  const fetchAllBranches = async () => {
    try {
      setLoadingBranches(true);
      
      console.log('📤 Fetching restaurants...');
      const restaurantsRes = await superAdminApi.get('/super-admin/restaurants?limit=100');
      
      let restaurantsData: Restaurant[] = [];
      if (restaurantsRes.data?.success) {
        if (restaurantsRes.data.data?.restaurants) {
          restaurantsData = restaurantsRes.data.data.restaurants;
        } else if (restaurantsRes.data.data) {
          restaurantsData = Array.isArray(restaurantsRes.data.data) ? restaurantsRes.data.data : [];
        }
      }
      console.log(`✅ Found ${restaurantsData.length} restaurants`);
      
      const restaurantMap: Record<string, string> = {};
      restaurantsData.forEach((r) => {
        restaurantMap[r._id] = r.name;
      });

      console.log('📤 Fetching branches...');
      const branchesRes = await superAdminApi.get('/super-admin/branches?limit=1000');
      
      let branchesData: Branch[] = [];
      if (branchesRes.data?.success) {
        if (branchesRes.data.data?.branches) {
          branchesData = branchesRes.data.data.branches;
        } else if (branchesRes.data.data) {
          branchesData = Array.isArray(branchesRes.data.data) ? branchesRes.data.data : [];
        }
      }
      console.log(`✅ Found ${branchesData.length} branches`);
      
      const enrichedBranches = branchesData.map((branch) => {
        let restaurantId = branch.restaurantId;
        let restaurantName = 'Unknown';
        
        if (restaurantId && typeof restaurantId === 'object') {
          if (restaurantId._id) {
            restaurantId = restaurantId._id.toString();
          } else if (restaurantId.id) {
            restaurantId = restaurantId.id.toString();
          } else if (restaurantId.name) {
            restaurantName = restaurantId.name;
            restaurantId = restaurantId._id || restaurantId.id || '';
          } else {
            const stringified = JSON.stringify(restaurantId);
            const idMatch = stringified.match(/[a-f0-9]{24}/);
            if (idMatch) {
              restaurantId = idMatch[0];
            } else {
              restaurantId = '';
            }
          }
        }
        
        if (typeof restaurantId === 'string' && restaurantId) {
          if (restaurantMap[restaurantId]) {
            restaurantName = restaurantMap[restaurantId];
          }
        }
        
        if (restaurantName === 'Unknown' && branch.restaurantName) {
          restaurantName = branch.restaurantName;
        }
        
        return {
          ...branch,
          _id: branch._id,
          name: branch.name || 'Unnamed Branch',
          restaurantId: typeof restaurantId === 'string' ? restaurantId : '',
          restaurantName: restaurantName,
        };
      });
      
      setBranches(enrichedBranches);
      console.log(`✅ Enriched ${enrichedBranches.length} branches`);
      
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      setBranches([]);
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  // ─── Fetch Revenue Overview ─────────────────────────────────────────────
  const fetchRevenueOverview = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('period', period);
      
      if (selectedBranch && selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
        console.log(`📍 Filtering by branch: ${selectedBranch}`);
      }
      
      const url = `/super-admin/revenue/overview?${params.toString()}`;
      console.log('📤 Fetching revenue overview:', url);
      
      const response = await superAdminApi.get(url);
      console.log('📥 Revenue overview response:', response.data);
      
      if (response.data.success) {
        setRevenueData(response.data.data);
      }
    } catch (error: any) {
      console.error('Revenue overview error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch revenue data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Revenue Analytics ────────────────────────────────────────────
  const fetchRevenueAnalytics = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('period', period);
      params.append('groupBy', 'day');
      
      if (selectedBranch && selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
        console.log(`📍 Filtering analytics by branch: ${selectedBranch}`);
      }
      
      const url = `/super-admin/revenue/analytics?${params.toString()}`;
      console.log('📤 Fetching revenue analytics:', url);
      
      const response = await superAdminApi.get(url);
      console.log('📥 Revenue analytics response:', response.data);
      
      if (response.data.success) {
        setAnalyticsData(response.data.data);
      }
    } catch (error: any) {
      console.error('Revenue analytics error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // ─── Get filtered data for the selected branch ──────────────────────────
  const getFilteredOverviewData = () => {
    if (!revenueData) return null;

    if (selectedBranch === 'all') {
      return revenueData;
    }

    if (!revenueData.branchBreakdown || !Array.isArray(revenueData.branchBreakdown) || revenueData.branchBreakdown.length === 0) {
      console.log('⚠️ No branch breakdown available, returning empty data');
      return createEmptyRevenueData(revenueData.period);
    }

    const filteredBranch = revenueData.branchBreakdown.find(
      b => b.branchId?.toString() === selectedBranch?.toString()
    );

    if (!filteredBranch) {
      console.log(`⚠️ Branch ${selectedBranch} not found in breakdown, returning empty data`);
      console.log('📊 Available branches:', revenueData.branchBreakdown.map(b => ({ id: b.branchId, name: b.branchName })));
      return createEmptyRevenueData(revenueData.period);
    }

    console.log(`✅ Found branch ${filteredBranch.branchName} with revenue ${filteredBranch.revenue}`);
    return {
      summary: {
        totalRevenue: filteredBranch.revenue || 0,
        totalOrders: filteredBranch.orders || 0,
        averageOrderValue: filteredBranch.orders > 0 
          ? filteredBranch.revenue / filteredBranch.orders 
          : 0,
        platformCommission: filteredBranch.commissionEarned || 0,
        orderTypeBreakdown: {
          dineIn: { revenue: 0, orders: 0, percentage: 0 },
          takeaway: { revenue: 0, orders: 0, percentage: 0 },
          delivery: { revenue: 0, orders: 0, percentage: 0 },
        },
      },
      restaurantBreakdown: revenueData.restaurantBreakdown || [],
      branchBreakdown: [filteredBranch],
      dailyBreakdown: revenueData.dailyBreakdown || [],
      topRestaurants: revenueData.topRestaurants || [],
      topBranches: [filteredBranch],
      period: revenueData.period || { start: '', end: '', label: '' },
      filterInfo: revenueData.filterInfo || { period: '', totalBillsInPeriod: 0, totalOrdersInPeriod: 0, itemsProcessed: 0 },
    };
  };

  // ─── Handle branch filter change ────────────────────────────────────────
  const handleBranchChange = (value: string) => {
    console.log('📍 Branch filter changed to:', value);
    setSelectedBranch(value);
  };

  if (loading && !revenueData && !analyticsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  const branchList = branches.length > 0 
    ? branches 
    : (revenueData?.branchBreakdown?.map(b => ({
        _id: b.branchId,
        name: b.branchName,
        restaurantName: b.restaurantName || 'Unknown'
      })) || []);

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
            <h1 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
            <p className="text-sm text-gray-500">Platform-wide revenue analytics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeTab === 'overview') fetchRevenueOverview();
                else fetchRevenueAnalytics();
              }}
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

      {/* ─── Tabs ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          {(['overview', 'analytics', 'reports'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-wrap">
        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
          }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>

        <select
          value={selectedBranch}
          onChange={(e) => handleBranchChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[180px]"
        >
          <option value="all">📍 All Branches</option>
          {branchList.length > 0 ? (
            branchList.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} {b.restaurantName && b.restaurantName !== 'Unknown' ? `(${b.restaurantName})` : ''}
              </option>
            ))
          ) : (
            <option value="" disabled>No branches available</option>
          )}
        </select>

        {selectedBranch !== 'all' && (
          <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            Filtered by: {branchList.find(b => b._id === selectedBranch)?.name || 'Selected Branch'}
          </span>
        )}

        {loadingBranches && (
          <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
        )}
      </div>

      {/* ─── Content ──────────────────────────────────────────────────── */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <OverviewTab 
            data={getFilteredOverviewData()} 
            formatCurrency={formatCurrency} 
            formatPercentage={formatPercentage}
            selectedBranch={selectedBranch}
            branchList={branchList}
          />
        )}
        {activeTab === 'analytics' && analyticsData && (
          <AnalyticsTab 
            data={analyticsData} 
            formatCurrency={formatCurrency} 
            formatPercentage={formatPercentage}
            selectedBranch={selectedBranch}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsTab 
            formatCurrency={formatCurrency} 
            branches={branchList}
            selectedBranch={selectedBranch}
          />
        )}
      </div>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────
function OverviewTab({ data, formatCurrency, formatPercentage, selectedBranch, branchList }: any) {
  if (!data) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
        <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">No Revenue Data</h3>
        <p className="text-gray-400 mt-2">
          {selectedBranch !== 'all' 
            ? 'No revenue data found for the selected branch in this period.'
            : 'Complete and pay for orders to see revenue data here.'}
        </p>
      </div>
    );
  }

  const { summary, branchBreakdown, dailyBreakdown } = data;
  const displayBreakdown = branchBreakdown || [];
  const isEmpty = summary.totalRevenue === 0 && summary.totalOrders === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={formatCurrency(summary.totalRevenue || 0)}
          subtitle={`${summary.totalOrders || 0} orders`}
          iconColor="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={ShoppingBag}
          title="Average Order Value"
          value={formatCurrency(summary.averageOrderValue || 0)}
          subtitle="Per order average"
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Wallet}
          title="Platform Commission"
          value={formatCurrency(summary.platformCommission || 0)}
          subtitle="Total earned"
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={MapPin}
          title="Active Branches"
          value={selectedBranch !== 'all' ? 1 : displayBreakdown.filter((b: any) => b.revenue > 0).length}
          subtitle={selectedBranch !== 'all' ? 'Selected branch' : 'With revenue'}
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
        />
      </div>

      {/* Order Type Breakdown */}
      {summary.orderTypeBreakdown && !isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Object.entries(summary.orderTypeBreakdown).map(([key, value]: any) => (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 card-hover">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 capitalize">{key}</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(value.revenue || 0)}</p>
                  <p className="text-sm text-gray-500">{value.orders || 0} orders</p>
                </div>
                <div className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                  {value.percentage?.toFixed(1) || 0}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEmpty && selectedBranch !== 'all' && (
        <div className="text-center py-8 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500">No orders found for this branch in the selected period.</p>
          <p className="text-sm text-gray-400 mt-2">Try selecting a different period or branch.</p>
        </div>
      )}

      {/* Branch Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">
            {selectedBranch !== 'all' ? 'Branch Details' : 'Branch Breakdown'}
          </h2>
          <span className="text-xs text-gray-500">
            {data.period?.label || ''} • {data.period?.start || ''} - {data.period?.end || ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayBreakdown.length > 0 ? (
                displayBreakdown.map((branch: any) => (
                  <tr key={branch.branchId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {branch.branchName || 'Unnamed'}
                      {selectedBranch !== 'all' && branch.branchId === selectedBranch && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Selected</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {branch.restaurantName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">{branch.orders || 0}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                      {formatCurrency(branch.revenue || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-purple-600">
                      {formatCurrency(branch.commissionEarned || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {branch.orders > 0 ? formatCurrency((branch.revenue || 0) / branch.orders) : formatCurrency(0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    {selectedBranch !== 'all' 
                      ? 'No data available for this branch'
                      : 'No branch data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Breakdown */}
      {dailyBreakdown && dailyBreakdown.length > 0 && !isEmpty && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Daily Revenue Trend</h2>
            <span className="text-xs text-gray-500">
              {data.period?.label || ''} • {data.period?.start || ''} - {data.period?.end || ''}
            </span>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {dailyBreakdown.slice(0, 30).map((day: any) => (
              <div key={day.date} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                <div className="w-32 text-sm font-medium text-gray-600">{day.date}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 bg-purple-600 rounded-full transition-all"
                      style={{ width: `${Math.min((day.revenue / (dailyBreakdown[0]?.revenue || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900 w-32 text-right">{formatCurrency(day.revenue || 0)}</div>
                <div className="text-sm text-gray-500 w-20 text-right">{day.orders || 0} orders</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analytics Tab ─────────────────────────────────────────────────────
function AnalyticsTab({ data, formatCurrency, formatPercentage, selectedBranch }: any) {
  if (!data || !data.summary) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">No Analytics Data</h3>
        <p className="text-gray-400 mt-2">
          {selectedBranch !== 'all' 
            ? 'No analytics data found for the selected branch in this period.'
            : 'Complete and pay for orders to see analytics here.'}
        </p>
      </div>
    );
  }

  const { summary, timeline, hourlyData, topItems, customerSegments } = data;

  if (summary.totalRevenue === 0 && summary.totalOrders === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">No Analytics Data</h3>
        <p className="text-gray-400 mt-2">
          {selectedBranch !== 'all' 
            ? 'No analytics data found for the selected branch in this period.'
            : 'No data available for the selected period.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          title="Revenue Growth"
          value={formatPercentage(summary.revenueGrowth || 0)}
          subtitle="vs previous period"
          iconColor={summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}
          bgColor={summary.revenueGrowth >= 0 ? 'bg-green-50' : 'bg-red-50'}
        />
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={formatCurrency(summary.totalRevenue || 0)}
          subtitle={`${summary.totalOrders || 0} orders`}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Activity}
          title="Avg Order Value"
          value={formatCurrency(summary.averageOrderValue || 0)}
          subtitle="Per order"
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={Clock}
          title="Peak Hour"
          value={hourlyData && hourlyData.length > 0 ? hourlyData.reduce((max: any, h: any) => h.orders > max.orders ? h : max, hourlyData[0])?.hour + ':00' || 'N/A' : 'N/A'}
          subtitle="Most orders"
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
        />
      </div>

      {timeline && timeline.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Timeline</h3>
          <div className="h-48 flex items-end gap-1">
            {timeline.map((item: any, index: number) => {
              const maxRevenue = Math.max(...timeline.map((t: any) => t.revenue || 0));
              const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center">
                    <div 
                      className="w-full bg-purple-600 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 1)}%` }}
                    />
                    <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">
                      {item.date?.slice(5) || ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hourlyData && hourlyData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Hourly Order Distribution</h3>
          <div className="grid grid-cols-12 gap-1">
            {hourlyData.map((hour: any) => (
              <div key={hour.hour} className="flex flex-col items-center">
                <div 
                  className="w-full bg-blue-200 rounded-t"
                  style={{ height: `${Math.max((hour.orders / Math.max(...hourlyData.map((h: any) => h.orders))) * 100, 2)}%` }}
                />
                <span className="text-[10px] text-gray-500 mt-1">{hour.hour}:00</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {customerSegments && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Customer Segments</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-purple-700">VIP Customers</p>
                  <p className="text-xs text-purple-500">{customerSegments.vip?.orders || 0} orders</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-900">{formatCurrency(customerSegments.vip?.revenue || 0)}</p>
                  <p className="text-xs text-purple-500">Avg: {formatCurrency(customerSegments.vip?.averageOrderValue || 0)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Regular Customers</p>
                  <p className="text-xs text-gray-500">{customerSegments.regular?.orders || 0} orders</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(customerSegments.regular?.revenue || 0)}</p>
                  <p className="text-xs text-gray-500">Avg: {formatCurrency(customerSegments.regular?.averageOrderValue || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Top Selling Items</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
              {topItems && topItems.length > 0 ? (
                topItems.map((item: any, index: number) => (
                  <div key={index} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{item.quantity || 0} units • {item.orders || 0} orders</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(item.revenue || 0)}</p>
                  </div>
                ))
              ) : (
                <div className="px-6 py-4 text-center text-gray-400 text-sm">No items data available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports Tab ───────────────────────────────────────────────────────
function ReportsTab({ formatCurrency, branches, selectedBranch: propSelectedBranch }: any) {
  const [reportType, setReportType] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(propSelectedBranch || 'all');

  useEffect(() => {
    if (propSelectedBranch) {
      setSelectedBranch(propSelectedBranch);
    }
  }, [propSelectedBranch]);

  useEffect(() => {
    generateReport();
  }, [reportType, year, month, selectedBranch]);

  const generateReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        reportType,
        year: year.toString(),
        month: month.toString(),
      });
      if (selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
      }
      const response = await superAdminApi.get(`/super-admin/revenue/reports?${params}`);
      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error: any) {
      console.error('Generate report error:', error);
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {reportType !== 'yearly' && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Branch</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Branches</option>
            {branches?.map((b: any) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={generateReport}
          className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 mt-5"
        >
          Generate Report
        </button>
      </div>

      {reportData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Report Summary</h2>
            <div className="flex gap-2">
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <Printer className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.summary?.totalRevenue || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-xl font-bold text-gray-900">{reportData.summary?.totalOrders || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.summary?.averageOrderValue || 0)}</p>
              </div>
            </div>

            {reportData.branchPerformance?.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Branch Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-600">Branch</th>
                        <th className="px-4 py-2 text-left text-gray-600">Restaurant</th>
                        <th className="px-4 py-2 text-right text-gray-600">Orders</th>
                        <th className="px-4 py-2 text-right text-gray-600">Revenue</th>
                        <th className="px-4 py-2 text-right text-gray-600">Commission</th>
                        <th className="px-4 py-2 text-right text-gray-600">Avg Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.branchPerformance.map((b: any) => (
                        <tr key={b.branchName} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">{b.branchName}</td>
                          <td className="px-4 py-2 text-gray-600">{b.restaurantName || 'N/A'}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{b.orders || 0}</td>
                          <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(b.revenue || 0)}</td>
                          <td className="px-4 py-2 text-right text-purple-600">{formatCurrency(b.commissionEarned || 0)}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(b.averageOrderValue || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────
function StatCard({ icon: Icon, title, value, subtitle, iconColor, bgColor }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}