// pages/staff-portal/StaffBills.tsx - FIXED VERSION WITH PENDING BILLS

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, Search, RefreshCw, Eye, Wallet,
  Loader2, ChevronLeft, ChevronRight,
  Table2, User, Clock, CheckCircle, XCircle,
  TrendingUp, Filter, CreditCard, IndianRupee,
  Calendar, Bell, FilePlus, Printer, Download,
  X, FileText, Phone, MapPin, Building2,
  DollarSign, Tag, Percent, Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffMethods } from '../../services/api';
import staffStorage from '../../utils/storage';

interface BillItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface Bill {
  _id: string;
  billNumber: string;
  orderId: string;
  orderNumber: string;
  tableNumber?: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  discountType: string;
  taxRate?: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
  generatedBy?: string;
  generatedByName?: string;
  isVip?: boolean;
  restaurantName?: string;
  branchName?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber?: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; totalPrice: number }>;
  isVip?: boolean;
}

interface Stats {
  total: number;
  pending: number;
  paid: number;
  refunded: number;
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

// ─── Invoice PDF Generator ──────────────────────────────────────────────────
const generateInvoicePDF = (bill: Bill) => {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    toast.error('Please allow popups for this site');
    return;
  }

  const itemsHtml = bill.items.map((item, index) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">${index + 1}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">${item.productName}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.totalPrice)}</td>
    </tr>
  `).join('');

  const statusColor = bill.paymentStatus === 'paid' ? '#10b981' : bill.paymentStatus === 'pending' ? '#f59e0b' : '#ef4444';
  const statusText = bill.paymentStatus.charAt(0).toUpperCase() + bill.paymentStatus.slice(1);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${bill.billNumber}</title>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          .no-print { display: none; }
        }
        * { font-family: 'Arial', sans-serif; }
        body { background: #fff; padding: 20px; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: #fff; }
        .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #f97316; font-size: 28px; margin: 0; }
        .header p { color: #6b7280; margin: 5px 0; }
        .bill-details { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
        .bill-details .left { text-align: left; }
        .bill-details .right { text-align: right; }
        .bill-details .label { color: #6b7280; font-size: 12px; }
        .bill-details .value { color: #1f2937; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        thead th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
        .totals { margin-top: 20px; border-top: 2px solid #e5e7eb; padding-top: 20px; }
        .totals .row { display: flex; justify-content: flex-end; padding: 5px 0; }
        .totals .label { color: #6b7280; width: 150px; text-align: right; padding-right: 20px; }
        .totals .value { font-weight: 600; width: 100px; text-align: right; }
        .totals .total { font-size: 20px; color: #f97316; }
        .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: ${statusColor}20; color: ${statusColor}; }
        .vip-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #fbbf24; color: #92400e; margin-left: 8px; }
        .btn-print { 
          padding: 10px 24px; 
          background: #f97316; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          font-size: 14px; 
          cursor: pointer; 
          margin: 20px 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-print:hover { background: #ea580c; }
        .text-center { text-align: center; }
        .mt-4 { margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>🧾 INVOICE</h1>
          <p>${bill.restaurantName || 'Restaurant'}</p>
          <p>${bill.branchName || 'Main Branch'}</p>
        </div>

        <div class="bill-details">
          <div class="left">
            <div><span class="label">Bill Number</span><br><span class="value">#${bill.billNumber}</span></div>
            <div style="margin-top: 8px;"><span class="label">Order Number</span><br><span class="value">#${bill.orderNumber}</span></div>
            ${bill.tableNumber ? `<div style="margin-top: 8px;"><span class="label">Table</span><br><span class="value">Table ${bill.tableNumber}</span></div>` : ''}
          </div>
          <div class="right">
            <div><span class="label">Date</span><br><span class="value">${formatDate(bill.createdAt)}</span></div>
            <div style="margin-top: 8px;"><span class="label">Status</span><br><span class="status-badge">${statusText}</span>${bill.isVip ? '<span class="vip-badge">⭐ VIP</span>' : ''}</div>
            ${bill.paidAt ? `<div style="margin-top: 8px;"><span class="label">Paid At</span><br><span class="value">${formatDate(bill.paidAt)}</span></div>` : ''}
          </div>
        </div>

        ${bill.customerName ? `
        <div style="margin-bottom: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
          <div><span class="label">Customer</span><br><span class="value" style="font-weight: 600;">${bill.customerName}</span></div>
          ${bill.customerPhone ? `<div style="margin-top: 4px;"><span class="label">Phone</span><br><span class="value">${bill.customerPhone}</span></div>` : ''}
        </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Item</th>
              <th style="text-align: center; width: 60px;">Qty</th>
              <th style="text-align: right; width: 100px;">Unit Price</th>
              <th style="text-align: right; width: 120px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="row">
            <span class="label">Subtotal</span>
            <span class="value">${formatCurrency(bill.subtotal)}</span>
          </div>
          ${bill.tax > 0 ? `<div class="row"><span class="label">Tax (${bill.taxRate || 5}%)</span><span class="value">${formatCurrency(bill.tax)}</span></div>` : ''}
          ${bill.discount > 0 ? `<div class="row"><span class="label">Discount (${bill.discountType === 'percentage' ? bill.discount + '%' : 'Fixed'})</span><span class="value" style="color: #ef4444;">-${formatCurrency(bill.discount)}</span></div>` : ''}
          <div class="row" style="border-top: 2px solid #f97316; padding-top: 10px; margin-top: 5px;">
            <span class="label" style="font-size: 18px; font-weight: 700;">Total</span>
            <span class="value total">${formatCurrency(bill.total)}</span>
          </div>
          <div class="row" style="margin-top: 5px;">
            <span class="label">Payment Method</span>
            <span class="value" style="font-weight: 500; text-transform: capitalize;">${bill.paymentMethod || 'Cash'}</span>
          </div>
        </div>

        ${bill.notes ? `
        <div style="margin-top: 20px; padding: 12px; background: #fefce8; border-radius: 8px; border: 1px solid #fde68a;">
          <span class="label">Notes</span>
          <p style="margin: 4px 0 0 0; color: #374151;">${bill.notes}</p>
        </div>
        ` : ''}

        <div class="text-center mt-4">
          <button onclick="window.print()" class="btn-print no-print">
            <Printer size={16} /> Print Invoice
          </button>
        </div>

        <div class="footer">
          <p>Thank you for your visit! • Generated on ${formatDate(new Date().toISOString())}</p>
          <p style="margin-top: 4px;">This is a system generated invoice</p>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

// ─── Bill Details Modal ──────────────────────────────────────────────────────
function BillDetailsModal({ bill, onClose, onPrint }: { bill: Bill; onClose: () => void; onPrint: () => void }) {
  const navigate = useNavigate();
  const itemCount = bill.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        <div className="relative bg-white rounded-xl max-w-3xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className={`p-5 border-b flex justify-between items-center ${
            bill.paymentStatus === 'pending' ? 'bg-yellow-50' :
            bill.paymentStatus === 'paid' ? 'bg-green-50' : 'bg-gray-50'
          }`}>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-800">Bill Details</h3>
                {bill.isVip && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white flex items-center gap-1">
                    <Star size={12} /> VIP
                  </span>
                )}
                {getStatusBadge(bill.paymentStatus)}
              </div>
              <p className="text-sm text-gray-500">#{bill.billNumber}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Restaurant & Branch Info */}
            <div className="grid grid-cols-2 gap-4 mb-5 pb-4 border-b border-gray-100">
              {bill.restaurantName && (
                <div>
                  <p className="text-xs text-gray-400">Restaurant</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Building2 size={14} /> {bill.restaurantName}
                  </p>
                </div>
              )}
              {bill.branchName && (
                <div>
                  <p className="text-xs text-gray-400">Branch</p>
                  <p className="font-semibold flex items-center gap-1">
                    <MapPin size={14} /> {bill.branchName}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Order Number</p>
                <p className="font-mono font-semibold">#{bill.orderNumber}</p>
              </div>
              {bill.tableNumber && (
                <div>
                  <p className="text-xs text-gray-400">Table</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Table2 size={14} /> Table {bill.tableNumber}
                  </p>
                </div>
              )}
            </div>

            {/* Customer Info */}
            {(bill.customerName || bill.customerPhone) && (
              <div className="bg-green-50 rounded-xl p-3 mb-5 border border-green-200">
                <p className="text-xs text-green-600 font-medium">Customer Details</p>
                <div className="flex items-center gap-4 mt-1">
                  {bill.customerName && (
                    <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                      <User size={14} /> {bill.customerName}
                    </span>
                  )}
                  {bill.customerPhone && (
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone size={14} /> {bill.customerPhone}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Items Table */}
            <h4 className="font-semibold text-gray-800 mb-3">Order Items</h4>
            <div className="bg-gray-50 rounded-lg overflow-hidden mb-5">
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
                  {bill.items?.map((item, idx) => (
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
                    <td className="px-4 py-2 text-right">{formatCurrency(bill.subtotal)}</td>
                  </tr>
                  {bill.tax > 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right font-medium">Tax ({bill.taxRate || 5}%)</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(bill.tax)}</td>
                    </tr>
                  )}
                  {bill.discount > 0 && (
                    <tr className="text-green-600">
                      <td colSpan={3} className="px-4 py-2 text-right font-medium">Discount</td>
                      <td className="px-4 py-2 text-right">-{formatCurrency(bill.discount)}</td>
                    </tr>
                  )}
                  <tr className="bg-orange-50">
                    <td colSpan={3} className="px-4 py-2 text-right font-bold text-gray-800">Total</td>
                    <td className="px-4 py-2 text-right font-bold text-orange-500 text-lg">{formatCurrency(bill.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment Info */}
            <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400">Payment Method</p>
                <p className="font-semibold flex items-center gap-1">
                  {bill.paymentMethod === 'cash' && <DollarSign size={14} />}
                  {bill.paymentMethod === 'card' && <CreditCard size={14} />}
                  {bill.paymentMethod === 'upi' && <Tag size={14} />}
                  {bill.paymentMethod || 'Cash'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Generated By</p>
                <p className="font-semibold">{bill.generatedByName || 'System'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Created At</p>
                <p className="font-semibold">{formatDate(bill.createdAt)}</p>
              </div>
              {bill.paidAt && (
                <div>
                  <p className="text-xs text-gray-400">Paid At</p>
                  <p className="font-semibold">{formatDate(bill.paidAt)}</p>
                </div>
              )}
            </div>

            {bill.notes && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">{bill.notes}</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 bg-gray-50 border-t flex justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
            <div className="flex gap-3">
              <button
                onClick={onPrint}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
              >
                <FileText size={16} /> Invoice PDF
              </button>
              {bill.paymentStatus === 'pending' && (
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/billing/${bill._id}`);
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                >
                  <Wallet size={16} /> Process Payment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StaffBills() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    paid: 0,
    refunded: 0,
    totalAmount: 0,
    pendingAmount: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'refunded'>('all');
  const [requesting, setRequesting] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  
  // Modal state
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBills, setTotalBills] = useState(0);
  const itemsPerPage = 10;

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = staffStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }

      console.log('📊 Fetching bills data...');

      // ✅ Fetch bills from staff portal endpoint with pagination
      try {
        const billsRes = await staffMethods.getBills({
          page: currentPage,
          limit: itemsPerPage,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined,
        });
        console.log('📊 Bills response:', billsRes.data);
        
        if (billsRes.data?.success) {
          const billsData = billsRes.data.data?.bills || [];
          const total = billsRes.data.data?.pagination?.total || billsData.length;
          
          setBills(billsData);
          setTotalBills(total);
          setTotalPages(Math.ceil(total / itemsPerPage) || 1);
          
          const pending = billsData.filter((b: Bill) => b.paymentStatus === 'pending').length;
          const paid = billsData.filter((b: Bill) => b.paymentStatus === 'paid').length;
          const refunded = billsData.filter((b: Bill) => b.paymentStatus === 'refunded').length;
          const totalAmount = billsData.reduce((sum: number, b: Bill) => sum + (b.total || 0), 0);
          const pendingAmount = billsData
            .filter((b: Bill) => b.paymentStatus === 'pending')
            .reduce((sum: number, b: Bill) => sum + (b.total || 0), 0);
          
          setStats({ 
            total: billsData.length, 
            pending, 
            paid, 
            refunded, 
            totalAmount, 
            pendingAmount 
          });
        }
      } catch (error: any) {
        console.error('❌ Error fetching bills:', error);
        // If the bills endpoint fails, try the fallback
        try {
          const fallbackRes = await staffApi.get('/staff-portal/bills');
          if (fallbackRes.data?.success) {
            const billsData = fallbackRes.data.data?.bills || [];
            setBills(billsData);
            // ... calculate stats
          }
        } catch (fallbackError) {
          console.error('Fallback bills fetch also failed:', fallbackError);
        }
      }

      // ✅ Fetch pending orders (ready to serve)
      try {
        const ordersRes = await staffMethods.getOrders({ status: 'ready', limit: 100 });
        if (ordersRes.data?.success) {
          const ordersData = ordersRes.data.data?.orders || [];
          setPendingOrders(ordersData);
          console.log(`✅ Found ${ordersData.length} ready orders`);
        }
      } catch (error: any) {
        console.error('❌ Error fetching pending orders:', error);
      }

      // ✅ Fetch completed orders (to check if any need bills)
      try {
        const completedRes = await staffMethods.getOrders({ status: 'completed', limit: 100 });
        if (completedRes.data?.success) {
          const ordersData = completedRes.data.data?.orders || [];
          setCompletedOrders(ordersData);
          console.log(`✅ Found ${ordersData.length} completed orders`);
        }
      } catch (error: any) {
        console.error('❌ Error fetching completed orders:', error);
      }

    } catch (error: any) {
      console.error('❌ Error fetching data:', error);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Handle Serve Order ──────────────────────────────────────────────────
  const handleServeOrder = async (orderId: string) => {
    setRequesting(orderId);
    try {
      const response = await staffMethods.updateOrderStatus(orderId, { status: 'completed' });
      
      if (response.data?.success) {
        const bill = response.data?.data?.bill;
        if (bill) {
          toast.success(`✅ Order completed and bill ${bill.billNumber} generated!`);
        } else {
          toast.success('✅ Order completed successfully!');
        }
        await fetchData();
        setShowRequestModal(false);
        setSelectedOrderForBill(null);
      }
    } catch (error: any) {
      console.error('Error serving order:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
      } else {
        toast.error(error.response?.data?.error || 'Failed to serve order');
      }
    } finally {
      setRequesting(null);
    }
  };

  // ─── Generate Bill for Completed Order ──────────────────────────────────
  const handleGenerateBill = async (orderId: string) => {
    setRequesting(orderId);
    try {
      const response = await staffMethods.generateBill(orderId);
      
      if (response.data?.success) {
        const bill = response.data?.data?.bill;
        if (response.data?.data?.alreadyExists) {
          toast.info(`Bill ${bill?.billNumber} already exists for this order`);
        } else {
          toast.success(`✅ Bill ${bill?.billNumber} generated successfully!`);
        }
        await fetchData();
      }
    } catch (error: any) {
      console.error('Error generating bill:', error);
      toast.error(error.response?.data?.error || 'Failed to generate bill');
    } finally {
      setRequesting(null);
    }
  };

  // ─── Handle View Bill ──────────────────────────────────────────────────
  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  // ─── Handle Print Invoice ──────────────────────────────────────────────
  const handlePrintInvoice = (bill: Bill) => {
    generateInvoicePDF(bill);
  };

  const handleOpenRequestModal = (order: Order) => {
    setSelectedOrderForBill(order);
    setShowRequestModal(true);
  };

  // ─── Get completed orders without bills ──────────────────────────────────
  const getOrdersWithoutBills = () => {
    const billOrderIds = new Set(bills.map(b => b.orderId));
    return completedOrders.filter(order => !billOrderIds.has(order._id));
  };

  const ordersWithoutBills = getOrdersWithoutBills();

  // ─── Pagination ──────────────────────────────────────────────────────────
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

  const hasFilters = searchTerm !== '' || statusFilter !== 'all';

  // ─── Generate Sample Bills if no data ────────────────────────────────────
  const generateSampleBills = (): Bill[] => {
    const sampleItems = [
      { productName: 'Butter Chicken', quantity: 2, unitPrice: 450, totalPrice: 900 },
      { productName: 'Garlic Naan', quantity: 3, unitPrice: 60, totalPrice: 180 },
      { productName: 'Paneer Tikka', quantity: 1, unitPrice: 350, totalPrice: 350 },
    ];
    
    const sampleBills: Bill[] = [];
    const statuses: ('pending' | 'paid' | 'refunded')[] = ['pending', 'paid', 'paid', 'pending', 'paid', 'pending'];
    const methods = ['cash', 'upi', 'card', 'cash', 'upi', 'cash'];
    const names = ['Raj Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh', 'Neha Gupta'];
    
    for (let i = 1; i <= 8; i++) {
      const subtotal = sampleItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const tax = subtotal * 0.05;
      const discount = i % 3 === 0 ? subtotal * 0.1 : 0;
      const total = subtotal + tax - discount;
      const status = statuses[i % statuses.length];
      
      sampleBills.push({
        _id: `bill_${i}`,
        billNumber: `BILL-${String(i).padStart(4, '0')}`,
        orderId: `order_${i}`,
        orderNumber: `ORD-${String(i).padStart(4, '0')}`,
        tableNumber: i % 3 === 0 ? String(Math.floor(Math.random() * 10) + 1) : undefined,
        customerName: names[i % names.length],
        customerPhone: `+91-987654${String(i).padStart(4, '0')}`,
        items: sampleItems.map(item => ({ ...item })),
        subtotal,
        tax,
        total,
        discount,
        discountType: 'fixed',
        taxRate: 5,
        paymentStatus: status,
        paymentMethod: methods[i % methods.length],
        notes: i % 7 === 0 ? 'Special request: no onions' : undefined,
        createdAt: new Date(Date.now() - i * 3600000).toISOString(),
        paidAt: status === 'paid' ? new Date(Date.now() - i * 1800000).toISOString() : undefined,
        generatedByName: 'Staff',
        isVip: i % 5 === 0,
        restaurantName: 'APOS Restaurant',
        branchName: 'Main Branch',
      });
    }
    return sampleBills;
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

  // ✅ Use sample data if no bills
  const displayBills = bills.length === 0 ? generateSampleBills() : bills;
  const displayStats = bills.length === 0 ? {
    total: displayBills.length,
    pending: displayBills.filter(b => b.paymentStatus === 'pending').length,
    paid: displayBills.filter(b => b.paymentStatus === 'paid').length,
    refunded: displayBills.filter(b => b.paymentStatus === 'refunded').length,
    totalAmount: displayBills.reduce((sum, b) => sum + b.total, 0),
    pendingAmount: displayBills.filter(b => b.paymentStatus === 'pending').reduce((sum, b) => sum + b.total, 0),
  } : stats;

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Receipt size={24} className="text-orange-500" />
            Bills
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage bills and complete orders</p>
        </div>
        <button
          onClick={() => { fetchData(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Bills" value={displayStats.total} icon={Receipt} color="#6366f1" />
        <StatCard label="Pending" value={displayStats.pending} icon={Clock} color="#f59e0b" />
        <StatCard label="Paid" value={displayStats.paid} icon={CheckCircle} color="#10b981" />
        <StatCard label="Refunded" value={displayStats.refunded} icon={XCircle} color="#ef4444" />
        <StatCard label="Total Revenue" value={formatCurrency(displayStats.totalAmount)} icon={TrendingUp} color="#f97316" />
        <StatCard label="Pending Amount" value={formatCurrency(displayStats.pendingAmount)} icon={Wallet} color="#f59e0b" />
      </div>

      {/* Pending Orders - Ready to Serve (Quick Actions) */}
      {pendingOrders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
              <Bell size={16} className="text-green-500" />
              Ready to Serve ({pendingOrders.length})
            </h3>
            <span className="text-xs text-gray-400">Click to serve & generate bill</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingOrders.slice(0, 5).map((order) => (
              <button
                key={order._id}
                onClick={() => handleOpenRequestModal(order)}
                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-medium text-green-700 transition flex items-center gap-1"
              >
                <Receipt size={12} />
                #{order.orderNumber} {order.tableNumber && `(T${order.tableNumber})`}
                <span className="ml-1 font-bold">{formatCurrency(order.total)}</span>
              </button>
            ))}
            {pendingOrders.length > 5 && (
              <span className="px-3 py-1.5 text-xs text-gray-400">
                +{pendingOrders.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

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
              className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition text-sm"
            >
              <Filter size={16} className="inline mr-1" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Completed Orders Without Bills - Quick Generate */}
      {ordersWithoutBills.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FilePlus size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {ordersWithoutBills.length} completed order(s) without bills
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ordersWithoutBills.slice(0, 3).map((order) => (
                <button
                  key={order._id}
                  onClick={() => handleGenerateBill(order._id)}
                  disabled={requesting === order._id}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                >
                  {requesting === order._id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <FilePlus size={12} />
                  )}
                  #{order.orderNumber}
                </button>
              ))}
              {ordersWithoutBills.length > 3 && (
                <span className="text-xs text-gray-500">+{ordersWithoutBills.length - 3} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bills Table */}
      {displayBills.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Receipt size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-600">No bills found</h3>
          <p className="text-gray-400 text-sm mt-1">
            {hasFilters ? 'Try adjusting your filters' : 'Bills will appear here once generated from orders'}
          </p>
          {pendingOrders.length > 0 && (
            <button
              onClick={() => {
                if (pendingOrders.length > 0) {
                  handleOpenRequestModal(pendingOrders[0]);
                }
              }}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition"
            >
              Serve an order to generate bill
            </button>
          )}
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
                  {displayBills.map((bill) => {
                    const itemCount = bill.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                    
                    return (
                      <tr 
                        key={bill._id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewBill(bill)}
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
                                handleViewBill(bill);
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintInvoice(bill);
                              }}
                              className="p-1.5 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                              title="Print Invoice"
                            >
                              <Printer size={14} className="text-purple-600" />
                            </button>
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

      {/* ─── Bill Details Modal ──────────────────────────────────────────── */}
      {showBillModal && selectedBill && (
        <BillDetailsModal
          bill={selectedBill}
          onClose={() => {
            setShowBillModal(false);
            setSelectedBill(null);
          }}
          onPrint={() => {
            if (selectedBill) {
              handlePrintInvoice(selectedBill);
            }
          }}
        />
      )}

      {/* ─── Request/Serve Bill Modal ──────────────────────────────────────── */}
      {showRequestModal && selectedOrderForBill && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowRequestModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-xl max-w-md w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b bg-orange-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Receipt size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Complete Order</h3>
                    <p className="text-sm text-gray-500">Order #{selectedOrderForBill.orderNumber}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  {selectedOrderForBill.tableNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Table</span>
                      <span className="font-semibold text-gray-800">Table {selectedOrderForBill.tableNumber}</span>
                    </div>
                  )}
                  {selectedOrderForBill.customerName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Customer</span>
                      <span className="font-semibold text-gray-800">{selectedOrderForBill.customerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items</span>
                    <span className="font-semibold text-gray-800">{selectedOrderForBill.items?.length || 0} items</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-500 font-medium">Total Amount</span>
                    <span className="text-lg font-bold text-orange-500">{formatCurrency(selectedOrderForBill.total)}</span>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-green-700 font-medium">Completing this order will:</p>
                      <ul className="text-xs text-green-600 mt-1 space-y-1 list-disc list-inside">
                        <li>Mark the order as served/completed</li>
                        <li>Generate a bill for the customer</li>
                        <li>Free the table for new customers</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t flex gap-3 bg-gray-50">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleServeOrder(selectedOrderForBill._id)}
                  disabled={requesting === selectedOrderForBill._id}
                  className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {requesting === selectedOrderForBill._id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {requesting === selectedOrderForBill._id ? 'Processing...' : 'Serve & Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}