'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

const rules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const allRulesPassed = rules.every(r => r.test(newPassword));
  const passwordsMatch = newPassword === confirm && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!allRulesPassed) { setError('Password does not meet all requirements.'); return; }
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.replace('/command-center');
  };

  const fullName = user?.user_metadata?.full_name ?? user?.email ?? 'User';

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0f1623' }}>
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <img src="/logo.svg?v=2" alt="Xyrenis" className="h-10 w-auto object-contain" />
        </div>

        {/* Welcome banner */}
        <div className="mb-6 px-4 py-3.5 rounded-xl" style={{ background: '#1a2535', border: '1px solid #2a3a50' }}>
          <p className="text-[13px] font-semibold text-white mb-0.5">Welcome, {fullName}! 👋</p>
          <p className="text-[12px]" style={{ color: '#8ca4c0' }}>
            Please set a new personal password to secure your account.
          </p>
        </div>

        <h2 className="text-xl font-bold text-white mb-1">Set your password</h2>
        <p className="text-[13px] mb-6" style={{ color: '#8ca4c0' }}>Choose a strong password you&apos;ll remember.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8ca4c0' }}>New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg text-[13px] outline-none transition-all"
                style={{ background: '#1a2535', border: '1px solid #2a3a50', color: 'white' }}
                onFocus={e => (e.target.style.borderColor = '#e86c2d')}
                onBlur={e => (e.target.style.borderColor = '#2a3a50')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8ca4c0] hover:text-white transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength rules */}
            {newPassword.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {rules.map(r => (
                  <div key={r.label} className="flex items-center gap-1.5">
                    <span style={{ color: r.test(newPassword) ? '#34d399' : '#4a6280', fontSize: 11 }}>
                      {r.test(newPassword) ? '✓' : '○'}
                    </span>
                    <span className="text-[11px]" style={{ color: r.test(newPassword) ? '#34d399' : '#4a6280' }}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#8ca4c0' }}>Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg text-[13px] outline-none transition-all"
                style={{
                  background: '#1a2535',
                  border: `1px solid ${confirm.length > 0 ? (passwordsMatch ? '#34d399' : '#ef4444') : '#2a3a50'}`,
                  color: 'white',
                }}
                onFocus={e => (e.target.style.borderColor = '#e86c2d')}
                onBlur={e => (e.target.style.borderColor = confirm.length > 0 ? (passwordsMatch ? '#34d399' : '#ef4444') : '#2a3a50')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8ca4c0] hover:text-white transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirm.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-[11px]" style={{ color: '#f87171' }}>Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="px-3.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ background: '#3a1a1a', color: '#f87171', border: '1px solid #5a2a2a' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !allRulesPassed || !passwordsMatch}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all mt-1 cursor-pointer"
            style={{
              background: (!allRulesPassed || !passwordsMatch) ? '#2a3a50' : loading ? '#a04d1e' : '#e86c2d',
              cursor: (!allRulesPassed || !passwordsMatch || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Saving…' : 'Set password & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
