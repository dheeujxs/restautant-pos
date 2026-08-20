// pages/tables/TablesPage.tsx - FIXED IMPORT

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// ✅ FIX: Import the correct axios instance
import { adminApi } from '../../../services/api';
import { Plus, Edit2, Trash2, Search, X, RefreshCw, Eye, Users, Coffee, Utensils, DoorOpen } from 'lucide-react';
import toast from 'react-hot-toast';

interface ITable {
  _id: string; number: string; name: string;
  floorId: string; floorName: string; capacity: number;
  shape: 'square' | 'rectangle';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  isActive: boolean; currentOrderId?: string;
}
interface IFloor { _id: string; name: string; }

const STATUS = {
  available:   { bg: '#f0fdf4', border: '#86efac', top: '#22c55e', text: '#15803d', label: 'Available',   dot: '#22c55e' },
  occupied:    { bg: '#fff5f5', border: '#fca5a5', top: '#ef4444', text: '#b91c1c', label: 'Occupied',    dot: '#ef4444' },
  reserved:    { bg: '#fffbeb', border: '#fcd34d', top: '#f59e0b', text: '#b45309', label: 'Reserved',    dot: '#f59e0b' },
  maintenance: { bg: '#f9fafb', border: '#d1d5db', top: '#9ca3af', text: '#4b5563', label: 'Maintenance', dot: '#9ca3af' },
} as const;

interface ChairSlot { side: 'top'|'bottom'|'left'|'right'; index: number; total: number; }

function distributeChairs(capacity: number, shape: string): ChairSlot[] {
  const slots: ChairSlot[] = [];
  if (shape === 'rectangle') {
    const topN  = Math.ceil(capacity / 3);
    const botN  = Math.ceil((capacity - topN) / 1.5);
    const sides = capacity - topN - botN;
    const leftN = Math.ceil(sides / 2);
    const rightN = sides - leftN;
    for (let i = 0; i < topN;  i++) slots.push({ side: 'top',    index: i, total: topN  });
    for (let i = 0; i < botN;  i++) slots.push({ side: 'bottom', index: i, total: botN  });
    for (let i = 0; i < leftN; i++) slots.push({ side: 'left',   index: i, total: leftN });
    for (let i = 0; i < rightN;i++) slots.push({ side: 'right',  index: i, total: rightN});
  } else {
    const topN  = Math.ceil(capacity / 4);
    const botN  = Math.ceil((capacity - topN) / 3);
    const sides = capacity - topN - botN;
    const leftN = Math.ceil(sides / 2);
    const rightN = sides - leftN;
    for (let i = 0; i < topN;  i++) slots.push({ side: 'top',    index: i, total: topN  });
    for (let i = 0; i < botN;  i++) slots.push({ side: 'bottom', index: i, total: botN  });
    for (let i = 0; i < leftN; i++) slots.push({ side: 'left',   index: i, total: leftN });
    for (let i = 0; i < rightN;i++) slots.push({ side: 'right',  index: i, total: rightN});
  }
  return slots;
}

function Chair({ side, index, total, tw, th, occupied }: {
  side: 'top'|'bottom'|'left'|'right'; index: number; total: number;
  tw: number; th: number; occupied: boolean;
}) {
  const cw = 26; const ch = 12; const gap = 7;
  const seatBg     = occupied ? '#fecaca' : '#f5f0e8';
  const seatBorder = occupied ? '#ef4444' : '#c4b99a';
  const isH = side === 'top' || side === 'bottom';
  const pct = (index + 1) / (total + 1);

  let style: React.CSSProperties = { position: 'absolute' };
  if (side === 'top')    { style.top    = -(ch + gap); style.left  = pct * tw - cw / 2; }
  if (side === 'bottom') { style.bottom = -(ch + gap); style.left  = pct * tw - cw / 2; }
  if (side === 'left')   { style.left   = -(ch + gap); style.top   = pct * th - cw / 2; }
  if (side === 'right')  { style.right  = -(ch + gap); style.top   = pct * th - cw / 2; }

  const br = side === 'top' ? '5px 5px 2px 2px' : side === 'bottom' ? '2px 2px 5px 5px' : side === 'left' ? '5px 2px 2px 5px' : '2px 5px 5px 2px';

  return (
    <div style={{
      ...style,
      width: isH ? cw : ch, height: isH ? ch : cw,
      background: seatBg, border: `1.5px solid ${seatBorder}`,
      borderRadius: br, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: isH ? '55%' : '35%', height: isH ? '35%' : '55%',
        background: seatBorder, opacity: 0.4, borderRadius: 2,
      }} />
    </div>
  );
}

function TableShape({ shape, capacity, status, number, name, onClick }: {
  shape: string; capacity: number; status: string;
  number: string; name?: string; onClick: () => void;
}) {
  const s = STATUS[status as keyof typeof STATUS] ?? STATUS.maintenance;
  const baseW = shape === 'rectangle' ? 140 : 96;
  const baseH = shape === 'rectangle' ?  84 : 96;
  const scale = capacity <= 2 ? 0.85 : capacity <= 4 ? 1 : capacity <= 6 ? 1.12 : capacity <= 8 ? 1.26 : capacity <= 10 ? 1.4 : 1.55;
  const tw = Math.round(baseW * scale);
  const th = Math.round(baseH * scale);
  const PAD = 34;
  const chairs = distributeChairs(capacity, shape);

  return (
    <div onClick={onClick} className="cursor-pointer select-none transition-transform duration-150 hover:scale-[1.04] active:scale-95"
      style={{ position: 'relative', width: tw + PAD * 2, height: th + PAD * 2 }}>
      <div style={{
        position: 'absolute', top: PAD, left: PAD, width: tw, height: th,
        borderRadius: 8,
        background: `linear-gradient(160deg,${s.bg},#fff)`,
        border: `2px solid ${s.border}`,
        boxShadow: `0 2px 10px rgba(0,0,0,0.08), 0 0 0 3px ${s.top}15`,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 1,
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: s.top, borderRadius: '6px 6px 0 0' }} />
        {[20, 40, 60, 80].map(p => (
          <div key={p} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: 1, background: `${s.border}35` }} />
        ))}
        <div style={{ zIndex: 2, textAlign: 'center', padding: '0 6px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: s.text, lineHeight: 1 }}>{number}</div>
          {name && <div style={{ fontSize: 9, color: '#a8a29e', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: tw - 16 }}>{name}</div>}
        </div>
        <div style={{
          position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
          background: '#fff', border: `1px solid ${s.border}`,
          borderRadius: 99, padding: '2px 8px',
          fontSize: 9, fontWeight: 700, color: s.text,
          whiteSpace: 'nowrap', zIndex: 3,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>{capacity} seats</div>
      </div>
      {chairs.map((slot, i) => (
        <div key={i} style={{ position: 'absolute', top: PAD, left: PAD, width: tw, height: th, zIndex: 0 }}>
          <Chair side={slot.side} index={slot.index} total={slot.total} tw={tw} th={th} occupied={status === 'occupied'} />
        </div>
      ))}
    </div>
  );
}

interface FloorCardProps {
  floor: IFloor; tables: ITable[];
  onTableClick: (t: ITable) => void;
  onEditTable: (id: string) => void;
  onDeleteTable: (id: string) => void;
  onFreeTable: (id: string, number: string) => void;
}

function FloorCard({ floor, tables, onTableClick, onEditTable, onDeleteTable, onFreeTable }: FloorCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const cnt = {
    available:   tables.filter(t => t.status === 'available').length,
    occupied:    tables.filter(t => t.status === 'occupied').length,
    reserved:    tables.filter(t => t.status === 'reserved').length,
    maintenance: tables.filter(t => t.status === 'maintenance').length,
  };

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e7e5e4', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div onClick={() => setCollapsed(p => !p)}
        style={{ padding: '14px 20px', background: 'linear-gradient(90deg,#fafaf9,#fff)', borderBottom: collapsed ? 'none' : '1px solid #f3f4f6', cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#f97316,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍽️</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1917' }}>{floor.name}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#78716c', background: '#f5f5f4', borderRadius: 99, padding: '2px 8px' }}>{tables.length} tables</span>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 5, marginLeft: 38 }}>
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>● {cnt.available} free</span>
            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>● {cnt.occupied} busy</span>
            <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>● {cnt.reserved} reserved</span>
            {cnt.maintenance > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>● {cnt.maintenance} maint.</span>}
          </div>
        </div>
        <span style={{ color: '#d4d0cc', fontSize: 16 }}>{collapsed ? '▼' : '▲'}</span>
      </div>
      {!collapsed && (
        <div style={{ padding: 28, background: 'repeating-linear-gradient(0deg,transparent,transparent 39px,#f5f5f425 39px,#f5f5f425 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#f5f5f425 39px,#f5f5f425 40px)', backgroundColor: '#fafaf9' }}>
          {tables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#a8a29e' }}>
              <Utensils size={26} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: 12 }}>No tables on this floor</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end' }}>
              {tables.map(table => (
                <div key={table._id} style={{ position: 'relative', flexShrink: 0 }} className="group">
                  <TableShape shape={table.shape} capacity={table.capacity} status={table.status} number={table.number} name={table.name} onClick={() => onTableClick(table)} />
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4, zIndex: 40 }}>
                    <button onClick={e => { e.stopPropagation(); onEditTable(table._id); }} style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Edit2 size={10} color="#6b7280" /></button>
                    <button onClick={e => { e.stopPropagation(); onDeleteTable(table._id); }} style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', border: '1px solid #fee2e2', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={10} color="#ef4444" /></button>
                    {table.status === 'occupied' && (
                      <button onClick={e => { e.stopPropagation(); onFreeTable(table._id, table.number); }} style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', border: '1px solid #bfdbfe', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Force Free Table"><DoorOpen size={10} color="#3b82f6" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fff', borderRadius: 10, padding: '9px 14px', border: '1px solid #f3f4f6', marginBottom: 16 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend:</span>
      {Object.entries(STATUS).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 9, height: 9, borderRadius: 3, background: v.top }} />
          <span style={{ fontSize: 11, color: '#57534e', fontWeight: 500 }}>{v.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function TablesPage() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const floorIdParam   = new URLSearchParams(location.search).get('floorId') || '';

  const [tables,        setTables]        = useState<ITable[]>([]);
  const [floors,        setFloors]        = useState<IFloor[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [selectedFloor, setSelectedFloor] = useState(floorIdParam);
  const [statusFilter,  setStatusFilter]  = useState('');
  const [viewMode,      setViewMode]      = useState<'visual'|'list'>('visual');
  const [freeingTable, setFreeingTable]   = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/tables?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (selectedFloor) url += `floorId=${selectedFloor}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      url += `&_=${Date.now()}`;
      
      // ✅ Use adminApi instead of api
      const res = await adminApi.get(url);
      
      if (res.data.success) {
        setTables(res.data.data?.tables ?? []);
        setFloors(res.data.data?.floors ?? []);
      }
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to fetch tables'); 
    }
    finally { setLoading(false); }
  }, [search, selectedFloor, statusFilter]);

  const handleFreeTable = async (tableId: string, tableNumber: string) => {
    if (!confirm(`⚠️ Free Table ${tableNumber}?\n\nThis will:\n• Mark table as AVAILABLE\n• Cancel any pending orders\n• Remove currentOrderId\n\nAre you sure?`)) return;
    setFreeingTable(tableId);
    try {
      // ✅ Use adminApi instead of api
      const res = await adminApi.post(`/tables/${tableId}/free`);
      if (res.data.success) {
        toast.success(`✅ Table ${tableNumber} is now available`);
        fetchTables();
      } else {
        toast.error(res.data.error || 'Failed to free table');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to free table');
    } finally {
      setFreeingTable(null);
    }
  };

  useEffect(() => { fetchTables(); }, [fetchTables]);

  // ✅ Listen for payment refresh flags
  useEffect(() => {
    const checkPaymentRefresh = () => {
      const needsRefresh = localStorage.getItem('tablesNeedRefresh');
      const sessionRefresh = sessionStorage.getItem('forceTableRefresh');
      
      if (needsRefresh || sessionRefresh) {
        localStorage.removeItem('tablesNeedRefresh');
        sessionStorage.removeItem('forceTableRefresh');
        console.log('🔄 Payment detected - refreshing tables...');
        setTables([]);
        setTimeout(() => {
          fetchTables();
          toast.success('✅ Tables updated! Payment completed.');
        }, 200);
      }
    };
    
    checkPaymentRefresh();
    window.addEventListener('storage', checkPaymentRefresh);
    return () => window.removeEventListener('storage', checkPaymentRefresh);
  }, [fetchTables]);
  
  // ✅ Listen for navigation state from payment
  useEffect(() => {
    if (location.state?.refresh || location.state?.fromPayment) {
      console.log('🔄 Refreshing tables from payment navigation...');
      setTables([]);
      fetchTables();
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, fetchTables, navigate]);
  
  // ✅ Refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page visible - refreshing tables');
        fetchTables();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchTables]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this table?')) return;
    try {
      // ✅ Use adminApi instead of api
      const res = await adminApi.delete(`/tables/${id}`);
      if (res.data.success) {
        setTables(p => p.filter(t => t._id !== id));
        toast.success('Table deleted successfully');
      } else alert(res.data.error);
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Delete failed'); 
    }
  };

  const handleTableClick = (table: ITable) => {
    if (table.status === 'available') {
      navigate(`/pos?tableId=${table._id}&tableNumber=${table.number}`);
    } else if (table.status === 'occupied') {
      const action = confirm(`Table ${table.number} is OCCUPIED.\n\nClick OK to ADD ORDER to this table\nClick Cancel to FREE this table`);
      if (action) navigate(`/pos?tableId=${table._id}&tableNumber=${table.number}`);
      else handleFreeTable(table._id, table.number);
    } else {
      navigate(`/tables/${table._id}/edit`);
    }
  };

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    maintenance: tables.filter(t => t.status === 'maintenance').length,
  };

  const hasFilters = search !== '' || selectedFloor !== '' || statusFilter !== '';
  const floorsWithTables = floors.map(f => ({ ...f, tables: tables.filter(t => t.floorId === f._id) })).filter(f => !selectedFloor || f._id === selectedFloor);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Table Layout</h1>
          <p className="text-stone-400 text-sm mt-0.5">Real-time floor plan · click table to order</p>
        </div>
        <button onClick={() => navigate('/tables/new')} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:opacity-90 shadow-md text-sm"><Plus size={16} /> Add Table</button>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total', val: stats.total, bg: '#fafaf9', border: '#e7e5e4', color: '#1c1917' },
          { label: 'Available', val: stats.available, bg: '#f0fdf4', border: '#86efac', color: '#15803d' },
          { label: 'Occupied', val: stats.occupied, bg: '#fff5f5', border: '#fca5a5', color: '#b91c1c' },
          { label: 'Reserved', val: stats.reserved, bg: '#fffbeb', border: '#fcd34d', color: '#b45309' },
          { label: 'Maintenance', val: stats.maintenance, bg: '#f9fafb', border: '#e5e7eb', color: '#4b5563' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</p>
            <p style={{ fontSize: 10, color: s.color, opacity: 0.65, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-3 mb-5 border border-stone-100 shadow-sm flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {(['visual','list'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${viewMode === m ? 'bg-orange-500 text-white shadow' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
              {m === 'visual' ? <><Eye size={12} /> Floor Plan</> : <>📋 List</>}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[150px] relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
          <input type="text" placeholder="Search table…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <select value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)} className="px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs">
          <option value="">All Floors</option>
          {floors.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="maintenance">Maintenance</option>
        </select>
        {hasFilters && <button onClick={() => { setSearch(''); setSelectedFloor(''); setStatusFilter(''); }} className="px-2 py-1.5 text-red-400 hover:bg-red-50 rounded-lg flex items-center gap-1 text-xs"><X size={12} /> Clear</button>}
        <button onClick={fetchTables} className="p-1.5 border border-stone-200 rounded-lg hover:bg-stone-50"><RefreshCw size={13} className="text-stone-400" /></button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" /></div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-stone-100">
          <Utensils size={40} className="mx-auto text-stone-200 mb-3" />
          <h3 className="text-base font-semibold text-stone-400">No tables found</h3>
          <button onClick={() => navigate('/tables/new')} className="mt-4 px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium">Add your first table</button>
        </div>
      ) : viewMode === 'visual' ? (
        <div className="space-y-5">
          <Legend />
          {floorsWithTables.map(floor => (
            <FloorCard key={floor._id} floor={floor} tables={floor.tables} onTableClick={handleTableClick} onEditTable={id => navigate(`/tables/${id}/edit`)} onDeleteTable={handleDelete} onFreeTable={handleFreeTable} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr><th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Table</th><th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Name</th><th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Floor</th><th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Seats</th><th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Shape</th><th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Status</th><th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide">Actions</th></tr>
            </thead>
            <tbody>
              {tables.map((table, idx) => (
                <tr key={table._id} className={`border-b border-stone-100 hover:bg-stone-50 transition-colors ${idx === tables.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-5 py-3 font-bold text-stone-800 text-sm">{table.number}</td>
                  <td className="px-5 py-3 text-stone-500 text-sm">{table.name || '—'}</td>
                  <td className="px-5 py-3 text-stone-500 text-sm">{table.floorName}</td>
                  <td className="px-5 py-3 text-sm"><span className="inline-flex items-center gap-1 text-stone-600"><Users size={12} /> {table.capacity}</span></td>
                  <td className="px-5 py-3 text-sm capitalize text-stone-500">{table.shape}</td>
                  <td className="px-5 py-3"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: STATUS[table.status]?.bg, color: STATUS[table.status]?.text, border: `1px solid ${STATUS[table.status]?.border}` }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS[table.status]?.dot }} />{STATUS[table.status]?.label}</span></td>
                  <td className="px-5 py-3"><div className="flex gap-1.5"><button onClick={() => handleTableClick(table)} className="p-1.5 rounded-lg hover:bg-green-50"><Coffee size={14} className="text-green-500" /></button><button onClick={() => navigate(`/tables/${table._id}/edit`)} className="p-1.5 rounded-lg hover:bg-stone-100"><Edit2 size={14} className="text-stone-400" /></button><button onClick={() => handleDelete(table._id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>{table.status === 'occupied' && (<button onClick={() => handleFreeTable(table._id, table.number)} className="p-1.5 rounded-lg hover:bg-blue-50" title="Force Free Table" disabled={freeingTable === table._id}>{freeingTable === table._id ? <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <DoorOpen size={14} className="text-blue-500" />}</button>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}