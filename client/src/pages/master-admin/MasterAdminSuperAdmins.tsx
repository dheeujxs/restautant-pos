// pages/master-admin/MasterAdminSuperAdmins.tsx - WITH VIEW DETAILS DIALOG

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  Mail,
  Phone,
  Building2,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Users,
  Calendar,
  MapPin,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  X,
  Key,
  Crown,
  Globe,
  Smartphone,
  Award,
  FileText,
  DollarSign,
  ShoppingBag,
  Utensils,
  Package,
  Settings as SettingsIcon,
  CreditCard,
  Store,
  List,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { masterAdminApi } from '../../services/api';
import { useAuth } from '../../utils/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────
interface SuperAdmin {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organizationName: string;
  isActive: boolean;
  isVerified: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  permissions?: {
    canCreateRestaurant: boolean;
    canEditRestaurant: boolean;
    canDeleteRestaurant: boolean;
    canViewAllRestaurants: boolean;
    canApproveRestaurant: boolean;
    canRejectRestaurant: boolean;
    canSuspendRestaurant: boolean;
    canCreateBranch: boolean;
    canEditBranch: boolean;
    canDeleteBranch: boolean;
    canViewAllBranches: boolean;
    canCreateStaff: boolean;
    canEditStaff: boolean;
    canDeleteStaff: boolean;
    canViewAllStaff: boolean;
    canManageStaffRoles: boolean;
    canManageStaffPermissions: boolean;
    canViewAllOrders: boolean;
    canCancelAnyOrder: boolean;
    canCompleteAnyOrder: boolean;
    canManageDelivery: boolean;
    canViewAllPayments: boolean;
    canRefundPayment: boolean;
    canManagePaymentMethods: boolean;
    canCreateDish: boolean;
    canEditDish: boolean;
    canDeleteDish: boolean;
    canViewAllMenus: boolean;
    canManageCategories: boolean;
    canViewAllInventory: boolean;
    canManageInventory: boolean;
    canManageSuppliers: boolean;
    canCreatePurchase: boolean;
    canViewAllReports: boolean;
    canExportReports: boolean;
    canViewFinancialReports: boolean;
    canManageSystemSettings: boolean;
    canViewAuditLogs: boolean;
    canViewSubscriptions: boolean;
    canManageSubscriptions: boolean;
    canViewCommissions: boolean;
    canManageCommissions: boolean;
    canManageAllRestaurants: boolean;
    canManageAllBranches: boolean;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

// ─── Permission Labels ──────────────────────────────────────────────────
const PERMISSION_LABELS: Record<string, { label: string; icon: any; category: string }> = {
  canCreateRestaurant: { label: 'Create Restaurants', icon: Store, category: 'Restaurant' },
  canEditRestaurant: { label: 'Edit Restaurants', icon: Store, category: 'Restaurant' },
  canDeleteRestaurant: { label: 'Delete Restaurants', icon: Store, category: 'Restaurant' },
  canViewAllRestaurants: { label: 'View All Restaurants', icon: Store, category: 'Restaurant' },
  canApproveRestaurant: { label: 'Approve Restaurants', icon: Store, category: 'Restaurant' },
  canRejectRestaurant: { label: 'Reject Restaurants', icon: Store, category: 'Restaurant' },
  canSuspendRestaurant: { label: 'Suspend Restaurants', icon: Store, category: 'Restaurant' },
  canCreateBranch: { label: 'Create Branches', icon: MapPin, category: 'Branch' },
  canEditBranch: { label: 'Edit Branches', icon: MapPin, category: 'Branch' },
  canDeleteBranch: { label: 'Delete Branches', icon: MapPin, category: 'Branch' },
  canViewAllBranches: { label: 'View All Branches', icon: MapPin, category: 'Branch' },
  canCreateStaff: { label: 'Create Staff', icon: Users, category: 'Staff' },
  canEditStaff: { label: 'Edit Staff', icon: Users, category: 'Staff' },
  canDeleteStaff: { label: 'Delete Staff', icon: Users, category: 'Staff' },
  canViewAllStaff: { label: 'View All Staff', icon: Users, category: 'Staff' },
  canManageStaffRoles: { label: 'Manage Staff Roles', icon: Users, category: 'Staff' },
  canManageStaffPermissions: { label: 'Manage Staff Permissions', icon: Users, category: 'Staff' },
  canViewAllOrders: { label: 'View All Orders', icon: ShoppingBag, category: 'Order' },
  canCancelAnyOrder: { label: 'Cancel Any Order', icon: ShoppingBag, category: 'Order' },
  canCompleteAnyOrder: { label: 'Complete Any Order', icon: ShoppingBag, category: 'Order' },
  canManageDelivery: { label: 'Manage Delivery', icon: ShoppingBag, category: 'Order' },
  canViewAllPayments: { label: 'View All Payments', icon: CreditCard, category: 'Payment' },
  canRefundPayment: { label: 'Refund Payments', icon: CreditCard, category: 'Payment' },
  canManagePaymentMethods: { label: 'Manage Payment Methods', icon: CreditCard, category: 'Payment' },
  canCreateDish: { label: 'Create Dishes', icon: Utensils, category: 'Menu' },
  canEditDish: { label: 'Edit Dishes', icon: Utensils, category: 'Menu' },
  canDeleteDish: { label: 'Delete Dishes', icon: Utensils, category: 'Menu' },
  canViewAllMenus: { label: 'View All Menus', icon: Utensils, category: 'Menu' },
  canManageCategories: { label: 'Manage Categories', icon: Utensils, category: 'Menu' },
  canViewAllInventory: { label: 'View All Inventory', icon: Package, category: 'Inventory' },
  canManageInventory: { label: 'Manage Inventory', icon: Package, category: 'Inventory' },
  canManageSuppliers: { label: 'Manage Suppliers', icon: Package, category: 'Inventory' },
  canCreatePurchase: { label: 'Create Purchase Orders', icon: Package, category: 'Inventory' },
  canViewAllReports: { label: 'View All Reports', icon: FileText, category: 'Report' },
  canExportReports: { label: 'Export Reports', icon: FileText, category: 'Report' },
  canViewFinancialReports: { label: 'View Financial Reports', icon: FileText, category: 'Report' },
  canManageSystemSettings: { label: 'Manage System Settings', icon: SettingsIcon, category: 'System' },
  canViewAuditLogs: { label: 'View Audit Logs', icon: SettingsIcon, category: 'System' },
  canViewSubscriptions: { label: 'View Subscriptions', icon: Award, category: 'Subscription' },
  canManageSubscriptions: { label: 'Manage Subscriptions', icon: Award, category: 'Subscription' },
  canViewCommissions: { label: 'View Commissions', icon: DollarSign, category: 'Subscription' },
  canManageCommissions: { label: 'Manage Commissions', icon: DollarSign, category: 'Subscription' },
  canManageAllRestaurants: { label: 'Manage All Restaurants', icon: Crown, category: 'Restriction' },
  canManageAllBranches: { label: 'Manage All Branches', icon: Crown, category: 'Restriction' },
};

const PERMISSION_CATEGORIES = [
  'Restaurant', 'Branch', 'Staff', 'Order', 'Payment', 
  'Menu', 'Inventory', 'Report', 'System', 'Subscription', 'Restriction'
];

export default function MasterAdminSuperAdmins() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    pages: 0,
  });

  // ─── Filter States ──────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ─── UI States ──────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState<SuperAdmin | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  // ─── Fetch Super Admins ──────────────────────────────────────────────
  const fetchSuperAdmins = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(pagination.page));
      params.append('limit', String(ITEMS_PER_PAGE));

      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (sortBy) {
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
      }

      const response = await masterAdminApi.get(`/master-admin/super-admins?${params}`);
      console.log('📥 Super Admins response:', response.data);

      if (response.data.success) {
        const data = response.data.data;
        setSuperAdmins(data.superAdmins || []);
        setPagination(data.pagination || {
          total: 0,
          page: 1,
          limit: ITEMS_PER_PAGE,
          pages: 0,
        });
      } else {
        toast.error(response.data.error || 'Failed to fetch Super Admins');
      }
    } catch (error: any) {
      console.error('❌ Fetch Super Admins error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch Super Admins');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── Fetch Single Super Admin Details ──────────────────────────────
  const fetchSuperAdminDetails = async (id: string) => {
    setViewLoading(true);
    try {
      const response = await masterAdminApi.get(`/master-admin/super-admins/${id}`);
      console.log('📥 Super Admin details:', response.data);

      if (response.data.success) {
        setSelectedSuperAdmin(response.data.data);
        setShowViewDialog(true);
      } else {
        toast.error(response.data.error || 'Failed to fetch Super Admin details');
      }
    } catch (error: any) {
      console.error('❌ Fetch Super Admin details error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch Super Admin details');
    } finally {
      setViewLoading(false);
    }
  };

  // ─── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSuperAdmins();
  }, [pagination.page, statusFilter, sortBy, sortOrder]);

  // ─── Search Handler ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchSuperAdmins();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ─── Toggle Status ────────────────────────────────────────────────────
  const handleToggleStatus = async (superAdmin: SuperAdmin) => {
    setSelectedSuperAdmin(superAdmin);
    setShowStatusModal(true);
  };

  const confirmToggleStatus = async () => {
    if (!selectedSuperAdmin) return;

    setActionLoading(true);
    try {
      const response = await masterAdminApi.patch(
        `/master-admin/super-admins/${selectedSuperAdmin._id}/toggle-status`
      );

      if (response.data.success) {
        toast.success(
          `Super Admin ${selectedSuperAdmin.isActive ? 'suspended' : 'activated'} successfully`
        );
        fetchSuperAdmins();
        setShowStatusModal(false);
        setSelectedSuperAdmin(null);
      } else {
        toast.error(response.data.error || 'Failed to toggle status');
      }
    } catch (error: any) {
      console.error('❌ Toggle status error:', error);
      toast.error(error.response?.data?.error || 'Failed to toggle status');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Delete Super Admin ──────────────────────────────────────────────
  const handleDelete = (superAdmin: SuperAdmin) => {
    setSelectedSuperAdmin(superAdmin);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedSuperAdmin) return;

    setActionLoading(true);
    try {
      const response = await masterAdminApi.delete(
        `/master-admin/super-admins/${selectedSuperAdmin._id}`
      );

      if (response.data.success) {
        toast.success(`Super Admin ${selectedSuperAdmin.firstName} deleted successfully`);
        fetchSuperAdmins();
        setShowDeleteModal(false);
        setSelectedSuperAdmin(null);
      } else {
        toast.error(response.data.error || 'Failed to delete Super Admin');
      }
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete Super Admin');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Handle View ──────────────────────────────────────────────────────
  const handleView = (superAdmin: SuperAdmin) => {
    fetchSuperAdminDetails(superAdmin._id);
  };

  // ─── Refresh ──────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    fetchSuperAdmins();
  };

  // ─── Clear Filters ──────────────────────────────────────────────────
  const clearFilters = () => {
    setSearchTerm('');
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

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle size={12} /> Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle size={12} /> Suspended
      </span>
    );
  };

  const getVerificationBadge = (isVerified: boolean) => {
    return isVerified ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <CheckCircle size={12} /> Verified
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Clock size={12} /> Pending
      </span>
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'SA';
  };

  // ─── Pagination ──────────────────────────────────────────────────────
  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.pages) return;
    setPagination(prev => ({ ...prev, page }));
  };

  // ─── Loading State ──────────────────────────────────────────────────
  if (loading && superAdmins.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading Super Admins...</p>
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
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  Super Admins
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({pagination.total})
                  </span>
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage all Super Admin accounts on the platform
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <button
              onClick={() => navigate('/master-admin/super-admins/new')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm"
            >
              <Plus size={18} />
              Create Super Admin
            </button>
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

        {/* ─── Filters ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, organization..."
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Suspended</option>
            </select>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition ${
                showFilters || searchTerm || statusFilter !== 'all'
                  ? 'border-amber-400 bg-amber-50 text-amber-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={14} />
              Filters
              {(searchTerm || statusFilter !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Clear Filters */}
            {(searchTerm || statusFilter !== 'all') && (
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
                <label className="text-sm text-gray-600">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="firstName">Name</option>
                  <option value="email">Email</option>
                  <option value="organizationName">Organization</option>
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
                    Super Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {superAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Shield size={48} className="mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium text-gray-600">No Super Admins Found</h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm || statusFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Create your first Super Admin to get started'}
                      </p>
                      {(searchTerm || statusFilter !== 'all') && (
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
                  superAdmins.map((admin) => (
                    <tr key={admin._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {getInitials(admin.firstName, admin.lastName)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {admin.firstName} {admin.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-700">{admin.organizationName || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            {admin.phone || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {getStatusBadge(admin.isActive)}
                          {getVerificationBadge(admin.isVerified)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(admin.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleView(admin)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => navigate(`/master-admin/super-admins/${admin._id}/edit`)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            className={`p-2 rounded-lg transition-colors ${
                              admin.isActive
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={admin.isActive ? 'Suspend' : 'Activate'}
                          >
                            {admin.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>
                          <button
                            onClick={() => handleDelete(admin)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
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

      {/* ─── VIEW DETAILS DIALOG ────────────────────────────────────────── */}
      {showViewDialog && selectedSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {getInitials(selectedSuperAdmin.firstName, selectedSuperAdmin.lastName)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedSuperAdmin.firstName} {selectedSuperAdmin.lastName}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getStatusBadge(selectedSuperAdmin.isActive)}
                    {getVerificationBadge(selectedSuperAdmin.isVerified)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewDialog(false);
                  setSelectedSuperAdmin(null);
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
                {/* ─── Basic Information ────────────────────────────────── */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User size={16} className="text-amber-500" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Full Name</p>
                      <p className="font-medium text-gray-800">
                        {selectedSuperAdmin.firstName} {selectedSuperAdmin.lastName}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Role</p>
                      <p className="font-medium text-gray-800 capitalize flex items-center gap-2">
                        <Shield size={14} className="text-amber-500" />
                        {selectedSuperAdmin.role || 'Super Admin'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        {selectedSuperAdmin.email}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {selectedSuperAdmin.phone || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Organization</p>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400" />
                        {selectedSuperAdmin.organizationName || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-400">Member Since</p>
                      <p className="font-medium text-gray-800 flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDateTime(selectedSuperAdmin.createdAt)}
                      </p>
                    </div>
                    {selectedSuperAdmin.lastLogin && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-400">Last Login</p>
                        <p className="font-medium text-gray-800 flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          {formatDateTime(selectedSuperAdmin.lastLogin)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── Permissions ────────────────────────────────────────── */}
                {selectedSuperAdmin.permissions && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Lock size={16} className="text-amber-500" />
                      Permissions
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {PERMISSION_CATEGORIES.map((category) => {
                        const categoryPermissions = Object.entries(PERMISSION_LABELS)
                          .filter(([key]) => {
                            const perm = selectedSuperAdmin.permissions?.[key as keyof typeof selectedSuperAdmin.permissions];
                            return perm === true && key in PERMISSION_LABELS;
                          })
                          .filter(([, value]) => value.category === category);

                        if (categoryPermissions.length === 0) return null;

                        return (
                          <div key={category} className="mb-4 last:mb-0">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              {category}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {categoryPermissions.map(([key, { label, icon: Icon }]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"
                                >
                                  <Icon size={12} />
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── Quick Actions ──────────────────────────────────────── */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowViewDialog(false);
                      navigate(`/master-admin/super-admins/${selectedSuperAdmin._id}/edit`);
                    }}
                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center justify-center gap-2"
                  >
                    <Edit size={16} />
                    Edit Super Admin
                  </button>
                  <button
                    onClick={() => {
                      setShowViewDialog(false);
                      handleToggleStatus(selectedSuperAdmin);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                      selectedSuperAdmin.isActive
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {selectedSuperAdmin.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                    {selectedSuperAdmin.isActive ? 'Suspend' : 'Activate'}
                  </button>
                  <button
                    onClick={() => {
                      setShowViewDialog(false);
                      handleDelete(selectedSuperAdmin);
                    }}
                    className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Status Toggle Modal ────────────────────────────────────────── */}
      {showStatusModal && selectedSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${
                selectedSuperAdmin.isActive ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {selectedSuperAdmin.isActive ? (
                  <UserX size={24} className="text-red-500" />
                ) : (
                  <UserCheck size={24} className="text-green-500" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedSuperAdmin.isActive ? 'Suspend' : 'Activate'} Super Admin
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedSuperAdmin.firstName} {selectedSuperAdmin.lastName}
                </p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to {selectedSuperAdmin.isActive ? 'suspend' : 'activate'} this Super Admin?
              {selectedSuperAdmin.isActive && ' They will not be able to access the platform until reactivated.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedSuperAdmin(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleStatus}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
                  selectedSuperAdmin.isActive
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                } disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                {actionLoading ? 'Processing...' : (selectedSuperAdmin.isActive ? 'Suspend' : 'Activate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Modal ────────────────────────────────────────────────── */}
      {showDeleteModal && selectedSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Delete Super Admin</h3>
                <p className="text-sm text-gray-500">
                  {selectedSuperAdmin.firstName} {selectedSuperAdmin.lastName}
                </p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete this Super Admin? This action cannot be undone.
              All their data and permissions will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSuperAdmin(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}