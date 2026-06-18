'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert, Search, Loader2, RefreshCw, Download, Activity,
  Users, UserCheck, LogIn, ShieldX, KeyRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAccessToken, signOutAndRelogin } from '@/lib/supabase';

interface AuditRow {
  id: string;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
  actor_department: string | null;
  action: string;
  module: string | null;
  status: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  previous_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  user_agent: string | null;
}

interface Widgets {
  totalUsers: number;
  activeUsers: number;
  dailyActiveUsers: number;
  failedLogins: number;
  permissionChanges: number;
  totalEvents7d: number;
  mostActive: { email: string; name: string; count: number }[];
  trend: { date: string; count: number }[];
}

const ACTIONS = [
  'auth.login', 'auth.logout', 'auth.login_failed', 'auth.register', 'auth.activate',
  'user.permission_change', 'user.role_change', 'user.department_change', 'user.update',
  'project.create', 'project.update', 'project.archive', 'risk.create', 'risk.update', 'profile.update',
];
const MODULES = ['auth', 'users', 'projects', 'risks', 'profile'];
const DEPARTMENTS = [
  'Operations', 'Digital & Data', 'Duty Free', 'Commercial Development',
  'BASL', 'Advertising & Marketing', 'CBB', 'CCO',
];

const ACTION_COLOR: Record<string, string> = {
  'auth.login': '#16a34a', 'auth.logout': '#64748b', 'auth.login_failed': '#dc2626',
  'auth.register': '#7c3aed', 'auth.activate': '#7c3aed',
  'user.permission_change': '#e86c2d', 'user.role_change': '#e86c2d', 'user.department_change': '#d97706',
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleString();
}

export default function AuditDashboardPage() {
  const { isSuperAdmin, loading } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [widgets, setWidgets] = useState<Widgets | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [module, setModule] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  const authedFetch = useCallback(async (qs: string) => {
    const token = await getAccessToken();
    return fetch(`/api/audit${qs}`, { headers: { Authorization: `Bearer ${token ?? ''}` } });
  }, []);

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (module) params.set('module', module);
      if (department) params.set('department', department);
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await authedFetch(`?${params.toString()}`);
      if (res.status === 401) { await signOutAndRelogin(); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load audit log');
      setRows(json.rows || []);
      setWidgets(json.widgets || null);
      setTableReady(json.tableReady !== false);
      setNote(json.note || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  }, [authedFetch, action, module, department, status, search]);

  useEffect(() => {
    if (!loading && isSuperAdmin) load();
  }, [loading, isSuperAdmin, load]);

  const exportCsv = () => {
    const header = ['Time', 'Actor', 'Email', 'Department', 'Action', 'Module', 'Status', 'Entity', 'IP'];
    const lines = rows.map(r => [
      r.created_at, r.actor_name || '', r.actor_email || '', r.actor_department || '',
      r.action, r.module || '', r.status, r.entity_name || '', r.ip_address || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xyrenis-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxTrend = useMemo(() => Math.max(1, ...(widgets?.trend.map(t => t.count) || [1])), [widgets]);

  /* ---- access gate ---- */
  if (loading) return null;
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-[18px] font-bold text-[#0f172a]">Access restricted</h1>
        <p className="text-[13px] text-[#64748b] mt-1 max-w-sm">The audit trail is available to CCO and admin accounts only.</p>
      </div>
    );
  }

  const stat = (icon: React.ReactNode, label: string, value: number | string, color: string) => (
    <div className="px-4 py-3 rounded-xl bg-white border border-[#eef2f7] flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}14`, color }}>{icon}</div>
      <div>
        <p className="text-[20px] font-extrabold leading-none" style={{ color: '#0f172a' }}>{value}</p>
        <p className="text-[11px] text-[#64748b] font-medium mt-1">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1180px] mx-auto space-y-5">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fdf0e8] flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#e86c2d]" />
          </div>
          <div>
            <h1 className="text-[20px] font-extrabold text-[#0f172a] tracking-tight">Audit &amp; Activity Monitor</h1>
            <p className="text-[13px] text-[#64748b]">Every privileged action across the platform — for governance, security &amp; compliance.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} disabled={!rows.length}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-[#475569] bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] transition-all disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={load} disabled={fetching}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-[#475569] bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {!tableReady && (
        <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-[12.5px] text-amber-700">
          <strong>Audit table not found.</strong> Run <code className="font-mono">supabase/migrations/0002_audit_log.sql</code> in the Supabase SQL editor to start capturing activity. {note}
        </div>
      )}

      {/* widgets */}
      {widgets && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stat(<Users className="w-[18px] h-[18px]" />, 'Total users', widgets.totalUsers, '#6366f1')}
          {stat(<UserCheck className="w-[18px] h-[18px]" />, 'Active users', widgets.activeUsers, '#16a34a')}
          {stat(<LogIn className="w-[18px] h-[18px]" />, 'Daily active (24h)', widgets.dailyActiveUsers, '#3b82f6')}
          {stat(<ShieldX className="w-[18px] h-[18px]" />, 'Failed logins (7d)', widgets.failedLogins, '#dc2626')}
          {stat(<KeyRound className="w-[18px] h-[18px]" />, 'Permission changes (7d)', widgets.permissionChanges, '#e86c2d')}
          {stat(<Activity className="w-[18px] h-[18px]" />, 'Events (7d)', widgets.totalEvents7d, '#0ea5e9')}
        </div>
      )}

      {/* trend + most active */}
      {widgets && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl bg-white border border-[#eef2f7] p-4">
            <p className="text-[12px] font-bold text-[#475569] uppercase tracking-wider mb-3">Activity — last 14 days</p>
            <div className="flex items-end gap-1.5 h-[120px]">
              {widgets.trend.map(t => (
                <div key={t.date} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div className="w-full rounded-t" style={{ height: `${(t.count / maxTrend) * 100}%`, minHeight: t.count ? 3 : 0, background: '#e86c2d' }} />
                  <div className="absolute -top-6 hidden group-hover:block bg-[#0f172a] text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">{t.count} · {t.date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-[#eef2f7] p-4">
            <p className="text-[12px] font-bold text-[#475569] uppercase tracking-wider mb-3">Most active (7d)</p>
            <div className="space-y-2">
              {widgets.mostActive.length === 0 && <p className="text-[12px] text-[#94a3b8]">No activity yet.</p>}
              {widgets.mostActive.map(u => (
                <div key={u.email} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    {(u.name || u.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#1e293b] truncate">{u.name}</p>
                    <p className="text-[10.5px] text-[#94a3b8] truncate">{u.email}</p>
                  </div>
                  <span className="text-[12px] font-bold text-[#e86c2d]">{u.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search actor, email, entity, IP… (press Enter)"
            className="w-full bg-white border border-[#e2e8f0] rounded-lg py-2 pl-9 pr-3 text-[13px] text-[#1e293b] outline-none focus:border-[#e86c2d]" />
        </div>
        {[
          { v: action, set: setAction, opts: ACTIONS, ph: 'All actions' },
          { v: module, set: setModule, opts: MODULES, ph: 'All modules' },
          { v: department, set: setDepartment, opts: DEPARTMENTS, ph: 'All departments' },
          { v: status, set: setStatus, opts: ['success', 'failure'], ph: 'Any status' },
        ].map((f, i) => (
          <select key={i} value={f.v} onChange={e => f.set(e.target.value)}
            className="bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-2 text-[12.5px] text-[#1e293b] outline-none focus:border-[#e86c2d]">
            <option value="">{f.ph}</option>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <button onClick={load} className="px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-[#e86c2d] hover:bg-[#d35f24] transition-all">Apply</button>
      </div>

      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-[12.5px] text-red-600 font-medium">{error}</div>}

      {/* table */}
      <div className="rounded-2xl overflow-hidden bg-white border border-[#eef2f7]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['When', 'Actor', 'Action', 'Module', 'Entity', 'Change', 'Status', 'IP'].map(h => (
                  <th key={h} className="text-left text-[10.5px] font-bold uppercase tracking-wider text-[#94a3b8] px-4 py-3 border-b border-[#eef2f7] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td colSpan={8} className="py-16 text-center text-[#94a3b8]"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="hover:bg-[#f8fafc] transition-colors align-top">
                  <td className="px-4 py-3 border-b border-[#f1f5f9] text-[12px] text-[#64748b] whitespace-nowrap" title={new Date(r.created_at).toLocaleString()}>{timeAgo(r.created_at)}</td>
                  <td className="px-4 py-3 border-b border-[#f1f5f9]">
                    <p className="text-[12.5px] font-semibold text-[#1e293b] leading-tight">{r.actor_name || r.actor_email || 'System'}</p>
                    {r.actor_email && <p className="text-[10.5px] text-[#94a3b8]">{r.actor_email}{r.actor_department ? ` · ${r.actor_department}` : ''}</p>}
                  </td>
                  <td className="px-4 py-3 border-b border-[#f1f5f9] whitespace-nowrap">
                    <span className="text-[11.5px] font-bold font-mono" style={{ color: ACTION_COLOR[r.action] || '#475569' }}>{r.action}</span>
                  </td>
                  <td className="px-4 py-3 border-b border-[#f1f5f9] text-[12px] text-[#64748b]">{r.module || '—'}</td>
                  <td className="px-4 py-3 border-b border-[#f1f5f9] text-[12px] text-[#1e293b] max-w-[160px] truncate" title={r.entity_name || ''}>{r.entity_name || '—'}</td>
                  <td className="px-4 py-3 border-b border-[#f1f5f9] text-[11px] text-[#64748b] max-w-[220px]">
                    {r.new_value ? <code className="font-mono break-all">{JSON.stringify(r.new_value)}</code> : '—'}
                  </td>
                  <td className="px-4 py-3 border-b border-[#f1f5f9]">
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold" style={r.status === 'failure' ? { background: '#fef2f2', color: '#dc2626' } : { background: '#f0fdf4', color: '#16a34a' }}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 border-b border-[#f1f5f9] text-[11px] font-mono text-[#94a3b8]">{r.ip_address || '—'}</td>
                </tr>
              ))}
              {!fetching && rows.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-[13px] text-[#94a3b8]">{tableReady ? 'No activity matches your filters.' : 'Run the migration to start capturing activity.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
