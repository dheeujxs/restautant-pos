import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Printer, CheckCircle, XCircle, Clock,
  CookingPot, RefreshCw, Search, Bell,
  CheckSquare, Coffee, ShoppingBag, Truck,
  Play, Flame, Timer, ChefHat, Zap,
  AlertCircle, UtensilsCrossed, Eye, Crown,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  roundNumber?: number;
  personName?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  orderStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  total: number;
  createdAt: string;
  prepStartedAt?: string;
  notes?: string;
  currentRound?: number;
  isVip?: boolean;
  vipNotes?: string;
}

const STATUS = {
  pending:   { label: 'New Order',      color: '#f59e0b', bg: '#fef3c7', next: 'confirmed', action: 'Confirm' },
  confirmed: { label: 'Confirmed',      color: '#3b82f6', bg: '#eff6ff', next: 'preparing', action: 'Start Cooking' },
  preparing: { label: 'Cooking...',     color: '#8b5cf6', bg: '#f5f3ff', next: 'ready',     action: 'Mark Ready' },
  ready:     { label: 'Ready to Serve', color: '#10b981', bg: '#ecfdf5', next: 'completed', action: 'Complete' },
  completed: { label: 'Completed',      color: '#6b7280', bg: '#f3f4f6', next: null,       action: null },
  cancelled: { label: 'Cancelled',      color: '#ef4444', bg: '#fef2f2', next: null,       action: null },
} as const;

const ORDER_TYPE = {
  'dine-in':  { icon: Coffee,      label: 'Dine In',   color: '#f97316', bg: '#fff7ed' },
  'takeaway': { icon: ShoppingBag, label: 'Takeaway',  color: '#8b5cf6', bg: '#f5f3ff' },
  'delivery': { icon: Truck,       label: 'Delivery',  color: '#06b6d4', bg: '#ecfeff' },
};

// ✅ FIXED: Safe elapsed time calculation
const getElapsed = (createdAt: string): string => {
  try {
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return 'Just now';
    const minutes = Math.floor((Date.now() - created.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  } catch (e) {
    return 'Just now';
  }
};

const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function KitchenDisplayPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastCount, setLastCount] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders?limit=100');
      if (res.data.success) {
        const all: Order[] = res.data.data?.orders || [];
        const kitchen = all.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.orderStatus));
        if (soundEnabled && kitchen.length > lastCount && lastCount > 0) {
          new Audio('/notification.mp3').play().catch(() => {});
          toast.success(`🔔 New order! Total: ${kitchen.length} active`);
        }
        setLastCount(kitchen.length);
        setOrders(kitchen);
      }
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [lastCount, soundEnabled]);

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 15000);
    return () => clearInterval(t);
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, currentStatus: string) => {
    const cfg = STATUS[currentStatus as keyof typeof STATUS];
    if (!cfg?.next) return;
    try {
      await api.patch(`/orders/${orderId}/status`, { orderStatus: cfg.next });
      toast.success(`Moved to: ${STATUS[cfg.next as keyof typeof STATUS].label}`);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const handlePrint = (order: Order) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>KOT - ${order.orderNumber}</title>
      <style>body{font-family:monospace;padding:20px}.wrap{max-width:300px;margin:0 auto;border:2px dashed #333;padding:15px}.hd{text-align:center;border-bottom:1px dashed #333;padding-bottom:10px}.title{font-size:18px;font-weight:bold;color:#f97316}.item{margin:8px 0;padding:5px 0;border-bottom:1px dotted #ccc}.qty{background:#f97316;color:#fff;padding:2px 6px;border-radius:4px;margin-right:8px}.ft{text-align:center;margin-top:15px;padding-top:10px;border-top:1px dashed #333;font-size:10px}</style></head><body>
      <div class="wrap"><div class="hd"><div class="title">KITCHEN ORDER TICKET</div><div>#${order.orderNumber}</div><div>${new Date().toLocaleString()}</div></div>
      <div><b>Type:</b> ${order.orderType.toUpperCase()}</div>${order.tableNumber ? `<div><b>Table:</b> ${order.tableNumber}</div>` : ''}
      <div style="margin:12px 0"><b>ITEMS:</b></div>${order.items.map(i => `<div class="item"><span class="qty">${i.quantity}×</span>${i.productName}${i.notes ? `<br/><small>📝 ${i.notes}</small>` : ''}</div>`).join('')}
      <div class="ft">Round ${order.currentRound || 1}</div></div></body></html>`);
    w.document.close();
    w.print();
  };

  const filtered = orders.filter(o => {
    if (search && !o.orderNumber.includes(search) && !o.customerName?.includes(search)) return false;
    if (statusFilter !== 'all' && o.orderStatus !== statusFilter) return false;
    if (typeFilter !== 'all' && o.orderType !== typeFilter) return false;
    return true;
  });

  const stats = {
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
    preparing: orders.filter(o => o.orderStatus === 'preparing').length,
    ready: orders.filter(o => o.orderStatus === 'ready').length,
    vip: orders.filter(o => o.isVip && !['completed', 'cancelled'].includes(o.orderStatus)).length,
  };

  if (loading && orders.length === 0) return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
        <p className="text-gray-500">Loading kitchen orders...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <UtensilsCrossed size={26} className="text-orange-500" />
                Kitchen Display
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Real-time order tracking & management</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSoundEnabled(!soundEnabled)} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${soundEnabled ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-200 text-gray-500'}`}>
                <Bell size={14} className="inline mr-1" /> {soundEnabled ? 'Sound ON' : 'Sound OFF'}
              </button>
              <button onClick={fetchOrders} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-orange-600 transition-all">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
                <p className="text-xs text-gray-500">Active Orders</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <UtensilsCrossed size={18} className="text-orange-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-gray-500">New Orders</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock size={18} className="text-yellow-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
                <p className="text-xs text-gray-500">Confirmed</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle size={18} className="text-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.preparing}</p>
                <p className="text-xs text-gray-500">Cooking</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <CookingPot size={18} className="text-purple-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
                <p className="text-xs text-gray-500">Ready to Serve</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Zap size={18} className="text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by order number or customer..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" 
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="all">All Status</option>
              <option value="pending">New Orders</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Cooking</option>
              <option value="ready">Ready to Serve</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="all">All Types</option>
              <option value="dine-in">Dine In</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </select>
            {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
              <button onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); }} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Orders Grid - NO URGENT WARNING */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600">All caught up!</h3>
            <p className="text-sm text-gray-400 mt-1">No active orders in the kitchen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(order => {
              const cfg = STATUS[order.orderStatus];
              const typeCfg = ORDER_TYPE[order.orderType];
              const TypeIcon = typeCfg.icon;
              const totalRounds = order.currentRound || 1;
              const isExpanded = expandedOrder === order._id;
              
              return (
                <div 
                  key={order._id} 
                  className={`bg-white rounded-xl overflow-hidden border transition-all hover:shadow-md ${order.isVip ? 'border-amber-300 shadow-amber-100' : 'border-gray-100'}`}
                >
                  {/* Header */}
                  <div className={`p-4 border-b ${order.isVip ? 'bg-amber-50' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-gray-800 text-lg">#{order.orderNumber}</span>
                          {order.isVip && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1">
                              <Crown size={10} /> VIP
                            </span>
                          )}
                          {totalRounds > 1 && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                              Round {totalRounds}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <TypeIcon size={12} style={{ color: typeCfg.color }} />
                          <span className="text-xs text-gray-500">{typeCfg.label}</span>
                          {order.tableNumber && (
                            <>
                              <span className="text-xs text-gray-300">•</span>
                              <span className="text-xs text-gray-500">Table {order.tableNumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                          <Clock size={10} /> {getElapsed(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    {/* VIP Notes - NO URGENT WARNING */}
                    {order.isVip && order.vipNotes && (
                      <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-100 px-3 py-2 rounded-lg">
                        <Crown size={14} /> 
                        <span className="text-xs font-medium">VIP: {order.vipNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="p-4">
                    <div className="space-y-2">
                      {order.items.slice(0, isExpanded ? undefined : 4).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-600">{item.quantity}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                            {item.notes && <p className="text-xs text-amber-500 mt-0.5">📝 {item.notes}</p>}
                          </div>
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <button 
                          onClick={() => setExpandedOrder(isExpanded ? null : order._id)} 
                          className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                        >
                          {isExpanded ? 'Show less' : `+ ${order.items.length - 4} more items`}
                        </button>
                      )}
                    </div>
                    {order.notes && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded-lg text-xs text-yellow-600">
                        📝 {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0 flex gap-2">
                    <button 
                      onClick={() => navigate(`/kitchen/order/${order._id}`)} 
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-blue-100 transition-all"
                    >
                      <Eye size={12} /> View Details
                    </button>
                    <button 
                      onClick={() => handlePrint(order)} 
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-gray-200 transition-all"
                    >
                      <Printer size={12} /> KOT
                    </button>
                    {cfg.next && (
                      <button 
                        onClick={() => updateStatus(order._id, order.orderStatus)} 
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1"
                        style={{ background: order.orderStatus === 'confirmed' ? '#8b5cf6' : order.orderStatus === 'preparing' ? '#10b981' : '#3b82f6' }}
                      >
                        {order.orderStatus === 'confirmed' ? <><Zap size={12} /> Start</> : order.orderStatus === 'preparing' ? <><CheckCircle size={12} /> Ready</> : <><Play size={12} /> Confirm</>}
                      </button>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  <div className="px-4 pb-3">
                    <div className="flex gap-1">
                      {['pending', 'confirmed', 'preparing', 'ready', 'completed'].map((step, i) => {
                        const stepIdx = ['pending', 'confirmed', 'preparing', 'ready', 'completed'].indexOf(order.orderStatus);
                        const done = i < stepIdx;
                        const active = i === stepIdx;
                        return (
                          <div key={step} className="flex-1">
                            <div className={`h-1 rounded-full ${done ? 'bg-green-500' : active ? 'bg-orange-500' : 'bg-gray-200'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}