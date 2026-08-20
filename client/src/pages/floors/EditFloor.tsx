import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { ArrowLeft, Sparkles, Loader2, Building2, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

// ---------- Section component (same as AddFloorPage) ----------
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

// ---------- Style helpers (same as AddFloorPage) ----------
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

const reqStyle: React.CSSProperties = { color: '#ef4444', marginLeft: 2 };

export default function EditFloorPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [nameErr, setNameErr] = useState('');

  // Fetch floor data
  const fetchFloor = async () => {
    try {
      const res = await adminApi.get(`/floors/${id}`);
      if (res.data.success) {
        const floor = res.data.data;
        setName(floor.name || '');
        setDescription(floor.description || '');
        setDisplayOrder(floor.displayOrder || 0);
        setIsActive(floor.isActive !== false);
        setError('');
      } else {
        setError('Floor not found');
      }
    } catch (err) {
      setError('Failed to fetch floor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchFloor();
  }, [id]);

  // Reset → re‑fetch original data
  const reset = () => {
    if (id) {
      setLoading(true);
      fetchFloor();
    }
  };

  // Submit update
  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameErr('Floor name is required');
      return;
    }
    setSubmitting(true);
    setError('');
    setNameErr('');
    try {
      const res = await adminApi.patch(`/floors/${id}`, { name, description, displayOrder, isActive });
      if (res.data.success) {
        navigate('/floors');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update floor');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state (inline spinner)
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Loader2 size={40} color="#f97316" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading floor data…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ---------- Main render (exactly as AddFloorPage) ----------
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
              <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Floor</h1>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Update restaurant floor</p>
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
              <ArrowLeft size={13} /> Back to Floors
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

          {/* Floor Details Section */}
          <Section icon={Building2} title="Floor Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Floor Name <span style={reqStyle}>*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameErr(''); }}
                  placeholder="e.g., Ground Floor, First Floor, Terrace"
                  style={inputStyle(!!nameErr)}
                />
                {nameErr && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{nameErr}</p>}
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe this floor…"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 14,
                    resize: 'vertical',
                    background: '#fff',
                    color: '#111827',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>Display Order</label>
                <input
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={e => setDisplayOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  style={inputStyle()}
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Lower number appears first in list</p>
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
                  Active <span style={{ color: '#9ca3af' }}>(Floor visible for table assignment)</span>
                </label>
              </div>
            </div>
          </Section>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ height: 40, padding: '0 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                height: 40,
                padding: '0 24px',
                borderRadius: 8,
                border: 'none',
                background: submitting ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
              }}
            >
              {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : <><Sparkles size={14} /> Update Floor</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}