import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  Sprout,
  ShoppingBag,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send
} from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { BENUE_LGAS } from '../../data/locations.js';
import { signUpUser, signInUser, requestPasswordReset } from '../../services/authService.js';

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login', // 'login' | 'register' | 'forgot'
  initialRole = 'buyer',
  onSuccess = () => {}
}) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    lga: 'Ukum'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false); // success state after sending reset

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setAuthError('');
      setResetSent(false);
    }
  }, [isOpen, initialMode, initialRole]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setAuthError('');
    setResetSent(false);
  };

  // ── Sign In / Register handler ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    const rawInput = (formData.email || '').trim();

    if (mode === 'register') {
      const { user, error } = await signUpUser({
        email: rawInput,
        password: formData.password,
        name: formData.name,
        phone: (formData.phone && !formData.phone.includes('@')) ? formData.phone : '',
        role,
        lga: formData.lga
      });

      setLoading(false);
      if (error) { setAuthError(error); return; }
      if (user) { onSuccess(user); onClose(); }
    } else {
      const { user, error } = await signInUser({
        email: rawInput,
        password: formData.password
      });

      setLoading(false);
      if (error) { setAuthError(error); return; }
      if (user) { onSuccess(user); onClose(); }
    }
  };

  // ── Forgot-password handler ───────────────────────────────────────────────
  const handleResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    const emailVal = formData.email.trim();
    if (!emailVal || !emailVal.includes('@')) {
      setAuthError('Please enter the email address linked to your account.');
      setLoading(false);
      return;
    }

    const { error } = await requestPasswordReset(emailVal);
    setLoading(false);

    if (error) {
      setAuthError(error);
    } else {
      setResetSent(true);
    }
  };

  // ── Modal title ───────────────────────────────────────────────────────────
  const modalTitle =
    mode === 'login'    ? 'Sign In to Benue Market' :
    mode === 'register' ? 'Create an Account' :
                          'Recover Your Password';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="460px">
      <div className="auth-modal-root">

        {/* ── Tab switch (only for login / register) ── */}
        {mode !== 'forgot' && (
          <div className="auth-tab-switch">
            <button
              type="button"
              className={`auth-switch-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-switch-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>
        )}

        {/* ── Forgot-password mode ── */}
        {mode === 'forgot' && (
          <>
            {/* Back link */}
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'none',
                border: 'none',
                color: 'var(--color-primary-700)',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '0 0 14px 0'
              }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>

            {resetSent ? (
              /* ── Success state ── */
              <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <CheckCircle2 size={28} color="#059669" />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: 'var(--color-slate-900)' }}>
                  Recovery Email Sent!
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: 'var(--color-slate-600)', lineHeight: '1.55' }}>
                  We've sent a password-reset link to <strong>{formData.email}</strong>.
                  Please check your inbox (and spam folder) and follow the link to create a new password.
                </p>
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                  fontSize: '12.5px', color: '#1e40af', textAlign: 'left', lineHeight: '1.5',
                  marginBottom: '20px'
                }}>
                  <strong>Tip:</strong> The reset link expires in <strong>60 minutes</strong>.
                  If you don't receive the email within a few minutes, check your spam/junk folder or try again.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => { setResetSent(false); setFormData(f => ({ ...f, email: '' })); }}
                >
                  Send Again to a Different Email
                </Button>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  style={{
                    display: 'block', width: '100%', marginTop: '10px',
                    background: 'none', border: 'none',
                    color: 'var(--color-primary-700)', fontFamily: 'var(--font-body)',
                    fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: '6px'
                  }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              /* ── Request form ── */
              <>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 14px', marginBottom: '18px',
                  backgroundColor: '#fffbeb', border: '1px solid #fef3c7',
                  borderRadius: '8px', fontSize: '13px', color: '#92400e', lineHeight: '1.5'
                }}>
                  <KeyRound size={18} style={{ flexShrink: 0, marginTop: '1px', color: '#d97706' }} />
                  <span>
                    Enter the email address linked to your Benue Market account.
                    We'll send you a secure link to reset your password.
                  </span>
                </div>

                {authError && (
                  <div className="auth-error-alert" style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 14px', marginBottom: '14px',
                    backgroundColor: '#fee2e2', color: '#b91c1c',
                    borderRadius: '6px', fontSize: '13px', fontWeight: '600'
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleResetRequest} className="auth-form-body">
                  <div className="form-group">
                    <label className="form-label" htmlFor="reset-email">
                      Email Address *
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Mail size={16} style={{
                        position: 'absolute', left: '12px',
                        color: 'var(--color-slate-400)', pointerEvents: 'none'
                      }} />
                      <input
                        id="reset-email"
                        type="email"
                        required
                        autoFocus
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. yourname@email.com"
                        className="form-input"
                        style={{ paddingLeft: '38px' }}
                      />
                    </div>
                  </div>

                  <div className="auth-form-submit-wrap">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={loading}
                      icon={loading ? Loader2 : Send}
                    >
                      {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </>
        )}

        {/* ── Login / Register mode ── */}
        {mode !== 'forgot' && (
          <>
            {/* Error Alert */}
            {authError && (
              <div className="auth-error-alert" style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', marginBottom: '14px',
                backgroundColor: 'var(--color-danger-light, #fee2e2)',
                color: 'var(--color-danger, #b91c1c)',
                borderRadius: '6px', fontSize: '13px', fontWeight: '600'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            {/* Role Picker – register only */}
            {mode === 'register' && (
              <div className="auth-role-picker">
                <span className="form-label">I want to join as:</span>
                <div className="role-options-grid">
                  <button
                    type="button"
                    className={`role-option-card ${role === 'buyer' ? 'active' : ''}`}
                    onClick={() => setRole('buyer')}
                  >
                    <ShoppingBag size={20} color={role === 'buyer' ? 'var(--color-primary-700)' : 'var(--color-slate-500)'} />
                    <span className="role-title">Buyer / Vendor</span>
                    <span className="role-desc">Browse &amp; contact farmers</span>
                  </button>

                  <button
                    type="button"
                    className={`role-option-card ${role === 'seller' ? 'active' : ''}`}
                    onClick={() => setRole('seller')}
                  >
                    <Sprout size={20} color={role === 'seller' ? 'var(--color-primary-700)' : 'var(--color-slate-500)'} />
                    <span className="role-title">Farmer / Producer</span>
                    <span className="role-desc">Add &amp; publish harvest listings</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form-body">
              {/* Name – register only */}
              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-name">
                    {role === 'seller' ? 'Farm / Business Name' : 'Full Name'} *
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={role === 'seller' ? 'e.g. Ter Farms & Agro' : 'e.g. Kator Tersoo'}
                    className="form-input"
                  />
                </div>
              )}

              {/* Email / Phone */}
              <div className="form-group">
                <label className="form-label" htmlFor="auth-email">
                  {mode === 'login' ? 'Email or Phone Number' : 'Email Address'} *
                </label>
                <input
                  id="auth-email"
                  type="text"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={mode === 'login' ? 'e.g. 08031234567 or email@example.com' : 'e.g. email@example.com'}
                  className="form-input"
                />
              </div>

              {/* LGA – farmer register only */}
              {mode === 'register' && role === 'seller' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-lga">
                    Primary Benue LGA <span style={{ fontWeight: 'normal', color: 'var(--color-slate-500)', fontSize: '0.8rem' }}>(e.g. Ukum, Makurdi, Gboko)</span> *
                  </label>
                  <select
                    id="auth-lga"
                    value={formData.lga}
                    onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                    className="form-select"
                  >
                    <option value="" disabled hidden>-- Select Benue State LGA --</option>
                    {BENUE_LGAS.filter(l => l.id !== 'all').map((lga) => (
                      <option key={lga.id} value={lga.name.split(' ')[0]}>{lga.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Password */}
              <div className="form-group">
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label mb-0" htmlFor="auth-password">Password *</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--color-primary-700)',
                      padding: '2px 4px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: '600',
                      display: 'flex', alignItems: 'center', gap: '3px'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <><EyeOff size={13} /><span>Hide</span></> : <><Eye size={13} /><span>Show</span></>}
                  </button>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="form-input"
                    style={{ paddingRight: '42px', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px',
                      background: 'none', border: 'none',
                      color: 'var(--color-slate-500)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Forgot-password link – login mode only */}
                {mode === 'login' && (
                  <div style={{ marginTop: '7px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      style={{
                        background: 'none', border: 'none',
                        color: 'var(--color-primary-700)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '12.5px', fontWeight: '700',
                        cursor: 'pointer', padding: '2px 0',
                        textDecoration: 'underline', textDecorationColor: 'transparent',
                        transition: 'text-decoration-color 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--color-primary-700)'}
                      onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <div className="auth-form-submit-wrap">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  {mode === 'login' ? 'Sign In' : `Register as ${role === 'seller' ? 'Farmer / Producer' : 'Buyer / Vendor'}`}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}
