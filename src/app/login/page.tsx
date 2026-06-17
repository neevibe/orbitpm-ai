'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

function isInternalEmail(email: string) {
  return email.trim().toLowerCase().endsWith('@bialairport.com');
}

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Sign-in state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siError, setSiError] = useState<string | null>(null);
  const [siLoading, setSiLoading] = useState(false);
  const [showSiPassword, setShowSiPassword] = useState(false);

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
    if (error) setSiError('Invalid email or password. Please try again.');
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

  const handleDemoLogin = async () => {
    setSiEmail('demo@xyrenis.com');
    setSiPassword('demopass123');
    setSiError(null);
    setSiLoading(true);
    const { error } = await signIn('demo@xyrenis.com', 'demopass123');
    if (error) setSiError(error);
    setSiLoading(false);
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
    <div className="min-h-screen flex" style={{ background: '#0f1623' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[500px] flex-shrink-0 px-16 py-12" style={{ background: 'linear-gradient(135deg, #0f1623 0%, #1a2638 100%)' }}>
        <div className="flex flex-col gap-8">
          <div className="flex items-start">
            <img src="/logo.svg?v=3" alt="Xyrenis Logo" className="h-20 w-auto object-contain" />
          </div>

          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#e86c2d' }}>Enterprise Platform</p>
            <h1 className="text-[42px] font-bold text-white leading-tight mb-4">
              Manage projects.<br />Manage them<br /><span style={{ color: '#e86c2d' }}>brilliantly.</span>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: '#a0b0c8' }}>
              Project governance, portfolio intelligence, AI copilot, and workforce planning — unified in one platform.
            </p>
          <div className="mt-10 flex flex-col gap-5">
            {[
              { icon: '◎', label: 'Portfolio Intelligence', desc: 'Real-time health across all programs' },
              { icon: '⬡', label: 'AI Copilot', desc: 'Proactive insights and risk detection' },
              { icon: '▦', label: 'Workforce Management', desc: 'Capacity planning and team analytics' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="text-[16px] mt-0.5" style={{ color: '#e86c2d' }}>{item.icon}</span>
                <div>
                  <p className="text-[13px] font-semibold text-white">{item.label}</p>
                  <p className="text-[12px]" style={{ color: '#8ca4c0' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px]" style={{ color: '#3a526a' }}>© 2026 Xyrenis. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/logo.svg?v=3" alt="Xyrenis" className="h-16 w-auto object-contain" />
          </div>

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
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px]" style={{ color: '#4a6280' }}>
                    First-time users: default password is Employee ID
                  </p>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setForgotSuccess(false); setForgotError(null); }}
                    className="text-[11.5px] font-semibold hover:underline cursor-pointer"
                    style={{ color: '#e86c2d' }}
                  >
                    Forgot password?
                  </button>
                </div>
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
