import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  onClose: () => void;
}

type Tab = 'signin' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [tab, setTab]               = useState<Tab>('signin');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const clearError = () => setError('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password);
      } else {
        if (!displayName.trim()) { setError('Please enter your name.'); setLoading(false); return; }
        await signUpWithEmail(email, password, displayName.trim());
      }
      onClose();
    } catch (err: any) {
      const msg = err?.code ?? err?.message ?? 'Something went wrong';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password.');
      } else if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Sign in instead.');
      } else if (msg.includes('weak-password')) {
        setError('Password must be at least 6 characters.');
      } else {
        setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*?\)\.?/, '').trim());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        id="auth-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal card */}
        <div
          id="auth-modal-card"
          className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Decorative glow */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,179,237,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(159,122,234,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div className="relative p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">🇩🇪</div>
              <h2 className="text-2xl font-bold text-white">German Vocab</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Sign in to sync your progress across devices
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-xl overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.07)' }}>
              {(['signin', 'signup'] as Tab[]).map((t) => (
                <button
                  key={t}
                  id={`auth-tab-${t}`}
                  onClick={() => { setTab(t); clearError(); }}
                  className="flex-1 py-2.5 text-sm font-semibold transition-all duration-200"
                  style={{
                    background: tab === t ? 'rgba(99,179,237,0.25)' : 'transparent',
                    color: tab === t ? '#63b3ed' : 'rgba(255,255,255,0.5)',
                    borderRadius: 10,
                  }}
                >
                  {t === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {/* Google button */}
            <button
              id="auth-google-btn"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all duration-200 mb-4"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              {/* Google SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {tab === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Your Name
                  </label>
                  <input
                    id="auth-name-input"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Max Müller"
                    required={tab === 'signup'}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'white',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,179,237,0.6)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Email
                </label>
                <input
                  id="auth-email-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,179,237,0.6)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Password
                </label>
                <input
                  id="auth-password-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,179,237,0.6)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(245,101,101,0.15)', color: '#fc8181', border: '1px solid rgba(245,101,101,0.25)' }}>
                  {error}
                </div>
              )}

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 mt-2"
                style={{
                  background: loading
                    ? 'rgba(99,179,237,0.4)'
                    : 'linear-gradient(135deg, #63b3ed 0%, #7c3aed 100%)',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(99,179,237,0.35)',
                }}
              >
                {loading ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Guest option */}
            <div className="text-center mt-4">
              <button
                id="auth-guest-btn"
                onClick={onClose}
                className="text-xs transition-all duration-200"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                Continue as guest (progress saved locally only)
              </button>
            </div>

            {/* Close X */}
            <button
              id="auth-close-btn"
              onClick={onClose}
              className="absolute top-4 right-4 text-xl transition-opacity"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthModal;
