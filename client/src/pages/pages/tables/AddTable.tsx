// pages/tables/AddTablePage.tsx - FIXED IMPORT

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ✅ FIX: Import the correct axios instance
import { adminApi } from '../../../services/api';
import { ArrowLeft, Sparkles, Loader2, Table2, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface IFloor {
  _id: string;
  name: string;
}

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
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' };

export default function AddTablePage() {
  const navigate = useNavigate();
  const [floors, setFloors] = useState<IFloor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [numberErr, setNumberErr] = useState('');
  const [floorErr, setFloorErr] = useState('');

  const [form, setForm] = useState({
    number: '',
    name: '',
    floorId: '',
    floorName: '',
    capacity: 4,
    isActive: true,
  });

  useEffect(() => {
    // ✅ Use adminApi instead of api
    adminApi.get('/floors')
      .then(res => {
        setFloors(res.data?.data?.floors ?? []);
      })
      .catch(err => {
        console.error('Failed to fetch floors:', err);
        toast.error('Failed to load floors');
      })
      .finally(() => setLoading(false));
  }, []);

  const reset = () => {
    setForm({
      number: '', name: '', floorId: '', floorName: '', capacity: 4, isActive: true,
    });
    setError('');
    setNumberErr('');
    setFloorErr('');
  };

  const handleSubmit = async () => {
    let isValid = true;
    if (!form.number.trim()) { setNumberErr('Table number is required'); isValid = false; } else { setNumberErr(''); }
    if (!form.floorId) { setFloorErr('Floor is required'); isValid = false; } else { setFloorErr(''); }
    if (!isValid) return;

    const selectedFloor = floors.find(f => f._id === form.floorId);
    const payload = { 
      ...form, 
      floorName: selectedFloor?.name || '',
      shape: 'rectangle' // Fixed shape
    };

    setSubmitting(true);
    setError('');
    try {
      // ✅ Use adminApi instead of api
      const res = await adminApi.post('/tables', payload);
      if (res.data.success) {
        toast.success('✅ Table created successfully!');
        navigate('/tables');
      } else {
        setError(res.data.error || 'Failed to create table');
      }
    } catch (err: any) {
      console.error('Create table error:', err);
      setError(err.response?.data?.error || 'Failed to create table');
      toast.error(err.response?.data?.error || 'Failed to create table');
    } finally {
      setSubmitting(false);
    }
  };

  const capacities = [2, 4, 6, 8, 10, 12];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
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
              <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Create Table</h1>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Add new restaurant table</p>
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
              <ArrowLeft size={13} /> Back to Tables
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
          <Section icon={Table2} title="Basic Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Table Number <span style={reqStyle}>*</span></label>
                  <input
                    type="text"
                    value={form.number}
                    onChange={e => { setForm({ ...form, number: e.target.value }); setNumberErr(''); }}
                    placeholder="e.g., T01, Table 1"
                    style={inputStyle(!!numberErr)}
                  />
                  {numberErr && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{numberErr}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Table Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Window Table, VIP Corner"
                    style={inputStyle()}
                  />
                </div>
              </div>

              <div style={grid2}>
                <div>
                  <label style={labelStyle}>Floor <span style={reqStyle}>*</span></label>
                  <select
                    value={form.floorId}
                    onChange={e => { setForm({ ...form, floorId: e.target.value }); setFloorErr(''); }}
                    style={selectStyle(!!floorErr)}
                  >
                    <option value="">Select Floor</option>
                    {floors.map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                  {floorErr && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{floorErr}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Capacity</label>
                  <select
                    value={form.capacity}
                    onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) })}
                    style={selectStyle()}
                  >
                    {capacities.map(c => (
                      <option key={c} value={c}>{c} Seats</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value="available"
                  disabled
                  style={{ ...selectStyle(), background: '#f5f5f5', cursor: 'not-allowed' }}
                >
                  <option value="available">Available</option>
                </select>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Status can be changed later from table list</p>
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
                Active <span style={{ color: '#9ca3af' }}>(Table visible for booking)</span>
              </label>
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
              {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Sparkles size={14} /> Save Table</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}