// IngredientsPage.tsx - Add this useEffect to listen for purchase updates
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {adminApi} from '../services/api';
import { Plus, Edit2, Trash2, Package2, Search, X, RefreshCw, CheckCircle, XCircle, TrendingUp, AlertTriangle, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

interface IIngredient {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  supplier: string;
  storageLocation: string;
  isActive: boolean;
}

export default function IngredientsPage() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get(`/ingredients?limit=100${search ? `&search=${search}` : ''}`);
      const items = res.data?.data?.ingredients ?? res.data?.ingredients ?? [];
      if (res.data.success) {
        setIngredients(items);
        setCategories([...new Set(items.map((i: IIngredient) => i.category).filter(Boolean))]);
        setLastUpdated(new Date());
      }
    } catch (error) { 
      console.error(error); 
      toast.error('Failed to fetch ingredients');
    } finally { 
      setLoading(false); 
    }
  }, [search]);

  useEffect(() => { 
    fetchIngredients(); 
  }, [fetchIngredients]);

  // ✅ Listen for purchase stock updates
  useEffect(() => {
    const handleStorageChange = () => {
      const needsRefresh = localStorage.getItem('ingredientsNeedRefresh');
      const sessionRefresh = sessionStorage.getItem('forceIngredientsRefresh');
      
      if (needsRefresh || sessionRefresh) {
        localStorage.removeItem('ingredientsNeedRefresh');
        sessionStorage.removeItem('forceIngredientsRefresh');
        console.log('[INGREDIENTS] Refresh triggered from purchase receive');
        fetchIngredients();
        toast.success('🔄 Stock updated from purchase!', { duration: 3000 });
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchIngredients]);

  // Auto-refresh every 10 seconds for real-time stock updates
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[INGREDIENTS] Auto-refreshing stock data...');
      fetchIngredients();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchIngredients]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ingredient?")) return;
    try {
      const res = await adminApi.delete(`/ingredients/${id}`);
      if (res.data.success) {
        setIngredients(prev => prev.filter(i => i._id !== id));
        toast.success('Ingredient deleted');
      }
    } catch (error) { 
      console.error(error);
      toast.error('Failed to delete');
    }
  };

  // Redirect to purchase page with pre-selected ingredient
  const handleAddStock = (ingredient: IIngredient) => {
    navigate('/purchases/new', { 
      state: { 
        preSelectedIngredient: {
          id: ingredient._id,
          name: ingredient.name,
          unit: ingredient.unit,
          currentStock: ingredient.currentStock,
          reorderPoint: ingredient.reorderPoint
        }
      }
    });
  };

  const filteredIngredients = ingredients.filter(i => {
    if (categoryFilter && i.category !== categoryFilter) return false;
    return true;
  });

  const lowStockCount = ingredients.filter(i => i.currentStock <= i.reorderPoint).length;
  const outOfStockCount = ingredients.filter(i => i.currentStock === 0).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Ingredients</h1>
          <p className="text-stone-500 text-sm">
            Manage raw materials • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={() => navigate("/add-ingredient")} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-md">
          <Plus size={18} /> Add Ingredient
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-xs text-stone-400 uppercase">Total Items</p>
          <p className="text-2xl font-bold">{ingredients.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-xs text-stone-400 uppercase">Low Stock</p>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-orange-500' : 'text-stone-800'}`}>{lowStockCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-xs text-stone-400 uppercase">Out of Stock</p>
          <p className={`text-2xl font-bold ${outOfStockCount > 0 ? 'text-red-500' : 'text-stone-800'}`}>{outOfStockCount}</p>
        </div>
      </div>

      {/* Low Stock Warning */}
      {lowStockCount > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2 text-orange-700">
          <AlertTriangle size={18} />
          <span className="text-sm">{lowStockCount} ingredient(s) low on stock. Please reorder!</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-6 border">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search ingredients..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" 
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || categoryFilter) && (
            <button onClick={() => { setSearch(""); setCategoryFilter(""); }} className="px-3 py-2 text-red-500">
              <X size={18} />
            </button>
          )}
          <button onClick={fetchIngredients} className="px-3 py-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Ingredients Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : filteredIngredients.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <Package2 size={48} className="mx-auto text-stone-300 mb-3" />
          <h3 className="text-lg font-semibold">No ingredients found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs uppercase">Category</th>
                <th className="px-4 py-3 text-center text-xs uppercase">Stock</th>
                <th className="px-4 py-3 text-center text-xs uppercase">Unit</th>
                <th className="px-4 py-3 text-center text-xs uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map((ing, idx) => {
                const isLowStock = ing.currentStock <= ing.reorderPoint;
                const isOutOfStock = ing.currentStock === 0;
                
                return (
                  <tr key={ing._id} className={`border-b hover:bg-stone-50 ${idx === filteredIngredients.length-1 ? 'border-b-0' : ''}`}>
                    <td className="px-4 py-3 font-medium">{ing.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-stone-500">{ing.sku}</td>
                    <td className="px-4 py-3 text-sm">{ing.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-green-600'}`}>
                        {ing.currentStock}
                      </span>
                      {isLowStock && <TrendingUp size={12} className="inline ml-1 text-orange-500" />}
                      {isOutOfStock && <span className="ml-1 text-xs text-red-500">(Out of Stock)</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{ing.unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${ing.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {ing.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {ing.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => handleAddStock(ing)} 
                          className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 flex items-center gap-1"
                          title="Create Purchase Order"
                        >
                          <Truck size={12} /> Add Stock
                        </button>
                        <button 
                          onClick={() => navigate(`/ingredients/${ing._id}/edit`)} 
                          className="p-1.5 rounded-lg hover:bg-stone-100"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(ing._id)} 
                          className="p-1.5 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
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
  );
}