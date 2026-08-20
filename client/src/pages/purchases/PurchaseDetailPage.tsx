import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import {
  ArrowLeft, Printer, RefreshCw, Loader2, AlertCircle,
  Truck, Calendar, FileText, Package, DollarSign,
  Building2, User, Phone, Mail, MapPin, CheckCircle,
  XCircle, Clock, Edit2, Trash2, Eye, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IPurchaseItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  lineTotal: number;
}

interface IPurchase {
  _id: string;
  purchaseNumber: string;
  supplierId: {
    _id: string;
    supplierName: string;
    phoneNumber: string;
    email: string;
    address: string;
  };
  supplierName: string;
  purchaseDate: string;
  invoiceNumber: string;
  notes: string;
  totalAmount: number;
  status: 'pending' | 'received' | 'cancelled';
  items: IPurchaseItem[];
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: '#f59e0b', bg: '#fef3c7', icon: Clock };
    case 'received':
      return { label: 'Received', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle };
    case 'cancelled':
      return { label: 'Cancelled', color: '#ef4444', bg: '#fef2f2', icon: XCircle };
    default:
      return { label: status, color: '#6b7280', bg: '#f3f4f6', icon: Clock };
  }
};

export default function PurchaseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [purchase, setPurchase] = useState<IPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  useEffect(() => {
    fetchPurchase();
  }, [id]);

  const fetchPurchase = async () => {
    try {
      const res = await api.get(`/purchases/${id}`);
      if (res.data.success) {
        setPurchase(res.data.data);
      } else {
        toast.error('Purchase order not found');
        navigate('/purchases');
      }
    } catch (error) {
      console.error('Failed to fetch purchase:', error);
      toast.error('Failed to load purchase details');
      navigate('/purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!purchase || !newStatus) return;
    setUpdating(true);
    try {
      const res = await api.patch(`/purchases/${purchase._id}/status`, { status: newStatus });
      if (res.data.success) {
        if (res.data.stockUpdates) {
          toast.success(`Purchase order marked as ${newStatus} and stock updated!`);
        } else {
          toast.success(`Purchase order status updated to ${newStatus}`);
        }
        fetchPurchase();
        setShowStatusModal(false);
        setNewStatus('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    if (!purchase) return;
    const win = window.open('', '_blank');
    if (!win) return;
    
    const statusConfig = getStatusConfig(purchase.status);
    
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${purchase.purchaseNumber}</title>
        <style>
          body { font-family: 'DM Sans', sans-serif; padding: 40px; background: #fff; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #f97316; }
          .po-number { font-size: 18px; color: #374151; margin-top: 5px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: ${statusConfig.bg}; color: ${statusConfig.color}; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-card { background: #f9fafb; padding: 15px; border-radius: 8px; }
          .info-label { font-size: 11px; text-transform: uppercase; color: #9ca3af; margin-bottom: 5px; }
          .info-value { font-size: 14px; font-weight: 500; color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f9fafb; padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          .total-row { background: #f9fafb; font-weight: bold; }
          .footer { text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">PURCHASE ORDER</div>
            <div class="po-number">${purchase.purchaseNumber}</div>
            <div style="margin-top: 10px;"><span class="status-badge">${statusConfig.label}</span></div>
          </div>
          
          <div class="info-grid">
            <div class="info-card">
              <div class="info-label">Supplier Details</div>
              <div class="info-value">${purchase.supplierName}</div>
              <div class="info-value" style="font-size: 12px;">${purchase.supplierId?.phoneNumber || ''}</div>
              <div class="info-value" style="font-size: 12px;">${purchase.supplierId?.email || ''}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Order Details</div>
              <div class="info-value">Date: ${new Date(purchase.purchaseDate).toLocaleDateString()}</div>
              ${purchase.invoiceNumber ? `<div class="info-value">Invoice: ${purchase.invoiceNumber}</div>` : ''}
              <div class="info-value">Created: ${new Date(purchase.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr><th>Item</th><th>Quantity</th><th>Unit</th><th>Cost Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${purchase.items.map(item => `
                <tr>
                  <td>${item.ingredientName}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>₹${item.costPrice.toFixed(2)}</td>
                  <td>₹${item.lineTotal.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row"><td colspan="4" style="text-align: right;"><strong>Total Amount</strong></td><td><strong>₹${purchase.totalAmount.toFixed(2)}</strong></td></tr>
            </tbody>
          </table>
          
          ${purchase.notes ? `<div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 20px;"><div style="font-size: 12px; font-weight: 600; color: #92400e;">Notes</div><div style="font-size: 13px; color: #78350f;">${purchase.notes}</div></div>` : ''}
          
          <div class="footer">
            <p>${purchase.purchaseNumber} - Generated on ${new Date().toLocaleString()}</p>
            <p>Thank you for your business!</p>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!purchase) return null;

  const statusConfig = getStatusConfig(purchase.status);
  const StatusIcon = statusConfig.icon;
  const canEdit = purchase.status === 'pending';
  const canReceive = purchase.status === 'pending';
  const canCancel = purchase.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/purchases')} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-800">Purchase Order</h1>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium`} style={{ background: statusConfig.bg, color: statusConfig.color }}>
                  <StatusIcon size={14} /> {statusConfig.label}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">{purchase.purchaseNumber}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-200 transition">
              <Printer size={14} /> Print
            </button>
            <button onClick={fetchPurchase} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
              <RefreshCw size={14} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Package size={18} className="text-orange-500" /> Purchase Items
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Quantity</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Unit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Cost Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {purchase.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.ingredientName}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-500">{item.unit}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">₹{item.costPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">₹{item.lineTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-800">Total Amount</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-500 text-lg">₹{purchase.totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {purchase.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" /> Notes
                </h3>
                <p className="text-gray-600 text-sm">{purchase.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar Info */}
          <div className="space-y-6">
            {/* Supplier Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-blue-500" /> Supplier Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Supplier Name</p>
                  <p className="text-sm font-medium text-gray-800">{purchase.supplierName}</p>
                </div>
                {purchase.supplierId?.phoneNumber && (
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-sm text-gray-600">{purchase.supplierId.phoneNumber}</p>
                  </div>
                )}
                {purchase.supplierId?.email && (
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm text-gray-600">{purchase.supplierId.email}</p>
                  </div>
                )}
                {purchase.supplierId?.address && (
                  <div>
                    <p className="text-xs text-gray-400">Address</p>
                    <p className="text-sm text-gray-600">{purchase.supplierId.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-purple-500" /> Order Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Purchase Date</p>
                  <p className="text-sm font-medium text-gray-800">{new Date(purchase.purchaseDate).toLocaleDateString()}</p>
                </div>
                {purchase.invoiceNumber && (
                  <div>
                    <p className="text-xs text-gray-400">Invoice Number</p>
                    <p className="text-sm text-gray-600">{purchase.invoiceNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Created By</p>
                  <p className="text-sm text-gray-600">{purchase.createdBy?.firstName} {purchase.createdBy?.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Created At</p>
                  <p className="text-sm text-gray-600">{new Date(purchase.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Actions</h3>
              <div className="space-y-2">
                {canEdit && (
                  <button onClick={() => navigate(`/purchases/${purchase._id}/edit`)} className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-orange-600 transition">
                    <Edit2 size={14} /> Edit Purchase Order
                  </button>
                )}
                {canReceive && (
                  <button onClick={() => { setNewStatus('received'); setShowStatusModal(true); }} className="w-full py-2 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-600 transition">
                    <CheckCircle size={14} /> Mark as Received
                  </button>
                )}
                {canCancel && (
                  <button onClick={() => { setNewStatus('cancelled'); setShowStatusModal(true); }} className="w-full py-2 bg-red-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition">
                    <XCircle size={14} /> Cancel Order
                  </button>
                )}
                <button onClick={() => navigate('/purchases')} className="w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition">
                  Back to List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Update Status</h3>
            </div>
            <div className="p-5">
              <div className={`flex items-center gap-3 p-3 rounded-xl ${newStatus === 'received' ? 'bg-green-50' : 'bg-red-50'}`}>
                {newStatus === 'received' ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
                <p className={`text-sm ${newStatus === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                  {newStatus === 'received' 
                    ? `Mark ${purchase?.purchaseNumber} as received? Stock will be updated.` 
                    : `Cancel ${purchase?.purchaseNumber}? This action cannot be undone.`}
                </p>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setShowStatusModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">No</button>
              <button onClick={handleStatusUpdate} disabled={updating} className={`flex-1 py-2 rounded-lg text-white ${newStatus === 'received' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} disabled:opacity-50`}>
                {updating ? <Loader2 size={16} className="animate-spin mx-auto" /> : (newStatus === 'received' ? 'Yes, Mark Received' : 'Yes, Cancel Order')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}