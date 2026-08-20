// pages/super-admin/SuperAdminLoginPage.tsx - FIXED (uses AuthContext, no manual storage)

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';

// Food images for the right panel
const FOOD_IMAGES = [
  { src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=160&h=160&fit=crop", top: "8%",  left: "28%", size: 120 },
  { src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&h=160&fit=crop", top: "6%",  left: "62%", size: 110 },
  { src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop", top: "38%", left: "16%", size: 105 },
  { src: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=160&h=160&fit=crop", top: "38%", left: "62%", size: 115 },
  { src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=160&h=160&fit=crop", top: "68%", left: "20%", size: 150 },
  { src: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=160&h=160&fit=crop", top: "70%", left: "62%", size: 118 },
];

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { superAdminLogin, isAuthenticated, isSuperAdmin, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Check if already logged in — via context state, not raw storage ──
  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      navigate('/super-admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, isSuperAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await superAdminLogin(email, password);

      if (result?.success) {
        const from = (location.state as any)?.from?.pathname || '/super-admin/dashboard';
        navigate(from, { replace: true });
      } else {
        throw new Error('Login failed');
      }
    } catch (err: any) {
      let errorMessage = 'Login failed. Please try again.';
      if (err.response?.data?.error) errorMessage = err.response.data.error;
      else if (err.response?.data?.message) errorMessage = err.response.data.message;
      else if (err.message) errorMessage = err.message;

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── LEFT: Form panel ── */}
      <div style={{ width: '45%', minWidth: 360, background: '#fff', display: 'flex', flexDirection: 'column', padding: '40px 56px', overflowY: 'auto' }}>

        {/* Back Button */}
        <button
          onClick={handleGoHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#78716c',
            fontSize: 13,
            fontWeight: 500,
            padding: '8px 0',
            marginBottom: 16,
            transition: 'color 0.2s',
            alignSelf: 'flex-start',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#8b5cf6')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#78716c')}
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>

        {/* Logo */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
          }}>
            <Shield size={24} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#1c1917', letterSpacing: '-0.5px' }}>
              Ap<span style={{ color: '#8b5cf6' }}>●</span>s
            </span>
            <span style={{
              marginLeft: 8,
              fontSize: 10,
              fontWeight: 700,
              color: '#8b5cf6',
              background: '#ede9fe',
              padding: '2px 10px',
              borderRadius: 20,
              display: 'block',
              marginTop: 2,
            }}>
              SUPER ADMIN
            </span>
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1c1917', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Welcome Back</h1>
          <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 6 }}>Sign in to your super admin account</p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

          {/* Email */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadmin@apos.com"
              required
              autoFocus
              style={{
                width: '100%',
                height: 42,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '0 14px',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                background: '#fff',
                color: '#111827',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  height: 42,
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '0 42px 0 14px',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#fff',
                  color: '#111827',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  display: 'flex',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot password */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                style={{ width: 15, height: 15, accentColor: '#8b5cf6', cursor: 'pointer' }}
                defaultChecked
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>Remember me</span>
            </label>
            <Link to="/super-admin/forgot-password" style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600, textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || authLoading}
            style={{
              height: 46,
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: (loading || authLoading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: (loading || authLoading) ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
              marginTop: 8,
              transition: 'opacity 0.2s',
            }}
          >
            {(loading || authLoading) ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Signing In…
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Other Portal Links */}
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/login" style={{ fontSize: 13, color: '#78716c', textDecoration: 'none', transition: 'color 0.2s' }}>
              👔 Admin Portal Login
            </Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/staff-portal/login" style={{ fontSize: 13, color: '#78716c', textDecoration: 'none', transition: 'color 0.2s' }}>
              🔑 Staff Portal Login
            </Link>
          </div>

          {/* Register Link */}
          <p style={{ textAlign: 'center', fontSize: 13, color: '#78716c', marginTop: 4 }}>
            Don't have an account?{' '}
            <Link to="/super-admin/register" style={{ color: '#8b5cf6', fontWeight: 700, textDecoration: 'none' }}>
              Register Now
            </Link>
          </p>

        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* ── RIGHT: Decorative panel ── */}
      <div style={{ flex: 1, background: '#ede9fe', position: 'relative', overflow: 'hidden' }}>

        {/* Large blob */}
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: '110%', height: '90%',
          background: '#ddd6fe',
          borderRadius: '50% 50% 0 0 / 40% 40% 0 0',
        }} />

        {/* Dashed circle path */}
        <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-48%)', width: 420, height: 420 }} viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="180" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="10 10" />
          <text x="210" y="210" textAnchor="middle" dominantBaseline="central" fill="#8b5cf6" fontSize="18" fontWeight="600" fontFamily="'DM Sans', sans-serif">
            SUPER ADMIN
          </text>
        </svg>

        {/* Food images */}
        {FOOD_IMAGES.map((img, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: img.top, left: img.left,
            width: img.size, height: img.size,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 2,
          }}>
            <img
              src={img.src}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => {
                (e.target as HTMLImageElement).style.background = '#ddd6fe';
              }}
            />
          </div>
        ))}
      </div>

    </div>
  );
}