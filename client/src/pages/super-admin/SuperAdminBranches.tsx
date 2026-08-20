// pages/super-admin/SuperAdminBranches.tsx - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Edit, Trash, Eye, X, Filter,
  MapPin, Phone, Mail, User, Building2, Store,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  CheckCircle, XCircle, Clock, RefreshCw, MoreVertical,
  LayoutGrid, List
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminApi } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Branch {
  _id: string;
  restaurantId: string;
  restaurantName?: string;
  name: string;
  code?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  phone: string;
  email: string;
  managerId?: string;
  managerName?: string;
  openingDate?: string;
  isMainBranch: boolean;
  workingHours?: any;
  features?: any;
  stats: {
    totalTables: number;
    totalEmployees: number;
    totalOrders: number;
  };
  status: 'active' | 'inactive' | 'suspended';
  isActive: boolean;
  fullAddress?: string;
  createdAt: string;
  updatedAt: string;
}

interface Restaurant {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
  inactive: { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
  suspended: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const style = statusColors[status?.toLowerCase()] || statusColors.active;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      background: style.bg, color: style.text,
      fontSize: 12, fontWeight: 500
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.dot }} />
      {status || 'Active'}
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
export default function SuperAdminBranches() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantMap, setRestaurantMap] = useState<Map<string, string>>(new Map());
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  
  // ─── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const itemsPerPage = 9;

  // ─── Modal State ────────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const fetchBranches = async () => {
    try {
      setLoading(true);
      console.log('📋 [SuperAdminBranches] Fetching branches...');
      
      // ✅ Fetch branches directly
      const response = await superAdminApi.get('/super-admin/branches?limit=100');
      console.log('📋 [SuperAdminBranches] Response:', response.data);
      
      if (response.data?.success) {
        let branchesData = response.data.data?.branches || [];
        console.log(`✅ Found ${branchesData.length} branches`);
        
        // ✅ Also fetch restaurants to map names
        const restaurantsRes = await superAdminApi.get('/super-admin/restaurants?limit=100');
        let restaurantMapData = new Map<string, string>();
        
        if (restaurantsRes.data?.success) {
          const restaurantList = restaurantsRes.data.data?.restaurants || [];
          restaurantList.forEach((r: any) => {
            restaurantMapData.set(r._id, r.name);
          });
          setRestaurants(restaurantList);
          setRestaurantMap(restaurantMapData);
          console.log(`📍 Loaded ${restaurantList.length} restaurants`);
        }
        
        // ✅ Enrich branches with restaurant names
        const enrichedBranches = branchesData.map((branch: any) => {
          // Get restaurant name from various sources
          let restaurantName = branch.restaurantName || 'Unknown Restaurant';
          
          // If restaurantId is populated with name
          if (branch.restaurantId && typeof branch.restaurantId === 'object' && branch.restaurantId.name) {
            restaurantName = branch.restaurantId.name;
          }
          // If restaurantId is a string, look it up in the map
          else if (branch.restaurantId && restaurantMapData.has(branch.restaurantId.toString())) {
            restaurantName = restaurantMapData.get(branch.restaurantId.toString()) || 'Unknown Restaurant';
          }
          
          return {
            ...branch,
            restaurantName: restaurantName,
            stats: {
              totalOrders: branch.stats?.totalOrders || 0,
              totalEmployees: branch.stats?.totalEmployees || 0,
              totalTables: branch.stats?.totalTables || 0,
            },
            status: branch.status || (branch.isActive ? 'active' : 'inactive'),
          };
        });
        
        console.log('📋 Enriched branches:', enrichedBranches);
        setAllBranches(enrichedBranches);
        setFilteredBranches(enrichedBranches);
      } else {
        console.error('❌ Failed to fetch branches:', response.data);
        toast.error('Failed to load branches');
      }
    } catch (error: any) {
      console.error('❌ Error fetching branches:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch branches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── Initial Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBranches();
  }, []);

  // ─── Filter Logic ──────────────────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...allBranches];
    
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      filtered = filtered.filter(branch =>
        branch.name?.toLowerCase().includes(query) ||
        branch.restaurantName?.toLowerCase().includes(query) ||
        branch.address?.city?.toLowerCase().includes(query) ||
        branch.address?.state?.toLowerCase().includes(query) ||
        branch.phone?.includes(query) ||
        branch.email?.toLowerCase().includes(query) ||
        branch.code?.toLowerCase().includes(query) ||
        branch.managerName?.toLowerCase().includes(query) ||
        branch.address?.street?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(branch => {
        const branchStatus = branch.status || (branch.isActive ? 'active' : 'inactive');
        return branchStatus === statusFilter;
      });
    }
    
    setFilteredBranches(filtered);
    setCurrentPage(1);
  }, [search, statusFilter, allBranches]);

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentBranches = filteredBranches.slice(startIndex, startIndex + itemsPerPage);

  // ─── Delete Branch ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedBranch) return;
    
    setDeleting(true);
    try {
      await superAdminApi.delete(`/super-admin/branches/${selectedBranch._id}`);
      toast.success('Branch deleted successfully');
      setShowDeleteModal(false);
      await fetchBranches();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete branch');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Handle Edit Navigation ────────────────────────────────────────────────
  const handleEditBranch = (branchId: string) => {
    navigate(`/super-admin/branches/${branchId}/edit`);
  };

  // ─── Clear Filters ──────────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    toast.success('Filters cleared');
  };

  // ─── Refresh Data ──────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBranches();
    toast.success('Data refreshed');
  };

  // ─── Check if any filters are active ──────────────────────────────────────
  const hasActiveFilters = search || statusFilter !== 'all';

  // ─── Get restaurant name by ID ─────────────────────────────────────────────
  const getRestaurantName = (restaurantId: string) => {
    if (!restaurantId) return 'Unknown Restaurant';
    return restaurantMap.get(restaurantId) || 'Unknown Restaurant';
  };

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
          <p style={{ marginTop: 16, color: '#6b7280' }}>Loading branches...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
        .branch-card { transition: all 0.2s ease; }
        .branch-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
      `}</style>

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={24} color="#8b5cf6" />
            Manage Branches
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {filteredBranches.length} of {allBranches.length} branches
            {hasActiveFilters && <span style={{ color: '#8b5cf6', marginLeft: 8 }}>(filtered)</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 10px',
                background: viewMode === 'grid' ? '#8b5cf6' : '#fff',
                color: viewMode === 'grid' ? '#fff' : '#6b7280',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 10px',
                background: viewMode === 'list' ? '#8b5cf6' : '#fff',
                color: viewMode === 'list' ? '#fff' : '#6b7280',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 16px', height: 38,
              borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', color: '#6b7280',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/super-admin/branches/new')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 20px', height: 38,
              borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
            }}
          >
            <Plus size={16} /> Add Branch
          </button>
        </div>
      </div>

      {/* ─── Filters ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search branches, cities, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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
          onChange={e => setStatusFilter(e.target.value)}
          style={{ 
            ...inputBase, 
            width: 'auto', 
            minWidth: 140, 
            appearance: 'none', 
            cursor: 'pointer', 
            paddingRight: 32,
            borderColor: statusFilter !== 'all' ? '#8b5cf6' : '#e5e7eb',
            background: statusFilter !== 'all' ? '#f5f3ff' : '#fff',
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>

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
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Total Branches</span>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>{allBranches.length}</p>
        </div>
        <div style={{ background: '#fff', padding: '10px 18px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Active</span>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#10b981', margin: 0 }}>
            {allBranches.filter(b => b.status === 'active' || b.isActive === true).length}
          </p>
        </div>
        <div style={{ background: '#fff', padding: '10px 18px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Inactive</span>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', margin: 0 }}>
            {allBranches.filter(b => b.status === 'inactive' || b.status === 'suspended' || b.isActive === false).length}
          </p>
        </div>
      </div>

      {/* ─── Branch List ────────────────────────────────────────────────────── */}
      {filteredBranches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', margin: '0 24px', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <MapPin size={48} style={{ margin: '0 auto', opacity: 0.2 }} />
          <h3 style={{ fontSize: 16, color: '#6b7280', marginTop: 16 }}>No branches found</h3>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>
            {hasActiveFilters ? 'Try adjusting your filters' : 'Add branches to your restaurants to see them here'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        // ─── Grid View ──────────────────────────────────────────────────────
        <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {currentBranches.map((branch) => (
            <div key={branch._id} className="branch-card" style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
                    {branch.name}
                    {branch.isMainBranch && (
                      <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 600, color: '#8b5cf6', background: '#ede9fe', padding: '1px 8px', borderRadius: 4 }}>
                        MAIN
                      </span>
                    )}
                  </h4>
                  <p style={{ fontSize: 12, color: '#8b5cf6', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Store size={12} />
                    {branch.restaurantName || getRestaurantName(branch.restaurantId)}
                  </p>
                </div>
                <StatusBadge status={branch.status || (branch.isActive ? 'active' : 'inactive')} />
              </div>

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {branch.code && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#9ca3af' }}>
                    <span style={{ fontWeight: 600 }}>Code:</span>
                    <span style={{ fontFamily: 'monospace' }}>{branch.code}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
                  <MapPin size={14} />
                  <span>{branch.address?.city || 'N/A'}, {branch.address?.state || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
                  <Phone size={14} />
                  <span>{branch.phone || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
                  <Mail size={14} />
                  <span>{branch.email || 'N/A'}</span>
                </div>
                {branch.managerName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
                    <User size={14} />
                    <span>Manager: {branch.managerName}</span>
                  </div>
                )}
              </div>

              <div style={{ padding: '10px 16px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#9ca3af' }}>
                  <span>Orders: <strong style={{ color: '#374151' }}>{branch.stats?.totalOrders || 0}</strong></span>
                  <span>Tables: <strong style={{ color: '#374151' }}>{branch.stats?.totalTables || 0}</strong></span>
                  <span>Staff: <strong style={{ color: '#374151' }}>{branch.stats?.totalEmployees || 0}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleEditBranch(branch._id)}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Edit size={13} /> Edit
                  </button>
                  <button
                    onClick={() => { setSelectedBranch(branch); setShowDeleteModal(true); }}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Trash size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // ─── List View ──────────────────────────────────────────────────────
        <div style={{ padding: '0 24px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Branch</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Restaurant</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Contact</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Location</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Orders</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Tables</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Staff</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentBranches.map((branch, index) => (
                <tr key={branch._id} style={{ borderBottom: index < currentBranches.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{branch.name}</p>
                      {branch.code && <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, fontFamily: 'monospace' }}>{branch.code}</p>}
                      {branch.isMainBranch && <span style={{ fontSize: 9, color: '#8b5cf6', background: '#ede9fe', padding: '1px 6px', borderRadius: 3 }}>MAIN</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>
                    {branch.restaurantName || getRestaurantName(branch.restaurantId)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      <div>{branch.phone || 'N/A'}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{branch.email || 'N/A'}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: '#6b7280' }}>
                    {branch.address?.city || 'N/A'}, {branch.address?.state || 'N/A'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    {branch.stats?.totalOrders || 0}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    {branch.stats?.totalTables || 0}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    {branch.stats?.totalEmployees || 0}
                  </td>
                  <td>
                    <StatusBadge status={branch.status || (branch.isActive ? 'active' : 'inactive')} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleEditBranch(branch._id)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 11, cursor: 'pointer' }}
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => { setSelectedBranch(branch); setShowDeleteModal(true); }}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ padding: '20px 24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredBranches.length)} of {filteredBranches.length} branches
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: currentPage === 1 ? '#d1d5db' : '#6b7280', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: pageNum === currentPage ? 'none' : '1px solid #e5e7eb',
                    background: pageNum === currentPage ? '#8b5cf6' : '#fff',
                    color: pageNum === currentPage ? '#fff' : '#6b7280',
                    cursor: 'pointer',
                    fontWeight: pageNum === currentPage ? 600 : 400,
                    minWidth: 32,
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: currentPage === totalPages ? '#d1d5db' : '#6b7280', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Delete Modal ──────────────────────────────────────────────────── */}
      {showDeleteModal && selectedBranch && (
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
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '12px 0 4px' }}>Delete Branch</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Are you sure you want to delete <strong>"{selectedBranch.name}"</strong>?<br />
                This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{ padding: '0 20px', height: 38, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '0 24px', height: 38, borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {deleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash size={16} />}
                {deleting ? 'Deleting...' : 'Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}