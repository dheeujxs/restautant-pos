import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Edit2, Trash2, Search, X, RefreshCw, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

interface ICourseType {
  _id: string;
  name: string;
  displayOrder: number;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export default function CourseTypesPage() {
  const navigate = useNavigate();
  const [courseTypes, setCourseTypes] = useState<ICourseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchCourseTypes = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/course-types?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      
      const res = await api.get(url);
      if (res.data.success) {
        let types = res.data.data?.courseTypes || [];
        
        // Apply active filter
        if (filterActive === 'active') {
          types = types.filter((t: ICourseType) => t.isActive);
        } else if (filterActive === 'inactive') {
          types = types.filter((t: ICourseType) => !t.isActive);
        }
        
        setCourseTypes(types);
      }
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to fetch course types');
    }
    finally { setLoading(false); }
  }, [search, filterActive]);

  useEffect(() => { fetchCourseTypes(); }, [fetchCourseTypes]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete course type "${name}"? This cannot be undone.`)) return;
    try {
      const res = await api.delete(`/course-types/${id}`);
      if (res.data.success) {
        setCourseTypes(prev => prev.filter(t => t._id !== id));
        toast.success('Course type deleted successfully');
      } else {
        toast.error(res.data.error || 'Delete failed');
      }
    } catch (e: any) { 
      toast.error(e.response?.data?.error || 'Delete failed');
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Inactive</span>;
  };

  const hasFilters = search !== '' || filterActive !== 'all';

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        .type-card { transition: box-shadow 0.18s, transform 0.18s; }
        .type-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.10); transform: translateY(-2px); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Course Types</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>Manage dish course types (Starters, Main Course, Desserts, etc.)</p>
        </div>
        <button onClick={() => navigate('/add-course-type')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 11, background: 'linear-gradient(135deg,#f97316,#ef4444)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)', fontFamily: 'inherit' }}>
          <Plus size={16} strokeWidth={2.5} /> Add Course Type
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 24, border: '1px solid #f0ece4', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#b5b0a8' }} />
          <input type="text" placeholder="Search course types..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 9, border: '1px solid #e5e0d8', background: '#faf9f7', fontSize: 13, color: '#1c1a16', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        
        <div style={{ position: 'relative' }}>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value as any)}
            style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid #e5e0d8', background: '#faf9f7', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFilterActive('all'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 9, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <X size={13} /> Clear
            </button>
          )}
          <button onClick={fetchCourseTypes}
            style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid #e5e0d8', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshCw size={15} color="#6b6560" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 260 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #f0ece4', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : courseTypes.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px dashed #e5e0d8', padding: '64px 0', textAlign: 'center' }}>
          <Layers size={48} color="#d1ccc4" style={{ margin: '0 auto' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1c1a16', margin: '12px 0 6px' }}>No course types found</h3>
          <p style={{ fontSize: 13, color: '#9e9890', margin: '0 0 20px' }}>
            {hasFilters ? 'Try adjusting your filters.' : 'Start by adding your first course type.'}
          </p>
          <button onClick={() => navigate('/add-course-type')}
            style={{ padding: '10px 22px', borderRadius: 10, background: '#f97316', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            Add Course Type
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#b5b0a8', marginBottom: 14 }}>
            {courseTypes.length} course type{courseTypes.length !== 1 ? 's' : ''} found
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
            {courseTypes.map((type) => (
              <div key={type._id} className="type-card"
                style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece4', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                
                <div style={{ padding: '16px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #fef3e2, #fde8d0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Layers size={22} color="#f97316" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{type.name}</h3>
                      {getStatusBadge(type.isActive)}
                    </div>
                    {type.displayOrder > 0 && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>Display Order: {type.displayOrder}</p>
                    )}
                  </div>
                </div>

                {type.description && (
                  <div style={{ padding: '12px 18px', background: '#faf9f7', borderBottom: '1px solid #f3f4f6' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{type.description}</p>
                  </div>
                )}

                <div style={{ padding: '14px 18px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => navigate(`/course-types/${type._id}/edit`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(type._id, type.name)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>

                <div style={{ padding: '10px 18px', background: '#faf9f7', borderTop: '1px solid #f3f4f6' }}>
                  <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>
                    Created: {new Date(type.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}