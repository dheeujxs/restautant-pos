import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { 
  Sparkles, Loader2, Building2, 
  ChevronUp, ChevronDown, ArrowLeft, Plus, Trash2, 
  AlertCircle, Truck, FileText, Calendar,
  ShoppingCart, Save, X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ISupplier {
  _id: string;
  supplierName: string;
  phoneNumber: string;
}

interface IIngredient {
  _id: string;
  name: string;
  unit: string;
  costPrice: number;
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
  items: IPurchaseItem[];
  status: string;
}

// Design tokens
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

function Section({ icon: Icon, iconColor = '#f97316', title, children, defaultOpen = true }: any) {
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

export default function EditPurchasePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState<IPurchaseForm | null>(null);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [purchaseRes, suppliersRes, ingredientsRes] = await Promise.all([
        adminApi.get(`/purchases/${id}`),
        adminApi.get('/suppliers?status=active&limit=100'),
        adminApi.get('/ingredients?isActive=true&limit=200')
      ]);
      
      if (purchaseRes.data.success) {
        const purchase = purchaseRes.data.data;
        if (purchase.status !== 'pending') {
          toast.error('Cannot edit non-pending purchase orders');
          navigate(`/purchases/${id}`);
          return;
        }
        setForm({
          supplierId: purchase.supplierId._id || purchase.supplierId,
          purchaseDate: purchase.purchaseDate.split('T')[0],
          invoiceNumber: purchase.invoiceNumber || '',
          notes: purchase.notes || '',
          status: purchase.status,
          items: purchase.items.map((item: any) => ({
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            quantity: item.quantity,
            unit: item.unit,
            costPrice: item.costPrice,
            lineTotal: item.lineTotal
          }))
        });
      }
      
      if (suppliersRes.data.success) {
        setSuppliers(suppliersRes.data.data?.suppliers || []);
      }
      if (ingredientsRes.data.success) {
        setIngredients(ingredientsRes.data.data?.ingredients || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load purchase data');
      navigate('/purchases');
    } finally {
      setLoading(false);
    }
  };

  const upd = <K extends keyof IPurchaseForm>(key: K, value: IPurchaseForm[K]) =>
    setForm(prev => prev ? { ...prev, [key]: value } : null);

  const updateItem = (idx: number, field: keyof IPurchaseItem, value: any) => {
    if (!form) return;
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    
    if (field === 'quantity' || field === 'costPrice') {
      const qty = field === 'quantity' ? value : newItems[idx].quantity;
      const price = field === 'costPrice' ? value : newItems[idx].costPrice;
      newItems[idx].lineTotal = (qty || 0) * (price || 0);
    }
    
    setForm(prev => prev ? { ...prev, items: newItems } : null);
  };

  const addItem = () => {
    if (!form) return;
    setForm(prev => prev ? {
      ...prev,
      items: [...prev.items, { ingredientId: '', ingredientName: '', quantity: 0, unit: '', costPrice: 0, lineTotal: 0 }]
    } : null);
  };

  const removeItem = (idx: number) => {
    if (!form) return;
    if (form.items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setForm(prev => prev ? { ...prev, items: prev.items.filter((_, i) => i !== idx) } : null);
  };

  const handleIngredientSelect = (idx: number, ingredientId: string) => {
    const ingredient = ingredients.find(i => i._id === ingredientId);
    if (ingredient && form) {
      const newItems = [...form.items];
      newItems[idx] = {
        ingredientId: ingredient._id,
        ingredientName: ingredient.name,
        quantity: newItems[idx].quantity || 1,
        unit: ingredient.unit,
        costPrice: ingredient.costPrice,
        lineTotal: (newItems[idx].quantity || 1) * ingredient.costPrice
      };
      setForm(prev => prev ? { ...prev, items: newItems } : null);
    }
  };

  const totalAmount = form ? form.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0) : 0;

  const validate = () => {
    if (!form) return false;
    const e: Record<string, string> = {};
    if (!form.supplierId) e.supplierId = 'Supplier is required';
    if (!form.purchaseDate) e.purchaseDate = 'Purchase date is required';
    if (form.items.length === 0) e.items = 'At least one item is required';
    
    form.items.forEach((item, idx) => {
      if (!item.ingredientId) e[`item_${idx}_ingredient`] = 'Select an ingredient';
      if (!item.quantity || item.quantity <= 0) e[`item_${idx}_qty`] = 'Valid quantity required';
      if (!item.costPrice || item.costPrice <= 0) e[`item_${idx}_price`] = 'Valid cost price required';
    });
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !form) return;
    setSaving(true);
    try {
      const payload = { ...form, totalAmount };
      const res = await adminApi.put(`/purchases/${id}`, payload);
      if (res.data.success) {
        toast.success('Purchase order updated successfully!');
        navigate(`/purchases/${id}`);
      } else {
        setErrors({ submit: res.data.error || 'Failed to update purchase' });
      }
    } catch (err: any) {
      setErrors({ submit: err.response?.data?.error || 'Failed to update purchase' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
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

      <div style={{ padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate(`/purchases/${id}`)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={15} color="#6b7280" />
          </button>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Purchase Order</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Update purchase order details</p>
          </div>
        </div>
        <button onClick={() => navigate(`/purchases/${id}`)} style={{ height: 36, padding: '0 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#1f2937', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <ArrowLeft size={13} /> Cancel
        </button>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>
        {errors.submit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color="#dc2626" /> {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section icon={Truck} title="Purchase Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Supplier <span style={reqStyle}>*</span></label>
                <select value={form.supplierId} onChange={e => upd('supplierId', e.target.value)} style={selectBase(!!errors.supplierId)}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.supplierName} - {s.phoneNumber}</option>)}
                </select>
                {errors.supplierId && <span style={errText}>{errors.supplierId}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Purchase Date <span style={reqStyle}>*</span></label>
                  <input type="date" value={form.purchaseDate} onChange={e => upd('purchaseDate', e.target.value)} style={inputBase(!!errors.purchaseDate)} />
                </div>
                <div>
                  <label style={labelStyle}>Invoice Number</label>
                  <input type="text" value={form.invoiceNumber} onChange={e => upd('invoiceNumber', e.target.value)} placeholder="INV-001" style={inputBase()} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Any additional notes..." style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
          </Section>

          <Section icon={ShoppingCart} title="Purchase Items" defaultOpen={true}>
            <div>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={addItem} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={13} /> Add Item
                </button>
              </div>
              
              {form.items.map((item, idx) => (
                <div key={idx} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>Item {idx + 1}</span>
                    <button onClick={() => removeItem(idx)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Ingredient <span style={reqStyle}>*</span></label>
                      <select value={item.ingredientId} onChange={e => handleIngredientSelect(idx, e.target.value)} style={selectBase(!!errors[`item_${idx}_ingredient`])}>
                        <option value="">Select Ingredient</option>
                        {ingredients.map(ing => <option key={ing._id} value={ing._id}>{ing.name} ({ing.unit}) - ₹{ing.costPrice}</option>)}
                      </select>
                    </div>
                    <div><label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Unit</label><input type="text" value={item.unit} disabled style={{ ...inputBase(), background: '#f3f4f6', color: '#6b7280' }} /></div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div><label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Quantity <span style={reqStyle}>*</span></label><input type="number" step="0.001" min="0.001" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value))} style={inputBase(!!errors[`item_${idx}_qty`])} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Cost Price (₹) <span style={reqStyle}>*</span></label><input type="number" step="0.01" min="0" value={item.costPrice} onChange={e => updateItem(idx, 'costPrice', parseFloat(e.target.value))} style={inputBase(!!errors[`item_${idx}_price`])} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>Line Total (₹)</label><input type="text" value={item.lineTotal.toFixed(2)} disabled style={{ ...inputBase(), background: '#f3f4f6', color: '#6b7280', fontWeight: 600 }} /></div>
                  </div>
                </div>
              ))}
              
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Total Amount: </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </Section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button onClick={() => navigate(`/purchases/${id}`)} style={{ height: 40, padding: '0 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{ height: 40, padding: '0 24px', borderRadius: 8, border: 'none', background: saving ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}>
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</> : <><Save size={14} /> Update Purchase Order</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}