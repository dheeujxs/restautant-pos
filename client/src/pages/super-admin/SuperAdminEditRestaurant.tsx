// pages/super-admin/SuperAdminEditRestaurant.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, X, Building2, User, Phone, Mail,
  MapPin, Globe, AlertCircle, CheckCircle, Loader2,
  Plus, Trash2, ChevronDown, ChevronUp, Sparkles,
  Upload, Package, Layers, FolderPlus, PackagePlus, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import {superAdminApi} from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Branch {
  _id?: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  phone: string;
  email: string;
  manager?: {
    name: string;
    phone: string;
    email: string;
  };
}

interface Restaurant {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  owner: {
    name: string;
    email: string;
    phone: string;
    address: string;
    pan: string;
    aadhaar: string;
  };
  businessType: string;
  cuisineTypes: string[];
  gstNumber: string;
  panNumber: string;
  licenseNumber: string;
  fssaiLicense: string;
  commission: {
    rate: number;
    customRate: number | null;
  };
  subscription: {
    plan: string;
    billingCycle: string;
    amount: number;
  };
  branches: Branch[];
  isActive: boolean;
  status: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: style.bg, color: style.text, fontSize: 12, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.dot }} />
      {status || 'Pending'}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminEditRestaurant() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [deletedBranches, setDeletedBranches] = useState<string[]>([]);

  const [form, setForm] = useState<Restaurant>({
    _id: '',
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
    cuisineTypes: [],
    gstNumber: '',
    panNumber: '',
    licenseNumber: '',
    fssaiLicense: '',
    commission: {
      rate: 10,
      customRate: null,
    },
    subscription: {
      plan: 'trial',
      billingCycle: 'monthly',
      amount: 0,
    },
    branches: [],
    isActive: true,
    status: 'active',
  });

  const businessTypes = ['Restaurant', 'Cafe', 'Bakery', 'Food Truck', 'Cloud Kitchen', 'Fine Dining', 'Fast Food', 'Other'];
  const states = ['Maharashtra', 'Gujarat', 'Rajasthan', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Kerala', 'West Bengal', 'Uttar Pradesh', 'Punjab', 'Haryana'];

  // ─── Fetch Restaurant Data ────────────────────────────────────────────────
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) {
        toast.error('Restaurant ID not found');
        navigate('/super-admin/restaurants');
        return;
      }

      try {
        setLoading(true);
        const response = await superAdminApi.get(`/super-admin/restaurants/${id}`);
        
        if (response.data.success) {
          const data = response.data.data;
          setForm({
            ...data,
            branches: data.branches || [],
          });
          setBranches(data.branches || []);
        } else {
          toast.error('Failed to fetch restaurant data');
          navigate('/super-admin/restaurants');
        }
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to fetch restaurant');
        navigate('/super-admin/restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id, navigate]);

  // ─── Form Handlers ──────────────────────────────────────────────────────────
  const updateField = (field: string, value: any) => {
    const keys = field.split('.');
    if (keys.length === 1) {
      setForm(prev => ({ ...prev, [field]: value }));
    } else if (keys.length === 2) {
      setForm(prev => ({ ...prev, [keys[0]]: { ...(prev[keys[0] as keyof typeof prev] as any), [keys[1]]: value } }));
    } else if (keys.length === 3) {
      setForm(prev => ({
        ...prev,
        [keys[0]]: {
          ...(prev[keys[0] as keyof typeof prev] as any),
          [keys[1]]: {
            ...((prev[keys[0] as keyof typeof prev] as any)[keys[1]]),
            [keys[2]]: value
          }
        }
      }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addBranch = () => {
    setBranches([
      ...branches,
      {
        name: '',
        address: { street: '', city: '', state: '', country: 'India', pincode: '' },
        phone: '',
        email: '',
        manager: { name: '', phone: '', email: '' },
      },
    ]);
  };

  const removeBranch = (index: number) => {
    const branch = branches[index];
    if (branch._id) {
      setDeletedBranches([...deletedBranches, branch._id]);
    }
    setBranches(branches.filter((_, i) => i !== index));
  };

  const updateBranch = (index: number, field: string, value: any) => {
    const newBranches = [...branches];
    if (field.includes('.')) {
      const keys = field.split('.');
      if (keys.length === 2) {
        (newBranches[index] as any)[keys[0]] = {
          ...(newBranches[index] as any)[keys[0]],
          [keys[1]]: value,
        };
      } else if (keys.length === 3) {
        (newBranches[index] as any)[keys[0]][keys[1]][keys[2]] = value;
      }
    } else {
      (newBranches[index] as any)[field] = value;
    }
    setBranches(newBranches);
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Restaurant name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.address.street.trim()) e['address.street'] = 'Street address is required';
    if (!form.address.city.trim()) e['address.city'] = 'City is required';
    if (!form.address.state) e['address.state'] = 'State is required';
    if (!form.address.pincode.trim()) e['address.pincode'] = 'Pincode is required';
    else if (!/^[0-9]{6}$/.test(form.address.pincode)) e['address.pincode'] = 'Invalid pincode';
    if (!form.owner.name.trim()) e['owner.name'] = 'Owner name is required';
    if (!form.owner.email.trim()) e['owner.email'] = 'Owner email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.owner.email)) e['owner.email'] = 'Invalid email format';
    if (!form.owner.phone.trim()) e['owner.phone'] = 'Owner phone is required';
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
      const payload = {
        ...form,
        branches: branches.filter(b => b.name.trim()),
        deletedBranches,
      };
      
      const response = await superAdminApi.put(`/super-admin/restaurants/${id}`, payload);
      
      if (response.data.success) {
        toast.success('Restaurant updated successfully!');
        navigate('/super-admin/restaurants');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update restaurant');
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
          <p style={{ marginTop: 16, color: '#6b7280' }}>Loading restaurant data...</p>
        </div>
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

      {/* Navbar */}
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
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Edit3 size={18} color="#8b5cf6" />
              Edit Restaurant
            </h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Update restaurant information</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StatusBadge status={form.status || 'active'} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>ID: {form._id?.slice(-6) || 'N/A'}</span>
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>

        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Basic Information Section */}
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
                  style={selectBase()}
                >
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select 
                  value={form.status || 'active'} 
                  onChange={e => updateField('status', e.target.value)} 
                  style={selectBase()}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Address Section */}
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

          {/* Owner Details Section */}
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
                </div>
              </div>
            </div>
          </Section>

          {/* Branches Section */}
          <Section icon={MapPin} iconColor="#10b981" title="Branches" defaultOpen={false}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={addBranch}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={13} /> Add Branch
                </button>
              </div>

              {branches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#9ca3af', fontSize: 12, border: '1px dashed #e5e7eb', borderRadius: 8 }}>
                  <MapPin size={32} style={{ margin: '0 auto', opacity: 0.3 }} />
                  <p style={{ marginTop: 8 }}>No branches added</p>
                  <p style={{ fontSize: 11 }}>Click "Add Branch" to add a branch</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {branches.map((branch, index) => (
                    <div key={index} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>
                          Branch {index + 1}
                          {branch._id && <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>(ID: {branch._id.slice(-6)})</span>}
                        </span>
                        <button onClick={() => removeBranch(index)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Branch Name</label>
                          <input 
                            type="text" 
                            value={branch.name} 
                            onChange={e => updateBranch(index, 'name', e.target.value)} 
                            placeholder="e.g., Andheri Branch" 
                            style={inputBase()} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Phone</label>
                          <input 
                            type="tel" 
                            value={branch.phone} 
                            onChange={e => updateBranch(index, 'phone', e.target.value)} 
                            placeholder="+91 9876543210" 
                            style={inputBase()} 
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Address</label>
                        <input 
                          type="text" 
                          value={branch.address.street} 
                          onChange={e => updateBranch(index, 'address.street', e.target.value)} 
                          placeholder="Street address" 
                          style={inputBase()} 
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>City</label>
                          <input 
                            type="text" 
                            value={branch.address.city} 
                            onChange={e => updateBranch(index, 'address.city', e.target.value)} 
                            placeholder="Mumbai" 
                            style={inputBase()} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Pincode</label>
                          <input 
                            type="text" 
                            value={branch.address.pincode} 
                            onChange={e => updateBranch(index, 'address.pincode', e.target.value)} 
                            placeholder="400001" 
                            style={inputBase()} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Tax & License Section */}
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
              </div>
            </div>
          </Section>

          {/* Commission Section */}
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
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Global commission rate for this restaurant</p>
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
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Override global commission rate if needed</p>
              </div>
            </div>
          </Section>

          {/* Subscription Section */}
          <Section icon={Package} iconColor="#8b5cf6" title="Subscription Plan" defaultOpen={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Plan <span style={reqStyle}>*</span></label>
                <select 
                  value={form.subscription.plan} 
                  onChange={e => updateField('subscription.plan', e.target.value)} 
                  style={selectBase()}
                >
                  <option value="trial">🆓 Trial (14 days)</option>
                  <option value="basic">📋 Basic</option>
                  <option value="pro">💼 Pro</option>
                  <option value="enterprise">🏢 Enterprise</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Billing Cycle</label>
                <select 
                  value={form.subscription.billingCycle} 
                  onChange={e => updateField('subscription.billingCycle', e.target.value)} 
                  style={selectBase()}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
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
              disabled={saving}
              style={{ 
                height: 40, 
                padding: '0 28px', 
                borderRadius: 8, 
                border: 'none', 
                background: saving ? '#c4b5fd' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: saving ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                boxShadow: '0 2px 8px rgba(139,92,246,0.35)'
              }}
            >
              {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={16} /> Update Restaurant</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}