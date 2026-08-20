// pages/super-admin/SuperAdminAdmins.tsx - FIXED BRANCH FILTERING

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Edit, Trash, Eye, X, Filter,
  User, Mail, Phone, Building2, Store,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  CheckCircle, XCircle, Clock, RefreshCw, MoreVertical,
  Shield, Crown, UserCog, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminApi } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isAdmin: boolean;
  isActive: boolean;
  restaurantId: string | null;
  restaurantName: string;
  branchId: string | null;
  branchName: string;
  profileImage?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  _id: string;
  name: string;
  restaurantId: string;
  restaurantName?: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
  inactive: { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
};

const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  const status = isActive ? 'active' : 'inactive';
  const style = statusColors[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      background: style.bg, color: style.text,
      fontSize: 12, fontWeight: 500
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.dot }} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

const RoleBadge = ({ role }: { role: string }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    superadmin: { bg: '#ede9fe', text: '#7c3aed' },
    admin: { bg: '#dbeafe', text: '#2563eb' },
    waiter: { bg: '#fce7f3', text: '#db2777' },
    kitchen: { bg: '#fef3c7', text: '#d97706' },
    cashier: { bg: '#d1fae5', text: '#065f46' },
    user: { bg: '#f3f4f6', text: '#4b5563' },
  };
  const style = colors[role?.toLowerCase()] || colors.user;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 12,
      background: style.bg, color: style.text,
      fontSize: 11, fontWeight: 500,
    }}>
      {role || 'User'}
    </span>
  );
};

const inputBase: React.CSSProperties = {
  height: 40, width: '100%', boxSizing: 'border-box',
  border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '0 12px', fontSize: 14,
  background: '#fff', color: '#111827', outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminAdmins() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // ─── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ─── Modal State ────────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAdmins();
    fetchAllBranches();
  }, []);

  // ─── Fetch All Branches ──────────────────────────────────────────────────
  const fetchAllBranches = async () => {
    try {
      const response = await superAdminApi.get('/super-admin/branches?limit=1000');
      if (response.data.success) {
        let branchesData = [];
        if (response.data.data?.branches) {
          branchesData = response.data.data.branches;
        } else if (response.data.data) {
          branchesData = Array.isArray(response.data.data) ? response.data.data : [];
        }
        setBranches(branchesData);
        console.log(`✅ Found ${branchesData.length} branches`);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      setBranches([]);
    }
  };

  // ─── Fetch Admins ─────────────────────────────────────────────────────────
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      
      // Build query params - only status, role, search (NO branch filter in API)
      const params = new URLSearchParams();
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      }
      
      if (roleFilter && roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      
      if (search) {
        params.append('search', search);
      }
      
      const url = `/super-admin/admins${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('📤 Fetching admins with URL:', url);
      
      const response = await superAdminApi.get(url);
      
      if (response.data.success) {
        let adminsData = [];
        if (response.data.data) {
          adminsData = Array.isArray(response.data.data) ? response.data.data : [];
        }
        console.log(`✅ Found ${adminsData.length} admins`);
        setAdmins(adminsData);
        setFilteredAdmins(adminsData);
      }
    } catch (error: any) {
      console.error('Fetch admins error:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch admins');
      setAdmins([]);
      setFilteredAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Filter Logic (Client-side) ──────────────────────────────────────────
  useEffect(() => {
    let filtered = [...admins];
    
    // Search filter
    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(admin =>
        admin.firstName?.toLowerCase().includes(query) ||
        admin.lastName?.toLowerCase().includes(query) ||
        admin.email?.toLowerCase().includes(query) ||
        admin.phone?.includes(query) ||
        admin.branchName?.toLowerCase().includes(query) ||
        admin.restaurantName?.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(admin => 
        statusFilter === 'active' ? admin.isActive : !admin.isActive
      );
    }
    
    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(admin => admin.role === roleFilter);
    }
    
    // ✅ Branch filter - Client-side filtering
    if (branchFilter && branchFilter !== 'all') {
      filtered = filtered.filter(admin => {
        // Match if admin's branchId equals selected branch
        // Also match if admin has no branch (null) but we want to show "All Branches" admins
        if (admin.branchId === null) {
          // Show "All Branches" admins only when 'all' is selected
          return branchFilter === 'all';
        }
        return admin.branchId === branchFilter;
      });
    }
    
    setFilteredAdmins(filtered);
    setCurrentPage(1);
  }, [search, statusFilter, roleFilter, branchFilter, admins]);

  // ─── Handle Branch Filter Change ──────────────────────────────────────────
  const handleBranchFilterChange = (value: string) => {
    setBranchFilter(value);
    // Don't refetch from API, just filter client-side
  };

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentAdmins = filteredAdmins.slice(startIndex, startIndex + itemsPerPage);

  // ─── Delete Admin ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedAdmin) return;
    
    setDeleting(true);
    try {
      await superAdminApi.delete(`/super-admin/admins/${selectedAdmin._id}`);
      toast.success('Admin deleted successfully');
      setShowDeleteModal(false);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete admin');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Get full name ─────────────────────────────────────────────────────────
  const getFullName = (admin: AdminUser) => {
    return `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Unknown';
  };

  // ─── Clear all filters ─────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRoleFilter('all');
    setBranchFilter('all');
    setCurrentPage(1);
    toast.success('Filters cleared');
    // Refetch admins without filters
    fetchAdmins();
  };

  // ─── Check if any filters are active ─────────────────────────────────────
  const hasActiveFilters = search || statusFilter !== 'all' || roleFilter !== 'all' || branchFilter !== 'all';

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading && admins.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
          <p style={{ marginTop: 16, color: '#6b7280' }}>Loading admins...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
        .card-hover { transition: all 0.2s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
      `}</style>

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} color="#8b5cf6" />
            Branch Admins
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {filteredAdmins.length} of {admins.length} admins • {branches.length} branches
            {hasActiveFilters && <span style={{ color: '#8b5cf6', marginLeft: 8 }}>(filtered)</span>}
          </p>
        </div>
        <button
          onClick={() => navigate('/super-admin/admins/new')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '0 20px', height: 38,
            borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
          }}
        >
          <Plus size={16} /> Assign Admin
        </button>
      </div>

      {/* ─── Filters ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputBase, paddingLeft: 36 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); fetchAdmins(); }}
          style={{ ...inputBase, width: 'auto', minWidth: 140, appearance: 'none', cursor: 'pointer', paddingRight: 32 }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); fetchAdmins(); }}
          style={{ ...inputBase, width: 'auto', minWidth: 140, appearance: 'none', cursor: 'pointer', paddingRight: 32 }}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
          <option value="waiter">Waiter</option>
          <option value="kitchen">Kitchen</option>
          <option value="cashier">Cashier</option>
        </select>
        
        {/* ✅ ONLY BRANCH FILTER - Client-side filtering */}
        <select
          value={branchFilter}
          onChange={(e) => handleBranchFilterChange(e.target.value)}
          style={{ ...inputBase, width: 'auto', minWidth: 180, appearance: 'none', cursor: 'pointer', paddingRight: 32 }}
        >
          <option value="all">📍 All Branches</option>
          {branches.map(b => (
            <option key={b._id} value={b._id}>
              {b.name} {b.restaurantName ? `(${b.restaurantName})` : ''}
            </option>
          ))}
        </select>

        <button
          onClick={fetchAdmins}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 16px', height: 40,
            borderRadius: 8, border: '1px solid #e5e7eb',
            background: '#fff', color: '#6b7280',
            fontSize: 13, cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} /> Refresh
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 16px', height: 40,
              borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fef2f2', color: '#dc2626',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <X size={15} /> Clear Filters
          </button>
        )}
      </div>

      {/* ─── Stats ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 16px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', padding: '10px 18px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Total Admins</span>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>{admins.length}</p>
        </div>
        <div style={{ background: '#fff', padding: '10px 18px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Active</span>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#10b981', margin: 0 }}>
            {admins.filter(a => a.isActive).length}
          </p>
        </div>
        <div style={{ background: '#fff', padding: '10px 18px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Inactive</span>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', margin: 0 }}>
            {admins.filter(a => !a.isActive).length}
          </p>
        </div>
        {branchFilter !== 'all' && (
          <div style={{ background: '#f5f3ff', padding: '10px 18px', borderRadius: 8, border: '1px solid #8b5cf6' }}>
            <span style={{ fontSize: 12, color: '#8b5cf6' }}>Filtered Results</span>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed', margin: 0 }}>{filteredAdmins.length}</p>
          </div>
        )}
      </div>

      {/* ─── Admin List ────────────────────────────────────────────────────── */}
      {filteredAdmins.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', margin: '0 24px', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <User size={48} style={{ margin: '0 auto', opacity: 0.2 }} />
          <h3 style={{ fontSize: 16, color: '#6b7280', marginTop: 16 }}>No admins found</h3>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Assign your first branch admin'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{ marginTop: 12, color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: '0 24px' }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Admin
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Contact
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Restaurant
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Branch
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Role
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentAdmins.map((admin) => (
                    <tr key={admin._id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div>
                          <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>
                            {getFullName(admin)}
                          </p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                            ID: {admin._id.slice(-8)}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                            <Mail size={13} /> {admin.email}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                            <Phone size={13} /> {admin.phone}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Building2 size={15} style={{ color: '#9ca3af' }} />
                          <span style={{ fontSize: 13, color: '#374151' }}>
                            {admin.restaurantName || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={15} style={{ color: '#9ca3af' }} />
                          <span style={{ fontSize: 13, color: '#374151' }}>
                            {admin.branchName || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <RoleBadge role={admin.role} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge isActive={admin.isActive} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => navigate(`/super-admin/admins/${admin._id}/edit`)}
                            style={{
                              padding: '6px 12px', borderRadius: 6,
                              border: '1px solid #e5e7eb', background: '#fff',
                              color: '#6b7280', fontSize: 12, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowDeleteModal(true);
                            }}
                            style={{
                              padding: '6px 12px', borderRadius: 6,
                              border: '1px solid #fecaca', background: '#fef2f2',
                              color: '#dc2626', fontSize: 12, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <Trash size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAdmins.length)} of {filteredAdmins.length}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '4px 10px', borderRadius: 6,
                      border: '1px solid #e5e7eb', background: '#fff',
                      color: currentPage === 1 ? '#d1d5db' : '#6b7280',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '4px 10px', color: '#8b5cf6', fontWeight: 600 }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '4px 10px', borderRadius: 6,
                      border: '1px solid #e5e7eb', background: '#fff',
                      color: currentPage === totalPages ? '#d1d5db' : '#6b7280',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Delete Modal ──────────────────────────────────────────────────── */}
      {showDeleteModal && selectedAdmin && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }} onClick={() => !deleting && setShowDeleteModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px',
            maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#fef2f2', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto',
              }}>
                <AlertCircle size={24} color="#dc2626" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '12px 0 4px' }}>
                Delete Admin
              </h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Are you sure you want to delete <strong>"{getFullName(selectedAdmin)}"</strong>?<br />
                This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  padding: '0 20px', height: 38,
                  borderRadius: 8, border: '1px solid #e5e7eb',
                  background: '#fff', color: '#6b7280',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '0 24px', height: 38,
                  borderRadius: 8, border: 'none',
                  background: '#dc2626', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {deleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash size={16} />}
                {deleting ? 'Deleting...' : 'Delete Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}