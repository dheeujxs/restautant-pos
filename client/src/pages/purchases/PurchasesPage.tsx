// pages/PurchasesPage.tsx - FIXED (Delete button hidden for received purchases)

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import {
  Plus, Eye, Edit2, Trash2, Search, X, RefreshCw,
  Building2, Package, Truck, CheckCircle, XCircle,
  AlertCircle, Loader2, FileText, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IPurchase {
  _id: string;
  purchaseNumber: string;
  supplierId: { _id: string; supplierName: string; phoneNumber: string };
  supplierName: string;
  purchaseDate: string;
  invoiceNumber: string;
  totalAmount: number;
  status: 'pending' | 'received' | 'cancelled';
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  notes: string;
  createdAt: string;
  items: Array<any>;
}

export default function PurchasesPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<IPurchase | null>(null);
  const [receiving, setReceiving] = useState(false);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/purchases?limit=100';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const res = await adminApi.get(url);
      if (res.data.success) {
        setPurchases(res.data.data?.purchases || []);
      }
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleReceive = async (purchase: IPurchase) => {
    if (!confirm(`Receive purchase order #${purchase.purchaseNumber}? This will update ingredient stock.`)) return;
    
    setReceiving(true);
    try {
      const res = await adminApi.post(`/purchases/${purchase._id}/receive`);
      if (res.data.success) {
        toast.success('✅ Purchase received! Stock updated successfully.');
        fetchPurchases();
        localStorage.setItem('ingredientsNeedRefresh', Date.now().toString());
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to receive purchase');
    } finally {
      setReceiving(false);
    }
  };

  // ─── FIX: Only allow deletion for pending purchases ──────────────────
  const canDelete = (status: string) => {
    return status === 'pending' || status === 'cancelled';
  };

  const handleDelete = async () => {
    if (!selectedPurchase) return;
    
    // ✅ Extra check before deleting
    if (!canDelete(selectedPurchase.status)) {
      toast.error('Cannot delete a received purchase. Please reverse stock first.');
      setShowDeleteModal(false);
      return;
    }
    
    try {
      console.log('🗑️ Deleting purchase:', selectedPurchase._id);
      
      const res = await adminApi.delete(`/purchases/${selectedPurchase._id}`);
      console.log('📥 Delete response:', res.data);
      
      if (res.data.success) {
        toast.success(res.data.message || 'Purchase deleted successfully');
        fetchPurchases();
        setShowDeleteModal(false);
        setSelectedPurchase(null);
      } else {
        toast.error(res.data.error || 'Failed to delete purchase');
      }
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      if (error.response?.status === 400) {
        toast.error(error.response?.data?.error || 'Cannot delete this purchase');
      } else if (error.response?.status === 404) {
        toast.error('Purchase not found');
      } else {
        toast.error(error.response?.data?.error || 'Failed to delete purchase');
      }
    }
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
      case 'received':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Received' };
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle, label: 'Pending' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle, label: status };
    }
  };

  const stats = {
    total: purchases.length,
    pending: purchases.filter(p => p.status === 'pending').length,
    received: purchases.filter(p => p.status === 'received').length,
    totalAmount: purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
            <p className="text-gray-500 text-sm mt-1">Manage all purchase orders</p>
          </div>
          <button
            onClick={() => navigate('/purchases/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-md hover:shadow-lg transition"
          >
            <Plus size={18} /> New Purchase Order
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold text-gray-800">{stats.total}</p><p className="text-xs text-gray-500">Total Orders</p></div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"><Package size={18} className="text-orange-500" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-gray-500">Pending</p></div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"><AlertCircle size={18} className="text-yellow-500" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold text-green-600">{stats.received}</p><p className="text-xs text-gray-500">Received</p></div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle size={18} className="text-green-500" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-xl font-bold text-purple-600">₹{stats.totalAmount.toLocaleString()}</p><p className="text-xs text-gray-500">Total Value</p></div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><DollarSign size={18} className="text-purple-500" /></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by PO number or invoice..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {(search || statusFilter) && (<button onClick={() => { setSearch(''); setStatusFilter(''); }} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"><X size={18} /></button>)}
            <button onClick={fetchPurchases} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {/* Purchases Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={40} className="animate-spin text-orange-500" /></div>
        ) : purchases.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <Package size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-600">No purchase orders found</h3>
            <button onClick={() => navigate('/purchases/new')} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">Create your first purchase order</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((purchase) => {
                  const statusBadge = getStatusBadge(purchase.status);
                  const StatusIcon = statusBadge.icon;
                  const isDeletable = canDelete(purchase.status);
                  
                  return (
                    <tr key={purchase._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-mono font-medium text-gray-800">{purchase.purchaseNumber}</p>
                        {purchase.invoiceNumber && <p className="text-xs text-gray-400">Inv: {purchase.invoiceNumber}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{purchase.supplierName || purchase.supplierId?.supplierName}</p>
                        <p className="text-xs text-gray-400">{purchase.supplierId?.phoneNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{formatDate(purchase.purchaseDate)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-600">{purchase.items?.length || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{purchase.totalAmount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                          <StatusIcon size={10} /> {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {/* View Button */}
                          <button 
                            onClick={() => { setSelectedPurchase(purchase); setShowViewModal(true); }} 
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition" 
                            title="View Details"
                          >
                            <Eye size={16} className="text-blue-500" />
                          </button>
                          
                          {/* Receive Button - Only for pending */}
                          {purchase.status === 'pending' && (
                            <button 
                              onClick={() => handleReceive(purchase)} 
                              disabled={receiving} 
                              className="p-1.5 rounded-lg hover:bg-green-50 transition" 
                              title="Receive Order"
                            >
                              <CheckCircle size={16} className="text-green-500" />
                            </button>
                          )}
                          
                          {/* ✅ Delete Button - Only for pending or cancelled */}
                          {isDeletable ? (
                            <button 
                              onClick={() => { setSelectedPurchase(purchase); setShowDeleteModal(true); }} 
                              className="p-1.5 rounded-lg hover:bg-red-50 transition" 
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </button>
                          ) : (
                            // ❌ Disabled delete button for received purchases with tooltip
                            <button 
                              className="p-1.5 rounded-lg opacity-40 cursor-not-allowed" 
                              title="Cannot delete a received purchase. Please reverse stock first."
                              disabled
                            >
                              <Trash2 size={16} className="text-gray-400" />
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
        )}
      </div>

      {/* View Purchase Modal */}
      {showViewModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-white border-b p-5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Purchase Order #{selectedPurchase.purchaseNumber}</h3>
                <p className="text-sm text-gray-500">Supplier: {selectedPurchase.supplierName || selectedPurchase.supplierId?.supplierName}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Purchase Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-400">PO Number</p>
                  <p className="font-mono font-medium">{selectedPurchase.purchaseNumber}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-400">Invoice Number</p>
                  <p className="font-medium">{selectedPurchase.invoiceNumber || '—'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-400">Purchase Date</p>
                  <p className="font-medium">{formatDate(selectedPurchase.purchaseDate)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-400">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedPurchase.status).bg} ${getStatusBadge(selectedPurchase.status).text}`}>
                    {getStatusBadge(selectedPurchase.status).label}
                  </span>
                </div>
              </div>

              {/* Items */}
              {selectedPurchase.items && selectedPurchase.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Package size={16} className="text-orange-500" /> Items</h4>
                  <div className="space-y-2">
                    {selectedPurchase.items.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">{item.ingredientName}</p>
                          <p className="text-xs text-gray-400">{item.quantity} {item.unit} × ₹{item.costPrice}</p>
                        </div>
                        <p className="font-semibold text-gray-800">₹{item.lineTotal.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t text-right">
                    <p className="text-lg font-bold text-orange-600">Total: ₹{selectedPurchase.totalAmount?.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {selectedPurchase.notes && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-400">Notes</p>
                  <p className="text-sm">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-3">
              <button onClick={() => setShowViewModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100">Close</button>
              {selectedPurchase.status === 'pending' && (
                <button onClick={() => { setShowViewModal(false); handleReceive(selectedPurchase); }} className="flex-1 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600">Receive Order</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Delete Purchase Order</h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <AlertCircle size={20} className="text-red-500" />
                <p className="text-sm text-red-600">
                  Are you sure you want to delete purchase order <strong>{selectedPurchase.purchaseNumber}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}