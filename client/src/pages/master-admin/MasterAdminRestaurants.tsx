// pages/master-admin/MasterAdminRestaurants.tsx - VIEW ONLY (No Approval Actions)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Search,
  Filter,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  Crown,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  CreditCard,
  TrendingUp,
  Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { masterAdminApi } from '../../services/api';
import { useAuth } from '../../utils/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────
interface Restaurant {
  _id: string;
  name: string;
  email: string;
  phone: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  owner: {
    name: string;
    email: string;
    phone: string;
  };
  businessType: string;
  cuisineTypes: string[];
  status: string;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  rejectedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  rejectedAt?: string;
  overriddenBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  overriddenAt?: string;
  overrideReason?: string;
  previousApprovalStatus?: string;
  subscription: {
    plan: string;
    status: string;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalStaff: number;
    totalBranches: number;
  };
  branches: Array<{
    _id: string;
    name: string;
    city: string;
    isActive: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

const APPROVAL_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  suspended: { label: 'Suspended', color: 'bg-gray-100 text-gray-700', icon: Ban },
};

export default function MasterAdminRestaurants() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    pages: 0,
  });

  // ─── Filter States ──────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ─── UI States ──────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  // ─── Fetch Restaurants ──────────────────────────────────────────────
  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(pagination.page));
      params.append('limit', String(ITEMS_PER_PAGE));

      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (approvalFilter !== 'all') {
        params.append('approvalStatus', approvalFilter);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (sortBy) {
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
      }

      const response = await masterAdminApi.get(`/super-admin/restaurants?${params}`);
      console.log('📥 Restaurants response:', response.data);

      if (response.data.success) {
        const data = response.data.data;
        setRestaurants(data.restaurants || []);
        setPagination(data.pagination || {
          total: 0,
          page: 1,
          limit: ITEMS_PER_PAGE,
          pages: 0,
        });
      } else {
        toast.error(response.data.error || 'Failed to fetch restaurants');
      }
    } catch (error: any) {
      console.error('❌ Fetch restaurants error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch restaurants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRestaurants();
  }, [pagination.page, approvalFilter, statusFilter, sortBy, sortOrder]);

  // ─── Search Handler ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchRestaurants();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ─── Fetch Single Restaurant Details ──────────────────────────────
  const fetchRestaurantDetails = async (id: string) => {
    setViewLoading(true);
    try {
      const response = await masterAdminApi.get(`/super-admin/restaurants/${id}`);
      console.log('🔍 Restaurant details:', response.data.data);
      
      if (response.data.success) {
        setSelectedRestaurant(response.data.data);
        setShowViewModal(true);
      } else {
        toast.error(response.data.error || 'Failed to fetch restaurant details');
      }
    } catch (error: any) {
      console.error('❌ Fetch restaurant details error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch restaurant details');
    } finally {
      setViewLoading(false);
    }
  };

  // ─── Refresh ──────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  // ─── Clear Filters ──────────────────────────────────────────────────
  const clearFilters = () => {
    setSearchTerm('');
    setApprovalFilter('all');
    setStatusFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // ─── Format Helpers ──────────────────────────────────────────────────
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getApprovalBadge = (status: string) => {
    const config = APPROVAL_STATUS_CONFIG[status as keyof typeof APPROVAL_STATUS_CONFIG] || 
      { label: status, color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={12} /> {config.label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
    ) : (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Inactive</span>
    );
  };

  const getInitials = (name: string) => {
    if (!name) return 'R';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ─── Pagination ──────────────────────────────────────────────────────
  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.pages) return;
    setPagination(prev => ({ ...prev, page }));
  };

  // ─── Loading State ──────────────────────────────────────────────────
  if (loading && restaurants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  Restaurant Management
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({pagination.total})
                  </span>
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  View all restaurants across the platform
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ─── Stats Summary ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {restaurants.filter(r => r.approvalStatus === 'pending').length}
                </p>
                <p className="text-xs text-gray-500">Pending Approval</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock size={18} className="text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {restaurants.filter(r => r.approvalStatus === 'approved').length}
                </p>
                <p className="text-xs text-gray-500">Approved</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={18} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {restaurants.filter(r => r.approvalStatus === 'rejected').length}
                </p>
                <p className="text-xs text-gray-500">Rejected</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle size={18} className="text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-600">
                  {restaurants.filter(r => r.approvalStatus === 'suspended').length}
                </p>
                <p className="text-xs text-gray-500">Suspended</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Ban size={18} className="text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Filters ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Approval Filter */}
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
            >
              <option value="all">All Approval Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition ${
                showFilters || searchTerm || approvalFilter !== 'all' || statusFilter !== 'all'
                  ? 'border-amber-400 bg-amber-50 text-amber-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={14} />
              Filters
              {(searchTerm || approvalFilter !== 'all' || statusFilter !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Clear Filters */}
            {(searchTerm || approvalFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="border-t border-gray-100 p-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Table ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approval Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {restaurants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Store size={48} className="mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium text-gray-600">No Restaurants Found</h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm || approvalFilter !== 'all' || statusFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Restaurants will appear here once Super Admins create them'}
                      </p>
                      {(searchTerm || approvalFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                          onClick={clearFilters}
                          className="mt-3 text-amber-500 hover:text-amber-600 text-sm font-medium"
                        >
                          Clear all filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  restaurants.map((restaurant) => (
                    <tr key={restaurant._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {restaurant.logo ? (
                              <img src={restaurant.logo} alt={restaurant.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              getInitials(restaurant.name)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{restaurant.name}</p>
                            <p className="text-xs text-gray-400">{restaurant.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-700">{restaurant.owner?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-400">{restaurant.owner?.email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {getApprovalBadge(restaurant.approvalStatus)}
                          {restaurant.overriddenBy && (
                            <span className="text-xs text-amber-500 block flex items-center gap-1">
                              <Crown size={10} /> Overridden by Master Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(restaurant.isActive)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(restaurant.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => fetchRestaurantDetails(restaurant._id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Pagination ────────────────────────────────────────────────── */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                {Math.min(pagination.page * ITEMS_PER_PAGE, pagination.total)} of {pagination.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`p-2 rounded-lg border transition ${
                    pagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-4 py-2 rounded-lg border transition ${
                        pagination.page === pageNum
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {pagination.pages > 5 && pagination.page < pagination.pages - 2 && (
                  <>
                    <span className="px-2 py-2 text-gray-400">...</span>
                    <button
                      onClick={() => goToPage(pagination.pages)}
                      className={`px-4 py-2 rounded-lg border transition ${
                        pagination.page === pagination.pages
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {pagination.pages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className={`p-2 rounded-lg border transition ${
                    pagination.page === pagination.pages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── VIEW DETAILS MODAL ───────────────────────────────────────────── */}
      {showViewModal && selectedRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
                  {selectedRestaurant.logo ? (
                    <img src={selectedRestaurant.logo} alt={selectedRestaurant.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(selectedRestaurant.name)
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedRestaurant.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getApprovalBadge(selectedRestaurant.approvalStatus)}
                    {getStatusBadge(selectedRestaurant.isActive)}
                    {selectedRestaurant.overriddenBy && (
                      <span className="text-xs text-amber-500 flex items-center gap-1">
                        <Crown size={12} /> Overridden
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedRestaurant(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            {viewLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={40} className="animate-spin text-amber-500" />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Store size={16} className="text-amber-500" />
                    Restaurant Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="font-medium text-gray-800">{selectedRestaurant.name}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        {selectedRestaurant.email}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {selectedRestaurant.phone}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Business Type</p>
                      <p className="font-medium text-gray-800">{selectedRestaurant.businessType}</p>
                    </div>
                    <div className="md:col-span-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Address</p>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        {selectedRestaurant.address?.street}, {selectedRestaurant.address?.city}, {selectedRestaurant.address?.state} - {selectedRestaurant.address?.pincode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User size={16} className="text-amber-500" />
                    Owner Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="font-medium text-gray-800">{selectedRestaurant.owner?.name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="font-medium text-gray-800">{selectedRestaurant.owner?.email || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="font-medium text-gray-800">{selectedRestaurant.owner?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-amber-500" />
                    Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-gray-800">{selectedRestaurant.stats?.totalOrders || 0}</p>
                      <p className="text-xs text-gray-400">Orders</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">₹{selectedRestaurant.stats?.totalRevenue || 0}</p>
                      <p className="text-xs text-gray-400">Revenue</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedRestaurant.stats?.totalStaff || 0}</p>
                      <p className="text-xs text-gray-400">Staff</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">{selectedRestaurant.stats?.totalBranches || 0}</p>
                      <p className="text-xs text-gray-400">Branches</p>
                    </div>
                  </div>
                </div>

                {/* Subscription */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CreditCard size={16} className="text-amber-500" />
                    Subscription
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Plan</p>
                      <p className="font-medium text-gray-800 capitalize">{selectedRestaurant.subscription?.plan || 'Trial'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Status</p>
                      <p className="font-medium text-gray-800 capitalize">{selectedRestaurant.subscription?.status || 'Active'}</p>
                    </div>
                  </div>
                </div>

                {/* Approval History */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText size={16} className="text-amber-500" />
                    Approval History
                  </h3>
                  <div className="space-y-2">
                    {selectedRestaurant.approvedBy && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm text-green-700">
                          ✅ Approved by {selectedRestaurant.approvedBy.firstName} {selectedRestaurant.approvedBy.lastName}
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatDateTime(selectedRestaurant.approvedAt)})
                          </span>
                        </p>
                        {selectedRestaurant.overrideReason && selectedRestaurant.approvalStatus === 'approved' && (
                          <p className="text-sm text-gray-600 mt-1">Reason: {selectedRestaurant.overrideReason}</p>
                        )}
                      </div>
                    )}
                    {selectedRestaurant.rejectedBy && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-sm text-red-700">
                          ❌ Rejected by {selectedRestaurant.rejectedBy.firstName} {selectedRestaurant.rejectedBy.lastName}
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatDateTime(selectedRestaurant.rejectedAt)})
                          </span>
                        </p>
                        {selectedRestaurant.rejectionReason && (
                          <p className="text-sm text-gray-600 mt-1">Reason: {selectedRestaurant.rejectionReason}</p>
                        )}
                      </div>
                    )}
                    {selectedRestaurant.overriddenBy && selectedRestaurant.approvalStatus !== 'approved' && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-sm text-amber-700">
                          👑 Overridden by {selectedRestaurant.overriddenBy.firstName} {selectedRestaurant.overriddenBy.lastName}
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatDateTime(selectedRestaurant.overriddenAt)})
                          </span>
                        </p>
                        {selectedRestaurant.overrideReason && (
                          <p className="text-sm text-gray-600 mt-1">Reason: {selectedRestaurant.overrideReason}</p>
                        )}
                      </div>
                    )}
                    {!selectedRestaurant.approvedBy && !selectedRestaurant.rejectedBy && !selectedRestaurant.overriddenBy && (
                      <p className="text-sm text-gray-400">No approval history yet</p>
                    )}
                  </div>
                </div>

                {/* Branches */}
                {selectedRestaurant.branches && selectedRestaurant.branches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Building2 size={16} className="text-amber-500" />
                      Branches ({selectedRestaurant.branches.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedRestaurant.branches.map((branch) => (
                        <div key={branch._id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-800">{branch.name}</p>
                            <p className="text-xs text-gray-400">{branch.city}</p>
                          </div>
                          {branch.isActive ? (
                            <span className="text-xs text-green-600">Active</span>
                          ) : (
                            <span className="text-xs text-red-600">Inactive</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedRestaurant(null);
                    }}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}