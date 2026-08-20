// pages/super-admin/SuperAdminRestaurants.tsx - NO VERIFICATION (Master Admin handles it)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, Eye, Building2,
  CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, Filter,
  Store, MapPin, Phone, Mail, X,
  User, ShieldCheck, Hash,
  TrendingUp, Users, DollarSign, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminApi } from '../../services/api';

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
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  isActive: boolean;
  stats?: {
    totalOrders: number;
    totalRevenue: number;
    totalStaff: number;
    totalBranches: number;
  };
  branches?: any[];
  createdAt: string;
  updatedAt: string;
  restaurantId?: string;
}

export default function SuperAdminRestaurants() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // ─── Filter Restaurants ──────────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...restaurants];

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      filtered = filtered.filter(r =>
        r.name?.toLowerCase().includes(query) ||
        r.email?.toLowerCase().includes(query) ||
        r.phone?.includes(query) ||
        r.restaurantId?.toLowerCase().includes(query) ||
        r.businessType?.toLowerCase().includes(query) ||
        r.address?.city?.toLowerCase().includes(query) ||
        r.address?.state?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    setFilteredRestaurants(filtered);
  }, [search, statusFilter, restaurants]);

  // ─── Generate Formatted Restaurant ID ──────────────────────────────────
  const generateRestaurantId = (index: number, name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const num = String(index + 1).padStart(3, '0');
    return `${prefix}-${num}`;
  };

  // ─── Fetch Restaurants ──────────────────────────────────────────────────
  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      console.log('📤 Fetching restaurants...');
      
      const params: any = { limit: 100 };
      
      const response = await superAdminApi.get('/super-admin/restaurants', { params });
      
      console.log('📥 Full API Response:', response.data);
      
      let restaurantsData = [];
      
      if (response.data) {
        if (response.data.data?.restaurants) {
          restaurantsData = response.data.data.restaurants;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          restaurantsData = response.data.data;
        } else if (response.data.restaurants && Array.isArray(response.data.restaurants)) {
          restaurantsData = response.data.restaurants;
        } else if (Array.isArray(response.data)) {
          restaurantsData = response.data;
        } else if (response.data.success) {
          if (response.data.data?.restaurants) {
            restaurantsData = response.data.data.restaurants;
          } else if (response.data.data) {
            restaurantsData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          }
        }
      }
      
      const enrichedData = restaurantsData.map((r: any, index: number) => {
        const stats = r.stats || {};
        const branches = r.branches || [];
        
        const formattedId = r.restaurantId || generateRestaurantId(index, r.name || 'REST');
        
        return {
          ...r,
          _id: r._id || r.id || `temp_${Date.now()}_${Math.random()}`,
          restaurantId: formattedId,
          name: r.name || 'Unnamed Restaurant',
          email: r.email || 'N/A',
          phone: r.phone || 'N/A',
          status: r.status || 'pending',
          isActive: r.isActive !== undefined ? r.isActive : true,
          stats: {
            totalOrders: Number(stats.totalOrders) || Number(r.totalOrders) || 0,
            totalRevenue: Number(stats.totalRevenue) || Number(r.totalRevenue) || 0,
            totalStaff: Number(stats.totalStaff) || Number(r.totalStaff) || 0,
            totalBranches: Number(stats.totalBranches) || branches.length || 0,
          },
          branches: branches,
          address: r.address || { street: '', city: '', state: '', country: '', pincode: '' },
          owner: r.owner || { name: '', email: '', phone: '' },
          businessType: r.businessType || r.type || 'Restaurant',
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        };
      });
      
      setRestaurants(enrichedData);
      setFilteredRestaurants(enrichedData);
      
      if (enrichedData.length === 0) {
        toast('No restaurants found. Create your first restaurant!', { icon: 'ℹ️' });
      }
    } catch (error: any) {
      console.error('❌ Error fetching restaurants:', error);
      
      const errorMsg = error.response?.data?.error || 'Failed to load restaurants';
      toast.error(errorMsg);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('token');
        toast.error('Session expired. Please login again.');
        navigate('/super-admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id || id.startsWith('temp_')) {
      toast.error('Cannot delete temporary/unsaved restaurant');
      return;
    }
    
    try {
      const response = await superAdminApi.delete(`/super-admin/restaurants/${id}`);
      if (response.data?.success) {
        toast.success('Restaurant deleted successfully');
        await fetchRestaurants();
        setShowDeleteModal(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete restaurant');
    }
  };

  const handleView = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowViewModal(true);
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { color: string; icon: any }> = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      inactive: { color: 'bg-gray-100 text-gray-700', icon: XCircle },
      suspended: { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    };
    const s = styles[status?.toLowerCase()] || styles.pending;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>
        <Icon size={12} />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
      </span>
    );
  };

  const totalRestaurants = restaurants.length;
  const activeCount = restaurants.filter(r => r.status === 'active').length;
  const pendingCount = restaurants.filter(r => r.status === 'pending').length;
  const suspendedCount = restaurants.filter(r => r.status === 'suspended').length;

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 size={24} className="text-purple-500" />
            Restaurants
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {filteredRestaurants.length} of {totalRestaurants} restaurants found
          </p>
        </div>
        <button
          onClick={() => navigate('/super-admin/restaurants/new')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
        >
          <Plus size={18} />
          Add Restaurant
        </button>
      </div>

      {/* Stats Cards - Only Status Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-gray-800">{totalRestaurants}</p>
          <p className="text-xs text-gray-500">Total Restaurants</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-red-600">{suspendedCount}</p>
          <p className="text-xs text-gray-500">Suspended</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 relative min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, email, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition ${
              showFilters || statusFilter
                ? 'border-purple-400 bg-purple-50 text-purple-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {statusFilter && (
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            )}
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {(search || statusFilter) && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <X size={14} />
              Clear All
            </button>
          )}
          
          <button
            onClick={fetchRestaurants}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw size={18} className="text-gray-500" />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
        
        {(search || statusFilter) && (
          <div className="mt-2 text-xs text-gray-400">
            Found {filteredRestaurants.length} matching restaurants
          </div>
        )}
      </div>

      {/* Restaurants Table - No Verification Column */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Store size={48} className="text-gray-300" />
                      <p className="text-lg font-medium">No restaurants found</p>
                      <p className="text-sm">
                        {search || statusFilter 
                          ? 'Try adjusting your filters' 
                          : 'Click "Add Restaurant" to create your first one'}
                      </p>
                      {(search || statusFilter) && (
                        <button
                          onClick={clearAllFilters}
                          className="text-purple-500 hover:text-purple-600 text-sm font-medium"
                        >
                          Clear all filters
                        </button>
                      )}
                      <button
                        onClick={fetchRestaurants}
                        className="mt-2 text-purple-500 hover:text-purple-600 text-sm font-medium"
                      >
                        Refresh Data
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRestaurants.map((restaurant) => (
                  <tr key={restaurant._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          {restaurant.logo ? (
                            <img src={restaurant.logo} alt={restaurant.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Store size={18} className="text-purple-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{restaurant.name || 'Unnamed Restaurant'}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Hash size={10} />
                            {restaurant.restaurantId || 'No ID'}
                          </p>
                          <p className="text-xs text-gray-400">{restaurant.businessType || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail size={12} className="text-gray-400" />
                          {restaurant.email || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone size={12} className="text-gray-400" />
                          {restaurant.phone || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {getStatusBadge(restaurant.status)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="space-y-1 text-xs">
                        <p className="text-gray-600">Orders: <span className="font-medium">{restaurant.stats?.totalOrders || 0}</span></p>
                        <p className="text-gray-600">Revenue: <span className="font-medium">{formatCurrency(restaurant.stats?.totalRevenue || 0)}</span></p>
                        <p className="text-gray-600">Branches: <span className="font-medium">{restaurant.branches?.length || 0}</span></p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleView(restaurant)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/super-admin/restaurants/${restaurant._id}/edit`)}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition"
                          title="Edit Restaurant"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── View Details Modal ────────────────────────────────────────── */}
      {showViewModal && selectedRestaurant && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowViewModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="relative bg-white rounded-2xl max-w-4xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Building2 size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedRestaurant.name || 'Unnamed'}</h3>
                    <p className="text-purple-100 text-sm flex items-center gap-2">
                      <Hash size={12} />
                      ID: {selectedRestaurant.restaurantId || 'N/A'} 
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white/80 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-800">{selectedRestaurant.stats?.totalOrders || 0}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedRestaurant.stats?.totalRevenue || 0)}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedRestaurant.stats?.totalStaff || 0}</p>
                    <p className="text-xs text-gray-500">Staff</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{selectedRestaurant.branches?.length || 0}</p>
                    <p className="text-xs text-gray-500">Branches</p>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <MapPin size={16} className="text-blue-500" />
                      Address
                    </h4>
                    {selectedRestaurant.address ? (
                      <>
                        <p className="text-sm text-gray-600">{selectedRestaurant.address.street || 'N/A'}</p>
                        <p className="text-sm text-gray-600">
                          {selectedRestaurant.address.city || 'N/A'}, {selectedRestaurant.address.state || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedRestaurant.address.country || 'N/A'} - {selectedRestaurant.address.pincode || 'N/A'}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No address provided</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <User size={16} className="text-orange-500" />
                      Owner Details
                    </h4>
                    {selectedRestaurant.owner ? (
                      <>
                        <p className="text-sm font-medium text-gray-800">{selectedRestaurant.owner.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{selectedRestaurant.owner.email || 'N/A'}</p>
                        <p className="text-sm text-gray-600">{selectedRestaurant.owner.phone || 'N/A'}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No owner details provided</p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedRestaurant.status)}</div>
                </div>

                {/* Metadata */}
                <div className="bg-gray-50 rounded-xl p-4 mt-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500">Restaurant ID</p>
                      <p className="font-medium text-gray-700">{selectedRestaurant.restaurantId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Business Type</p>
                      <p className="font-medium text-gray-700 capitalize">{selectedRestaurant.businessType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Created At</p>
                      <p className="font-medium text-gray-700">{formatDate(selectedRestaurant.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-medium text-gray-700">{formatDate(selectedRestaurant.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - With Edit Button */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    navigate(`/super-admin/restaurants/${selectedRestaurant._id}/edit`);
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit Restaurant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Modal ──────────────────────────────────────────────── */}
      {showDeleteModal && selectedRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Restaurant</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong>{selectedRestaurant.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedRestaurant._id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}