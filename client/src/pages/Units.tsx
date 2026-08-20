import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { Plus, Edit2, Trash2, Package2, Search, X, RefreshCw, CheckCircle, XCircle, Ruler } from 'lucide-react';
import toast from 'react-hot-toast';

interface IUnit {
  _id: string;
  name: string;
  symbol: string;
  description: string;
  isActive: boolean;
}

export default function UnitsPage() {
  const navigate = useNavigate();
  const [units, setUnits] = useState<IUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ✅ Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Build query params properly
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      
      const res = await adminApi.get(`/units?${params.toString()}`);
      console.log('API Response:', res.data);
      
      const data = res.data?.data?.units ?? res.data?.units ?? [];
      if (res.data.success) {
        setUnits(data);
      } else {
        toast.error('Failed to fetch units');
      }
    } catch (error: any) {
      console.error('Error fetching units:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch units');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this unit?")) return;
    try {
      const res = await adminApi.delete(`/units/${id}`);
      if (res.data.success) {
        setUnits(prev => prev.filter(u => u._id !== id));
        toast.success('Unit deleted successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete unit');
    }
  };

  // ✅ Filter units on client side (for instant filtering)
  const filteredUnits = units.filter(u => {
    const matchesSearch = search === "" || 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.symbol.toLowerCase().includes(search.toLowerCase()) ||
      u.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && u.isActive) ||
      (statusFilter === "inactive" && !u.isActive);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Units</h1>
          <p className="text-stone-500 text-sm">Manage measurement units</p>
        </div>
        <button 
          onClick={() => navigate("/add-unit")} 
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-md hover:shadow-lg transition"
        >
          <Plus size={18} /> Add Unit
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <p className="text-xs text-stone-400 uppercase">Total</p>
          <p className="text-2xl font-bold">{units.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <p className="text-xs text-stone-400 uppercase">Active</p>
          <p className="text-2xl font-bold text-green-600">{units.filter(u => u.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <p className="text-xs text-stone-400 uppercase">Inactive</p>
          <p className="text-2xl font-bold text-red-500">{units.filter(u => !u.isActive).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 mb-6 border shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search units..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-500 outline-none transition" 
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-500 outline-none transition"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {search && (
            <button onClick={() => setSearch("")} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition">
              <X size={18} />
            </button>
          )}
          <button onClick={fetchUnits} className="px-3 py-2 border rounded-lg hover:bg-stone-50 transition">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {filteredUnits.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border">
          <Ruler size={48} className="mx-auto text-stone-300 mb-3" />
          <h3 className="text-lg font-semibold">No units found</h3>
          <p className="text-stone-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-stone-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-stone-500">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs uppercase font-semibold text-stone-500">Description</th>
                  <th className="px-6 py-3 text-center text-xs uppercase font-semibold text-stone-500">Status</th>
                  <th className="px-6 py-3 text-center text-xs uppercase font-semibold text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit, idx) => (
                  <tr key={unit._id} className={`border-b hover:bg-stone-50 transition ${idx === filteredUnits.length-1 ? 'border-b-0' : ''}`}>
                    <td className="px-6 py-3 font-medium">{unit.name}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 bg-stone-100 rounded text-xs font-mono">{unit.symbol || "—"}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-stone-500">{unit.description || "—"}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${unit.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {unit.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {unit.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => navigate(`/units/${unit._id}/edit`)} 
                          className="p-1.5 rounded-lg hover:bg-stone-100 transition"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(unit._id)} 
                          className="p-1.5 rounded-lg hover:bg-red-50 transition"
                          title="Delete"
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
          <div className="px-6 py-3 bg-stone-50 border-t text-sm text-stone-500">
            Showing {filteredUnits.length} of {units.length} units
          </div>
        </div>
      )}
    </div>
  );
}