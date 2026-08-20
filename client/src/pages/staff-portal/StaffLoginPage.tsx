// pages/staff-portal/StaffLoginPage.tsx - FIXED (uses AuthContext, no manual storage)

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Users, Key, Home } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const { staffLogin, isAuthenticated, isStaff, isLoading: authLoading } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Check if already logged in — via context state, not raw storage ──
  useEffect(() => {
    if (isAuthenticated && isStaff) {
      navigate('/staff-portal/dashboard', { replace: true });
    }
  }, [isAuthenticated, isStaff, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!employeeId.trim()) {
      setError('Employee ID is required');
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      // staffLogin handles the API call, token storage, profile fetch,
      // and navigation to /staff-portal/dashboard on success.
      await staffLogin(employeeId.trim(), password);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid Employee ID or Password');
      } else if (err.response?.status === 404) {
        setError('Staff member not found');
      } else if (err.response?.status === 403) {
        setError('Access denied. You do not have permission to access the staff portal.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Network error. Please check your connection.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.error || err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Left Panel */}
      <div style={{ width: '45%', minWidth: 360, background: '#fff', display: 'flex', flexDirection: 'column', padding: '40px 56px', overflowY: 'auto' }}>

        <button
          onClick={() => navigate('/')}
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
            alignSelf: 'flex-start',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f97316')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#78716c')}
        >
          <Home size={18} />
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
            STAFF PORTAL
          </span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1c1917', margin: 0 }}>Staff Access</h1>
          <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 6 }}>Sign in with your employee ID and password</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Employee ID</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g., XX-EMP-2024-0001"
              style={{
                width: '100%',
                height: 42,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '0 14px',
                fontSize: 14,
                outline: 'none',
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
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  height: 42,
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '0 42px 0 14px',
                  fontSize: 14,
                  outline: 'none',
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
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 46,
              borderRadius: 10,
              border: 'none',
              background: loading ? '#d1d5db' : 'linear-gradient(135deg,#f97316,#ef4444)',
              color: loading ? '#6b7280' : '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: loading ? 'none' : '0 4px 14px rgba(249,115,22,0.35)',
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Accessing...
              </>
            ) : (
              <>
                <Key size={16} /> Access Staff Portal
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/login" style={{ fontSize: 13, color: '#78716c', textDecoration: 'none', transition: 'color 0.2s' }}>
              👑 Admin Portal Login
            </Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/super-admin/login" style={{ fontSize: 13, color: '#8b5cf6', textDecoration: 'none', transition: 'color 0.2s' }}>
              👑 Super Admin Login
            </Link>
          </div>
        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Right Panel - Decorative */}
      <div style={{ flex: 1, background: '#f5e6d3', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '110%',
          height: '90%',
          background: '#edd9c0',
          borderRadius: '50% 50% 0 0 / 40% 40% 0 0'
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-48%)',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(249,115,22,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Users size={80} color="rgba(249,115,22,0.3)" />
        </div>
      </div>
    </div>
  );
}