import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import {
  Sparkles, Loader2, User, Phone, Mail,
  ChevronUp, ChevronDown, ArrowLeft, RefreshCw, Plus,
  AlertCircle, CheckCircle, Key, Lock, Shield, Users,
  UserCog, Eye, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface IRole {
  _id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface StaffFormData {
  name: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  status: string;
  permissions: string[];
}

const defaultForm = (): StaffFormData => ({
  name: '',
  phoneNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: '',
  status: 'active',
  permissions: [],
});

// ─── Design tokens ───────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151' };
const reqStyle: React.CSSProperties = { color: '#ef4444', marginLeft: 2 };
const errText: React.CSSProperties = { fontSize: 11, color: '#ef4444' };

const inputBase = (err = false): React.CSSProperties => ({
  height: 40, width: '100%', boxSizing: 'border-box',
  border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8, padding: '0 12px', fontSize: 14,
  background: '#fff', color: '#111827', outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit',
});

const selectBase = (err = false): React.CSSProperties => ({
  ...inputBase(err), appearance: 'none', cursor: 'pointer', paddingRight: 32,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
});

// ─── Section Component ────────────────────────────────────────────────────────
function Section({ icon: Icon, iconColor = '#f97316', title, children, defaultOpen = true }: {
  icon: React.ElementType; iconColor?: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(p => !p)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: '#fff', borderBottom: open ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', border: 'none', textAlign: 'left' }}>
        <Icon size={16} color={iconColor} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>{title}</span>
        {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </button>
      {open && <div style={{ padding: '20px 20px 24px' }}>{children}</div>}
    </div>
  );
}

// ─── Permission Selector Component ──────────────────────────────────────────
function PermissionSelector({ 
  rolePermissions, 
  selectedPermissions, 
  onPermissionToggle,
  loading 
}: { 
  rolePermissions: string[], 
  selectedPermissions: string[], 
  onPermissionToggle: (permission: string) => void,
  loading?: boolean
}) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#f97316" />
        <span style={{ fontSize: 14, color: '#6b7280' }}>Loading permissions...</span>
      </div>
    );
  }

  if (!rolePermissions || rolePermissions.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>
          No permissions defined for this role.
        </p>
      </div>
    );
  }

  // Group permissions by category
  const groupedPermissions = groupPermissionsByCategory(rolePermissions);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(groupedPermissions).map(([category, perms]) => (
        <div key={category}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            {category}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {perms.map(perm => {
              const permissionName = perm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const isChecked = selectedPermissions.includes(perm);
              return (
                <label 
                  key={perm}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: isChecked ? '#fef3c7' : '#f9fafb',
                    border: `1px solid ${isChecked ? '#f59e0b' : '#e5e7eb'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onPermissionToggle(perm)}
                    style={{ width: 16, height: 16, accentColor: '#f97316' }}
                  />
                  <span>{permissionName}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helper: Group permissions by category ──────────────────────────────────
function groupPermissionsByCategory(permissions: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  
  const categoryMap: Record<string, string[]> = {
    'Orders': ['view_live_orders', 'view_order_details', 'view_ready_orders', 'acknowledge_order', 'start_cooking', 'request_ready', 'approve_ready', 'reject_ready', 'complete_order', 'update_order_status'],
    'Recipes': ['view_recipes'],
    'KOT': ['view_kot', 'create_kot', 'update_kot', 'print_kot'],
    'Tables': ['view_tables', 'assign_table', 'request_bill'],
    'Bills & Payments': ['view_bills', 'view_payments', 'process_payment', 'issue_refund'],
    'Inventory': ['view_inventory', 'update_inventory'],
    'Staff': ['view_staff', 'manage_staff', 'view_roles', 'manage_roles'],
    'Reports': ['view_reports'],
    'POS': ['view_staff_pos'],
    'Salary': ['view_salary'],
    'Attendance': ['view_attendance'],
    'Delivery': ['view_delivery_dashboard', 'view_delivery_orders', 'accept_delivery_order', 'reject_delivery_order', 'view_delivery_order_details', 'update_delivery_status', 'mark_picked_up', 'mark_in_transit', 'mark_delivered', 'view_delivery_earnings', 'view_delivery_history', 'call_customer', 'navigate_to_location', 'toggle_availability']
  };
  
  const permToCategory: Record<string, string> = {};
  Object.entries(categoryMap).forEach(([category, perms]) => {
    perms.forEach(perm => {
      permToCategory[perm] = category;
    });
  });
  
  permissions.forEach(perm => {
    const category = permToCategory[perm] || 'Other';
    if (!categories[category]) categories[category] = [];
    categories[category].push(perm);
  });
  
  return categories;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddStaffPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [form, setForm] = useState<StaffFormData>(defaultForm());
  const [roles, setRoles] = useState<IRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [autoGeneratedPassword, setAutoGeneratedPassword] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // ── Permission states ────────────────────────────────────────────────────
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [permissionsFetched, setPermissionsFetched] = useState(false);

  // ── Fetch master data ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchRoles();
    if (isEditMode) {
      fetchStaffDetails();
    }
  }, [id]);

  // ── Fetch role permissions when role changes ──────────────────────────────
  useEffect(() => {
    if (form.role && roles.length > 0) {
      fetchRolePermissions(form.role);
    } else {
      setRolePermissions([]);
      setSelectedPermissions([]);
      setPermissionsFetched(false);
    }
  }, [form.role, roles]);

  const fetchRoles = async () => {
    try {
      const response = await adminApi.get('/roles?isActive=true&limit=100');
      console.log('Roles API Response:', response.data);
      
      let rolesData: IRole[] = [];
      
      if (response.data.success) {
        const data = response.data.data;
        
        if (Array.isArray(data)) {
          rolesData = data.map((r: any) => ({
            _id: r._id || r.id || `role_${Date.now()}_${Math.random()}`,
            name: r.name || r,
            description: r.description || '',
            color: r.color || '#F97316',
            icon: r.icon || 'User'
          }));
        } else if (data && typeof data === 'object') {
          if (data.roles && Array.isArray(data.roles)) {
            rolesData = data.roles.map((r: any) => ({
              _id: r._id || r.id || `role_${Date.now()}_${Math.random()}`,
              name: r.name || r,
              description: r.description || '',
              color: r.color || '#F97316',
              icon: r.icon || 'User'
            }));
          } else if (data.records && Array.isArray(data.records)) {
            rolesData = data.records.map((r: any) => ({
              _id: r._id || r.id || `role_${Date.now()}_${Math.random()}`,
              name: r.name || r,
              description: r.description || '',
              color: r.color || '#F97316',
              icon: r.icon || 'User'
            }));
          } else if (data.results && Array.isArray(data.results)) {
            rolesData = data.results.map((r: any) => ({
              _id: r._id || r.id || `role_${Date.now()}_${Math.random()}`,
              name: r.name || r,
              description: r.description || '',
              color: r.color || '#F97316',
              icon: r.icon || 'User'
            }));
          } else if (data.items && Array.isArray(data.items)) {
            rolesData = data.items.map((r: any) => ({
              _id: r._id || r.id || `role_${Date.now()}_${Math.random()}`,
              name: r.name || r,
              description: r.description || '',
              color: r.color || '#F97316',
              icon: r.icon || 'User'
            }));
          } else {
            const arrayProps = Object.values(data).filter(val => Array.isArray(val));
            if (arrayProps.length > 0) {
              rolesData = arrayProps[0].map((r: any) => ({
                _id: r._id || r.id || `role_${Date.now()}_${Math.random()}`,
                name: r.name || r,
                description: r.description || '',
                color: r.color || '#F97316',
                icon: r.icon || 'User'
              }));
            }
          }
        }
      }
      
      if (rolesData.length === 0) {
        console.log('No roles found, using default roles');
        rolesData = [
          { _id: 'chef', name: 'chef', description: 'Head Chef', color: '#8B5CF6', icon: 'ChefHat' },
          { _id: 'cook', name: 'cook', description: 'Line Cook', color: '#3B82F6', icon: 'Utensils' },
          { _id: 'helper', name: 'helper', description: 'Kitchen Helper', color: '#6B7280', icon: 'User' },
          { _id: 'section_chef', name: 'section_chef', description: 'Section Chef', color: '#6366F1', icon: 'Shield' },
          { _id: 'kot_staff', name: 'kot_staff', description: 'KOT Staff', color: '#10B981', icon: 'Eye' },
        ];
      }
      
      setRoles(rolesData);
      
      if (!isEditMode && rolesData.length > 0 && !form.role) {
        setForm(prev => ({ ...prev, role: rolesData[0].name }));
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      const defaultRoles = [
        { _id: 'chef', name: 'chef', description: 'Head Chef', color: '#8B5CF6', icon: 'ChefHat' },
        { _id: 'cook', name: 'cook', description: 'Line Cook', color: '#3B82F6', icon: 'Utensils' },
        { _id: 'helper', name: 'helper', description: 'Kitchen Helper', color: '#6B7280', icon: 'User' },
        { _id: 'section_chef', name: 'section_chef', description: 'Section Chef', color: '#6366F1', icon: 'Shield' },
        { _id: 'kot_staff', name: 'kot_staff', description: 'KOT Staff', color: '#10B981', icon: 'Eye' },
      ];
      setRoles(defaultRoles);
      if (!isEditMode && !form.role) {
        setForm(prev => ({ ...prev, role: defaultRoles[0].name }));
      }
      toast.error('Could not load roles, using defaults');
    }
  };

  const fetchRolePermissions = async (roleName: string) => {
    setLoadingPermissions(true);
    try {
      const role = roles.find(r => r.name === roleName);
      if (!role) {
        setRolePermissions([]);
        setSelectedPermissions([]);
        setPermissionsFetched(false);
        return;
      }
      
      const response = await adminApi.get(`/roles/${role._id}/permissions`);
      if (response.data.success) {
        const perms = response.data.data.permissions || [];
        setRolePermissions(perms);
        setPermissionsFetched(true);
        
        // If we're in edit mode and have existing permissions, use those
        // Otherwise, use all permissions from the role
        if (isEditMode && form.permissions && form.permissions.length > 0) {
          setSelectedPermissions(form.permissions);
        } else {
          setSelectedPermissions([...perms]);
        }
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      toast.error('Failed to load role permissions');
      setPermissionsFetched(false);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const fetchStaffDetails = async () => {
    try {
      const response = await adminApi.get(`/staff/${id}`);
      if (response.data.success) {
        const staff = response.data.data;
        setForm({
          name: staff.name || '',
          phoneNumber: staff.phoneNumber || '',
          email: staff.email || '',
          password: '',
          confirmPassword: '',
          role: staff.role || '',
          status: staff.status || 'active',
          permissions: staff.permissions || [],
        });
        // Set selected permissions from staff data
        if (staff.permissions && staff.permissions.length > 0) {
          setSelectedPermissions(staff.permissions);
        }
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff details');
      navigate('/staff');
    } finally {
      setFetching(false);
    }
  };

  // Check for newly created role from URL params
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const newRoleName = queryParams.get('newRole');
    const newRoleId = queryParams.get('roleId');
    
    if (newRoleName && newRoleId) {
      setRoles(prev => [...prev, { _id: newRoleId, name: newRoleName, description: '', color: '#F97316', icon: 'User' }]);
      setForm(prev => ({ ...prev, role: newRoleName }));
      toast.success(`Role "${newRoleName}" created and selected!`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const upd = <K extends keyof StaffFormData>(key: K, value: StaffFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleName = e.target.value;
    upd('role', roleName);
    // Reset permissions when role changes
    setSelectedPermissions([]);
    setPermissionsFetched(false);
    if (errors.role) setErrors(prev => ({ ...prev, role: '' }));
  };

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
    // Update form permissions
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleSelectAllPermissions = () => {
    if (selectedPermissions.length === rolePermissions.length) {
      setSelectedPermissions([]);
      setForm(prev => ({ ...prev, permissions: [] }));
    } else {
      setSelectedPermissions([...rolePermissions]);
      setForm(prev => ({ ...prev, permissions: [...rolePermissions] }));
    }
  };

  const handleCreateNewRole = () => {
    navigate('/roles?returnTo=staff&returnUrl=/staff/new');
  };

  const generateRandomPassword = () => {
    const password = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4);
    upd('password', password);
    upd('confirmPassword', password);
    toast.success('Random password generated');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required';
    else if (!/^[0-9]{10}$/.test(form.phoneNumber)) e.phoneNumber = 'Please enter a valid 10-digit phone number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address';
    if (!isEditMode) {
      if (form.password && form.password.length < 6) e.password = 'Password must be at least 6 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    if (!form.role) e.role = 'Role is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

 // pages/kitchen/AddStaffPage.tsx - handleSubmit (FIXED)

const handleSubmit = async () => {
  if (!validate()) return;
  setLoading(true);
  
  try {
    const payload: any = {
      name: form.name,
      phoneNumber: form.phoneNumber,
      email: form.email || undefined,
      role: form.role,
      status: form.status,
      canLoginKitchenPortal: true,
      // ✅ CRITICAL: Send selected permissions (custom permissions)
      permissions: selectedPermissions, 
    };
    
    console.log('📤 Submitting staff with permissions:', selectedPermissions);
    
    if (!isEditMode && form.password) {
      payload.password = form.password;
    }
    
    let response;
    if (isEditMode) {
      response = await adminApi.put(`/staff/${id}`, payload);
    } else {
      response = await adminApi.post('/staff', payload);
    }
    
    if (response.data.success) {
      if (!isEditMode && response.data.autoGeneratedPassword) {
        setAutoGeneratedPassword(response.data.autoGeneratedPassword);
        toast.success(`Staff created! Password: ${response.data.autoGeneratedPassword}`, { duration: 8000 });
        setTimeout(() => navigate('/staff'), 3000);
      } else {
        toast.success(isEditMode ? 'Staff updated successfully!' : 'Staff created successfully!');
        navigate('/staff');
      }
    }
  } catch (error: any) {
    console.error('API Error:', error.response?.data);
    toast.error(error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} staff`);
  } finally {
    setLoading(false);
  }
};

  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} color="#f97316" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }
      `}</style>

      {/* Navbar */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/staff')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              padding: '0 16px',
              height: 36,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} />
            Back to Staff
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              {isEditMode ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              {isEditMode ? 'Update staff information' : 'Create a new staff account'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleCreateNewRole}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 20px',
            height: 36,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
            color: '#f97316',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Plus size={15} />
          Create New Role
        </button>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>

        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        {autoGeneratedPassword && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} color="#16a34a" /> 
            <span>Staff created! Password: <strong>{autoGeneratedPassword}</strong></span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Basic Information Section */}
          <Section icon={User} title="Basic Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => upd('name', e.target.value)} 
                  placeholder="Enter full name" 
                  style={inputBase(!!errors.name)} 
                />
                {errors.name && <span style={errText}>{errors.name}</span>}
              </div>

              <div>
                <label style={labelStyle}>Phone Number <span style={reqStyle}>*</span></label>
                <input 
                  type="tel" 
                  value={form.phoneNumber} 
                  onChange={e => upd('phoneNumber', e.target.value)} 
                  placeholder="10-digit mobile number" 
                  style={inputBase(!!errors.phoneNumber)} 
                />
                {errors.phoneNumber && <span style={errText}>{errors.phoneNumber}</span>}
              </div>

              <div>
                <label style={labelStyle}>Email Address</label>
                <input 
                  type="email" 
                  value={form.email} 
                  onChange={e => upd('email', e.target.value)} 
                  placeholder="staff@example.com" 
                  style={inputBase(!!errors.email)} 
                />
                {errors.email && <span style={errText}>{errors.email}</span>}
              </div>
            </div>
          </Section>

          {/* Role Assignment Section */}
          <Section icon={Shield} title="Role Assignment">
            <div>
              <label style={labelStyle}>Select Role <span style={reqStyle}>*</span></label>
              <select value={form.role} onChange={handleRoleChange} style={selectBase(!!errors.role)}>
                <option value="">Select a role</option>
                {Array.isArray(roles) && roles.map(role => (
                  <option key={role._id} value={role.name}>
                    {role.name} {role.description && `- ${role.description}`}
                  </option>
                ))}
              </select>
              {errors.role && <span style={errText}>{errors.role}</span>}
              {(!Array.isArray(roles) || roles.length === 0) && (
                <p style={{ fontSize: 12, color: '#f97316', marginTop: 8 }}>
                  No roles available. Click "Create New Role" button above to add one.
                </p>
              )}
            </div>
          </Section>

          {/* NEW: Permissions Section */}
          {form.role && (
            <Section icon={Lock} title="Permissions" defaultOpen={true}>
              {loadingPermissions ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#f97316" />
                  <span style={{ fontSize: 14, color: '#6b7280' }}>Loading permissions...</span>
                </div>
              ) : (
                <>
                  {rolePermissions.length > 0 && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                          Permissions for <span style={{ color: '#f97316' }}>{form.role}</span>
                        </span>
                        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>
                          ({selectedPermissions.length} of {rolePermissions.length} selected)
                        </span>
                      </div>
                      <button
                        onClick={handleSelectAllPermissions}
                        style={{
                          padding: '4px 16px',
                          borderRadius: 6,
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                          fontSize: 12,
                          fontWeight: 500,
                          color: '#374151',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {selectedPermissions.length === rolePermissions.length ? 
                          <><Square size={14} /> Deselect All</> : 
                          <><CheckSquare size={14} /> Select All</>
                        }
                      </button>
                    </div>
                  )}
                  
                  <PermissionSelector
                    rolePermissions={rolePermissions}
                    selectedPermissions={selectedPermissions}
                    onPermissionToggle={handlePermissionToggle}
                    loading={false}
                  />
                  
                  <div style={{ 
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid #f3f4f6',
                    fontSize: 12,
                    color: '#9ca3af'
                  }}>
                    <p>Select or deselect individual permissions for this staff member.</p>
                  </div>
                </>
              )}
            </Section>
          )}

          {/* Security Section (only for new staff) */}
          {!isEditMode && (
            <Section icon={Key} title="Security">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input 
                      type="password" 
                      value={form.password} 
                      onChange={e => upd('password', e.target.value)} 
                      placeholder="Leave empty to auto-generate" 
                      style={{ ...inputBase(!!errors.password), flex: 1 }} 
                    />
                    <button 
                      onClick={generateRandomPassword}
                      style={{ height: 40, padding: '0 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RefreshCw size={14} /> Generate
                    </button>
                  </div>
                  {errors.password && <span style={errText}>{errors.password}</span>}
                </div>

                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <input 
                    type="password" 
                    value={form.confirmPassword} 
                    onChange={e => upd('confirmPassword', e.target.value)} 
                    placeholder="Confirm password" 
                    style={inputBase(!!errors.confirmPassword)} 
                  />
                  {errors.confirmPassword && <span style={errText}>{errors.confirmPassword}</span>}
                </div>
              </div>
            </Section>
          )}

          {/* Account Status Section */}
          <Section icon={UserCog} title="Account Status">
            <div style={{ display: 'flex', gap: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="status"
                  value="active"
                  checked={form.status === 'active'}
                  onChange={e => upd('status', e.target.value)}
                  style={{ width: 16, height: 16, accentColor: '#f97316' }}
                />
                <span style={{ fontSize: 14 }}>Active</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="status"
                  value="inactive"
                  checked={form.status === 'inactive'}
                  onChange={e => upd('status', e.target.value)}
                  style={{ width: 16, height: 16, accentColor: '#f97316' }}
                />
                <span style={{ fontSize: 14 }}>Inactive</span>
              </label>
            </div>
          </Section>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              onClick={() => navigate('/staff')}
              style={{
                height: 40,
                padding: '0 24px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                fontSize: 14,
                fontWeight: 500,
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              style={{ 
                height: 40, 
                padding: '0 28px', 
                borderRadius: 8, 
                border: 'none', 
                background: loading ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)'
              }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Sparkles size={16} /> {isEditMode ? 'Update Staff' : 'Create Staff'}</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}