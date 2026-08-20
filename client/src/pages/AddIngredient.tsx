// AddIngredientPage.tsx - Fixed (draft carried via router state, not localStorage)

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminApi } from '../services/api';
import { 
  ArrowLeft, Sparkles, Loader2, Package, Beef, 
  ChevronUp, ChevronDown, RefreshCw, Truck, 
  FolderPlus, Ruler, Building2, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ICategory { _id: string; name: string; }
interface ISupplier { _id: string; supplierName: string; phoneNumber: string; }
interface IUnit { _id: string; name: string; symbol: string; }

interface IngredientFormState {
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  supplier: string;
  storageLocation: string;
  isActive: boolean;
}

// ✅ Map unit names to their valid abbreviations
const UNIT_MAP: Record<string, string> = {
  'Kilogram': 'kg',
  'Gram': 'g',
  'Liter': 'l',
  'Milliliter': 'ml',
  'Piece': 'pcs',
  'Box': 'box',
  'Pack': 'pack',
  'Bottle': 'bottle',
  'Can': 'can',
  'Bag': 'bag',
  'Carton': 'carton',
  'Dozen': 'dozen',
  'Pair': 'pair',
  'Set': 'set',
  'kg': 'kg',
  'g': 'g',
  'l': 'l',
  'ml': 'ml',
  'pcs': 'pcs',
  'box': 'box',
  'pack': 'pack',
  'bottle': 'bottle',
  'can': 'can',
  'bag': 'bag',
  'carton': 'carton',
  'dozen': 'dozen',
  'pair': 'pair',
  'set': 'set',
};

// ✅ Valid units for backend validation
const VALID_UNITS = ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack', 'bottle', 'can', 'bag', 'carton', 'dozen', 'pair', 'set'];

const emptyForm = (): IngredientFormState => ({
  name: '', sku: '', category: '', unit: '', currentStock: 0, reorderPoint: 0,
  supplier: '', storageLocation: '', isActive: true,
});

function Section({ icon: Icon, iconColor = '#f97316', title, children, defaultOpen = true }: {
  icon: React.ElementType; iconColor?: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', background: '#fff', borderBottom: open ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', border: 'none', textAlign: 'left' }}>
        <Icon size={16} color={iconColor} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>{title}</span>
        {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
      </button>
      {open && <div style={{ padding: '20px 20px 24px' }}>{children}</div>}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 6,
  display: 'block',
};

const inputStyle = (hasError = false): React.CSSProperties => ({
  width: '100%',
  height: 40,
  border: `1px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 14,
  background: '#fff',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
});

const selectStyle = (hasError = false): React.CSSProperties => ({
  ...inputStyle(hasError),
  cursor: 'pointer',
  appearance: 'auto' as any,
});

const reqStyle: React.CSSProperties = { color: '#ef4444', marginLeft: 2 };
const helperTextStyle: React.CSSProperties = { fontSize: 11, color: '#9ca3af', marginTop: 4 };

export default function AddIngredientPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [units, setUnits] = useState<IUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [skuErr, setSkuErr] = useState('');
  const [categoryErr, setCategoryErr] = useState('');
  const [unitErr, setUnitErr] = useState('');

  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnParam = params.get('returnTo');
    if (returnParam) {
      setReturnTo(returnParam);
    }
  }, []);

  // ─── Form state — restored from router navigation state (if we're
  // returning from "Add Category"/"Add Unit"/"Add Supplier"), otherwise
  // blank. Nothing is read from or written to localStorage. ─────────────
  const [form, setForm] = useState<IngredientFormState>(
    (location.state as { draft?: IngredientFormState })?.draft || emptyForm()
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, suppliersRes, unitsRes] = await Promise.all([
          adminApi.get('/ingredient-categories?limit=100'),
          adminApi.get('/suppliers?status=active&limit=100'),
        adminApi.get('/units?limit=100')
        ]);
        
        if (categoriesRes.data?.success) {
          setCategories(categoriesRes.data?.data?.categories ?? []);
        }
        if (suppliersRes.data?.success) {
          setSuppliers(suppliersRes.data?.data?.suppliers ?? []);
        }
        if (unitsRes.data?.success) {
          setUnits(unitsRes.data?.data?.units ?? []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load required data');
      } finally {
        setFetchingData(false);
      }
    };
    
    fetchData();
  }, []);

  const reset = () => {
    setForm(emptyForm());
    setError('');
    setNameErr('');
    setSkuErr('');
    setCategoryErr('');
    setUnitErr('');
    toast.success('Form cleared');
  };

  const validate = () => {
    let isValid = true;
    if (!form.name.trim()) { setNameErr('Name is required'); isValid = false; } else { setNameErr(''); }
    if (!form.sku.trim()) { setSkuErr('SKU is required'); isValid = false; } else { setSkuErr(''); }
    if (!form.category) { setCategoryErr('Category is required'); isValid = false; } else { setCategoryErr(''); }
    if (!form.unit) { setUnitErr('Unit is required'); isValid = false; } else { setUnitErr(''); }
    return isValid;
  };

  // ✅ Get the valid unit abbreviation
  const getValidUnit = (unitValue: string): string => {
    if (!unitValue) return '';
    
    // If it's already a valid unit, return it
    if (VALID_UNITS.includes(unitValue.toLowerCase())) {
      return unitValue.toLowerCase();
    }
    
    // Try to map from the unit name
    const mapped = UNIT_MAP[unitValue];
    if (mapped && VALID_UNITS.includes(mapped)) {
      return mapped;
    }
    
    // Try to find by name match
    const unit = units.find(u => u.name === unitValue);
    if (unit) {
      const mappedFromName = UNIT_MAP[unit.name];
      if (mappedFromName && VALID_UNITS.includes(mappedFromName)) {
        return mappedFromName;
      }
      // Check if the unit symbol is valid
      if (unit.symbol && VALID_UNITS.includes(unit.symbol.toLowerCase())) {
        return unit.symbol.toLowerCase();
      }
    }
    
    // Default to 'pcs' if nothing matches
    console.warn(`⚠️ Unknown unit: "${unitValue}", defaulting to 'pcs'`);
    return 'pcs';
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      // ✅ Convert unit to valid abbreviation before sending
      const payload = {
        ...form,
        unit: getValidUnit(form.unit),
      };
      
      console.log('📦 Sending payload:', payload);
      
      const res = await adminApi.post('/ingredients', payload);
      if (res.data.success) {
        toast.success('Ingredient created successfully!');
        navigate('/ingredients', { replace: true });
      }
    } catch (err: any) {
      console.error('❌ Error:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to create ingredient');
    } finally {
      setLoading(false);
    }
  };

  // ─── Carry the in-progress draft via router state, not localStorage ───
  const handleAddCategory = () => {
    navigate('/add-ingredient-category?returnTo=ingredient', { state: { draft: form } });
  };

  const handleAddUnit = () => {
    navigate('/add-unit?returnTo=ingredient', { state: { draft: form } });
  };

  const handleAddSupplier = () => {
    navigate('/suppliers/new?returnTo=ingredient', { state: { draft: form } });
  };

  const handleCancel = () => {
    navigate('/ingredients', { replace: true });
  };

  const storageLocations = ["Freezer", "Refrigerator", "Dry Store", "Bar", "Counter"];

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
        input:focus, select:focus, textarea:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }
        .nav-btn:hover { background: #f3f4f6 !important; }
        .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      `}</style>

      <div style={{ padding: '0 24px 40px' }}>

        {/* Navbar */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={handleCancel}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ArrowLeft size={15} color="#6b7280" />
            </button>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Create Ingredient</h1>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Add raw material to inventory</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleAddCategory}
              className="add-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 16px',
                height: 34,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#8b5cf6',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <FolderPlus size={14} />
              Add Category
            </button>

            <button
              onClick={handleAddUnit}
              className="add-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 16px',
                height: 34,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#14b8a6',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Ruler size={14} />
              Add Unit
            </button>

            <button
              onClick={handleAddSupplier}
              className="add-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 16px',
                height: 34,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#3b82f6',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Building2 size={14} />
              Add Supplier
            </button>

            <button
              onClick={reset}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <RefreshCw size={14} color="#6b7280" />
            </button>
            <button
              onClick={handleCancel}
              style={{ height: 34, padding: '0 16px', borderRadius: 8, border: 'none', background: '#1f2937', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={13} /> Back
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Basic Information */}
          <Section icon={Package} title="Basic Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Ingredient Name <span style={reqStyle}>*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Chicken Breast"
                    style={inputStyle(!!nameErr)}
                  />
                  {nameErr && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{nameErr}</p>}
                </div>
                <div>
                  <label style={labelStyle}>SKU <span style={reqStyle}>*</span></label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g., RAW-CHK-001"
                    style={inputStyle(!!skuErr)}
                  />
                  {skuErr && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{skuErr}</p>}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Category <span style={reqStyle}>*</span></label>
                    <button
                      onClick={handleAddCategory}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 10px',
                        borderRadius: 4,
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        color: '#8b5cf6',
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      <FolderPlus size={10} /> New
                    </button>
                  </div>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    style={selectStyle(!!categoryErr)}
                  >
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                  {categoryErr && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{categoryErr}</p>}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Unit <span style={reqStyle}>*</span></label>
                    <button
                      onClick={handleAddUnit}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 10px',
                        borderRadius: 4,
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        color: '#14b8a6',
                        fontSize: 10,
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      <Ruler size={10} /> New
                    </button>
                  </div>
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    style={selectStyle(!!unitErr)}
                  >
                    <option value="">Select unit</option>
                    {units.map(u => (
                      <option key={u._id} value={u.name}>
                        {u.name} {u.symbol ? `(${u.symbol})` : ''}
                      </option>
                    ))}
                  </select>
                  {unitErr && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{unitErr}</p>}
                  <p style={{ ...helperTextStyle, color: '#f59e0b' }}>
                    ⚠️ Units will be converted to: kg, g, l, ml, pcs, box, pack, bottle, can, bag, carton, dozen, pair, set
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Stock Information */}
          <Section icon={Beef} title="Stock Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.currentStock}
                    onChange={e => setForm({ ...form, currentStock: parseFloat(e.target.value) || 0 })}
                    style={inputStyle()}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Reorder Point</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.reorderPoint}
                    onChange={e => setForm({ ...form, reorderPoint: parseFloat(e.target.value) || 0 })}
                    style={inputStyle()}
                  />
                  <p style={helperTextStyle}>Alert when stock falls below this level</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Supplier Information */}
          <Section icon={Truck} title="Supplier Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Supplier</label>
                  <button
                    onClick={handleAddSupplier}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 10px',
                      borderRadius: 4,
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      color: '#3b82f6',
                      fontSize: 10,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    <Building2 size={10} /> New
                  </button>
                </div>
                <select
                  value={form.supplier}
                  onChange={e => setForm({ ...form, supplier: e.target.value })}
                  style={selectStyle()}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={s._id} value={s.supplierName}>{s.supplierName} - {s.phoneNumber}</option>)}
                </select>
                <p style={helperTextStyle}>Supplier will be used for purchase orders</p>
              </div>
              <div>
                <label style={labelStyle}>Storage Location</label>
                <select
                  value={form.storageLocation}
                  onChange={e => setForm({ ...form, storageLocation: e.target.value })}
                  style={selectStyle()}
                >
                  <option value="">Select location</option>
                  {storageLocations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* Status */}
          <Section icon={Sparkles} title="Status">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer' }}
              />
              <label htmlFor="isActive" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                Active <span style={{ color: '#9ca3af' }}>(Available for use in recipes)</span>
              </label>
            </div>
          </Section>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              onClick={handleCancel}
              style={{ height: 40, padding: '0 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                height: 40,
                padding: '0 24px',
                borderRadius: 8,
                border: 'none',
                background: loading ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
              }}
            >
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Sparkles size={14} /> Save Ingredient</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}