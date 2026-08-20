// StaffListPage.tsx - Updated with Employee ID and Permissions in View Modal

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { 
  Users, Plus, Search, Edit, Trash2, 
  Eye, CheckCircle, XCircle, Phone, Mail, Hash,
  ChefHat, Utensils, User, Shield, AlertCircle, X,
  Calendar, Briefcase, Key, Lock, Star, Award,
  MapPin, Building2, Store, Filter, RefreshCw,
  ShieldCheck, ListChecks
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IRoleDetails {
  _id: string;
  name: string;
  color: string;
  icon: string;
}

interface IStaff {
  _id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  employeeId: string;
  role: string;
  roleDetails?: IRoleDetails;
  canLoginKitchenPortal: boolean;
  status: 'active' | 'inactive' | 'suspended';
  restaurantId?: string;
  restaurantName?: string;
  branchId?: string;
  branchName?: string;
  permissions?: string[];  // ✅ Added permissions
  createdAt: string;
  updatedAt: string;
}

interface IUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  restaurantId?: string;
  restaurantName?: string;
  branchId?: string;
  branchName?: string;
  role: string;
}

const roleIcons: Record<string, any> = {
  chef: ChefHat,
  cook: Utensils,
  helper: User,
  section_chef: Shield,
  kot_staff: Eye,
  manager: Briefcase,
  admin: Shield,
  waiter: User,
  delivery_boy: User,
};

const roleColors: Record<string, string> = {
  chef: 'bg-purple-100 text-purple-800',
  cook: 'bg-blue-100 text-blue-800',
  helper: 'bg-gray-100 text-gray-800',
  section_chef: 'bg-indigo-100 text-indigo-800',
  kot_staff: 'bg-green-100 text-green-800',
  manager: 'bg-amber-100 text-amber-800',
  admin: 'bg-red-100 text-red-800',
  waiter: 'bg-teal-100 text-teal-800',
  delivery_boy: 'bg-cyan-100 text-cyan-800',
};

// ─── Permission Category Helper ────────────────────────────────────────────
function groupPermissionsByCategory(permissions: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  
  const categoryMap: Record<string, string[]> = {
    'Orders': ['view_live_orders', 'view_order_details', 'view_ready_orders', 'acknowledge_order', 'start_cooking', 'request_ready', 'approve_ready', 'reject_ready', 'complete_order', 'update_order_status'],
    'Recipes': ['view_recipes'],
    'KOT': ['view_kot', 'create_kot', 'update_kot', 'print_kot'],
    'Tables': ['view_tables', 'assign_table', 'request_bill'],
    'Bills & Payments': ['view_bills', 'view_payments', 'process_payment', 'issue_refund'],
    'Inventory': ['view_inventory', 'update_inventory'],
    'Staff': ['view_staff', 'manage_staff', 'view_roles', 'manage_roles'],
    'Reports': ['view_reports'],
    'POS': ['view_staff_pos'],
    'Salary': ['view_salary'],
    'Attendance': ['view_attendance'],
    'Delivery': ['view_delivery_dashboard', 'view_delivery_orders', 'accept_delivery_order', 'reject_delivery_order', 'view_delivery_order_details', 'update_delivery_status', 'mark_picked_up', 'mark_in_transit', 'mark_delivered', 'view_delivery_earnings', 'view_delivery_history', 'call_customer', 'navigate_to_location', 'toggle_availability']
  };
  
  const permToCategory: Record<string, string> = {};
  Object.entries(categoryMap).forEach(([category, perms]) => {
    perms.forEach(perm => {
      permToCategory[perm] = category;
    });
  });
  
  permissions.forEach(perm => {
    const category = permToCategory[perm] || 'Other';
    if (!categories[category]) categories[category] = [];
    categories[category].push(perm);
  });
  
  return categories;
}

function formatPermissionName(permission: string): string {
  return permission
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

export default function StaffListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const urlBranchId = searchParams.get('branchId');
  
  const [staff, setStaff] = useState<IStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState(urlBranchId || '');
  const [roles, setRoles] = useState<string[]>([]);
  
  // ─── Admin User Context ──────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [showBranchFilter, setShowBranchFilter] = useState(false);
  
  // View Modal State
  const [selectedStaff, setSelectedStaff] = useState<IStaff | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────────────────
  
  useEffect(() => {
    fetchCurrentUser();
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [searchTerm, roleFilter, statusFilter, branchFilter]);

  // ─── Get Current User (Admin) ──────────────────────────────────────
  const fetchCurrentUser = async () => {
    try {
      const response = await adminApi.get('/auth/profile');
      if (response.data.success) {
        const user = response.data.data || response.data.user;
        setCurrentUser(user);
        
        if (user?.branchId) {
          setShowBranchFilter(true);
          if (!branchFilter) {
            setBranchFilter(user.branchId);
          }
        }
        console.log('👤 Current Admin:', user?.firstName, 'Branch:', user?.branchName);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // ─── Fetch Staff (Admin endpoint) ──────────────────────────────────
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      if (branchFilter) {
        params.append('branchId', branchFilter);
        console.log('📍 Filtering staff by branch:', branchFilter);
      }
      
      const url = `/staff?${params.toString()}`;
      console.log('📤 Admin fetching staff from:', url);
      
      const response = await adminApi.get(url);
      console.log('📥 Staff API Response:', response.data);
      
      if (response.data.success) {
        let staffData = response.data.data;
        
        if (staffData && typeof staffData === 'object' && !Array.isArray(staffData)) {
          if (staffData.staff) {
            staffData = staffData.staff;
          } else if (staffData.staffList) {
            staffData = staffData.staffList;
          } else if (staffData.records) {
            staffData = staffData.records;
          } else if (staffData.results) {
            staffData = staffData.results;
          } else if (staffData.items) {
            staffData = staffData.items;
          } else if (Array.isArray(staffData)) {
            // Already an array
          } else if (staffData._id) {
            staffData = [staffData];
          } else {
            const arrayProps = Object.values(staffData).filter(val => Array.isArray(val));
            if (arrayProps.length > 0) {
              staffData = arrayProps[0];
            } else {
              staffData = [];
            }
          }
        }
        
        if (!Array.isArray(staffData)) {
          staffData = [];
        }
        
        console.log('✅ Staff data extracted:', staffData.length, 'members');
        setStaff(staffData);
      } else {
        setStaff([]);
      }
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      
      if (error.response?.status === 403 || error.response?.status === 401) {
        toast.error('You do not have permission to view staff. Please contact admin.');
      } else {
        toast.error('Failed to load staff data');
      }
      setStaff([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── Fetch Roles ──────────────────────────────────────────────────
  const fetchRoles = async () => {
    try {
      const response = await adminApi.get('/staff/roles/list');
      if (response.data.success) {
        const rolesData = response.data.data;
        if (Array.isArray(rolesData)) {
          setRoles(rolesData.map((r: any) => r.name || r));
        } else if (rolesData && typeof rolesData === 'object') {
          const roleArray = Object.values(rolesData).find(val => Array.isArray(val));
          if (roleArray) {
            setRoles(roleArray.map((r: any) => r.name || r));
          } else {
            setRoles([]);
          }
        } else {
          setRoles([]);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    }
  };

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    if (currentUser?.branchId) {
      setBranchFilter(currentUser.branchId);
    } else {
      setBranchFilter('');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await adminApi.delete(`/staff/${id}`);
        toast.success('Staff deleted successfully');
        fetchStaff();
      } catch (error: any) {
        if (error.response?.status === 403) {
          toast.error('You do not have permission to delete staff');
        } else {
          toast.error('Failed to delete staff');
        }
      }
    }
  };

  const handleView = (staff: IStaff) => {
    setSelectedStaff(staff);
    setShowViewModal(true);
  };

  // ─── Helper Functions ───────────────────────────────────────────────

  const getRoleIcon = (role: string) => {
    const Icon = roleIcons[role] || Users;
    return <Icon size={16} />;
  };

  const getRoleColor = (role: string) => {
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: JSX.Element }> = {
      active: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle size={12} />
      },
      inactive: {
        color: 'bg-red-100 text-red-800',
        icon: <XCircle size={12} />
      },
      suspended: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <AlertCircle size={12} />
      }
    };
    const cfg = config[status] || config.inactive;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        {cfg.icon}
        {status}
      </span>
    );
  };

  // ─── Filter & Stats ─────────────────────────────────────────────────

  const filteredStaff = Array.isArray(staff) ? staff.filter(s => {
    const matchesSearch = 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phoneNumber?.includes(searchTerm) ||
      s.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = !roleFilter || s.role === roleFilter;
    const matchesStatus = !statusFilter || s.status === statusFilter;
    const matchesBranch = !branchFilter || s.branchId === branchFilter;
    
    return matchesSearch && matchesRole && matchesStatus && matchesBranch;
  }) : [];

  const totalStaff = Array.isArray(staff) ? staff.length : 0;
  const activeStaff = Array.isArray(staff) ? staff.filter(s => s.status === 'active').length : 0;
  const inactiveStaff = Array.isArray(staff) ? staff.filter(s => s.status === 'inactive' || s.status === 'suspended').length : 0;
  const kitchenAccessStaff = Array.isArray(staff) ? staff.filter(s => s.canLoginKitchenPortal).length : 0;

  const hasFilters = searchTerm || roleFilter || statusFilter || branchFilter;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage kitchen and restaurant staff</p>
          {currentUser?.branchName && (
            <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
              <Building2 size={14} />
              Restaurant: {currentUser.restaurantName || 'Your Restaurant'}
              {currentUser.branchName && (
                <>
                  <span className="text-gray-300 mx-1">|</span>
                  <MapPin size={14} />
                  Branch: {currentUser.branchName}
                </>
              )}
            </p>
          )}
          {branchFilter && currentUser?.branchId && (
            <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
              <Filter size={14} />
              Filtering by branch
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/staff/new')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            <Plus size={18} />
            Add Staff
          </button>
        </div>
      </div>

      {/* ─── Stats Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900">{totalStaff}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeStaff}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-red-600">{inactiveStaff}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Kitchen Access</p>
          <p className="text-2xl font-bold text-blue-600">{kitchenAccessStaff}</p>
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          
          {/* Branch Filter - Only show if admin has branch */}
          {showBranchFilter && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">📍 All Branches</option>
              <option value={currentUser?.branchId || ''}>
                {currentUser?.branchName || 'My Branch'}
              </option>
            </select>
          )}
          
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">👤 All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">🔵 All Status</option>
            <option value="active">🟢 Active</option>
            <option value="inactive">🔴 Inactive</option>
            <option value="suspended">🟡 Suspended</option>
          </select>
        </div>
        
        {/* Reset Filters */}
        {hasFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleResetFilters}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              <X size={14} />
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* ─── Staff Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitchen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No staff members found</p>
                    <p className="text-sm mt-1">
                      {hasFilters ? 'Try adjusting your filters' : 'Start by adding your first staff member'}
                    </p>
                    {!hasFilters && (
                      <button
                        onClick={() => navigate('/staff/new')}
                        className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                      >
                        Add Staff Member
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staffMember) => (
                  <tr key={staffMember._id} className="hover:bg-gray-50 transition">
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users size={20} className="text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{staffMember.name}</p>
                          {staffMember.email && (
                            <p className="text-sm text-gray-500 truncate max-w-[150px]">{staffMember.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Employee ID */}
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                        {staffMember.employeeId}
                      </code>
                    </td>
                    
                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={14} className="flex-shrink-0" />
                        <span>{staffMember.phoneNumber}</span>
                      </div>
                    </td>
                    
                    {/* Branch */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        <MapPin size={14} className="flex-shrink-0" />
                        {staffMember.branchName || 'All Branches'}
                      </span>
                    </td>
                    
                    {/* Role */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(staffMember.role)}`}>
                        {getRoleIcon(staffMember.role)}
                        {staffMember.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    
                    {/* Kitchen Access */}
                    <td className="px-6 py-4">
                      {staffMember.canLoginKitchenPortal ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle size={14} /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                          <XCircle size={14} /> No
                        </span>
                      )}
                    </td>
                    
                    {/* Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(staffMember.status)}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(staffMember)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => navigate(`/staff/${staffMember._id}/edit`)}
                          className="p-1 text-orange-600 hover:bg-orange-50 rounded transition"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(staffMember._id, staffMember.name)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
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
        
        {/* Table Footer */}
        {filteredStaff.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
            <span>Showing {filteredStaff.length} of {totalStaff} staff members</span>
            {branchFilter && currentUser?.branchName && (
              <span className="text-orange-600">
                <MapPin size={14} className="inline mr-1" />
                Branch: {currentUser.branchName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── View Details Modal ───────────────────────────────────────── */}
      {showViewModal && selectedStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowViewModal(false)}></div>

            {/* Modal panel - Increased max-width for permissions */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Users size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Staff Details</h3>
                      <p className="text-orange-100 text-sm">Complete staff information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-white/80 hover:text-white transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                {/* Profile Section */}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-orange-600">
                      {selectedStaff.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{selectedStaff.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {getStatusBadge(selectedStaff.status)}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(selectedStaff.role)}`}>
                        {getRoleIcon(selectedStaff.role)}
                        {selectedStaff.role?.replace('_', ' ').toUpperCase() || 'Unknown'}
                      </span>
                      {selectedStaff.branchName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <MapPin size={12} />
                          {selectedStaff.branchName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Information Grid - Updated with Employee ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <InfoCard 
                    icon={Hash}
                    label="Employee ID"
                    value={selectedStaff.employeeId || 'N/A'}  // ✅ Show real Employee ID
                    color="#f97316"
                  />
                  <InfoCard 
                    icon={Phone}
                    label="Phone Number"
                    value={selectedStaff.phoneNumber || 'N/A'}
                    color="#10b981"
                  />
                  <InfoCard 
                    icon={Mail}
                    label="Email Address"
                    value={selectedStaff.email || 'Not provided'}
                    color="#3b82f6"
                  />
                  <InfoCard 
                    icon={Store}
                    label="Restaurant"
                    value={selectedStaff.restaurantName || 'N/A'}
                    color="#8b5cf6"
                  />
                  <InfoCard 
                    icon={MapPin}
                    label="Branch"
                    value={selectedStaff.branchName || 'All Branches'}
                    color="#f97316"
                  />
                  <InfoCard 
                    icon={Key}
                    label="Kitchen Portal Access"
                    value={selectedStaff.canLoginKitchenPortal ? '✅ Allowed' : '❌ Denied'}
                    color={selectedStaff.canLoginKitchenPortal ? '#10b981' : '#ef4444'}
                  />
                  <InfoCard 
                    icon={Briefcase}
                    label="Role"
                    value={selectedStaff.role?.replace('_', ' ').toUpperCase() || 'Unknown'}
                    color="#8b5cf6"
                  />
                  <InfoCard 
                    icon={Calendar}
                    label="Joined Date"
                    value={formatDate(selectedStaff.createdAt)}
                    color="#6b7280"
                  />
                </div>

                {/* ✅ NEW: Permissions Section */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-orange-500" />
                    Permissions
                    {selectedStaff.permissions && selectedStaff.permissions.length > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        {selectedStaff.permissions.length} permissions
                      </span>
                    )}
                  </h4>
                  
                  {selectedStaff.permissions && selectedStaff.permissions.length > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {(() => {
                        const groupedPerms = groupPermissionsByCategory(selectedStaff.permissions);
                        return (
                          <div className="space-y-3">
                            {Object.entries(groupedPerms).map(([category, perms]) => (
                              <div key={category}>
                                <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                  {category}
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {perms.map(perm => (
                                    <span 
                                      key={perm}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-md text-xs font-medium text-gray-700 border border-gray-200 shadow-sm"
                                    >
                                      <CheckCircle size={10} className="text-green-500" />
                                      {formatPermissionName(perm)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500 border border-gray-200">
                      <ListChecks size={20} className="mx-auto text-gray-400 mb-2" />
                      No permissions assigned to this staff member.
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Award size={14} className="text-orange-500" />
                    Additional Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-medium text-gray-800">{formatDate(selectedStaff.updatedAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">MongoDB ID</p>
                      <p className="font-medium text-gray-800 font-mono text-xs">{selectedStaff._id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    navigate(`/staff/${selectedStaff._id}/edit`);
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
                >
                  <Edit size={16} />
                  Edit Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Info Card Component ──────────────────────────────────────────────

function InfoCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon size={16} color={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{value || 'N/A'}</p>
      </div>
    </div>
  );
}