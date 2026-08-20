import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { ArrowLeft, Sparkles, Loader2, Tag, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '6px' };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151' };
const reqStyle: React.CSSProperties = { color: '#ef4444', marginLeft: 2 };
const inputBase = (err = false): React.CSSProperties => ({
  height: 40, width: '100%', boxSizing: 'border-box',
  border: `1px solid ${err ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8, padding: '0 12px', fontSize: 14,
  background: '#fff', color: '#111827', outline: 'none',
  transition: 'border-color 0.15s',
});
const errTextStyle: React.CSSProperties = { fontSize: 11, color: '#ef4444' };

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

export default function AddIngredientCategoryPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameErr, setNameErr] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setIsActive(true);
    setError('');
    setNameErr('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameErr('Category name is required');
      return;
    }
    setLoading(true);
    setError('');
    setNameErr('');
    try {
      const res = await adminApi.post('/ingredient-categories', { name, description, isActive });
      if (res.data.success) {
        navigate('/ingredient-categories');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.12);
        }
      `}</style>

      <div style={{ padding: '0 24px 40px' }}>

        {/* Navbar */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ArrowLeft size={15} color="#6b7280" />
            </button>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Create Ingredient Category</h1>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>e.g., Meat, Vegetables, Dairy</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={reset}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <RefreshCw size={14} color="#6b7280" />
            </button>
            <button
              onClick={() => navigate(-1)}
              style={{ height: 36, padding: '0 18px', borderRadius: 8, border: 'none', background: '#1f2937', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={13} /> Back to Categories
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

          {/* Category Details */}
          <Section icon={Tag} title="Category Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={fieldStyle}>
                <label style={labelStyle}>Category Name <span style={reqStyle}>*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameErr(''); }}
                  placeholder="e.g., Meat, Vegetables, Dairy, Spices"
                  style={inputBase(!!nameErr)}
                />
                {nameErr && <span style={errTextStyle}>{nameErr}</span>}
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe this category…"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, resize: 'vertical', background: '#fff', color: '#111827', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer' }}
                />
                <label htmlFor="isActive" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                  Active <span style={{ color: '#9ca3af' }}>(Available for selection)</span>
                </label>
              </div>

            </div>
          </Section>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ height: 40, padding: '0 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ height: 40, padding: '0 24px', borderRadius: 8, border: 'none', background: loading ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}
            >
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Sparkles size={14} /> Save Category</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}