import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { 
  Sparkles, Loader2, Package, Building2, 
  ChevronUp, ChevronDown, ArrowLeft, Plus, Trash2, 
  AlertCircle, CheckCircle, Info, X, User, Phone, 
  Mail, MapPin, FileText, Truck, Star
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

interface ISupplierForm {
  supplierName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  address: string;
  notes: string;
  status: 'active' | 'inactive';
  supplierIngredients: ISupplierIngredient[];
}

const defaultForm = (): ISupplierForm => ({
  supplierName: '',
  contactPerson: '',
  phoneNumber: '',
  email: '',
  address: '',
  notes: '',
  status: 'active',
  supplierIngredients: []
});

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
  height: 40, width: '100%', boxSizing: 'border-box',
  border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8, padding: '0 12px', fontSize: 14,
  background: '#fff', color: '#111827', outline: 'none',
  appearance: 'none', cursor: 'pointer', paddingRight: 32,
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddSupplierPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<ISupplierForm>(defaultForm());
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const res = await adminApi.get('/ingredients?isActive=true&limit=200');
      if (res.data.success) {
        setIngredients(res.data.data?.ingredients || []);
      }
    } catch (error) {
      console.error('Failed to fetch ingredients:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const upd = <K extends keyof ISupplierForm>(key: K, value: ISupplierForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const addIngredient = () => {
    setForm(prev => ({
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
    const newIngredients = [...form.supplierIngredients];
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
    setForm(prev => ({ ...prev, supplierIngredients: newIngredients }));
  };

  const removeIngredient = (idx: number) => {
    setForm(prev => ({
      ...prev,
      supplierIngredients: prev.supplierIngredients.filter((_, i) => i !== idx)
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.supplierName.trim()) e.supplierName = 'Supplier name is required';
    if (!form.phoneNumber.trim()) e.phoneNumber = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await adminApi.post('/suppliers', form);
      if (res.data.success) {
        toast.success('Supplier created successfully!');
        navigate('/suppliers');
      } else {
        setErrors({ submit: res.data.error || 'Failed to create supplier' });
      }
    } catch (err: any) {
      setErrors({ submit: err.response?.data?.error || 'Failed to create supplier' });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
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
      <div style={{ padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/suppliers')}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={15} color="#6b7280" />
          </button>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Add Supplier</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Add a new supplier to your inventory</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/suppliers')}
            style={{ height: 36, padding: '0 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#1f2937', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <ArrowLeft size={13} /> Back to Suppliers
          </button>
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
          <Section icon={Building2} iconColor="#f97316" title="Basic Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Supplier Name <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.supplierName} 
                  onChange={e => upd('supplierName', e.target.value)} 
                  placeholder="e.g., Fresh Vegetables Pvt Ltd" 
                  style={inputBase(!!errors.supplierName)} 
                />
                {errors.supplierName && <span style={errText}>{errors.supplierName}</span>}
              </div>

              <div>
                <label style={labelStyle}>Contact Person</label>
                <input 
                  type="text" 
                  value={form.contactPerson} 
                  onChange={e => upd('contactPerson', e.target.value)} 
                  placeholder="e.g., Rajesh Kumar" 
                  style={inputBase()} 
                />
              </div>
            </div>
          </Section>

          {/* Contact Information Section */}
          <Section icon={Phone} iconColor="#22c55e" title="Contact Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Phone Number <span style={reqStyle}>*</span></label>
                <input 
                  type="tel" 
                  value={form.phoneNumber} 
                  onChange={e => upd('phoneNumber', e.target.value)} 
                  placeholder="+91 1234567890" 
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
                  placeholder="supplier@example.com" 
                  style={inputBase(!!errors.email)} 
                />
                {errors.email && <span style={errText}>{errors.email}</span>}
              </div>

              <div>
                <label style={labelStyle}>Address</label>
                <textarea 
                  rows={2} 
                  value={form.address} 
                  onChange={e => upd('address', e.target.value)} 
                  placeholder="Full address..."
                  style={textareaBase()} 
                />
              </div>
            </div>
          </Section>

          {/* Supplier Ingredients Section */}
          <Section icon={Package} iconColor="#8b5cf6" title="Supplier Ingredients" defaultOpen={false}>
            <div>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={addIngredient}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={13} /> Add Ingredient
                </button>
              </div>
              
              {form.supplierIngredients.map((item, idx) => (
                <div key={idx} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>Ingredient {idx + 1}</span>
                    <button onClick={() => removeIngredient(idx)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Ingredient</label>
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
                      <input type="text" value={item.unit} disabled style={{ ...inputBase(), background: '#f3f4f6' }} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Last Purchase Price (₹)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        value={item.lastPurchasePrice} 
                        onChange={e => updateIngredient(idx, 'lastPurchasePrice', parseFloat(e.target.value))} 
                        style={inputBase()} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={item.isPreferred} 
                          onChange={e => updateIngredient(idx, 'isPreferred', e.target.checked)} 
                          style={{ width: 16, height: 16, cursor: 'pointer' }} 
                        />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Preferred Supplier</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              
              {form.supplierIngredients.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 12, border: '1px dashed #e5e7eb', borderRadius: 8 }}>
                  No ingredients added. Click "Add Ingredient" to add.
                </div>
              )}
            </div>
          </Section>

          {/* Additional Information Section */}
          <Section icon={FileText} iconColor="#8b5cf6" title="Additional Information">
            <div>
              <textarea 
                rows={3} 
                value={form.notes} 
                onChange={e => upd('notes', e.target.value)} 
                placeholder="Any additional notes about this supplier..."
                style={textareaBase()} 
              />
            </div>
          </Section>

          {/* Status Section */}
          <Section icon={CheckCircle} iconColor="#10b981" title="Status">
            <div>
              <label style={labelStyle}>Status</label>
              <select 
                value={form.status} 
                onChange={e => upd('status', e.target.value as 'active' | 'inactive')} 
                style={selectBase()}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Inactive suppliers won't appear in dropdowns</p>
            </div>
          </Section>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => navigate('/suppliers')}
              style={{ height: 40, padding: '0 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ height: 40, padding: '0 24px', borderRadius: 8, border: 'none', background: loading ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Sparkles size={14} /> Save Supplier</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}