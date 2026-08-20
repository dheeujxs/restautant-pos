// pages/staff-portal/StaffAttendance.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, AlertCircle, Calendar,
  LogIn, LogOut, Loader2, RefreshCw, User, TrendingUp,
  Award, Zap, UserCheck, UserX, MapPin, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import { staffStorage } from '../../utils/storage';

interface AttendanceRecord {
  _id: string;
  staffId: string;
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
}

interface TodayStatus {
  punchedIn: boolean;
  punchedOut: boolean;
  status: 'pending' | 'approved' | 'rejected' | null;
  punchInTime: string | null;
  punchOutTime: string | null;
  totalHours: number;
  isLate: boolean;
  lateMinutes: number;
}

export default function StaffAttendance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [summary, setSummary] = useState({
    totalDays: 0,
    presentDays: 0,
    approvedDays: 0,
    pendingDays: 0,
    totalHours: 0,
    totalOvertime: 0,
    lateDays: 0,
  });
  const [isPunchingIn, setIsPunchingIn] = useState(false);
  const [isPunchingOut, setIsPunchingOut] = useState(false);
  const [punchLocation, setPunchLocation] = useState('');
  const [punchNotes, setPunchNotes] = useState('');
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [punchType, setPunchType] = useState<'in' | 'out'>('in');

  useEffect(() => {
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await staffApi.get('/attendance/staff/my');
      if (response.data.success) {
        const data = response.data.data;
        setRecords(data.records || []);
        setSummary(data.summary || {});
        setTodayStatus(data.today || null);
      }
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/staff-portal/login');
      } else {
        toast.error('Failed to load attendance');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePunchIn = async () => {
    setIsPunchingIn(true);
    try {
      const response = await staffApi.post('/attendance/staff/punch-in', {
        location: punchLocation || 'Office',
        notes: punchNotes || '',
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setPunchLocation('');
        setPunchNotes('');
        setShowPunchModal(false);
        fetchAttendance();
      }
    } catch (error: any) {
      console.error('Error punching in:', error);
      if (error.response?.data?.data) {
        // Already punched in
        toast.arguments(error.response.data.error);
        fetchAttendance();
      } else {
        toast.error(error.response?.data?.error || 'Failed to punch in');
      }
    } finally {
      setIsPunchingIn(false);
    }
  };

  const handlePunchOut = async () => {
    setIsPunchingOut(true);
    try {
      const response = await staffApi.post('/attendance/staff/punch-out', {
        location: punchLocation || 'Office',
        notes: punchNotes || '',
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setPunchLocation('');
        setPunchNotes('');
        setShowPunchModal(false);
        fetchAttendance();
      }
    } catch (error: any) {
      console.error('Error punching out:', error);
      toast.error(error.response?.data?.error || 'Failed to punch out');
    } finally {
      setIsPunchingOut(false);
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
              <Clock size={24} className="text-orange-500" />
              My Attendance
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Track your daily attendance and manage punch in/out
            </p>
          </div>
          <button
            onClick={fetchAttendance}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Today's Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Today's Status</h2>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            {todayStatus?.status && getStatusBadge(todayStatus.status)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Punch In</p>
              <p className="text-lg font-bold text-gray-800">
                {todayStatus?.punchedIn ? formatTime(todayStatus.punchInTime!) : '--:--'}
              </p>
              {todayStatus?.isLate && todayStatus.punchedIn && (
                <p className="text-xs text-red-500">⚠️ Late by {todayStatus.lateMinutes} min</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Punch Out</p>
              <p className="text-lg font-bold text-gray-800">
                {todayStatus?.punchedOut ? formatTime(todayStatus.punchOutTime!) : '--:--'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Hours</p>
              <p className="text-lg font-bold text-gray-800">
                {todayStatus?.totalHours ? formatDuration(todayStatus.totalHours) : '0h'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Status</p>
              <div className="mt-1">
                {todayStatus?.punchedIn ? (
                  todayStatus.punchedOut ? (
                    <span className="text-sm font-medium text-green-600">✅ Completed</span>
                  ) : (
                    <span className="text-sm font-medium text-yellow-600">🟡 In Progress</span>
                  )
                ) : (
                  <span className="text-sm font-medium text-gray-400">❌ Not Started</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {!todayStatus?.punchedIn ? (
              <button
                onClick={() => {
                  setPunchType('in');
                  setShowPunchModal(true);
                }}
                className="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
              >
                <LogIn size={18} />
                Punch In
              </button>
            ) : !todayStatus?.punchedOut ? (
              <button
                onClick={() => {
                  setPunchType('out');
                  setShowPunchModal(true);
                }}
                className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2"
              >
                <LogOut size={18} />
                Punch Out
              </button>
            ) : (
              <button
                disabled
                className="px-6 py-2.5 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle size={18} />
                Completed
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-gray-800">{summary.totalDays}</p>
            <p className="text-xs text-gray-500">Total Days</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
            <p className="text-2xl font-bold text-green-600">{summary.presentDays}</p>
            <p className="text-xs text-gray-500">Present</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
            <p className="text-2xl font-bold text-blue-600">{summary.approvedDays}</p>
            <p className="text-xs text-gray-500">Approved</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-100">
            <p className="text-2xl font-bold text-yellow-600">{summary.pendingDays}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
            <p className="text-2xl font-bold text-purple-600">{formatDuration(summary.totalHours)}</p>
            <p className="text-xs text-gray-500">Total Hours</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
            <p className="text-2xl font-bold text-orange-600">{formatDuration(summary.totalOvertime)}</p>
            <p className="text-xs text-gray-500">Overtime</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
            <p className="text-2xl font-bold text-red-600">{summary.lateDays}</p>
            <p className="text-xs text-gray-500">Late Days</p>
          </div>
        </div>

        {/* Attendance Records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              Attendance History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Punch In</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Punch Out</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-sm text-gray-600">{formatDate(record.date)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{formatTime(record.punchIn.time)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{record.punchOut ? formatTime(record.punchOut.time) : '-'}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800">{formatDuration(record.totalHours)}</td>
                      <td className="px-4 py-2 text-sm text-orange-600">{record.overtime > 0 ? formatDuration(record.overtime) : '-'}</td>
                      <td className="px-4 py-2">
                        {getStatusBadge(record.status)}
                        {record.isLate && record.status !== 'rejected' && (
                          <span className="ml-1 text-xs text-red-500">(Late {record.lateMinutes}m)</span>
                        )}
                        {record.rejectionReason && (
                          <p className="text-xs text-red-400 mt-1">Reason: {record.rejectionReason}</p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Punch Modal */}
      {showPunchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowPunchModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {punchType === 'in' ? '🔵 Punch In' : '🔴 Punch Out'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {punchType === 'in' ? 'Start your work day' : 'End your work day'}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Location</label>
                  <input
                    type="text"
                    value={punchLocation}
                    onChange={(e) => setPunchLocation(e.target.value)}
                    placeholder="e.g., Office, Home, Client site"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Notes (optional)</label>
                  <textarea
                    value={punchNotes}
                    onChange={(e) => setPunchNotes(e.target.value)}
                    placeholder="Any notes about your punch..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 min-h-[60px]"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPunchModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={punchType === 'in' ? handlePunchIn : handlePunchOut}
                  disabled={isPunchingIn || isPunchingOut}
                  className={`flex-1 px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 ${
                    punchType === 'in'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  } disabled:opacity-50`}
                >
                  {(isPunchingIn || isPunchingOut) ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    punchType === 'in' ? <LogIn size={16} /> : <LogOut size={16} />
                  )}
                  {punchType === 'in' ? 'Punch In' : 'Punch Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}