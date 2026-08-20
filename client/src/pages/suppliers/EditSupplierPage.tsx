import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import {
  ArrowLeft, Save, X, User, Phone, Mail, MapPin, FileText,
  AlertCircle, CheckCircle, Building2, Users, Loader2,
  Plus, Trash2, Package, Star, ChevronUp, ChevronDown,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface IIngredient {
  _id: string;
  name: string;
  unit: string;
}

interface ISupplierIngredient {
  ingredientId: string;
  lastPurchasePrice: number;
  unit: string;
  isPreferred: boolean;
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

export default function EditSupplierPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [formData, setFormData] = useState({
    supplierName: '',
    contactPerson: '',
    phoneNumber: '',
    email: '',
    address: '',
    notes: '',
    status: 'active',
    supplierIngredients: [] as ISupplierIngredient[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [supplierRes, ingredientsRes] = await Promise.all([
        adminApi.get(`/suppliers/${id}`),
        adminApi.get('/ingredients?isActive=true&limit=200')
      ]);
      
      if (supplierRes.data.success) {
        const supplier = supplierRes.data.data;
        setFormData({
          supplierName: supplier.supplierName || '',
          contactPerson: supplier.contactPerson || '',
          phoneNumber: supplier.phoneNumber || '',
          email: supplier.email || '',
          address: supplier.address || '',
          notes: supplier.notes || '',
          status: supplier.status || 'active',
          supplierIngredients: supplier.supplierIngredients || []
        });
      }
      
      if (ingredientsRes.data.success) {
        setIngredients(ingredientsRes.data.data?.ingredients || []);
      }
    } catch (error) {
      toast.error('Failed to load supplier');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      supplierIngredients: [...prev.supplierIngredients, {
        ingredientId: '',
        lastPurchasePrice: 0,
        unit: '',
        isPreferred: false
      }]
    }));
  };

  const updateIngredient = (idx: number, field: keyof ISupplierIngredient, value: any) => {
    const newIngredients = [...formData.supplierIngredients];
    if (field === 'ingredientId') {
      const selectedIng = ingredients.find(i => i._id === value);
      if (selectedIng) {
        newIngredients[idx] = {
          ...newIngredients[idx],
          ingredientId: selectedIng._id,
          unit: selectedIng.unit
        };
      }
    } else {
      newIngredients[idx] = { ...newIngredients[idx], [field]: value };
    }
    setFormData(prev => ({ ...prev, supplierIngredients: newIngredients }));
  };

  const removeIngredient = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      supplierIngredients: prev.supplierIngredients.filter((_, i) => i !== idx)
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.supplierName.trim()) newErrors.supplierName = 'Supplier name is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix all errors');
      return;
    }
    
    setSaving(true);
    try {
      const res = await adminApi.put(`/suppliers/${id}`, formData);
      if (res.data.success) {
        toast.success('Supplier updated successfully');
        navigate('/suppliers');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update supplier');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
        input:focus, select:focus, textarea:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }
      `}</style>

      {/* Navbar */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/suppliers')}
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
            Back to Suppliers
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Supplier</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Update supplier information</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            padding: '0 12px',
            height: 28,
            borderRadius: 6,
            background: formData.status === 'active' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${formData.status === 'active' ? '#bbf7d0' : '#fecaca'}`,
            color: formData.status === 'active' ? '#15803d' : '#b91c1c',
            fontSize: 10,
            fontWeight: 500,
          }}>
            <span>●</span> {formData.status === 'active' ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px', maxWidth: 1000, margin: '0 auto' }}>

        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Basic Information */}
          <Section icon={Building2} iconColor="#f97316" title="Basic Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Supplier Name <span style={reqStyle}>*</span></label>
                <input
                  type="text"
                  name="supplierName"
                  value={formData.supplierName}
                  onChange={handleChange}
                  placeholder="e.g., Fresh Foods Ltd"
                  style={inputBase(!!errors.supplierName)}
                />
                {errors.supplierName && <span style={errText}>{errors.supplierName}</span>}
              </div>
              <div>
                <label style={labelStyle}>Contact Person</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="e.g., John Doe"
                  style={inputBase()}
                />
              </div>
            </div>
          </Section>

          {/* Contact Information */}
          <Section icon={Phone} iconColor="#22c55e" title="Contact Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Phone Number <span style={reqStyle}>*</span></label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  style={inputBase(!!errors.phoneNumber)}
                />
                {errors.phoneNumber && <span style={errText}>{errors.phoneNumber}</span>}
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="supplier@example.com"
                  style={inputBase(!!errors.email)}
                />
                {errors.email && <span style={errText}>{errors.email}</span>}
              </div>
            </div>
          </Section>

          {/* Address */}
          <Section icon={MapPin} iconColor="#3b82f6" title="Address">
            <div>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                placeholder="Enter full address..."
                style={{ 
                  width: '100%', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: 8, 
                  padding: '10px 12px', 
                  fontSize: 14, 
                  resize: 'vertical', 
                  fontFamily: 'inherit',
                  background: '#fff',
                  color: '#111827',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </Section>

          {/* Supplier Ingredients */}
          <Section icon={Package} iconColor="#8b5cf6" title="Supplier Ingredients">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Manage ingredients supplied by this supplier</span>
                <button
                  type="button"
                  onClick={addIngredient}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#f97316',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} /> Add Ingredient
                </button>
              </div>
              
              {formData.supplierIngredients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', background: '#f9fafb', borderRadius: 10, border: '1px dashed #e5e7eb' }}>
                  <Package size={32} color="#d1d5db" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>No ingredients added</p>
                  <p style={{ fontSize: 11, color: '#d1d5db' }}>Click "Add Ingredient" to add</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {formData.supplierIngredients.map((item, idx) => (
                    <div key={idx} style={{ background: '#f9fafb', borderRadius: 10, padding: '16px', border: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>Ingredient {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeIngredient(idx)}
                          style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Ingredient *</label>
                          <select
                            value={item.ingredientId}
                            onChange={e => updateIngredient(idx, 'ingredientId', e.target.value)}
                            style={selectBase()}
                          >
                            <option value="">Select Ingredient</option>
                            {ingredients.map(ing => (
                              <option key={ing._id} value={ing._id}>{ing.name} ({ing.unit})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            disabled
                            style={{ 
                              ...inputBase(), 
                              background: '#f3f4f6', 
                              color: '#6b7280',
                              cursor: 'not-allowed',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Last Purchase Price (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.lastPurchasePrice}
                            onChange={e => updateIngredient(idx, 'lastPurchasePrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            style={inputBase()}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={item.isPreferred}
                              onChange={e => updateIngredient(idx, 'isPreferred', e.target.checked)}
                              style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 13, color: '#374151' }}>Preferred Supplier</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Additional Information */}
          <Section icon={FileText} iconColor="#8b5cf6" title="Additional Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Any additional notes..."
                  style={{ 
                    width: '100%', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: 8, 
                    padding: '10px 12px', 
                    fontSize: 14, 
                    resize: 'vertical', 
                    fontFamily: 'inherit',
                    background: '#fff',
                    color: '#111827',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={selectBase()}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>
                  {formData.status === 'active' ? 'Supplier is available for ordering' : 'Supplier is temporarily unavailable'}
                </span>
              </div>
            </div>
          </Section>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => navigate('/suppliers')}
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
              type="submit"
              disabled={saving}
              style={{
                height: 40,
                padding: '0 28px',
                borderRadius: 8,
                border: 'none',
                background: saving ? '#fdba74' : 'linear-gradient(135deg, #f97316, #ef4444)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
              }}
            >
              {saving ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</>
              ) : (
                <><Sparkles size={16} /> Update Supplier</>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}