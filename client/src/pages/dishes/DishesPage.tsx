// pages/DishesPage.tsx - Updated with Disable/Enable Toggle and FIXED API

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// ✅ FIX: Import the correct axios instance
import { adminApi } from '../../services/api';
import {
  Plus, Edit2, Trash2, Package2, Search, X, RefreshCw,
  Eye, ChevronRight, Tag, Utensils,
  CheckCircle, XCircle, Layers, Info, Leaf, Coffee,
  Power, PowerOff, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

interface IVariant {
  name: string;
  size: string;
  price: number;
}

interface IDish {
  _id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  courseTypeId: string;
  courseTypeName: string;
  dietaryType: string;
  image?: string;
  description?: string;
  isActive: boolean;
  unit: string;
  portionSize: string;
  price: number;
  kotStation?: string;
  glassType?: string;
  baseIngredient?: string;
  hasVariants?: boolean;
  variants?: IVariant[];
  ingredients?: IIngredient[];
  stockType?: string;
  currentStock?: number;
}

const DIETARY_DOT: Record<string, string> = {
  'Veg':        '#16a34a',
  'Non-veg':    '#dc2626',
  'Vegan':      '#15803d',
  'Jain':       '#b45309',
  'Eggetarian': '#ca8a04',
};

export default function DishesPage() {
  const navigate = useNavigate();
  const [dishes, setDishes] = useState<IDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Use adminApi instead of api
      const res = await adminApi.get('/dishes?limit=100');
      if (res.data.success) {
        const dishesData = res.data.data?.dishes || [];
        console.log('Fetched dishes:', dishesData);
        setDishes(dishesData);
        
        // Extract unique categories
        const uniqueCategories = [...new Map(
          dishesData.map((d: IDish) => [d.categoryId, { _id: d.categoryId, name: d.categoryName }])
        ).values()];
        setCategories(uniqueCategories);
      }
    } catch (e) { 
      console.error('Fetch failed:', e);
      toast.error('Failed to fetch dishes');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDishes(); }, []);

  // ─── Toggle Dish Active Status ──────────────────────────────────────
  const toggleDishStatus = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(id);
    
    try {
      const newStatus = !currentStatus;
      
      // Confirm action
      const confirmMessage = newStatus 
        ? 'Are you sure you want to enable this dish? It will become available for ordering.'
        : 'Are you sure you want to disable this dish? It will no longer be available for ordering.';
      
      if (!confirm(confirmMessage)) {
        setTogglingId(null);
        return;
      }
      
      // ✅ Use adminApi instead of api
      const res = await adminApi.patch(`/dishes/${id}`, { 
        isActive: newStatus 
      });
      
      if (res.data.success) {
        // Update local state
        setDishes(prev => prev.map(dish => 
          dish._id === id ? { ...dish, isActive: newStatus } : dish
        ));
        
        toast.success(`Dish ${newStatus ? 'enabled' : 'disabled'} successfully`);
        console.log(`✅ Dish ${newStatus ? 'enabled' : 'disabled'}:`, res.data.data);
      } else {
        throw new Error(res.data.error || 'Failed to update status');
      }
    } catch (error: any) {
      console.error('❌ Toggle status error:', error);
      toast.error(error.response?.data?.error || 'Failed to update dish status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this dish? This cannot be undone.')) return;
    try {
      // ✅ Use adminApi instead of api
      const res = await adminApi.delete(`/dishes/${id}`);
      if (res.data.success) {
        setDishes(prev => prev.filter(d => d._id !== id));
        toast.success('Dish deleted successfully');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to delete dish');
    }
  };

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return url.startsWith('/uploads') ? url : `/uploads/${url}`;
  };

  // ✅ Price display logic
  const getPriceDisplay = (dish: IDish): string => {
    // Priority 1: Check variants array
    if (dish.variants && dish.variants.length > 0) {
      const validPrices = dish.variants
        .map(v => v.price)
        .filter(price => price && price > 0);
      
      if (validPrices.length > 0) {
        const minPrice = Math.min(...validPrices);
        if (dish.variants.length > 1) {
          return `₹${minPrice}+`;
        }
        return `₹${minPrice}`;
      }
    }
    
    // Priority 2: Regular price
    if (dish.price && dish.price > 0) {
      return `₹${dish.price}`;
    }
    
    return `₹0`;
  };

  // ✅ Variant text helper
  const getVariantText = (dish: IDish): string | null => {
    if (dish.variants && dish.variants.length > 1) {
      return `${dish.variants.length} variants`;
    }
    return null;
  };

  const filteredDishes = dishes.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCategory && d.categoryId !== selectedCategory) return false;
    return true;
  });

  const hasFilters = search !== '' || selectedCategory !== '';

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        .dish-card { transition: box-shadow 0.18s, transform 0.18s; cursor: pointer; position: relative; }
        .dish-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.10); transform: translateY(-2px); }
        .view-btn:hover { background: #fff7ed !important; color: #f97316 !important; border-color: #fed7aa !important; }
        .edit-btn:hover  { background: #e5e7eb !important; }
        .del-btn:hover   { background: #fee2e2 !important; }
        .toggle-btn:hover { transform: scale(1.1); }
        .disabled-overlay { 
          position: absolute; 
          inset: 0; 
          background: rgba(0,0,0,0.05); 
          border-radius: 16px;
          pointer-events: none;
          border: 2px dashed #e5e7eb;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .toggling { animation: pulse 0.8s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Dishes</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>
            Manage your menu items
            <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
              {dishes.filter(d => d.isActive).length} active · {dishes.filter(d => !d.isActive).length} inactive
            </span>
          </p>
        </div>
        <button onClick={() => navigate('/add-dish')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 11, background: 'linear-gradient(135deg,#f97316,#ef4444)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)', fontFamily: 'inherit' }}>
          <Plus size={16} strokeWidth={2.5} /> Add Dish
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 24, border: '1px solid #f0ece4', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#b5b0a8' }} />
          <input type="text" placeholder="Search dishes…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 9, border: '1px solid #e5e0d8', background: '#faf9f7', fontSize: 13, color: '#1c1a16', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            style={{ padding: '9px 28px 9px 12px', borderRadius: 9, border: '1px solid #e5e0d8', background: '#faf9f7', fontSize: 13, color: selectedCategory ? '#1c1a16' : '#9e9890', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: selectedCategory ? 600 : 400 }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setSelectedCategory(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 9, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <X size={13} /> Clear
            </button>
          )}
          <button onClick={fetchDishes}
            style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid #e5e0d8', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshCw size={15} color="#6b6560" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 260 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #f0ece4', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filteredDishes.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px dashed #e5e0d8', padding: '64px 0', textAlign: 'center' }}>
          <Package2 size={40} color="#d1ccc4" style={{ margin: '0 auto' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1c1a16', margin: '12px 0 6px' }}>No dishes found</h3>
          <p style={{ fontSize: 13, color: '#9e9890', margin: '0 0 20px' }}>
            {hasFilters ? 'Try adjusting your filters.' : 'Start by adding your first dish.'}
          </p>
          <button onClick={() => navigate('/add-dish')}
            style={{ padding: '10px 22px', borderRadius: 10, background: '#f97316', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            Add Dish
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#b5b0a8', marginBottom: 14 }}>
            {filteredDishes.length} dish{filteredDishes.length !== 1 ? 'es' : ''} {hasFilters ? 'found' : 'total'}
            <span style={{ marginLeft: 12 }}>
              ({filteredDishes.filter(d => d.isActive).length} active, {filteredDishes.filter(d => !d.isActive).length} inactive)
            </span>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
            {filteredDishes.map(dish => {
              const imageUrl = getImageUrl(dish.image);
              const hasError = imageErrors[dish._id];
              const dot = DIETARY_DOT[dish.dietaryType] ?? '#9ca3af';
              const priceDisplay = getPriceDisplay(dish);
              const variantText = getVariantText(dish);
              const isMultipleVariants = dish.variants && dish.variants.length > 1;
              const isToggling = togglingId === dish._id;

              return (
                <div
                  key={dish._id}
                  className={`dish-card ${!dish.isActive ? 'opacity-75' : ''}`}
                  onClick={() => navigate(`/dishes/${dish._id}`)}
                  style={{ 
                    background: '#fff', 
                    borderRadius: 16, 
                    border: dish.isActive ? '1px solid #f0ece4' : '1px solid #fecaca',
                    overflow: 'hidden', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    position: 'relative',
                  }}
                >
                  {/* Disabled Overlay */}
                  {!dish.isActive && (
                    <div className="disabled-overlay">
                      <div style={{ 
                        position: 'absolute', 
                        top: 12, 
                        left: '50%', 
                        transform: 'translateX(-50%)',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#fff',
                        padding: '3px 12px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        pointerEvents: 'none',
                        zIndex: 5,
                      }}>
                        <PowerOff size={12} /> DISABLED
                      </div>
                    </div>
                  )}

                  {/* Image */}
                  <div style={{ 
                    height: 148, 
                    background: dish.isActive ? 'linear-gradient(135deg,#fef3e2,#fde8d0)' : 'linear-gradient(135deg,#f3f4f6,#e5e7eb)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    position: 'relative', 
                    overflow: 'hidden' 
                  }}>
                    {imageUrl && !hasError ? (
                      <img src={imageUrl} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setImageErrors(p => ({ ...p, [dish._id]: true }))} />
                    ) : (
                      <Package2 size={40} color={dish.isActive ? '#f97316' : '#9ca3af'} style={{ opacity: 0.3 }} />
                    )}
                    {isMultipleVariants && (
                      <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(124,58,237,0.9)', padding: '2px 8px', borderRadius: 20 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: '#fff' }}>{dish.variants?.length} VARIANTS</span>
                      </div>
                    )}
                    <div style={{ 
                      position: 'absolute', 
                      top: 10, 
                      right: 10, 
                      width: 10, 
                      height: 10, 
                      borderRadius: '50%', 
                      background: dish.isActive ? dot : '#9ca3af',
                      border: '2px solid #fff', 
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      opacity: dish.isActive ? 1 : 0.5,
                    }} />
                  </div>

                  {/* Info */}
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ 
                          margin: 0, 
                          fontSize: 15, 
                          fontWeight: 700, 
                          color: dish.isActive ? '#1c1a16' : '#9ca3af',
                          lineHeight: 1.3, 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis' 
                        }}>
                          {dish.name}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9e9890' }}>{dish.categoryName}</p>
                      </div>
                      {/* Status Badge */}
                      <div style={{ 
                        padding: '2px 8px', 
                        borderRadius: 12, 
                        fontSize: 9, 
                        fontWeight: 700,
                        background: dish.isActive ? '#dcfce7' : '#fee2e2',
                        color: dish.isActive ? '#166534' : '#991b1b',
                        flexShrink: 0,
                        marginLeft: 8,
                      }}>
                        {dish.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </div>
                    </div>
                    
                    {/* Price Display */}
                    <div style={{ margin: '10px 0 4px' }}>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: dish.isActive ? '#f97316' : '#9ca3af' }}>
                        {priceDisplay}
                      </p>
                      {variantText && (
                        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#9ca3af' }}>
                          {variantText}
                        </p>
                      )}
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      {/* Toggle Status Button */}
                      <button
                        className="toggle-btn"
                        onClick={e => toggleDishStatus(dish._id, dish.isActive, e)}
                        disabled={isToggling}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          border: dish.isActive ? '1px solid #fecaca' : '1px solid #bbf7d0',
                          background: dish.isActive ? '#fef2f2' : '#f0fdf4',
                          color: dish.isActive ? '#dc2626' : '#16a34a',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontFamily: 'inherit',
                          transition: 'all 0.2s',
                          opacity: isToggling ? 0.5 : 1,
                        }}
                        title={dish.isActive ? 'Disable Dish' : 'Enable Dish'}
                      >
                        {isToggling ? (
                          <div style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        ) : dish.isActive ? (
                          <PowerOff size={14} />
                        ) : (
                          <Power size={14} />
                        )}
                      </button>

                      <button
                        className="view-btn"
                        onClick={e => { e.stopPropagation(); navigate(`/dishes/${dish._id}`); }}
                        style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #e5e0d8', background: '#faf9f7', color: '#6b6560', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit' }}>
                        <Eye size={13} /> View
                      </button>
                      <button
                        className="edit-btn"
                        onClick={e => { e.stopPropagation(); navigate(`/dishes/${dish._id}/edit`); }}
                        style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #e5e0d8', background: '#f3f4f6', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit' }}>
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        className="del-btn"
                        onClick={e => handleDelete(dish._id, e)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}