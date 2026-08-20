// pages/billing/BillingPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import {
  Receipt, Search, RefreshCw, Eye, Wallet,
  Loader2, ChevronLeft, ChevronRight,
  Table2, User, Clock, CheckCircle, XCircle,
  TrendingUp, Filter, ArrowLeft, ArrowRight,
  CreditCard, IndianRupee, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Bill {
  _id: string;
  billNumber: string;
  orderId: string;
  orderNumber: string;
  tableNumber?: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{ productName: string; quantity: number; totalPrice: number }>;
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  discountType: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
  generatedBy?: string;
  isVip?: boolean;
}

interface Stats {
  total: number;
  pending: number;
  paid: number;
  totalAmount: number;
  pendingAmount: number;
}

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <Clock size={12} /> Pending
      </span>;
    case 'paid':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle size={12} /> Paid
      </span>;
    case 'refunded':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle size={12} /> Refunded
      </span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        {status}
      </span>;
  }
};

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    paid: 0,
    totalAmount: 0,
    pendingAmount: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'refunded'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBills, setTotalBills] = useState(0);
  const itemsPerPage = 10;

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/bills?limit=${itemsPerPage}&page=${currentPage}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (statusFilter !== 'all') url += `&paymentStatus=${statusFilter}`;

      console.log('📊 Fetching bills:', url);
      const response = await adminApi.get(url);
      console.log('📊 Bills response:', response.data);
      
      if (response.data.success) {
        const billsData = response.data.data?.bills || response.data.bills || [];
        const total = response.data.data?.total || response.data.total || billsData.length;
        
        setBills(billsData);
        setTotalBills(total);
        setTotalPages(Math.ceil(total / itemsPerPage) || 1);
        
        // Calculate stats from all bills (we need to fetch all for stats)
        // For now, use the data we have with pagination
        const allBills = response.data.data?.allBills || billsData;
        const pending = billsData.filter((b: Bill) => b.paymentStatus === 'pending').length;
        const paid = billsData.filter((b: Bill) => b.paymentStatus === 'paid').length;
        const totalAmount = billsData.reduce((sum: number, b: Bill) => sum + (b.total || 0), 0);
        const pendingAmount = billsData
          .filter((b: Bill) => b.paymentStatus === 'pending')
          .reduce((sum: number, b: Bill) => sum + (b.total || 0), 0);
        
        setStats({ total, pending, paid, totalAmount, pendingAmount });
      }
    } catch (error: any) {
      console.error('❌ Error fetching bills:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to load bills');
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleBillClick = (billId: string) => {
    console.log('🔍 Navigating to bill:', billId);
    navigate(`/billing/${billId}`);
  };

  const hasFilters = searchTerm !== '' || statusFilter !== 'all';

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Generate page numbers
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = startPage + 4;
      
      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - 4);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Receipt size={24} className="text-orange-500" />
            Billing
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage all bills and payments</p>
        </div>
        <button
          onClick={() => { fetchBills(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Bills" value={totalBills} icon={Receipt} color="#6366f1" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="#f59e0b" />
        <StatCard label="Paid" value={stats.paid} icon={CheckCircle} color="#10b981" />
        <StatCard label="Total Revenue" value={formatCurrency(stats.totalAmount)} icon={TrendingUp} color="#f97316" />
        <StatCard label="Pending Amount" value={formatCurrency(stats.pendingAmount)} icon={Wallet} color="#f59e0b" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by bill #, order #, table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'paid' | 'refunded')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <Filter size={16} className="inline mr-1" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Bills Table */}
      {bills.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Receipt size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-600">No bills found</h3>
          <p className="text-gray-400 text-sm mt-1">
            {hasFilters ? 'Try adjusting your filters' : 'Bills will appear here once generated from orders'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bill #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Table / Customer</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map((bill) => {
                    const itemCount = bill.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                    
                    return (
                      <tr 
                        key={bill._id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleBillClick(bill._id)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-gray-800">#{bill.billNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-gray-600">#{bill.orderNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            {bill.tableNumber && (
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <Table2 size={12} /> Table {bill.tableNumber}
                              </span>
                            )}
                            {bill.customerName && (
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <User size={12} /> {bill.customerName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-semibold text-xs">
                            {itemCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-gray-800">{formatCurrency(bill.total)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(bill.paymentStatus)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-gray-500">
                            {formatDate(bill.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBillClick(bill._id);
                              }}
                              className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              title="View Bill"
                            >
                              <Eye size={14} className="text-blue-600" />
                            </button>
                            {bill.paymentStatus === 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/billing/${bill._id}`);
                                }}
                                className="p-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                title="Pay Now"
                              >
                                <Wallet size={14} className="text-green-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalBills)} of {totalBills} bills
              </div>
              <div className="flex gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                
                <div className="flex gap-1">
                  {getPageNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-9 h-9 rounded-lg border text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Pagination Info */}
          {totalPages > 1 && (
            <div className="text-center mt-4 text-xs text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </>
      )}
    </div>
  );
}