import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Sparkles, Loader2, Layers, Info, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const inputStyle = (hasError = false): React.CSSProperties => ({
  width: '100%',
  height: 42,
  border: `1px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8,
  padding: '0 14px',
  fontSize: 14,
  background: '#fff',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
});

const textareaStyle = (hasError = false): React.CSSProperties => ({
  width: '100%',
  border: `1px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  background: '#fff',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  resize: 'vertical',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
});

export default function EditCourseTypePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    displayOrder: 0,
    description: '',
    isActive: true,
  });

  useEffect(() => {
    fetchCourseType();
  }, [id]);

  const fetchCourseType = async () => {
    try {
      const res = await api.get(`/course-types/${id}`);
      if (res.data.success) {
        const data = res.data.data;
        setForm({
          name: data.name || '',
          displayOrder: data.displayOrder || 0,
          description: data.description || '',
          isActive: data.isActive !== false,
        });
      } else {
        setError('Course type not found');
      }
    } catch (err) {
      setError('Failed to load course type');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Course type name is required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.patch(`/course-types/${id}`, form);
      if (res.data.success) {
        toast.success('Course type updated successfully!');
        navigate('/course-types');
      } else {
        setError(res.data.error || 'Failed to update course type');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update course type');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} color="#f97316" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: 12, color: '#9ca3af', fontSize: 14 }}>Loading course type...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
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
      <div style={{ padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/course-types')}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={15} color="#6b7280" />
          </button>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Course Type</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Update course type details</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/course-types')}
            style={{ height: 36, padding: '0 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#1f2937', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={13} /> Back to Course Types
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '32px auto', padding: '0 20px' }}>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={16} /> {error}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0ece4', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          
          {/* Header */}
          <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #fff7ed, #fff)', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #fef3e2, #fde8d0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={24} color="#f97316" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Edit {form.name}</h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9ca3af' }}>Update course type information</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Name */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Course Type Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Starters, Main Course, Desserts, Beverages"
                  style={inputStyle(!form.name.trim() && error)}
                />
              </div>

              {/* Display Order */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.displayOrder}
                  onChange={e => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                  style={{ ...inputStyle(), width: 120 }}
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Lower numbers appear first in dropdown</p>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Description <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe this course type..."
                  style={textareaStyle()}
                />
              </div>

              {/* Active Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#f97316', cursor: 'pointer' }}
                />
                <label htmlFor="isActive" style={{ fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                  Active <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Available for selection)</span>
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #f3f4f6', marginTop: 8 }}>
                <button
                  onClick={() => navigate('/course-types')}
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
                  {submitting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : <><Sparkles size={14} /> Update Course Type</>}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}