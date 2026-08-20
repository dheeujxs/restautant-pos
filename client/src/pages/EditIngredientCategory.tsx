import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../services/api';
import { 
  ArrowLeft, Sparkles, Loader2, FolderTree, 
  ChevronUp, ChevronDown, CheckCircle, XCircle,
  Tag, FileText, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  resize: 'vertical', minHeight: 80,
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
export default function EditIngredientCategoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    isActive: true
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        // ✅ Fix: Use the correct endpoint with /api prefix
        const res = await adminApi.get(`/ingredient-categories/${id}`);
        console.log('Category API Response:', res.data);
        
        if (res.data.success) {
          const cat = res.data.data;
          setForm({
            name: cat.name || "",
            description: cat.description || "",
            isActive: cat.isActive !== false,
          });
        } else {
          toast.error('Category not found');
          navigate('/ingredient-categories');
        }
      } catch (err: any) {
        console.error('Error fetching category:', err);
        const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch category';
        toast.error(errorMsg);
        setErrors({ submit: errorMsg });
        // Don't navigate immediately, let user see the error
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchCategory();
    } else {
      toast.error('Invalid category ID');
      navigate('/ingredient-categories');
    }
  }, [id, navigate]);

  const upd = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Category name is required';
    if (form.description && form.description.length > 500) e.description = 'Description must be less than 500 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      const res = await adminApi.patch(`/ingredient-categories/${id}`, form);
      if (res.data.success) {
        toast.success('Category updated successfully!');
        navigate('/ingredient-categories');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update category');
      setErrors({ submit: err.response?.data?.error || 'Failed to update category' });
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
            onClick={() => navigate('/ingredient-categories')}
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
            Back to Categories
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Ingredient Category</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Update ingredient category details</p>
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
          <Section icon={FolderTree} title="Basic Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Category Name <span style={reqStyle}>*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => upd('name', e.target.value)} 
                  placeholder="e.g., Vegetables, Dairy, Meat" 
                  style={inputBase(!!errors.name)} 
                />
                {errors.name && <span style={errText}>{errors.name}</span>}
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Enter a unique name for this ingredient category</p>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea 
                  rows={3} 
                  value={form.description} 
                  onChange={e => upd('description', e.target.value)} 
                  placeholder="Describe this category…" 
                  style={textareaBase(!!errors.description)} 
                />
                {errors.description && <span style={errText}>{errors.description}</span>}
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Optional description (max 500 characters)</p>
              </div>
            </div>
          </Section>

          {/* Status Section */}
          <Section icon={Tag} iconColor="#10b981" title="Status">
            <div>
              <label style={labelStyle}>Category Status</label>
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
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Inactive categories will not be available for selection</p>
            </div>
          </Section>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              onClick={() => navigate('/ingredient-categories')}
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
              {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Edit3 size={16} /> Update Category</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}