import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { Eye, EyeOff, Loader2, Shield, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';

// Food images for the right panel (free Unsplash URLs)
const FOOD_IMAGES = [
  { src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=160&h=160&fit=crop", top: "8%",  left: "28%", size: 120 },
  { src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&h=160&fit=crop", top: "6%",  left: "62%", size: 110 },
  { src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop", top: "38%", left: "16%", size: 105 },
  { src: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=160&h=160&fit=crop", top: "38%", left: "62%", size: 115 },
  { src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=160&h=160&fit=crop", top: "68%", left: "20%", size: 150 },
  { src: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=160&h=160&fit=crop", top: "70%", left: "62%", size: 118 },
];

const inputCls = `
  w-full px-3 py-2 text-sm border border-stone-200 rounded-lg
  focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
  bg-white text-stone-800 placeholder-stone-300 transition-all
`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    phone: '', password: '', confirmPassword: '',
    role: 'user', // ✅ Default role
  });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  // ✅ Check if this is the first user (will become admin)
  useEffect(() => {
    const checkFirstUser = async () => {
      try {
        const res = await adminApi.get('/admin/users');
        if (res.data.success && res.data.data.length === 0) {
          setIsFirstUser(true);
          setForm(prev => ({ ...prev, role: 'admin' }));
          console.log('👑 First user will be admin!');
        }
      } catch (error) {
        // If admin route doesn't exist, assume no users
        setIsFirstUser(true);
        setForm(prev => ({ ...prev, role: 'admin' }));
      }
    };
    checkFirstUser();
  }, []);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { 
      setError('Passwords do not match'); 
      toast.error('Passwords do not match');
      return; 
    }
    if (!agreed) { 
      setError('Please agree to the terms of use'); 
      toast.error('Please agree to the terms of use');
      return; 
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true); 
    setError('');
    
    try {
      // ✅ Send role with registration
      const res = await adminApi.post('/auth/register', form);
      
      if (res.data.success) {
        const { token, user } = res.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isAdmin', user.role === 'admin' ? 'true' : 'false');
        localStorage.setItem('isStaff', 'false');
        
        toast.success(`✅ Registration successful! Welcome ${user.firstName}!`);
        
        // ✅ Navigate based on role
        if (user.role === 'admin') {
          toast.success('👑 Admin account created!');
        }
        
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get role display name
  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: '👑 Administrator',
      user: '👤 Customer',
      waiter: '🍽️ Waiter',
      kitchen: '👨‍🍳 Kitchen Staff',
      cashier: '💰 Cashier'
    };
    return roleMap[role] || role;
  };

  // ✅ Check if user can select admin role (only if no admin exists)
  const canSelectAdmin = isFirstUser;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── LEFT: Form panel ───────────────────────────────────────── */}
      <div style={{ width: '45%', minWidth: 360, background: '#fff', display: 'flex', flexDirection: 'column', padding: '40px 56px', overflowY: 'auto' }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#1c1917', letterSpacing: '-0.5px' }}>
            Ap<span style={{ color: '#f97316' }}>●</span>s
          </span>
          {isFirstUser && (
            <span style={{ 
              marginLeft: 12, 
              fontSize: 11, 
              fontWeight: 600, 
              color: '#f97316', 
              background: '#fff7ed',
              padding: '2px 10px',
              borderRadius: 20,
            }}>
              👑 First User - Admin
            </span>
          )}
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1c1917', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
            Create Account
          </h1>
          <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 6 }}>
            {isFirstUser ? '👑 You will be the first admin user!' : 'Register to get started'}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>First Name</label>
              <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" required
                style={{ width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Last Name</label>
              <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Doe" required
                style={{ width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }} />
            </div>
          </div>

          {/* Email + Phone row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" required
                style={{ width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Phone No.</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 00000 00000" required
                style={{ width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }} />
            </div>
          </div>

          {/* Password + Confirm row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} required
                  style={{ width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 36px 0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required
                style={{ width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }} />
            </div>
          </div>

          {/* ✅ Role Selection (Only for first user) */}
          {isFirstUser && (
            <div style={{ 
              background: '#fef7e6', 
              border: '2px solid #f97316', 
              borderRadius: 10, 
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <Shield size={20} color="#f97316" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1c1917' }}>
                  👑 You are the first user!
                </p>
                <p style={{ fontSize: 12, color: '#78716c' }}>
                  You will be registered as an <strong style={{ color: '#f97316' }}>Administrator</strong>
                </p>
              </div>
            </div>
          )}

          {/* Terms */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: '#f97316', cursor: 'pointer' }} />
            <label htmlFor="terms" style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
              I agree with the <span style={{ color: '#f97316', fontWeight: 600 }}>terms of use</span>
            </label>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{ height: 42, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(249,115,22,0.35)', marginTop: 4 }}>
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating Account…</> : isFirstUser ? '👑 Create Admin Account' : 'Sign Up'}
          </button>

          {/* Sign in link */}
          <p style={{ textAlign: 'center', fontSize: 13, color: '#78716c', marginTop: 4 }}>
            Already have an Account?{' '}
            <Link to="/login" style={{ color: '#f97316', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
          </p>

          {/* Staff Portal Link */}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#a8a29e' }}>
            <Link to="/staff-portal/login" style={{ color: '#78716c', textDecoration: 'none' }}>
              🔑 Staff Portal
            </Link>
          </p>

        </form>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* ── RIGHT: Decorative panel ────────────────────────────────── */}
      <div style={{ flex: 1, background: '#f5e6d3', position: 'relative', overflow: 'hidden' }}>

        {/* Large blob */}
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: '110%', height: '90%',
          background: '#edd9c0',
          borderRadius: '50% 50% 0 0 / 40% 40% 0 0',
        }} />

        {/* Dashed circle path */}
        <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-48%)', width: 420, height: 420 }} viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="180" fill="none" stroke="#d4956a" strokeWidth="2" strokeDasharray="10 10" />
          <text x="210" y="210" textAnchor="middle" dominantBaseline="central" fill="#d4956a" fontSize="18" fontWeight="600" fontFamily="'DM Sans', sans-serif">
            REGISTER
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
            <img src={img.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.background = '#e8d5c0'; }} />
          </div>
        ))}
      </div>

    </div>
  );
}