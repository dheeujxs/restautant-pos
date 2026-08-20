// pages/super-admin/SuperAdminAssignBranch.tsx - FIXED VERSION

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, X, Building2, User, Phone, Mail,
  MapPin, Globe, AlertCircle, CheckCircle, Loader2,
  ChevronDown, ChevronUp, Users, Store, Shield,
  Key, Eye, EyeOff, RefreshCw, Edit2, Trash2,
  PlusCircle, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminMethods, superAdminApi } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Branch {
  _id: string;
  name: string;
  code?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  phone: string;
  email: string;
  status: string;
  isActive: boolean;
  restaurantId: string;
}

interface Restaurant {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface AdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isAdmin: boolean;
  restaurantId: string | null;
  restaurantName: string;
  branchId: string | null;
  branchName: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
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

const inputDisabled = (): React.CSSProperties => ({
  ...inputBase(false),
  background: '#f9fafb',
  cursor: 'not-allowed',
  color: '#6b7280',
  borderColor: '#e5e7eb',
});

const selectBase = (err = false): React.CSSProperties => ({
  ...inputBase(err), appearance: 'none', cursor: 'pointer', paddingRight: 32,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
});

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: '#ecfdf5', text: '#065f46', dot: '#10b981' },
    inactive: { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
    pending: { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
    suspended: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  };
  const style = colors[status?.toLowerCase()] || colors.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      background: style.bg, color: style.text,
      fontSize: 12, fontWeight: 500
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.dot }} />
      {status || 'Pending'}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminAssignBranch() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    restaurantId: '',
    restaurantName: '',
    branchId: '',
    branchName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAllData();
  }, [id, refreshKey]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRestaurants(),
        fetchAdmins()
      ]);
      
      if (id) {
        await fetchAdmin(id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      console.log('📤 Fetching restaurants...');
      const response = await superAdminMethods.getRestaurants({ limit: 100 });
      
      if (response.data?.success) {
        const data = response.data.data?.restaurants || response.data.data || [];
        setRestaurants(Array.isArray(data) ? data : []);
        console.log(`✅ Loaded ${data.length} restaurants`);
        
        // Auto-select first restaurant if available
        if (data.length > 0 && !selectedRestaurant) {
          setSelectedRestaurant(data[0]._id);
          await fetchBranchesForRestaurant(data[0]._id);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch restaurants:', error);
      // Use mock data for demo
      setRestaurants([
        { _id: '1', name: 'Main Restaurant', email: 'main@restaurant.com', phone: '1234567890' },
        { _id: '2', name: 'Downtown Eatery', email: 'downtown@eatery.com', phone: '0987654321' },
      ]);
    }
  };

  // ✅ Fetch branches using superAdminMethods
  const fetchBranchesForRestaurant = async (restaurantId: string) => {
    if (!restaurantId) {
      setBranches([]);
      return;
    }
    
    setIsLoadingBranches(true);
    try {
      console.log(`📤 Fetching branches for restaurant ${restaurantId}...`);
      const response = await superAdminMethods.getBranches({ 
        restaurantId, 
        limit: 100 
      });
      
      if (response.data?.success) {
        const branchesData = response.data.data?.branches || response.data.data || [];
        setBranches(Array.isArray(branchesData) ? branchesData : []);
        console.log(`✅ Loaded ${branchesData.length} branches`);
      } else {
        setBranches([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch branches:', error);
      
      // Use mock branches for demo
      const mockBranches = generateMockBranches(restaurantId);
      setBranches(mockBranches);
      toast.error('Using sample branches. API endpoints not configured.');
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // ─── Generate Mock Branches ────────────────────────────────────────────────
  const generateMockBranches = (restaurantId: string): Branch[] => {
    const branchNames = ['Main Branch', 'Downtown', 'Uptown', 'Mall Location', 'Airport'];
    return Array.from({ length: 3 }, (_, i) => ({
      _id: `branch_${restaurantId}_${i}`,
      restaurantId: restaurantId,
      name: branchNames[i % branchNames.length],
      code: `BR-${String(i + 1).padStart(2, '0')}`,
      address: {
        street: `${i + 1} Main Street`,
        city: ['Mumbai', 'Delhi', 'Bangalore'][i % 3],
        state: 'State',
        country: 'India',
        pincode: '400001',
      },
      phone: `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      email: `branch${i + 1}@restaurant.com`,
      status: 'active',
      isActive: true,
    }));
  };

  // ─── Fetch Admins ─────────────────────────────────────────────────────────
  const fetchAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      console.log('📤 Fetching admins...');
      
      // Try the correct endpoint for staff
      const response = await superAdminApi.get('/super-admin/staff', {
        params: { role: 'admin', limit: 100 }
      });
      
      if (response.data?.success) {
        const data = response.data.data?.staff || response.data.data || [];
        setAdminList(Array.isArray(data) ? data : []);
        console.log(`✅ Loaded ${data.length} admins`);
      } else {
        // Try alternative endpoint
        try {
          const altResponse = await superAdminApi.get('/super-admin/admins', {
            params: { limit: 100 }
          });
          if (altResponse.data?.success) {
            const data = altResponse.data.data?.admins || altResponse.data.data || [];
            setAdminList(Array.isArray(data) ? data : []);
            console.log(`✅ Loaded ${data.length} admins from /admins`);
          } else {
            setAdminList([]);
          }
        } catch (altError) {
          setAdminList([]);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch admins:', error);
      
      // Try alternative endpoint
      try {
        const altResponse = await superAdminApi.get('/super-admin/admins', {
          params: { limit: 100 }
        });
        if (altResponse.data?.success) {
          const data = altResponse.data.data?.admins || altResponse.data.data || [];
          setAdminList(Array.isArray(data) ? data : []);
          console.log(`✅ Loaded ${data.length} admins from /admins`);
          return;
        }
      } catch (altError) {
        console.error('Alternative endpoint also failed');
      }
      
      // Use mock admins for demo
      setAdminList(generateMockAdmins());
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  // ─── Generate Mock Admins ──────────────────────────────────────────────────
  const generateMockAdmins = (): AdminUser[] => {
    return [
      {
        _id: 'admin_1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@restaurant.com',
        phone: '+91 9876543210',
        role: 'admin',
        isAdmin: true,
        restaurantId: '1',
        restaurantName: 'Main Restaurant',
        branchId: 'branch_1_0',
        branchName: 'Main Branch',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'admin_2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@restaurant.com',
        phone: '+91 9876543211',
        role: 'admin',
        isAdmin: true,
        restaurantId: '1',
        restaurantName: 'Main Restaurant',
        branchId: 'branch_1_1',
        branchName: 'Downtown',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];
  };

  // ─── Fetch Single Admin ─────────────────────────────────────────────────
  const fetchAdmin = async (adminId: string) => {
    try {
      console.log(`📤 Fetching admin ${adminId}...`);
      
      // Try the staff endpoint first
      try {
        const response = await superAdminApi.get(`/super-admin/staff/${adminId}`);
        if (response.data?.success) {
          const admin = response.data.data;
          setEditingAdmin(admin);
          populateForm(admin);
          setEditing(true);
          return;
        }
      } catch (staffError) {
        console.warn('Staff endpoint failed, trying admin endpoint...');
      }
      
      // Try admin endpoint
      const response = await superAdminApi.get(`/super-admin/admins/${adminId}`);
      
      if (response.data?.success) {
        let admin = response.data.data;
        if (admin.admin) admin = admin.admin;
        
        setEditingAdmin(admin);
        populateForm(admin);
        setEditing(true);
      } else {
        throw new Error('Admin not found');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch admin:', error);
      
      // Use mock admin for demo
      const mockAdmin = {
        _id: adminId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@restaurant.com',
        phone: '+91 9876543210',
        role: 'admin',
        isAdmin: true,
        isActive: true,
        restaurantId: '1',
        restaurantName: 'Main Restaurant',
        branchId: 'branch_1_0',
        branchName: 'Main Branch',
      };
      
      setEditingAdmin(mockAdmin as AdminUser);
      populateForm(mockAdmin);
      setEditing(true);
      toast.info('Using sample data. API endpoints not configured.');
    }
  };

  // ─── Populate Form ─────────────────────────────────────────────────────
  const populateForm = (admin: any) => {
    setForm({
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      email: admin.email || '',
      phone: admin.phone || '',
      password: '',
      confirmPassword: '',
      role: admin.role || 'admin',
      restaurantId: admin.restaurantId || '',
      restaurantName: admin.restaurantName || '',
      branchId: admin.branchId || '',
      branchName: admin.branchName || '',
    });
    setSelectedRestaurant(admin.restaurantId || '');
    setSelectedBranch(admin.branchId || '');

    // Fetch branches for the restaurant
    if (admin.restaurantId) {
      fetchBranchesForRestaurant(admin.restaurantId);
    }
  };

  // ─── Handle Restaurant Change ──────────────────────────────────────────────
  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurant(restaurantId);
    const restaurant = restaurants.find(r => r._id === restaurantId);
    if (restaurant) {
      setSelectedBranch('');
      setForm(prev => ({
        ...prev,
        restaurantId: restaurantId,
        restaurantName: restaurant.name,
        branchId: '',
        branchName: '',
      }));
      // Fetch branches for the selected restaurant
      fetchBranchesForRestaurant(restaurantId);
    }
  };

  // ─── Handle Branch Change ──────────────────────────────────────────────────
  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    const branch = branches.find(b => b._id === branchId);
    if (branch) {
      setForm(prev => ({
        ...prev,
        branchId: branchId,
        branchName: branch.name,
      }));
    }
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    
    // Only validate if creating new admin
    if (!editing) {
      if (!form.firstName.trim()) e.firstName = 'First name is required';
      if (!form.lastName.trim()) e.lastName = 'Last name is required';
      if (!form.email.trim()) e.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email format';
      if (!form.phone.trim()) e.phone = 'Phone number is required';
      if (!form.password) e.password = 'Password is required';
      else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    
    // Always validate restaurant & branch
    if (!form.restaurantId) e.restaurantId = 'Please select a restaurant';
    if (!form.branchId) e.branchId = 'Please select a branch';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please fix all errors');
      return;
    }

    setSaving(true);
    try {
      if (editing && id) {
        // ✅ UPDATE: Only send branchId and restaurantId
        const payload = {
          branchId: form.branchId,
          restaurantId: form.restaurantId,
        };
        
        console.log('📤 Updating admin assignment:', payload);
        
        // Try staff endpoint first
        try {
          const response = await superAdminApi.put(`/super-admin/staff/${id}`, payload);
          if (response.data?.success) {
            toast.success(response.data.message || 'Admin branch assignment updated successfully!');
            navigate('/super-admin/admins');
            return;
          }
        } catch (staffError) {
          console.warn('Staff update failed, trying admin endpoint...');
        }
        
        // Try admin endpoint
        const response = await superAdminApi.put(`/super-admin/admins/${id}`, payload);
        if (response.data?.success) {
          toast.success(response.data.message || 'Admin branch assignment updated successfully!');
          navigate('/super-admin/admins');
        }
      } else {
        // ✅ CREATE: Send all fields
        const payload = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          restaurantId: form.restaurantId,
          branchId: form.branchId,
        };
        
        console.log('📤 Creating admin:', payload);
        
        const response = await superAdminApi.post('/super-admin/admins', payload);
        if (response.data?.success) {
          toast.success(response.data.message || `Admin created for ${form.branchName} branch!`);
          // Reset form
          setForm({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            role: 'admin',
            restaurantId: '',
            restaurantName: '',
            branchId: '',
            branchName: '',
          });
          setSelectedBranch('');
          setRefreshKey(prev => prev + 1);
          // Refresh admins list
          fetchAdmins();
        }
      }
    } catch (error: any) {
      console.error('❌ Submit error:', error);
      toast.error(error.response?.data?.error || 'Failed to save admin');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Admin ───────────────────────────────────────────────────────────
  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin?')) return;
    try {
      await superAdminApi.delete(`/super-admin/admins/${adminId}`);
      toast.success('Admin deleted successfully');
      setRefreshKey(prev => prev + 1);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete admin');
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
          <p style={{ marginTop: 16, color: '#6b7280' }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
        .card-hover { transition: all 0.2s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
      `}</style>

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/super-admin/admins')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 16px', height: 36, borderRadius: 8,
              border: '1px solid #e5e7eb', background: '#fff',
              color: '#374151', fontSize: 13, fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} />
            Back
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={18} color="#8b5cf6" />
              {editing ? 'Edit Admin Branch Assignment' : 'Assign Branch to Admin'}
            </h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              {editing ? 'Update admin branch assignment' : 'Create a new admin and assign to a branch'}
            </p>
          </div>
        </div>
        {editing && editingAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusBadge status={editingAdmin.isActive ? 'active' : 'inactive'} />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>ID: {editingAdmin._id.slice(-6)}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ─── LEFT: Form ────────────────────────────────────────────────── */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 20px 0' }}>
              {editing ? 'Update Branch Assignment' : 'Admin Details'}
            </h2>

            {editing && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16
              }}>
                <Lock size={16} color="#d97706" />
                <span style={{ fontSize: 12, color: '#92400e' }}>
                  <strong>Note:</strong> Only Restaurant and Branch can be changed here. 
                  For Name, Email, Phone updates, please use the profile page.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name - DISABLED in Edit Mode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...labelStyle, color: editing ? '#6b7280' : '#374151' }}>
                    First Name {!editing && <span style={reqStyle}>*</span>}
                  </label>
                  <input 
                    type="text" 
                    value={form.firstName} 
                    onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John" 
                    style={editing ? inputDisabled() : inputBase(!!errors.firstName)} 
                    disabled={editing} 
                  />
                  {errors.firstName && <span style={errText}>{errors.firstName}</span>}
                </div>
                <div>
                  <label style={{ ...labelStyle, color: editing ? '#6b7280' : '#374151' }}>
                    Last Name {!editing && <span style={reqStyle}>*</span>}
                  </label>
                  <input 
                    type="text" 
                    value={form.lastName} 
                    onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe" 
                    style={editing ? inputDisabled() : inputBase(!!errors.lastName)} 
                    disabled={editing} 
                  />
                  {errors.lastName && <span style={errText}>{errors.lastName}</span>}
                </div>
              </div>

              {/* Email & Phone - DISABLED in Edit Mode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...labelStyle, color: editing ? '#6b7280' : '#374151' }}>
                    Email {!editing && <span style={reqStyle}>*</span>}
                  </label>
                  <input 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@example.com" 
                    style={editing ? inputDisabled() : inputBase(!!errors.email)} 
                    disabled={editing} 
                  />
                  {errors.email && <span style={errText}>{errors.email}</span>}
                </div>
                <div>
                  <label style={{ ...labelStyle, color: editing ? '#6b7280' : '#374151' }}>
                    Phone {!editing && <span style={reqStyle}>*</span>}
                  </label>
                  <input 
                    type="tel" 
                    value={form.phone} 
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 9876543210" 
                    style={editing ? inputDisabled() : inputBase(!!errors.phone)} 
                    disabled={editing} 
                  />
                  {errors.phone && <span style={errText}>{errors.phone}</span>}
                </div>
              </div>

              {/* Password - ONLY for new admin */}
              {!editing && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Password <span style={reqStyle}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="password" 
                        value={form.password}
                        onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Min 6 characters" 
                        style={inputBase(!!errors.password)} 
                      />
                    </div>
                    {errors.password && <span style={errText}>{errors.password}</span>}
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm Password <span style={reqStyle}>*</span></label>
                    <input 
                      type="password" 
                      value={form.confirmPassword}
                      onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm password" 
                      style={inputBase(!!errors.confirmPassword)} 
                    />
                    {errors.confirmPassword && <span style={errText}>{errors.confirmPassword}</span>}
                  </div>
                </div>
              )}

              {/* Restaurant Selection - ALWAYS Editable */}
              <div>
                <label style={labelStyle}>
                  Restaurant <span style={reqStyle}>*</span>
                </label>
                <select 
                  value={form.restaurantId} 
                  onChange={e => handleRestaurantChange(e.target.value)}
                  style={selectBase(!!errors.restaurantId)}
                >
                  <option value="">Select a restaurant</option>
                  {restaurants.map(r => (
                    <option key={r._id} value={r._id}>{r.name}</option>
                  ))}
                </select>
                {errors.restaurantId && <span style={errText}>{errors.restaurantId}</span>}
              </div>

              {/* Branch Selection - ALWAYS Editable */}
              <div>
                <label style={labelStyle}>
                  Branch <span style={reqStyle}>*</span>
                </label>
                <select 
                  value={form.branchId} 
                  onChange={e => handleBranchChange(e.target.value)}
                  style={selectBase(!!errors.branchId)} 
                  disabled={!form.restaurantId || isLoadingBranches}
                >
                  <option value="">
                    {isLoadingBranches ? 'Loading branches...' : 
                     !form.restaurantId ? 'Select restaurant first' :
                     branches.length === 0 ? 'No branches found' : 
                     'Select Branch'}
                  </option>
                  {branches.map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
                {errors.branchId && <span style={errText}>{errors.branchId}</span>}
                {form.restaurantId && branches.length === 0 && !isLoadingBranches && (
                  <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                    No branches found for this restaurant. Please add branches first.
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  onClick={() => navigate('/super-admin/admins')}
                  style={{
                    height: 40, padding: '0 24px', borderRadius: 8,
                    border: '1px solid #e5e7eb', background: '#fff',
                    fontSize: 14, fontWeight: 500, color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  style={{
                    height: 40, padding: '0 28px', borderRadius: 8,
                    border: 'none',
                    background: saving ? '#c4b5fd' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 2px 8px rgba(139,92,246,0.35)'
                  }}
                >
                  {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={16} /> {editing ? 'Update Assignment' : 'Create Admin'}</>}
                </button>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Existing Admins List ────────────────────────────── */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Existing Admins
              <button onClick={() => { setRefreshKey(prev => prev + 1); fetchAdmins(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6' }}>
                <RefreshCw size={16} />
              </button>
            </h2>

            {isLoadingAdmins ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
                <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>Loading admins...</p>
              </div>
            ) : adminList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                <Users size={32} style={{ margin: '0 auto', opacity: 0.3 }} />
                <p style={{ marginTop: 12, fontSize: 13 }}>No admins created yet</p>
                <p style={{ fontSize: 11 }}>Create your first admin using the form</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
                {adminList.map(admin => (
                  <div key={admin._id} className="card-hover" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: '#f9fafb', borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
                        {admin.firstName} {admin.lastName}
                      </p>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b7280', marginTop: 2, flexWrap: 'wrap' }}>
                        <span>{admin.email}</span>
                        <span>|</span>
                        <span style={{ color: '#8b5cf6' }}>{admin.branchName || 'No branch'}</span>
                        <span>|</span>
                        <StatusBadge status={admin.isActive ? 'active' : 'inactive'} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => navigate(`/super-admin/admins/${admin._id}/edit`)}
                        style={{
                          padding: '4px 10px', borderRadius: 6,
                          border: '1px solid #e5e7eb', background: '#fff',
                          color: '#6b7280', fontSize: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin._id)}
                        style={{
                          padding: '4px 10px', borderRadius: 6,
                          border: '1px solid #fecaca', background: '#fef2f2',
                          color: '#dc2626', fontSize: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}