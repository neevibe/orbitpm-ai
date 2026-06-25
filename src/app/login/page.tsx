'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DEMO_SESSION_KEY } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

function isInternalEmail(email: string) {
  return email.trim().toLowerCase().endsWith('@bialairport.com');
}

// localStorage key for the "Remember me" email convenience feature. Stores ONLY
// the email address (never the password) so returning users don't retype it.
const REMEMBER_EMAIL_KEY = 'xyrenis_remember_email';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Sign-in state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siError, setSiError] = useState<string | null>(null);
  const [siLoading, setSiLoading] = useState(false);
  const [showSiPassword, setShowSiPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Prefill the email of a returning user (and tick "Remember me" since it was on).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        setSiEmail(saved);
        setRememberMe(true);
      }
    } catch { /* localStorage unavailable — ignore */ }
  }, []);

  // Sign-up state
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirmPassword, setSuConfirmPassword] = useState('');
  const [suError, setSuError] = useState<string | null>(null);
  const [suSuccess, setSuSuccess] = useState(false);
  const [suLoading, setSuLoading] = useState(false);
  const [showSuPassword, setShowSuPassword] = useState(false);
  const [showSuConfirmPassword, setShowSuConfirmPassword] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiError(null);
    setSiLoading(true);
    const { error } = await signIn(siEmail.trim(), siPassword);
    if (error) {
      setSiError('Invalid email or password. Please try again.');
    } else {
      // Remember (or forget) the email for next time — password is never stored.
      try {
        if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, siEmail.trim());
        else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch { /* ignore */ }
    }
    setSiLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuError(null);
    setSuSuccess(false);

    if (suPassword !== suConfirmPassword) {
      setSuError('Passwords do not match');
      return;
    }

    setSuLoading(true);
    const { error } = await signUp(suEmail.trim(), suPassword);
    if (error) {
      setSuError(error);
    } else {
      setSuSuccess(true);
    }
    setSuLoading(false);
  };

  const handleDemoLogin = () => {
    // Demo mode bypasses Supabase entirely — no real credentials needed.
    // A flag in sessionStorage activates masked fake data throughout the app.
    sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
    router.replace('/command-center');
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(false);
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/change-password`,
    });
    if (error) {
      setForgotError(error.message);
    } else {
      setForgotSuccess(true);
    }
    setForgotLoading(false);
  };

  const inputStyle = {
    background: '#1a2535',
    border: '1px solid #2a3a50',
    color: 'white',
  };

  // Sign-up email detection banner
  const suEmailTrimmed = suEmail.trim();
  const showSuBanner = tab === 'signup' && suEmailTrimmed.length > 0;
  const isBialEmail = isInternalEmail(suEmailTrimmed);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#050816' }}>
      {/* ── Animated background (matches hero) ── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover scale-110" style={{ opacity: 0.3 }}>
          <source src="/logo-reveal.mp4" type="video/mp4" />
        </video>
        {/* gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(5,8,22,0.88) 0%, rgba(11,17,32,0.72) 55%, rgba(37,99,235,0.15) 100%)' }} />
        {/* grid */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
        {/* ambient glows */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #2563EB, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-15" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      </div>

      <style>{`
        @keyframes slideInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .form-anim { animation: slideInUp 0.7s cubic-bezier(.22,1,.36,1) 0.1s both; }
      `}</style>

      {/* ── Centred glass card ── */}
      <div className="relative z-10 w-full max-w-[440px] mx-4 form-anim">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo-full-white.png" alt="Xyrenis" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        </div>

        <div
          className="rounded-2xl border border-white/10 p-8 backdrop-blur-xl"
          style={{ background: 'rgba(11,17,32,0.80)' }}
        >

          <h2 className="text-2xl font-bold text-white mb-1">
            {tab === 'forgot' ? 'Reset password' : tab === 'signup' ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="text-[13px] mb-6" style={{ color: '#8ca4c0' }}>
            {tab === 'forgot'
              ? 'Enter your email to reset your password'
              : tab === 'signup'
              ? 'Request access to your workspace'
              : 'Sign in to your workspace'}
          </p>

          {/* Tab switcher (Sign In / Sign Up) */}
          {tab !== 'forgot' && (
            <div className="flex rounded-lg overflow-hidden mb-6" style={{ background: '#131e2e', border: '1px solid #1e2e40' }}>
              <button
                type="button"
                onClick={() => setTab('signin')}
                className="flex-1 py-2 text-[12px] font-semibold transition-all cursor-pointer"
                style={{
                  background: tab === 'signin' ? '#e86c2d' : 'transparent',
                  color: tab === 'signin' ? 'white' : '#8ca4c0',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setTab('signup')}
                className="flex-1 py-2 text-[12px] font-semibold transition-all cursor-pointer"
                style={{
                  background: tab === 'signup' ? '#e86c2d' : 'transparent',
                  color: tab === 'signup' ? 'white' : '#8ca4c0',
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Sign In Form */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8ca4c0' }}>Email address</label>
                <input
                  type="email"
                  value={siEmail}
                  onChange={e => setSiEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#e86c2d')}
                  onBlur={e => (e.target.style.borderColor = '#2a3a50')}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8ca4c0' }}>Password</label>
                <div className="relative">
                  <input
                    type={showSiPassword ? "text" : "password"}
                    value={siPassword}
                    onChange={e => setSiPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg text-[13px] outline-none transition-all"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#e86c2d')}
                    onBlur={e => (e.target.style.borderColor = '#2a3a50')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSiPassword(!showSiPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8ca4c0] hover:text-white transition-colors cursor-pointer"
                  >
                    {showSiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded cursor-pointer accent-[#e86c2d]"
                    />
                    <span className="text-[11.5px] font-medium" style={{ color: '#8ca4c0' }}>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setForgotSuccess(false); setForgotError(null); }}
                    className="text-[11.5px] font-semibold hover:underline cursor-pointer"
                    style={{ color: '#e86c2d' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: '#4a6280' }}>
                  First-time users: default password is Employee ID
                </p>
              </div>
              {siError && (
                <div className="px-3.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ background: '#3a1a1a', color: '#f87171', border: '1px solid #5a2a2a' }}>
                  {siError}
                </div>
              )}
              <button
                type="submit"
                disabled={siLoading}
                className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all mt-1 cursor-pointer"
                style={{ background: siLoading ? '#a04d1e' : '#e86c2d', cursor: siLoading ? 'not-allowed' : 'pointer' }}
              >
                {siLoading ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={siLoading}
                className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-[#8ca4c0] border border-[#2a3a50] hover:border-[#e86c2d] hover:text-white hover:bg-[#131e2e] transition-all mt-1 flex items-center justify-center gap-2 cursor-pointer"
              >
                ✦ Try Live Demo Account
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8ca4c0' }}>Work Email</label>
                <input
                  type="email"
                  value={suEmail}
                  onChange={e => setSuEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#e86c2d')}
                  onBlur={e => (e.target.style.borderColor = '#2a3a50')}
                />
                {/* User-type detection banner */}
                {showSuBanner && (
                  isBialEmail ? (
                    <div
                      className="mt-2 px-3 py-2 rounded-md text-[11.5px] font-medium flex items-center gap-1.5"
                      style={{ background: '#0d2137', color: '#60a5fa', border: '1px solid #1e3a5f' }}
                    >
                      ✓ Internal BIAL user — View access granted automatically
                    </div>
                  ) : (
                    <div
                      className="mt-2 px-3 py-2 rounded-md text-[11.5px] font-medium flex items-center gap-1.5"
                      style={{ background: '#1f1508', color: '#fbbf24', border: '1px solid #3d2a00' }}
                    >
                      External user — access pending admin approval
                    </div>
                  )
                )}
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8ca4c0' }}>Password</label>
                <div className="relative">
                  <input
                    type={showSuPassword ? "text" : "password"}
                    value={suPassword}
                    onChange={e => setSuPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg text-[13px] outline-none transition-all"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#e86c2d')}
                    onBlur={e => (e.target.style.borderColor = '#2a3a50')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSuPassword(!showSuPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8ca4c0] hover:text-white transition-colors cursor-pointer"
                  >
                    {showSuPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8ca4c0' }}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showSuConfirmPassword ? "text" : "password"}
                    value={suConfirmPassword}
                    onChange={e => setSuConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg text-[13px] outline-none transition-all"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#e86c2d')}
                    onBlur={e => (e.target.style.borderColor = '#2a3a50')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSuConfirmPassword(!showSuConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8ca4c0] hover:text-white transition-colors cursor-pointer"
                  >
                    {showSuConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {suError && (
                <div className="px-3.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ background: '#3a1a1a', color: '#f87171', border: '1px solid #5a2a2a' }}>
                  {suError}
                </div>
              )}
              {suSuccess && (
                <div className="px-3.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ background: '#0f2a1a', color: '#34d399', border: '1px solid #1a5a30' }}>
                  Account created! Check your email to confirm your address.
                </div>
              )}
              <button
                type="submit"
                disabled={suLoading}
                className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all mt-1 cursor-pointer"
                style={{ background: suLoading ? '#a04d1e' : '#e86c2d', cursor: suLoading ? 'not-allowed' : 'pointer' }}
              >
                {suLoading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgot} className="flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8ca4c0' }}>Work Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#e86c2d')}
                  onBlur={e => (e.target.style.borderColor = '#2a3a50')}
                />
              </div>
              {forgotError && (
                <div className="px-3.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ background: '#3a1a1a', color: '#f87171', border: '1px solid #5a2a2a' }}>
                  {forgotError}
                </div>
              )}
              {forgotSuccess && (
                <div className="px-3.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ background: '#0f2a1a', color: '#34d399', border: '1px solid #1a5a30' }}>
                  Reset password email sent! Please check your inbox.
                </div>
              )}
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all mt-1 cursor-pointer"
                style={{ background: forgotLoading ? '#a04d1e' : '#e86c2d', cursor: forgotLoading ? 'not-allowed' : 'pointer' }}
              >
                {forgotLoading ? 'Sending link…' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setTab('signin'); setForgotSuccess(false); setForgotError(null); }}
                className="w-full py-2 rounded-lg text-[12px] font-semibold text-[#8ca4c0] hover:text-white transition-colors text-center cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </form>
          )}

          <div className="mt-8 pt-5 border-t" style={{ borderColor: '#1e2e40' }}>
            <p className="text-center text-[11px]" style={{ color: '#3a526a' }}>
              Having trouble? Contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
