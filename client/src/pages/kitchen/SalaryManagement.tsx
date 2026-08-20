import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Users, Search, Filter, Calendar,
  Loader2, RefreshCw, Plus, Eye, Edit,
  CheckCircle, XCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, Download, Printer,
  User, Phone, Mail, IndianRupee, FileText,
  TrendingUp, TrendingDown, Award, Crown,
  Settings, Bell, Menu, ChevronRight,
  DollarSignIcon, FileDown, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';
import { adminStorage } from '../../utils/storage';

interface StaffMember {
  _id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  employeeId: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  profileImage?: string;
}

interface SalaryRecord {
  _id: string;
  staffId: string;
  staffName: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  paymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidBy?: string;
  paidAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface SalaryStats {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

export default function SalaryManagement() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [filteredSalaries, setFilteredSalaries] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SalaryStats>({
    total: 0,
    pending: 0,
    approved: 0,
    paid: 0,
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>('all');
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth());
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSalarySlipModal, setShowSalarySlipModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ─── Pagination ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // ─── Create Salary Form State ────────────────────────────────────────
  const [formData, setFormData] = useState({
    staffId: '',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    baseSalary: 0,
    bonuses: 0,
    deductions: 0,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [monthFilter, yearFilter]);

  useEffect(() => {
    filterSalaries();
  }, [salaries, searchTerm, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // No manual token check needed — adminApi's interceptor attaches the
      // token from adminStorage automatically. If there's no valid session,
      // these requests will 401 and the catch block below handles it.

      // Fetch all staff
      const staffRes = await adminApi.get('/staff');

      console.log('Staff API Response:', staffRes.data);

      if (staffRes.data.success) {
        // ✅ FIX: Extract staff data properly
        let staffData = staffRes.data.data || [];

        // Handle different response formats
        if (!Array.isArray(staffData)) {
          if (staffData.staff && Array.isArray(staffData.staff)) {
            staffData = staffData.staff;
          } else if (staffData.users && Array.isArray(staffData.users)) {
            staffData = staffData.users;
          } else if (staffData.items && Array.isArray(staffData.items)) {
            staffData = staffData.items;
          } else {
            staffData = [];
          }
        }

        setStaff(staffData.filter((s: StaffMember) => s.status === 'active'));
      }

      // Fetch salaries with filters
      const salaryRes = await adminApi.get('/salaries', {
        params: { month: monthFilter + 1, year: yearFilter },
      });

      console.log('Salary API Response:', salaryRes.data);

      if (salaryRes.data.success) {
        let salaryData = salaryRes.data.data || [];

        if (!Array.isArray(salaryData)) {
          if (salaryData.salaries && Array.isArray(salaryData.salaries)) {
            salaryData = salaryData.salaries;
          } else if (salaryData.records && Array.isArray(salaryData.records)) {
            salaryData = salaryData.records;
          } else if (salaryData.items && Array.isArray(salaryData.items)) {
            salaryData = salaryData.items;
          } else if (salaryData.data && Array.isArray(salaryData.data)) {
            salaryData = salaryData.data;
          } else if (salaryData._id) {
            salaryData = [salaryData];
          } else {
            const arrayProps = Object.values(salaryData).filter(val => Array.isArray(val));
            if (arrayProps.length > 0) {
              salaryData = arrayProps[0];
            } else {
              salaryData = [];
            }
          }
        }

        if (!Array.isArray(salaryData)) {
          salaryData = [];
        }

        setSalaries(salaryData);

        // Calculate stats
        const total = salaryData.length;
        const pending = salaryData.filter((s: SalaryRecord) => s.status === 'pending').length;
        const approved = salaryData.filter((s: SalaryRecord) => s.status === 'approved').length;
        const paid = salaryData.filter((s: SalaryRecord) => s.status === 'paid').length;
        const totalAmount = salaryData.reduce((sum: number, s: SalaryRecord) => sum + (s.netSalary || 0), 0);
        const pendingAmount = salaryData
          .filter((s: SalaryRecord) => s.status === 'pending')
          .reduce((sum: number, s: SalaryRecord) => sum + (s.netSalary || 0), 0);
        const paidAmount = salaryData
          .filter((s: SalaryRecord) => s.status === 'paid')
          .reduce((sum: number, s: SalaryRecord) => sum + (s.netSalary || 0), 0);

        setStats({ total, pending, approved, paid, totalAmount, pendingAmount, paidAmount });
      } else {
        setSalaries([]);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        adminStorage.clear();
        navigate('/login');
        return;
      }

      toast.error(error.response?.data?.error || 'Failed to load data');
      setSalaries([]);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const filterSalaries = () => {
    const salaryArray = Array.isArray(salaries) ? salaries : [];

    let filtered = [...salaryArray];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        (s.staffName?.toLowerCase() || '').includes(term) ||
        (s.employeeId?.toLowerCase() || '').includes(term) ||
        s._id.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    setFilteredSalaries(filtered);
    setCurrentPage(1);
  };

  // ─── Pagination Logic ──────────────────────────────────────────────────
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSalaries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSalaries.length / itemsPerPage);

  const handleCreateSalary = async () => {
    if (!formData.staffId) {
      toast.error('Please select a staff member');
      return;
    }
    if (formData.baseSalary <= 0) {
      toast.error('Base salary must be greater than 0');
      return;
    }

    setProcessingId('create');
    try {
      const response = await adminApi.post('/salaries', {
        staffId: formData.staffId,
        month: formData.month,
        year: formData.year,
        baseSalary: formData.baseSalary,
        bonuses: formData.bonuses || 0,
        deductions: formData.deductions || 0,
        notes: formData.notes || '',
      });

      if (response.data.success) {
        toast.success('✅ Salary created successfully!');
        setShowCreateModal(false);
        setFormData({
          staffId: '',
          month: new Date().getMonth(),
          year: new Date().getFullYear(),
          baseSalary: 0,
          bonuses: 0,
          deductions: 0,
          notes: '',
        });
        fetchData();
      }
    } catch (error: any) {
      console.error('Error creating salary:', error);
      toast.error(error.response?.data?.error || 'Failed to create salary');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveSalary = async (salaryId: string) => {
    setProcessingId(salaryId);
    try {
      const response = await adminApi.patch(`/salaries/${salaryId}/approve`, {});

      if (response.data.success) {
        toast.success('✅ Salary approved!');
        fetchData();
      }
    } catch (error: any) {
      console.error('Error approving salary:', error);
      toast.error(error.response?.data?.error || 'Failed to approve salary');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePaySalary = async (salaryId: string) => {
    setProcessingId(salaryId);
    try {
      const response = await adminApi.patch(`/salaries/${salaryId}/pay`, {});

      if (response.data.success) {
        toast.success('✅ Salary marked as paid!');
        fetchData();
      }
    } catch (error: any) {
      console.error('Error paying salary:', error);
      toast.error(error.response?.data?.error || 'Failed to mark as paid');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSalary = async (salaryId: string) => {
    if (!confirm('Are you sure you want to reject this salary?')) return;

    setProcessingId(salaryId);
    try {
      const response = await adminApi.patch(`/salaries/${salaryId}/reject`, {});

      if (response.data.success) {
        toast.success('Salary rejected');
        fetchData();
      }
    } catch (error: any) {
      console.error('Error rejecting salary:', error);
      toast.error(error.response?.data?.error || 'Failed to reject salary');
    } finally {
      setProcessingId(null);
    }
  };

  // ─── Generate and Download Salary Slip ─────────────────────────────────
  const generateSalarySlip = (salary: SalaryRecord) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[salary.month];

    // Create HTML content for salary slip
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${salary.staffName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          .slip-container {
            max-width: 700px;
            width: 100%;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            overflow: hidden;
          }
          .slip-header {
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            color: white;
            padding: 30px 35px;
            text-align: center;
            border-bottom: 4px solid #f97316;
          }
          .slip-header h1 {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1px;
          }
          .slip-header p {
            opacity: 0.8;
            font-size: 13px;
            margin-top: 4px;
          }
          .slip-body {
            padding: 30px 35px;
          }
          .employee-info {
            display: flex;
            justify-content: space-between;
            padding-bottom: 20px;
            border-bottom: 2px dashed #e5e7eb;
            margin-bottom: 20px;
          }
          .employee-info .left h2 {
            font-size: 20px;
            color: #1a1a2e;
          }
          .employee-info .left p {
            color: #6b7280;
            font-size: 14px;
            margin-top: 2px;
          }
          .employee-info .right {
            text-align: right;
          }
          .employee-info .right .status-badge {
            display: inline-block;
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-badge.paid { background: #d1fae5; color: #065f46; }
          .status-badge.approved { background: #dbeafe; color: #1e40af; }
          .status-badge.pending { background: #fef3c7; color: #92400e; }
          .salary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .salary-table td {
            padding: 12px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .salary-table td:last-child {
            text-align: right;
            font-weight: 600;
          }
          .salary-table .label {
            color: #6b7280;
          }
          .salary-table .total-row td {
            border-top: 2px solid #1a1a2e;
            padding-top: 16px;
            font-size: 18px;
            font-weight: 700;
            color: #1a1a2e;
          }
          .salary-table .total-row td:last-child {
            color: #f97316;
            font-size: 22px;
          }
          .bonus { color: #059669; }
          .deduction { color: #dc2626; }
          .slip-footer {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 2px dashed #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
          }
          .slip-footer .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
          }
          .slip-footer .signatures div {
            text-align: center;
          }
          .slip-footer .signatures .line {
            width: 150px;
            border-top: 1px solid #9ca3af;
            margin: 8px auto 4px;
          }
          .slip-footer .signatures .label {
            font-size: 11px;
            color: #9ca3af;
          }
          .print-btn {
            display: block;
            width: 100%;
            padding: 12px;
            margin-top: 15px;
            background: #f97316;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }
          .print-btn:hover { background: #ea580c; }
          @media print {
            body { background: white; padding: 0; }
            .slip-container { box-shadow: none; border-radius: 0; }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="slip-container">
          <div class="slip-header">
            <h1>💰 SALARY SLIP</h1>
            <p>${monthName} ${salary.year} | Employee ID: ${salary.employeeId}</p>
          </div>
          
          <div class="slip-body">
            <div class="employee-info">
              <div class="left">
                <h2>${salary.staffName}</h2>
                <p>${salary.employeeId} • ${salary.staffName.split(' ').slice(0, -1).join(' ') || 'Staff'}</p>
              </div>
              <div class="right">
                <span class="status-badge ${salary.status}">${salary.status.toUpperCase()}</span>
              </div>
            </div>

            <table class="salary-table">
              <tr>
                <td class="label">Base Salary</td>
                <td>₹${salary.baseSalary.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label bonus">+ Bonuses</td>
                <td class="bonus">+₹${salary.bonuses.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label deduction">− Deductions</td>
                <td class="deduction">-₹${salary.deductions.toLocaleString()}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Net Salary</strong></td>
                <td>₹${salary.netSalary.toLocaleString()}</td>
              </tr>
            </table>

            ${salary.notes ? `
              <div style="margin-top:15px;padding:12px;background:#f9fafb;border-radius:8px;">
                <p style="font-size:13px;color:#6b7280;"><strong>Notes:</strong> ${salary.notes}</p>
              </div>
            ` : ''}

            <div class="slip-footer">
              <div><strong>Payment Details</strong></div>
              <div style="font-size:13px;color:#6b7280;margin-top:4px;">
                ${salary.paidAt ? `Paid on: ${new Date(salary.paidAt).toLocaleDateString()}` : salary.approvedAt ? `Approved on: ${new Date(salary.approvedAt).toLocaleDateString()}` : 'Pending Approval'}
              </div>
              <div class="signatures">
                <div>
                  <div class="line"></div>
                  <div class="label">Employee Signature</div>
                </div>
                <div>
                  <div class="line"></div>
                  <div class="label">Authorized Signature</div>
                </div>
              </div>
            </div>

            <button class="print-btn" onclick="window.print()">
              🖨️ Print / Download PDF
            </button>
          </div>
        </div>
      </body>
      </html>
    `;

    // Open in new window for printing/download
    const win = window.open('', '_blank', 'width=800,height=600');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      toast.error('Please allow popups to download salary slip');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock size={12} /> Pending
        </span>;
      case 'approved':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
          <CheckCircle size={12} /> Approved
        </span>;
      case 'paid':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle size={12} /> Paid
        </span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
          <XCircle size={12} /> Rejected
        </span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading salary data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <DollarSign size={24} className="text-green-500" />
              Salary Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">Create and manage staff salaries</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              <Plus size={16} /> Create Salary
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Salaries</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-100">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
            <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
            <p className="text-xs text-gray-500">Approved</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            <p className="text-xs text-gray-500">Paid</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-100">
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalAmount)}</p>
            <p className="text-xs text-gray-500">Total Amount</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.pendingAmount)}</p>
            <p className="text-xs text-gray-500">Pending Amount</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by staff name, employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'paid' | 'rejected')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="flex items-center gap-2">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
              <input
                type="number"
                value={yearFilter}
                onChange={(e) => setYearFilter(parseInt(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>
        </div>

        {/* Salary Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bonuses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!Array.isArray(currentItems) || currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No salary records found for this month
                    </td>
                  </tr>
                ) : (
                  currentItems.map((salary) => (
                    <tr key={salary._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-sm">
                            {salary.staffName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{salary.staffName}</p>
                            <p className="text-xs text-gray-400">{salary.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {monthNames[salary.month]} {salary.year}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-700">
                        {formatCurrency(salary.baseSalary)}
                      </td>
                      <td className="px-6 py-3 text-sm text-green-600">
                        +{formatCurrency(salary.bonuses)}
                      </td>
                      <td className="px-6 py-3 text-sm text-red-600">
                        -{formatCurrency(salary.deductions)}
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-gray-800">
                        {formatCurrency(salary.netSalary)}
                      </td>
                      <td className="px-6 py-3">
                        {getStatusBadge(salary.status)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedSalary(salary);
                              setShowDetailModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {/* Salary Slip Button */}
                          <button
                            onClick={() => generateSalarySlip(salary)}
                            className="p-1 text-blue-500 hover:text-blue-700 rounded"
                            title="Download Salary Slip"
                          >
                            <FileDown size={16} />
                          </button>
                          {salary.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveSalary(salary._id)}
                                disabled={processingId === salary._id}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                              >
                                {processingId === salary._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectSalary(salary._id)}
                                disabled={processingId === salary._id}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {salary.status === 'approved' && (
                            <button
                              onClick={() => handlePaySalary(salary._id)}
                              disabled={processingId === salary._id}
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                            >
                              {processingId === salary._id ? <Loader2 size={12} className="animate-spin" /> : <DollarSign size={12} />}
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredSalaries.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-500">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSalaries.length)} of {filteredSalaries.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Create Salary Modal ────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowCreateModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b bg-green-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign size={20} className="text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Create Salary</h3>
                    <p className="text-sm text-gray-500">Add salary for a staff member</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Staff Selection - Fixed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
                  <select
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option value="">Select staff member</option>
                    {Array.isArray(staff) && staff.length > 0 ? (
                      staff
                        .filter(s => s.status === 'active')
                        .map(s => (
                          <option key={s._id} value={s._id}>
                            {s.name} ({s.employeeId}) - {s.role}
                          </option>
                        ))
                    ) : (
                      <option value="" disabled>No staff members available</option>
                    )}
                  </select>
                </div>

                {/* Month & Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    >
                      {monthNames.map((name, idx) => (
                        <option key={idx} value={idx}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                </div>

                {/* Salary Amounts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      value={formData.baseSalary || ''}
                      onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      placeholder="Enter base salary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonuses</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={formData.bonuses || ''}
                        onChange={(e) => setFormData({ ...formData, bonuses: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deductions</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={formData.deductions || ''}
                        onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Any notes about this salary..."
                  />
                </div>
              </div>

              <div className="p-5 border-t flex gap-3 bg-gray-50">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSalary}
                  disabled={processingId === 'create'}
                  className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingId === 'create' ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                  {processingId === 'create' ? 'Creating...' : 'Create Salary'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Salary Detail Modal ────────────────────────────────────────── */}
      {showDetailModal && selectedSalary && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowDetailModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-2xl max-w-2xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className={`p-5 border-b flex justify-between items-center ${
                selectedSalary.status === 'paid' ? 'bg-green-50' :
                selectedSalary.status === 'approved' ? 'bg-blue-50' : 'bg-yellow-50'
              }`}>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Salary Details</h3>
                  <p className="text-sm text-gray-500">{selectedSalary.staffName} - {monthNames[selectedSalary.month]} {selectedSalary.year}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Employee</p>
                    <p className="font-semibold">{selectedSalary.staffName}</p>
                    <p className="text-sm text-gray-500">{selectedSalary.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    {getStatusBadge(selectedSalary.status)}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Base Salary</p>
                      <p className="font-semibold">{formatCurrency(selectedSalary.baseSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Bonuses</p>
                      <p className="font-semibold text-green-600">+{formatCurrency(selectedSalary.bonuses)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Deductions</p>
                      <p className="font-semibold text-red-600">-{formatCurrency(selectedSalary.deductions)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                    <p className="text-sm font-medium text-gray-700">Net Salary</p>
                    <p className="text-xl font-bold text-orange-500">{formatCurrency(selectedSalary.netSalary)}</p>
                  </div>
                </div>

                {selectedSalary.notes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Notes</p>
                    <p className="text-sm text-gray-600">{selectedSalary.notes}</p>
                  </div>
                )}

                {selectedSalary.approvedAt && (
                  <div className="text-xs text-gray-400">
                    Approved: {new Date(selectedSalary.approvedAt).toLocaleString()}
                  </div>
                )}
                {selectedSalary.paidAt && (
                  <div className="text-xs text-gray-400">
                    Paid: {new Date(selectedSalary.paidAt).toLocaleString()}
                  </div>
                )}
                {selectedSalary.rejectedAt && (
                  <div className="text-xs text-gray-400">
                    Rejected: {new Date(selectedSalary.rejectedAt).toLocaleString()}
                    {selectedSalary.rejectionReason && <div className="text-red-500">Reason: {selectedSalary.rejectionReason}</div>}
                  </div>
                )}
              </div>

              <div className="p-5 bg-gray-50 border-t flex justify-between gap-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    generateSalarySlip(selectedSalary);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                >
                  <FileDown size={16} /> Download Slip
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Close
                  </button>
                  {selectedSalary.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleApproveSalary(selectedSalary._id);
                          setShowDetailModal(false);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                      >
                        <CheckCircle size={16} /> Approve
                      </button>
                    </>
                  )}
                  {selectedSalary.status === 'approved' && (
                    <button
                      onClick={() => {
                        handlePaySalary(selectedSalary._id);
                        setShowDetailModal(false);
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                    >
                      <DollarSignIcon size={16} /> Pay
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}