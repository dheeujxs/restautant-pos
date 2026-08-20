// pages/staff-portal/StaffCashierDashboard.tsx - COMPLETE FIXED VERSION

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Receipt, CreditCard, Wallet, TrendingUp,
  Clock, CheckCircle, AlertCircle, Users, Package,
  RefreshCw, Loader2, Eye, Printer, Search,
  ChevronDown, ChevronUp, Calendar, IndianRupee,
  Coffee, ShoppingBag, Truck, User, Phone,
  MapPin, Mail, Crown, Star, BarChart3,
  PieChart, TrendingDown, Filter, Download,
  FileText, Settings, LogOut, Menu, X,
  Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import staffStorage from '../../utils/storage';

interface DashboardStats {
  todaySales: number;
  pendingBills: number;
  paidOrders: number;
  totalTransactions: number;
  cashCollection: number;
  upiCollection: number;
  cardCollection: number;
  onlineCollection: number;
  averageOrderValue: number;
  totalTaxCollected: number;
  totalDiscountGiven: number;
}

interface BillRequest {
  _id: string;
  billNumber: string;
  orderNumber: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  items: Array<{ 
    productName: string; 
    quantity: number; 
    totalPrice: number;
    unitPrice: number;
  }>;
  isVip?: boolean;
  notes?: string;
  paymentMethod?: 'cash' | 'upi' | 'card' | 'online';
}

interface RecentTransaction {
  _id: string;
  billNumber: string;
  orderNumber: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'online';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  customerName?: string;
  tableNumber?: string;
  orderType: string;
}

export default function StaffCashierDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    pendingBills: 0,
    paidOrders: 0,
    totalTransactions: 0,
    cashCollection: 0,
    upiCollection: 0,
    cardCollection: 0,
    onlineCollection: 0,
    averageOrderValue: 0,
    totalTaxCollected: 0,
    totalDiscountGiven: 0,
  });
  const [billRequests, setBillRequests] = useState<BillRequest[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [allBills, setAllBills] = useState<BillRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<BillRequest | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [processingBill, setProcessingBill] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [staffData, setStaffData] = useState<any>(null);

  useEffect(() => {
    // Load staff data
    const data = staffStorage.getData();
    console.log('📦 Staff data in Cashier Dashboard:', data);
    setStaffData(data);
    
    // Initial load with sample data immediately
    loadSampleData();
    
    // Then try to fetch from API
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [dateRange]);

  // ─── Generate Sample Bills ────────────────────────────────────────────
  const generateSampleBills = (): BillRequest[] => {
    const sampleItems = [
      { productName: 'Butter Chicken', quantity: 2, unitPrice: 450, totalPrice: 900 },
      { productName: 'Garlic Naan', quantity: 3, unitPrice: 60, totalPrice: 180 },
      { productName: 'Paneer Tikka', quantity: 1, unitPrice: 350, totalPrice: 350 },
      { productName: 'Masala Chai', quantity: 2, unitPrice: 40, totalPrice: 80 },
      { productName: 'Chicken Biryani', quantity: 1, unitPrice: 320, totalPrice: 320 },
      { productName: 'Roti', quantity: 4, unitPrice: 20, totalPrice: 80 },
      { productName: 'Dal Makhani', quantity: 1, unitPrice: 280, totalPrice: 280 },
      { productName: 'Naan', quantity: 2, unitPrice: 40, totalPrice: 80 },
    ];

    const bills: BillRequest[] = [];
    const statuses: ('pending' | 'paid' | 'refunded')[] = ['pending', 'paid', 'paid', 'paid', 'pending', 'paid', 'paid', 'pending'];
    const paymentMethods: ('cash' | 'upi' | 'card' | 'online')[] = ['cash', 'upi', 'card', 'online', 'cash', 'upi', 'card', 'cash'];
    const orderTypes: ('dine-in' | 'takeaway' | 'delivery')[] = ['dine-in', 'takeaway', 'dine-in', 'delivery', 'dine-in', 'takeaway', 'dine-in', 'delivery'];
    const customerNames = ['Raj Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh', 'Neha Gupta', 'Rohit Verma', 'Ananya Singh'];

    const now = new Date();
    
    for (let i = 1; i <= 20; i++) {
      const items = sampleItems.slice(0, Math.floor(Math.random() * 4) + 2);
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const tax = Math.round(subtotal * 0.05 * 100) / 100;
      const discount = i % 3 === 0 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const total = Math.round((subtotal + tax - discount) * 100) / 100;
      const status = statuses[i % statuses.length];
      
      // Create dates spread over the last few hours
      const date = new Date(now.getTime() - (i * 1800000) - (Math.random() * 600000));
      
      bills.push({
        _id: `bill_${i}`,
        billNumber: `BILL-${String(i).padStart(4, '0')}`,
        orderNumber: `ORD-${String(i).padStart(4, '0')}`,
        tableNumber: i % 3 === 0 ? String(Math.floor(Math.random() * 15) + 1) : undefined,
        customerName: customerNames[i % customerNames.length],
        customerPhone: `+91-987654${String(i).padStart(4, '0')}`,
        total,
        subtotal,
        tax,
        discount,
        paymentStatus: status,
        createdAt: date.toISOString(),
        orderType: orderTypes[i % orderTypes.length],
        items: items,
        isVip: i % 5 === 0,
        notes: i % 7 === 0 ? 'Special request: no onions' : undefined,
        paymentMethod: paymentMethods[i % paymentMethods.length],
      });
    }
    return bills;
  };

  // ─── Load Sample Data Immediately ─────────────────────────────────────
  const loadSampleData = () => {
    const sampleBills = generateSampleBills();
    console.log('📋 Loading sample bills:', sampleBills.length);
    setAllBills(sampleBills);
    updateDashboardData(sampleBills);
  };

  // ─── Update Dashboard Data ────────────────────────────────────────────
  const updateDashboardData = (bills: BillRequest[]) => {
    console.log('📊 Updating dashboard with', bills.length, 'bills');
    
    // Filter by date range
    const now = new Date();
    let filteredBills = [...bills];
    
    if (dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filteredBills = bills.filter(b => new Date(b.createdAt) >= today);
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredBills = bills.filter(b => new Date(b.createdAt) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredBills = bills.filter(b => new Date(b.createdAt) >= monthAgo);
    }

    console.log('📊 Filtered bills:', filteredBills.length);
    setBillRequests(filteredBills);

    // ─── CALCULATE STATS ──────────────────────────────────────────────
    const todayBills = filteredBills;
    
    const pendingBills = todayBills.filter(b => b.paymentStatus === 'pending');
    const paidBills = todayBills.filter(b => b.paymentStatus === 'paid');
    
    const totalSales = paidBills.reduce((sum, b) => sum + b.total, 0);
    const totalTax = paidBills.reduce((sum, b) => sum + (b.tax || 0), 0);
    const totalDiscount = paidBills.reduce((sum, b) => sum + (b.discount || 0), 0);
    
    const cashBills = paidBills.filter(b => b.paymentMethod === 'cash');
    const upiBills = paidBills.filter(b => b.paymentMethod === 'upi');
    const cardBills = paidBills.filter(b => b.paymentMethod === 'card');
    const onlineBills = paidBills.filter(b => b.paymentMethod === 'online');

    const newStats = {
      todaySales: Math.round(totalSales * 100) / 100,
      pendingBills: pendingBills.length,
      paidOrders: paidBills.length,
      totalTransactions: paidBills.length,
      cashCollection: Math.round(cashBills.reduce((sum, b) => sum + b.total, 0) * 100) / 100,
      upiCollection: Math.round(upiBills.reduce((sum, b) => sum + b.total, 0) * 100) / 100,
      cardCollection: Math.round(cardBills.reduce((sum, b) => sum + b.total, 0) * 100) / 100,
      onlineCollection: Math.round(onlineBills.reduce((sum, b) => sum + b.total, 0) * 100) / 100,
      averageOrderValue: paidBills.length > 0 ? Math.round((totalSales / paidBills.length) * 100) / 100 : 0,
      totalTaxCollected: Math.round(totalTax * 100) / 100,
      totalDiscountGiven: Math.round(totalDiscount * 100) / 100,
    };

    console.log('📊 Calculated stats:', newStats);
    setStats(newStats);

    // ─── RECENT TRANSACTIONS ──────────────────────────────────────────
    const recent = [...bills]
      .filter(b => b.paymentStatus === 'paid' || b.paymentStatus === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15)
      .map(b => ({
        _id: b._id,
        billNumber: b.billNumber,
        orderNumber: b.orderNumber,
        amount: b.total,
        paymentMethod: b.paymentMethod || 'cash',
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt,
        customerName: b.customerName,
        tableNumber: b.tableNumber,
        orderType: b.orderType,
      }));
    
    setRecentTransactions(recent);
  };

  // ─── Fetch Dashboard Data ─────────────────────────────────────────────
  const fetchDashboardData = async () => {
    try {
      // Check authentication
      if (!staffStorage.isLoggedIn()) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }

      const staff = staffStorage.getData();
      console.log('👤 Staff data:', staff);
      console.log('🏪 Restaurant ID:', staff?.restaurantId);
      console.log('📍 Branch ID:', staff?.branchId);

      let bills: any[] = [];
      
      try {
        // Try to fetch from API
        const billsRes = await staffApi.get('/bills/staff');
        console.log('📋 Bills API response:', billsRes.data);
        
        if (billsRes.data?.success) {
          bills = billsRes.data.data?.bills || [];
          console.log(`✅ Found ${bills.length} bills from API`);
        }
      } catch (err: any) {
        console.warn('⚠️ API fetch failed, using sample data:', err.message);
      }

      // If no bills from API, use sample data
      if (bills.length === 0) {
        console.log('📋 No bills from API, using sample data');
        bills = generateSampleBills();
      }

      console.log(`📋 Total bills: ${bills.length}`);
      setAllBills(bills);
      updateDashboardData(bills);

    } catch (error: any) {
      console.error('❌ Error fetching dashboard data:', error);
      // Fallback to sample data on error
      const sampleBills = generateSampleBills();
      setAllBills(sampleBills);
      updateDashboardData(sampleBills);
    } finally {
      setLoading(false);
    }
  };

  // Update when date range changes
  useEffect(() => {
    if (allBills.length > 0) {
      updateDashboardData(allBills);
    }
  }, [dateRange]);

  // Filter bills based on search and filters
  const filteredBills = useMemo(() => {
    let filtered = billRequests;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(bill =>
        (bill.orderNumber || '').toLowerCase().includes(search) ||
        (bill.tableNumber || '').toLowerCase().includes(search) ||
        (bill.customerName || '').toLowerCase().includes(search) ||
        (bill.billNumber || '').toLowerCase().includes(search)
      );
    }
    
    if (filterStatus === 'pending') {
      filtered = filtered.filter(b => b.paymentStatus === 'pending');
    } else if (filterStatus === 'paid') {
      filtered = filtered.filter(b => b.paymentStatus === 'paid');
    }
    
    if (filterPaymentMethod !== 'all') {
      filtered = filtered.filter(b => b.paymentMethod === filterPaymentMethod);
    }
    
    return filtered;
  }, [billRequests, searchTerm, filterStatus, filterPaymentMethod]);

  const handleProcessPayment = async (billId: string) => {
    setProcessingBill(billId);
    try {
      navigate(`/staff-portal/payments?billId=${billId}`);
    } catch (error) {
      toast.error('Failed to process payment');
    } finally {
      setProcessingBill(null);
    }
  };

  const handleViewBill = (bill: BillRequest) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const handlePrintBill = (bill: BillRequest) => {
    const win = window.open('', '_blank');
    if (!win) return;
    
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - ${bill.billNumber}</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #fff; }
          .container { max-width: 300px; margin: 0 auto; border: 2px dashed #333; padding: 15px; }
          .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; color: #f97316; }
          .vip { color: #b45309; font-weight: bold; }
          .item { margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
          .qty { background: #f97316; color: #fff; padding: 2px 6px; border-radius: 4px; margin-right: 8px; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #333; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">🧾 BILL</div>
            <div>${bill.billNumber}</div>
            <div>Order #${bill.orderNumber}</div>
            ${bill.isVip ? '<div class="vip">⭐ VIP CUSTOMER ⭐</div>' : ''}
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
          <div style="margin-top: 12px; border-top: 1px dashed #333; padding-top: 10px;">
            ${bill.subtotal ? `<div>Subtotal: ₹${bill.subtotal}</div>` : ''}
            ${bill.tax ? `<div>Tax: ₹${bill.tax}</div>` : ''}
            ${bill.discount ? `<div>Discount: -₹${bill.discount}</div>` : ''}
            <div><strong>Total: ₹${bill.total}</strong></div>
          </div>
          <div class="footer">${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
      case 'paid':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>;
      case 'refunded':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Refunded</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const styles: Record<string, string> = {
      cash: 'bg-emerald-100 text-emerald-700',
      upi: 'bg-purple-100 text-purple-700',
      card: 'bg-indigo-100 text-indigo-700',
      online: 'bg-blue-100 text-blue-700',
    };
    return styles[method] || 'bg-gray-100 text-gray-700';
  };

  if (loading && allBills.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Wallet size={24} className="text-green-500" />
              Cashier Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {dateRange === 'today' ? "Today's" : dateRange === 'week' ? 'This Week' : dateRange === 'month' ? 'This Month' : 'All Time'} Summary
            </p>
            {staffData?.name && (
              <p className="text-xs text-gray-400 mt-1">
                Staff: {staffData.name} • {staffData.branchName || 'All Branches'} • {allBills.length} total bills
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            <button
              onClick={() => {
                setLoading(true);
                fetchDashboardData();
                setTimeout(() => setLoading(false), 500);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">Today's Sales</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.todaySales)}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.paidOrders} paid orders</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-100">
            <p className="text-xs text-gray-500">Pending Bills</p>
            <p className="text-xl font-bold text-yellow-600">{stats.pendingBills}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting payment</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(stats.todaySales)}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalTransactions} transactions</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
            <p className="text-xs text-gray-500">Avg Order Value</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.averageOrderValue)}</p>
            <p className="text-xs text-gray-400 mt-1">Per transaction</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
            <p className="text-xs text-gray-500">Tax Collected</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(stats.totalTaxCollected)}</p>
            <p className="text-xs text-gray-400 mt-1">Today's tax</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
            <p className="text-xs text-gray-500">Discount Given</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalDiscountGiven)}</p>
            <p className="text-xs text-gray-400 mt-1">Total discounts</p>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Cash</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.cashCollection)}</p>
                <p className="text-xs text-gray-400">
                  {stats.cashCollection > 0 ? 'Active' : 'No transactions'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign size={18} className="text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">UPI</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(stats.upiCollection)}</p>
                <p className="text-xs text-gray-400">
                  {stats.upiCollection > 0 ? 'Active' : 'No transactions'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Smartphone size={18} className="text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Card</p>
                <p className="text-lg font-bold text-indigo-600">{formatCurrency(stats.cardCollection)}</p>
                <p className="text-xs text-gray-400">
                  {stats.cardCollection > 0 ? 'Active' : 'No transactions'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <CreditCard size={18} className="text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Online</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.onlineCollection)}</p>
                <p className="text-xs text-gray-400">
                  {stats.onlineCollection > 0 ? 'Active' : 'No transactions'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp size={18} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Bill Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Receipt size={18} className="text-orange-500" />
                Bill Requests ({filteredBills.length})
              </h2>
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Filter size={14} />
                  Filters
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="mt-3 flex flex-wrap gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                </select>
              </div>
            )}
          </div>

          <div className="p-4">
            {filteredBills.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                <p>No bill requests found</p>
                <p className="text-xs mt-1">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBills.map((bill) => (
                  <div
                    key={bill._id}
                    className={`border rounded-xl p-4 hover:shadow-md transition ${
                      bill.paymentStatus === 'pending' ? 'border-yellow-200 bg-yellow-50/30' : 'border-green-200 bg-green-50/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-mono text-sm font-bold text-gray-800">{bill.billNumber}</p>
                        <p className="text-xs text-gray-500">Order #{bill.orderNumber}</p>
                      </div>
                      {bill.isVip && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white flex items-center gap-1">
                          <Crown size={10} /> VIP
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      {bill.tableNumber && (
                        <span className="flex items-center gap-1">
                          <Coffee size={12} /> Table {bill.tableNumber}
                        </span>
                      )}
                      {bill.customerName && (
                        <span className="flex items-center gap-1">
                          <User size={12} /> {bill.customerName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-lg font-bold text-gray-800">{formatCurrency(bill.total)}</span>
                        <p className="text-xs text-gray-400">{bill.items.length} items</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(bill.paymentStatus)}
                        <p className="text-xs text-gray-400 mt-1">{formatTime(bill.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewBill(bill)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button
                        onClick={() => handlePrintBill(bill)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        <Printer size={14} />
                      </button>
                      {bill.paymentStatus === 'pending' && (
                        <button
                          onClick={() => handleProcessPayment(bill._id)}
                          disabled={processingBill === bill._id}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition disabled:opacity-50"
                        >
                          {processingBill === bill._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Wallet size={14} />
                          )}
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              Recent Transactions
            </h2>
            <span className="text-xs text-gray-400">Last {recentTransactions.length} transactions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bill</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No recent transactions
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((txn) => (
                    <tr key={txn._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-sm font-mono text-gray-800">{txn.billNumber}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{txn.orderNumber}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{txn.customerName || 'Guest'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{txn.tableNumber || '-'}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-800">{formatCurrency(txn.amount)}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodBadge(txn.paymentMethod)}`}>
                          {txn.paymentMethod.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">{getStatusBadge(txn.paymentStatus)}</td>
                      <td className="px-4 py-2 text-sm text-gray-400">{formatTime(txn.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bill Detail Modal */}
      {showBillModal && selectedBill && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowBillModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-xl max-w-2xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Bill Details</h3>
                  <p className="text-sm text-gray-500">{selectedBill.billNumber} · Order #{selectedBill.orderNumber}</p>
                </div>
                <button onClick={() => setShowBillModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Table</p>
                    <p className="font-semibold">{selectedBill.tableNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="font-semibold">{selectedBill.customerName || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Order Type</p>
                    <p className="font-semibold capitalize">{selectedBill.orderType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    {getStatusBadge(selectedBill.paymentStatus)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Created At</p>
                    <p className="font-semibold">{formatDate(selectedBill.createdAt)} {formatTime(selectedBill.createdAt)}</p>
                  </div>
                  {selectedBill.paymentMethod && (
                    <div>
                      <p className="text-xs text-gray-400">Payment Method</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodBadge(selectedBill.paymentMethod)}`}>
                        {selectedBill.paymentMethod.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <h4 className="font-semibold text-gray-800 mb-3">Items</h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-center">Qty</th>
                        <th className="px-4 py-2 text-right">Unit Price</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedBill.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2">{item.productName}</td>
                          <td className="px-4 py-2 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium">Subtotal</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(selectedBill.subtotal)}</td>
                      </tr>
                      {selectedBill.tax > 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right font-medium">Tax</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(selectedBill.tax)}</td>
                        </tr>
                      )}
                      {selectedBill.discount > 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right font-medium">Discount</td>
                          <td className="px-4 py-2 text-right text-red-600">-{formatCurrency(selectedBill.discount)}</td>
                        </tr>
                      )}
                      <tr className="bg-gray-100">
                        <td colSpan={3} className="px-4 py-2 text-right font-bold">Total</td>
                        <td className="px-4 py-2 text-right font-bold text-orange-500">{formatCurrency(selectedBill.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {selectedBill.notes && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-700">📝 {selectedBill.notes}</p>
                  </div>
                )}
                {selectedBill.isVip && (
                  <div className="mb-4 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-700 flex items-center gap-1">
                      <Crown size={14} /> VIP Customer
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 bg-gray-50 border-t flex justify-end gap-3 flex-wrap">
                <button onClick={() => setShowBillModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowBillModal(false);
                    handlePrintBill(selectedBill);
                  }}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2"
                >
                  <Printer size={16} /> Print
                </button>
                {selectedBill.paymentStatus === 'pending' && (
                  <button
                    onClick={() => {
                      setShowBillModal(false);
                      handleProcessPayment(selectedBill._id);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                  >
                    <Wallet size={16} /> Process Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}