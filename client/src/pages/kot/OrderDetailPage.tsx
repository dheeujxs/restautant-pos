// pages/kitchen/KitchenOrderDetailPage.tsx - FIXED

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { staffStorage } from '../../utils/storage';
import {
  ArrowLeft, Clock, CheckCircle, XCircle, Coffee, ShoppingBag, Truck,
  Printer, RefreshCw, Loader2, AlertCircle, User, MapPin, Phone,
  Package, Wallet, Receipt, ChevronRight, Play, Zap, Crown, Mail,
  TrendingUp, Tag, Calendar, Eye, ChefHat, UtensilsCrossed,
  ThumbsUp, Fingerprint, ClipboardCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  roundNumber?: number;
  personName?: string;
}

interface IOrder {
  _id: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  discountType: string;
  paymentStatus: string;
  paymentMethod: string;
  orderStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  currentRound?: number;
  isVip?: boolean;
  vipNotes?: string;
  kitchenAcknowledged?: boolean;
  readyRequested?: boolean;
  readyNotes?: string;
}

// Order status flow based on order type (Kitchen view)
const getOrderStatusFlow = (orderType: string, readyRequested?: boolean) => {
  if (orderType === 'dine-in') {
    return [
      { key: 'pending', label: 'Order Placed', icon: Clock, color: '#f59e0b', bg: '#fef3c7', description: 'Order received - Click Punch In to acknowledge' },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: '#3b82f6', bg: '#eff6ff', description: 'Order confirmed - Click Start Cooking to begin' },
      { key: 'preparing', label: 'Preparing', icon: ChefHat, color: '#8b5cf6', bg: '#f5f3ff', description: readyRequested ? 'Ready request sent - Awaiting manager approval' : 'Cooking in progress - Click Request Ready when done' },
      { key: 'ready', label: 'Ready to Serve', icon: UtensilsCrossed, color: '#10b981', bg: '#ecfdf5', description: 'Order ready - Can be served' },
      { key: 'completed', label: 'Completed', icon: CheckCircle, color: '#6b7280', bg: '#f3f4f6', description: 'Order completed' },
    ];
  } else if (orderType === 'takeaway') {
    return [
      { key: 'pending', label: 'Order Placed', icon: Clock, color: '#f59e0b', bg: '#fef3c7', description: 'Order received - Click Punch In to acknowledge' },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: '#3b82f6', bg: '#eff6ff', description: 'Order confirmed - Click Start Cooking to begin' },
      { key: 'preparing', label: 'Preparing', icon: ChefHat, color: '#8b5cf6', bg: '#f5f3ff', description: readyRequested ? 'Ready request sent - Awaiting manager approval' : 'Cooking in progress - Click Request Ready when done' },
      { key: 'ready', label: 'Packed', icon: ShoppingBag, color: '#10b981', bg: '#ecfdf5', description: 'Order packed - Ready for pickup' },
      { key: 'completed', label: 'Completed', icon: CheckCircle, color: '#6b7280', bg: '#f3f4f6', description: 'Order picked up' },
    ];
  } else if (orderType === 'delivery') {
    return [
      { key: 'pending', label: 'Order Placed', icon: Clock, color: '#f59e0b', bg: '#fef3c7', description: 'Order received - Click Punch In to acknowledge' },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: '#3b82f6', bg: '#eff6ff', description: 'Order confirmed - Click Start Cooking to begin' },
      { key: 'preparing', label: 'Preparing', icon: ChefHat, color: '#8b5cf6', bg: '#f5f3ff', description: readyRequested ? 'Ready request sent - Awaiting manager approval' : 'Cooking in progress - Click Request Ready when done' },
      { key: 'ready', label: 'Packed', icon: ShoppingBag, color: '#10b981', bg: '#ecfdf5', description: 'Order packed - Ready for dispatch' },
      { key: 'completed', label: 'Completed', icon: CheckCircle, color: '#6b7280', bg: '#f3f4f6', description: 'Order handed over to delivery' },
    ];
  }
  return [];
};

const TYPE_CONFIG = {
  'dine-in': { label: 'Dine In', Icon: Coffee, color: '#f97316', bg: '#fff7ed' },
  'takeaway': { label: 'Takeaway', Icon: ShoppingBag, color: '#8b5cf6', bg: '#f5f3ff' },
  'delivery': { label: 'Delivery', Icon: Truck, color: '#06b6d4', bg: '#ecfeff' },
};

const formatPrice = (price: number) => `₹${price.toFixed(2)}`;
const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function KitchenOrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [orderStatusFlow, setOrderStatusFlow] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showReadyModal, setShowReadyModal] = useState(false);
  const [readyNotes, setReadyNotes] = useState('');
  const [confirmingAction, setConfirmingAction] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      toast.error('Invalid order ID');
      navigate('/kitchen');
    }
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const staffToken = staffStorage.getToken();
      
      // ✅ Try staff portal endpoint first
      let res;
      try {
        res = await api.get(`/staff-portal/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${staffToken}` }
        });
      } catch (staffError: any) {
        // ✅ Fallback to admin endpoint if staff portal fails
        if (staffError.response?.status === 404 || staffError.response?.status === 401) {
          console.log('🔄 Falling back to admin orders endpoint');
          res = await api.get(`/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${staffToken}` }
          });
        } else {
          throw staffError;
        }
      }
      
      if (res.data.success && res.data.data) {
        const orderData = res.data.data;
        setOrder(orderData);
        
        const flow = getOrderStatusFlow(orderData.orderType, orderData.readyRequested);
        setOrderStatusFlow(flow);
        
        const currentStatusIndex = flow.findIndex(s => s.key === orderData.orderStatus);
        setActiveStep(currentStatusIndex >= 0 ? currentStatusIndex : 0);
      } else {
        toast.error('Order not found');
        navigate('/kitchen');
      }
    } catch (error: any) {
      console.error('Failed to load order:', error);
      toast.error(error.response?.data?.error || 'Failed to load order');
      navigate('/kitchen');
    } finally {
      setLoading(false);
    }
  };

  // ─── PUNCH IN ──────────────────────────────────────────────────────────
  const handlePunchIn = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const staffToken = staffStorage.getToken();
      
      // ✅ Try staff portal endpoint
      let res;
      try {
        res = await api.patch(`/staff-portal/orders/${order._id}/kitchen-acknowledge`, {}, {
          headers: { Authorization: `Bearer ${staffToken}` }
        });
      } catch (staffError: any) {
        // ✅ Fallback to admin endpoint
        if (staffError.response?.status === 404 || staffError.response?.status === 401) {
          console.log('🔄 Falling back to admin orders endpoint for punch in');
          res = await api.patch(`/orders/${order._id}/kitchen-acknowledge`, {}, {
            headers: { Authorization: `Bearer ${staffToken}` }
          });
        } else {
          throw staffError;
        }
      }
      
      if (res.data.success) {
        toast.success('Order punched in! Ready to start cooking.');
        await fetchOrder();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to punch in order');
    } finally {
      setUpdating(false);
    }
  };

  // ─── START COOKING ────────────────────────────────────────────────────
  const handleStartCooking = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const staffToken = staffStorage.getToken();
      
      // ✅ Try staff portal endpoint
      let res;
      try {
        res = await api.patch(`/staff-portal/orders/${order._id}/status`, 
          { orderStatus: 'preparing' },
          { headers: { Authorization: `Bearer ${staffToken}` } }
        );
      } catch (staffError: any) {
        // ✅ Fallback to admin endpoint
        if (staffError.response?.status === 404 || staffError.response?.status === 401) {
          console.log('🔄 Falling back to admin orders endpoint for start cooking');
          res = await api.patch(`/orders/${order._id}/status`, 
            { orderStatus: 'preparing' },
            { headers: { Authorization: `Bearer ${staffToken}` } }
          );
        } else {
          throw staffError;
        }
      }
      
      if (res.data.success) {
        toast.success('Cooking started!');
        await fetchOrder();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start cooking');
    } finally {
      setUpdating(false);
    }
  };

  // ─── REQUEST READY ────────────────────────────────────────────────────
  const requestReady = async () => {
    if (!order) return;
    setConfirmingAction(true);
    try {
      const token = staffStorage.getToken();
      
      // ✅ Try staff portal endpoint
      let res;
      try {
        res = await api.post(
          `/staff-portal/orders/${order._id}/request-ready`,
          { notes: readyNotes || '' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (staffError: any) {
        // ✅ Fallback to admin endpoint
        if (staffError.response?.status === 404 || staffError.response?.status === 401) {
          console.log('🔄 Falling back to admin orders endpoint for request ready');
          res = await api.post(
            `/orders/${order._id}/request-ready`,
            { notes: readyNotes || '' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          throw staffError;
        }
      }
      
      if (res.data.success) {
        toast.success(`✅ Ready request sent for Order #${order.orderNumber}. Waiting for manager approval.`);
        setShowReadyModal(false);
        setReadyNotes('');
        await fetchOrder();
      }
    } catch (error: any) {
      console.error('❌ Request ready error:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to request ready');
    } finally {
      setConfirmingAction(false);
    }
  };

  // ─── SHOW READY APPROVAL MODAL ──────────────────────────────────────
  const showReadyApproval = () => {
    setReadyNotes('');
    setShowReadyModal(true);
  };

  // ─── COMPLETE ORDER ──────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!order) return;
    toast.info('⏳ Order is ready. Waiter will serve it.', {
      duration: 3000,
      icon: '🕒',
    });
    return;
  };

  // ─── HANDLE NEXT STEP ───────────────────────────────────────────────
  const handleNextStep = () => {
    if (!order) return;
    
    const currentStatus = order.orderStatus;
    
    if (currentStatus === 'pending') {
      handlePunchIn();
    } 
    else if (currentStatus === 'confirmed') {
      handleStartCooking();
    } 
    else if (currentStatus === 'preparing') {
      if (order.readyRequested) {
        toast.info('Approval already requested. Waiting for manager approval.');
      } else {
        showReadyApproval();
      }
    } 
    else if (currentStatus === 'ready') {
      toast.info('⏳ Order is ready. Waiter will serve it.', {
        duration: 3000,
        icon: '🕒',
      });
    }
  };

  // ─── PRINT ────────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!order) return;
    const win = window.open('', '_blank');
    if (!win) return;
    
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOT - ${order.orderNumber}</title>
        <style>
          body { font-family: monospace; padding: 20px; }
          .wrap { max-width: 300px; margin: 0 auto; border: 2px dashed #333; padding: 15px; }
          .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; color: #f97316; }
          .item { margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
          .qty { background: #f97316; color: #fff; padding: 2px 6px; border-radius: 4px; margin-right: 8px; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #333; font-size: 10px; }
          ${order.isVip ? '.vip { color: #b45309; font-weight: bold; }' : ''}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <div class="title">🍳 KITCHEN ORDER TICKET</div>
            <div>#${order.orderNumber}</div>
            ${order.isVip ? '<div class="vip">⭐ VIP ORDER ⭐</div>' : ''}
          </div>
          <div><strong>Type:</strong> ${order.orderType.toUpperCase()}</div>
          ${order.tableNumber ? `<div><strong>Table:</strong> ${order.tableNumber}</div>` : ''}
          <div style="margin: 12px 0"><strong>ITEMS:</strong></div>
          ${order.items.map(item => `
            <div class="item">
              <span class="qty">${item.quantity}×</span>
              ${item.productName}
              ${item.notes ? `<br/><small>📝 ${item.notes}</small>` : ''}
            </div>
          `).join('')}
          <div class="footer">Round ${order.currentRound || 1} · ${new Date().toLocaleString()}</div>
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
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order || orderStatusFlow.length === 0) {
    return null;
  }

  const typeCfg = TYPE_CONFIG[order.orderType];
  const TypeIcon = typeCfg?.Icon || Coffee;
  const currentStepIndex = orderStatusFlow.findIndex(s => s.key === order.orderStatus);
  const isCompleted = order.orderStatus === 'completed';
  const isCancelled = order.orderStatus === 'cancelled';
  const isPending = order.orderStatus === 'pending';
  const isConfirmed = order.orderStatus === 'confirmed';
  const isPreparing = order.orderStatus === 'preparing';
  const isReady = order.orderStatus === 'ready';
  const hasRequestedReady = order.readyRequested;
  const progressPercent = ((currentStepIndex + 1) / orderStatusFlow.length) * 100;
  const elapsedMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);

  // ─── BUTTON HELPERS ──────────────────────────────────────────────────
  const getButtonText = () => {
    if (isPending) return 'Punch In';
    if (isConfirmed) return 'Start Cooking';
    if (isPreparing) {
      if (hasRequestedReady) return '⏳ Waiting for Manager Approval';
      return 'Request Ready Approval';
    }
    if (isReady) return '⏳ Waiting for Waiter';
    return '';
  };

  const getButtonIcon = () => {
    if (isPending) return <Fingerprint size={18} />;
    if (isConfirmed) return <Play size={18} />;
    if (isPreparing && !hasRequestedReady) return <ClipboardCheck size={18} />;
    if (isReady) return <Clock size={18} className="animate-pulse" />;
    return null;
  };

  const getButtonColor = () => {
    if (isPending) return 'bg-purple-500 hover:bg-purple-600';
    if (isConfirmed) return 'bg-orange-500 hover:bg-orange-600';
    if (isPreparing && !hasRequestedReady) return 'bg-blue-500 hover:bg-blue-600';
    if (isPreparing && hasRequestedReady) return 'bg-gray-400 cursor-not-allowed';
    if (isReady) return 'bg-yellow-500 cursor-not-allowed opacity-70';
    return '';
  };

  const isButtonDisabled = () => {
    if (isReady) return true;
    if (isPreparing && hasRequestedReady) return true;
    return updating;
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/kitchen')} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-xl text-gray-800">Order #{order.orderNumber}</h1>
                  {order.isVip && <Crown size={18} className="text-amber-500" />}
                  {order.currentRound && order.currentRound > 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">Round {order.currentRound}</span>
                  )}
                  {hasRequestedReady && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Approval Pending</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {typeCfg?.label} · {formatDate(order.createdAt)} at {formatTime(order.createdAt)} · Elapsed: {elapsedMinutes} min
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-200 transition">
                <Printer size={14} /> Print KOT
              </button>
              <button onClick={fetchOrder} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                <RefreshCw size={14} className="text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex justify-between mb-2">
              {orderStatusFlow.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = idx === currentStepIndex;
                const isCompletedStep = idx < currentStepIndex;
                
                return (
                  <div key={step.key} className="flex-1 text-center">
                    <div
                      className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center transition-all ${
                        isActive ? 'bg-orange-500 ring-4 ring-orange-500/20 shadow-md' :
                        isCompletedStep ? 'bg-green-500' :
                        'bg-gray-200'
                      }`}
                      title={step.description}
                    >
                      {isCompletedStep ? <CheckCircle size={14} className="text-white" /> : <StepIcon size={14} className={isActive ? 'text-white' : 'text-gray-500'} />}
                    </div>
                    <p className={`text-[10px] font-medium mt-1 ${isActive ? 'text-orange-600' : isCompletedStep ? 'text-green-600' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
            
            <div className="relative h-2 bg-gray-200 rounded-full mt-2">
              <div
                className="absolute h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* VIP Notes */}
        {order.isVip && order.vipNotes && (
          <div className="mx-6 mb-3 flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <Crown size={14} /> <span className="text-xs font-medium">VIP Note: {order.vipNotes}</span>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Package size={18} className="text-orange-500" /> Order Items
              </h3>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">
                        {item.quantity}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">{item.productName}</p>
                        {item.notes && <p className="text-xs text-amber-500 mt-0.5">📝 {item.notes}</p>}
                      </div>
                    </div>
                    <p className="font-semibold text-gray-800">{formatPrice(item.totalPrice)}</p>
                  </div>
                ))}
              </div>
              {order.notes && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs text-amber-600">📝 Order Notes: {order.notes}</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User size={18} className="text-blue-500" /> Customer Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {order.customerName && (
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <User size={14} /> <span>{order.customerName}</span>
                  </div>
                )}
                {order.customerPhone && (
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <Phone size={14} /> <span>{order.customerPhone}</span>
                  </div>
                )}
                {order.tableNumber && (
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                    <Coffee size={14} /> <span>Table {order.tableNumber}</span>
                  </div>
                )}
                {order.customerAddress && order.orderType === 'delivery' && (
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg col-span-2">
                    <MapPin size={14} /> <span>{order.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4">Actions</h3>
              
              {!isCompleted && !isCancelled && (
                <div className="space-y-3">
                  <button
                    onClick={handleNextStep}
                    disabled={isButtonDisabled()}
                    className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${getButtonColor()}`}
                  >
                    {updating ? <Loader2 size={18} className="animate-spin" /> : getButtonIcon()}
                    {getButtonText()}
                  </button>
                  
                  {/* Show message for pending approval */}
                  {isPreparing && hasRequestedReady && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                      <Clock size={16} className="inline text-yellow-500 mr-1" />
                      <span className="text-xs text-yellow-700">Waiting for manager approval. Cannot mark ready.</span>
                    </div>
                  )}
                  
                  {/* Show message for ready orders */}
                  {isReady && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                      <CheckCircle size={16} className="inline text-green-500 mr-1" />
                      <span className="text-xs text-green-700">Order is ready. Waiter will serve it.</span>
                    </div>
                  )}
                </div>
              )}
              
              {isCompleted && (
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <CheckCircle size={24} className="mx-auto text-green-500 mb-2" />
                  <p className="text-green-600 font-bold">Order Completed!</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {order.orderType === 'dine-in' ? 'Order served to customer' : 
                     order.orderType === 'takeaway' ? 'Order picked up by customer' : 
                     'Order handed over to delivery partner'}
                  </p>
                </div>
              )}
              
              {isCancelled && (
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <XCircle size={24} className="mx-auto text-red-500 mb-2" />
                  <p className="text-red-600 font-bold">Order Cancelled</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax (5%)</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-orange-500 text-lg">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4">Payment</h3>
              <div className={`p-3 rounded-lg text-center ${order.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                <p className="font-semibold">{order.paymentStatus === 'paid' ? '✓ Payment Completed' : '⏳ Payment Pending'}</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/kitchen')}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
            >
              ← Back to Kitchen
            </button>
          </div>
        </div>
      </div>

      {/* Request Ready Modal */}
      {showReadyModal && order && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReadyModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ClipboardCheck size={20} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Request Ready to Serve</h3>
                  <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Items:</span>
                  <span className="font-semibold text-gray-800">{order.items.length} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-semibold text-orange-500">{formatPrice(order.total)}</span>
                </div>
                {order.tableNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Table:</span>
                    <span className="font-semibold text-gray-800">Table {order.tableNumber}</span>
                  </div>
                )}
                {order.isVip && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded-lg">
                    <Crown size={14} className="text-amber-500" />
                    <span className="text-xs font-medium text-amber-700">VIP Customer - Priority</span>
                  </div>
                )}
              </div>
              
              {/* Items Preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items Prepared:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-green-500">{item.quantity}×</span>
                      <span className="text-gray-600">{item.productName}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preparation Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={readyNotes}
                  onChange={(e) => setReadyNotes(e.target.value)}
                  placeholder="e.g., Extra spicy, No onions, Special plating..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              
              <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-yellow-700">Requesting approval will:</p>
                    <ul className="text-xs text-yellow-600 mt-1 space-y-1 list-disc list-inside">
                      <li>Send request to manager for approval</li>
                      <li>Order will be marked as "Ready" ONLY after manager approves</li>
                      <li>Kitchen cannot mark ready directly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t flex gap-3 bg-gray-50">
              <button
                onClick={() => setShowReadyModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={requestReady}
                disabled={confirmingAction}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-green-600 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {confirmingAction ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ThumbsUp size={16} />
                )}
                Request Manager Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}