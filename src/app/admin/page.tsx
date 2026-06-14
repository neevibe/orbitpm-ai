'use client';

import { useState } from 'react';
import {
  ShieldCheck, Users, KeyRound, Activity, Database, FileSpreadsheet,
  Upload, Download, Palette, Bell, Globe, Clock, Check, AlertCircle, Loader2,
  Search, RefreshCw, ChevronRight, Eye, Edit3, Trash2
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useRef } from 'react';

const tabs = [
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'security', label: 'Security', icon: KeyRound },
  { id: 'audit', label: 'Audit Log', icon: Activity },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

const mockUsers = [
  { name: 'Neeraj Prakash', email: 'neeraj@xyrenis.com', role: 'Super Admin', status: 'Active', lastActive: '2 min ago' },
  { name: 'Musthaq Ahamed', email: 'musthaq@xyrenis.com', role: 'Project Manager', status: 'Active', lastActive: '15 min ago' },
  { name: 'Ajay Rao', email: 'ajay@xyrenis.com', role: 'Project Manager', status: 'Active', lastActive: '1 hr ago' },
  { name: 'Priya Sharma', email: 'priya@xyrenis.com', role: 'Portfolio Manager', status: 'Active', lastActive: '3 hrs ago' },
  { name: 'Rohan', email: 'rohan@xyrenis.com', role: 'Contributor', status: 'Active', lastActive: '5 hrs ago' },
  { name: 'Deepak Singh', email: 'deepak@xyrenis.com', role: 'Team Lead', status: 'Invited', lastActive: 'Pending' },
];

const roles = ['Super Admin', 'Admin', 'Portfolio Manager', 'Program Manager', 'Project Manager', 'Product Manager', 'Team Lead', 'Contributor', 'Viewer', 'Executive'];

export default function AdminPage() {
  const { projects, risks, departments, auditLog, importProjects } = useData();
  const [activeTab, setActiveTab] = useState('users');
  const [importStatus, setImportStatus] = useState<null | { type: 'success' | 'error'; message: string }>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects, risks, departments }) });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Xyrenis_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
      setImportStatus({ type: 'success', message: `Exported ${projects.length} projects and ${risks.length} risks` });
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
          <div className="flex items-center justify-between">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-x-text-muted)]" /><input type="text" placeholder="Search users..." className="x-input pl-8 w-64" /></div>
            <button className="x-btn x-btn-primary text-[12px]"><Users className="w-3.5 h-3.5" /> Invite User</button>
          </div>
          <div className="x-card-flush">
            <table className="x-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Active</th><th>Actions</th></tr></thead>
              <tbody>{mockUsers.map(u => (
                <tr key={u.email}>
                  <td><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white">{u.name.split(' ').map(n => n[0]).join('')}</div><div><p className="text-[12px] font-semibold text-[var(--color-x-text)]">{u.name}</p><p className="text-[10px] text-[var(--color-x-text-muted)]">{u.email}</p></div></div></td>
                  <td><span className="x-badge x-badge-indigo text-[10px]">{u.role}</span></td>
                  <td><span className={`x-badge text-[10px] ${u.status === 'Active' ? 'x-badge-green' : 'x-badge-amber'}`}>{u.status}</span></td>
                  <td className="text-[var(--color-x-text-muted)]">{u.lastActive}</td>
                  <td><div className="flex items-center gap-1"><button className="p-1.5 rounded-md hover:bg-[var(--color-x-bg)]"><Eye className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" /></button><button className="p-1.5 rounded-md hover:bg-[var(--color-x-bg)]"><Edit3 className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" /></button></div></td>
                </tr>))}</tbody></table>
          </div>
          <div className="x-card p-5">
            <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3">Available Roles</h3>
            <div className="flex flex-wrap gap-2">{roles.map(r => <span key={r} className="x-badge x-badge-gray text-[10px]">{r}</span>)}</div>
          </div>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          {[
            { title: 'Role-Based Access (RBAC)', desc: 'Control access by assigned role', enabled: true },
            { title: 'Attribute-Based Access (ABAC)', desc: 'Fine-grained access based on attributes', enabled: false },
            { title: 'Row-Level Security', desc: 'Filter data at database level per user', enabled: true },
            { title: 'Department Isolation', desc: 'Users only see their department data', enabled: false },
            { title: 'SSO / SAML', desc: 'Enterprise single sign-on integration', enabled: false },
            { title: 'Two-Factor Auth', desc: 'Require 2FA for all admin accounts', enabled: true },
          ].map(s => (
            <div key={s.title} className="x-card p-5 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.enabled ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                <KeyRound className={`w-4 h-4 ${s.enabled ? 'text-emerald-500' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1"><h3 className="text-[12px] font-semibold text-[var(--color-x-text)]">{s.title}</h3><p className="text-[11px] text-[var(--color-x-text-muted)] mt-0.5">{s.desc}</p></div>
              <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${s.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${s.enabled ? 'translate-x-4' : ''}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-3 animate-fade-in">
          <div className="x-card-flush">
            <div className="px-4 py-3 border-b border-[var(--color-x-border)] flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[var(--color-x-text)]">Activity Log</h3>
              <span className="text-[11px] text-[var(--color-x-text-muted)]">{auditLog.length} entries</span>
            </div>
            {auditLog.length > 0 ? (
              <div className="divide-y divide-[var(--color-x-border)]/50 max-h-[500px] overflow-y-auto">
                {auditLog.map(entry => (
                  <div key={entry.id} className="px-4 py-3 hover:bg-[var(--color-x-bg)] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`x-badge text-[9px] ${entry.action === 'create' ? 'x-badge-green' : entry.action === 'delete' ? 'x-badge-red' : 'x-badge-blue'}`}>{entry.action}</span>
                      <span className="text-[12px] text-[var(--color-x-text)]">{entry.entityName}</span>
                      <span className="text-[10px] text-[var(--color-x-text-muted)] ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{entry.timestamp.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-x-text-muted)] mt-1">{entry.user} · {entry.entityType}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center"><Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-[12px] text-[var(--color-x-text-muted)]">No audit entries yet. Actions will appear here automatically.</p></div>
            )}
          </div>
        </div>
      )}

      {/* Data Management */}
      {activeTab === 'data' && (
        <div className="space-y-4 animate-fade-in">
          <div className="x-card p-5 border-indigo-200 bg-gradient-to-r from-indigo-50/30 to-purple-50/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-white" /></div>
              <div><h2 className="text-[15px] font-bold text-[var(--color-x-text)]">Excel Data Sync</h2><p className="text-[12px] text-[var(--color-x-text-muted)]">Import and export maintaining workbook compatibility</p></div>
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white border border-[var(--color-x-border)]">
              <Database className="w-4 h-4 text-indigo-500" />
              <p className="text-[12px] text-[var(--color-x-text-secondary)]"><span className="font-semibold">{projects.length}</span> projects · <span className="font-semibold">{risks.length}</span> risks · <span className="font-semibold">{departments.length}</span> departments</p>
              <RefreshCw className="w-3.5 h-3.5 text-[var(--color-x-text-muted)] ml-auto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-white border border-[var(--color-x-border)]">
                <div className="flex items-center gap-2 mb-2"><Upload className="w-4 h-4 text-indigo-500" /><h3 className="text-[12px] font-semibold">Import</h3></div>
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
            { title: 'Theme', desc: 'Switch between light and dark mode', icon: Palette, action: 'Toggle' },
            { title: 'Notifications', desc: 'Email, Slack, and in-app preferences', icon: Bell, action: 'Configure' },
            { title: 'Language', desc: 'English (United States)', icon: Globe, action: 'Change' },
            { title: 'Timezone', desc: 'Asia/Kolkata (IST, UTC+5:30)', icon: Clock, action: 'Change' },
          ].map(s => (
            <div key={s.title} className="x-card p-5 flex items-center gap-3 hover:border-[var(--color-x-accent)] transition-all cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-x-bg)] border border-[var(--color-x-border)] flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all">
                <s.icon className="w-4 h-4 text-[var(--color-x-text-muted)] group-hover:text-indigo-500 transition-colors" />
              </div>
              <div className="flex-1"><h3 className="text-[12px] font-semibold text-[var(--color-x-text)]">{s.title}</h3><p className="text-[11px] text-[var(--color-x-text-muted)]">{s.desc}</p></div>
              <ChevronRight className="w-4 h-4 text-[var(--color-x-text-muted)]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
