// pages/admin/AdminAttendance.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, AlertCircle, Calendar,
  User, Users, Loader2, RefreshCw, Search,
  Filter, ChevronDown, ChevronUp, Eye, FileText,
  TrendingUp, Award, Zap, UserCheck, UserX,
  Download, Printer, Check, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../services/api';

interface AttendanceRecord {
  _id: string;
  staffId: {
    _id: string;
    name: string;
    employeeId: string;
    role: string;
    phoneNumber: string;
  };
  staffName: string;
  employeeId: string;
  date: string;
  punchIn: { time: string; location?: string; notes?: string };
  punchOut?: { time: string; location?: string; notes?: string };
  status: 'pending' | 'approved' | 'rejected';
  totalHours: number;
  overtime: number;
  isLate: boolean;
  lateMinutes: number;
  rejectionReason?: string;
  notes?: string;
  approvedByName?: string;
  approvedAt?: string;
}

interface Stats {
  today: {
    total: number;
    punchedIn: number;
    punchedOut: number;
    late: number;
    pending: number;
    approved: number;
  };
  month: {
    totalDays: number;
    totalHours: number;
    totalOvertime: number;
  };
  pendingApprovals: number;
  pendingRecords: AttendanceRecord[];
}

export default function AdminAttendance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStats();
    const interval = setInterval(() => {
      fetchData();
      fetchStats();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

// pages/admin/AdminAttendance.tsx - Update fetchData function

const fetchData = async () => {
  setLoading(true);
  try {
    const adminToken = localStorage.getItem('token');
    console.log('📤 Fetching attendance data...');
    console.log('🔑 Admin token exists:', !!adminToken);
    
    const response = await adminApi.get('/attendance/admin/all', {
      params: {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        staffId: staffFilter !== 'all' ? staffFilter : undefined,
        limit: 100,
      },
    });
    
    console.log('📋 Response:', response.data);
    
    if (response.data.success) {
      const records = response.data.data.records || [];
      const staffList = response.data.data.staffList || [];
      
      console.log(`✅ Found ${records.length} attendance records`);
      console.log(`⏳ Pending: ${records.filter((r: any) => r.status === 'pending').length}`);
      
      setRecords(records);
      setStaffList(staffList);
    }
  } catch (error: any) {
    console.error('❌ Error fetching attendance:', error);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      navigate('/login');
    } else if (error.response?.status === 403) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
    } else {
      toast.error('Failed to load attendance data');
    }
  } finally {
    setLoading(false);
  }
};

  const fetchStats = async () => {
    try {
      const response = await adminApi.get('/attendance/admin/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(true);
    try {
      const response = await adminApi.patch(`/attendance/admin/${id}/status`, {
        status: 'approved',
      });
      if (response.data.success) {
        toast.success('Attendance approved');
        fetchData();
        fetchStats();
        setShowModal(false);
      }
    } catch (error) {
      toast.error('Failed to approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setProcessing(true);
    try {
      const response = await adminApi.patch(`/attendance/admin/${id}/status`, {
        status: 'rejected',
        rejectionReason,
      });
      if (response.data.success) {
        toast.success('Attendance rejected');
        fetchData();
        fetchStats();
        setShowModal(false);
        setRejectionReason('');
      }
    } catch (error) {
      toast.error('Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">✅ Approved</span>;
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">⏳ Pending</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">❌ Rejected</span>;
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDuration = (hours: number) => {
    if (!hours) return '0h';
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.staffId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.staffId?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={24} className="text-orange-500" />
              Attendance Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage staff attendance and approve punch requests
            </p>
          </div>
          <button
            onClick={() => { fetchData(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-gray-800">{stats?.today.total || 0}</p>
            <p className="text-xs text-gray-500">Today's Staff</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
            <p className="text-2xl font-bold text-green-600">{stats?.today.punchedIn || 0}</p>
            <p className="text-xs text-gray-500">Punched In</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
            <p className="text-2xl font-bold text-blue-600">{stats?.today.punchedOut || 0}</p>
            <p className="text-xs text-gray-500">Punched Out</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-100">
            <p className="text-2xl font-bold text-yellow-600">{stats?.pendingApprovals || 0}</p>
            <p className="text-xs text-gray-500">Pending Approvals</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
            <p className="text-2xl font-bold text-purple-600">{formatDuration(stats?.month.totalHours || 0)}</p>
            <p className="text-xs text-gray-500">Month Hours</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
            <p className="text-2xl font-bold text-red-600">{stats?.today.late || 0}</p>
            <p className="text-xs text-gray-500">Late Today</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Filter size={14} />
              Filters
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          {showFilters && (
            <div className="border-t border-gray-100 p-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-gray-500 mb-1 block">Staff</label>
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="all">All Staff</option>
                  {staffList.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name} ({staff.employeeId})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-gray-500" />
              Attendance Records ({filteredRecords.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Punch In</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Punch Out</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-sm text-gray-600">{record.staffId?.name || record.staffName}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{record.employeeId}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{formatDate(record.date)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {formatTime(record.punchIn.time)}
                        {record.isLate && <span className="ml-1 text-xs text-red-500">(Late {record.lateMinutes}m)</span>}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{record.punchOut ? formatTime(record.punchOut.time) : '-'}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800">{formatDuration(record.totalHours)}</td>
                      <td className="px-4 py-2">{getStatusBadge(record.status)}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowModal(true);
                            setRejectionReason('');
                          }}
                          className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Attendance Details</h3>
                  <p className="text-sm text-gray-500">{selectedRecord.staffId?.name} - {selectedRecord.employeeId}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400">Date</p>
                  <p className="font-medium">{formatDate(selectedRecord.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  {getStatusBadge(selectedRecord.status)}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Punch In</p>
                  <p className="font-medium">{formatTime(selectedRecord.punchIn.time)}</p>
                  {selectedRecord.punchIn.location && (
                    <p className="text-xs text-gray-400">📍 {selectedRecord.punchIn.location}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Punch Out</p>
                  <p className="font-medium">{selectedRecord.punchOut ? formatTime(selectedRecord.punchOut.time) : '-'}</p>
                  {selectedRecord.punchOut?.location && (
                    <p className="text-xs text-gray-400">📍 {selectedRecord.punchOut.location}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Hours</p>
                  <p className="font-medium">{formatDuration(selectedRecord.totalHours)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Overtime</p>
                  <p className="font-medium text-orange-600">{selectedRecord.overtime > 0 ? formatDuration(selectedRecord.overtime) : '0h'}</p>
                </div>
                {selectedRecord.isLate && (
                  <div className="col-span-2">
                    <p className="text-xs text-red-500">⚠️ Late by {selectedRecord.lateMinutes} minutes</p>
                  </div>
                )}
                {selectedRecord.rejectionReason && (
                  <div className="col-span-2">
                    <p className="text-xs text-red-500">Rejection Reason: {selectedRecord.rejectionReason}</p>
                  </div>
                )}
                {selectedRecord.approvedByName && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Approved by {selectedRecord.approvedByName} at {selectedRecord.approvedAt ? formatTime(selectedRecord.approvedAt) : ''}</p>
                  </div>
                )}
              </div>

              {selectedRecord.status === 'pending' && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Approve or Reject</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Rejection Reason (if rejecting)</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Provide a reason for rejection..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 min-h-[60px]"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedRecord._id)}
                        disabled={processing}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                      >
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(selectedRecord._id)}
                        disabled={processing}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
                      >
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}