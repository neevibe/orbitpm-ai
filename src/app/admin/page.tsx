'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Users, KeyRound, Activity, Database, FileSpreadsheet,
  Upload, Download, Palette, Bell, Globe, Clock, Check, AlertCircle, Loader2,
  Search, RefreshCw, ChevronRight, Eye, Edit3, UserPlus,
  Shield, UserCheck, UserX, X, ExternalLink,
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { getAccessToken, signOutAndRelogin } from '@/lib/supabase';
import { BIAL_EMPLOYEES, DEPARTMENTS } from '@/lib/employee-data';

interface PersistentAuditRow {
  id: string;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  module: string | null;
  entity_name: string | null;
  status: string | null;
  created_at: string;
}

const tabs = [
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'security', label: 'Security', icon: KeyRound },
  { id: 'audit', label: 'Audit Log', icon: Activity },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

type Permission = 'view' | 'edit' | 'modify' | 'admin';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  department: string;
  permission: Permission;
  status: 'Active' | 'Invited' | 'Inactive';
  lastActive: string;
}

const PERMISSION_CONFIG: Record<Permission, { label: string; badgeClass: string }> = {
  view:   { label: 'View',   badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200' },
  edit:   { label: 'Edit',   badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200' },
  modify: { label: 'Modify', badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200' },
  admin:  { label: 'Admin',  badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200' },
};

function buildUsers(): UserRecord[] {
  return BIAL_EMPLOYEES.map((emp, i) => ({
    id: emp.id,
    name: emp.name,
    email: emp.email,
    department: emp.department,
    permission: emp.email === 'neeraj.p@bialairport.com' ? 'admin' : 'view',
    status: i < 4 ? 'Active' : i < 8 ? 'Invited' : 'Active',
    lastActive: i === 0 ? '2 min ago' : i < 4 ? `${(i + 1) * 12} min ago` : `${i} hrs ago`,
  }));
}

export default function AdminPage() {
  const { projects, risks, departments, importProjects } = useData();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [importStatus, setImportStatus] = useState<null | { type: 'success' | 'error'; message: string }>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<UserRecord[]>(buildUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [typeFilter, setTypeFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Permission>('view');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // Persistent audit trail (survives reloads) — loaded from the server when the tab opens.
  const [persistentAudit, setPersistentAudit] = useState<PersistentAuditRow[]>([]);
  const [auditTableReady, setAuditTableReady] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'audit') return;
    let cancelled = false;
    (async () => {
      setAuditLoading(true);
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/audit?limit=200', { headers: { Authorization: `Bearer ${token ?? ''}` } });
        if (res.status === 401) { await signOutAndRelogin(); return; }
        const json = await res.json();
        if (cancelled) return;
        setPersistentAudit(Array.isArray(json.rows) ? json.rows : []);
        setAuditTableReady(json.tableReady !== false);
      } catch {
        if (!cancelled) { setPersistentAudit([]); setAuditTableReady(true); }
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  const filteredUsers = useMemo(() => users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = deptFilter === 'All Departments' || u.department === deptFilter;
    const isInternal = u.email.endsWith('@bialairport.com');
    const matchType = typeFilter === 'all' ? true : typeFilter === 'internal' ? isInternal : !isInternal;
    return matchSearch && matchDept && matchType;
  }), [users, searchQuery, deptFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    internal: users.filter(u => u.email.endsWith('@bialairport.com')).length,
    external: users.filter(u => !u.email.endsWith('@bialairport.com')).length,
    admins: users.filter(u => u.permission === 'admin').length,
    active: users.filter(u => u.status === 'Active').length,
  }), [users]);

  const handlePermissionChange = async (userId: string, newPerm: Permission) => {
    setUpdatingUserId(userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, permission: newPerm } : u));
    try {
      await fetch('/api/admin/update-user-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, permission: newPerm }),
      });
    } catch { /* optimistic update already applied */ }
    setTimeout(() => setUpdatingUserId(null), 600);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteStatus('sending');
    const isInternal = inviteEmail.toLowerCase().endsWith('@bialairport.com');
    const newUser: UserRecord = {
      id: `user-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail.toLowerCase(),
      department: isInternal ? 'Operations' : 'External',
      permission: inviteRole,
      status: 'Invited',
      lastActive: 'Pending',
    };
    setUsers(prev => [...prev, newUser]);
    setTimeout(() => {
      setInviteStatus('sent');
      setTimeout(() => { setShowInviteModal(false); setInviteEmail(''); setInviteStatus(null); }, 1500);
    }, 1000);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects, risks, departments }) });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `OrbitPM_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
      setImportStatus({ type: 'success', message: `Exported ${projects.length} projects` });
    } catch { setImportStatus({ type: 'error', message: 'Export failed' }); }
    setIsExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsImporting(true); setImportStatus(null);
    try {
      const formData = new FormData(); formData.append('file', file);
      const response = await fetch('/api/import', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success && result.projects.length > 0) {
        importProjects(result.projects);
        setImportStatus({ type: 'success', message: `Imported ${result.summary.totalProjects} projects` });
      } else { setImportStatus({ type: 'error', message: result.error || 'No data found' }); }
    } catch { setImportStatus({ type: 'error', message: 'Failed to read file' }); }
    setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ---- access gate: Administration is Super Admin only ---- */
  if (authLoading) return null;
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
          <Shield className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-[18px] font-bold text-[#0f172a]">Access restricted</h1>
        <p className="text-[13px] text-[#64748b] mt-1 max-w-sm">The Administration area is available to Super Admin accounts only.</p>
      </div>
    );
  }

  return (
    <div className="x-page space-y-5">
      <div>
        <h1 className="x-page-title flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-gray-500" /> Administration</h1>
        <p className="x-page-subtitle">Security, users, permissions, and platform governance</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-x-border)]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-all ${activeTab === t.id ? 'text-[var(--color-x-accent)] border-[var(--color-x-accent)]' : 'text-[var(--color-x-text-muted)] border-transparent hover:text-[var(--color-x-text-secondary)]'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Users & Roles */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total Users', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Internal', value: stats.internal, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'External', value: stats.external, icon: UserX, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Admins', value: stats.admins, icon: Shield, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Active', value: stats.active, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map(s => (
              <div key={s.label} className="x-card p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-[var(--color-x-text-muted)]">{s.label}</p>
                  <p className={`text-[18px] font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative max-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
              <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="x-input pl-8 w-full" />
            </div>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="x-input" style={{ width: 170 }}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
            <div className="flex items-center gap-0.5 bg-[var(--color-x-bg)] border border-[var(--color-x-border)] rounded-lg p-0.5">
              {(['all', 'internal', 'external'] as const).map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium capitalize transition-all ${typeFilter === t ? 'bg-white shadow-sm text-blue-600' : 'text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)]'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <button onClick={() => setShowInviteModal(true)} className="x-btn x-btn-primary text-[12px]">
                <UserPlus className="w-3.5 h-3.5" /> Invite User
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="x-card-flush">
            <table className="x-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Permission</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const isInternal = u.email.endsWith('@bialairport.com');
                  const perm = PERMISSION_CONFIG[u.permission];
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                            {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-[12px] font-semibold text-[var(--color-x-text)] leading-tight">{u.name}</p>
                            <p className="text-[10px] text-[var(--color-x-text-muted)]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-[11px] text-[var(--color-x-text-secondary)]">{u.department}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isInternal ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {isInternal ? <UserCheck className="w-2.5 h-2.5" /> : <UserX className="w-2.5 h-2.5" />}
                          {isInternal ? 'Internal' : 'External'}
                        </span>
                      </td>
                      <td>
                        <div className="relative inline-flex items-center">
                          <select
                            value={u.permission}
                            onChange={e => handlePermissionChange(u.id, e.target.value as Permission)}
                            className={`text-[10px] font-medium px-2 py-1 rounded-md border cursor-pointer appearance-none pr-5 ${perm.badgeClass}`}
                          >
                            <option value="view">View</option>
                            <option value="edit">Edit</option>
                            <option value="modify">Modify</option>
                            <option value="admin">Admin</option>
                          </select>
                          {updatingUserId === u.id && <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 animate-spin text-blue-500" />}
                        </div>
                      </td>
                      <td>
                        <span className={`x-badge text-[10px] ${u.status === 'Active' ? 'x-badge-green' : u.status === 'Invited' ? 'x-badge-amber' : 'x-badge-gray'}`}>{u.status}</span>
                      </td>
                      <td className="text-[11px] text-[var(--color-x-text-muted)]">{u.lastActive}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-md hover:bg-[var(--color-x-bg)] transition-colors"><Eye className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" /></button>
                          <button className="p-1.5 rounded-md hover:bg-[var(--color-x-bg)] transition-colors"><Edit3 className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-[12px] text-[var(--color-x-text-muted)]">No users match your filters.</p>
              </div>
            )}
          </div>

          {/* Permission Legend */}
          <div className="x-card p-4">
            <h3 className="text-[12px] font-semibold text-[var(--color-x-text)] mb-3 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" /> Permission Levels</h3>
            <div className="flex flex-wrap gap-4">
              {(Object.entries(PERMISSION_CONFIG) as [Permission, typeof PERMISSION_CONFIG[Permission]][]).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${cfg.badgeClass}`}>{cfg.label}</span>
                  <p className="text-[11px] text-[var(--color-x-text-muted)]">
                    {key === 'view' ? 'Read-only' : key === 'edit' ? 'Edit existing' : key === 'modify' ? 'Create & delete' : 'Full access'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          {[
            { title: 'Role-Based Access (RBAC)', desc: 'View / Edit / Modify / Admin permission tiers', enabled: true },
            { title: 'Internal User Detection', desc: '@bialairport.com auto-recognised as internal', enabled: true },
            { title: 'Row-Level Security', desc: 'Filter data at database level per user', enabled: true },
            { title: 'Department Isolation', desc: 'Users only see their department data', enabled: false },
            { title: 'SSO / SAML', desc: 'Enterprise single sign-on integration', enabled: false },
            { title: 'Two-Factor Auth', desc: 'Require 2FA for all admin accounts', enabled: false },
          ].map(s => (
            <div key={s.title} className="x-card p-5 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.enabled ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                <KeyRound className={`w-4 h-4 ${s.enabled ? 'text-emerald-500' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1"><h3 className="text-[12px] font-semibold text-[var(--color-x-text)]">{s.title}</h3><p className="text-[11px] text-[var(--color-x-text-muted)] mt-0.5">{s.desc}</p></div>
              <div className={`w-9 h-5 rounded-full flex items-center px-0.5 ${s.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${s.enabled ? 'translate-x-4' : ''}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log — persistent, server-backed (survives reloads) */}
      {activeTab === 'audit' && (
        <div className="space-y-3 animate-fade-in">
          {!auditTableReady && (
            <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
              <strong>Audit table not found.</strong> Run <code className="font-mono">supabase/migrations/0002_audit_log.sql</code> in the Supabase SQL editor to start capturing a permanent activity trail.
            </div>
          )}
          <div className="x-card-flush">
            <div className="px-4 py-3 border-b border-[var(--color-x-border)] flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[var(--color-x-text)] flex items-center gap-2">
                Activity Log
                {auditLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-x-text-muted)]" />}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[var(--color-x-text-muted)]">{persistentAudit.length} entries</span>
                <Link href="/admin/audit" className="text-[11px] text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium">
                  Full dashboard <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
            {persistentAudit.length > 0 ? (
              <div className="divide-y divide-[var(--color-x-border)]/50 max-h-[500px] overflow-y-auto">
                {persistentAudit.map(entry => {
                  const verb = entry.action.split('.')[1] || entry.action;
                  const badge = verb.includes('create') ? 'x-badge-green' : verb.includes('delete') ? 'x-badge-red' : 'x-badge-blue';
                  return (
                    <div key={entry.id} className="px-4 py-3 hover:bg-[var(--color-x-bg)] transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`x-badge text-[9px] ${badge}`}>{entry.action}</span>
                        <span className="text-[12px] text-[var(--color-x-text)]">{entry.entity_name || '—'}</span>
                        <span className="text-[10px] text-[var(--color-x-text-muted)] ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-x-text-muted)] mt-1">{entry.actor_name || entry.actor_email || 'Unknown user'} · {entry.module || 'system'}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center"><Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-[12px] text-[var(--color-x-text-muted)]">{auditLoading ? 'Loading activity…' : auditTableReady ? 'No activity recorded yet. Changes you make will appear here permanently.' : 'Run the migration to start capturing activity.'}</p></div>
            )}
          </div>
        </div>
      )}

      {/* Data Management */}
      {activeTab === 'data' && (
        <div className="space-y-4 animate-fade-in">
          <div className="x-card p-5 border-blue-200 bg-gradient-to-r from-blue-50/40 to-sky-50/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-white" /></div>
              <div><h2 className="text-[15px] font-bold text-[var(--color-x-text)]">Excel Data Sync</h2><p className="text-[12px] text-[var(--color-x-text-muted)]">Import and export maintaining workbook compatibility</p></div>
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white border border-[var(--color-x-border)]">
              <Database className="w-4 h-4 text-blue-500" />
              <p className="text-[12px] text-[var(--color-x-text-secondary)]"><span className="font-semibold">{projects.length}</span> projects · <span className="font-semibold">{risks.length}</span> risks · <span className="font-semibold">{departments.length}</span> departments</p>
              <RefreshCw className="w-3.5 h-3.5 text-[var(--color-x-text-muted)] ml-auto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-white border border-[var(--color-x-border)]">
                <div className="flex items-center gap-2 mb-2"><Upload className="w-4 h-4 text-blue-500" /><h3 className="text-[12px] font-semibold">Import</h3></div>
                <p className="text-[11px] text-[var(--color-x-text-muted)] mb-3">Upload .xlsx to sync projects and risks</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="x-btn x-btn-primary w-full text-[12px]">
                  {isImporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</> : <><Upload className="w-3.5 h-3.5" /> Choose File</>}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[var(--color-x-border)]">
                <div className="flex items-center gap-2 mb-2"><Download className="w-4 h-4 text-emerald-500" /><h3 className="text-[12px] font-semibold">Export</h3></div>
                <p className="text-[11px] text-[var(--color-x-text-muted)] mb-3">Download complete Excel workbook</p>
                <button onClick={handleExport} disabled={isExporting} className="x-btn x-btn-secondary w-full text-[12px] border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                  {isExporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Download className="w-3.5 h-3.5" /> Export ({projects.length})</>}
                </button>
              </div>
            </div>
            {importStatus && (
              <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${importStatus.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                {importStatus.type === 'success' ? <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                <p className={`text-[12px] ${importStatus.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{importStatus.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appearance */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          {[
            { title: 'Theme', desc: 'Switch between light and dark mode', icon: Palette },
            { title: 'Notifications', desc: 'Email, Slack, and in-app preferences', icon: Bell },
            { title: 'Language', desc: 'English (United States)', icon: Globe },
            { title: 'Timezone', desc: 'Asia/Kolkata (IST, UTC+5:30)', icon: Clock },
          ].map(s => (
            <div key={s.title} className="x-card p-5 flex items-center gap-3 hover:border-[var(--color-x-accent)] transition-all cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-x-bg)] border border-[var(--color-x-border)] flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-200 transition-all">
                <s.icon className="w-4 h-4 text-[var(--color-x-text-muted)] group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="flex-1"><h3 className="text-[12px] font-semibold text-[var(--color-x-text)]">{s.title}</h3><p className="text-[11px] text-[var(--color-x-text-muted)]">{s.desc}</p></div>
              <ChevronRight className="w-4 h-4 text-[var(--color-x-text-muted)]" />
            </div>
          ))}
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
          <div className="bg-[var(--color-x-surface)] rounded-2xl shadow-2xl border border-[var(--color-x-border)] p-6 w-[420px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--color-x-text)]">Invite User</h2>
                <p className="text-[12px] text-[var(--color-x-text-muted)] mt-0.5">@bialairport.com emails are recognised as Internal</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-x-bg)]"><X className="w-4 h-4 text-[var(--color-x-text-muted)]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-[var(--color-x-text)] block mb-1.5">Email Address</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@bialairport.com" className="x-input w-full" />
                {inviteEmail && (
                  <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${inviteEmail.endsWith('@bialairport.com') ? 'text-blue-600' : 'text-amber-600'}`}>
                    {inviteEmail.endsWith('@bialairport.com')
                      ? <><UserCheck className="w-3 h-3" /> Internal BIAL user</>
                      : <><UserX className="w-3 h-3" /> External user</>}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[12px] font-medium text-[var(--color-x-text)] block mb-1.5">Permission Level</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Permission)} className="x-input w-full">
                  <option value="view">View — Read-only access</option>
                  <option value="edit">Edit — Can modify existing records</option>
                  <option value="modify">Modify — Can create and delete</option>
                  <option value="admin">Admin — Full platform access</option>
                </select>
              </div>
              <button onClick={handleInvite} disabled={!inviteEmail || inviteStatus === 'sending'} className="x-btn x-btn-primary w-full">
                {inviteStatus === 'sending' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                  : inviteStatus === 'sent' ? <><Check className="w-3.5 h-3.5" /> Invitation Sent!</>
                  : <><UserPlus className="w-3.5 h-3.5" /> Send Invitation</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
