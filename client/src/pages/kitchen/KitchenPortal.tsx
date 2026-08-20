// pages/kitchen/KitchenDisplayPage.tsx - Updated with All Orders View

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {adminApi} from '../../services/api';
import {
  Printer, CheckCircle, XCircle, Clock,
  CookingPot, RefreshCw, Search, Bell,
  CheckSquare, Coffee, ShoppingBag, Truck,
  Play, Flame, Timer, ChefHat, Zap,
  AlertCircle, UtensilsCrossed, Eye, Crown,
  Loader2, Volume2, VolumeX, Fingerprint,
  List, LayoutGrid, History, Package
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
  ready:     { label: 'Ready to Serve', color: '#10b981', bg: '#ecfdf5', next: null,       action: null },
  completed: { label: 'Completed',      color: '#6b7280', bg: '#f3f4f6', next: null,       action: null },
  cancelled: { label: 'Cancelled',      color: '#ef4444', bg: '#fef2f2', next: null,       action: null },
} as const;

const ORDER_TYPE = {
  'dine-in':  { icon: Coffee,      label: 'Dine In',   color: '#f97316', bg: '#fff7ed' },
  'takeaway': { icon: ShoppingBag, label: 'Takeaway',  color: '#8b5cf6', bg: '#f5f3ff' },
  'delivery': { icon: Truck,       label: 'Delivery',  color: '#06b6d4', bg: '#ecfeff' },
};

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

// ─── Sound Functions ──────────────────────────────────────────────────
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    const now = audioContext.currentTime;
    const frequencies = [880, 1100, 660, 880, 1320];
    const durations = [0.15, 0.15, 0.15, 0.15, 0.3];
    const delays = [0, 0.18, 0.36, 0.54, 0.72];
    frequencies.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      const startTime = now + delays[i];
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + durations[i]);
      oscillator.start(startTime);
      oscillator.stop(startTime + durations[i]);
    });
  } catch (err) {
    console.log('Sound error:', err);
  }
};

let audioInitialized = false;
const initAudio = async () => {
  if (audioInitialized) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    await ctx.resume();
    audioInitialized = true;
  } catch (err) {
    console.log('Audio init failed:', err);
  }
};

// ─── Main Component ──────────────────────────────────────────────────

export default function KitchenDisplayPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'active' | 'all'>('active');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);
  const soundPlayedRef = useRef<Set<string>>(new Set());

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const playNewOrderSound = useCallback(async () => {
    if (!soundEnabled) return;
    await initAudio();
    playNotificationSound();
    setTimeout(() => {
      if (soundEnabled) playNotificationSound();
    }, 200);
  }, [soundEnabled]);

  // ─── Fetch Orders ──────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const res = await adminApi.get('/orders?limit=1000');
      if (res.data.success) {
        const all: Order[] = res.data.data?.orders || [];
        
        // ✅ Separate active and completed orders
        const active = all.filter(o =>
          ['pending', 'confirmed', 'preparing', 'ready'].includes(o.orderStatus)
        );
        const completed = all.filter(o =>
          ['completed', 'cancelled'].includes(o.orderStatus)
        );

        // Check for new orders (only for active orders)
        if (!isFirstFetchRef.current) {
          const currentIds = new Set(active.map(o => o._id));
          const newOrderIds = [...currentIds].filter(
            id => !lastOrderIdsRef.current.has(id)
          );
          if (soundEnabled && newOrderIds.length > 0) {
            await playNewOrderSound();
            const newOrders = active.filter(o => newOrderIds.includes(o._id));
            if (newOrders.length === 1) {
              toast.success(`🔔 New order #${newOrders[0].orderNumber} received!`, {
                duration: 8000,
                icon: '🍳',
              });
            } else if (newOrders.length > 1) {
              toast.success(`🔔 ${newOrders.length} new orders received!`, {
                duration: 5000,
                icon: '🔔',
              });
            }
          }
        }

        isFirstFetchRef.current = false;
        lastOrderIdsRef.current = new Set(active.map(o => o._id));
        
        // ✅ Store all orders (active + completed)
        setOrders(all);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [soundEnabled, playNewOrderSound]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ─── Apply Filters ──────────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...orders];

    // ✅ Apply view mode filter (active or all)
    if (viewMode === 'active') {
      filtered = filtered.filter(o =>
        ['pending', 'confirmed', 'preparing', 'ready'].includes(o.orderStatus)
      );
    }

    // Search filter
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(term) ||
        o.customerName?.toLowerCase().includes(term) ||
        o.tableNumber?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.orderStatus === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(o => o.orderType === typeFilter);
    }

    // ✅ Sort: Newest first for completed, priority for active
    filtered.sort((a, b) => {
      if (viewMode === 'all') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // Active orders: VIP first, then status priority
      if (a.isVip && !b.isVip) return -1;
      if (!a.isVip && b.isVip) return 1;
      const statusOrder = ['pending', 'confirmed', 'preparing', 'ready'];
      return statusOrder.indexOf(a.orderStatus) - statusOrder.indexOf(b.orderStatus);
    });

    setFilteredOrders(filtered);
  }, [orders, search, statusFilter, typeFilter, viewMode]);

  // ─── Actions ──────────────────────────────────────────────────────
  const updateStatus = async (order: Order, targetStatus: string) => {
    if (targetStatus === 'completed') {
      toast.info('⏳ Order is ready. Waiter will serve it.', {
        duration: 3000,
        icon: '🕒',
      });
      return;
    }

    try {
      const staffToken = localStorage.getItem('staffToken');
      const response = await adminApi.patch(
        `/orders/${order._id}/status`,
        { orderStatus: targetStatus },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      if (response.data.success) {
        toast.success(`✅ Order ${order.orderNumber} updated to ${targetStatus}`);
        fetchOrders();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handlePunchIn = (orderId: string) => {
    if (orderId) {
      navigate(`/kitchen/order/${orderId}`);
    } else {
      toast.error('Invalid order ID');
    }
  };

  const handlePrint = (order: Order) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>KOT - ${order.orderNumber}</title>
      <style>
        body{font-family:monospace;padding:20px}
        .wrap{max-width:300px;margin:0 auto;border:2px dashed #333;padding:15px}
        .hd{text-align:center;border-bottom:1px dashed #333;padding-bottom:10px}
        .title{font-size:18px;font-weight:bold;color:#f97316}
        .item{margin:8px 0;padding:5px 0;border-bottom:1px dotted #ccc}
        .qty{background:#f97316;color:#fff;padding:2px 6px;border-radius:4px;margin-right:8px}
        .ft{text-align:center;margin-top:15px;padding-top:10px;border-top:1px dashed #333;font-size:10px}
      </style>
      </head>
      <body>
        <div class="wrap">
          <div class="hd"><div class="title">🍳 KITCHEN ORDER TICKET</div>
          <div>#${order.orderNumber}</div><div>${new Date().toLocaleString()}</div></div>
          <div><strong>Type:</strong> ${order.orderType.toUpperCase()}</div>
          ${order.tableNumber ? `<div><strong>Table:</strong> ${order.tableNumber}</div>` : ''}
          <div style="margin:12px 0"><strong>ITEMS:</strong></div>
          ${order.items.map(i => `<div class="item"><span class="qty">${i.quantity}×</span>${i.productName}${i.notes ? `<br/><small>📝 ${i.notes}</small>` : ''}</div>`).join('')}
          <div class="ft">Round ${order.currentRound || 1}</div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  const handleTestSound = async () => {
    if (soundEnabled) {
      await initAudio();
      playNotificationSound();
      toast.success('🔔 Test sound played!');
    } else {
      toast.info('Sound is disabled.');
    }
  };

  // ─── Stats ────────────────────────────────────────────────────────
  const stats = {
    total: orders.length,
    active: orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.orderStatus)).length,
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
    preparing: orders.filter(o => o.orderStatus === 'preparing').length,
    ready: orders.filter(o => o.orderStatus === 'ready').length,
    completed: orders.filter(o => o.orderStatus === 'completed').length,
    cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
    vip: orders.filter(o => o.isVip && !['completed', 'cancelled'].includes(o.orderStatus)).length,
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading kitchen orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        
        {/* ─── Header ────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <UtensilsCrossed size={26} className="text-orange-500" />
                Kitchen Display
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {viewMode === 'active' ? 'Active orders in kitchen' : 'All orders history'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
                <button
                  onClick={() => setViewMode('active')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                    viewMode === 'active' 
                      ? 'bg-orange-500 text-white' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Flame size={14} /> Active ({stats.active})
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
                    viewMode === 'all' 
                      ? 'bg-orange-500 text-white' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <History size={14} /> All ({stats.total})
                </button>
              </div>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                  soundEnabled 
                    ? 'border-green-300 bg-green-50 text-green-600' 
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {soundEnabled ? 'Sound ON' : 'Sound OFF'}
              </button>
              
              {soundEnabled && (
                <button
                  onClick={handleTestSound}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                  <Bell size={14} /> Test
                </button>
              )}
              
              <button
                onClick={fetchOrders}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-orange-600 transition-all"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ─── Stats Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-gray-800">{stats.active}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.confirmed}</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-purple-600">{stats.preparing}</p>
            <p className="text-xs text-gray-500">Cooking</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-green-600">{stats.ready}</p>
            <p className="text-xs text-gray-500">Ready</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-gray-600">{stats.completed}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xl font-bold text-red-600">{stats.cancelled}</p>
            <p className="text-xs text-gray-500">Cancelled</p>
          </div>
        </div>

        {/* ─── Filters ────────────────────────────────────────────────── */}
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
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="all">All Types</option>
              <option value="dine-in">Dine In</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </select>
            {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
              <button onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); }} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">
                Clear Filters
              </button>
            )}
            <span className="text-sm text-gray-400 flex items-center ml-auto">
              {filteredOrders.length} orders
            </span>
          </div>
        </div>

        {/* ─── Orders Grid ────────────────────────────────────────────── */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600">
              {viewMode === 'active' ? 'All caught up!' : 'No orders found'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {viewMode === 'active' 
                ? 'No active orders in the kitchen.' 
                : 'No orders match your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredOrders.map(order => {
              const cfg = STATUS[order.orderStatus];
              const typeCfg = ORDER_TYPE[order.orderType];
              const TypeIcon = typeCfg.icon;
              const totalRounds = order.currentRound || 1;
              const isExpanded = expandedOrder === order._id;
              const isCompleted = order.orderStatus === 'completed' || order.orderStatus === 'cancelled';
              
              // Check if order is active or completed
              const isActive = ['pending', 'confirmed', 'preparing', 'ready'].includes(order.orderStatus);
              
              let actionText = '';
              let actionColor = '';
              let actionHandler = () => {};
              let isDisabled = false;
              
              if (order.orderStatus === 'confirmed') {
                actionText = 'Start Cooking';
                actionColor = '#8b5cf6';
                actionHandler = () => updateStatus(order, 'preparing');
              } else if (order.orderStatus === 'preparing') {
                actionText = 'Mark Ready';
                actionColor = '#10b981';
                actionHandler = () => updateStatus(order, 'ready');
              } else if (order.orderStatus === 'ready') {
                actionText = '⏳ Waiting for Waiter';
                actionColor = '#f59e0b';
                actionHandler = () => {
                  toast.info('⏳ Order is ready. Waiter will serve it.');
                };
                isDisabled = true;
              }
              
              // ✅ Show different style for completed orders
              if (isCompleted) {
                return (
                  <div 
                    key={order._id} 
                    className={`bg-white rounded-xl overflow-hidden border transition-all opacity-75 ${
                      order.orderStatus === 'cancelled' ? 'border-red-200' : 'border-gray-200'
                    }`}
                  >
                    <div className={`p-4 border-b ${order.orderStatus === 'cancelled' ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-gray-800 text-lg">#{order.orderNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              order.orderStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {order.orderStatus === 'completed' ? '✅ Completed' : '❌ Cancelled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <TypeIcon size={12} style={{ color: typeCfg.color }} />
                            <span className="text-xs text-gray-500">{typeCfg.label}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800">{formatCurrency(order.total)}</p>
                          <p className="text-xs text-gray-400">{getElapsed(order.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Items - Show all for completed orders */}
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
                    </div>

                    {/* Completed orders: Only Print button */}
                    <div className="p-4 pt-0 flex gap-2">
                      <button 
                        onClick={() => handlePrint(order)} 
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-gray-200 transition-all"
                      >
                        <Printer size={12} /> Print
                      </button>
                      <button 
                        onClick={() => handlePunchIn(order._id)}
                        className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-purple-100 transition-all"
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </div>
                );
              }
              
              // ─── Active Orders ──────────────────────────────────────
              return (
                <div 
                  key={order._id} 
                  className={`bg-white rounded-xl overflow-hidden border transition-all hover:shadow-md ${
                    order.isVip ? 'border-amber-300 shadow-amber-100' : 'border-gray-100'
                  }`}
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
                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} text-${cfg.color}`}>
                            {cfg.label}
                          </span>
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
                    
                    {/* VIP Notes */}
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
                      onClick={() => handlePunchIn(order._id)}
                      className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-purple-100 transition-all"
                    >
                      <Fingerprint size={12} /> Punch In
                    </button>
                    
                    <button 
                      onClick={() => handlePrint(order)} 
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-gray-200 transition-all"
                    >
                      <Printer size={12} /> KOT
                    </button>
                    
                    {actionText && (
                      <button 
                        onClick={actionHandler}
                        disabled={isDisabled}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1 ${
                          isDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'
                        }`}
                        style={{ background: actionColor }}
                      >
                        {actionText === 'Start Cooking' && <Play size={12} />}
                        {actionText === 'Mark Ready' && <Zap size={12} />}
                        {actionText === '⏳ Waiting for Waiter' && <Clock size={12} className="animate-pulse" />}
                        {actionText}
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
                    {order.orderStatus === 'ready' && (
                      <p className="text-xs text-green-600 mt-2 text-center flex items-center justify-center gap-1">
                        <Bell size={12} /> Ready for waiter to serve
                      </p>
                    )}
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