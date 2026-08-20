import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api';
import { ArrowLeft, Loader2, Mail, CheckCircle,Eye,EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const FOOD_IMAGES = [
  { src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=160&h=160&fit=crop", top: "8%",  left: "28%", size: 120 },
  { src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&h=160&fit=crop", top: "6%",  left: "62%", size: 110 },
  { src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=160&h=160&fit=crop", top: "38%", left: "16%", size: 105 },
  { src: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=160&h=160&fit=crop", top: "38%", left: "62%", size: 115 },
  { src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=160&h=160&fit=crop", top: "68%", left: "20%", size: 150 },
  { src: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=160&h=160&fit=crop", top: "70%", left: "62%", size: 118 },
];

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setSuccess('OTP sent to your email!');
        setStep('otp');
        // Start 60 second timer
        setTimer(60);
        const interval = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) clearInterval(interval);
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(res.data.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter valid 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.post('/auth/verify-otp', { email, otp });
      if (res.data.success) {
        setSuccess('OTP verified! Set your new password.');
        setStep('reset');
      } else {
        setError(res.data.message || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.post('/auth/reset-password', { email, otp, newPassword });
      if (res.data.success) {
        toast.success('Password reset successful! Please login.');
        navigate('/login');
      } else {
        setError(res.data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      const res = await adminApi.post('/auth/forgot-password', { email });
      if (res.data.success) {
        toast.success('OTP resent!');
        setTimer(60);
        const interval = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) clearInterval(interval);
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>

      {/* LEFT: Form panel */}
      <div style={{ width: '45%', minWidth: 360, background: '#fff', display: 'flex', flexDirection: 'column', padding: '40px 56px', overflowY: 'auto' }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#1c1917', letterSpacing: '-0.5px' }}>
              Ap<span style={{ color: '#f97316' }}>●</span>s
            </span>
          </Link>
        </div>

        {/* Back button */}
        <button
          onClick={() => step === 'email' ? navigate('/login') : setStep('email')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, width: 'fit-content', color: '#6b7280', fontSize: 13 }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1c1917', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
            {step === 'email' && 'Forgot Password'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'reset' && 'Reset Password'}
          </h1>
          <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 6 }}>
            {step === 'email' && 'Enter your email to receive a verification code'}
            {step === 'otp' && 'Enter the 6-digit code sent to your email'}
            {step === 'reset' && 'Create a new password for your account'}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {success && step !== 'reset' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} /> {success}
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === 'email' && (
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  style={{ width: '100%', height: 46, border: '1px solid #e5e7eb', borderRadius: 10, padding: '0 14px 0 38px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 46, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f97316,#ef4444)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(249,115,22,0.35)'
              }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2: OTP Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                required
                style={{ width: '100%', height: 46, border: '1px solid #e5e7eb', borderRadius: 10, padding: '0 14px', fontSize: 16, fontWeight: 600, textAlign: 'center', letterSpacing: 4, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 46, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f97316,#ef4444)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(249,115,22,0.35)'
              }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</> : 'Verify OTP'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={timer > 0}
                style={{ background: 'none', border: 'none', color: timer > 0 ? '#9ca3af' : '#f97316', fontSize: 13, fontWeight: 600, cursor: timer > 0 ? 'not-allowed' : 'pointer' }}
              >
                {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Reset Password Form */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', height: 46, border: '1px solid #e5e7eb', borderRadius: 10, padding: '0 42px 0 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', height: 46, border: '1px solid #e5e7eb', borderRadius: 10, padding: '0 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 46, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f97316,#ef4444)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(249,115,22,0.35)'
              }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Resetting...</> : 'Reset Password'}
            </button>
          </form>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* RIGHT: Decorative panel */}
      <div style={{ flex: 1, background: '#f5e6d3', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '110%', height: '90%', background: '#edd9c0', borderRadius: '50% 50% 0 0 / 40% 40% 0 0' }} />
        <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-48%)', width: 420, height: 420 }} viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="180" fill="none" stroke="#d4956a" strokeWidth="2" strokeDasharray="10 10" />
        </svg>
        {FOOD_IMAGES.map((img, i) => (
          <div key={i} style={{ position: 'absolute', top: img.top, left: img.left, width: img.size, height: img.size, borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 2 }}>
            <img src={img.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>
    </div>
  );
}