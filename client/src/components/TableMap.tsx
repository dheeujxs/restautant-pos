import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';

interface ITable {
  _id: string;
  number: string;
  name: string;
  floorId: string;
  floorName: string;
  capacity: number;
  shape: 'round' | 'square' | 'rectangle';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
}

interface IFloor {
  _id: string;
  name: string;
  description: string;
  displayOrder: number;
}

interface TableMapProps {
  onTableSelect?: (table: ITable) => void;
  selectable?: boolean;
}

// Chair positions based on capacity
const getChairPositions = (capacity: number, shape: string) => {
  const positions = [];
  
  if (capacity === 1) {
    positions.push({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
  } else if (capacity === 2) {
    positions.push({ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' });
    positions.push({ bottom: '0%', left: '50%', transform: 'translate(-50%, 50%)' });
  } else if (capacity === 3) {
    positions.push({ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' });
    positions.push({ bottom: '0%', left: '25%', transform: 'translate(-50%, 50%)' });
    positions.push({ bottom: '0%', right: '25%', transform: 'translate(50%, 50%)' });
  } else if (capacity === 4) {
    positions.push({ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' });
    positions.push({ bottom: '0%', left: '50%', transform: 'translate(-50%, 50%)' });
    positions.push({ left: '0%', top: '50%', transform: 'translate(-50%, -50%)' });
    positions.push({ right: '0%', top: '50%', transform: 'translate(50%, -50%)' });
  } else if (capacity === 5) {
    positions.push({ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' });
    positions.push({ bottom: '0%', left: '50%', transform: 'translate(-50%, 50%)' });
    positions.push({ left: '0%', top: '30%', transform: 'translate(-50%, -50%)' });
    positions.push({ right: '0%', top: '30%', transform: 'translate(50%, -50%)' });
    positions.push({ left: '0%', top: '70%', transform: 'translate(-50%, -50%)' });
  } else if (capacity === 6) {
    positions.push({ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' });
    positions.push({ bottom: '0%', left: '50%', transform: 'translate(-50%, 50%)' });
    positions.push({ left: '0%', top: '50%', transform: 'translate(-50%, -50%)' });
    positions.push({ right: '0%', top: '50%', transform: 'translate(50%, -50%)' });
    positions.push({ top: '30%', left: '0%', transform: 'translate(-50%, -50%)' });
    positions.push({ bottom: '30%', left: '0%', transform: 'translate(-50%, 50%)' });
  } else if (capacity === 8) {
    positions.push({ top: '0%', left: '50%', transform: 'translate(-50%, -50%)' });
    positions.push({ bottom: '0%', left: '50%', transform: 'translate(-50%, 50%)' });
    positions.push({ left: '0%', top: '50%', transform: 'translate(-50%, -50%)' });
    positions.push({ right: '0%', top: '50%', transform: 'translate(50%, -50%)' });
    positions.push({ top: '0%', left: '25%', transform: 'translate(-50%, -50%)' });
    positions.push({ top: '0%', right: '25%', transform: 'translate(50%, -50%)' });
    positions.push({ bottom: '0%', left: '25%', transform: 'translate(-50%, 50%)' });
    positions.push({ bottom: '0%', right: '25%', transform: 'translate(50%, 50%)' });
  }
  
  return positions;
};

// Table Shape Component
function TableShape({ shape, capacity, status, number, name, onClick }: { 
  shape: string; capacity: number; status: string; number: string; name?: string; onClick: () => void;
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'available': return { bg: '#22c55e', border: '#bbf7d0', text: '#166534', icon: '🟢' };
      case 'occupied': return { bg: '#ef4444', border: '#fecaca', text: '#991b1b', icon: '🔴' };
      case 'reserved': return { bg: '#f59e0b', border: '#fde68a', text: '#92400e', icon: '🟡' };
      case 'maintenance': return { bg: '#6b7280', border: '#e5e7eb', text: '#374151', icon: '⚫' };
      default: return { bg: '#9ca3af', border: '#e5e7eb', text: '#4b5563', icon: '⚪' };
    }
  };

  const statusStyle = getStatusColor();
  const chairPositions = getChairPositions(Math.min(capacity, 8), shape);
  
  const getShapeStyle = () => {
    if (shape === 'round') {
      return {
        borderRadius: '50%',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column' as const,
        position: 'relative' as const,
      };
    }
    return {
      borderRadius: '12px',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      position: 'relative' as const,
    };
  };

  return (
    <div 
      onClick={onClick}
      className="cursor-pointer transition-all duration-200 hover:scale-105"
      style={{ width: '160px', height: '160px', margin: '0 auto', position: 'relative' }}
    >
      {/* Chairs */}
      {chairPositions.map((pos, idx) => (
        <div
          key={idx}
          className="absolute flex items-center justify-center"
          style={{
            width: '32px',
            height: '32px',
            background: '#e5e7eb',
            borderRadius: '50%',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            ...pos,
          }}
        >
          <span className="text-sm">🪑</span>
        </div>
      ))}
      
      {/* Table */}
      <div 
        className="relative shadow-lg hover:shadow-xl transition-all"
        style={{
          ...getShapeStyle(),
          background: `linear-gradient(135deg, ${statusStyle.bg}15, ${statusStyle.bg}08)`,
          border: `3px solid ${statusStyle.border}`,
          boxShadow: status === 'occupied' ? `0 8px 20px ${statusStyle.bg}40` : '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        {/* Table Number */}
        <div className="text-center z-10 relative">
          <div className="text-2xl font-bold" style={{ color: statusStyle.text }}>{number}</div>
          {name && <div className="text-xs text-stone-500 mt-0.5">{name}</div>}
        </div>
        
        {/* Capacity Badge inside table */}
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-white/80 rounded-full px-1.5 py-0.5 shadow-sm">
          <span className="text-xs font-medium text-stone-600">👥 {capacity}</span>
        </div>
      </div>
    </div>
  );
}

// Floor Card Component
function FloorCard({ floor, tables, onTableClick, onEditTable, onDeleteTable }: { 
  floor: IFloor; tables: ITable[]; onTableClick: (table: ITable) => void; 
  onEditTable: (id: string) => void; onDeleteTable: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  
  const availableTables = tables.filter(t => t.status === 'available').length;
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  const reservedTables = tables.filter(t => t.status === 'reserved').length;
  const maintenanceTables = tables.filter(t => t.status === 'maintenance').length;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Floor Header */}
      <div 
        className="p-4 bg-gradient-to-r from-stone-50 to-white border-b border-stone-200 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
              <span className="text-2xl">🏢</span> {floor.name}
            </h2>
            <div className="flex gap-3 mt-1 flex-wrap">
              <span className="text-xs text-green-600">🟢 Available: {availableTables}</span>
              <span className="text-xs text-red-600">🔴 Occupied: {occupiedTables}</span>
              <span className="text-xs text-yellow-600">🟡 Reserved: {reservedTables}</span>
              <span className="text-xs text-gray-500">⚫ Maintenance: {maintenanceTables}</span>
            </div>
          </div>
          <div className="text-stone-400 text-xl">
            {collapsed ? '▼' : '▲'}
          </div>
        </div>
      </div>
      
      {/* Tables Grid */}
      {!collapsed && (
        <div className="p-6 bg-gradient-to-br from-stone-50/50 to-white">
          {tables.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-stone-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-3xl">🍽️</span>
              </div>
              <p className="text-stone-500">No tables on this floor</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {tables.map((table) => (
                <div key={table._id} className="relative group">
                  {/* Table Visual with Dynamic Chairs */}
                  <TableShape
                    shape={table.shape}
                    capacity={table.capacity}
                    status={table.status}
                    number={table.number}
                    name={table.name}
                    onClick={() => onTableClick(table)}
                  />
                  
                  {/* Action Buttons */}
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditTable(table._id); }}
                      className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-orange-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTable(table._id); }}
                      className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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

export default function TableMap({ onTableSelect, selectable = false }: TableMapProps) {
  const navigate = useNavigate();
  const [floors, setFloors] = useState<IFloor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'floors' | 'all'>('floors');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [floorsRes, tablesRes] = await Promise.all([
          adminApi.get('/floors'),
          adminApi.get('/tables')
        ]);
        
        if (floorsRes.data.success) {
          const floorsData = floorsRes.data.data?.floors || [];
          setFloors(floorsData);
          if (floorsData.length > 0 && !selectedFloor) {
            setSelectedFloor(floorsData[0]._id);
          }
        }
        
        if (tablesRes.data.success) {
          setTables(tablesRes.data.data?.tables || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTableClick = (table: ITable) => {
    if (selectable && onTableSelect) {
      onTableSelect(table);
    } else {
      navigate(`/tables/${table._id}/edit`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Group tables by floor
  const floorsWithTables = floors.map(floor => ({
    ...floor,
    tables: tables.filter(t => t.floorId === floor._id)
  })).filter(f => f.tables.length > 0);

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Header with View Toggle */}
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setViewMode('floors')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'floors'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            🏢 By Floor
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'all'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            🪑 All Tables
          </button>
        </div>
        
        {viewMode === 'floors' && floors.length > 0 && (
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
          >
            {floors.map(floor => (
              <option key={floor._id} value={floor._id}>{floor.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {viewMode === 'floors' ? (
        // Floor-wise view
        <div className="p-6">
          {(() => {
            const currentFloor = floors.find(f => f._id === selectedFloor);
            const floorTables = tables.filter(t => t.floorId === selectedFloor);
            
            if (floorTables.length === 0) {
              return (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto bg-stone-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl">🍽️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-600">No tables on {currentFloor?.name}</h3>
                  {!selectable && (
                    <button
                      onClick={() => navigate('/tables/new')}
                      className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
                    >
                      + Add Table
                    </button>
                  )}
                </div>
              );
            }
            
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {floorTables.map((table) => (
                  <div key={table._id} className="relative group">
                    <TableShape
                      shape={table.shape}
                      capacity={table.capacity}
                      status={table.status}
                      number={table.number}
                      name={table.name}
                      onClick={() => handleTableClick(table)}
                    />
                    {!selectable && (
                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/tables/${table._id}/edit`); }}
                          className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-orange-50"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); /* delete logic */ }}
                          className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-red-50"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    {selectable && table.status === 'available' && (
                      <button
                        onClick={() => handleTableClick(table)}
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 py-1 bg-orange-500 text-white rounded-full text-xs font-medium hover:bg-orange-600 transition-colors z-20"
                      >
                        Select
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : (
        // All tables in single grid (by floor grouping within)
        <div className="p-6">
          {floorsWithTables.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">🍽️</span>
              </div>
              <h3 className="text-lg font-semibold text-stone-600">No tables found</h3>
              {!selectable && (
                <button
                  onClick={() => navigate('/tables/new')}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
                >
                  + Add Table
                </button>
              )}
            </div>
          ) : (
            floorsWithTables.map((floor) => (
              <div key={floor._id} className="mb-8 last:mb-0">
                <h3 className="text-md font-semibold text-stone-700 mb-4 pb-2 border-b border-stone-200 flex items-center gap-2">
                  <span className="text-xl">🏢</span> {floor.name}
                  <span className="text-xs text-stone-400 ml-2">({floor.tables.length} tables)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {floor.tables.map((table) => (
                    <div key={table._id} className="relative group">
                      <TableShape
                        shape={table.shape}
                        capacity={table.capacity}
                        status={table.status}
                        number={table.number}
                        name={table.name}
                        onClick={() => handleTableClick(table)}
                      />
                      {!selectable && (
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/tables/${table._id}/edit`); }}
                            className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-orange-50"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                      {selectable && table.status === 'available' && (
                        <button
                          onClick={() => handleTableClick(table)}
                          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 py-1 bg-orange-500 text-white rounded-full text-xs font-medium hover:bg-orange-600 transition-colors z-20"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Legend */}
      <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-xs text-stone-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-xs text-stone-600">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
          <span className="text-xs text-stone-600">Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-500"></div>
          <span className="text-xs text-stone-600">Maintenance</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm">🪑</span>
          <span className="text-xs text-stone-600">Chair position as per capacity</span>
        </div>
      </div>
    </div>
  );
}