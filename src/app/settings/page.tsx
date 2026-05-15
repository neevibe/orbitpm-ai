'use client';

import { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, Building2, Shield, Bell, Palette, CreditCard, Check, AlertCircle, Loader2, RefreshCw, Database } from 'lucide-react';
import { useData } from '@/lib/data-context';

export default function SettingsPage() {
  const { projects, risks, departments, importProjects } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<null | { type: 'success' | 'error'; message: string }>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects, risks, departments }) });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `OrbitPM_BIAL_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
      setImportStatus({ type: 'success', message: `Exported ${projects.length} projects and ${risks.length} risks to Excel` });
    } catch { setImportStatus({ type: 'error', message: 'Export failed.' }); }
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
        setImportStatus({ type: 'success', message: `Imported ${result.summary.totalProjects} projects, ${result.summary.totalRisks} risks across ${result.summary.departments} departments` });
      } else { setImportStatus({ type: 'error', message: result.error || 'No projects found.' }); }
    } catch { setImportStatus({ type: 'error', message: 'Failed to read file.' }); }
    setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div><h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Settings</h1><p className="text-[13px] text-[#64748b] mt-0.5">Platform configuration and data management</p></div>

      <div className="glass-card p-5 border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-emerald-50/50">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center flex-shrink-0"><FileSpreadsheet className="w-5 h-5 text-white" /></div>
          <div><h2 className="text-[15px] font-bold text-[#0f172a]">Excel Data Sync</h2><p className="text-[12px] text-[#64748b] mt-0.5">Import/export data maintaining BIAL Excel compatibility.</p></div>
        </div>

        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white border border-[#e2e8f0]">
          <Database className="w-4 h-4 text-indigo-500" />
          <p className="text-[12px] text-[#334155]"><span className="font-semibold">{projects.length}</span> projects · <span className="font-semibold">{risks.length}</span> risks · <span className="font-semibold">{departments.length}</span> departments</p>
          <RefreshCw className="w-3.5 h-3.5 text-[#94a3b8] ml-auto" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-white border border-[#e2e8f0]">
            <div className="flex items-center gap-2 mb-2"><Upload className="w-4 h-4 text-indigo-500" /><h3 className="text-[12px] font-semibold text-[#334155]">Import from Excel</h3></div>
            <p className="text-[11px] text-[#94a3b8] mb-3">Upload .xlsx to import projects and risks.</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="btn-primary w-full justify-center text-[12px] py-2">
              {isImporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</> : <><Upload className="w-3.5 h-3.5" /> Choose File</>}</button>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#e2e8f0]">
            <div className="flex items-center gap-2 mb-2"><Download className="w-4 h-4 text-emerald-500" /><h3 className="text-[12px] font-semibold text-[#334155]">Export to Excel</h3></div>
            <p className="text-[11px] text-[#94a3b8] mb-3">Download BIAL-compatible Excel with all sheets.</p>
            <button onClick={handleExport} disabled={isExporting} className="btn-secondary w-full justify-center text-[12px] py-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50">
              {isExporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Download className="w-3.5 h-3.5" /> Export ({projects.length} projects)</>}</button>
          </div>
        </div>

        {importStatus && (
          <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${importStatus.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {importStatus.type === 'success' ? <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
            <p className={`text-[12px] ${importStatus.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{importStatus.message}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Building2, title: 'Organization', desc: 'Manage department settings and branding' },
          { icon: Shield, title: 'Security & Access', desc: 'User roles, permissions, SSO configuration' },
          { icon: Bell, title: 'Notifications', desc: 'Email, Slack, and in-app preferences', badge: '3 active' },
          { icon: Palette, title: 'Appearance', desc: 'Theme and layout preferences' },
          { icon: CreditCard, title: 'Subscription', desc: 'Enterprise plan · Unlimited projects', badge: 'Enterprise' },
        ].map(s => (
          <div key={s.title} className="glass-card p-4 hover:border-indigo-200 transition-all cursor-pointer group">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all">
                <s.icon className="w-4 h-4 text-[#64748b] group-hover:text-indigo-500 transition-colors" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><h3 className="text-[12px] font-semibold text-[#334155]">{s.title}</h3>
                  {s.badge && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 font-medium border border-indigo-100">{s.badge}</span>}</div>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">{s.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
