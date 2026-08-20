import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  ArrowLeft, Sparkles, Loader2, Layers, Info, RefreshCw, 
  ChevronUp, ChevronDown, CheckCircle, XCircle, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

// Section Component
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
  fontFamily: 'inherit',
});

const textareaStyle = (hasError = false): React.CSSProperties => ({
  width: '100%',
  border: `1px solid ${hasError ? '#fca5a5' : '#e5e7eb'}`,
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  background: '#fff',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  resize: 'vertical',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
});

const labelStyle: React.CSSProperties = { 
  fontSize: 13, 
  fontWeight: 500, 
  color: '#374151',
  display: 'block',
  marginBottom: 6
};

const reqStyle: React.CSSProperties = { 
  color: '#ef4444', 
  marginLeft: 2 
};

const errText: React.CSSProperties = { 
  fontSize: 11, 
  color: '#ef4444', 
  marginTop: 4 
};

export default function AddCourseTypePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    displayOrder: 0,
    description: '',
    isActive: true,
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Course type name is required');
      toast.error('Course type name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/course-types', form);
      if (res.data.success) {
        toast.success('Course type created successfully!');
        navigate('/course-types');
      } else {
        setError(res.data.error || 'Failed to create course type');
        toast.error(res.data.error || 'Failed to create course type');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create course type';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ name: '', displayOrder: 0, description: '', isActive: true });
    setError('');
    toast.success('Form reset');
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

      {/* Navbar - Same as Add Dishes */}
      <div style={{ 
        padding: '0 24px', 
        height: 56, 
        background: 'white', 
        borderBottom: '1px solid #f3f4f6', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/course-types')}
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
            Back to Course Types
          </button>
          
          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />
          
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Add New Course Type</h1>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Create a new dish course type</p>
          </div>
        </div>
        
        <button
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 20px',
            height: 36,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
            color: '#f97316',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} />
          Reset Form
        </button>
      </div>

      {/* Main Content - Same padding as Add Dishes */}
      <div style={{ padding: '24px 24px 40px' }}>

        {error && (
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            padding: '11px 16px', 
            borderRadius: 10, 
            marginBottom: 20, 
            fontSize: 13, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8 
          }}>
            <AlertCircle size={16} color="#dc2626" /> 
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Basic Information Section */}
          <Section icon={Layers} title="Course Type Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Name Field */}
              <div>
                <label style={labelStyle}>
                  Course Type Name <span style={reqStyle}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Starters, Main Course, Desserts, Beverages"
                  style={inputStyle(!form.name.trim() && error)}
                  autoFocus
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  This will appear in dish course type dropdown
                </p>
              </div>

              {/* Display Order Field */}
              <div>
                <label style={labelStyle}>
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.displayOrder}
                  onChange={e => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  style={{ ...inputStyle(), width: 120 }}
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  Lower numbers appear first in dropdown
                </p>
              </div>

              {/* Description Field */}
              <div>
                <label style={labelStyle}>
                  Description <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., Appetizers and small plates served before main course"
                  style={textareaStyle()}
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  Brief description of this course type
                </p>
              </div>

            </div>
          </Section>

          {/* Status Section */}
          <Section icon={CheckCircle} iconColor="#10b981" title="Status" defaultOpen={true}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setForm({ ...form, isActive: true })}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: `2px solid ${form.isActive ? '#10b981' : '#e5e7eb'}`,
                  background: form.isActive ? '#ecfdf5' : '#fff',
                  color: form.isActive ? '#065f46' : '#6b7280',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <CheckCircle size={16} />
                Active
              </button>
              <button
                onClick={() => setForm({ ...form, isActive: false })}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: `2px solid ${!form.isActive ? '#ef4444' : '#e5e7eb'}`,
                  background: !form.isActive ? '#fef2f2' : '#fff',
                  color: !form.isActive ? '#991b1b' : '#6b7280',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <XCircle size={16} />
                Inactive
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
              {form.isActive 
                ? '✅ Active course types are available for selection when adding dishes' 
                : '❌ Inactive course types will not appear in dropdown menus'}
            </p>
          </Section>

          {/* Preview Section */}
          <Section icon={Sparkles} iconColor="#f59e0b" title="Preview" defaultOpen={false}>
            <div style={{ 
              background: 'linear-gradient(135deg, #fff7ed, #fff)', 
              borderRadius: 10, 
              padding: 20,
              border: '1px solid #fed7aa'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Layers size={20} color="#f97316" />
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    {form.name || 'Course Type Name'}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
                    Display Order: {form.displayOrder}
                  </p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: form.isActive ? '#10b981' : '#ef4444',
                    color: '#fff'
                  }}>
                    {form.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
              {form.description && (
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0, paddingTop: 12, borderTop: '1px solid #fed7aa' }}>
                  📝 {form.description}
                </p>
              )}
              {!form.name && (
                <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
                  Enter course type details to see preview
                </p>
              )}
            </div>
          </Section>

          {/* Action Buttons - Same as Add Dishes */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              onClick={() => navigate('/course-types')}
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
              disabled={loading}
              style={{ 
                height: 40, 
                padding: '0 28px', 
                borderRadius: 8, 
                border: 'none', 
                background: loading ? '#fdba74' : 'linear-gradient(135deg,#f97316,#ef4444)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                boxShadow: '0 2px 8px rgba(249,115,22,0.35)'
              }}
            >
              {loading ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</>
              ) : (
                <><Sparkles size={16} /> Create Course Type</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}