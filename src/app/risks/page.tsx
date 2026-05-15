'use client';

import { AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useData } from '@/lib/data-context';
import RiskModal from '@/components/modals/RiskModal';

export default function RisksPage() {
  const { risks, updateRisk, deleteRisk } = useData();
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);

  const openRisks = risks.filter(r => r.status === 'Open').length;
  const closedRisks = risks.filter(r => r.status === 'Closed').length;
  const highSev = risks.filter(r => r.impact === 'High' && r.status === 'Open').length;
  const filtered = risks.filter(r => statusFilter === 'All' || r.status === statusFilter);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Risk & Blocker Register</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">BIAL Commercial Projects — Risk Tracking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-[12px]"><AlertTriangle className="w-3.5 h-3.5" /> Add Risk</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Risks', value: risks.length, icon: AlertTriangle, bg: 'bg-[#f8fafc]', border: 'border-[#e2e8f0]', color: 'text-[#64748b]' },
          { label: 'Open Risks', value: openRisks, icon: Shield, bg: 'bg-amber-50', border: 'border-amber-100', color: 'text-amber-500' },
          { label: 'High Severity (Open)', value: highSev, icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-100', color: 'text-red-500' },
          { label: 'Closed', value: closedRisks, icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-100', color: 'text-emerald-500' },
        ].map(k => (
          <div key={k.label} className={`glass-card p-4 ${k.bg} border ${k.border}`}>
            <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
            <p className="text-2xl font-bold text-[#0f172a]">{k.value}</p>
            <p className="text-[11px] text-[#64748b] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-indigo-500">
          <option value="All">All Risks</option><option value="Open">Open</option><option value="Closed">Closed</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Risk ID</th><th>Project</th><th>Description</th><th>Category</th><th>Impact</th><th>Score</th><th>Owner</th><th>Mitigation</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><span className="font-mono text-[11px] text-indigo-500 font-medium">{r.id}</span></td>
                  <td><span className="font-mono text-[11px] text-[#94a3b8]">{r.projectId || '—'}</span></td>
                  <td><span className="text-[#334155] font-medium">{r.description}</span></td>
                  <td><span className="text-[11px] px-2 py-0.5 rounded bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]">{r.category}</span></td>
                  <td><span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                    r.impact === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                    r.impact === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'
                  }`}>{r.impact}</span></td>
                  <td className="text-center font-semibold text-[#475569]">{r.score}</td>
                  <td className="text-[#64748b]">{r.owner}</td>
                  <td><span className="text-[11px] text-[#94a3b8] max-w-[180px] truncate block">{r.mitigation}</span></td>
                  <td><span className={`status-badge ${r.status === 'Open' ? 'in-progress' : 'completed'}`}>{r.status}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      {r.status === 'Open' && (
                        <button onClick={() => updateRisk(r.id, { status: 'Closed' })}
                          className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all font-medium border border-emerald-100">Close</button>
                      )}
                      {r.status === 'Closed' && (
                        <button onClick={() => updateRisk(r.id, { status: 'Open' })}
                          className="text-[10px] px-2 py-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all font-medium border border-amber-100">Reopen</button>
                      )}
                      <button onClick={() => { if (confirm('Delete this risk?')) deleteRisk(r.id); }}
                        className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-all font-medium border border-red-100">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <RiskModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
