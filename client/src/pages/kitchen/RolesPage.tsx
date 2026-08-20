import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit, Trash2, X, Check, ArrowLeft,
  Shield, User, ChefHat, Utensils, Eye, Users,
  ChevronDown, ChevronUp, Search, Save, FileText,
  Calendar, Clock, Info, Tag, Palette, ListChecks,
  CheckCircle2, XCircle, Building2, Globe,
  LayoutGrid, List, Grid3x3, Copy, Eye as EyeIcon
} from 'lucide-react';
import { PERMISSIONS, PERMISSION_CATEGORIES, ALL_PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';

interface IRole {
  _id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const iconOptions = [
  { name: 'Shield', icon: Shield },
  { name: 'User', icon: User },
  { name: 'ChefHat', icon: ChefHat },
  { name: 'Utensils', icon: Utensils },
  { name: 'Eye', icon: Eye },
  { name: 'Users', icon: Users },
];

const colorOptions = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', 
  '#6366F1', '#8B5CF6', '#EC4899', '#6B7280', '#1F2937'
];

export default function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<IRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<IRole | null>(null);
  const [editingRole, setEditingRole] = useState<IRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#F97316',
    icon: 'Shield',
    permissions: [] as string[],
  });
  const [searchPermission, setSearchPermission] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Orders', 'KOT']);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await adminApi.get('/roles?limit=100');
      console.log('Roles API Response:', response.data);
      
      let rolesData: IRole[] = [];
      
      if (response.data.success) {
        const data = response.data.data;
        
        if (Array.isArray(data)) {
          rolesData = data;
        } else if (data && typeof data === 'object') {
          if (data.roles && Array.isArray(data.roles)) {
            rolesData = data.roles;
          } else if (data.records && Array.isArray(data.records)) {
            rolesData = data.records;
          } else if (data.results && Array.isArray(data.results)) {
            rolesData = data.results;
          } else if (data.items && Array.isArray(data.items)) {
            rolesData = data.items;
          } else {
            const arrayProps = Object.values(data).filter(val => Array.isArray(val));
            if (arrayProps.length > 0) {
              rolesData = arrayProps[0];
            }
          }
        }
      }
      
      if (!Array.isArray(rolesData)) {
        rolesData = [];
      }
      
      setRoles(rolesData);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.permissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }
    
    try {
      let response;
      if (editingRole) {
        response = await adminApi.put(`/roles/${editingRole._id}`, formData);
        toast.success('Role updated successfully');
      } else {
        response = await adminApi.post('/roles', formData);
        toast.success('Role created successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save role');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete role "${name}"?`)) {
      try {
        await adminApi.delete(`/roles/${id}`);
        toast.success('Role deleted successfully');
        fetchRoles();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete role');
      }
    }
  };

  const handleEdit = (role: IRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      color: role.color,
      icon: role.icon,
      permissions: role.permissions || [],
    });
    setShowModal(true);
  };

  const handleView = (role: IRole) => {
    setSelectedRole(role);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      color: '#F97316',
      icon: 'Shield',
      permissions: [],
    });
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const selectAllInCategory = (category: string) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category]?.permissions || [];
    const allSelected = categoryPermissions.every(p => formData.permissions.includes(p));
    
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPermissions.includes(p))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissions])]
      }));
    }
  };

  const getIconComponent = (iconName: string) => {
    const found = iconOptions.find(opt => opt.name === iconName);
    const Icon = found?.icon || Shield;
    return <Icon size={20} />;
  };

  const getPermissionCategory = (permission: string): string => {
    for (const [category, data] of Object.entries(PERMISSION_CATEGORIES)) {
      if (data.permissions.includes(permission)) {
        return category;
      }
    }
    return 'Other';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const safeRoles = Array.isArray(roles) ? roles : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Roles</h1>
          <p className="text-gray-500 text-sm">Create custom roles with fixed permissions</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Plus size={18} /> Create Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {safeRoles.map((role) => (
          <div key={role._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${role.color}20`, color: role.color }}>
                  {getIconComponent(role.icon)}
                </div>
                <div className="flex gap-1">
                  {/* ✅ View Button */}
                  <button 
                    onClick={() => handleView(role)} 
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                    title="View Details"
                  >
                    <EyeIcon size={18} />
                  </button>
                  <button 
                    onClick={() => handleEdit(role)} 
                    className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition"
                    title="Edit Role"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(role._id, role.name)} 
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Delete Role"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{role.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{role.description || 'No description'}</p>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {(role.permissions || []).slice(0, 5).map((perm) => (
                  <span key={perm} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                    {perm.replace(/_/g, ' ')}
                  </span>
                ))}
                {(role.permissions || []).length > 5 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    +{(role.permissions || []).length - 5} more
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className={`text-xs px-2 py-1 rounded-full ${role.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {role.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-400">{role.permissions?.length || 0} permissions</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {safeRoles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Shield size={48} className="mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No roles created yet</h3>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            Create Role
          </button>
        </div>
      )}

      {/* ─── VIEW DETAILS MODAL ────────────────────────────────────────── */}
      {showViewModal && selectedRole && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowViewModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-black bg-opacity-50" />
            <div className="relative bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${selectedRole.color}20`, color: selectedRole.color }}
                  >
                    {getIconComponent(selectedRole.icon)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedRole.name}</h2>
                    <p className="text-sm text-gray-500">Role Details</p>
                  </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              
              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* Role Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Tag size={12} /> Role Name
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedRole.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <FileText size={12} /> Description
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedRole.description || 'No description'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Palette size={12} /> Color
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div 
                        className="w-6 h-6 rounded-full border border-gray-200"
                        style={{ backgroundColor: selectedRole.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">{selectedRole.color}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <LayoutGrid size={12} /> Icon
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${selectedRole.color}20`, color: selectedRole.color }}
                      >
                        {getIconComponent(selectedRole.icon)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{selectedRole.icon}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Status
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                      selectedRole.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {selectedRole.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <ListChecks size={12} /> Permissions
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedRole.permissions?.length || 0} permissions</p>
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <List size={18} className="text-orange-500" />
                    Permissions List
                  </h3>
                  
                  {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedRole.permissions.map((perm) => (
                          <span 
                            key={perm} 
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                          >
                            <Check size={14} className="text-green-500" />
                            {perm.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <ListChecks size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-400">No permissions assigned</p>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between text-xs text-gray-400">
                  <span>Created: {formatDate(selectedRole.createdAt)}</span>
                  <span>Updated: {formatDate(selectedRole.updatedAt)}</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedRole);
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                >
                  <Edit size={16} /> Edit Role
                </button>
                <button 
                  onClick={() => setShowViewModal(false)} 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-black bg-opacity-50" />
            <div className="relative bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingRole ? 'Edit Role' : 'Create New Role'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                        placeholder="e.g., Head Chef, Sous Chef, Runner"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Brief description"
                      />
                    </div>
                  </div>

                  {/* Icon & Color */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                      <div className="flex gap-2 flex-wrap">
                        {iconOptions.map((icon) => {
                          const Icon = icon.icon;
                          return (
                            <button
                              key={icon.name}
                              type="button"
                              onClick={() => setFormData({ ...formData, icon: icon.name })}
                              className={`p-2 rounded-lg border-2 transition ${
                                formData.icon === icon.name
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-orange-300'
                              }`}
                            >
                              <Icon size={20} className={formData.icon === icon.name ? 'text-orange-500' : 'text-gray-400'} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`w-8 h-8 rounded-full border-2 transition ${
                              formData.color === color
                                ? 'border-gray-800 scale-110'
                                : 'border-white hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Permissions Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Permissions <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs text-gray-500">{formData.permissions.length} selected</span>
                    </div>
                    
                    <div className="relative mb-4">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchPermission}
                        onChange={(e) => setSearchPermission(e.target.value)}
                        placeholder="Search permissions..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                      {Object.entries(PERMISSION_CATEGORIES).map(([category, data]) => {
                        const filtered = data.permissions.filter(p =>
                          p.replace(/_/g, ' ').toLowerCase().includes(searchPermission.toLowerCase())
                        );
                        
                        if (filtered.length === 0) return null;
                        
                        const isExpanded = expandedCategories.includes(category);
                        const selectedCount = data.permissions.filter(p => formData.permissions.includes(p)).length;
                        const totalCount = data.permissions.length;
                        const allSelected = selectedCount === totalCount;

                        return (
                          <div key={category} className="border-b border-gray-100 last:border-0">
                            <button
                              type="button"
                              onClick={() => toggleCategory(category)}
                              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-700">{category}</span>
                                <span className="text-xs text-gray-400">({selectedCount}/{totalCount})</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); selectAllInCategory(category); }}
                                  className="text-xs text-orange-500 hover:text-orange-600"
                                >
                                  {allSelected ? 'Deselect All' : 'Select All'}
                                </button>
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="p-3 space-y-2">
                                {filtered.map((perm) => (
                                  <label key={perm} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                                    <input
                                      type="checkbox"
                                      checked={formData.permissions.includes(perm)}
                                      onChange={() => togglePermission(perm)}
                                      className="mt-0.5 w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <div>
                                      <span className="text-sm font-medium text-gray-700">{perm.replace(/_/g, ' ')}</span>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {formData.permissions.length === 0 && (
                      <p className="mt-2 text-sm text-red-500">Please select at least one permission</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2">
                      <Save size={16} />
                      {editingRole ? 'Update Role' : 'Create Role'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}