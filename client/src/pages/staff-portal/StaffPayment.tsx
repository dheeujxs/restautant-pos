// pages/staff-portal/StaffPayment.tsx - FIXED WITH CORRECT ENDPOINTS

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Wallet, CreditCard, IndianRupee, CheckCircle, XCircle,
  Loader2, RefreshCw, Printer, Receipt, User, Table2,
  Phone, MapPin, Crown, Coffee, ShoppingBag, Truck,
  ChevronLeft, ChevronRight, AlertCircle, Clock,
  FileText, Banknote, Smartphone, CreditCard as CardIcon,
  ArrowLeft, Check, X, TrendingUp, Calendar, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import { staffStorage } from '../../utils/storage';

interface BillItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  roundNumber?: number;
}

interface Bill {
  _id: string;
  billNumber: string;
  orderId: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  discountType: string;
  total: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'online';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  notes?: string;
  createdAt: string;
  paidAt?: string;
  isVip?: boolean;
  branchId?: string;
  branchName?: string;
}

interface PaymentMethod {
  id: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'upi', label: 'UPI', icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'card', label: 'Card', icon: CardIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'online', label: 'Online', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
];

interface SplitPayment {
  method: 'cash' | 'upi' | 'card' | 'online';
  amount: number;
}

export default function StaffPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const billId = params.get('billId');
  
  // ✅ Also check state from navigation
  const state = location.state as { billId?: string } | null;
  const billIdFromState = state?.billId;

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'refunded'>('pending');
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [showSplit, setShowSplit] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [showBillSelector, setShowBillSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ Use billId from URL or state
  const finalBillId = billId || billIdFromState;

  console.log('🔍 StaffPayment - billId:', billId, 'billIdFromState:', billIdFromState, 'finalBillId:', finalBillId);

  useEffect(() => {
    if (finalBillId) {
      console.log('✅ Fetching bill:', finalBillId);
      fetchBill(finalBillId);
    } else {
      // ✅ If no bill ID, show bill selector
      console.log('📋 No bill ID, showing selector');
      setLoading(false);
      fetchRecentBills();
    }
  }, [finalBillId]);

  const fetchRecentBills = async () => {
    try {
      console.log('📋 Fetching recent bills...');
      const response = await staffApi.get('/bills/staff?limit=20&paymentStatus=pending');
      console.log('📦 Recent bills response:', response.data);
      
      if (response.data.success) {
        const bills = response.data.data?.bills || [];
        setRecentBills(bills);
        console.log(`✅ Loaded ${bills.length} pending bills`);
        // ✅ FIXED: Removed toast.info() - react-hot-toast doesn't have .info() method
        // The UI already shows "No pending bills" message when needed
      }
    } catch (error) {
      console.error('Error fetching recent bills:', error);
    }
  };

  const fetchBill = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      if (!staffStorage.isLoggedIn()) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }

      console.log('🔍 Fetching bill:', id);
      
      // ✅ FIXED: Use /bills/staff/:id endpoint (not /bills/staff/:id)
      const response = await staffApi.get(`/bills/staff/${id}`);
      console.log('📦 Bill response:', response.data);
      
      if (response.data.success) {
        const billData = response.data.data || response.data;
        setBill(billData);
        console.log('✅ Bill loaded:', billData.billNumber);
      } else {
        toast.error('Bill not found');
        setShowBillSelector(true);
        fetchRecentBills();
      }
    } catch (error: any) {
      console.error('Error fetching bill:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        navigate('/staff-portal/login');
      } else if (error.response?.status === 404) {
        toast.error('Bill not found or access denied');
        setShowBillSelector(true);
        fetchRecentBills();
      } else {
        toast.error(error.response?.data?.error || 'Failed to load bill');
        setShowBillSelector(true);
        fetchRecentBills();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBill = (selectedBill: Bill) => {
    console.log('✅ Selected bill:', selectedBill.billNumber);
    setShowBillSelector(false);
    navigate(`/staff-portal/payment?billId=${selectedBill._id}`);
  };

  const handlePrintReceipt = () => {
    if (!bill) return;
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${bill.billNumber}</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #fff; }
          .container { max-width: 350px; margin: 0 auto; border: 2px dashed #333; padding: 15px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .title { font-size: 22px; font-weight: bold; color: #f97316; }
          .vip { color: #b45309; font-weight: bold; }
          .item { margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
          .qty { background: #f97316; color: #fff; padding: 2px 6px; border-radius: 4px; margin-right: 8px; }
          .total { font-size: 18px; font-weight: bold; color: #f97316; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 2px solid #333; font-size: 10px; }
          .payment { background: #f0fdf4; padding: 10px; border-radius: 4px; margin: 10px 0; }
          .thankyou { font-size: 14px; color: #166534; }
          .branch { font-size: 10px; color: #666; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">🧾 RECEIPT</div>
            <div><strong>${bill.billNumber}</strong></div>
            <div>Order #${bill.orderNumber}</div>
            ${bill.isVip ? '<div class="vip">⭐ VIP CUSTOMER ⭐</div>' : ''}
            ${bill.branchName ? `<div class="branch">📍 ${bill.branchName}</div>` : ''}
          </div>
          <div><strong>Table:</strong> ${bill.tableNumber || 'N/A'}</div>
          <div><strong>Customer:</strong> ${bill.customerName || 'Guest'}</div>
          <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
          <div style="margin: 12px 0"><strong>ITEMS:</strong></div>
          ${bill.items.map(item => `
            <div class="item">
              <span class="qty">${item.quantity}×</span>
              ${item.productName} - ₹${item.totalPrice}
            </div>
          `).join('')}
          <div style="margin-top: 12px; border-top: 2px solid #333; padding-top: 10px;">
            <div>Subtotal: ₹${bill.subtotal}</div>
            <div>Tax (${bill.taxRate}%): ₹${bill.tax}</div>
            ${bill.discount > 0 ? `<div>Discount: -₹${bill.discount}</div>` : ''}
            <div class="total">Total: ₹${bill.total}</div>
          </div>
          <div class="payment">
            <div><strong>Payment Method:</strong> ${selectedMethod.toUpperCase()}</div>
            <div><strong>Status:</strong> PAID</div>
            <div><strong>Paid Amount:</strong> ₹${bill.total}</div>
          </div>
          <div class="footer">
            <div class="thankyou">Thank you for dining with us!</div>
            <div>${new Date().toLocaleString()}</div>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handlePayment = async () => {
    if (!bill) return;
    
    // Check if split payment is complete
    if (showSplit) {
      const totalSplit = splitPayments.reduce((sum, s) => sum + s.amount, 0);
      if (totalSplit < bill.total) {
        setError(`Total split amount (₹${totalSplit}) is less than bill total (₹${bill.total})`);
        return;
      }
      if (totalSplit > bill.total) {
        setError(`Total split amount (₹${totalSplit}) exceeds bill total (₹${bill.total})`);
        return;
      }
    }

    setProcessing(true);
    setError('');

    try {
      if (!staffStorage.isLoggedIn()) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }

      console.log('💰 Processing payment for bill:', bill._id);

      const payload = {
        paymentMethod: selectedMethod,
        paymentStatus: 'paid',
        ...(showSplit && { splitPayments }),
      };

      // ✅ FIXED: Use /bills/staff/:id/payment endpoint
      const response = await staffApi.patch(
        `/bills/staff/${bill._id}/payment`,
        payload
      );

      console.log('📦 Payment response:', response.data);

      if (response.data.success) {
        const updatedBill = response.data.data || response.data;
        setBill(updatedBill);
        setPaymentSuccess(true);
        setPaymentStatus('paid');
        toast.success('✅ Payment processed successfully!');
        
        console.log('✅ Payment successful, printing receipt...');
        setTimeout(() => {
          handlePrintReceipt();
        }, 500);
      } else {
        setError(response.data.error || 'Payment failed');
        toast.error(response.data.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        navigate('/staff-portal/login');
      } else {
        const errorMsg = error.response?.data?.error || 'Payment failed';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitPayment = () => {
    if (!bill) return;
    const totalSplit = splitPayments.reduce((sum, s) => sum + s.amount, 0);
    if (totalSplit === bill.total) {
      handlePayment();
    } else {
      setError(`Split total (₹${totalSplit}) must equal bill total (₹${bill.total})`);
    }
  };

  const addSplitPayment = (method: 'cash' | 'upi' | 'card' | 'online', amount: number) => {
    if (amount <= 0) return;
    const existing = splitPayments.find(s => s.method === method);
    if (existing) {
      setSplitPayments(prev => prev.map(s => 
        s.method === method ? { ...s, amount } : s
      ));
    } else {
      setSplitPayments(prev => [...prev, { method, amount }]);
    }
  };

  const removeSplitPayment = (method: string) => {
    setSplitPayments(prev => prev.filter(s => s.method !== method));
  };

  const getSplitTotal = () => {
    return splitPayments.reduce((sum, s) => sum + s.amount, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredBills = recentBills.filter(bill => 
    bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── Bill Selector View ──────────────────────────────────────────────────
  if (showBillSelector || (!finalBillId && !loading)) {
    return (
      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/staff-portal/cashier')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Receipt size={24} className="text-orange-500" />
                Select Bill for Payment
              </h1>
              <p className="text-gray-500 text-sm">Choose a pending bill to process payment</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {/* Search */}
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by bill #, order #, customer, table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 size={32} className="animate-spin text-orange-500 mx-auto" />
                <p className="text-gray-500 mt-2">Loading bills...</p>
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-12">
                <Receipt size={48} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-600">No pending bills</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm ? 'Try adjusting your search' : 'All bills have been paid'}
                </p>
                <button
                  onClick={() => navigate('/staff-portal/cashier')}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBills.map((bill) => (
                  <div
                    key={bill._id}
                    onClick={() => handleSelectBill(bill)}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-orange-200 hover:bg-orange-50/30 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Receipt size={18} className="text-orange-500" />
                      </div>
                      <div>
                        <p className="font-mono font-semibold text-gray-800">{bill.billNumber}</p>
                        <p className="text-xs text-gray-400">Order #{bill.orderNumber}</p>
                        {bill.customerName && (
                          <p className="text-xs text-gray-500">👤 {bill.customerName}</p>
                        )}
                        {bill.tableNumber && (
                          <p className="text-xs text-gray-400">Table {bill.tableNumber}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-500">₹{bill.total}</p>
                      <p className="text-xs text-gray-400">{formatDate(bill.createdAt)}</p>
                      {bill.branchName && (
                        <p className="text-xs text-purple-500">📍 {bill.branchName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Bill not found</p>
          <button onClick={() => navigate('/staff-portal/cashier')} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (bill.paymentStatus === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Payment Already Completed</h2>
          <p className="text-gray-500 mt-2">This bill has already been paid.</p>
          <p className="text-sm text-gray-400 mt-1">Bill #{bill.billNumber}</p>
          <button
            onClick={() => navigate('/staff-portal/cashier')}
            className="mt-6 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Payment Successful!</h2>
          <p className="text-gray-500 mt-2">Amount paid: {formatCurrency(bill.total)}</p>
          <p className="text-sm text-gray-400 mt-1">Bill #{bill.billNumber}</p>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Payment Method</p>
            <p className="font-semibold text-gray-800 capitalize">{selectedMethod}</p>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handlePrintReceipt}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={() => navigate('/staff-portal/cashier')}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Payment View ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/staff-portal/cashier')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Wallet size={24} className="text-orange-500" />
              Process Payment
            </h1>
            <p className="text-gray-500 text-sm">Bill #{bill.billNumber} · Order #{bill.orderNumber}</p>
          </div>
          <button
            onClick={() => {
              setShowBillSelector(true);
              fetchRecentBills();
            }}
            className="ml-auto px-3 py-1.5 text-sm text-orange-500 hover:text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition"
          >
            Change Bill
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Bill Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bill Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-800">Bill Summary</h3>
                  <p className="text-xs text-gray-400">
                    {formatDate(bill.createdAt)} at {formatTime(bill.createdAt)}
                  </p>
                  {bill.branchName && (
                    <p className="text-xs text-purple-500 mt-1">📍 {bill.branchName}</p>
                  )}
                </div>
                {bill.isVip && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 text-white flex items-center gap-1">
                    <Crown size={12} /> VIP
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-100">
                {bill.tableNumber && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Table2 size={14} /> Table {bill.tableNumber}
                  </div>
                )}
                {bill.customerName && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User size={14} /> {bill.customerName}
                  </div>
                )}
                {bill.customerPhone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} /> {bill.customerPhone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 capitalize">
                  {bill.orderType === 'dine-in' ? <Coffee size={14} /> : 
                   bill.orderType === 'takeaway' ? <ShoppingBag size={14} /> : 
                   <Truck size={14} />}
                  {bill.orderType}
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bill.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">
                        {item.quantity}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">{item.productName}</p>
                        {item.notes && <p className="text-xs text-amber-500">📝 {item.notes}</p>}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-800">₹{item.totalPrice}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>₹{bill.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({bill.taxRate}%)</span>
                  <span>₹{bill.tax}</span>
                </div>
                {bill.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-₹{bill.discount}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="text-2xl font-bold text-orange-500">₹{bill.total}</span>
                </div>
              </div>

              {bill.notes && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-600">📝 {bill.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Payment */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4">Payment Method</h3>

              {/* Payment Methods */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setShowSplit(false);
                      }}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        isSelected
                          ? `${method.bg} ${method.border} border-2`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={18} className={isSelected ? method.color : 'text-gray-400'} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-gray-800' : 'text-gray-600'}`}>
                        {method.label}
                      </span>
                      {isSelected && <Check size={14} className="text-green-500 ml-auto" />}
                    </button>
                  );
                })}
              </div>

              {/* Split Payment Toggle */}
              <button
                onClick={() => setShowSplit(!showSplit)}
                className="w-full text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
              >
                {showSplit ? <ChevronRight size={14} /> : <ChevronRight size={14} />}
                {showSplit ? 'Hide Split Payment' : 'Split Payment'}
              </button>

              {/* Split Payment Details */}
              {showSplit && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Split Amounts</h4>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const existing = splitPayments.find(s => s.method === method.id);
                      const amount = existing?.amount || 0;
                      return (
                        <div key={method.id} className="flex items-center gap-2">
                          <Icon size={16} className="text-gray-500" />
                          <span className="text-xs font-medium text-gray-600 flex-1">{method.label}</span>
                          <input
                            type="number"
                            min="0"
                            max={bill.total}
                            value={amount || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              addSplitPayment(method.id as any, val);
                            }}
                            className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                          />
                          <span className="text-xs text-gray-400">₹</span>
                          {amount > 0 && (
                            <button
                              onClick={() => removeSplitPayment(method.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Total Split</span>
                    <span className={`text-sm font-bold ${getSplitTotal() === bill.total ? 'text-green-600' : 'text-red-500'}`}>
                      ₹{getSplitTotal()} / ₹{bill.total}
                    </span>
                  </div>
                  {getSplitTotal() !== bill.total && (
                    <p className="text-xs text-red-500 mt-2">
                      Split total must equal bill total (₹{bill.total})
                    </p>
                  )}
                </div>
              )}

              {/* Amount Display */}
              <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount to Pay</span>
                  <span className="text-2xl font-bold text-orange-500">₹{bill.total}</span>
                </div>
              </div>

              {error && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={showSplit ? handleSplitPayment : handlePayment}
                  disabled={processing || (showSplit && getSplitTotal() !== bill.total)}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Wallet size={18} />
                  )}
                  {processing ? 'Processing...' : `Pay ${formatCurrency(bill.total)}`}
                </button>

                <button
                  onClick={() => navigate('/staff-portal/cashier')}
                  className="w-full py-2 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => finalBillId && fetchBill(finalBillId)}
                  className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition flex items-center gap-1"
                >
                  <Printer size={12} /> Print Bill
                </button>
                <button
                  onClick={() => {
                    setShowBillSelector(true);
                    fetchRecentBills();
                  }}
                  className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition flex items-center gap-1"
                >
                  <Search size={12} /> Find Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}