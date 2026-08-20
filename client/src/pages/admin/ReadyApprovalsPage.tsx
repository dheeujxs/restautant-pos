import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, Loader2, Crown,
  ChefHat, Coffee, ShoppingBag, Truck, AlertCircle,
  MessageSquare, User, Phone, Calendar, Eye,
  Package, AlertTriangle, Thermometer, Heart,
  UtensilsCrossed, Zap, Printer, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  specialInstructions?: string;
  dietary?: string[];
  allergens?: string[];
}

interface PendingOrder {
  _id: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  orderStatus: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  isVip: boolean;
  vipNotes?: string;
  readyNotes?: string;
  readyRequestedAt: string;
  notes?: string;
  specialRequests?: string;
  dietaryPreferences?: string[];
  allergenAlerts?: string[];
  prepTime?: number;
  isUrgent?: boolean;
}

const TYPE_CONFIG = {
  'dine-in': { label: 'Dine In', Icon: Coffee, color: '#f97316', bg: '#fff7ed' },
  'takeaway': { label: 'Takeaway', Icon: ShoppingBag, color: '#8b5cf6', bg: '#f5f3ff' },
  'delivery': { label: 'Delivery', Icon: Truck, color: '#06b6d4', bg: '#ecfeff' },
};

const formatPrice = (price: number) => `₹${price.toFixed(2)}`;
const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function ReadyApprovalsPage() {
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
    const interval = setInterval(fetchPendingApprovals, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const response = await api.get('/orders?readyRequested=true&orderStatus=preparing');
      const orders = response.data.data?.orders || [];
      setPendingOrders(orders.filter((o: any) => o.readyRequested === true));
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const response = await api.post(`/orders/${orderId}/approve-ready`);
      if (response.data.success) {
        toast.success('✅ Order approved! Ready to serve.');
        fetchPendingApprovals();
        if (selectedOrder?._id === orderId) {
          setShowDetailsModal(false);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedOrderId) return;
    
    setProcessingId(selectedOrderId);
    try {
      const response = await api.post(`/orders/${selectedOrderId}/reject-ready`, {
        reason: rejectReason
      });
      if (response.data.success) {
        toast.success('❌ Order rejected. Kitchen will be notified.');
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedOrderId(null);
        fetchPendingApprovals();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePrintKOT = (order: PendingOrder) => {
    const win = window.open('', '_blank');
    if (!win) return;
    
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOT - ${order.orderNumber}</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #fff; }
          .container { max-width: 300px; margin: 0 auto; border: 2px dashed #333; padding: 15px; }
          .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 10px; margin-bottom: 10px; }
          .vip { color: #b45309; font-weight: bold; }
          .item { margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
          .qty { background: #f97316; color: #fff; padding: 2px 6px; border-radius: 4px; margin-right: 8px; }
          .note { font-size: 11px; color: #666; margin-top: 4px; }
          .allergy { color: #dc2626; font-size: 11px; margin-top: 4px; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #333; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 18px; font-weight: bold; color: #f97316;">🍳 KITCHEN ORDER TICKET</div>
            <div><strong>#${order.orderNumber}</strong></div>
            ${order.isVip ? '<div class="vip">⭐ VIP ORDER ⭐</div>' : ''}
          </div>
          <div><strong>Type:</strong> ${order.orderType.toUpperCase()}</div>
          ${order.tableNumber ? `<div><strong>Table:</strong> ${order.tableNumber}</div>` : ''}
          ${order.customerName ? `<div><strong>Customer:</strong> ${order.customerName}</div>` : ''}
          <div style="margin: 12px 0"><strong>ITEMS:</strong></div>
          ${order.items.map(item => `
            <div class="item">
              <span class="qty">${item.quantity}×</span> ${item.productName}
              ${item.notes ? `<div class="note">📝 ${item.notes}</div>` : ''}
              ${item.specialInstructions ? `<div class="note">🔪 ${item.specialInstructions}</div>` : ''}
              ${item.allergens?.length ? `<div class="allergy">⚠️ Allergens: ${item.allergens.join(', ')}</div>` : ''}
            </div>
          `).join('')}
          ${order.readyNotes ? `<div><strong>Kitchen Notes:</strong><br/>${order.readyNotes}</div>` : ''}
          ${order.vipNotes ? `<div><strong>VIP Notes:</strong><br/>${order.vipNotes}</div>` : ''}
          <div class="footer">Requested: ${new Date(order.readyRequestedAt).toLocaleString()}</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const getOrderTypeIcon = (type: string) => {
    const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
    const Icon = config?.Icon || Coffee;
    return <Icon size={14} style={{ color: config?.color }} />;
  };

  const getElapsed = (createdAt: string) => {
    const minutes = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock size={24} className="text-orange-500" />
              Ready Request Approvals
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Review order details before approving or rejecting
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchPendingApprovals}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {pendingOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <CheckCircle size={48} className="mx-auto text-green-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-600">No pending approvals</h3>
          <p className="text-gray-400 text-sm mt-1">All orders have been processed!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pendingOrders.map((order) => {
            const typeConfig = TYPE_CONFIG[order.orderType as keyof typeof TYPE_CONFIG];
            const waitTime = getElapsed(order.readyRequestedAt);
            
            return (
              <div
                key={order._id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition hover:shadow-md ${
                  order.isVip ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-100'
                } ${order.isUrgent ? 'border-red-300 bg-red-50/30' : ''}`}
              >
                {/* Order Header */}
                <div className={`p-4 border-b ${order.isVip ? 'bg-yellow-50' : order.isUrgent ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getOrderTypeIcon(order.orderType)}
                      <span className="font-mono font-bold text-gray-800 text-lg">
                        #{order.orderNumber}
                      </span>
                      {order.isVip && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500 text-white text-xs font-bold flex items-center gap-1">
                          <Crown size={10} /> VIP
                        </span>
                      )}
                      {order.isUrgent && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center gap-1">
                          <Zap size={10} /> Urgent
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
                        Pending Approval
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">{formatPrice(order.total)}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                        <Clock size={10} /> Requested {waitTime}
                      </p>
                    </div>
                  </div>
                  
                  {/* Table/Customer Info */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {order.tableNumber && <span>Table {order.tableNumber}</span>}
                    {order.customerName && (
                      <span className="flex items-center gap-1">
                        <User size={10} /> {order.customerName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Order Body */}
                <div className="p-4">
                  {/* Items Summary */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1">
                        <span className="font-bold text-orange-500">{item.quantity}×</span>
                        {item.productName}
                        {item.notes && <span className="text-xs text-amber-500">📝</span>}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <span className="text-sm text-gray-400">+{order.items.length - 3} more</span>
                    )}
                  </div>

                  {/* Special Requests Badge */}
                  {(order.specialRequests || order.dietaryPreferences?.length || order.allergenAlerts?.length) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {order.specialRequests && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                          <Heart size={10} /> Special Request
                        </span>
                      )}
                      {order.dietaryPreferences?.length > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                          <UtensilsCrossed size={10} /> Dietary: {order.dietaryPreferences.join(', ')}
                        </span>
                      )}
                      {order.allergenAlerts?.length > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1">
                          <AlertTriangle size={10} /> Allergens: {order.allergenAlerts.join(', ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Kitchen Ready Notes */}
                  {order.readyNotes && (
                    <div className="bg-blue-50 rounded-lg p-2 mb-3 border border-blue-200">
                      <p className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                        <MessageSquare size={12} /> Kitchen Notes:
                      </p>
                      <p className="text-sm text-blue-800">{order.readyNotes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailsModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Eye size={12} /> Full Details
                    </button>
                    
                    <button
                      onClick={() => handlePrintKOT(order)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Printer size={12} /> KOT
                    </button>
                    
                    <button
                      onClick={() => handleApprove(order._id)}
                      disabled={processingId === order._id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 transition disabled:opacity-50"
                    >
                      {processingId === order._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Approve
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedOrderId(order._id);
                        setShowRejectModal(true);
                      }}
                      disabled={processingId === order._id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <XCircle size={12} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowDetailsModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className={`sticky top-0 p-5 border-b flex justify-between items-center ${
                selectedOrder.isVip ? 'bg-yellow-50' : selectedOrder.isUrgent ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-bold text-gray-800">Order Details</h3>
                  <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">#{selectedOrder.orderNumber}</span>
                  {selectedOrder.isVip && <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 text-white">VIP</span>}
                  {selectedOrder.isUrgent && <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white">Urgent</span>}
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Pending Approval</span>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                {/* Order Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Order Type</p>
                    <p className="capitalize font-medium">{selectedOrder.orderType}</p>
                  </div>
                  {selectedOrder.tableNumber && (
                    <div>
                      <p className="text-xs text-gray-400">Table Number</p>
                      <p className="font-medium">Table {selectedOrder.tableNumber}</p>
                    </div>
                  )}
                  {selectedOrder.customerName && (
                    <div>
                      <p className="text-xs text-gray-400">Customer</p>
                      <p className="font-medium">{selectedOrder.customerName}</p>
                    </div>
                  )}
                  {selectedOrder.customerPhone && (
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="font-medium">{selectedOrder.customerPhone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400">Created At</p>
                    <p className="font-medium">{formatDate(selectedOrder.createdAt)} at {formatTime(selectedOrder.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Requested At</p>
                    <p className="font-medium">{formatDate(selectedOrder.readyRequestedAt)} at {formatTime(selectedOrder.readyRequestedAt)}</p>
                  </div>
                  {selectedOrder.prepTime && (
                    <div>
                      <p className="text-xs text-gray-400">Prep Time</p>
                      <p className="font-medium">{selectedOrder.prepTime} minutes</p>
                    </div>
                  )}
                </div>
                
                {/* Items Table with Details */}
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package size={16} className="text-orange-500" /> Order Items
                </h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-center w-16">Qty</th>
                        <th className="px-4 py-2 text-right w-24">Price</th>
                        <th className="px-4 py-2 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-100">
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-800">{item.productName}</div>
                            {item.notes && (
                              <div className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                                <MessageSquare size={10} /> {item.notes}
                              </div>
                            )}
                            {item.specialInstructions && (
                              <div className="text-xs text-purple-500 mt-0.5">
                                🔪 {item.specialInstructions}
                              </div>
                            )}
                            {item.allergens && item.allergens.length > 0 && (
                              <div className="text-xs text-red-500 mt-0.5">
                                ⚠️ Allergens: {item.allergens.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-bold">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium">{formatPrice(item.unitPrice * item.quantity)}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => setExpandedItem(expandedItem === `${idx}` ? null : `${idx}`)}
                              className="text-blue-500 hover:text-blue-600"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t border-gray-200">
                      <tr><td colSpan={2} className="px-4 py-2 text-right font-medium">Subtotal</td><td className="px-4 py-2 text-right">{formatPrice(selectedOrder.subtotal)}</td><td></td></tr>
                      <tr><td colSpan={2} className="px-4 py-2 text-right font-medium">Tax (5%)</td><td className="px-4 py-2 text-right">{formatPrice(selectedOrder.tax)}</td><td></td></tr>
                      <tr className="bg-gray-200"><td colSpan={2} className="px-4 py-2 text-right font-bold">Total</td><td className="px-4 py-2 text-right font-bold text-orange-600">{formatPrice(selectedOrder.total)}</td><td></td></tr>
                    </tfoot>
                  </table>
                </div>
                
                {/* All Notes Section */}
                <div className="space-y-4">
                  {selectedOrder.readyNotes && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                        <ChefHat size={12} /> Kitchen Notes:
                      </p>
                      <p className="text-sm text-blue-800">{selectedOrder.readyNotes}</p>
                    </div>
                  )}
                  
                  {selectedOrder.notes && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-600 font-medium mb-1 flex items-center gap-1">
                        <MessageSquare size={12} /> Order Notes:
                      </p>
                      <p className="text-sm text-yellow-800">{selectedOrder.notes}</p>
                    </div>
                  )}
                  
                  {selectedOrder.vipNotes && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
                        <Crown size={12} /> VIP Notes:
                      </p>
                      <p className="text-sm text-amber-800">{selectedOrder.vipNotes}</p>
                    </div>
                  )}
                  
                  {selectedOrder.specialRequests && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium mb-1">Special Requests:</p>
                      <p className="text-sm text-purple-800">{selectedOrder.specialRequests}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="sticky bottom-0 p-5 bg-gray-50 border-t flex gap-3">
                <button onClick={() => setShowDetailsModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Close</button>
                <button onClick={() => handlePrintKOT(selectedOrder)} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2">
                  <Printer size={16} /> Print KOT
                </button>
                <button onClick={() => { handleApprove(selectedOrder._id); setShowDetailsModal(false); }} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Approve Order
                </button>
                <button onClick={() => { setSelectedOrderId(selectedOrder._id); setShowRejectModal(true); setShowDetailsModal(false); }} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2">
                  <XCircle size={16} /> Reject Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedOrderId && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowRejectModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="relative bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Reject Ready Request</h3>
                  <p className="text-sm text-gray-500">Order #{pendingOrders.find(o => o._id === selectedOrderId)?.orderNumber}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">Please provide a reason for rejection:</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Missing items, quality issues, not fully prepared, incomplete order..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 min-h-[100px]"
              />
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowRejectModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleReject} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2">
                  {processingId === selectedOrderId ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Reject Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}