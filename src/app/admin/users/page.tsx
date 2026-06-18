'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldAlert, Search, Check, Loader2, UserCog, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAccessToken } from '@/lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  employee_code: string;
  full_name: string;
  department: string | null;
  role: string;
  permission: string;
  userType: string;
  account_status: string;
  last_sign_in_at: string | null;
}

const DEPARTMENTS = [
  'Operations', 'Digital & Data', 'Duty Free', 'Commercial Development',
  'BASL', 'Advertising & Marketing', 'CBB', 'CCO',
];
const ROLES = [
  { value: 'user', label: 'User (own department)' },
  { value: 'cco', label: 'CCO (super admin)' },
  { value: 'admin', label: 'Admin (super admin)' },
];
const PERMISSIONS = [
  { value: 'view', label: 'View — read only' },
  { value: 'edit', label: 'Edit — edit own dept' },
  { value: 'modify', label: 'Modify — add/edit/archive own dept' },
  { value: 'admin', label: 'Admin — full access' },
];
const PERM_COLOR: Record<string, string> = {
  view: '#16a34a', edit: '#3b82f6', modify: '#d97706', admin: '#dc2626',
};

export default function UserManagementPage() {
  const { isSuperAdmin, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const authedFetch = useCallback(async (init?: RequestInit) => {
    const token = await getAccessToken();
    return fetch('/api/admin/users', {
      ...init,
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
    });
  }, []);

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await authedFetch();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load users');
      setUsers(json.users);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    if (!loading && isSuperAdmin) load();
  }, [loading, isSuperAdmin, load]);

  const updateUser = async (id: string, patch: { department?: string | null; role?: string; permission?: string; account_status?: string }) => {
    setSavingId(id);
    setError(null);
    // optimistic
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...patch } as AdminUser : u)));
    try {
      const res = await authedFetch({ method: 'PATCH', body: JSON.stringify({ userId: id, ...patch }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      setSavedId(id);
      setTimeout(() => setSavedId(s => (s === id ? null : s)), 1500);
    } catch (e: any) {
      setError(e.message);
      load(); // revert to server truth
    } finally {
      setSavingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.employee_code.includes(q) ||
      (u.userType || '').toLowerCase().includes(q) ||
      (u.permission || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q));
  }, [users, search]);

  /* ---- access gate ---- */
  if (loading) return null;
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-[18px] font-bold text-[#0f172a]">Access restricted</h1>
        <p className="text-[13px] text-[#64748b] mt-1 max-w-sm">User management is available to CCO and admin accounts only.</p>
      </div>
    );
  }

  const counts = {
    total: users.length,
    admins: users.filter(u => u.permission === 'admin' || ['cco', 'admin', 'super_admin'].includes(u.role)).length,
    external: users.filter(u => u.userType === 'external').length,
    unassigned: users.filter(u => u.permission === 'view').length,
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fdf0e8] flex items-center justify-center">
            <UserCog className="w-5 h-5 text-[#e86c2d]" />
          </div>
          <div>
            <h1 className="text-[20px] font-extrabold text-[#0f172a] tracking-tight">User Management</h1>
            <p className="text-[13px] text-[#64748b]">Assign departments and roles. Changes take effect on the user&apos;s next page load.</p>
          </div>
        </div>
        <button onClick={load} disabled={fetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-[#475569] bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] transition-all disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* stat chips */}
      <div className="flex items-center gap-3 flex-wrap">
        {[['Total users', counts.total, '#0f172a'], ['Super admins', counts.admins, '#e86c2d'], ['External users', counts.external, '#b45309'], ['View-only', counts.unassigned, '#16a34a']].map(([l, n, c]) => (
          <div key={l as string} className="px-4 py-2.5 rounded-xl bg-white border border-[#eef2f7]">
            <span className="text-[18px] font-extrabold mr-2" style={{ color: c as string }}>{n as number}</span>
            <span className="text-[12px] text-[#64748b] font-medium">{l}</span>
          </div>
        ))}
      </div>

      {/* search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, code, department…"
          className="w-full bg-white border border-[#e2e8f0] rounded-lg py-2.5 pl-9 pr-3 text-[13px] text-[#1e293b] outline-none focus:border-[#e86c2d] transition-colors" />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-[12.5px] text-red-600 font-medium">{error}</div>
      )}

      {/* table */}
      <div className="rounded-2xl overflow-hidden bg-white border border-[#eef2f7]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Employee', 'Type', 'Code', 'Department', 'Permission', 'Role', ''].map(h => (
                  <th key={h} className="text-left text-[10.5px] font-bold uppercase tracking-wider text-[#94a3b8] px-4 py-3 border-b border-[#eef2f7] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td colSpan={7} className="py-16 text-center text-[#94a3b8]"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filtered.map(u => {
                const isAdminRole = ['cco', 'admin', 'super_admin'].includes(u.role);
                return (
                  <tr key={u.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-4 py-3 border-b border-[#f1f5f9]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: isAdminRole ? '#e86c2d' : 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                          {(u.full_name || u.email).slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#1e293b] leading-tight">{u.full_name || '—'}</p>
                          <p className="text-[11px] text-[#94a3b8]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-[#f1f5f9]">
                      {u.userType === 'external' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold" style={{ background: '#fef3c7', color: '#b45309' }}>External</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold" style={{ background: '#dbeafe', color: '#1d4ed8' }}>Internal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-[#f1f5f9] text-[12px] font-mono text-[#64748b]">{u.employee_code || '—'}</td>
                    <td className="px-4 py-3 border-b border-[#f1f5f9]">
                      <select
                        value={u.department || ''}
                        onChange={e => updateUser(u.id, { department: e.target.value || null })}
                        disabled={savingId === u.id}
                        className="bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-[12.5px] text-[#1e293b] outline-none focus:border-[#e86c2d] disabled:opacity-50 min-w-[170px]"
                      >
                        <option value="">— None (view-only) —</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 border-b border-[#f1f5f9]">
                      <select
                        value={u.permission || 'view'}
                        onChange={e => updateUser(u.id, { permission: e.target.value })}
                        disabled={savingId === u.id}
                        className="bg-white border rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold outline-none focus:border-[#e86c2d] disabled:opacity-50 min-w-[150px]"
                        style={{ color: PERM_COLOR[u.permission] || '#1e293b', borderColor: '#e2e8f0' }}
                      >
                        {PERMISSIONS.map(p => <option key={p.value} value={p.value} style={{ color: '#1e293b' }}>{p.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 border-b border-[#f1f5f9]">
                      <select
                        value={u.role}
                        onChange={e => updateUser(u.id, { role: e.target.value })}
                        disabled={savingId === u.id}
                        className="bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-[12.5px] text-[#1e293b] outline-none focus:border-[#e86c2d] disabled:opacity-50"
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 border-b border-[#f1f5f9] w-10">
                      {savingId === u.id ? <Loader2 className="w-4 h-4 animate-spin text-[#94a3b8]" />
                        : savedId === u.id ? <Check className="w-4 h-4 text-emerald-500" /> : null}
                    </td>
                  </tr>
                );
              })}
              {!fetching && filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-[13px] text-[#94a3b8]">No users match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11.5px] text-[#94a3b8]">
        Super admins (CCO / Admin) can add &amp; edit projects in every department. Users can modify only their assigned department and read all others.
      </p>
    </div>
  );
}
