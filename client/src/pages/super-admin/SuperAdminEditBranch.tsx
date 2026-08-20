// pages/super-admin/SuperAdminEditBranch.tsx - COMPLETE FIXED VERSION

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, X, Building2, User, Phone, Mail,
  MapPin, Globe, AlertCircle, CheckCircle, Loader2,
  ChevronDown, ChevronUp, Store, Shield,
  Key, Eye, EyeOff, RefreshCw, Clock,
  PlusCircle, Trash2, Edit2, Lock,
  Coffee, Utensils, Truck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminApi } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Branch {
  _id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  managerId: string | null;
  openingDate: string;
  isMainBranch: boolean;
  workingHours: {
    monday: { open: string; close: string; isClosed: boolean };
    tuesday: { open: string; close: string; isClosed: boolean };
    wednesday: { open: string; close: string; isClosed: boolean };
    thursday: { open: string; close: string; isClosed: boolean };
    friday: { open: string; close: string; isClosed: boolean };
    saturday: { open: string; close: string; isClosed: boolean };
    sunday: { open: string; close: string; isClosed: boolean };
  };
  features: {
    dineIn: boolean;
    takeaway: boolean;
    delivery: boolean;
  };
  isActive: boolean;
  status: 'active' | 'inactive' | 'suspended';
  restaurantName?: string;
  restaurantId?: string;
}

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

// ─── Days of Week ────────────────────────────────────────────────────────────
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminEditBranch() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Branch | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ─── Fetch Branch Data ──────────────────────────────────────────────────────
  useEffect(() => {
    console.log('🔍 SuperAdminEditBranch mounted with ID:', id);
    
    if (!id || id === 'undefined' || id === 'null') {
      console.error('❌ Invalid branch ID:', id);
      toast.error('Invalid branch ID');
      navigate('/super-admin/branches');
      return;
    }

    fetchBranch(id);
  }, [id, navigate]);

  const fetchBranch = async (branchId: string) => {
    try {
      setLoading(true);
      setFetchError(null);
      console.log(`📋 Fetching branch: ${branchId}`);
      
      // ✅ Try the correct API endpoint
      const res = await superAdminApi.get(`/super-admin/branches/${branchId}`);
      console.log('📋 Branch response status:', res.status);
      console.log('📋 Branch response data:', res.data);
      
      // ✅ Check response structure
      if (res.data?.success) {
        const branch = res.data.data;
        console.log('✅ Branch data loaded:', branch);
        
        if (!branch) {
          throw new Error('No branch data received');
        }
        
        setForm({
          _id: branch._id || '',
          name: branch.name || '',
          code: branch.code || '',
          email: branch.email || '',
          phone: branch.phone || '',
          address: {
            street: branch.address?.street || '',
            city: branch.address?.city || '',
            state: branch.address?.state || '',
            country: branch.address?.country || 'India',
            pincode: branch.address?.pincode || '',
          },
          managerId: branch.managerId || null,
          openingDate: branch.openingDate ? new Date(branch.openingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          isMainBranch: branch.isMainBranch || false,
          workingHours: branch.workingHours || {
            monday: { open: '09:00', close: '22:00', isClosed: false },
            tuesday: { open: '09:00', close: '22:00', isClosed: false },
            wednesday: { open: '09:00', close: '22:00', isClosed: false },
            thursday: { open: '09:00', close: '22:00', isClosed: false },
            friday: { open: '09:00', close: '22:00', isClosed: false },
            saturday: { open: '09:00', close: '22:00', isClosed: false },
            sunday: { open: '09:00', close: '22:00', isClosed: false },
          },
          features: branch.features || {
            dineIn: true,
            takeaway: true,
            delivery: true,
          },
          isActive: branch.isActive !== false,
          status: branch.status || 'active',
          restaurantName: branch.restaurantName || '',
          restaurantId: branch.restaurantId || '',
        });
      } else {
        // ✅ Handle API error response
        const errorMsg = res.data?.error || 'Failed to fetch branch details';
        console.error('❌ API returned error:', errorMsg);
        setFetchError(errorMsg);
        toast.error(errorMsg);
        // ✅ Still set loading to false even on error
        setLoading(false);
        // ✅ Navigate back after error
        setTimeout(() => {
          navigate('/super-admin/branches');
        }, 2000);
        return;
      }
    } catch (error: any) {
      console.error('❌ Fetch branch error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // ✅ Handle specific error cases
      if (error.response?.status === 404) {
        setFetchError('Branch not found. It may have been deleted.');
        toast.error('Branch not found. It may have been deleted.');
      } else if (error.response?.status === 401) {
        setFetchError('Session expired. Please login again.');
        toast.error('Session expired. Please login again.');
        navigate('/super-admin/login');
        return;
      } else if (error.response?.status === 403) {
        setFetchError('Access denied. Super Admin only.');
        toast.error('Access denied. Super Admin only.');
        navigate('/super-admin/login');
        return;
      } else {
        const errorMsg = error.response?.data?.error || 'Failed to fetch branch details';
        setFetchError(errorMsg);
        toast.error(errorMsg);
      }
      
      // ✅ Navigate back after error
      setTimeout(() => {
        navigate('/super-admin/branches');
      }, 2000);
    } finally {
      // ✅ ALWAYS set loading to false
      setLoading(false);
    }
  };

  // ─── Form Update Helpers ──────────────────────────────────────────────────
  const updateField = (field: string, value: any) => {
    if (!form) return;
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const updateAddress = (field: string, value: any) => {
    if (!form) return;
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        address: { ...prev.address, [field]: value }
      };
    });
    if (errors[`address.${field}`]) {
      setErrors((prev) => ({ ...prev, [`address.${field}`]: '' }));
    }
  };

  const updateWorkingHours = (day: string, field: string, value: any) => {
    if (!form) return;
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        workingHours: {
          ...prev.workingHours,
          [day]: { ...prev.workingHours[day as keyof typeof prev.workingHours], [field]: value }
        }
      };
    });
  };

  const updateFeature = (feature: string, value: boolean) => {
    if (!form) return;
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        features: { ...prev.features, [feature]: value }
      };
    });
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form) return false;
    const e: Record<string, string> = {};

    if (!form.name.trim()) e.name = 'Branch name is required';
    if (form.name.trim().length < 2) e.name = 'Branch name must be at least 2 characters';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^\+?[1-9]\d{1,14}$/.test(form.phone)) e.phone = 'Invalid phone number';

    if (!form.address.street.trim()) e['address.street'] = 'Street address is required';
    if (!form.address.city.trim()) e['address.city'] = 'City is required';
    if (!form.address.state.trim()) e['address.state'] = 'State is required';
    if (!form.address.pincode.trim()) e['address.pincode'] = 'Pincode is required';
    else if (!/^[0-9]{6}$/.test(form.address.pincode)) e['address.pincode'] = 'Invalid pincode (6 digits required)';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form) return;
    if (!validate()) {
      toast.error('Please fix all errors');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: {
          street: form.address.street.trim(),
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          country: form.address.country || 'India',
          pincode: form.address.pincode.trim(),
        },
        managerId: form.managerId,
        openingDate: form.openingDate,
        isMainBranch: form.isMainBranch,
        workingHours: form.workingHours,
        features: form.features,
        isActive: form.isActive,
        status: form.status,
      };

      console.log('📤 Updating branch with payload:', payload);

      const res = await superAdminApi.patch(`/super-admin/branches/${id}`, payload);
      console.log('📥 Update response:', res.data);
      
      if (res.data?.success) {
        toast.success(res.data.message || 'Branch updated successfully!');
        navigate('/super-admin/branches');
      } else {
        toast.error(res.data?.error || 'Failed to update branch');
      }
    } catch (error: any) {
      console.error('❌ Submit error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      if (error.response?.status === 404) {
        toast.error('Branch not found. It may have been deleted.');
      } else if (error.response?.status === 409) {
        toast.error(error.response.data?.error || 'Branch with this name or code already exists');
      } else {
        toast.error(error.response?.data?.error || 'Failed to update branch. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
          <p style={{ marginTop: 16, color: '#6b7280' }}>Loading branch details...</p>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>ID: {id}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <AlertCircle size={48} color="#ef4444" />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginTop: 16 }}>Failed to Load Branch</h3>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>{fetchError}</p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Branch ID: {id}</p>
          <button
            onClick={() => navigate('/super-admin/branches')}
            style={{
              marginTop: 16,
              padding: '10px 32px',
              borderRadius: 8,
              border: 'none',
              background: '#8b5cf6',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Go Back to Branches
          </button>
        </div>
      </div>
    );
  }

  // ─── No Data State ──────────────────────────────────────────────────────────
  if (!form) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={40} color="#ef4444" />
          <p style={{ marginTop: 16, color: '#6b7280' }}>Branch not found</p>
          <button
            onClick={() => navigate('/super-admin/branches')}
            style={{
              marginTop: 12,
              padding: '8px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#8b5cf6',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ─── Render Form ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus {
          border-color: #8b5cf6 !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
        }
        .switch {
          position: relative;
          width: 44px;
          height: 24px;
          background: #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .switch.active {
          background: #8b5cf6;
        }
        .switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .switch.active::after {
          transform: translateX(20px);
        }
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
              Edit Branch
            </h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Update branch details for <strong>{form.name}</strong>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Required fields marked with *</span>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
        {/* ─── Restaurant Info ────────────────────────────────────────────── */}
        <div style={{ background: '#f5f3ff', borderRadius: 12, border: '1px solid #ede9fe', padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Store size={18} color="#8b5cf6" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
                Restaurant: <span style={{ color: '#8b5cf6' }}>{form.restaurantName || 'Loading...'}</span>
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                Branch ID: {id?.slice(0, 8)}... | Branch code: {form.code || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Basic Information ───────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Basic Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Branch Name <span style={reqStyle}>*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Andheri West"
                style={inputBase(!!errors.name)}
              />
              {errors.name && <span style={errText}>{errors.name}</span>}
            </div>
            <div>
              <label style={labelStyle}>Branch Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                placeholder="e.g., AND-001"
                style={inputBase(!!errors.code)}
              />
              <span style={helperText}>Optional. Uppercase letters, numbers, hyphens only.</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>Email <span style={reqStyle}>*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="branch@restaurant.com"
                style={inputBase(!!errors.email)}
              />
              {errors.email && <span style={errText}>{errors.email}</span>}
            </div>
            <div>
              <label style={labelStyle}>Phone <span style={reqStyle}>*</span></label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+91 9876543210"
                style={inputBase(!!errors.phone)}
              />
              {errors.phone && <span style={errText}>{errors.phone}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>Opening Date</label>
              <input
                type="date"
                value={form.openingDate}
                onChange={(e) => updateField('openingDate', e.target.value)}
                style={inputBase()}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20 }}>
              <div
                className={`switch ${form.isMainBranch ? 'active' : ''}`}
                onClick={() => updateField('isMainBranch', !form.isMainBranch)}
              />
              <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                Main Branch
              </label>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>(Primary branch of the restaurant)</span>
            </div>
          </div>
        </div>

        {/* ─── Address ──────────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Address <span style={reqStyle}>*</span>
          </h3>
          
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Street Address <span style={reqStyle}>*</span></label>
            <input
              type="text"
              value={form.address.street}
              onChange={(e) => updateAddress('street', e.target.value)}
              placeholder="123, Linking Road, Andheri West"
              style={inputBase(!!errors['address.street'])}
            />
            {errors['address.street'] && <span style={errText}>{errors['address.street']}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>City <span style={reqStyle}>*</span></label>
              <input
                type="text"
                value={form.address.city}
                onChange={(e) => updateAddress('city', e.target.value)}
                placeholder="Mumbai"
                style={inputBase(!!errors['address.city'])}
              />
              {errors['address.city'] && <span style={errText}>{errors['address.city']}</span>}
            </div>
            <div>
              <label style={labelStyle}>State <span style={reqStyle}>*</span></label>
              <input
                type="text"
                value={form.address.state}
                onChange={(e) => updateAddress('state', e.target.value)}
                placeholder="Maharashtra"
                style={inputBase(!!errors['address.state'])}
              />
              {errors['address.state'] && <span style={errText}>{errors['address.state']}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>Country</label>
              <select
                value={form.address.country}
                onChange={(e) => updateAddress('country', e.target.value)}
                style={selectBase()}
              >
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="UK">UK</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="UAE">UAE</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Pincode <span style={reqStyle}>*</span></label>
              <input
                type="text"
                value={form.address.pincode}
                onChange={(e) => updateAddress('pincode', e.target.value)}
                placeholder="400053"
                maxLength={6}
                style={inputBase(!!errors['address.pincode'])}
              />
              {errors['address.pincode'] && <span style={errText}>{errors['address.pincode']}</span>}
            </div>
          </div>
        </div>

        {/* ─── Working Hours ───────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Working Hours
          </h3>
          
          {DAYS.map((day, index) => {
            const hours = form.workingHours[day as keyof typeof form.workingHours];
            return (
              <div key={day} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0',
                borderBottom: index < DAYS.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}>
                <div style={{ width: 100, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  {DAY_LABELS[index]}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(e) => updateWorkingHours(day, 'open', e.target.value)}
                    style={{ ...inputBase(), width: 90 }}
                    disabled={hours.isClosed}
                  />
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(e) => updateWorkingHours(day, 'close', e.target.value)}
                    style={{ ...inputBase(), width: 90 }}
                    disabled={hours.isClosed}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                  <input
                    type="checkbox"
                    checked={hours.isClosed}
                    onChange={(e) => updateWorkingHours(day, 'isClosed', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#8b5cf6', cursor: 'pointer' }}
                  />
                  <label style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
                    Closed
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Features ────────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Features & Services
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className={`switch ${form.features.dineIn ? 'active' : ''}`}
                onClick={() => updateFeature('dineIn', !form.features.dineIn)}
              />
              <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Coffee size={16} /> Dine In
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className={`switch ${form.features.takeaway ? 'active' : ''}`}
                onClick={() => updateFeature('takeaway', !form.features.takeaway)}
              />
              <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Utensils size={16} /> Takeaway
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className={`switch ${form.features.delivery ? 'active' : ''}`}
                onClick={() => updateFeature('delivery', !form.features.delivery)}
              />
              <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Truck size={16} /> Delivery
              </label>
            </div>
          </div>
        </div>

        {/* ─── Status ──────────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px', marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Status
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Branch Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                style={selectBase()}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20 }}>
              <div
                className={`switch ${form.isActive ? 'active' : ''}`}
                onClick={() => updateField('isActive', !form.isActive)}
              />
              <label style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                Active
              </label>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Branch is operational</span>
            </div>
          </div>
        </div>

        {/* ─── Submit Buttons ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button
            onClick={() => navigate('/super-admin/branches')}
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
            onClick={handleSubmit}
            disabled={saving}
            style={{
              height: 44, padding: '0 32px', borderRadius: 8,
              border: 'none',
              background: saving ? '#c4b5fd' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(139,92,246,0.35)'
            }}
          >
            {saving ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : <><Save size={18} /> Update Branch</>}
          </button>
        </div>
      </div>
    </div>
  );
}