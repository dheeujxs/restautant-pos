// pages/super-admin/SuperAdminStaff.tsx - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, ChevronDown, ChevronUp,
  Eye, Loader2, RefreshCw, Download,
  Mail, Phone, Calendar, CheckCircle,
  XCircle, AlertCircle, Building2,
  UserCheck, UserX, UserMinus,
  X, Shield, Store, MapPin,
  Plus, Edit, Trash2
} from 'lucide-react';
import { superAdminMethods } from '../../services/api';
import toast from 'react-hot-toast';
import moment from 'moment';

// ─── Types ──────────────────────────────────────────────────────────────

interface StaffMember {
  _id: string;
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  employeeId: string;
  role: string;
  roles: string[];
  roleId: string | null;
  permissions: string[];
  canLoginKitchenPortal: boolean;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  restaurantName: string;
  branchId: string | null;
  branchName: string | null;
}

interface Branch {
  _id: string;
  name: string;
  restaurantId: string;
  restaurantName?: string;
  isActive?: boolean;
}

interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: Record<string, number>;
  byBranch: Record<string, number>;
}

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function SuperAdminStaff() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // UI State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);

  // ─── Fetch Staff ────────────────────────────────────────────────────────
  const fetchStaff = async () => {
    try {
      setLoading(true);
      
      const params: Record<string, string> = {};
      
      // ✅ Send branch filter to API
      if (branchFilter !== 'all') {
        params.branchId = branchFilter;
        console.log('📍 Filtering by branch:', branchFilter);
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }
      
      // Search is handled client-side for instant feedback
      // but we can also send it to API if needed
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      console.log('📤 Fetching staff with params:', params);
      
      const response = await superAdminMethods.getAllStaff(params);
      console.log('📥 Staff response:', response.data);
      
      let staffData = [];
      let statsData = null;
      
      if (response.data?.success) {
        staffData = response.data.data?.staff || [];
        statsData = response.data.data?.stats || null;
      }
      
      setStaff(staffData);
      
      // Calculate stats from filtered data
      if (statsData) {
        calculateStats(staffData, statsData);
      } else {
        calculateStats(staffData);
      }
    } catch (error: any) {
      console.error('Failed to fetch staff:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('superAdminToken');
        sessionStorage.removeItem('superAdminToken');
        navigate('/super-admin/login');
        return;
      }
      
      toast.error(error.response?.data?.error || 'Failed to load staff');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Roles ────────────────────────────────────────────────────────
  const fetchRoles = async () => {
    try {
      const response = await superAdminMethods.getStaffRoles();
      console.log('📥 Roles response:', response.data);
      
      if (response.data?.success) {
        setRoles(response.data.data || []);
        console.log('✅ Roles loaded:', response.data.data?.length);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  // ─── Fetch Branches ──────────────────────────────────────────────────
  const fetchBranches = async () => {
    try {
      const response = await superAdminMethods.getBranches({ limit: 100 });
      console.log('📥 Branches response:', response.data);
      
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
      toast.error('Failed to load branches');
    }
  };

  // ─── Calculate Stats ────────────────────────────────────────────────────
  const calculateStats = (staffData: StaffMember[], statsData?: any) => {
    const active = staffData.filter(s => s.status === 'active');
    const inactive = staffData.filter(s => s.status === 'inactive');
    const suspended = staffData.filter(s => s.status === 'suspended');

    const byRole: Record<string, number> = {};
    staffData.forEach(s => {
      const role = s.role || 'Unknown';
      byRole[role] = (byRole[role] || 0) + 1;
    });

    const byBranch: Record<string, number> = {};
    staffData.forEach(s => {
      const branch = s.branchName || 'All Branches';
      byBranch[branch] = (byBranch[branch] || 0) + 1;
    });

    setStats({
      total: staffData.length,
      active: active.length,
      inactive: inactive.length,
      suspended: suspended.length,
      byRole,
      byBranch,
    });
  };

  // ─── Apply Filters (Only search and sorting) ──────────────────────────
  const applyFilters = () => {
    let filtered = [...staff];

    // Search filter only (client-side for instant feedback)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.employeeId.toLowerCase().includes(term) ||
        s.phoneNumber.includes(term) ||
        s.email?.toLowerCase().includes(term)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let compareA, compareB;
      switch (sortBy) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'createdAt':
          compareA = new Date(a.createdAt).getTime();
          compareB = new Date(b.createdAt).getTime();
          break;
        case 'status':
          compareA = a.status;
          compareB = b.status;
          break;
        default:
          compareA = a.name;
          compareB = b.name;
      }
      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

    setFilteredStaff(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1);
  };

  // ─── Effects ────────────────────────────────────────────────────────────
  // Initial load
  useEffect(() => {
    fetchStaff();
    fetchRoles();
    fetchBranches();
  }, []);

  // ✅ Refetch when branch, status, or role filter changes
  useEffect(() => {
    fetchStaff();
  }, [branchFilter, statusFilter, roleFilter]);

  // ✅ Apply search and sorting when staff changes or search/sort changes
  useEffect(() => {
    applyFilters();
  }, [staff, searchTerm, sortBy, sortOrder]);

  // ─── UI Helpers ─────────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-yellow-100 text-yellow-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <AlertCircle className="w-4 h-4" />;
      case 'suspended': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    const roleMap: Record<string, string> = {
      'admin': 'bg-purple-100 text-purple-700',
      'manager': 'bg-blue-100 text-blue-700',
      'chef': 'bg-red-100 text-red-700',
      'cook': 'bg-orange-100 text-orange-700',
      'section_chef': 'bg-pink-100 text-pink-700',
      'kot_staff': 'bg-indigo-100 text-indigo-700',
      'cashier': 'bg-green-100 text-green-700',
      'waiter': 'bg-cyan-100 text-cyan-700',
      'helper': 'bg-gray-100 text-gray-700',
    };
    return roleMap[role?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (date: string) => {
    return moment(date).format('DD MMM YYYY');
  };

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleAddStaff = () => {
    navigate('/super-admin/staff/new');
  };

  const handleEdit = (staffId: string) => {
    navigate(`/super-admin/staff/${staffId}/edit`);
  };

  const handleDelete = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await superAdminMethods.deleteStaff(staffId);
      if (response.data.success) {
        toast.success(`Staff member ${staffName} deleted successfully!`);
        fetchStaff();
      }
    } catch (error: any) {
      console.error('Delete Error:', error.response?.data);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('superAdminToken');
        sessionStorage.removeItem('superAdminToken');
        navigate('/super-admin/login');
        return;
      }
      
      toast.error(error.response?.data?.error || 'Failed to delete staff');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  if (loading && staff.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  const paginatedStaff = filteredStaff.slice(
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
            <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-sm text-gray-500">
              View and manage all staff across all branches
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddStaff}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Staff
            </button>
            <button
              onClick={fetchStaff}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
          <StatCard
            icon={Users}
            title="Total Staff"
            value={stats.total.toString()}
            subtitle="All staff members"
            iconColor="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={UserCheck}
            title="Active"
            value={stats.active.toString()}
            subtitle="Currently active"
            iconColor="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={UserX}
            title="Inactive"
            value={stats.inactive.toString()}
            subtitle="Inactive accounts"
            iconColor="text-yellow-600"
            bgColor="bg-yellow-50"
          />
          <StatCard
            icon={UserMinus}
            title="Suspended"
            value={stats.suspended.toString()}
            subtitle="Suspended accounts"
            iconColor="text-red-600"
            bgColor="bg-red-50"
          />
        </div>
      )}

      {/* ─── Info Banner ──────────────────────────────────────────────── */}
      <div className="px-6 -mt-2">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>
            <strong>Super Admin Access:</strong> You can view, edit, and delete staff across all branches.
          </span>
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────── */}
      <div className="px-6 mt-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, ID, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role._id} value={role.name}>{role.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="name">Sort by Name</option>
              <option value="createdAt">Sort by Date</option>
              <option value="status">Sort by Status</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Active Branch Filter Display */}
            {branchFilter !== 'all' && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                📍 {branches.find(b => b._id === branchFilter)?.name || 'Selected Branch'}
              </span>
            )}

            <button
              onClick={() => {
                setBranchFilter('all');
                setStatusFilter('all');
                setRoleFilter('all');
                setSearchTerm('');
              }}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Clear All
            </button>

            <span className="text-sm text-gray-500 ml-auto">
              {filteredStaff.length} staff members
            </span>
          </div>
        </div>
      </div>

      {/* ─── Table ────────────────────────────────────────────────────── */}
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>No staff members found matching your filters</p>
                      <p className="text-sm mt-1 text-gray-400">
                        {staff.length > 0 ? 'Try adjusting your filters' : 'No staff members have been created yet'}
                      </p>
                      {branchFilter !== 'all' && (
                        <button
                          onClick={() => setBranchFilter('all')}
                          className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                        >
                          Clear branch filter
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedStaff.map((member) => (
                    <tr key={member._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-600">{member.employeeId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {member.roles?.length > 0 ? (
                            member.roles.slice(0, 2).map((role, index) => (
                              <span
                                key={index}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}
                              >
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                              {member.role || 'Unknown'}
                            </span>
                          )}
                          {member.roles?.length > 2 && (
                            <span className="px-1 py-0.5 rounded-full text-xs text-gray-500">
                              +{member.roles.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {member.branchName || 'All Branches'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {member.restaurantName || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                          {getStatusIcon(member.status)}
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedStaff(member);
                              setShowDetailsModal(true);
                            }}
                            className="p-1 text-purple-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(member._id)}
                            className="p-1 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Edit Staff"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member._id, member.name)}
                            className="p-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredStaff.length)} of {filteredStaff.length}
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
      </div>

      {/* ─── Details Modal ───────────────────────────────────────────── */}
      {showDetailsModal && selectedStaff && (
        <DetailsModal
          staff={selectedStaff}
          roles={roles}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedStaff(null);
          }}
          formatDate={formatDate}
          getRoleColor={getRoleColor}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          onEdit={handleEdit}
          onDelete={handleDelete}
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
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{title}</p>
        {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Details Modal ─────────────────────────────────────────────────────
function DetailsModal({ 
  staff, 
  roles, 
  onClose, 
  formatDate, 
  getRoleColor, 
  getStatusColor, 
  getStatusIcon,
  onEdit,
  onDelete 
}: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Staff Details</h2>
            <p className="text-sm text-gray-500">Complete staff information</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-2xl font-bold">
              {staff.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{staff.name}</h3>
              <p className="text-sm text-gray-500">{staff.employeeId}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(staff.status)}`}>
                {getStatusIcon(staff.status)}
                {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onClose();
                  onEdit(staff._id);
                }}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => {
                  onClose();
                  onDelete(staff._id, staff.name);
                }}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>

          {/* Branch & Restaurant Info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-sm text-gray-500">Branch</p>
              <p className="font-medium text-gray-900 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                {staff.branchName || 'All Branches'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Restaurant</p>
              <p className="font-medium text-gray-900 flex items-center gap-1">
                <Store className="w-4 h-4 text-gray-500" />
                {staff.restaurantName || 'N/A'}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">{staff.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{staff.email || 'Not provided'}</p>
            </div>
          </div>

          {/* Roles */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Roles</p>
            <div className="flex flex-wrap gap-2">
              {staff.roles?.length > 0 ? (
                staff.roles.map((role: string, index: number) => (
                  <span key={index} className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                    {role}
                  </span>
                ))
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(staff.role)}`}>
                  {staff.role || 'Unknown'}
                </span>
              )}
            </div>
          </div>

          {/* Permissions */}
          {staff.permissions?.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Permissions</p>
              <div className="flex flex-wrap gap-1">
                {staff.permissions.map((perm: string, index: number) => (
                  <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {perm.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Portal Access</p>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                staff.canLoginKitchenPortal 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {staff.canLoginKitchenPortal ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Joined</p>
              <p className="font-medium text-gray-900">{formatDate(staff.createdAt)}</p>
            </div>
          </div>

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