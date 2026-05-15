'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { riskCategories } from '@/lib/mock-data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RiskModal({ isOpen, onClose }: Props) {
  const { addRisk, projects, departments } = useData();
  const [selectedDept, setSelectedDept] = useState('');
  const [form, setForm] = useState({
    projectId: '', description: '', category: riskCategories[0],
    impact: 'Medium' as 'High' | 'Medium' | 'Low',
    likelihood: 2, owner: '', mitigation: '', targetDate: '',
  });

  // Filter projects by department
  const filteredProjects = projects.filter(p => !selectedDept || p.department === selectedDept);

  // Auto-populate project name preview
  const selectedProject = projects.find(p => p.id === form.projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.projectId) return;
    const impactVal = form.impact === 'High' ? 3 : form.impact === 'Medium' ? 2 : 1;
    const score = impactVal * form.likelihood;
    addRisk({
      ...form, score,
      severity: score >= 6 ? 'High' : score >= 3 ? 'Medium' : 'Low',
      status: 'Open',
    });
    setForm({ projectId: '', description: '', category: riskCategories[0], impact: 'Medium', likelihood: 2, owner: '', mitigation: '', targetDate: '' });
    setSelectedDept('');
    onClose();
  };

  if (!isOpen) return null;

  const inputCls = "w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#1e293b] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 placeholder:text-[#94a3b8]";
  const labelCls = "block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white border border-[#e2e8f0] rounded-xl shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[90vh]">
        <div className="border-b border-[#f1f5f9] px-5 py-3.5 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-[15px] font-bold text-[#0f172a]">Add Risk</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9]"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto overflow-x-hidden">
          {/* Multi-step Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Step 1: Select Department</label>
              <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setForm(f => ({ ...f, projectId: '' })); }} className={inputCls}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Step 2: Select Project *</label>
              <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} required className={inputCls}>
                <option value="">Select a project...</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name.substring(0, 40)}...</option>)}
              </select>
            </div>
          </div>

          {/* Detailed Project Information View */}
          {selectedProject && (
            <div className="px-4 py-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
                <h3 className="text-[13px] font-bold text-[#0f172a]">{selectedProject.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedProject.status === 'Delayed' ? 'bg-red-50 text-red-600' : 
                  selectedProject.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>{selectedProject.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-tight">Owner</p><p className="text-[11px] font-medium text-[#334155]">{selectedProject.owner}</p></div>
                <div><p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-tight">Priority</p><p className="text-[11px] font-medium text-[#334155]">{selectedProject.priority}</p></div>
                <div><p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-tight">Progress</p><p className="text-[11px] font-medium text-[#334155]">{selectedProject.progress}%</p></div>
              </div>
              <div><p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-tight">Objective</p><p className="text-[11px] text-[#475569] leading-relaxed line-clamp-2">{selectedProject.objective || 'No objective defined'}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-tight">Dependencies</p><p className="text-[11px] text-[#475569] truncate">{selectedProject.projectDependencies || 'None'}</p></div>
                <div><p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-tight">Supporting Team</p><p className="text-[11px] text-[#475569] truncate">{selectedProject.supportTeam || 'Not specified'}</p></div>
              </div>
              {selectedProject.kpi && (
                <div><p className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-tight">KPI</p><p className="text-[11px] text-[#475569] italic">{selectedProject.kpi}</p></div>
              )}
            </div>
          )}

          <div>
            <label className={labelCls}>Risk Description *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} required placeholder="Describe the risk..." className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>{riskCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className={labelCls}>Owner</label><input type="text" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder={selectedProject?.owner || 'Risk owner'} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Impact</label><select value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value as any }))} className={inputCls}><option value="High">High (3)</option><option value="Medium">Medium (2)</option><option value="Low">Low (1)</option></select></div>
            <div><label className={labelCls}>Likelihood (1-3)</label><input type="number" min={1} max={3} value={form.likelihood} onChange={e => setForm(f => ({ ...f, likelihood: Number(e.target.value) }))} className={inputCls} /></div>
            <div>
              <label className={labelCls}>Risk Score</label>
              <div className={`h-9 rounded-lg flex items-center justify-center font-bold text-[14px] border ${
                (form.impact === 'High' ? 3 : form.impact === 'Medium' ? 2 : 1) * form.likelihood >= 6
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : (form.impact === 'High' ? 3 : form.impact === 'Medium' ? 2 : 1) * form.likelihood >= 3
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-green-50 text-green-600 border-green-200'
              }`}>
                {(form.impact === 'High' ? 3 : form.impact === 'Medium' ? 2 : 1) * form.likelihood}
              </div>
            </div>
          </div>
          <div><label className={labelCls}>Mitigation Plan</label><textarea value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} rows={2} placeholder="How will this risk be mitigated?" className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Target Resolution Date</label><input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} className={inputCls} /></div>
          <div className="flex justify-end gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-[12px]">Cancel</button>
            <button type="submit" className="btn-primary text-[12px]"><Save className="w-3.5 h-3.5" /> Add Risk</button>
          </div>
        </form>
      </div>
    </div>
  );
}
