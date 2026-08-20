// pages/staff-portal/WaiterTables.tsx - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table2, Users, Clock, Coffee, ShoppingBag, Truck,
  Loader2, RefreshCw, Crown, Utensils, Eye,
  Circle, CircleCheck, CircleAlert, LayoutGrid, List,
  Search, Filter, X, User, Phone, MapPin, Package,
  Wallet, Receipt, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../../services/api';
import staffStorage from '../../utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────
interface Table {
  _id: string;
  number: string;
  name: string;
  floorName: string;
  status: 'available' | 'occupied' | 'reserved' | 'unavailable';
  capacity: number;
  currentOrderId?: string;
  orderDetails?: Order | null;
}

interface Order {
  _id: string;
  orderNumber: string;
  tableNumber: string;
  customerName?: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  orderStatus: string;
  total: number;
  createdAt: string;
  items?: any[];
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function WaiterTables() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<Table[]>([]);
  const [filteredTables, setFilteredTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch Tables ──────────────────────────────────────────────────────
  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = staffStorage.getToken();
      if (!token) {
        toast.error('Please login again');
        navigate('/staff-portal/login');
        return;
      }

      console.log('📋 Fetching tables from API...');
      
      // ✅ Try both endpoints
      let tablesData = [];
      let response;
      
      try {
        // Try the staff tables endpoint first
        response = await staffApi.get('/staff-portal/tables');
        console.log('📋 Staff tables response:', response.data);
      } catch (err: any) {
        console.log('⚠️ Staff tables endpoint failed, trying admin tables...');
        // Fallback to admin tables endpoint
        response = await staffApi.get('/tables');
        console.log('📋 Admin tables response:', response.data);
      }

      if (response?.data?.success) {
        tablesData = response.data.data?.tables || response.data.data || [];
      }

      if (tablesData.length === 0) {
        setError('No tables found. Please add tables in the admin panel.');
        setTables([]);
        setFilteredTables([]);
        setLoading(false);
        return;
      }

      setTables(tablesData);
      console.log(`✅ Found ${tablesData.length} tables`);
    } catch (error: any) {
      console.error('Error fetching tables:', error);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        staffStorage.clear();
        navigate('/staff-portal/login');
        return;
      }
      
      setError(error.response?.data?.error || 'Failed to load tables');
      setTables([]);
      setFilteredTables([]);
      toast.error(error.response?.data?.error || 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    filterTables();
  }, [tables, searchTerm, filterStatus]);

  // ─── Filter Tables ──────────────────────────────────────────────────────
  const filterTables = () => {
    let filtered = [...tables];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.number.toLowerCase().includes(term) ||
        t.name?.toLowerCase().includes(term) ||
        t.floorName?.toLowerCase().includes(term)
      );
    }

    // Sort: Available first, then occupied, then reserved
    filtered.sort((a, b) => {
      const statusOrder = { available: 0, occupied: 1, reserved: 2, unavailable: 3 };
      return (statusOrder[a.status as keyof typeof statusOrder] || 99) - 
             (statusOrder[b.status as keyof typeof statusOrder] || 99);
    });

    setFilteredTables(filtered);
  };

  // ─── Fetch Order for Table ─────────────────────────────────────────────
  const fetchOrderForTable = async (tableId: string) => {
    setLoadingOrder(true);
    try {
      const table = tables.find(t => t._id === tableId);
      if (!table || !table.currentOrderId) {
        toast.error('No active order for this table');
        setLoadingOrder(false);
        return;
      }

      // ✅ Try both endpoints
      let orderData;
      try {
        const response = await staffApi.get(`/staff-portal/orders/${table.currentOrderId}`);
        orderData = response.data;
      } catch (err) {
        // Fallback to admin orders endpoint
        const response = await staffApi.get(`/orders/${table.currentOrderId}`);
        orderData = response.data;
      }
      
      if (orderData?.success) {
        setOrderDetails(orderData.data);
        setShowTableModal(true);
      } else {
        toast.error('Failed to load order details');
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error(error.response?.data?.error || 'Failed to load order details');
    } finally {
      setLoadingOrder(false);
    }
  };

  // ─── Handle Table Click ─────────────────────────────────────────────────
  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    
    if (table.status === 'occupied' && table.currentOrderId) {
      fetchOrderForTable(table._id);
    } else if (table.status === 'available') {
      navigate(`/staff-portal/pos?tableId=${table._id}&tableNumber=${table.number}`);
    } else {
      toast.info(`Table ${table.number} is ${table.status}`);
    }
  };

  // ─── Handle Take Order ──────────────────────────────────────────────────
  const handleTakeOrder = (table: Table) => {
    navigate(`/staff-portal/pos?tableId=${table._id}&tableNumber=${table.number}`);
  };

  // ─── Navigate to Order Details ─────────────────────────────────────────
  const handleViewOrder = (orderId: string) => {
    setShowTableModal(false);
    navigate(`/staff-portal/orders?orderId=${orderId}`);
  };

  // ─── UI Helpers ─────────────────────────────────────────────────────────
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: JSX.Element }> = {
      available: {
        label: 'Available',
        color: 'text-green-700',
        bg: 'bg-green-100',
        icon: <Circle size={14} className="text-green-500" />
      },
      occupied: {
        label: 'Occupied',
        color: 'text-red-700',
        bg: 'bg-red-100',
        icon: <CircleCheck size={14} className="text-red-500" />
      },
      reserved: {
        label: 'Reserved',
        color: 'text-yellow-700',
        bg: 'bg-yellow-100',
        icon: <Clock size={14} className="text-yellow-500" />
      },
      unavailable: {
        label: 'Unavailable',
        color: 'text-gray-700',
        bg: 'bg-gray-100',
        icon: <X size={14} className="text-gray-500" />
      }
    };
    return configs[status] || configs.unavailable;
  };

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${config.bg} ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleRefresh = () => {
    fetchTables();
    toast.success('Tables refreshed');
  };

  // ─── Generate Sample Tables if no data ─────────────────────────────────
  const generateSampleTables = () => {
    const sampleTables: Table[] = [];
    const statuses: ('available' | 'occupied' | 'reserved')[] = ['available', 'occupied', 'available', 'reserved', 'available', 'occupied'];
    const floorNames = ['Ground Floor', 'First Floor', 'Second Floor', 'Terrace'];
    
    for (let i = 1; i <= 12; i++) {
      sampleTables.push({
        _id: `table_${i}`,
        number: String(i),
        name: `Table ${i}`,
        floorName: floorNames[i % floorNames.length],
        status: statuses[i % statuses.length],
        capacity: Math.floor(Math.random() * 4) + 2,
        currentOrderId: statuses[i % statuses.length] === 'occupied' ? `order_${i}` : undefined,
      });
    }
    return sampleTables;
  };

  // ─── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading tables...</p>
        </div>
      </div>
    );
  }

  // ─── Error State with Sample Data Fallback ────────────────────────────
  if (error || tables.length === 0) {
    // ✅ Use sample data as fallback
    const sampleTables = generateSampleTables();
    if (tables.length === 0 && error) {
      setTables(sampleTables);
      setError(null);
      toast.info('Showing sample tables. Connect to server for real data.');
      return;
    }
    
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Table2 size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Unable to Load Tables</h2>
        <p className="text-gray-500 text-sm mt-2 text-center max-w-md">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
        >
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Table2 size={24} className="text-orange-500" />
              Tables
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {filteredTables.length} of {tables.length} tables
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Tables</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
            <p className="text-xs text-gray-500">Available</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.occupied}</p>
            <p className="text-xs text-gray-500">Occupied</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-100 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.reserved}</p>
            <p className="text-xs text-gray-500">Reserved</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="unavailable">Unavailable</option>
            </select>

            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400'
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-400'
                }`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        {filteredTables.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Table2 size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-600">No tables found</h3>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredTables.map((table) => {
              const statusConfig = getStatusConfig(table.status);
              const isAvailable = table.status === 'available';
              const isOccupied = table.status === 'occupied';

              return (
                <div
                  key={table._id}
                  onClick={() => handleTableClick(table)}
                  className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                    isAvailable ? 'border-green-200 hover:border-green-400' :
                    isOccupied ? 'border-red-200 hover:border-red-400' :
                    'border-yellow-200 hover:border-yellow-400'
                  }`}
                >
                  <div className={`p-4 text-center ${isAvailable ? 'bg-green-50/50' : isOccupied ? 'bg-red-50/50' : 'bg-yellow-50/50'}`}>
                    <Table2 size={32} className={`mx-auto mb-2 ${isAvailable ? 'text-green-500' : isOccupied ? 'text-red-500' : 'text-yellow-500'}`} />
                    <p className="text-xl font-bold text-gray-800">Table {table.number}</p>
                    {table.name && <p className="text-xs text-gray-400">{table.name}</p>}
                    {table.floorName && <p className="text-xs text-gray-400">{table.floorName}</p>}
                    <div className="mt-2">{getStatusBadge(table.status)}</div>
                    {table.capacity && (
                      <p className="text-xs text-gray-400 mt-1">
                        <Users size={12} className="inline mr-1" />
                        Capacity: {table.capacity}
                      </p>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-100">
                    {isAvailable ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTakeOrder(table);
                        }}
                        className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition flex items-center justify-center gap-2"
                      >
                        <Coffee size={14} /> Take Order
                      </button>
                    ) : isOccupied ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTableClick(table);
                        }}
                        className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center justify-center gap-2"
                      >
                        <Eye size={14} /> View Order
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Clock size={14} /> {table.status}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // List View
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Table</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Floor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Capacity</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTables.map((table) => (
                  <tr key={table._id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Table2 size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-800">Table {table.number}</span>
                        {table.name && <span className="text-xs text-gray-400">{table.name}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{table.floorName || '-'}</td>
                    <td className="px-4 py-3">{getStatusBadge(table.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{table.capacity || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {table.status === 'available' ? (
                        <button
                          onClick={() => handleTakeOrder(table)}
                          className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition"
                        >
                          Take Order
                        </button>
                      ) : table.status === 'occupied' ? (
                        <button
                          onClick={() => handleTableClick(table)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition"
                        >
                          View Order
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">{table.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Table/Order Details Modal ────────────────────────────────── */}
        {showTableModal && selectedTable && orderDetails && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowTableModal(false)}>
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowTableModal(false)} />
              <div className="relative bg-white rounded-xl max-w-2xl w-full mx-auto overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      Table {selectedTable.number} - Order Details
                    </h3>
                    <p className="text-sm text-gray-500">Order #{orderDetails.orderNumber}</p>
                  </div>
                  <button onClick={() => setShowTableModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-5 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4 mb-5 pb-4 border-b border-gray-100">
                    <div><p className="text-xs text-gray-400">Order Number</p><p className="font-mono font-semibold">#{orderDetails.orderNumber}</p></div>
                    <div><p className="text-xs text-gray-400">Table</p><p className="font-semibold">Table {orderDetails.tableNumber}</p></div>
                    <div><p className="text-xs text-gray-400">Customer</p><p className="font-semibold">{orderDetails.customerName || 'Guest'}</p></div>
                    <div><p className="text-xs text-gray-400">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        orderDetails.orderStatus === 'ready' ? 'bg-green-100 text-green-700' :
                        orderDetails.orderStatus === 'preparing' ? 'bg-yellow-100 text-yellow-700' :
                        orderDetails.orderStatus === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {orderDetails.orderStatus}
                      </span>
                    </div>
                    <div><p className="text-xs text-gray-400">Total</p><p className="font-bold text-lg">{formatCurrency(orderDetails.total)}</p></div>
                    <div><p className="text-xs text-gray-400">Created At</p><p className="text-sm">{formatTime(orderDetails.createdAt)}</p></div>
                  </div>

                  <h4 className="font-semibold text-gray-800 mb-3">Order Items</h4>
                  <div className="bg-gray-50 rounded-lg overflow-hidden mb-5">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr><th className="px-4 py-2 text-left">Item</th><th className="px-4 py-2 text-center">Qty</th><th className="px-4 py-2 text-right">Total</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(orderDetails.items || []).map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{item.productName}</td>
                            <td className="px-4 py-2 text-center">{item.quantity}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.totalPrice || item.price * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 border-t flex justify-end gap-3">
                  <button
                    onClick={() => setShowTableModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleViewOrder(orderDetails._id)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                  >
                    <Eye size={16} />
                    View Full Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}