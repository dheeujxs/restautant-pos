"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from '../../services/api';
import { Plus, Edit2, Trash2, Package2, Search, X, RefreshCw, Building2, Eye } from "lucide-react";

interface IFloor {
  _id: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  tableCount: number;
  createdAt: string;
}

function StatCard({ title, value, icon: Icon, gradient }: { title: string; value: number; icon: React.ElementType; gradient: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-stone-100 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon size={18} color="white" />
        </div>
      </div>
    </div>
  );
}

export default function FloorsPage() {
  const navigate = useNavigate();
  const [floors, setFloors] = useState<IFloor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchFloors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get(`/floors?search=${search}`);
      const data = res.data?.data?.floors ?? [];
      if (res.data.success) setFloors(data);
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchFloors(); }, [fetchFloors]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this floor? All tables in this floor will also be deleted.")) return;
    try {
      const res = await adminApi.delete(`/floors/${id}`);
      if (res.data.success) {
        setFloors(prev => prev.filter(f => f._id !== id));
        alert("Floor deleted!");
      } else {
        alert(res.data.error);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Delete failed");
    }
  };

  const totalFloors = floors.length;
  const activeFloors = floors.filter(f => f.isActive).length;
  const totalTables = floors.reduce((sum, f) => sum + (f.tableCount || 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Floors</h1>
          <p className="text-stone-500 text-sm mt-1">Manage restaurant floors</p>
        </div>
        <button onClick={() => navigate("/floors/new")} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:opacity-90 shadow-md">
          <Plus size={18} /> Add Floor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Floors" value={totalFloors} icon={Building2} gradient="from-blue-500 to-blue-600" />
        <StatCard title="Active Floors" value={activeFloors} icon={Building2} gradient="from-green-500 to-emerald-600" />
        <StatCard title="Total Tables" value={totalTables} icon={Package2} gradient="from-orange-500 to-red-500" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-stone-100 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input type="text" placeholder="Search floors..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          {search && <button onClick={() => setSearch("")} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"><X size={18} /></button>}
          <button onClick={fetchFloors} className="px-3 py-2 border border-stone-200 rounded-lg hover:bg-stone-50"><RefreshCw size={18} /></button>
        </div>
      </div>

      {/* Floors Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>
      ) : floors.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-stone-100">
          <Building2 size={48} className="mx-auto text-stone-300 mb-3" />
          <h3 className="text-lg font-semibold text-stone-600">No floors found</h3>
          <button onClick={() => navigate("/floors/new")} className="mt-4 px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Add your first floor</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {floors.map((floor) => (
            <div key={floor._id} className="bg-white rounded-xl border border-stone-100 overflow-hidden hover:shadow-md transition-all">
              <div className="h-32 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center relative">
                <Building2 size={48} className="text-stone-300" />
                <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium ${floor.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {floor.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-stone-800 text-lg">{floor.name}</h3>
                    <p className="text-sm text-stone-500 mt-1">{floor.description || "No description"}</p>
                  </div>
                  <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
                    {floor.tableCount || 0} Tables
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => navigate(`/tables?floorId=${floor._id}`)} className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors">
                    View Tables
                  </button>
                  <button onClick={() => navigate(`/floors/${floor._id}/edit`)} className="px-3 py-2 bg-stone-100 rounded-lg hover:bg-stone-200">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(floor._id)} className="px-3 py-2 bg-red-50 rounded-lg hover:bg-red-100">
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}