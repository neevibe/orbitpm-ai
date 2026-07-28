'use client';

import { useState } from 'react';
import { FileText, Download, FileSpreadsheet, Loader2, BarChart3, AlertTriangle, Calendar, Check } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { authedFetch } from '@/lib/supabase';

export default function ReportsPage() {
  const { projects, risks, departments } = useData();
  const [exporting, setExporting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async (reportType: string) => {
    setExporting(reportType); setSuccess(null);
    try {
      const response = await authedFetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projects, risks, departments }) });
      if (!response.ok) throw new Error('failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `OrbitPM_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
      setSuccess(reportType); setTimeout(() => setSuccess(null), 3000);
    } catch {}
    setExporting(null);
  };

  const reports = [
    { title: 'Executive Summary', desc: 'Full portfolio overview with KPIs and department breakdown for leadership', icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', stats: `${projects.length} projects`, type: 'Executive_Summary' },
    { title: 'KPI & Performance', desc: 'Project progress, completion rates, and department performance', icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', stats: `${projects.filter(p => p.status === 'In Progress').length} active`, type: 'KPI_Report' },
    { title: 'Risk Analysis', desc: 'All risks by category, impact, and mitigation status', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', stats: `${risks.length} risks`, type: 'Risk_Analysis' },
    { title: 'Monthly Review Pack', desc: 'Period summary combining project updates and governance highlights', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100', stats: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), type: 'Monthly_Review' },
    { title: 'Full Data Export', desc: 'Complete data dump — Dashboard, Master Index, Risk Register, per-department views', icon: Download, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100', stats: `${projects.length} projects · ${risks.length} risks`, type: 'Full_Export' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div><h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Reports</h1><p className="text-[13px] text-[#64748b] mt-0.5">Generate and download Excel reports from live data</p></div>
      <div className="space-y-2.5">
        {reports.map(r => (
          <div key={r.type} className="glass-card p-4 hover:border-blue-200 transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${r.bg} border ${r.border} flex items-center justify-center flex-shrink-0`}><r.icon className={`w-5 h-5 ${r.color}`} /></div>
              <div className="flex-1"><h3 className="text-[13px] font-bold text-[#0f172a]">{r.title}</h3><p className="text-[11px] text-[#94a3b8] mt-0.5">{r.desc}</p><p className="text-[10px] text-[#cbd5e1] mt-0.5 font-mono">{r.stats}</p></div>
              <button onClick={() => handleExport(r.type)} disabled={exporting === r.type} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                success === r.type ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-white text-[#475569] border border-[#e2e8f0] hover:bg-[#f8fafc] hover:border-blue-200'
              }`}>
                {exporting === r.type ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : success === r.type ? <><Check className="w-3.5 h-3.5" /> Downloaded</> : <><FileSpreadsheet className="w-3.5 h-3.5" /> Export</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
