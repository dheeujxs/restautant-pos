// pages/staff-portal/StaffDashboard.tsx - COMPLETE WITH CASHIER DASHBOARD (uses AuthContext for staff data)

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, ShoppingBag, Clock, ChefHat, Flame,
  CheckCircle, AlertCircle, Users, Utensils, Bell,
  Coffee, Calendar, Loader2, Eye, Award, CoffeeIcon,
  ClipboardList, Crown, Table2, Receipt, Wallet,
  Package, BarChart3, Zap, RefreshCw, ArrowRight,
  Building2, MapPin, Store, Filter, DollarSign,
  CreditCard, Smartphone, IndianRupee, X, Printer,
  Search, ChevronDown, ChevronUp,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import { staffStorage } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

// ─── Types ──────────────────────────────────────────────────────────────
interface DashboardStats {
  totalOrdersToday: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  completedOrders: number;
  activeTables: number;
  totalTables: number;
  kitchenStats: {
    total: number;
    new: number;
    preparing: number;
    ready: number;
    delayed: number;
    vipPending: number;
  };
}

interface OrderQueue {
  _id: string;
  orderNumber: string;
  tableNumber?: string;
  status: string;
  isVip: boolean;
  items: { productName?: string; name?: string; quantity: number; unitPrice: number }[];
  waitTime: number;
  createdAt: string;
  branchId?: string;
  restaurantId?: string;
}

interface TableData {
  _id: string;
  number: string;
  name?: string;
  status: 'available' | 'occupied' | 'reserved';
  floorName?: string;
  branchId?: string;
  restaurantId?: string;
}

interface KotQueueItem {
  itemId: string;
  kotId: string;
  orderNumber: string;
  tableNumber: string;
  productName: string;
  quantity: number;
  prepTimeMinutes: number;
  priority: 'normal' | 'urgent';
  isVip: boolean;
  notes?: string;
  branchId?: string;
  restaurantId?: string;
}

interface Branch {
  _id: string;
  name: string;
  restaurantId: string;
}

// ─── Cashier Types ─────────────────────────────────────────────────────
interface CashierStats {
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

// ─── Shared helper ───────────────────────────────────────────────────────
// Roles can come back from the API as a plain string ("chef") OR as a
// populated object ({ name: "chef", ... }). Every place in this file that
// reads a role now goes through this single normalizer instead of each
// doing its own ad-hoc `typeof` check (previously there were 3 different,
// inconsistent versions of this guard, one of which just silently dropped
// non-string roles, which meant hasRole() could silently return false and
// leave the whole dashboard stuck on the loading spinner).
const normalizeRoleName = (r: any): string | null => {
  if (typeof r === 'string' && r.trim().length > 0) return r;
  if (r && typeof r === 'object' && typeof r.name === 'string' && r.name.trim().length > 0) return r.name;
  return null;
};

// ─── Component ──────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [staff, setStaff] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const isMounted = useRef(true);

  // ─── Get Staff Data — sourced from AuthContext (server-fetched), not local storage ──
  const getStaffData = () => {
    if (!user) return null;
    return user;
  };

  // ─── Check Role — normalizes both string and {name} role shapes ─────
  const hasRole = (roleToCheck: string) => {
    const staffData = getStaffData();
    if (!staffData) return false;
    const rawRoles: any[] =
      staffData.allRoles && staffData.allRoles.length > 0 ? staffData.allRoles : [staffData.role];
    return rawRoles
      .map(normalizeRoleName)
      .filter((r: string | null): r is string => !!r)
      .some((r) => r.toLowerCase() === roleToCheck.toLowerCase());
  };

  const isCashier = hasRole('cashier');
  const isChef = hasRole('chef') || hasRole('cook') || hasRole('section_chef') || hasRole('helper') || hasRole('kot_staff');
  const isWaiter = hasRole('waiter');
  const isManager = hasRole('manager') || hasRole('admin');

  // ─── Clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Cleanup ─────────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ─── Render Role-Based Dashboard ────────────────────────────────────
  if (isCashier) {
    return <CashierDashboard
      staff={staff}
      setStaff={setStaff}
      loading={loading}
      setLoading={setLoading}
      error={error}
      setError={setError}
      branches={branches}
      setBranches={setBranches}
      selectedBranchId={selectedBranchId}
      setSelectedBranchId={setSelectedBranchId}
      showFilters={showFilters}
      setShowFilters={setShowFilters}
      currentTime={currentTime}
      navigate={navigate}
      getStaffData={getStaffData}
      hasRole={hasRole}
    />;
  }

  if (isChef || isWaiter || isManager) {
    return <StaffRoleDashboard
      staff={staff}
      setStaff={setStaff}
      loading={loading}
      setLoading={setLoading}
      error={error}
      setError={setError}
      branches={branches}
      setBranches={setBranches}
      selectedBranchId={selectedBranchId}
      setSelectedBranchId={setSelectedBranchId}
      showFilters={showFilters}
      setShowFilters={setShowFilters}
      currentTime={currentTime}
      navigate={navigate}
      getStaffData={getStaffData}
      isChef={isChef}
      isWaiter={isWaiter}
      isManager={isManager}
      hasRole={hasRole}
    />;
  }

  // ─── Still waiting on auth to resolve ────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── User loaded, but no role we know how to render a dashboard for ──
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">No dashboard available for your role</p>
        <p className="text-gray-400 text-sm mt-1">
          Contact your manager or admin if you believe this is a mistake.
        </p>
      </div>
    </div>
  );
}

// ─── CASHIER DASHBOARD ─────────────────────────────────────────────────
function CashierDashboard({
  staff, setStaff, loading, setLoading, error, setError,
  branches, setBranches, selectedBranchId, setSelectedBranchId,
  showFilters, setShowFilters, currentTime, navigate, getStaffData,
  hasRole
}: any) {
  const [stats, setStats] = useState<CashierStats>({
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
  const [allBills, setAllBills] = useState<BillRequest[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<BillRequest | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [processingBill, setProcessingBill] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [showFiltersCashier, setShowFiltersCashier] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ─── Generate Sample Bills (fallback only, used when the API has no data) ──
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

  const updateCashierData = (bills: BillRequest[]) => {
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

    setBillRequests(filteredBills);

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

    setStats(newStats);

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

  // ─── Fetch bills from the API, falling back to sample data only if the
  // API call fails or returns nothing. ────────────────────────────────
  const fetchCashierData = useCallback(async () => {
    try {
      // Check if user is logged in using the storage method
      if (!staffStorage.isLoggedIn()) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }

      let bills: any[] = [];
      try {
        const billsRes = await staffApi.get('/bills/staff');
        if (billsRes.data?.success) {
          bills = billsRes.data.data?.bills || [];
        }
      } catch (err) {
        console.warn('⚠️ API fetch failed, using sample data:', err);
      }

      if (bills.length === 0) {
        bills = generateSampleBills();
      }

      if (isMounted.current) {
        setAllBills(bills);
      }
    } catch (error) {
      console.error('❌ Error fetching cashier data:', error);
      if (isMounted.current) {
        setAllBills(generateSampleBills());
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ─── Initial load: show sample data immediately so the screen isn't
  // blank, then kick off the real fetch and a refresh interval. ────────
  useEffect(() => {
    const data = getStaffData();
    setStaff(data);
    setAllBills(generateSampleBills());
    fetchCashierData();
    const interval = setInterval(fetchCashierData, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Recompute derived stats/lists whenever the bills we have OR the
  // selected date range change. ────────────────────────────────────────
  useEffect(() => {
    if (allBills.length > 0) {
      updateCashierData(allBills);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBills, dateRange]);

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
      case 'pending': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
      case 'paid': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>;
      case 'refunded': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Refunded</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
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
          <p className="text-gray-500">Loading cashier dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Cashier Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Wallet size={24} className="text-green-500" />
            Cashier Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {dateRange === 'today' ? "Today's" : dateRange === 'week' ? 'This Week' : dateRange === 'month' ? 'This Month' : 'All Time'} Summary
          </p>
          {staff?.name && (
            <p className="text-xs text-gray-400 mt-1">
              Staff: {staff.name} • {staff.branchName || 'All Branches'}
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
              fetchCashierData();
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
                onClick={() => setShowFiltersCashier(!showFiltersCashier)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <Filter size={14} />
                Filters
              </button>
            </div>
          </div>
          {showFiltersCashier && (
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

// ─── STAFF ROLE DASHBOARD (Chef/Waiter/Manager) ──────────────────────
function StaffRoleDashboard({
  staff, setStaff, loading, setLoading, error, setError,
  branches, setBranches, selectedBranchId, setSelectedBranchId,
  showFilters, setShowFilters, currentTime, navigate, getStaffData,
  isChef, isWaiter, isManager, hasRole
}: any) {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrdersToday: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    completedOrders: 0,
    activeTables: 0,
    totalTables: 0,
    kitchenStats: {
      total: 0,
      new: 0,
      preparing: 0,
      ready: 0,
      delayed: 0,
      vipPending: 0,
    },
  });
  const [orderQueue, setOrderQueue] = useState<OrderQueue[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [kotQueue, setKotQueue] = useState<KotQueueItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useRef<HTMLDivElement | null>(null);
  const isMounted = useRef(true);

  // ─── Cleanup ──────────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // ─── Fetch Branches ──────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    try {
      const staffData = getStaffData();
      if (!staffData || !staffData.restaurantId) return;

      const branchesRes = await staffApi.get(`/branches?restaurantId=${staffData.restaurantId}&limit=100`);
      if (branchesRes.data?.success) {
        const branchesData = branchesRes.data.data?.branches || [];
        setBranches(branchesData);
        if (staffData.branchId && branchesData.some(b => b._id === staffData.branchId)) {
          setSelectedBranchId(staffData.branchId);
        } else if (branchesData.length > 0) {
          setSelectedBranchId(branchesData[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, []);

  // ─── Fetch Dashboard Data ────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const staffToken = staffStorage.getToken();
      const staffData = getStaffData();
      const permissions = staffData?.permissions || [];

      if (!staffToken) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }

      setStaff(staffData);

      const filterParams = new URLSearchParams();
      if (staffData?.restaurantId) filterParams.append('restaurantId', staffData.restaurantId);
      if (selectedBranchId && selectedBranchId !== 'all') filterParams.append('branchId', selectedBranchId);
      const filterString = filterParams.toString();

      const hasKotPermission = hasPermission(permissions, PERMISSIONS.VIEW_KOT) || isChef;

      const promises = [
        staffApi.get(`/staff-portal/orders?limit=1000&${filterString}`),
        staffApi.get(`/staff-portal/tables?${filterString}`),
      ];

      if (hasKotPermission) {
        promises.push(staffApi.get(`/staff-portal/kot/stats?${filterString}`));
        promises.push(staffApi.get(`/staff-portal/kot/queue?${filterString}`));
      }

      const results = await Promise.allSettled(promises);

      let orders: any[] = [];
      if (results[0].status === 'fulfilled') {
        orders = results[0].value.data?.data?.orders || results[0].value.data?.orders || [];
      }

      let tablesData: TableData[] = [];
      let activeTables = 0;

      if (results[1].status === 'fulfilled' && results[1].value.data?.success) {
        tablesData = results[1].value.data.data?.tables || [];
        activeTables = tablesData.filter((t: any) => t.status === 'occupied' || t.status === 'reserved').length;
        setTables(tablesData);
      }

      let kitchenStats = { total: 0, new: 0, preparing: 0, ready: 0, delayed: 0, vipPending: 0 };

      if (hasKotPermission && results.length > 2 && results[2]?.status === 'fulfilled') {
        const kotStatsData = results[2].value.data?.data;
        if (kotStatsData) kitchenStats = kotStatsData;
      } else {
        const preparing = orders.filter((o: any) => o.orderStatus === 'preparing' || o.orderStatus === 'confirmed');
        const ready = orders.filter((o: any) => o.orderStatus === 'ready');
        const pending = orders.filter((o: any) => o.orderStatus === 'pending');
        const delayed = orders.filter((o: any) => {
          const waitTime = (Date.now() - new Date(o.createdAt).getTime()) / 60000;
          return waitTime > 20 && ['pending', 'confirmed', 'preparing'].includes(o.orderStatus);
        });
        const vipPending = orders.filter((o: any) => o.isVip && ['pending', 'confirmed', 'preparing'].includes(o.orderStatus));
        kitchenStats = { total: orders.length, new: pending.length, preparing: preparing.length, ready: ready.length, delayed: delayed.length, vipPending: vipPending.length };
      }

      let kotItems: KotQueueItem[] = [];

      if (hasKotPermission && results.length > 3 && results[3]?.status === 'fulfilled') {
        const kotQueueData = results[3].value.data?.data?.queue || [];
        kotItems = kotQueueData;
        setKotQueue(kotItems);
        setHasMore(kotItems.length === 15);
      } else if (hasKotPermission) {
        kotItems = orders
          .filter((o: any) => ['pending', 'confirmed', 'preparing'].includes(o.orderStatus))
          .flatMap((o: any) => (o.items || []).map((item: any) => ({
            itemId: item._id || `${o._id}_${Math.random()}`,
            kotId: o._id,
            orderNumber: o.orderNumber,
            tableNumber: o.tableNumber || '',
            productName: item.productName || item.name || 'Item',
            quantity: item.quantity || 1,
            prepTimeMinutes: item.prepTime || 5,
            priority: o.isVip ? 'urgent' : 'normal',
            isVip: o.isVip || false,
            notes: item.notes || '',
            branchId: o.branchId,
            restaurantId: o.restaurantId,
          })))
          .slice(0, 15);
        setKotQueue(kotItems);
        setHasMore(kotItems.length === 15);
      }

      const today = new Date().toDateString();
      const todayOrders = orders.filter((o: any) => new Date(o.createdAt).toDateString() === today);
      const pending = orders.filter((o: any) => o.orderStatus === 'pending' || o.orderStatus === 'confirmed');
      const preparing = orders.filter((o: any) => o.orderStatus === 'preparing');
      const ready = orders.filter((o: any) => o.orderStatus === 'ready');
      const completed = orders.filter((o: any) => o.orderStatus === 'completed');

      const orderQueueData = orders
        .filter((o: any) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.orderStatus))
        .map((o: any) => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          tableNumber: o.tableNumber,
          status: o.orderStatus,
          isVip: o.isVip || false,
          items: o.items || [],
          waitTime: Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000),
          createdAt: o.createdAt,
          branchId: o.branchId,
          restaurantId: o.restaurantId,
        }))
        .sort((a: any, b: any) => {
          if (a.isVip && !b.isVip) return -1;
          if (!a.isVip && b.isVip) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      setOrderQueue(orderQueueData);
      setPage(1);

      const newStats = {
        totalOrdersToday: todayOrders.length,
        pendingOrders: pending.length,
        preparingOrders: preparing.length,
        readyOrders: ready.length,
        completedOrders: completed.length,
        activeTables,
        totalTables: tablesData.length,
        kitchenStats: kitchenStats,
      };
      setStats(newStats);

    } catch (error: any) {
      console.error('❌ Error fetching dashboard data:', error);
      setError(error.message || 'Failed to load dashboard');

      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [navigate, selectedBranchId, isChef]);

  // ─── Load More ────────────────────────────────────────────────────────
  const loadMoreKotItems = useCallback(async () => {
    const staffData = getStaffData();
    const permissions = staffData?.permissions || [];
    const hasKotPermission = hasPermission(permissions, PERMISSIONS.VIEW_KOT) || isChef;

    if (!hasKotPermission || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const filterParams = new URLSearchParams();
      if (staffData?.restaurantId) filterParams.append('restaurantId', staffData.restaurantId);
      if (selectedBranchId && selectedBranchId !== 'all') filterParams.append('branchId', selectedBranchId);
      filterParams.append('page', String(nextPage));

      const response = await staffApi.get(`/staff-portal/kot/queue?${filterParams.toString()}`);
      const newItems = response.data.data?.queue || [];
      if (isMounted.current && newItems.length > 0) {
        setKotQueue(prev => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(newItems.length === 15);
      } else if (isMounted.current) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more KOTs:', error);
    } finally {
      if (isMounted.current) setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, selectedBranchId, isChef]);

  // ─── Initial Load ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (branches.length > 0 || selectedBranchId) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, selectedBranchId]);

  // ─── Intersection Observer ──────────────────────────────────────────
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const staffData = getStaffData();
    const permissions = staffData?.permissions || [];
    const hasKotPermission = hasPermission(permissions, PERMISSIONS.VIEW_KOT) || isChef;

    if (!hasKotPermission || !hasMore || loadingMore || kotQueue.length === 0) return;

    const currentLastItem = lastItemRef.current;
    if (!currentLastItem) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreKotItems();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observer.observe(currentLastItem);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [hasMore, loadingMore, kotQueue.length, loadMoreKotItems]);

  // ─── Helpers ──────────────────────────────────────────────────────────
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
      case 'confirmed': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Confirmed</span>;
      case 'preparing': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Preparing</span>;
      case 'ready': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Ready</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getTableStatusBadge = (status: TableData['status']) => {
    switch (status) {
      case 'occupied': return 'bg-red-100 text-red-700';
      case 'reserved': return 'bg-yellow-100 text-yellow-700';
      case 'available':
      default: return 'bg-green-100 text-green-700';
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
    toast.success('Dashboard refreshed');
  };

  const staffData = getStaffData();
  const staffName = staffData?.name || 'Staff';
  const roleName = normalizeRoleName(staffData?.role) || 'Staff';
  const allRoles = [...new Set(
    (staffData?.allRoles && staffData.allRoles.length > 0 ? staffData.allRoles : [roleName])
      .map((r: any) => normalizeRoleName(r) || 'Staff')
  )];
  const hasMultipleRoles = allRoles.length > 1;

  const renderRoleBadge = () => {
    if (isChef) return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-sm font-medium">👨‍🍳 Chef View</span>;
    if (isWaiter) return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium">👨‍💼 Waiter View</span>;
    if (isManager) return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm font-medium">👔 Manager View</span>;
    return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">👤 Staff View</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Failed to Load Dashboard</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2 w-full"
          >
            <RefreshCw size={18} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-800">
                  {getGreeting()}, {staffName.split(' ')[0]}!
                </h1>
                {renderRoleBadge()}
                {hasMultipleRoles && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    +{allRoles.length - 1} more roles
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {formatTime(currentTime)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <div className="bg-white rounded-lg px-3 py-1.5 shadow-sm border border-gray-100">
                <span className="text-xs text-gray-500">ID: </span>
                <span className="text-xs font-mono font-semibold">{staffData?.employeeId}</span>
              </div>
            </div>
          </div>

          {/* Branch Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-500 transition"
              >
                <Building2 size={16} />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {selectedBranchId && selectedBranchId !== 'all'
                    ? branches.find(b => b._id === selectedBranchId)?.name || 'Branch'
                    : 'All Branches'
                  }
                </span>
              </button>

              {selectedBranchId && selectedBranchId !== 'all' && (
                <span className="text-xs text-gray-400">
                  📍 {branches.find((b: Branch) => b._id === selectedBranchId)?.name || 'Selected Branch'}
                </span>
              )}
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Store size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Restaurant:</span>
                  <span className="text-xs font-medium text-gray-700">
                    {staffData?.restaurantName || 'Current Restaurant'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Branch:</span>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      setPage(1);
                    }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="all">All Branches</option>
                    {branches.map((branch: Branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {selectedBranchId && selectedBranchId !== 'all' && (
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                      📍 {branches.find((b: Branch) => b._id === selectedBranchId)?.name}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedBranchId('all');
                      setPage(1);
                    }}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            {(isChef || hasRole('chef') || hasRole('cook')) && (
              <button
                onClick={() => navigate('/staff-portal/orders')}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition flex items-center gap-2"
              >
                <Flame size={16} />
                View Live Orders
              </button>
            )}
            {(isWaiter || hasRole('waiter')) && (
              <button
                onClick={() => navigate('/staff-portal/tables')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-2"
              >
                <Table2 size={16} />
                My Tables
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.totalOrdersToday}</p>
                <p className="text-xs text-gray-500">Today's Orders</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <ShoppingBag size={18} className="text-orange-500" />
              </div>
            </div>
          </div>

          {(isChef || hasRole('chef') || hasRole('cook') || hasRole('section_chef')) && (
            <>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.kitchenStats.new + stats.kitchenStats.preparing}</p>
                    <p className="text-xs text-gray-500">In Progress</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock size={18} className="text-yellow-500" />
                  </div>
                </div>
                <div className="mt-1 flex gap-2 text-xs">
                  <span className="text-yellow-600">{stats.kitchenStats.new} new</span>
                  <span className="text-blue-600">{stats.kitchenStats.preparing} preparing</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.kitchenStats.ready}</p>
                    <p className="text-xs text-gray-500">Ready to Serve</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-red-600">{stats.kitchenStats.delayed}</p>
                    <p className="text-xs text-gray-500">Delayed Orders</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle size={18} className="text-red-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.kitchenStats.vipPending}</p>
                    <p className="text-xs text-gray-500">VIP Pending</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Crown size={18} className="text-yellow-500" />
                  </div>
                </div>
              </div>
            </>
          )}

          {(isWaiter || hasRole('waiter')) && (
            <>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{stats.activeTables}</p>
                    <p className="text-xs text-gray-500">Active Tables</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Table2 size={18} className="text-blue-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                    <p className="text-xs text-gray-500">Pending Orders</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock size={18} className="text-yellow-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.readyOrders}</p>
                    <p className="text-xs text-gray-500">Ready Orders</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Chef Content */}
        {(isChef || hasRole('chef') || hasRole('cook') || hasRole('section_chef') || hasRole('kot_staff')) && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Queue */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Bell size={16} className="text-orange-500" />
                      Live Order Queue
                      {selectedBranchId && selectedBranchId !== 'all' && (
                        <span className="text-xs text-gray-400 ml-2">
                          • {branches.find((b: Branch) => b._id === selectedBranchId)?.name}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Orders waiting to be processed</p>
                  </div>
                  <button onClick={() => navigate('/staff-portal/orders')} className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
                    View all <span>→</span>
                  </button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {orderQueue.length > 0 ? (
                    orderQueue.map((order) => (
                      <div key={order._id} className={`flex items-center justify-between p-3 rounded-lg transition cursor-pointer ${order.isVip ? 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200' : 'bg-gray-50 hover:bg-orange-50'}`} onClick={() => navigate(`/staff-portal/orders?orderId=${order._id}`)}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <span className="font-mono text-sm font-bold text-gray-800">#{order.orderNumber}</span>
                            {order.tableNumber && <span className="text-xs text-gray-500">Table {order.tableNumber}</span>}
                            {order.isVip && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">VIP</span>}
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <span key={`${order._id}-item-${idx}`} className="text-xs text-gray-600">{item.productName || item.name}</span>
                            ))}
                            {order.items.length > 3 && <span className="text-xs text-gray-400">+{order.items.length - 3} more</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-medium ${order.waitTime > 20 ? 'text-red-500' : order.waitTime > 10 ? 'text-orange-500' : 'text-green-600'}`}>{order.waitTime} min</p>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/staff-portal/orders?orderId=${order._id}`); }} className="mt-1 text-xs text-orange-500 hover:text-orange-600">Update</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400 py-8">No pending orders. Great job! 🎉</p>
                  )}
                </div>
              </div>

              {/* Kitchen Queue */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <ClipboardList size={16} className="text-orange-500" />
                      Kitchen Queue
                      {selectedBranchId && selectedBranchId !== 'all' && (
                        <span className="text-xs text-gray-400 ml-2">
                          • {branches.find((b: Branch) => b._id === selectedBranchId)?.name}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">VIP first • Less prep time first</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {kotQueue.length > 0 ? (
                    kotQueue.map((item, index) => (
                      <div key={item.itemId} ref={index === kotQueue.length - 1 ? lastItemRef : null} className={`p-3 rounded-lg transition cursor-pointer ${item.isVip ? 'bg-yellow-50 border-l-4 border-yellow-500' : item.priority === 'urgent' ? 'bg-red-50 border-l-4 border-red-500' : 'bg-gray-50 hover:bg-gray-100'}`} onClick={() => navigate(`/staff-portal/kot/${item.kotId}`)}>
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-gray-800">{item.orderNumber}</span>
                            <span className="text-xs text-gray-500">Table {item.tableNumber}</span>
                            {item.isVip ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">VIP</span> : item.priority === 'urgent' ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">Urgent</span> : null}
                          </div>
                          <span className="text-xs text-gray-400">{item.prepTimeMinutes} min</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-medium text-gray-800">{item.quantity} × {item.productName}</span>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/staff-portal/kot/${item.kotId}`); }} className="text-xs text-orange-500 hover:text-orange-600">Start</button>
                        </div>
                        {item.notes && <p className="text-xs text-gray-400 mt-1 truncate">📝 {item.notes}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400 py-8">No pending items in kitchen queue</p>
                  )}
                  {loadingMore && <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-orange-500" /></div>}
                </div>
              </div>
            </div>

            {/* Active Tables */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CoffeeIcon size={16} className="text-orange-500" />
                Active Tables ({stats.activeTables})
                {selectedBranchId && selectedBranchId !== 'all' && (
                  <span className="text-xs text-gray-400 ml-2">
                    • {branches.find((b: Branch) => b._id === selectedBranchId)?.name}
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tables.length > 0 ? (
                  tables.map((table) => (
                    <div key={table._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-800">Table {table.number}</span>
                        {table.name && <span className="text-xs text-gray-400 ml-1">({table.name})</span>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getTableStatusBadge(table.status)}`}>
                        {table.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-4 col-span-full">No active tables</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Waiter Content */}
        {(isWaiter || hasRole('waiter')) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Table2 size={16} className="text-blue-500" />
                  My Tables
                  {selectedBranchId && selectedBranchId !== 'all' && (
                    <span className="text-xs text-gray-400 ml-2">
                      • {branches.find((b: Branch) => b._id === selectedBranchId)?.name}
                    </span>
                  )}
                </h3>
                <button onClick={() => navigate('/staff-portal/tables')} className="text-xs text-blue-500 hover:text-blue-600">
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {tables.slice(0, 6).map((table) => (
                  <div key={table._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">Table {table.number}</span>
                      {table.name && <span className="text-xs text-gray-400 ml-1">({table.name})</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTableStatusBadge(table.status)}`}>
                      {table.status}
                    </span>
                  </div>
                ))}
                {tables.length === 0 && <p className="text-center text-gray-400 py-4">No tables assigned</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Clock size={16} className="text-yellow-500" />
                  Pending Orders
                  {selectedBranchId && selectedBranchId !== 'all' && (
                    <span className="text-xs text-gray-400 ml-2">
                      • {branches.find((b: Branch) => b._id === selectedBranchId)?.name}
                    </span>
                  )}
                </h3>
                <button onClick={() => navigate('/staff-portal/orders')} className="text-xs text-yellow-500 hover:text-yellow-600">
                  View All →
                </button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {orderQueue.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing').map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-50 transition" onClick={() => navigate(`/staff-portal/orders?orderId=${order._id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-800">#{order.orderNumber}</span>
                        {order.tableNumber && <span className="text-xs text-gray-500">Table {order.tableNumber}</span>}
                        {order.isVip && <span className="text-xs text-yellow-500">⭐ VIP</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {order.items.length} items · {order.waitTime} min waiting
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                ))}
                {orderQueue.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing').length === 0 &&
                  <p className="text-center text-gray-400 py-4">No pending orders 🎉</p>
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}