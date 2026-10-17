import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import Button from '../components/common/Button.jsx';
import { updateUserPassword } from '../services/authService.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { clearLoginLockout } from '../utils/authRateLimiter.js';

/**
 * ResetPasswordPage
 *
 * Rendered when the user arrives via the Supabase password-reset email link.
 * Supabase's client (`detectSessionInUrl: true`) automatically exchanges the
 * token in the URL hash for an active session before this component mounts,
 * so we just call updateUser({ password }) directly.
 */
export default function ResetPasswordPage({ onNavigate = () => {} }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // ── Confirm there is an active recovery session ──────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured() || !supabase) {
        // Offline / demo: allow proceeding
        setSessionReady(true);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSessionReady(true);
        } else {
          setSessionError(
            'This password-reset link is invalid or has expired. ' +
            'Please request a new one from the Sign In page.'
          );
        }
      } catch {
        setSessionError('Unable to verify your reset session. Please try again.');
      }
    };

    // Small delay so Supabase has time to exchange the URL token
    const timer = setTimeout(checkSession, 600);
    return () => clearTimeout(timer);
  }, []);

  // ── Strength indicator ────────────────────────────────────────────────────
  const getStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: 'Weak',   color: '#ef4444' };
    if (score <= 2) return { level: 2, label: 'Fair',   color: '#f59e0b' };
    if (score <= 3) return { level: 3, label: 'Good',   color: '#3b82f6' };
    return            { level: 4, label: 'Strong', color: '#10b981' };
  };

  const strength = getStrength(password);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await updateUserPassword(password);
    setLoading(false);

    if (updateError) {
      setError(updateError);
    } else {
      clearLoginLockout();
      setSuccess(true);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 40%, #eff6ff 100%)',
        padding: '24px 16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-surface, #fff)',
          borderRadius: '16px',
          border: '1px solid var(--border-default, #e2e8f0)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
          overflow: 'hidden'
        }}
      >
        {/* Header strip */}
        <div
          style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            padding: '24px 28px 22px',
            textAlign: 'center'
          }}
        >
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <KeyRound size={24} color="#fff" />
          </div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
            {success ? 'Password Updated!' : 'Set New Password'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
            Benue Fresh Basket Marketplace
          </p>
        </div>

        <div style={{ padding: '28px' }}>

          {/* ── Session error ── */}
          {sessionError && !sessionReady && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '14px 16px', marginBottom: '20px',
                backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '10px', color: '#991b1b'
              }}>
                <AlertCircle size={20} style={{ flexShrink: 0, color: '#dc2626', marginTop: '1px' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Link Invalid or Expired</strong>
                  <span style={{ fontSize: '13px', lineHeight: '1.5' }}>{sessionError}</span>
                </div>
              </div>
              <Button variant="primary" fullWidth onClick={() => onNavigate('home')} icon={ArrowRight}>
                Return to Marketplace
              </Button>
            </div>
          )}

          {/* ── Loading session ── */}
          {!sessionReady && !sessionError && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Loader2 size={30} className="animate-spin" style={{ color: 'var(--color-primary-700)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--color-slate-500)', fontSize: '14px', margin: 0 }}>
                Verifying your reset link…
              </p>
            </div>
          )}

          {/* ── Success state ── */}
          {success && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px'
              }}>
                <CheckCircle2 size={32} color="#059669" />
              </div>
              <h2 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: '800', color: 'var(--color-slate-900)' }}>
                Password Changed Successfully
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--color-slate-600)', lineHeight: '1.55' }}>
                Your account password has been updated. You can now sign in with your new password.
              </p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: '8px',
                backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
                fontSize: '12.5px', color: '#166534', marginBottom: '20px'
              }}>
                <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                <span>Your account is now secured with your new password.</span>
              </div>
              <Button
                variant="primary"
                fullWidth
                size="lg"
                icon={ArrowRight}
                onClick={() => onNavigate('home')}
              >
                Go to Marketplace &amp; Sign In
              </Button>
            </div>
          )}

          {/* ── Reset form ── */}
          {sessionReady && !success && (
            <>
              <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: 'var(--color-slate-600)', lineHeight: '1.55' }}>
                Choose a strong new password for your Benue Market account. It must be at least <strong>6 characters</strong> long.
              </p>

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px', marginBottom: '16px',
                  backgroundColor: '#fee2e2', color: '#b91c1c',
                  borderRadius: '6px', fontSize: '13px', fontWeight: '600'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* New password */}
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label mb-0" htmlFor="rp-password">New Password *</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-primary-700)', fontSize: '12px',
                        fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px'
                      }}
                    >
                      {showPassword ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="rp-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="form-input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--color-slate-400)',
                        cursor: 'pointer', display: 'flex'
                      }}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{
                            flex: 1, height: '4px', borderRadius: '2px',
                            backgroundColor: strength.level >= i ? strength.color : '#e2e8f0',
                            transition: 'background-color 0.25s ease'
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', color: strength.color }}>
                        {strength.label}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--color-slate-400)', marginLeft: '6px' }}>
                        — use uppercase, numbers &amp; symbols for a stronger password
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="form-group" style={{ marginTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label mb-0" htmlFor="rp-confirm">Confirm New Password *</label>
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-primary-700)', fontSize: '12px',
                        fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px'
                      }}
                    >
                      {showConfirm ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="rp-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="form-input"
                      style={{
                        paddingRight: '42px',
                        borderColor: confirmPassword && confirmPassword !== password ? '#ef4444' :
                                     confirmPassword && confirmPassword === password ? '#10b981' : undefined,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--color-slate-400)',
                        cursor: 'pointer', display: 'flex'
                      }}
                    >
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
                      Passwords do not match
                    </p>
                  )}
                  {confirmPassword && confirmPassword === password && (
                    <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Passwords match
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '22px' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    icon={loading ? Loader2 : ShieldCheck}
                  >
                    {loading ? 'Updating Password…' : 'Update Password'}
                  </Button>
                </div>
              </form>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--color-slate-500)', fontSize: '12.5px',
                    cursor: 'pointer', fontFamily: 'var(--font-body)'
                  }}
                >
                  Cancel — Return to Marketplace
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
