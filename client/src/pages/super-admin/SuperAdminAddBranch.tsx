// pages/super-admin/SuperAdminAddBranch.tsx - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../../services/api';
import {
  ArrowLeft, Save, X, Building2, User, Phone, Mail,
  MapPin, Loader2, AlertCircle, CheckCircle, XCircle,
  Shield, UserCog, RefreshCw, Edit3, Trash2, Plus,
  Search, ChevronDown, ChevronUp, Globe, Home
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Restaurant {
  _id: string;
  name: string;
}

interface BranchForm {
  name: string;
  restaurantId: string;
  restaurantName: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  phone: string;
  email: string;
  manager: string;
  isActive: boolean;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  display: 'block',
  marginBottom: 4,
};

const reqStyle: React.CSSProperties = {
  color: '#ef4444',
  marginLeft: 2,
};

const errText: React.CSSProperties = {
  fontSize: 11,
  color: '#ef4444',
  marginTop: 2,
};

const helperText: React.CSSProperties = {
  fontSize: 11,
  color: '#9ca3af',
  marginTop: 2,
};

const inputBase = (err = false): React.CSSProperties => ({
  height: 40,
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 14,
  background: '#fff',
  color: '#111827',
  outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
});

const selectBase = (err = false): React.CSSProperties => ({
  ...inputBase(err),
  appearance: 'none',
  cursor: 'pointer',
  paddingRight: 32,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminAddBranch() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  
  // ─── Form State ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<BranchForm>({
    name: '',
    restaurantId: '',
    restaurantName: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    phone: '',
    email: '',
    manager: '',
    isActive: true,
  });

  // ─── Fetch Restaurants ────────────────────────────────────────────────────
  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setFetching(true);
      setError(null);
      
      console.log('📤 Fetching restaurants...');
      
      const response = await superAdminApi.get('/super-admin/restaurants', {
        params: { limit: 100 }
      });
      
      console.log('📋 Restaurants response:', response.data);
      
      if (response.data?.success) {
        let restaurantsData = [];
        if (response.data.data?.restaurants) {
          restaurantsData = response.data.data.restaurants;
        } else if (response.data.data) {
          restaurantsData = Array.isArray(response.data.data) ? response.data.data : [];
        }
        setRestaurants(restaurantsData);
        console.log('✅ Restaurants loaded:', restaurantsData.length);
      } else {
        // Try alternative endpoint
        try {
          const altResponse = await superAdminApi.get('/restaurants', {
            params: { limit: 100 }
          });
          if (altResponse.data?.success) {
            let restaurantsData = altResponse.data.data?.restaurants || altResponse.data.data || [];
            setRestaurants(restaurantsData);
          }
        } catch (altError) {
          console.warn('Alternative endpoint failed');
          setRestaurants([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
      setError('Failed to load restaurants. Please try again.');
      setRestaurants([]);
    } finally {
      setFetching(false);
    }
  };

  // ─── Update Form Field ──────────────────────────────────────────────────
  const updateField = (field: keyof BranchForm | string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'address') {
        setForm(prev => ({
          ...prev,
          address: {
            ...prev.address,
            [child]: value,
          },
        }));
      }
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // ─── Handle Restaurant Change ──────────────────────────────────────────
  const handleRestaurantChange = (restaurantId: string) => {
    const restaurant = restaurants.find(r => r._id === restaurantId);
    setForm(prev => ({
      ...prev,
      restaurantId,
      restaurantName: restaurant?.name || '',
    }));
    if (errors.restaurantId) {
      setErrors(prev => ({ ...prev, restaurantId: '' }));
    }
  };

  // ─── Validate ──────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    
    if (!form.name.trim()) e.name = 'Branch name is required';
    if (!form.restaurantId) e.restaurantId = 'Please select a restaurant';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.address.city.trim()) e['address.city'] = 'City is required';
    if (!form.address.state.trim()) e['address.state'] = 'State is required';
    if (!form.address.pincode.trim()) e['address.pincode'] = 'Pincode is required';
    else if (!/^\d{5,6}$/.test(form.address.pincode)) e['address.pincode'] = 'Invalid pincode';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please fix all errors');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        restaurantId: form.restaurantId,
        restaurantName: form.restaurantName,
        address: {
          street: form.address.street.trim() || '',
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          pincode: form.address.pincode.trim(),
          country: form.address.country.trim() || 'India',
        },
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        manager: form.manager.trim() || '',
        isActive: form.isActive,
      };

      console.log('📤 Creating branch:', payload);

      const response = await superAdminApi.post('/super-admin/branches', payload);
      
      if (response.data?.success) {
        toast.success('Branch created successfully!');
        navigate('/super-admin/branches');
      } else {
        toast.error(response.data?.error || 'Failed to create branch');
        setError(response.data?.error || 'Failed to create branch');
      }
    } catch (error: any) {
      console.error('❌ Create branch error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create branch';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading State ────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
        <p style={{ marginTop: 16, color: '#6b7280' }}>Loading restaurants...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
      `}</style>

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/super-admin/branches')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 16px', height: 36, borderRadius: 8,
              border: '1px solid #e5e7eb', background: '#fff',
              color: '#374151', fontSize: 13, fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} />
            Back to Branches
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={18} color="#8b5cf6" />
              Add New Branch
            </h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Create a new branch for your restaurant
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/super-admin/branches')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 16px', height: 36,
            borderRadius: 8, border: '1px solid #e5e7eb',
            background: '#fff', color: '#6b7280',
            fontSize: 13, cursor: 'pointer',
          }}
        >
          <X size={15} /> Cancel
        </button>
      </div>

      {/* ─── Content ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" />
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ─── Basic Information ────────────────────────────────────────── */}
            <Section icon={Building2} title="Branch Information" iconColor="#8b5cf6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Branch Name <span style={reqStyle}>*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    style={inputBase(!!errors.name)}
                    placeholder="e.g., Downtown Branch, Uptown Branch"
                  />
                  {errors.name && <span style={errText}>{errors.name}</span>}
                </div>

                <div>
                  <label style={labelStyle}>Restaurant <span style={reqStyle}>*</span></label>
                  <select
                    value={form.restaurantId}
                    onChange={(e) => handleRestaurantChange(e.target.value)}
                    style={selectBase(!!errors.restaurantId)}
                  >
                    <option value="">Select Restaurant</option>
                    {restaurants.length > 0 ? (
                      restaurants.map(r => (
                        <option key={r._id} value={r._id}>{r.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>No restaurants available</option>
                    )}
                  </select>
                  {errors.restaurantId && <span style={errText}>{errors.restaurantId}</span>}
                  {restaurants.length === 0 && !fetching && (
                    <span style={{ ...helperText, color: '#d97706' }}>
                      ⚠️ No restaurants found. Please create a restaurant first.
                    </span>
                  )}
                </div>
              </div>
            </Section>

            {/* ─── Contact Information ────────────────────────────────────────── */}
            <Section icon={Phone} title="Contact Information" iconColor="#8b5cf6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Phone <span style={reqStyle}>*</span></label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      style={inputBase(!!errors.phone)}
                      placeholder="+91 9876543210"
                    />
                    {errors.phone && <span style={errText}>{errors.phone}</span>}
                  </div>
                  <div>
                    <label style={labelStyle}>Email <span style={reqStyle}>*</span></label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      style={inputBase(!!errors.email)}
                      placeholder="branch@restaurant.com"
                    />
                    {errors.email && <span style={errText}>{errors.email}</span>}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Branch Manager</label>
                  <input
                    type="text"
                    value={form.manager}
                    onChange={(e) => updateField('manager', e.target.value)}
                    style={inputBase()}
                    placeholder="Manager name"
                  />
                </div>
              </div>
            </Section>

            {/* ─── Address Information ────────────────────────────────────────── */}
            <Section icon={MapPin} title="Address Information" iconColor="#8b5cf6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Street Address</label>
                  <input
                    type="text"
                    value={form.address.street}
                    onChange={(e) => updateField('address.street', e.target.value)}
                    style={inputBase()}
                    placeholder="123 Main Street"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>City <span style={reqStyle}>*</span></label>
                    <input
                      type="text"
                      value={form.address.city}
                      onChange={(e) => updateField('address.city', e.target.value)}
                      style={inputBase(!!errors['address.city'])}
                      placeholder="Mumbai"
                    />
                    {errors['address.city'] && <span style={errText}>{errors['address.city']}</span>}
                  </div>
                  <div>
                    <label style={labelStyle}>State <span style={reqStyle}>*</span></label>
                    <input
                      type="text"
                      value={form.address.state}
                      onChange={(e) => updateField('address.state', e.target.value)}
                      style={inputBase(!!errors['address.state'])}
                      placeholder="Maharashtra"
                    />
                    {errors['address.state'] && <span style={errText}>{errors['address.state']}</span>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Pincode <span style={reqStyle}>*</span></label>
                    <input
                      type="text"
                      value={form.address.pincode}
                      onChange={(e) => updateField('address.pincode', e.target.value)}
                      style={inputBase(!!errors['address.pincode'])}
                      placeholder="400001"
                      maxLength={6}
                    />
                    {errors['address.pincode'] && <span style={errText}>{errors['address.pincode']}</span>}
                  </div>
                  <div>
                    <label style={labelStyle}>Country</label>
                    <input
                      type="text"
                      value={form.address.country}
                      onChange={(e) => updateField('address.country', e.target.value)}
                      style={inputBase()}
                      placeholder="India"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* ─── Status ────────────────────────────────────────────────────────── */}
            <Section icon={Shield} title="Status" iconColor="#8b5cf6">
              <div style={{ display: 'flex', gap: 20, paddingTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={form.isActive === true}
                    onChange={() => updateField('isActive', true)}
                    style={{ width: 16, height: 16, accentColor: '#8b5cf6' }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} color="#10b981" /> Active
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={form.isActive === false}
                    onChange={() => updateField('isActive', false)}
                    style={{ width: 16, height: 16, accentColor: '#8b5cf6' }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <XCircle size={14} color="#ef4444" /> Inactive
                  </span>
                </label>
              </div>
            </Section>

            {/* ─── Actions ──────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
              <button
                type="button"
                onClick={() => navigate('/super-admin/branches')}
                style={{
                  height: 40, padding: '0 24px', borderRadius: 8,
                  border: '1px solid #e5e7eb', background: '#fff',
                  fontSize: 14, fontWeight: 500, color: '#6b7280',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 40, padding: '0 32px', borderRadius: 8,
                  border: 'none',
                  background: loading ? '#c4b5fd' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 8px rgba(139,92,246,0.35)',
                }}
              >
                {loading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</>
                ) : (
                  <><Save size={18} /> Create Branch</>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}