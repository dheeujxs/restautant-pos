// pages/super-admin/SuperAdminRegisterPage.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Eye,
  EyeOff,
  Loader2,
  Shield,
  User,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Field Styles ──────────────────────────────────────────────────────────
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };
const inputStyle = {
  width: '100%',
  height: 38,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box' as const,
  background: '#fff',
  color: '#111827',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};
const errorTextStyle = { fontSize: 11, color: '#ef4444', marginTop: 2 };

export default function SuperAdminRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Form State ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // ─── Validate ──────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!form.firstName.trim()) {
      errors.firstName = 'First name is required';
      isValid = false;
    }
    if (!form.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }
    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required';
      isValid = false;
    }
    if (!form.password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
      isValid = false;
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // ─── Submit Registration ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!agreedTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
        agreedToTerms: agreedTerms,
      };

      const res = await api.post('/super-admin/register', payload);

      if (res.data.success) {
        toast.success('✅ Registration successful! Please check your email to verify your account.');
        navigate('/super-admin/login');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif", background: '#faf9f7' }}>
      {/* ── LEFT: Form Panel ──────────────────────────────────────────────── */}
      <div
        style={{
          width: '50%',
          minWidth: 380,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 48px',
          overflowY: 'auto',
          maxHeight: '100vh',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
            }}
          >
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#1c1917', letterSpacing: '-0.5px' }}>
              Ap<span style={{ color: '#8b5cf6' }}>●</span>s
            </span>
            <span
              style={{
                marginLeft: 8,
                fontSize: 9,
                fontWeight: 700,
                color: '#8b5cf6',
                background: '#ede9fe',
                padding: '2px 10px',
                borderRadius: 20,
                display: 'block',
                marginTop: 2,
              }}
            >
              SUPER ADMIN
            </span>
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1c1917', margin: 0 }}>
            Create Super Admin Account
          </h1>
          <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
            Register as a super admin to manage multiple restaurants
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ── Form ────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="John"
                  style={{ ...inputStyle, borderColor: formErrors.firstName ? '#fca5a5' : '#e5e7eb' }}
                />
                {formErrors.firstName && <span style={errorTextStyle}>{formErrors.firstName}</span>}
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="Doe"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="admin@company.com"
                style={{ ...inputStyle, borderColor: formErrors.email ? '#fca5a5' : '#e5e7eb' }}
              />
              {formErrors.email && <span style={errorTextStyle}>{formErrors.email}</span>}
            </div>

            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+91 9876543210"
                style={{ ...inputStyle, borderColor: formErrors.phone ? '#fca5a5' : '#e5e7eb' }}
              />
              {formErrors.phone && <span style={errorTextStyle}>{formErrors.phone}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 36, borderColor: formErrors.password ? '#fca5a5' : '#e5e7eb' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      display: 'flex',
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {formErrors.password && <span style={errorTextStyle}>{formErrors.password}</span>}
              </div>
              <div>
                <label style={labelStyle}>Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 36, borderColor: formErrors.confirmPassword ? '#fca5a5' : '#e5e7eb' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      display: 'flex',
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {formErrors.confirmPassword && <span style={errorTextStyle}>{formErrors.confirmPassword}</span>}
              </div>
            </div>

            {/* Terms */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
                I agree with the <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Terms & Conditions</span>
                and <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Privacy Policy</span>
              </label>
            </div>
            {!agreedTerms && <span style={{ fontSize: 11, color: '#ef4444' }}>You must agree to the terms</span>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: loading ? '#c4b5fd' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
              }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Registering...' : '🚀 Register Now'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#78716c', marginTop: 16 }}>
            Already have an account?{' '}
            <Link to="/super-admin/login" style={{ color: '#8b5cf6', fontWeight: 700, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </form>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          input:focus {
            border-color: #8b5cf6 !important;
            box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
          }
        `}</style>
      </div>

      {/* ── RIGHT: Decorative Panel ───────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#ede9fe', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-5%',
            width: '110%',
            height: '90%',
            background: '#ddd6fe',
            borderRadius: '50% 50% 0 0 / 40% 40% 0 0',
          }}
        />
        <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-48%)', width: 420, height: 420 }} viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="180" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="10 10" />
          <text x="210" y="210" textAnchor="middle" dominantBaseline="central" fill="#8b5cf6" fontSize="18" fontWeight="600" fontFamily="'DM Sans', sans-serif">
            SUPER ADMIN
          </text>
        </svg>
        {/* Food images */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '28%',
            width: 120,
            height: 120,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '6%',
            left: '62%',
            width: 110,
            height: 110,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: '16%',
            width: 105,
            height: 105,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: '62%',
            width: 115,
            height: 115,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '68%',
            left: '20%',
            width: 150,
            height: 150,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '70%',
            left: '62%',
            width: 118,
            height: 118,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
    </div>
  );
}