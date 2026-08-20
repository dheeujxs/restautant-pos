import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { Plus, Edit2, Trash2, Package2, Search, X, RefreshCw, CheckCircle, XCircle, FolderTree } from 'lucide-react';

interface IIngredientCategory {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function IngredientCategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<IIngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get(`/ingredient-categories?limit=100${search ? `&search=${search}` : ''}`);
      const cats = res.data?.data?.categories ?? res.data?.categories ?? [];
      if (res.data.success) setCategories(cats);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  }, [search]);

  useEffect(() => { 
    fetchCategories(); 
  }, [fetchCategories]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await adminApi.delete(`/ingredient-categories/${id}`);
      if (res.data.success) setCategories(prev => prev.filter(c => c._id !== id));
    } catch (error) { 
      console.error(error); 
    }
  };

  const filteredCategories = categories.filter(c => {
    if (statusFilter === "active" && !c.isActive) return false;
    if (statusFilter === "inactive" && c.isActive) return false;
    return true;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Ingredient Categories</h1>
          <p className="text-stone-500 text-sm mt-1">Manage ingredient categories (Meat, Vegetables, Dairy, etc.)</p>
        </div>
        <button 
          onClick={() => navigate("/add-ingredient-category")} 
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-md hover:opacity-90 transition-all"
        >
          <Plus size={18} /> Add  Category
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
          <p className="text-xs text-stone-400 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-stone-800">{categories.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
          <p className="text-xs text-stone-400 uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-green-600">{categories.filter(c => c.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
          <p className="text-xs text-stone-400 uppercase tracking-wide">Inactive</p>
          <p className="text-2xl font-bold text-red-500">{categories.filter(c => !c.isActive).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-stone-200 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          {(search || statusFilter !== "all") && (
            <button 
              onClick={() => { setSearch(""); setStatusFilter("all"); }} 
              className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <X size={16} /> Clear
            </button>
          )}
          
          <button 
            onClick={fetchCategories} 
            className="px-3 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-stone-200">
          <FolderTree size={48} className="mx-auto text-stone-300 mb-3" />
          <h3 className="text-lg font-semibold text-stone-600">No categories found</h3>
          <button 
            onClick={() => navigate("/add-ingredient-category")} 
            className="mt-4 px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Add your first category
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat, idx) => (
                <tr key={cat._id} className={`border-b border-stone-100 hover:bg-stone-50 transition-colors ${idx === filteredCategories.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-6 py-3">
                    <span className="font-medium text-stone-800">{cat.name}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-stone-500">
                    {cat.description || "—"}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {cat.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button 
                        onClick={() => navigate(`/ingredient-categories/${cat._id}/edit`)} 
                        className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        <Edit2 size={16} className="text-stone-600" />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat._id)} 
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}