import { useState, useEffect } from 'react';
import {staffApi} from '../../services/api';
import { Search, Package, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Ingredient {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  supplier?: string;
  storageLocation?: string;
  isActive: boolean;
}

export default function StaffInventory() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filtered, setFiltered] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    fetchIngredients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [ingredients, search, categoryFilter, showLowStockOnly]);

  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const res = await staffApi.get('/ingredients');
      if (res.data.success) {
        const data = res.data.data.ingredients || [];
        setIngredients(data);
        // Extract unique categories
        const cats = [...new Set(data.map((i: Ingredient) => i.category).filter(Boolean))];
        setCategories(['all', ...cats]);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...ingredients];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(s) ||
        i.sku.toLowerCase().includes(s)
      );
    }
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.category === categoryFilter);
    }
    if (showLowStockOnly) {
      result = result.filter(i => i.currentStock <= i.reorderPoint);
    }
    setFiltered(result);
  };

  const isLowStock = (ing: Ingredient) => ing.currentStock <= ing.reorderPoint;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
        <button
          onClick={fetchIngredients}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
              showLowStockOnly
                ? 'bg-red-500 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle size={14} /> Low Stock Only
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 size={32} className="animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Package size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-600">No ingredients found</h3>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((ing) => (
                  <tr key={ing._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{ing.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ing.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ing.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ing.unit}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {ing.currentStock}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{ing.reorderPoint}</td>
                    <td className="px-4 py-3">
                      {isLowStock(ing) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <AlertTriangle size={12} /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}