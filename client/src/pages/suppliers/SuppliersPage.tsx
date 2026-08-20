import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import {
  Plus, Edit2, Trash2, Search, X, RefreshCw,
  Building2, Phone, Mail, MapPin, User,
  CheckCircle, XCircle, AlertCircle, Loader2,
  Eye, Star, Package, Clock, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ISupplierIngredient {
  ingredientId: string;
  ingredientName?: string;
  lastPurchasePrice: number;
  unit: string;
  isPreferred: boolean;
}

interface ISupplier {
  _id: string;
  supplierName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  address: string;
  notes: string;
  status: 'active' | 'inactive';
  supplierIngredients: ISupplierIngredient[];
  createdAt: string;
  updatedAt: string;
}

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<ISupplier | null>(null);
  const [ingredientsMap, setIngredientsMap] = useState<Map<string, { name: string; unit: string }>>(new Map());

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/suppliers?limit=100';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const res = await adminApi.get(url);
      if (res.data.success) {
        setSuppliers(res.data.data?.suppliers || []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // Fetch ingredients to get names and units
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const res = await adminApi.get('/ingredients?limit=200');
        if (res.data.success) {
          const ingredients = res.data.data?.ingredients || [];
          const map = new Map();
          ingredients.forEach((ing: any) => map.set(ing._id, { name: ing.name, unit: ing.unit }));
          setIngredientsMap(map);
        }
      } catch (error) {
        console.error('Failed to fetch ingredients:', error);
      }
    };
    fetchIngredients();
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    try {
      const res = await adminApi.delete(`/suppliers/${selectedSupplier._id}`);
      if (res.data.success) {
        toast.success('Supplier deleted successfully');
        fetchSuppliers();
        setShowDeleteModal(false);
        setSelectedSupplier(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete supplier');
    }
  };

  const handleStatusToggle = async (supplier: ISupplier) => {
    const newStatus = supplier.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await adminApi.patch(`/suppliers/${supplier._id}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Supplier ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        fetchSuppliers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    inactive: suppliers.filter(s => s.status === 'inactive').length,
    totalIngredients: suppliers.reduce((sum, s) => sum + (s.supplierIngredients?.length || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your suppliers and vendors</p>
          </div>
          <button
            onClick={() => navigate('/suppliers/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-md hover:shadow-lg transition"
          >
            <Plus size={18} /> Add Supplier
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold text-gray-800">{stats.total}</p><p className="text-xs text-gray-500">Total Suppliers</p></div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"><Building2 size={18} className="text-orange-500" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold text-green-600">{stats.active}</p><p className="text-xs text-gray-500">Active</p></div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle size={18} className="text-green-500" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold text-gray-400">{stats.inactive}</p><p className="text-xs text-gray-500">Inactive</p></div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><XCircle size={18} className="text-gray-500" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold text-purple-600">{stats.totalIngredients}</p><p className="text-xs text-gray-500">Ingredients Supplied</p></div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><Package size={18} className="text-purple-500" /></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by name, contact person or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(search || statusFilter) && (<button onClick={() => { setSearch(''); setStatusFilter(''); }} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"><X size={18} /></button>)}
            <button onClick={fetchSuppliers} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        {/* Suppliers Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={40} className="animate-spin text-orange-500" /></div>
        ) : suppliers.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-600">No suppliers found</h3>
            <button onClick={() => navigate('/suppliers/new')} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg">Add your first supplier</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Ingredients</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map((supplier) => (
                  <tr key={supplier._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800">{supplier.supplierName}</p>
                        {supplier.contactPerson && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><User size={10} /> {supplier.contactPerson}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-xs flex items-center gap-1 text-gray-600"><Phone size={10} /> {supplier.phoneNumber}</p>
                        {supplier.email && <p className="text-xs flex items-center gap-1 text-gray-400"><Mail size={10} /> {supplier.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-600">{supplier.supplierIngredients?.length || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleStatusToggle(supplier)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${supplier.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {supplier.status === 'active' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {supplier.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => { setSelectedSupplier(supplier); setShowViewModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 transition" title="View Details"><Eye size={16} className="text-blue-500" /></button>
                        <button onClick={() => navigate(`/suppliers/${supplier._id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 transition" title="Edit"><Edit2 size={16} className="text-gray-500" /></button>
                        <button onClick={() => { setSelectedSupplier(supplier); setShowDeleteModal(true); }} className="p-1.5 rounded-lg hover:bg-red-50 transition" title="Delete"><Trash2 size={16} className="text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Supplier Modal - Enhanced with all information */}
      {showViewModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-white border-b p-5 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-orange-500" />
                  <h3 className="text-xl font-bold text-gray-800">{selectedSupplier.supplierName}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedSupplier.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {selectedSupplier.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Supplier Details</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information Card */}
              <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Building2 size={16} className="text-orange-500" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Supplier Name</p>
                    <p className="font-medium text-gray-800">{selectedSupplier.supplierName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Contact Person</p>
                    <p className="font-medium text-gray-800">{selectedSupplier.contactPerson || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone Number</p>
                    <p className="font-medium text-gray-800">{selectedSupplier.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="font-medium text-gray-800">{selectedSupplier.email || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Address & Notes */}
              {selectedSupplier.address && (
                <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-4 border border-blue-100">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <MapPin size={16} className="text-blue-500" />
                    Address
                  </h4>
                  <p className="text-sm text-gray-600">{selectedSupplier.address}</p>
                </div>
              )}

              {selectedSupplier.notes && (
                <div className="bg-gradient-to-r from-purple-50 to-white rounded-xl p-4 border border-purple-100">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-purple-500" />
                    Notes
                  </h4>
                  <p className="text-sm text-gray-600">{selectedSupplier.notes}</p>
                </div>
              )}

              {/* Supplier Ingredients */}
              {selectedSupplier.supplierIngredients && selectedSupplier.supplierIngredients.length > 0 ? (
                <div className="bg-gradient-to-r from-green-50 to-white rounded-xl p-4 border border-green-100">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Package size={16} className="text-green-500" />
                    Supplied Ingredients ({selectedSupplier.supplierIngredients.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedSupplier.supplierIngredients.map((ing, idx) => {
                      const ingredientInfo = ingredientsMap.get(ing.ingredientId);
                      return (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-100 hover:shadow-sm transition">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-800">
                                  {ingredientInfo?.name || ing.ingredientId}
                                </p>
                                {ing.isPreferred && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Star size={10} /> Preferred
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Unit: {ing.unit || ingredientInfo?.unit || '—'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-600">₹{ing.lastPurchasePrice}</p>
                              <p className="text-xs text-gray-400">Last Purchase Price</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
                  <Package size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No ingredients supplied by this supplier</p>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} /> Created At
                  </p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(selectedSupplier.createdAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} /> Last Updated
                  </p>
                  <p className="text-sm font-medium text-gray-700">{formatDate(selectedSupplier.updatedAt)}</p>
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition"
              >
                Close
              </button>
              <button
                onClick={() => { setShowViewModal(false); navigate(`/suppliers/${selectedSupplier._id}/edit`); }}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Edit Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <AlertCircle size={20} className="text-red-500" />
                Delete Supplier
              </h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <AlertCircle size={20} className="text-red-500" />
                <p className="text-sm text-red-600">
                  Are you sure you want to delete <strong>{selectedSupplier.supplierName}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}