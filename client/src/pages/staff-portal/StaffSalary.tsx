// pages/staff-portal/StaffSalary.tsx
import { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, Calendar, TrendingUp, TrendingDown, 
  CheckCircle, Clock, Loader2, ChevronLeft, 
  ChevronRight, Info, Download, Printer, FileText,
  User, Mail, Phone, Award, Building2, Receipt,
  Banknote, Coins, Plus, Minus, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SalaryRecord {
  _id: string;
  month: number;
  year: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  paymentDate?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  notes?: string;
  staffName?: string;
  employeeId?: string;
  staffEmail?: string;
  staffPhone?: string;
}

export default function StaffSalary() {
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSalary, setCurrentSalary] = useState<SalaryRecord | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);
  const [showSalarySlip, setShowSalarySlip] = useState(false);
  const [staffInfo, setStaffInfo] = useState({
    name: '',
    employeeId: '',
    email: '',
    phone: '',
    role: '',
    department: '',
  });
  const [summary, setSummary] = useState({
    totalEarned: 0,
    pendingAmount: 0,
    totalRecords: 0,
    paidRecords: 0,
  });
  const salarySlipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSalary();
    fetchStaffInfo();
  }, [selectedYear]);

  const fetchStaffInfo = async () => {
    try {
      const response = await staffApi.get('/staff-portal/profile');
      if (response.data.success) {
        const data = response.data.data;
        setStaffInfo({
          name: data.name || '',
          employeeId: data.employeeId || '',
          email: data.email || '',
          phone: data.phoneNumber || '',
          role: data.roleName || data.role || '',
          department: data.department || 'Kitchen',
        });
      }
    } catch (error) {
      console.error('Error fetching staff info:', error);
    }
  };

  const fetchSalary = async () => {
    setLoading(true);
    try {
      const response = await staffApi.get('/staff-portal/salary', {
        params: { year: selectedYear }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        const records = data.records || [];
        
        // Add staff info to each record
        const enrichedRecords = records.map((record: SalaryRecord) => ({
          ...record,
          staffName: staffInfo.name,
          employeeId: staffInfo.employeeId,
          staffEmail: staffInfo.email,
          staffPhone: staffInfo.phone,
        }));
        
        setSalaryRecords(enrichedRecords);
        setCurrentSalary(data.current || null);
        setSummary(data.summary || {
          totalEarned: 0,
          pendingAmount: 0,
          totalRecords: 0,
          paidRecords: 0,
        });
      }
    } catch (error: any) {
      console.error('Error fetching salary:', error);
      toast.error(error.response?.data?.error || 'Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-100 text-green-700 border-green-200',
      approved: 'bg-blue-100 text-blue-700 border-blue-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
    };
    const icons = {
      paid: <CheckCircle size={14} className="text-green-600" />,
      approved: <CheckCircle size={14} className="text-blue-600" />,
      pending: <Clock size={14} className="text-yellow-600" />,
      rejected: <Clock size={14} className="text-red-600" />,
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || ''}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const viewSalarySlip = (record: SalaryRecord) => {
    setSelectedSalary({
      ...record,
      staffName: staffInfo.name,
      employeeId: staffInfo.employeeId,
      staffEmail: staffInfo.email,
      staffPhone: staffInfo.phone,
    });
    setShowSalarySlip(true);
  };

  const downloadSalarySlip = async () => {
    if (!salarySlipRef.current) return;
    
    try {
      toast.loading('Generating PDF...', { id: 'pdf-gen' });
      
      const canvas = await html2canvas(salarySlipRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Salary_Slip_${selectedSalary?.staffName || 'Staff'}_${selectedSalary?.month}_${selectedSalary?.year}.pdf`);
      
      toast.success('Salary slip downloaded!', { id: 'pdf-gen' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF', { id: 'pdf-gen' });
    }
  };

  const printSalarySlip = () => {
    window.print();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={24} className="text-green-500" />
            My Salary
          </h1>
          <p className="text-gray-500 text-sm">View your salary records and payment history</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Earned</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalEarned)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.pendingAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Records</p>
          <p className="text-2xl font-bold text-gray-800">{summary.totalRecords}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Paid Records</p>
          <p className="text-2xl font-bold text-blue-600">{summary.paidRecords}</p>
        </div>
      </div>

      {/* Current Month Salary Card */}
      {currentSalary && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm opacity-90">Current Month Salary</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(currentSalary.netSalary)}</p>
              <p className="text-sm opacity-90 mt-1">
                {monthNames[currentSalary.month]} {currentSalary.year}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <p className="text-sm opacity-90">Status</p>
                <div className="mt-1">{getStatusBadge(currentSalary.status)}</div>
              </div>
              <button
                onClick={() => viewSalarySlip(currentSalary)}
                className="bg-white text-orange-500 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition flex items-center gap-2"
              >
                <Eye size={16} /> View Slip
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-xs opacity-75">Base Salary</p>
              <p className="font-semibold">{formatCurrency(currentSalary.baseSalary)}</p>
            </div>
            <div>
              <p className="text-xs opacity-75">Bonuses</p>
              <p className="font-semibold text-green-300">+{formatCurrency(currentSalary.bonuses)}</p>
            </div>
            <div>
              <p className="text-xs opacity-75">Deductions</p>
              <p className="font-semibold text-red-300">-{formatCurrency(currentSalary.deductions)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Salary History Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Salary History</h3>
          <p className="text-sm text-gray-500">{selectedYear}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bonuses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salaryRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No salary records found for {selectedYear}
                  </td>
                </tr>
              ) : (
                salaryRecords.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {monthNames[record.month]} {record.year}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {formatCurrency(record.baseSalary)}
                    </td>
                    <td className="px-6 py-3 text-sm text-green-600">
                      +{formatCurrency(record.bonuses)}
                    </td>
                    <td className="px-6 py-3 text-sm text-red-600">
                      -{formatCurrency(record.deductions)}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(record.netSalary)}
                    </td>
                    <td className="px-6 py-3">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-3">
                      {record.status === 'paid' && (
                        <button
                          onClick={() => viewSalarySlip(record)}
                          className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1"
                        >
                          <FileText size={14} /> View Slip
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Message */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <p className="text-sm text-blue-700 flex items-center gap-2">
          <Info size={16} />
          Salary records are managed by the admin. Please contact HR if you have any questions.
        </p>
      </div>

      {/* ─── Salary Slip Modal ──────────────────────────────────────── */}
      {showSalarySlip && selectedSalary && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowSalarySlip(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative max-w-3xl w-full mx-auto" onClick={e => e.stopPropagation()}>
              {/* Salary Slip Content */}
              <div ref={salarySlipRef} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold">Salary Slip</h2>
                      <p className="text-sm opacity-90">Restaurant Management System</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{monthNames[selectedSalary.month]} {selectedSalary.year}</p>
                      <p className="text-xs opacity-75">Generated: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Employee Details */}
                <div className="p-6 border-b border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Employee Name</p>
                      <p className="font-semibold">{selectedSalary.staffName || staffInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Employee ID</p>
                      <p className="font-semibold">{selectedSalary.employeeId || staffInfo.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="font-semibold">{selectedSalary.staffEmail || staffInfo.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="font-semibold">{selectedSalary.staffPhone || staffInfo.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Role</p>
                      <p className="font-semibold capitalize">{staffInfo.role || 'Staff'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Department</p>
                      <p className="font-semibold">{staffInfo.department || 'Kitchen'}</p>
                    </div>
                  </div>
                </div>

                {/* Salary Details */}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Salary Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Base Salary</span>
                      <span className="font-semibold">{formatCurrency(selectedSalary.baseSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Plus size={14} className="text-green-500" /> Bonuses
                      </span>
                      <span className="font-semibold text-green-600">+{formatCurrency(selectedSalary.bonuses)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Minus size={14} className="text-red-500" /> Deductions
                      </span>
                      <span className="font-semibold text-red-600">-{formatCurrency(selectedSalary.deductions)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-orange-50 rounded-lg px-4 -mx-2">
                      <span className="font-bold text-gray-800">Net Salary</span>
                      <span className="text-xl font-bold text-orange-500">{formatCurrency(selectedSalary.netSalary)}</span>
                    </div>
                  </div>

                  {selectedSalary.notes && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Notes</p>
                      <p className="text-sm text-gray-600">{selectedSalary.notes}</p>
                    </div>
                  )}

                  {selectedSalary.paymentDate && (
                    <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      Paid on {new Date(selectedSalary.paymentDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-xs text-gray-400">
                    <p>This is a computer generated slip</p>
                    <p>For any discrepancies, please contact HR</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSalarySlip(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                    >
                      Close
                    </button>
                    <button
                      onClick={printSalarySlip}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                    >
                      <Printer size={16} /> Print
                    </button>
                    <button
                      onClick={downloadSalarySlip}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
                    >
                      <Download size={16} /> Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}