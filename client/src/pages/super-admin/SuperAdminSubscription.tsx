// pages/super-admin/SuperAdminSubscription.tsx

import { useState, useEffect } from 'react';
import {
  Building2, CreditCard, Calendar, Users, Clock, CheckCircle,
  XCircle, AlertCircle, Loader2, RefreshCw, Download,
  Search, Filter, ChevronDown, ChevronUp, Eye, Edit,
  DollarSign, Package, Crown, Zap, Award, TrendingUp,
  Plus, Trash2, MoreVertical, Send, Mail, Phone
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import moment from 'moment';

// ─── Types ──────────────────────────────────────────────────────────────

interface Restaurant {
  _id: string;
  name: string;
  email: string;
  phone: string;
  subscription: {
    plan: string;
    status: 'active' | 'expired' | 'cancelled' | 'trial';
    startDate: string;
    endDate: string;
    autoRenew: boolean;
    features?: string[];
  };
  createdAt: string;
  isActive: boolean;
}

interface SubscriptionStats {
  totalRestaurants: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  popularPlan: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function SuperAdminSubscription() {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRestaurantDetails, setSelectedRestaurantDetails] = useState<Restaurant | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'endDate' | 'revenue'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Plans data
  const plans: Plan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 49,
      interval: 'monthly',
      features: ['Up to 10 branches', 'Basic analytics', 'Email support', '2 staff accounts'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 99,
      interval: 'monthly',
      features: ['Up to 50 branches', 'Advanced analytics', 'Priority support', '10 staff accounts', 'Bulk ordering'],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      interval: 'monthly',
      features: ['Unlimited branches', 'Custom analytics', '24/7 support', 'Unlimited staff', 'API access', 'Custom integrations'],
    },
  ];

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [restaurants, searchTerm, statusFilter, planFilter, sortBy, sortOrder]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/restaurants?limit=100');
      
      let restaurantsData = [];
      if (response.data?.data?.restaurants) {
        restaurantsData = response.data.data.restaurants;
      } else if (response.data?.data) {
        restaurantsData = Array.isArray(response.data.data) ? response.data.data : [];
      }

      // Ensure each restaurant has a subscription object
      restaurantsData = restaurantsData.map((r: any) => ({
        ...r,
        subscription: r.subscription || {
          plan: 'basic',
          status: 'trial',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          autoRenew: false,
        }
      }));

      setRestaurants(restaurantsData);
      calculateStats(restaurantsData);
    } catch (error: any) {
      console.error('Failed to fetch subscriptions:', error);
      toast.error(error.response?.data?.error || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Restaurant[]) => {
    const active = data.filter(r => r.subscription?.status === 'active');
    const expired = data.filter(r => r.subscription?.status === 'expired');
    const trial = data.filter(r => r.subscription?.status === 'trial');
    const cancelled = data.filter(r => r.subscription?.status === 'cancelled');

    // Count plans
    const planCount: Record<string, number> = {};
    data.forEach(r => {
      const plan = r.subscription?.plan || 'basic';
      planCount[plan] = (planCount[plan] || 0) + 1;
    });

    let popularPlan = 'basic';
    let maxCount = 0;
    Object.entries(planCount).forEach(([plan, count]) => {
      if (count > maxCount) {
        maxCount = count;
        popularPlan = plan;
      }
    });

    setStats({
      totalRestaurants: data.length,
      activeSubscriptions: active.length,
      expiredSubscriptions: expired.length,
      trialSubscriptions: trial.length,
      cancelledSubscriptions: cancelled.length,
      monthlyRevenue: active.length * 99, // Average monthly revenue
      yearlyRevenue: active.length * 99 * 12,
      popularPlan: popularPlan.charAt(0).toUpperCase() + popularPlan.slice(1),
    });
  };

  const applyFilters = () => {
    let filtered = [...restaurants];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.phone?.includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.subscription?.status === statusFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(r => r.subscription?.plan === planFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      let compareA, compareB;
      switch (sortBy) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'endDate':
          compareA = new Date(a.subscription?.endDate || 0).getTime();
          compareB = new Date(b.subscription?.endDate || 0).getTime();
          break;
        case 'revenue':
          compareA = a.subscription?.plan === 'enterprise' ? 199 : a.subscription?.plan === 'pro' ? 99 : 49;
          compareB = b.subscription?.plan === 'enterprise' ? 199 : b.subscription?.plan === 'pro' ? 99 : 49;
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

    setFilteredRestaurants(filtered);
  };

  const updateSubscription = async (restaurantId: string, data: any) => {
    try {
      const response = await api.put(`/super-admin/restaurants/${restaurantId}/subscription`, data);
      if (response.data.success) {
        toast.success('Subscription updated successfully');
        fetchSubscriptions();
        setShowPlanModal(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update subscription');
    }
  };

  const formatDate = (date: string) => {
    return moment(date).format('DD MMM YYYY');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      case 'trial':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'expired':
        return <XCircle className="w-4 h-4" />;
      case 'trial':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPlanPrice = (plan: string) => {
    const planData = plans.find(p => p.id === plan);
    return planData ? `$${planData.price}` : '$0';
  };

  const getPlanFeatures = (plan: string) => {
    const planData = plans.find(p => p.id === plan);
    return planData?.features || [];
  };

  if (loading && restaurants.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
            <p className="text-sm text-gray-500">Manage restaurant subscriptions and plans</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSubscriptions}
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

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6">
          <StatCard
            icon={Building2}
            title="Total Restaurants"
            value={stats.totalRestaurants.toString()}
            subtitle="Registered"
            iconColor="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={CheckCircle}
            title="Active"
            value={stats.activeSubscriptions.toString()}
            subtitle="Subscriptions"
            iconColor="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={AlertCircle}
            title="Trial"
            value={stats.trialSubscriptions.toString()}
            subtitle="In trial"
            iconColor="text-yellow-600"
            bgColor="bg-yellow-50"
          />
          <StatCard
            icon={XCircle}
            title="Expired"
            value={stats.expiredSubscriptions.toString()}
            subtitle="Need renewal"
            iconColor="text-red-600"
            bgColor="bg-red-50"
          />
          <StatCard
            icon={DollarSign}
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            subtitle="From subscriptions"
            iconColor="text-purple-600"
            bgColor="bg-purple-50"
          />
          <StatCard
            icon={Award}
            title="Popular Plan"
            value={stats.popularPlan}
            subtitle="Most used"
            iconColor="text-orange-600"
            bgColor="bg-orange-50"
          />
        </div>
      )}

      {/* ─── Filters ──────────────────────────────────────────────────── */}
      <div className="px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="name">Sort by Name</option>
              <option value="endDate">Sort by End Date</option>
              <option value="revenue">Sort by Revenue</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <span className="text-sm text-gray-500 ml-auto">
              {filteredRestaurants.length} restaurants
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto Renew</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>No restaurants found matching your filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{restaurant.name}</p>
                          <p className="text-xs text-gray-500">{restaurant.email || 'No email'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          restaurant.subscription?.plan === 'enterprise' 
                            ? 'bg-purple-100 text-purple-700'
                            : restaurant.subscription?.plan === 'pro'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {restaurant.subscription?.plan?.charAt(0).toUpperCase() + restaurant.subscription?.plan?.slice(1) || 'Basic'}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {getPlanPrice(restaurant.subscription?.plan || 'basic')}/mo
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(restaurant.subscription?.status || 'trial')}`}>
                          {getStatusIcon(restaurant.subscription?.status || 'trial')}
                          {restaurant.subscription?.status?.charAt(0).toUpperCase() + restaurant.subscription?.status?.slice(1) || 'Trial'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(restaurant.subscription?.startDate || restaurant.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {formatDate(restaurant.subscription?.endDate || '')}
                          {restaurant.subscription?.status === 'expired' && (
                            <span className="block text-xs text-red-500">Overdue</span>
                          )}
                          {restaurant.subscription?.status === 'active' && (
                            <span className="block text-xs text-green-500">
                              {Math.ceil((new Date(restaurant.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          restaurant.subscription?.autoRenew 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {restaurant.subscription?.autoRenew ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedRestaurantDetails(restaurant);
                              setShowDetailsModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRestaurant(restaurant._id);
                              setShowPlanModal(true);
                            }}
                            className="p-1 text-purple-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                            title="Change Plan"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Send renewal reminder to ${restaurant.name}?`)) {
                                toast.success(`Reminder sent to ${restaurant.name}`);
                              }
                            }}
                            className="p-1 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Send Reminder"
                          >
                            <Mail className="w-4 h-4" />
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
      </div>

      {/* ─── Change Plan Modal ───────────────────────────────────────── */}
      {showPlanModal && selectedRestaurant && (
        <ChangePlanModal
          restaurant={restaurants.find(r => r._id === selectedRestaurant)!}
          plans={plans}
          onClose={() => {
            setShowPlanModal(false);
            setSelectedRestaurant(null);
          }}
          onUpdate={updateSubscription}
        />
      )}

      {/* ─── Details Modal ───────────────────────────────────────────── */}
      {showDetailsModal && selectedRestaurantDetails && (
        <DetailsModal
          restaurant={selectedRestaurantDetails}
          plans={plans}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRestaurantDetails(null);
          }}
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

// ─── Change Plan Modal ────────────────────────────────────────────────
function ChangePlanModal({ restaurant, plans, onClose, onUpdate }: any) {
  const [selectedPlan, setSelectedPlan] = useState(restaurant.subscription?.plan || 'basic');
  const [autoRenew, setAutoRenew] = useState(restaurant.subscription?.autoRenew || false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onUpdate(restaurant._id, {
      plan: selectedPlan,
      autoRenew,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Change Subscription Plan</h2>
            <p className="text-sm text-gray-500">{restaurant.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {plans.map((plan: any) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${plan.popular ? 'relative' : ''}`}
              >
                {plan.popular && (
                  <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">${plan.price}</p>
                <p className="text-xs text-gray-500">/{plan.interval}</p>
                <ul className="mt-3 space-y-1">
                  {plan.features.slice(0, 3).map((feature: string, i: number) => (
                    <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="autoRenew"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <label htmlFor="autoRenew" className="text-sm text-gray-700">
              Enable Auto-Renewal
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Update Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Details Modal ─────────────────────────────────────────────────────
function DetailsModal({ restaurant, plans, onClose }: any) {
  const planDetails = plans.find((p: any) => p.id === restaurant.subscription?.plan);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{restaurant.name}</h2>
            <p className="text-sm text-gray-500">Subscription Details</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Restaurant Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{restaurant.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">{restaurant.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Subscription</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-medium text-gray-900 capitalize">{restaurant.subscription?.plan || 'Basic'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="font-medium text-gray-900">${planDetails?.price || 49}/mo</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(restaurant.subscription?.status || 'trial')}`}>
                  {getStatusIcon(restaurant.subscription?.status || 'trial')}
                  {restaurant.subscription?.status?.charAt(0).toUpperCase() + restaurant.subscription?.status?.slice(1) || 'Trial'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Auto Renew</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  restaurant.subscription?.autoRenew 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {restaurant.subscription?.autoRenew ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium text-gray-900">
                {formatDate(restaurant.subscription?.startDate || restaurant.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium text-gray-900">
                {formatDate(restaurant.subscription?.endDate || '')}
              </p>
            </div>
          </div>

          {/* Features */}
          {planDetails?.features && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Plan Features</h3>
              <div className="grid grid-cols-2 gap-2">
                {planDetails.features.map((feature: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

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

// ─── Helper Functions ──────────────────────────────────────────────────
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'expired':
      return 'bg-red-100 text-red-700';
    case 'trial':
      return 'bg-yellow-100 text-yellow-700';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="w-4 h-4" />;
    case 'expired':
      return <XCircle className="w-4 h-4" />;
    case 'trial':
      return <AlertCircle className="w-4 h-4" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

const formatDate = (date: string) => {
  return moment(date).format('DD MMM YYYY');
};