// pages/master-admin/MasterAdminRegisterPage.tsx - FINAL FIX

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { masterAdminMethods } from '../../services/api';
import { useAuth } from '../../utils/AuthContext';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Crown,
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

export default function MasterAdminRegisterPage() {
  const navigate = useNavigate();
  const { logout } = useAuth(); // ✅ Get logout function
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
    } else if (form.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
      isValid = false;
    }

    if (!form.lastName.trim()) {
      errors.lastName = 'Last name is required';
      isValid = false;
    } else if (form.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
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
    } else if (!/^\+?[1-9]\d{1,14}$/.test(form.phone.replace(/\s/g, ''))) {
      errors.phone = 'Invalid phone number format';
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

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!agreedTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        agreedToTerms: agreedTerms,
      };

      console.log('📤 Sending registration payload:', { ...payload, password: '***', confirmPassword: '***' });

      const res = await masterAdminMethods.register(payload);

      console.log('📥 Registration response:', res.data);

      if (res.status === 201 || res.data.success === true) {
        toast.success('✅ Registration successful! You can now login.');

        // ✅ Use logout to clear token AND reset auth state, then navigate to login
        await logout(); // This clears the master token, resets isAuthenticated/isMasterAdmin, and navigates to /master-admin/login
        return; // No need to navigate manually – logout does it
      }

      setError(res.data.error || 'Registration failed');
      toast.error(res.data.error || 'Registration failed');

    } catch (err: any) {
      console.error('❌ Registration error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Registration failed. Please try again.';
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
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(26,26,46,0.35)',
            }}
          >
            <Crown size={22} color="#fbbf24" />
          </div>
          <div>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#1c1917', letterSpacing: '-0.5px' }}>
              Ap<span style={{ color: '#1a1a2e' }}>●</span>s
            </span>
            <span
              style={{
                marginLeft: 8,
                fontSize: 9,
                fontWeight: 700,
                color: '#1a1a2e',
                background: '#e5e7eb',
                padding: '2px 10px',
                borderRadius: 20,
                display: 'block',
                marginTop: 2,
              }}
            >
              MASTER ADMIN
            </span>
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1c1917', margin: 0 }}>
            Create Master Admin Account
          </h1>
          <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
            Register as a platform owner to manage the entire ecosystem
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
                <label style={labelStyle}>Last Name *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="Doe"
                  style={{ ...inputStyle, borderColor: formErrors.lastName ? '#fca5a5' : '#e5e7eb' }}
                />
                {formErrors.lastName && <span style={errorTextStyle}>{formErrors.lastName}</span>}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="admin@platform.com"
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
                <span style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, display: 'block' }}>Minimum 8 characters</span>
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#1a1a2e', cursor: 'pointer', marginTop: 2 }}
              />
              <label htmlFor="terms" style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
                I agree with the <span style={{ color: '#1a1a2e', fontWeight: 600 }}>Terms & Conditions</span>
                , <span style={{ color: '#1a1a2e', fontWeight: 600 }}>Privacy Policy</span>
                , and <span style={{ color: '#1a1a2e', fontWeight: 600 }}>Platform Agreement</span>
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
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1a1a2e, #16213e)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
                boxShadow: '0 4px 14px rgba(26,26,46,0.35)',
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Registering...' : '👑 Register as Master Admin'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#78716c', marginTop: 16 }}>
            Already have a Master Admin account?{' '}
            <Link to="/master-admin/login" style={{ color: '#1a1a2e', fontWeight: 700, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </form>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          input:focus {
            border-color: #1a1a2e !important;
            box-shadow: 0 0 0 3px rgba(26,26,46,0.12);
          }
        `}</style>
      </div>

      {/* ── RIGHT: Decorative Panel ───────────────────────────────────────── */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-5%',
            width: '110%',
            height: '90%',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '50% 50% 0 0 / 40% 40% 0 0',
          }}
        />
        <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-48%)', width: 420, height: 420 }} viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="180" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 10" opacity="0.5" />
          <text x="210" y="200" textAnchor="middle" dominantBaseline="central" fill="#fbbf24" fontSize="20" fontWeight="700" fontFamily="'DM Sans', sans-serif">
            MASTER
          </text>
          <text x="210" y="230" textAnchor="middle" dominantBaseline="central" fill="#fbbf24" fontSize="16" fontWeight="600" fontFamily="'DM Sans', sans-serif" opacity="0.8">
            ADMIN
          </text>
          <Crown x="175" y="160" size={50} color="#fbbf24" />
        </svg>
        
        {/* Decorative images */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '22%',
            width: 100,
            height: 100,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(251,191,36,0.3)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
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
            width: 90,
            height: 90,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(251,191,36,0.3)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: '12%',
            width: 95,
            height: 95,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(251,191,36,0.3)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: '66%',
            width: 105,
            height: 105,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(251,191,36,0.3)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '68%',
            left: '16%',
            width: 130,
            height: 130,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(251,191,36,0.3)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
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
            width: 108,
            height: 108,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(251,191,36,0.3)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 2,
          }}
        >
          <img src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=160&h=160&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
    </div>
  );
}