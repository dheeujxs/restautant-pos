// pages/AddPurchasePage.tsx (Updated)

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { 
  Sparkles, Loader2, Package, Building2, 
  ChevronUp, ChevronDown, ArrowLeft, Plus, Trash2, 
  AlertCircle, X, Truck, FileText, Calendar,
  ShoppingCart, CheckCircle, Search, DollarSign, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ISupplier {
  _id: string;
  supplierName: string;
  phoneNumber: string;
  email: string;
}

interface IIngredient {
  _id: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface IPurchaseItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  lineTotal: number;
}

interface IPurchaseForm {
  supplierId: string;
  purchaseDate: string;
  invoiceNumber: string;
  notes: string;
  paymentMethod: string;
  items: IPurchaseItem[];
}

const defaultForm = (): IPurchaseForm => ({
  supplierId: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  invoiceNumber: '',
  notes: '',
  paymentMethod: 'cash',
  items: [{ ingredientId: '', ingredientName: '', quantity: 0, unit: '', costPrice: 0, lineTotal: 0 }]
});

// ─── Helper: Generate unique invoice number ───────────────────────────────────
const generateInvoiceNumber = (): string => {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const day = String(new Date().getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${year}${month}${day}-${random}${timestamp}`;
};

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
export default function AddPurchasePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedIngredient = location.state?.preSelectedIngredient;

  const [form, setForm] = useState<IPurchaseForm>(defaultForm());
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (preSelectedIngredient && ingredients.length > 0) {
      const ingredient = ingredients.find(i => i._id === preSelectedIngredient.id);
      if (ingredient && form.items[0] && !form.items[0].ingredientId) {
        handleIngredientSelect(0, ingredient._id);
      }
    }
  }, [preSelectedIngredient, ingredients]);

  const fetchData = async () => {
    try {
      const [suppliersRes, ingredientsRes] = await Promise.all([
        adminApi.get('/suppliers?status=active&limit=100'),
        adminApi.get('/ingredients?isActive=true&limit=200')
      ]);
      
      if (suppliersRes.data.success) {
        setSuppliers(suppliersRes.data.data?.suppliers || []);
      }
      if (ingredientsRes.data.success) {
        setIngredients(ingredientsRes.data.data?.ingredients || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load required data');
    } finally {
      setFetchingData(false);
    }
  };

  const upd = <K extends keyof IPurchaseForm>(key: K, value: IPurchaseForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const updateItem = (idx: number, field: keyof IPurchaseItem, value: any) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    
    // Recalculate line total
    if (field === 'quantity' || field === 'costPrice') {
      const qty = field === 'quantity' ? value : newItems[idx].quantity;
      const price = field === 'costPrice' ? value : newItems[idx].costPrice;
      newItems[idx].lineTotal = (qty || 0) * (price || 0);
    }
    
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { ingredientId: '', ingredientName: '', quantity: 0, unit: '', costPrice: 0, lineTotal: 0 }]
    }));
  };

  const removeItem = (idx: number) => {
    if (form.items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleIngredientSelect = (idx: number, ingredientId: string) => {
    const ingredient = ingredients.find(i => i._id === ingredientId);
    if (ingredient) {
      const newItems = [...form.items];
      newItems[idx] = {
        ...newItems[idx],
        ingredientId: ingredient._id,
        ingredientName: ingredient.name, // This gets sent to backend
        unit: ingredient.unit,
        quantity: newItems[idx].quantity || 1,
        // FIX: Ensure costPrice and lineTotal are set properly
        costPrice: newItems[idx].costPrice || 0,
        lineTotal: (newItems[idx].quantity || 1) * (newItems[idx].costPrice || 0)
      };
      setForm(prev => ({ ...prev, items: newItems }));
    }
  };

  const handleGenerateInvoiceNumber = () => {
    const newInvoiceNumber = generateInvoiceNumber();
    upd('invoiceNumber', newInvoiceNumber);
    toast.success(`Invoice number generated: ${newInvoiceNumber}`, {
      duration: 3000,
      icon: '📄',
    });
  };

  const calculateTotal = () => {
    return form.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.supplierId) e.supplierId = 'Supplier is required';
    if (!form.purchaseDate) e.purchaseDate = 'Purchase date is required';
    if (form.items.length === 0) e.items = 'At least one item is required';
    
    form.items.forEach((item, idx) => {
      if (!item.ingredientId) e[`item_${idx}_ingredient`] = 'Select an ingredient';
      // FIX: Validate ingredientName is not empty
      if (!item.ingredientName || item.ingredientName.trim().length === 0) {
        e[`item_${idx}_ingredient`] = 'Invalid ingredient selected';
      }
      if (!item.quantity || item.quantity <= 0) e[`item_${idx}_qty`] = 'Valid quantity required';
      if (!item.costPrice || item.costPrice <= 0) e[`item_${idx}_price`] = 'Valid cost price required';
    });
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please fix all errors');
      return;
    }
    setLoading(true);
    try {
      // FIX: Ensure all required fields are present in payload
      const payload = {
        supplierId: form.supplierId,
        purchaseDate: form.purchaseDate,
        invoiceNumber: form.invoiceNumber || undefined,
        notes: form.notes || undefined,
        paymentMethod: form.paymentMethod || 'cash',
        items: form.items.map(item => ({
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName, // Include ingredientName
          quantity: Number(item.quantity),
          costPrice: Number(item.costPrice),
          unit: item.unit || 'unit'
        }))
      };
      
      console.log('📦 Sending payload:', JSON.stringify(payload, null, 2));
      
      const res = await adminApi.post('/purchases', payload);
      if (res.data.success) {
        toast.success('Purchase order created successfully!');
        navigate('/purchases');
      } else {
        setErrors({ submit: res.data.error || 'Failed to create purchase' });
      }
    } catch (err: any) {
      console.error('❌ Purchase creation error:', err.response?.data);
      
      // FIX: Show detailed error messages from backend
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.join('\n');
        toast.error(`Validation failed: ${errorMessages}`);
        setErrors({ submit: err.response.data.error || 'Failed to create purchase' });
      } else {
        setErrors({ submit: err.response?.data?.error || 'Failed to create purchase' });
      }
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = calculateTotal();

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
          <button onClick={() => navigate('/purchases')}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={15} color="#6b7280" />
          </button>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Create Purchase Order</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Record new stock purchase from supplier</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/purchases')}
            style={{ height: 36, padding: '0 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#1f2937', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <ArrowLeft size={13} /> Back to Purchases
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

          {/* Purchase Details Section */}
          <Section icon={Truck} iconColor="#f97316" title="Purchase Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Supplier <span style={reqStyle}>*</span></label>
                <select value={form.supplierId} onChange={e => upd('supplierId', e.target.value)} style={selectBase(!!errors.supplierId)}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.supplierName} - {s.phoneNumber}</option>
                  ))}
                </select>
                {errors.supplierId && <span style={errText}>{errors.supplierId}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Purchase Date <span style={reqStyle}>*</span></label>
                  <input type="date" value={form.purchaseDate} onChange={e => upd('purchaseDate', e.target.value)} style={inputBase(!!errors.purchaseDate)} />
                  {errors.purchaseDate && <span style={errText}>{errors.purchaseDate}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Invoice Number</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={form.invoiceNumber} 
                      onChange={e => upd('invoiceNumber', e.target.value)} 
                      placeholder="Click Generate or enter manually"
                      style={{ ...inputBase(), flex: 1 }} 
                    />
                    <button
                      type="button"
                      onClick={handleGenerateInvoiceNumber}
                      style={{
                        height: 40,
                        padding: '0 16px',
                        borderRadius: 8,
                        border: '1px solid #f97316',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <RefreshCw size={14} />
                      Generate
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    Unique auto-generated ID: e.g., INV-20250115-1234
                  </p>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Payment Method</label>
                <select value={form.paymentMethod} onChange={e => upd('paymentMethod', e.target.value)} style={selectBase()}>
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Any additional notes..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
          </Section>

          {/* Purchase Items Section */}
          <Section icon={ShoppingCart} iconColor="#22c55e" title="Purchase Items" defaultOpen={true}>
            <div>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={addItem}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={13} /> Add Item
                </button>
              </div>
              
              {form.items.map((item, idx) => (
                <div key={idx} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>Item {idx + 1}</span>
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(idx)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Ingredient <span style={reqStyle}>*</span></label>
                      <select 
                        value={item.ingredientId} 
                        onChange={e => handleIngredientSelect(idx, e.target.value)} 
                        style={selectBase(!!errors[`item_${idx}_ingredient`])}
                      >
                        <option value="">Select Ingredient</option>
                        {ingredients.map(ing => (
                          <option key={ing._id} value={ing._id}>{ing.name} ({ing.unit}) - Stock: {ing.currentStock}</option>
                        ))}
                      </select>
                      {errors[`item_${idx}_ingredient`] && <span style={errText}>{errors[`item_${idx}_ingredient`]}</span>}
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Unit</label>
                      <input type="text" value={item.unit} disabled style={{ ...inputBase(), background: '#f3f4f6', color: '#6b7280' }} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Quantity <span style={reqStyle}>*</span></label>
                      <input 
                        type="number" 
                        step="0.001" 
                        min="0.001" 
                        value={item.quantity} 
                        onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                        style={inputBase(!!errors[`item_${idx}_qty`])} 
                      />
                      {errors[`item_${idx}_qty`] && <span style={errText}>{errors[`item_${idx}_qty`]}</span>}
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Cost Price (₹) <span style={reqStyle}>*</span></label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        value={item.costPrice} 
                        onChange={e => updateItem(idx, 'costPrice', parseFloat(e.target.value) || 0)} 
                        style={inputBase(!!errors[`item_${idx}_price`])} 
                      />
                      {errors[`item_${idx}_price`] && <span style={errText}>{errors[`item_${idx}_price`]}</span>}
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Line Total</label>
                      <input type="text" value={`₹${item.lineTotal.toFixed(2)}`} disabled style={{ ...inputBase(), background: '#f3f4f6', color: '#6b7280', fontWeight: 600 }} />
                    </div>
                  </div>
                </div>
              ))}
              
              {errors.items && <p style={errText}>{errors.items}</p>}
              
              {/* Total Amount */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Total Amount: </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </Section>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => navigate('/purchases')}
              style={{ height: 40, padding: '0 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ height: 40, padding: '0 24px', borderRadius: 8, border: 'none', background: loading ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><Sparkles size={14} /> Create Purchase Order</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}