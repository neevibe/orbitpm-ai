'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [tab, setTab] = useState<'signin' | 'forgot'>('signin');

  // Sign-in state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siError, setSiError] = useState<string | null>(null);
  const [siLoading, setSiLoading] = useState(false);
  const [showSiPassword, setShowSiPassword] = useState(false);

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

  return (
    <div className="min-h-screen flex" style={{ background: '#0f1623' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[460px] flex-shrink-0 p-12" style={{ background: '#131e2e' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#e86c2d' }}>
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight">Xyrenis</span>
          </div>
        </div>

        <div>
          <p className="text-[12px] font-semibold mb-5 tracking-widest" style={{ color: '#e86c2d' }}>ENTERPRISE WORK OS</p>
          <h1 className="text-[36px] font-bold text-white leading-tight mb-5">
            One platform.<br />Every project.<br />Total clarity.
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: '#8ca4c0' }}>
            AI-powered project governance, portfolio intelligence, workforce management, and knowledge collaboration — built for modern enterprise scale.
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e86c2d' }}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </div>
            <span className="text-white font-bold text-base">Xyrenis</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {tab === 'forgot' ? 'Reset password' : 'Welcome back'}
          </h2>
          <p className="text-[13px] mb-6" style={{ color: '#8ca4c0' }}>
            {tab === 'forgot' ? 'Enter your email to reset your password' : 'Sign in to your workspace'}
          </p>

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
