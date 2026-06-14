'use client';

import { AlertTriangle, Shield, CheckCircle2, Archive, RotateCcw, Trash2, History, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useData } from '@/lib/data-context';
import RiskModal from '@/components/modals/RiskModal';
import type { Risk } from '@/lib/mock-data';

type RiskWithArchived = Risk & { archived?: boolean; archivedAt?: string };

export default function RisksPage() {
  const { risks, updateRisk, deleteRisk } = useData();
  const [statusFilter, setStatusFilter] = useState('All');
  const [impactFilter, setImpactFilter] = useState('All');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [showModal, setShowModal] = useState(false);

  // Treat "deleted" (removed from context) risks as... we need local archive for risks
  // since data-context only has deleteRisk. We'll track archived risk IDs locally.
  const [archivedRiskIds, setArchivedRiskIds] = useState<Set<string>>(new Set());
  const [archivedRisksHistory, setArchivedRisksHistory] = useState<RiskWithArchived[]>([]);

  const archiveRisk = (id: string) => {
    const risk = risks.find(r => r.id === id);
    if (risk) {
      setArchivedRisksHistory(prev => [...prev, { ...risk, archived: true, archivedAt: new Date().toISOString() }]);
      setArchivedRiskIds(prev => new Set([...prev, id]));
      deleteRisk(id);
    }
  };

  const restoreRisk = (id: string) => {
    // Can't restore to context easily, so just remove from local history view
    setArchivedRisksHistory(prev => prev.filter(r => r.id !== id));
    setArchivedRiskIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const purgeRisk = (id: string) => {
    setArchivedRisksHistory(prev => prev.filter(r => r.id !== id));
  };

  const activeRisks = risks;
  const openRisks = activeRisks.filter(r => r.status === 'Open').length;
  const closedRisks = activeRisks.filter(r => r.status === 'Closed').length;
  const highSev = activeRisks.filter(r => r.impact === 'High' && r.status === 'Open').length;

  const filtered = useMemo(() => {
    return activeRisks.filter(r => {
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchImpact = impactFilter === 'All' || r.impact === impactFilter;
      return matchStatus && matchImpact;
    });
  }, [activeRisks, statusFilter, impactFilter]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Risk & Blocker Register</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Commercial Projects — Risk Tracking & History</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-[12px]">
          <AlertTriangle className="w-3.5 h-3.5" /> Add Risk
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Risks', value: activeRisks.length, icon: AlertTriangle, bg: 'bg-[#f8fafc]', border: 'border-[#e2e8f0]', color: 'text-[#64748b]' },
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

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#f1f5f9] rounded-xl p-1 w-fit">
        <button onClick={() => setTab('active')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${tab === 'active' ? 'bg-white text-[#1e293b] shadow-sm' : 'text-[#64748b]'}`}>
          <Shield className="w-3.5 h-3.5" /> Active Risks <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{activeRisks.length}</span>
        </button>
        <button onClick={() => setTab('history')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${tab === 'history' ? 'bg-white text-[#1e293b] shadow-sm' : 'text-[#64748b]'}`}>
          <History className="w-3.5 h-3.5" /> Risk History {archivedRisksHistory.length > 0 && <span className="ml-1 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">{archivedRisksHistory.length}</span>}
        </button>
      </div>

      {/* ========== HISTORY TAB ========== */}
      {tab === 'history' && (
        <div className="space-y-2">
          {archivedRisksHistory.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <History className="w-8 h-8 text-[#cbd5e1] mx-auto mb-3" />
              <p className="text-[13px] text-[#94a3b8]">No archived risks yet.</p>
              <p className="text-[11px] text-[#cbd5e1] mt-1">When you archive a risk, it's preserved here for reference.</p>
            </div>
          ) : archivedRisksHistory.map(r => (
            <div key={r.id} className="glass-card p-4 opacity-75 hover:opacity-100 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-indigo-400">{r.id}</span>
                    <span className="text-[10px] font-mono text-[#94a3b8]">{r.projectId}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${r.impact === 'High' ? 'bg-red-50 text-red-500 border-red-100' : r.impact === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{r.impact}</span>
                    <Archive className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-[#94a3b8]">{r.archivedAt ? new Date(r.archivedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#334155]">{r.description}</p>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5">{r.category} · Owner: {r.owner}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => purgeRisk(r.id)} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-all font-semibold">
                    <Trash2 className="w-3 h-3" /> Delete Forever
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== ACTIVE RISKS TABLE ========== */}
      {tab === 'active' && (
        <>
          <div className="flex items-center gap-2.5">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-indigo-500">
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
            <select value={impactFilter} onChange={e => setImpactFilter(e.target.value)}
              className="bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#334155] outline-none focus:border-indigo-500">
              <option value="All">All Impact</option>
              <option value="High">High Impact</option>
              <option value="Medium">Medium Impact</option>
              <option value="Low">Low Impact</option>
            </select>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Risk ID</th><th>Project</th><th>Description</th><th>Category</th>
                    <th>Impact</th><th>Score</th><th>Owner</th><th>Mitigation</th>
                    <th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-10 text-[#94a3b8] text-[13px]">No risks match your filters</td></tr>
                  )}
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td><span className="font-mono text-[11px] text-indigo-500 font-medium">{r.id}</span></td>
                      <td><span className="font-mono text-[11px] text-[#94a3b8]">{r.projectId || '—'}</span></td>
                      <td><span className="text-[#334155] font-medium">{r.description}</span></td>
                      <td><span className="text-[11px] px-2 py-0.5 rounded bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]">{r.category}</span></td>
                      <td>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${r.impact === 'High' ? 'bg-red-50 text-red-600 border-red-100' : r.impact === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                          {r.impact}
                        </span>
                      </td>
                      <td className="text-center font-semibold text-[#475569]">{r.score}</td>
                      <td className="text-[#64748b]">{r.owner}</td>
                      <td><span className="text-[11px] text-[#94a3b8] max-w-[180px] truncate block">{r.mitigation}</span></td>
                      <td><span className={`status-badge ${r.status === 'Open' ? 'in-progress' : 'completed'}`}>{r.status}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          {r.status === 'Open' && (
                            <button onClick={() => updateRisk(r.id, { status: 'Closed' })}
                              className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all font-medium border border-emerald-100">
                              Close
                            </button>
                          )}
                          {r.status === 'Closed' && (
                            <button onClick={() => updateRisk(r.id, { status: 'Open' })}
                              className="text-[10px] px-2 py-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all font-medium border border-amber-100">
                              Reopen
                            </button>
                          )}
                          <button onClick={() => { if (confirm(`Archive risk "${r.id}"?\n\nIt will be preserved in Risk History.`)) archiveRisk(r.id); }}
                            className="text-[10px] px-2 py-1 rounded bg-[#f8fafc] text-[#64748b] hover:bg-amber-50 hover:text-amber-600 transition-all font-medium border border-[#e2e8f0]">
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <RiskModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
