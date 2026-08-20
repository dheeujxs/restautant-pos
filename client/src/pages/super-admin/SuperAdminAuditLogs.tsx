// pages/super-admin/SuperAdminAuditLogs.tsx

import { useState, useEffect } from 'react';
import {
  ShieldCheck, Search, Filter, ChevronDown, ChevronUp,
  Eye, Loader2, RefreshCw, Download,
  Calendar, Clock, User, Building2,
  X, CheckCircle, AlertCircle, Info,
  Activity, Zap, Award, Star,
  Users, Store, CreditCard, FileText,
  Settings as SettingsIcon, LogOut,
  UserPlus, UserX, Edit, Trash2,
  Shield, Lock, Key, Globe,
  Mail, Phone, MapPin
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import moment from 'moment';

// ─── Types ──────────────────────────────────────────────────────────────

interface AuditLog {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  userEmail: string;
  action: string;
  module: string;
  description: string;
  details: any;
  ip: string;
  userAgent: string;
  status: 'success' | 'failed' | 'warning';
  createdAt: string;
}

interface AuditStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byModule: Record<string, number>;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function SuperAdminAuditLogs() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [sortBy, setSortBy] = useState<'createdAt' | 'userName' | 'module'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchAuditLogs();
  }, [dateRange]);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, moduleFilter, actionFilter, statusFilter, sortBy, sortOrder]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange !== 'all') {
        params.append('period', dateRange);
      }
      
      const response = await api.get(`/super-admin/audit?${params}`);
      
      let logData = [];
      let statsData = null;
      
      if (response.data?.success) {
        logData = response.data.data?.logs || [];
        statsData = response.data.data?.stats || null;
      }
      
      setLogs(logData);
      if (statsData) {
        setStats(statsData);
      } else {
        calculateStats(logData);
      }
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      toast.error(error.response?.data?.error || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logData: AuditLog[]) => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const byModule: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byStatus: Record<string, number> = { success: 0, failed: 0, warning: 0 };

    logData.forEach(log => {
      byModule[log.module] = (byModule[log.module] || 0) + 1;
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
    });

    setStats({
      total: logData.length,
      today: logData.filter(l => new Date(l.createdAt) >= todayStart).length,
      thisWeek: logData.filter(l => new Date(l.createdAt) >= weekStart).length,
      thisMonth: logData.filter(l => new Date(l.createdAt) >= monthStart).length,
      byModule,
      byAction,
      byStatus,
    });
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.userName?.toLowerCase().includes(term) ||
        l.userEmail?.toLowerCase().includes(term) ||
        l.action?.toLowerCase().includes(term) ||
        l.module?.toLowerCase().includes(term) ||
        l.description?.toLowerCase().includes(term)
      );
    }

    if (moduleFilter !== 'all') {
      filtered = filtered.filter(l => l.module === moduleFilter);
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(l => l.action === actionFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    filtered.sort((a, b) => {
      let compareA, compareB;
      switch (sortBy) {
        case 'createdAt':
          compareA = new Date(a.createdAt).getTime();
          compareB = new Date(b.createdAt).getTime();
          break;
        case 'userName':
          compareA = a.userName || '';
          compareB = b.userName || '';
          break;
        case 'module':
          compareA = a.module || '';
          compareB = b.module || '';
          break;
        default:
          compareA = new Date(a.createdAt).getTime();
          compareB = new Date(b.createdAt).getTime();
      }
      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

    setFilteredLogs(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getModuleIcon = (module: string) => {
    const icons: Record<string, any> = {
      'auth': Shield,
      'users': Users,
      'restaurants': Store,
      'payments': CreditCard,
      'orders': FileText,
      'settings': SettingsIcon,
      'staff': Users,
      'subscription': CreditCard,
    };
    return icons[module] || Activity;
  };

  const formatDate = (date: string) => {
    return moment(date).format('DD MMM YYYY, h:mm A');
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'login': 'bg-blue-100 text-blue-700',
      'logout': 'bg-gray-100 text-gray-700',
      'create': 'bg-green-100 text-green-700',
      'update': 'bg-yellow-100 text-yellow-700',
      'delete': 'bg-red-100 text-red-700',
      'assign': 'bg-purple-100 text-purple-700',
      'transfer': 'bg-indigo-100 text-indigo-700',
    };
    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  const paginatedLogs = filteredLogs.slice(
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
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500">
              Track all platform activities and security events
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAuditLogs}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
          <StatCard
            icon={Activity}
            title="Total Events"
            value={stats.total.toString()}
            subtitle="All time"
            iconColor="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={Calendar}
            title="Today"
            value={stats.today.toString()}
            subtitle="Events today"
            iconColor="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={Clock}
            title="This Week"
            value={stats.thisWeek.toString()}
            subtitle="Last 7 days"
            iconColor="text-purple-600"
            bgColor="bg-purple-50"
          />
          <StatCard
            icon={AlertCircle}
            title="This Month"
            value={stats.thisMonth.toString()}
            subtitle="Last 30 days"
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
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Modules</option>
              <option value="auth">Auth</option>
              <option value="users">Users</option>
              <option value="restaurants">Restaurants</option>
              <option value="payments">Payments</option>
              <option value="orders">Orders</option>
              <option value="staff">Staff</option>
              <option value="subscription">Subscription</option>
              <option value="settings">Settings</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="assign">Assign</option>
              <option value="transfer">Transfer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="createdAt">Sort by Date</option>
              <option value="userName">Sort by User</option>
              <option value="module">Sort by Module</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <span className="text-sm text-gray-500 ml-auto">
              {filteredLogs.length} logs
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>No audit logs found</p>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    const ModuleIcon = getModuleIcon(log.module);
                    return (
                      <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{log.userName || 'System'}</p>
                            <p className="text-xs text-gray-500">{log.userEmail}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ModuleIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600 capitalize">{log.module}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 max-w-xs truncate">{log.description}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                            {getStatusIcon(log.status)}
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDetailsModal(true);
                            }}
                            className="p-1 text-purple-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length}
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
      {showDetailsModal && selectedLog && (
        <AuditDetailsModal
          log={selectedLog}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLog(null);
          }}
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
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
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{title}</p>
        {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Audit Details Modal ──────────────────────────────────────────────
function AuditDetailsModal({ log, onClose, formatDate, getStatusColor, getStatusIcon }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Audit Log Details</h2>
            <p className="text-sm text-gray-500">{log._id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{log.action}</h3>
              <p className="text-sm text-gray-500 capitalize">{log.module}</p>
            </div>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(log.status)}`}>
              {getStatusIcon(log.status)}
              {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
            </span>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">User Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{log.userName || 'System'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{log.userEmail || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium text-gray-900">{log.userRole || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IP Address</p>
                <p className="font-medium text-gray-900">{log.ip || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Details</h4>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium text-gray-900">{log.description}</p>
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Additional Details</p>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium text-gray-900">{formatDate(log.createdAt)}</p>
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