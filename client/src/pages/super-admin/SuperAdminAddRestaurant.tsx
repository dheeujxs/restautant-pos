// pages/super-admin/SuperAdminAddRestaurant.tsx - Updated according to backend

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Building2, User, Phone, Mail,
  MapPin, Globe, AlertCircle, Loader2,
  ChevronDown, ChevronUp, Sparkles,
  Package, Store, Clock, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import {superAdminApi} from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
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

const textareaBase = (err = false): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8, padding: '10px 12px', fontSize: 14,
  background: '#fff', color: '#111827', outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit',
  resize: 'vertical',
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminAddRestaurant() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Form State (Matching Backend Schema) ──────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
    },
    owner: {
      name: '',
      email: '',
      phone: '',
      address: '',
      pan: '',
      aadhaar: '',
    },
    businessType: 'Restaurant',
    gstNumber: '',
    panNumber: '',
    licenseNumber: '',
    fssaiLicense: '',
    commission: {
      rate: 10,
      customRate: null as number | null,
    },
  });

  const businessTypes = ['Restaurant', 'Cafe', 'Bakery', 'Food Truck', 'Cloud Kitchen', 'Fine Dining', 'Fast Food', 'Other'];
  const states = ['Maharashtra', 'Gujarat', 'Rajasthan', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Kerala', 'West Bengal', 'Uttar Pradesh', 'Punjab', 'Haryana'];

  // ─── Update Form Field ──────────────────────────────────────────────────────
  const updateField = (field: string, value: any) => {
    const keys = field.split('.');
    if (keys.length === 1) {
      setForm(prev => ({ ...prev, [field]: value }));
    } else if (keys.length === 2) {
      setForm(prev => ({ ...prev, [keys[0]]: { ...prev[keys[0] as keyof typeof prev], [keys[1]]: value } }));
    } else if (keys.length === 3) {
      setForm(prev => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0] as keyof typeof prev],
          [keys[1]]: {
            ...(prev[keys[0] as keyof typeof prev] as any)[keys[1]],
            [keys[2]]: value
          }
        }
      }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    
    // Restaurant info
    if (!form.name.trim()) e.name = 'Restaurant name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    
    // Address
    if (!form.address.street.trim()) e['address.street'] = 'Street address is required';
    if (!form.address.city.trim()) e['address.city'] = 'City is required';
    if (!form.address.state) e['address.state'] = 'State is required';
    if (!form.address.pincode.trim()) e['address.pincode'] = 'Pincode is required';
    else if (!/^[0-9]{6}$/.test(form.address.pincode)) e['address.pincode'] = 'Invalid pincode (6 digits required)';
    
    // Owner
    if (!form.owner.name.trim()) e['owner.name'] = 'Owner name is required';
    if (!form.owner.email.trim()) e['owner.email'] = 'Owner email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.owner.email)) e['owner.email'] = 'Invalid email format';
    if (!form.owner.phone.trim()) e['owner.phone'] = 'Owner phone is required';
    
    // Business type
    if (!form.businessType) e['businessType'] = 'Business type is required';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please fix all errors');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        owner: form.owner,
        businessType: form.businessType,
        gstNumber: form.gstNumber,
        panNumber: form.panNumber,
        licenseNumber: form.licenseNumber,
        fssaiLicense: form.fssaiLicense,
        commission: {
          rate: form.commission.rate,
          customRate: form.commission.customRate,
        },
      };
      
      console.log('📤 Creating restaurant:', payload);
      
      const response = await superAdminApi.post('/super-admin/restaurants', payload);
      if (response.data.success) {
        toast.success('Restaurant created successfully!');
        navigate('/super-admin/restaurants');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to create restaurant. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus {
          border-color: #8b5cf6 !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
        }
      `}</style>

      {/* ─── Navbar ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/super-admin/restaurants')}
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
            Back to Restaurants
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Add Restaurant</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Register a new restaurant on the platform</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Required fields marked with *</span>
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ─── Basic Information ────────────────────────────────────────── */}
          <Section icon={Building2} iconColor="#8b5cf6" title="Basic Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Restaurant Name <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => updateField('name', e.target.value)} 
                  placeholder="e.g., Kanha Restaurants" 
                  style={inputBase(!!errors.name)} 
                />
                {errors.name && <span style={errText}>{errors.name}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Email <span style={reqStyle}>*</span></label>
                  <input 
                    type="email" 
                    value={form.email} 
                    onChange={e => updateField('email', e.target.value)} 
                    placeholder="restaurant@example.com" 
                    style={inputBase(!!errors.email)} 
                  />
                  {errors.email && <span style={errText}>{errors.email}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Phone <span style={reqStyle}>*</span></label>
                  <input 
                    type="tel" 
                    value={form.phone} 
                    onChange={e => updateField('phone', e.target.value)} 
                    placeholder="+91 9876543210" 
                    style={inputBase(!!errors.phone)} 
                  />
                  {errors.phone && <span style={errText}>{errors.phone}</span>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Business Type <span style={reqStyle}>*</span></label>
                <select 
                  value={form.businessType} 
                  onChange={e => updateField('businessType', e.target.value)} 
                  style={selectBase(!!errors.businessType)}
                >
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.businessType && <span style={errText}>{errors.businessType}</span>}
              </div>
            </div>
          </Section>

          {/* ─── Address ──────────────────────────────────────────────────── */}
          <Section icon={MapPin} iconColor="#3b82f6" title="Address">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Street Address <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.address.street} 
                  onChange={e => updateField('address.street', e.target.value)} 
                  placeholder="123, Main Road" 
                  style={inputBase(!!errors['address.street'])} 
                />
                {errors['address.street'] && <span style={errText}>{errors['address.street']}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>City <span style={reqStyle}>*</span></label>
                  <input 
                    type="text" 
                    value={form.address.city} 
                    onChange={e => updateField('address.city', e.target.value)} 
                    placeholder="Mumbai" 
                    style={inputBase(!!errors['address.city'])} 
                  />
                  {errors['address.city'] && <span style={errText}>{errors['address.city']}</span>}
                </div>
                <div>
                  <label style={labelStyle}>State <span style={reqStyle}>*</span></label>
                  <select 
                    value={form.address.state} 
                    onChange={e => updateField('address.state', e.target.value)} 
                    style={selectBase(!!errors['address.state'])}
                  >
                    <option value="">Select state</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors['address.state'] && <span style={errText}>{errors['address.state']}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Country</label>
                  <input 
                    type="text" 
                    value={form.address.country} 
                    onChange={e => updateField('address.country', e.target.value)} 
                    placeholder="India" 
                    style={inputBase()} 
                  />
                </div>
                <div>
                  <label style={labelStyle}>Pincode <span style={reqStyle}>*</span></label>
                  <input 
                    type="text" 
                    value={form.address.pincode} 
                    onChange={e => updateField('address.pincode', e.target.value)} 
                    placeholder="400001" 
                    maxLength={6} 
                    style={inputBase(!!errors['address.pincode'])} 
                  />
                  {errors['address.pincode'] && <span style={errText}>{errors['address.pincode']}</span>}
                </div>
              </div>
            </div>
          </Section>

          {/* ─── Owner Details ───────────────────────────────────────────── */}
          <Section icon={User} iconColor="#f97316" title="Owner Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Owner Name <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.owner.name} 
                  onChange={e => updateField('owner.name', e.target.value)} 
                  placeholder="John Doe" 
                  style={inputBase(!!errors['owner.name'])} 
                />
                {errors['owner.name'] && <span style={errText}>{errors['owner.name']}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Owner Email <span style={reqStyle}>*</span></label>
                  <input 
                    type="email" 
                    value={form.owner.email} 
                    onChange={e => updateField('owner.email', e.target.value)} 
                    placeholder="owner@example.com" 
                    style={inputBase(!!errors['owner.email'])} 
                  />
                  {errors['owner.email'] && <span style={errText}>{errors['owner.email']}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Owner Phone <span style={reqStyle}>*</span></label>
                  <input 
                    type="tel" 
                    value={form.owner.phone} 
                    onChange={e => updateField('owner.phone', e.target.value)} 
                    placeholder="+91 9876543210" 
                    style={inputBase(!!errors['owner.phone'])} 
                  />
                  {errors['owner.phone'] && <span style={errText}>{errors['owner.phone']}</span>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Owner Address</label>
                <textarea 
                  rows={2} 
                  value={form.owner.address} 
                  onChange={e => updateField('owner.address', e.target.value)} 
                  placeholder="Owner's full address..." 
                  style={textareaBase()} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>PAN Number</label>
                  <input 
                    type="text" 
                    value={form.owner.pan} 
                    onChange={e => updateField('owner.pan', e.target.value)} 
                    placeholder="AAAAA0000A" 
                    style={inputBase()} 
                  />
                  <span style={helperText}>Optional - 10 characters</span>
                </div>
                <div>
                  <label style={labelStyle}>Aadhaar Number</label>
                  <input 
                    type="text" 
                    value={form.owner.aadhaar} 
                    onChange={e => updateField('owner.aadhaar', e.target.value)} 
                    placeholder="123456789012" 
                    style={inputBase()} 
                  />
                  <span style={helperText}>Optional - 12 digits</span>
                </div>
              </div>
            </div>
          </Section>

          {/* ─── Tax & License ───────────────────────────────────────────── */}
          <Section icon={Globe} iconColor="#6366f1" title="Tax & License" defaultOpen={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>GST Number</label>
                <input 
                  type="text" 
                  value={form.gstNumber} 
                  onChange={e => updateField('gstNumber', e.target.value)} 
                  placeholder="22AAAAA0000A1Z5" 
                  style={inputBase()} 
                />
                <span style={helperText}>Optional - 15 characters</span>
              </div>
              <div>
                <label style={labelStyle}>PAN Number</label>
                <input 
                  type="text" 
                  value={form.panNumber} 
                  onChange={e => updateField('panNumber', e.target.value)} 
                  placeholder="AAAAA0000A" 
                  style={inputBase()} 
                />
                <span style={helperText}>Optional - 10 characters</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>License Number</label>
                <input 
                  type="text" 
                  value={form.licenseNumber} 
                  onChange={e => updateField('licenseNumber', e.target.value)} 
                  placeholder="License number" 
                  style={inputBase()} 
                />
              </div>
              <div>
                <label style={labelStyle}>FSSAI License</label>
                <input 
                  type="text" 
                  value={form.fssaiLicense} 
                  onChange={e => updateField('fssaiLicense', e.target.value)} 
                  placeholder="FSSAI license number" 
                  style={inputBase()} 
                />
              </div>
            </div>
          </Section>

          {/* ─── Commission Settings ──────────────────────────────────────── */}
          <Section icon={Sparkles} iconColor="#14b8a6" title="Commission Settings" defaultOpen={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Default Commission Rate (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={form.commission.rate} 
                  onChange={e => updateField('commission.rate', parseFloat(e.target.value) || 0)} 
                  style={inputBase()} 
                />
                <span style={helperText}>Default: 10%</span>
              </div>
              <div>
                <label style={labelStyle}>Custom Commission Rate (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={form.commission.customRate || ''} 
                  onChange={e => updateField('commission.customRate', parseFloat(e.target.value) || null)} 
                  placeholder="Optional" 
                  style={inputBase()} 
                />
                <span style={helperText}>Override global commission rate</span>
              </div>
            </div>
          </Section>

          {/* ─── Note about Branches ───────────────────────────────────────── */}
          <div style={{ 
            background: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: 10, 
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <Store size={18} color="#16a34a" />
            <div>
              <p style={{ fontSize: 13, color: '#15803d', margin: 0 }}>
                <strong>Note:</strong> After creating the restaurant, you can add branches from the 
                <span style={{ fontWeight: 600, marginLeft: 4 }}>"Manage Branches"</span> section.
              </p>
              <p style={{ fontSize: 11, color: '#86efac', margin: '2px 0 0' }}>
                Branches are added separately using the "Add Branch" feature.
              </p>
            </div>
          </div>

          {/* ─── Action Buttons ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
            <button
              onClick={() => navigate('/super-admin/restaurants')}
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
                background: loading ? '#c4b5fd' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                boxShadow: '0 2px 8px rgba(139,92,246,0.35)'
              }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Save size={16} /> Create Restaurant</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}