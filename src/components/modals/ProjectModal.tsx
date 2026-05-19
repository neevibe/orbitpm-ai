'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2, Wand2 } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { generateProjectId } from '@/lib/utils';
import type { Project } from '@/lib/mock-data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editProject?: Project | null;
  defaultDepartment?: string;
}

const statusOptions = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'] as const;
const priorityOptions = ['Critical', 'High', 'Medium', 'Low'] as const;

export default function ProjectModal({ isOpen, onClose, editProject, defaultDepartment }: Props) {
  const { addProject, updateProject, archiveProject, purgeProject, departments, projects } = useData();

  const deptNames = useMemo(() => departments.map(d => d.name), [departments]);
  const allProjectIds = useMemo(() => projects.map(p => p.id), [projects]);

  const makeEmpty = (dept?: string) => ({
    id: '', name: '', department: dept || deptNames[0] || '',
    owner: '', status: 'Not Started' as Project['status'], progress: 0,
    priority: 'Medium' as Project['priority'],
    startDate: '', targetDate: '',
    risks: '', objective: '', notes: '',
    projectDependencies: '', supportTeam: '', kpi: '',
  });

  const [form, setForm] = useState(makeEmpty());
  const [autoId, setAutoId] = useState('');

  // Sync form when modal opens / edit project changes
  useEffect(() => {
    if (!isOpen) return;
    if (editProject) {
      setForm({
        id: editProject.id, name: editProject.name, department: editProject.department,
        owner: editProject.owner, status: editProject.status, progress: editProject.progress,
        priority: editProject.priority, startDate: editProject.startDate || '',
        targetDate: editProject.targetDate || '', risks: editProject.risks || '',
        objective: editProject.objective || '', notes: editProject.notes || '',
        projectDependencies: editProject.projectDependencies || '',
        supportTeam: editProject.supportTeam || '',
        kpi: editProject.kpi || '',
      });
      setAutoId('');
    } else {
      const dept = defaultDepartment || deptNames[0] || '';
      const empty = makeEmpty(dept);
      setForm(empty);
      setAutoId(generateProjectId(dept, allProjectIds));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProject, isOpen]);

  // Auto-update preview ID when department changes (new project only)
  useEffect(() => {
    if (!editProject && form.department) {
      setAutoId(generateProjectId(form.department, allProjectIds));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.department, editProject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.department || !form.owner) return;
    const payload = {
      ...form,
      id: editProject ? editProject.id : (form.id || autoId),
      startDate: form.startDate || null,
      targetDate: form.targetDate || null,
    };
    if (editProject) {
      updateProject(editProject.id, payload);
    } else {
      addProject(payload);
    }
    onClose();
  };

  const handleArchive = () => {
    if (editProject && confirm(`Archive "${editProject.name}"?\n\nThis moves it to History. You can restore it anytime.`)) {
      archiveProject(editProject.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  const inputCls = "w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#1e293b] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 placeholder:text-[#94a3b8]";
  const labelCls = "block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-[#e2e8f0] rounded-xl shadow-2xl animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-[#f1f5f9] px-5 py-3.5 flex items-center justify-between z-10">
          <h2 className="text-[15px] font-bold text-[#0f172a]">{editProject ? 'Edit Project' : 'Create New Project'}</h2>
          <div className="flex items-center gap-2">
            {editProject && (
              <button onClick={handleArchive} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all text-[11px] font-semibold">
                <Trash2 className="w-3.5 h-3.5" /> Archive
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] transition-all"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Auto-generated ID preview */}
          {!editProject && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <Wand2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Auto-Generated Project ID</p>
                <p className="text-[14px] font-bold text-indigo-700 font-mono">{autoId || '—'}</p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-indigo-400 mb-1">Override (optional)</label>
                <input type="text" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                  placeholder={autoId} className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-[12px] font-mono text-indigo-700 outline-none focus:border-indigo-400 w-36" />
              </div>
            </div>
          )}

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={labelCls}>Project Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter project name" required className={inputCls} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Department *</label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} required className={inputCls}>
                {deptNames.map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div><label className={labelCls}>Project Owner *</label>
              <input type="text" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Owner name" required className={inputCls} /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className={inputCls}>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className={labelCls}>Priority / Criticality</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))} className={inputCls}>
                {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className={labelCls}>Progress %</label>
              <input type="number" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} className={inputCls} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Target Date</label>
              <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} className={inputCls} /></div>
          </div>

          {/* New required fields */}
          <div className="border-t border-[#f1f5f9] pt-4">
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Team & Dependencies</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Support Team</label>
                <input type="text" value={form.supportTeam} onChange={e => setForm(f => ({ ...f, supportTeam: e.target.value }))}
                  placeholder="e.g., IT Team, Vendor XYZ" className={inputCls} />
                <p className="text-[10px] text-[#94a3b8] mt-1">Team members or vendors supporting this project</p>
              </div>
              <div>
                <label className={labelCls}>Project Dependencies</label>
                <input type="text" value={form.projectDependencies} onChange={e => setForm(f => ({ ...f, projectDependencies: e.target.value }))}
                  placeholder="e.g., PRDIGI_03, PROPR_01" className={inputCls} />
                <p className="text-[10px] text-[#94a3b8] mt-1">Project IDs this project depends on</p>
              </div>
            </div>
          </div>

          <div><label className={labelCls}>Business Objective</label>
            <textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} rows={2} placeholder="What outcome does this project achieve?" className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>KPI (Key Performance Indicators)</label>
            <textarea value={form.kpi || ''} onChange={e => setForm(f => ({ ...f, kpi: e.target.value }))} rows={2} placeholder="e.g. 90% uptime, 15% revenue increase, NPS > 8" className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Key Risks / Blockers</label>
            <textarea value={form.risks} onChange={e => setForm(f => ({ ...f, risks: e.target.value }))} rows={2} placeholder="Known risks, blockers..." className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional notes..." className={`${inputCls} resize-none`} /></div>

          <div className="flex items-center justify-between pt-4 border-t border-[#f1f5f9]">
            <div>
              {editProject && (
                <button type="button" onClick={() => { if(confirm(`Permanently delete project ${editProject.id}?`)) { purgeProject(editProject.id); onClose(); } }} className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all font-semibold border border-transparent hover:border-red-100">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Project
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={onClose} className="btn-secondary text-[12px]">Cancel</button>
              <button type="submit" className="btn-primary text-[12px]">
                <Save className="w-3.5 h-3.5" /> {editProject ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
