import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../services/api';
import { 
  ArrowLeft, Sparkles, Loader2, Package, Tag, 
  ChevronUp, ChevronDown, CheckCircle, XCircle,
  DollarSign, Box, MapPin, Truck, Layers, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ICategory { _id: string; name: string; }

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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EditIngredientPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "", 
    sku: "", 
    category: "", 
    unit: "", 
    currentStock: 0, 
    reorderPoint: 0,
    costPrice: 0, 
    supplier: "", 
    storageLocation: "", 
    isActive: true,
  });

  const units = ["kg", "g", "L", "ml", "piece", "packet", "bottle", "box", "dozen", "lb", "oz"];
  const storageLocations = ["Freezer", "Refrigerator", "Dry Store", "Bar", "Counter", "Cold Room", "Warehouse"];

  useEffect(() => {
    Promise.all([
      adminApi.get('/ingredient-categories'),
      adminApi.get(`/ingredients/${id}`)
    ]).then(([catRes, ingRes]) => {
      setCategories(catRes.data?.data?.categories ?? []);
      if (ingRes.data.success) {
        const ing = ingRes.data.data;
        setForm({
          name: ing.name || "", 
          sku: ing.sku || "", 
          category: ing.category || "",
          unit: ing.unit || "", 
          currentStock: ing.currentStock || 0,
          reorderPoint: ing.reorderPoint || 0, 
          costPrice: ing.costPrice || 0,
          supplier: ing.supplier || "", 
          storageLocation: ing.storageLocation || "",
          isActive: ing.isActive !== false,
        });
      } else {
        toast.error('Ingredient not found');
        navigate('/ingredients');
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id, navigate]);

  const upd = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Ingredient name is required';
    if (!form.sku.trim()) e.sku = 'SKU is required';
    if (!form.category) e.category = 'Category is required';
    if (!form.unit) e.unit = 'Unit is required';
    if (form.currentStock < 0) e.currentStock = 'Stock cannot be negative';
    if (form.reorderPoint < 0) e.reorderPoint = 'Reorder point cannot be negative';
    if (form.costPrice < 0) e.costPrice = 'Cost price cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      const res = await adminApi.patch(`/ingredients/${id}`, form);
      if (res.data.success) {
        toast.success('Ingredient updated successfully!');
        navigate('/ingredients');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update ingredient');
      setErrors({ submit: err.response?.data?.error || 'Failed to update ingredient' });
    } finally {
      setSubmitting(false);
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
        input:focus, select:focus, textarea:focus { border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }
      `}</style>

      {/* Navbar */}
      <div style={{ padding: '0 24px', height: 56, background: 'white', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/ingredients')}
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
            Back to Ingredients
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Ingredient</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Update raw material details</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>

        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#dc2626' }}>⚠️</span> {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Basic Information Section */}
          <Section icon={Package} title="Basic Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Ingredient Name <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => upd('name', e.target.value)} 
                  placeholder="e.g., Tomato, Chicken Breast" 
                  style={inputBase(!!errors.name)} 
                />
                {errors.name && <span style={errText}>{errors.name}</span>}
              </div>

              <div>
                <label style={labelStyle}>SKU <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.sku} 
                  onChange={e => upd('sku', e.target.value.toUpperCase())} 
                  placeholder="e.g., TOM-001" 
                  style={inputBase(!!errors.sku)} 
                />
                {errors.sku && <span style={errText}>{errors.sku}</span>}
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Unique identifier for this ingredient</p>
              </div>

              <div>
                <label style={labelStyle}>Category <span style={reqStyle}>*</span></label>
                <select value={form.category} onChange={e => upd('category', e.target.value)} style={selectBase(!!errors.category)}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
                {errors.category && <span style={errText}>{errors.category}</span>}
              </div>

              <div>
                <label style={labelStyle}>Unit <span style={reqStyle}>*</span></label>
                <select value={form.unit} onChange={e => upd('unit', e.target.value)} style={selectBase(!!errors.unit)}>
                  <option value="">Select unit</option>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {errors.unit && <span style={errText}>{errors.unit}</span>}
              </div>
            </div>
          </Section>

          {/* Stock Management Section */}
          <Section icon={Box} iconColor="#3b82f6" title="Stock Management">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Current Stock</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={form.currentStock} 
                  onChange={e => upd('currentStock', parseFloat(e.target.value) || 0)} 
                  placeholder="0" 
                  style={inputBase(!!errors.currentStock)} 
                />
                {errors.currentStock && <span style={errText}>{errors.currentStock}</span>}
              </div>

              <div>
                <label style={labelStyle}>Reorder Point</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={form.reorderPoint} 
                  onChange={e => upd('reorderPoint', parseFloat(e.target.value) || 0)} 
                  placeholder="0" 
                  style={inputBase(!!errors.reorderPoint)} 
                />
                {errors.reorderPoint && <span style={errText}>{errors.reorderPoint}</span>}
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Minimum stock level to trigger reorder</p>
              </div>
            </div>
          </Section>

          {/* Pricing & Supplier Section */}
          <Section icon={DollarSign} iconColor="#10b981" title="Pricing & Supplier">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Cost Price (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={form.costPrice} 
                  onChange={e => upd('costPrice', parseFloat(e.target.value) || 0)} 
                  placeholder="0.00" 
                  style={inputBase(!!errors.costPrice)} 
                />
                {errors.costPrice && <span style={errText}>{errors.costPrice}</span>}
              </div>

              <div>
                <label style={labelStyle}>Supplier</label>
                <input 
                  type="text" 
                  value={form.supplier} 
                  onChange={e => upd('supplier', e.target.value)} 
                  placeholder="e.g., ABC Suppliers" 
                  style={inputBase()} 
                />
              </div>
            </div>
          </Section>

          {/* Storage & Status Section */}
          <Section icon={MapPin} iconColor="#8b5cf6" title="Storage & Status">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Storage Location</label>
                <select value={form.storageLocation} onChange={e => upd('storageLocation', e.target.value)} style={selectBase()}>
                  <option value="">Select location</option>
                  {storageLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="status"
                      value="active"
                      checked={form.isActive === true}
                      onChange={() => upd('isActive', true)}
                      style={{ width: 16, height: 16, accentColor: '#f97316' }}
                    />
                    <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={14} color="#10b981" /> Active
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="status"
                      value="inactive"
                      checked={form.isActive === false}
                      onChange={() => upd('isActive', false)}
                      style={{ width: 16, height: 16, accentColor: '#f97316' }}
                    />
                    <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <XCircle size={14} color="#ef4444" /> Inactive
                    </span>
                  </label>
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Inactive ingredients will not be available for selection</p>
              </div>
            </div>
          </Section>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              onClick={() => navigate('/ingredients')}
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
              disabled={submitting}
              style={{ 
                height: 40, 
                padding: '0 28px', 
                borderRadius: 8, 
                border: 'none', 
                background: submitting ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: submitting ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)'
              }}
            >
              {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Edit3 size={16} /> Update Ingredient</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}