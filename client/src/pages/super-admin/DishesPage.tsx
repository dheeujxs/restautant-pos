// pages/super-admin/DishesPage.tsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp,
  Store, Utensils, Coffee, Pizza, Salad, Cake,
  Loader2, RefreshCw, Edit, Trash, Eye,
  CheckCircle, XCircle, Clock, AlertCircle,
  ChefHat, Crown, Star, TrendingUp, DollarSign,
  Grid3x3, List, Package, Building2, MapPin
} from 'lucide-react';
import { useSuperAdminAuth } from '../../hooks/useSuperAdminAuth';
import toast from 'react-hot-toast';
import api from '../../services/api';
import moment from 'moment';

// ─── Types ──────────────────────────────────────────────────────────────

interface Dish {
  _id: string;
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  image: string;
  price: number;
  displayPrice: string;
  dietaryType: string;
  kotStation: string;
  isActive: boolean;
  hasVariants: boolean;
  variantCount: number;
  variants: any[];
  stockType: string;
  currentStock: number;
  prepTimeMinutes: number;
  restaurantId: string;
  restaurantName: string;
  branchId: string;
  branchName: string;
  createdAt: string;
  updatedAt: string;
}

interface Restaurant {
  _id: string;
  name: string;
  branches: { _id: string; name: string }[];
}

interface Category {
  _id: string;
  name: string;
}

interface DishStats {
  totalDishes: number;
  activeDishes: number;
  inactiveDishes: number;
  vegDishes: number;
  nonVegDishes: number;
  byCategory: { category: string; count: number }[];
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function DishesPage() {
  const navigate = useNavigate();
  const { admin } = useSuperAdminAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [filteredDishes, setFilteredDishes] = useState<Dish[]>([]);
  const [stats, setStats] = useState<DishStats | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<{ _id: string; name: string }[]>([]);

  // ─── Filters ──────────────────────────────────────────────────────────
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDietary, setSelectedDietary] = useState('all');
  const [selectedKotStation, setSelectedKotStation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ─── Pagination ──────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(20);

  const dietaryOptions = ['Veg', 'Non-veg', 'Vegan', 'Jain', 'Eggetarian'];
  const kotStations = ['Main Kitchen', 'Tandoor', 'Bar', 'Cold Kitchen', 'Bakery', 'Grill'];
  const statusOptions = ['all', 'active', 'inactive'];

  // ─── Fetch Data ──────────────────────────────────────────────────────

  const fetchRestaurants = async () => {
    try {
      const response = await api.get('/super-admin/restaurants?limit=100');
      let data = [];
      if (response.data?.data?.restaurants) {
        data = response.data.data.restaurants;
      } else if (response.data?.data) {
        data = Array.isArray(response.data.data) ? response.data.data : [];
      }
      setRestaurants(data);
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?limit=100');
      let data = [];
      if (response.data?.data?.categories) {
        data = response.data.data.categories;
      } else if (response.data?.data) {
        data = Array.isArray(response.data.data) ? response.data.data : [];
      }
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRestaurant !== 'all') {
        params.append('restaurantId', selectedRestaurant);
      }
      if (selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
      }
      if (selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory);
      }
      if (selectedDietary !== 'all') {
        params.append('dietaryType', selectedDietary);
      }
      if (selectedKotStation !== 'all') {
        params.append('kotStation', selectedKotStation);
      }
      if (selectedStatus !== 'all') {
        params.append('isActive', selectedStatus === 'active' ? 'true' : 'false');
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      params.append('page', String(page));
      params.append('limit', String(limit));

      const response = await api.get(`/super-admin/dishes?${params}`);

      if (response.data.success) {
        const data = response.data.data;
        setDishes(data.dishes || []);
        setFilteredDishes(data.dishes || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalItems(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch dishes:', error);
      toast.error('Failed to load dishes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurant, selectedBranch, selectedCategory, selectedDietary, selectedKotStation, selectedStatus, searchTerm, page, limit]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedRestaurant !== 'all') {
        params.append('restaurantId', selectedRestaurant);
      }
      if (selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
      }
      const response = await api.get(`/super-admin/dishes/stats?${params}`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [selectedRestaurant, selectedBranch]);

  // ─── Update branches when restaurant changes ────────────────────────
  useEffect(() => {
    if (selectedRestaurant !== 'all') {
      const restaurant = restaurants.find(r => r._id === selectedRestaurant);
      setBranches(restaurant?.branches || []);
    } else {
      setBranches([]);
    }
    setSelectedBranch('all');
  }, [selectedRestaurant, restaurants]);

  // ─── Initial fetch ──────────────────────────────────────────────────
  useEffect(() => {
    fetchRestaurants();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchDishes();
    fetchStats();
  }, [fetchDishes, fetchStats]);

  // ─── Refresh ────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDishes();
    fetchStats();
  };

  // ─── Reset filters ──────────────────────────────────────────────────
  const resetFilters = () => {
    setSelectedRestaurant('all');
    setSelectedBranch('all');
    setSelectedCategory('all');
    setSelectedDietary('all');
    setSelectedKotStation('all');
    setSelectedStatus('all');
    setSearchTerm('');
    setPage(1);
  };

  // ─── Get status badge ──────────────────────────────────────────────
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <CheckCircle size={12} /> Active
      </span>
    ) : (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle size={12} /> Inactive
      </span>
    );
  };

  // ─── Get dietary badge ─────────────────────────────────────────────
  const getDietaryBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Veg': 'bg-green-100 text-green-700',
      'Non-veg': 'bg-red-100 text-red-700',
      'Vegan': 'bg-emerald-100 text-emerald-700',
      'Jain': 'bg-yellow-100 text-yellow-700',
      'Eggetarian': 'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type}
      </span>
    );
  };

  // ─── Format date ────────────────────────────────────────────────────
  const formatDate = (dateString: string) => {
    return moment(dateString).format('DD MMM YYYY, h:mm A');
  };

  // ─── Loading state ──────────────────────────────────────────────────
  if (loading && dishes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading dishes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Dish Management</h1>
                <p className="text-sm text-gray-500">
                  Manage dishes across all restaurants and branches
                  {totalItems > 0 && <span className="font-medium text-gray-700"> · {totalItems} dishes</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => navigate('/super-admin/dishes/new')}
              className="flex items-center gap-2 px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition shadow-sm"
            >
              <Plus size={16} />
              <span>Add Dish</span>
            </button>
          </div>
        </div>

        {/* ─── Stats Cards ────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-800">{stats.totalDishes}</p>
              <p className="text-xs text-gray-500">Total Dishes</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-emerald-600">{stats.activeDishes}</p>
              <p className="text-xs text-gray-500">Active Dishes</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-red-600">{stats.inactiveDishes}</p>
              <p className="text-xs text-gray-500">Inactive Dishes</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-green-600">{stats.vegDishes}</p>
              <p className="text-xs text-gray-500">Veg Dishes</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-red-600">{stats.nonVegDishes}</p>
              <p className="text-xs text-gray-500">Non-Veg Dishes</p>
            </div>
          </div>
        )}

        {/* ─── Filters ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Restaurant Filter */}
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white min-w-[150px]"
            >
              <option value="all">🏢 All Restaurants</option>
              {restaurants.map(r => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white min-w-[150px]"
              disabled={selectedRestaurant === 'all'}
            >
              <option value="all">📍 All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Filter size={14} />
              Filters
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>

            {/* View toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 px-2.5 ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}
              >
                <Grid3x3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 px-2.5 ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Dietary Type</label>
                <select
                  value={selectedDietary}
                  onChange={(e) => setSelectedDietary(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                >
                  <option value="all">All Types</option>
                  {dietaryOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">KOT Station</label>
                <select
                  value={selectedKotStation}
                  onChange={(e) => setSelectedKotStation(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                >
                  <option value="all">All Stations</option>
                  {kotStations.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ─── Dishes Grid/List ────────────────────────────────────────── */}
        {dishes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Utensils size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">No dishes found</h3>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm ? 'Try adjusting your search or filters' : 'Start by adding your first dish'}
            </p>
            <button
              onClick={() => navigate('/super-admin/dishes/new')}
              className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Add Dish
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          // ─── Grid View ──────────────────────────────────────────────────
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dishes.map((dish) => (
              <div
                key={dish._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                {/* Image */}
                <div className="h-40 bg-gray-100 relative">
                  {dish.image ? (
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
                      <Utensils size={40} className="text-purple-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {getStatusBadge(dish.isActive)}
                  </div>
                  <div className="absolute bottom-2 left-2">
                    {getDietaryBadge(dish.dietaryType)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">{dish.name}</h3>
                    <span className="text-sm font-bold text-orange-500">
                      {dish.displayPrice}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1">{dish.description || 'No description'}</p>
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building2 size={12} />
                      {dish.restaurantName}
                    </span>
                    {dish.branchName && dish.branchName !== 'Main' && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {dish.branchName}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span className="px-2 py-0.5 rounded bg-gray-100">
                      {dish.kotStation}
                    </span>
                    {dish.hasVariants && (
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-600">
                        {dish.variantCount} variants
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {dish.prepTimeMinutes}m
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/super-admin/dishes/${dish._id}`)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      onClick={() => navigate(`/super-admin/dishes/${dish._id}/edit`)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${dish.name}"?`)) {
                          // Handle delete
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ─── List View ──────────────────────────────────────────────────
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dish</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Restaurant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dietary</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dishes.map((dish) => (
                  <tr key={dish._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {dish.image ? (
                            <img src={dish.image} alt={dish.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Utensils size={16} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{dish.name}</p>
                          <p className="text-xs text-gray-400">{dish.kotStation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{dish.restaurantName}</p>
                      <p className="text-xs text-gray-400">{dish.branchName}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{dish.categoryName}</td>
                    <td className="px-4 py-3 text-sm font-medium text-orange-500">{dish.displayPrice}</td>
                    <td className="px-4 py-3">{getDietaryBadge(dish.dietaryType)}</td>
                    <td className="px-4 py-3">{getStatusBadge(dish.isActive)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/super-admin/dishes/${dish._id}`)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/super-admin/dishes/${dish._id}/edit`)}
                          className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${dish.name}"?`)) {
                              // Handle delete
                            }
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination ────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} dishes
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page + i - Math.min(2, page - 1);
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 border rounded-lg text-sm ${
                      pageNum === page
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}