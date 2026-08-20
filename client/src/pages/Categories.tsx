import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { 
  Plus, Edit2, Trash2, Package2, Search, X, RefreshCw, 
  CheckCircle, XCircle, ChevronLeft, ChevronRight
} from 'lucide-react';

interface ICategory {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
}

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const itemsPerPage = 5;

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/categories?page=${currentPage}&limit=${itemsPerPage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const res = await adminApi.get(url);
      if (res.data.success) {
        const categoriesData = res.data.data?.categories ?? res.data?.categories ?? [];
        setCategories(categoriesData);
        setTotalCategories(res.data.data?.total || res.data?.total || categoriesData.length);
        setTotalPages(Math.ceil((res.data.data?.total || res.data?.total || categoriesData.length) / itemsPerPage) || 1);
      }
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }, [search, currentPage]);

  useEffect(() => { 
    fetchCategories(); 
  }, [fetchCategories]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await adminApi.delete(`/categories/${id}`);
      if (res.data.success) {
        fetchCategories();
        alert("Category deleted!");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete category. It might have products associated.");
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await adminApi.patch(`/categories/${id}`, { isActive: !currentStatus });
      if (res.data.success) {
        fetchCategories();
        alert(`Category ${!currentStatus ? 'activated' : 'deactivated'}!`);
      }
    } catch (error) {
      console.error("Status update failed:", error);
      alert("Failed to update status");
    }
  };

  // Filter by status (client-side filtering)
  const filteredCategories = categories.filter(cat => {
    if (statusFilter === "active" && !cat.isActive) return false;
    if (statusFilter === "inactive" && cat.isActive) return false;
    return true;
  });

  const hasFilters = search !== "" || statusFilter !== "all";

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Generate page numbers to show (always 5 pages)
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = startPage + 4;
      
      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - 4);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Dishes Categories</h1>
          <p className="text-stone-500 text-sm mt-1">Manage menu categories</p>
        </div>
        <button 
          onClick={() => navigate("/add-category")} 
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:opacity-90 shadow-md"
        >
          <Plus size={18} /> Add Dishes Category
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm">
          <p className="text-xs text-stone-400 uppercase">Total</p>
          <p className="text-2xl font-bold text-stone-800">{totalCategories}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm">
          <p className="text-xs text-stone-400 uppercase">Active</p>
          <p className="text-2xl font-bold text-green-600">{categories.filter(c => c.isActive).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm">
          <p className="text-xs text-stone-400 uppercase">Inactive</p>
          <p className="text-2xl font-bold text-red-500">{categories.filter(c => !c.isActive).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-stone-100 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" 
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {hasFilters && (
            <button 
              onClick={() => { setSearch(""); setStatusFilter("all"); }} 
              className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <X size={18} />
            </button>
          )}
          <button 
            onClick={fetchCategories} 
            className="px-3 py-2 border border-stone-200 rounded-lg hover:bg-stone-50"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-stone-100">
          <Package2 size={48} className="mx-auto text-stone-300 mb-3" />
          <h3 className="text-lg font-semibold text-stone-600">No categories found</h3>
          <button 
            onClick={() => navigate("/add-category")} 
            className="mt-4 px-5 py-2 bg-orange-500 text-white rounded-lg"
          >
            Add first category
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-stone-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-stone-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((cat, idx) => (
                    <tr 
                      key={cat._id} 
                      className={`border-b border-stone-100 hover:bg-stone-50 transition-colors ${idx === filteredCategories.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {cat.image && (
                            <img 
                              src={cat.image} 
                              alt={cat.name} 
                              className="w-10 h-10 rounded-lg object-cover border border-stone-100"
                            />
                          )}
                          <span className="font-medium text-stone-800">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-stone-500">
                        {cat.description || "—"}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => handleStatusToggle(cat._id, cat.isActive)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                            cat.isActive 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {cat.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {cat.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => navigate(`/categories/${cat._id}/edit`)} 
                            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                            title="Edit Category"
                          >
                            <Edit2 size={16} className="text-stone-600" />
                          </button>
                          <button 
                            onClick={() => handleDelete(cat._id)} 
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Category"
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-stone-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCategories)} of {totalCategories} categories
              </div>
              <div className="flex gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
                    currentPage === 1 
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                      : 'bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                
                <div className="flex gap-1">
                  {getPageNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-9 h-9 rounded-lg border text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1 ${
                    currentPage === totalPages 
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                      : 'bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Pagination Info */}
          {totalPages > 1 && (
            <div className="text-center mt-4 text-xs text-stone-400">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </>
      )}
    </div>
  );
}