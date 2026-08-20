// pages/admin/LoginPage.tsx - FIXED INFINITE LOOP
//
// The infinite loop was caused by the useEffect checking ONLY isAuthenticated
// without verifying isAdmin. This caused:
// 1. isAuthenticated=true (token exists) → redirect to dashboard
// 2. AdminProtectedRoute checks isAdmin=false → redirect back to login
// 3. Login page sees isAuthenticated=true again → redirect to dashboard
// 4. REPEAT FOREVER
//
// FIX: Check BOTH isAuthenticated AND isAdmin before redirecting

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../utils/AuthContext';

const FOOD_IMAGES = [
  { src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=160&h=160&fit=crop", top: "8%",  left: "28%", size: 120 },
  { src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&h=160&fit=crop", top: "6%",  left: "62%", size: 110 },
  { src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop", top: "38%", left: "16%", size: 105 },
  { src: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=160&h=160&fit=crop", top: "38%", left: "62%", size: 115 },
  { src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=160&h=160&fit=crop", top: "68%", left: "20%", size: 150 },
  { src: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=160&h=160&fit=crop", top: "70%", left: "62%", size: 118 },
];

export default function LoginPage() {
  const navigate = useNavigate();
  // ✅ ADD isAdmin to the destructured values
  const { login, isLoading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const [email, setEmail] = useState('ayush@gmail.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Check if already logged in as ADMIN ──
  // ✅ Only redirect if BOTH isAuthenticated AND isAdmin are true
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      console.log('✅ Already logged in as admin, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, isAuthenticated, isAdmin]); // ← Added isAdmin dependency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting admin login:', email);

      await login(email, password);

      console.log('✅ Login successful, redirecting to dashboard...');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('❌ Login error:', err);

      let errorMessage = 'Login failed. Please check your credentials.';
      if (err.response?.data?.message) errorMessage = err.response.data.message;
      else if (err.response?.data?.error) errorMessage = err.response.data.error;
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
      <div style={{ width: '45%', minWidth: 360, background: '#fff', display: 'flex', flexDirection: 'column', padding: '40px 56px', overflowY: 'auto' }}>
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
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f97316')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#78716c')}
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>

        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#1c1917', letterSpacing: '-0.5px' }}>
            Ap<span style={{ color: '#f97316' }}>●</span>s
          </span>
          <span style={{
            marginLeft: 12,
            fontSize: 11,
            fontWeight: 600,
            color: '#f97316',
            background: '#fff7ed',
            padding: '2px 10px',
            borderRadius: 20,
          }}>
            ADMIN
          </span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1c1917', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Welcome Back</h1>
          <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 6 }}>Sign in to your admin account</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@restaurant.com"
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
              onFocus={(e) => e.target.style.borderColor = '#f97316'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

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
                onFocus={(e) => e.target.style.borderColor = '#f97316'}
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 15, height: 15, accentColor: '#f97316', cursor: 'pointer' }} defaultChecked />
              <span style={{ fontSize: 12, color: '#6b7280' }}>Remember me</span>
            </label>
            <Link to="/forgot-password" style={{ fontSize: 12, color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            style={{
              height: 46,
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg,#f97316,#ef4444)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: (loading || authLoading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: (loading || authLoading) ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
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

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/staff-portal/login" style={{ fontSize: 13, color: '#78716c', textDecoration: 'none', transition: 'color 0.2s' }}>
              🔑 Staff Portal Login
            </Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/super-admin/login" style={{ fontSize: 13, color: '#8b5cf6', textDecoration: 'none', transition: 'color 0.2s' }}>
              👑 Super Admin Login
            </Link>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#78716c', marginTop: 16 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#f97316', fontWeight: 700, textDecoration: 'none' }}>Sign Up</Link>
          </p>

        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      <div style={{ flex: 1, background: '#f5e6d3', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: '110%', height: '90%',
          background: '#edd9c0',
          borderRadius: '50% 50% 0 0 / 40% 40% 0 0',
        }} />

        <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-48%)', width: 420, height: 420 }} viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="180" fill="none" stroke="#d4956a" strokeWidth="2" strokeDasharray="10 10" />
          <text x="210" y="210" textAnchor="middle" dominantBaseline="central" fill="#d4956a" fontSize="18" fontWeight="600" fontFamily="'DM Sans', sans-serif">
            ADMIN
          </text>
        </svg>

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
                (e.target as HTMLImageElement).style.background = '#e8d5c0';
              }}
            />
          </div>
        ))}
      </div>

    </div>
  );
}