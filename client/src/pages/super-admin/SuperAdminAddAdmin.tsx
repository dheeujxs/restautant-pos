// pages/super-admin/SuperAdminAddAdmin.tsx - FIXED FOR OBJECT RESTAURANT ID

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, User, Mail, Phone, Lock, AlertCircle, Loader2,
  ArrowLeft, Save, ChevronDown, ChevronUp, Shield, Eye, EyeOff,
  CheckCircle
} from 'lucide-react';
import { useSuperAdminAuth } from '../../hooks/useSuperAdminAuth';
import { superAdminApi } from '../../services/api';
import toast from 'react-hot-toast';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 };
const reqStyle: React.CSSProperties = { color: '#ef4444', marginLeft: 2 };
const errText: React.CSSProperties = { fontSize: 11, color: '#ef4444', marginTop: 2 };
const helperText: React.CSSProperties = { fontSize: 11, color: '#9ca3af', marginTop: 2 };

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
function Section({ icon: Icon, iconColor = '#8b5cf6', title, children, defaultOpen = true }: {
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

interface Branch {
  _id: string;
  name: string;
  restaurantId: string | any; // Can be string or object
  restaurantName?: string;
  address?: {
    city: string;
    state: string;
  };
}

interface Restaurant {
  _id: string;
  name: string;
}

export default function SuperAdminAddAdmin() {
  const navigate = useNavigate();
  const { token } = useSuperAdminAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    branchId: '',
    restaurantId: '',
  });
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ─── Fetch All Branches on Load ──────────────────────────────────────────
  useEffect(() => {
    fetchAllBranches();
  }, []);

  const fetchAllBranches = async () => {
    try {
      setFetching(true);
      
      console.log('📤 Fetching branches...');
      
      // ✅ FIRST: Fetch all restaurants
      const restaurantsRes = await superAdminApi.get('/super-admin/restaurants?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let restaurantsData: Restaurant[] = [];
      if (restaurantsRes.data) {
        if (restaurantsRes.data.data?.restaurants) {
          restaurantsData = restaurantsRes.data.data.restaurants;
        } else if (Array.isArray(restaurantsRes.data.data)) {
          restaurantsData = restaurantsRes.data.data;
        } else if (Array.isArray(restaurantsRes.data)) {
          restaurantsData = restaurantsRes.data;
        }
      }
      
      // ✅ Create a map of restaurant ID -> Name
      const restaurantMap: Record<string, string> = {};
      restaurantsData.forEach((r) => {
        restaurantMap[r._id] = r.name;
      });
      console.log(`✅ Found ${restaurantsData.length} restaurants`);
      console.log('📋 Restaurant Map:', restaurantMap);

      // ✅ SECOND: Fetch branches
      const branchesRes = await superAdminApi.get('/super-admin/branches?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let branchesData: any[] = [];
      if (branchesRes.data) {
        if (branchesRes.data.data?.branches) {
          branchesData = branchesRes.data.data.branches;
        } else if (Array.isArray(branchesRes.data.data)) {
          branchesData = branchesRes.data.data;
        } else if (Array.isArray(branchesRes.data)) {
          branchesData = branchesRes.data;
        }
      }
      
      console.log(`✅ Found ${branchesData.length} branches`);
      
      // ✅ Enrich branches with restaurant names - HANDLE OBJECT RESTAURANT ID
      const enrichedBranches: Branch[] = branchesData.map((branch) => {
        // ✅ Extract restaurantId properly - handle both string and object
        let restaurantId = branch.restaurantId;
        let restaurantName = 'Unknown';
        
        // If restaurantId is an object with _id, extract it
        if (restaurantId && typeof restaurantId === 'object') {
          // If it has _id, use that
          if (restaurantId._id) {
            restaurantId = restaurantId._id.toString();
          } 
          // If it has id, use that
          else if (restaurantId.id) {
            restaurantId = restaurantId.id.toString();
          }
          // If it's a populated restaurant object with name
          else if (restaurantId.name) {
            restaurantName = restaurantId.name;
            restaurantId = restaurantId._id || restaurantId.id || '';
          }
          // If it has toString method that works
          else if (restaurantId.toString && restaurantId.toString() !== '[object Object]') {
            restaurantId = restaurantId.toString();
          } else {
            // Last resort: stringify and try to extract ID
            const stringified = JSON.stringify(restaurantId);
            const idMatch = stringified.match(/[a-f0-9]{24}/);
            if (idMatch) {
              restaurantId = idMatch[0];
            } else {
              restaurantId = '';
            }
          }
        }
        
        // If restaurantId is a string, use it directly
        if (typeof restaurantId === 'string' && restaurantId) {
          // Try to get name from map
          if (restaurantMap[restaurantId]) {
            restaurantName = restaurantMap[restaurantId];
          }
        }
        
        // If we still don't have a restaurant name, check if the branch has restaurantName directly
        if (restaurantName === 'Unknown' && branch.restaurantName) {
          restaurantName = branch.restaurantName;
        }
        
        console.log(`📍 Branch: ${branch.name}, RestaurantId: ${restaurantId}, RestaurantName: ${restaurantName}`);
        
        return {
          _id: branch._id,
          name: branch.name || 'Unnamed Branch',
          restaurantId: typeof restaurantId === 'string' ? restaurantId : '',
          restaurantName: restaurantName,
          address: branch.address || { city: '', state: '' },
        };
      });
      
      setBranches(enrichedBranches);
      console.log(`✅ Enriched ${enrichedBranches.length} branches`);
      
    } catch (err) {
      console.error('❌ Failed to fetch branches:', err);
      setBranches([]);
      toast.error('Failed to load branches');
    } finally {
      setFetching(false);
    }
  };

  // ─── Handle Branch Selection ──────────────────────────────────────────────
  const handleBranchChange = (branchId: string) => {
    const selectedBranch = branches.find(b => b._id === branchId);
    
    if (selectedBranch) {
      console.log('📍 Selected branch:', selectedBranch.name, 'Restaurant:', selectedBranch.restaurantName);
      setFormData({ 
        ...formData, 
        branchId: branchId,
        restaurantId: selectedBranch.restaurantId || '',
      });
    } else {
      setFormData({ ...formData, branchId: '', restaurantId: '' });
    }
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.branchId) errors.branchId = 'Please select a branch';
    if (!formData.restaurantId) errors.restaurantId = 'Please select a valid branch';
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    
    setError(Object.values(errors)[0] || '');
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error(error || 'Please fix all errors');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        branchId: formData.branchId,
        restaurantId: formData.restaurantId,
      };
      
      console.log('📝 Creating admin with payload:', payload);
      
      const response = await superAdminApi.post('/super-admin/admins', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Admin created:', response.data);
      const selectedBranch = branches.find(b => b._id === formData.branchId);
      toast.success(`Admin created for ${selectedBranch?.name || 'branch'}`);
      navigate('/super-admin/admins');
    } catch (err: any) {
      console.error('❌ Failed to create admin:', err.response?.data);
      const errorMsg = err.response?.data?.error || 'Failed to create admin';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
          <p style={{ marginTop: 16, color: '#6b7280' }}>Loading branches...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Get selected branch ──────────────────────────────────────────────────
  const selectedBranch = branches.find(b => b._id === formData.branchId);

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus {
          border-color: #8b5cf6 !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
        }
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
            Back to Admins
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={18} color="#8b5cf6" />
              Add New Admin
            </h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Create a new branch administrator
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Required fields marked with *</span>
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px', maxWidth: 800, margin: '0 auto' }}>
        
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* ─── Personal Information ────────────────────────────────────────── */}
          <Section icon={User} iconColor="#8b5cf6" title="Personal Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>First Name <span style={reqStyle}>*</span></label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    style={inputBase(!!error && !formData.firstName)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    style={inputBase()}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Email <span style={reqStyle}>*</span></label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@restaurant.com"
                    style={inputBase(!!error && !formData.email)}
                  />
                  {error && !formData.email && <span style={errText}>Email is required</span>}
                </div>
                <div>
                  <label style={labelStyle}>Phone <span style={reqStyle}>*</span></label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    style={inputBase(!!error && !formData.phone)}
                  />
                  {error && !formData.phone && <span style={errText}>Phone is required</span>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Password <span style={reqStyle}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    style={inputBase(!!error && !formData.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      padding: 4
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && !formData.password && <span style={errText}>Password is required</span>}
                {formData.password && formData.password.length < 8 && (
                  <span style={errText}>Password must be at least 8 characters</span>
                )}
                <span style={helperText}>Must be at least 8 characters long</span>
              </div>
            </div>
          </Section>

          {/* ─── Branch Assignment ────────────────────────────────────────────── */}
          <Section icon={Building2} iconColor="#8b5cf6" title="Branch Assignment">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Branch <span style={reqStyle}>*</span></label>
                <select
                  value={formData.branchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  style={selectBase(!!error && !formData.branchId)}
                >
                  <option value="">Select a branch</option>
                  {branches.length > 0 ? (
                    branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                        {branch.restaurantName && branch.restaurantName !== 'Unknown' 
                          ? ` (${branch.restaurantName})` 
                          : ''}
                        {branch.address?.city ? ` - ${branch.address.city}` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No branches available</option>
                  )}
                </select>
                {error && !formData.branchId && <span style={errText}>Please select a branch</span>}
                {branches.length === 0 && !fetching && (
                  <span style={{ ...helperText, color: '#d97706' }}>
                    ⚠️ No branches found. Please add a branch first.
                  </span>
                )}
              </div>

              {/* ─── Selected Branch Details ───────────────────────────────── */}
              {selectedBranch && (
                <div style={{
                  background: '#f5f3ff',
                  border: '1px solid #ede9fe',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginTop: 4,
                }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                    <strong>Selected Branch:</strong> {selectedBranch.name || 'N/A'}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                    <strong>Restaurant:</strong> {selectedBranch.restaurantName || 'Unknown'}
                  </p>
                  {selectedBranch.address?.city && (
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                      <strong>Location:</strong> {selectedBranch.address.city}, {selectedBranch.address.state || ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* ─── Submit Buttons ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => navigate('/super-admin/admins')}
              style={{
                height: 44, padding: '0 28px', borderRadius: 8,
                border: '1px solid #e5e7eb', background: '#fff',
                fontSize: 14, fontWeight: 500, color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.branchId || !formData.restaurantId}
              style={{
                height: 44, padding: '0 32px', borderRadius: 8,
                border: 'none',
                background: (loading || !formData.branchId || !formData.restaurantId) 
                  ? '#c4b5fd' 
                  : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: (loading || !formData.branchId || !formData.restaurantId) 
                  ? 'not-allowed' 
                  : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: (loading || !formData.branchId || !formData.restaurantId) 
                  ? 'none' 
                  : '0 2px 8px rgba(139,92,246,0.35)'
              }}
            >
              {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Save size={18} /> Create Admin</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}