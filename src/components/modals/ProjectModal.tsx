'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { useData } from '@/lib/data-context';
import type { Project } from '@/lib/mock-data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editProject?: Project | null;
}

const statusOptions = ['In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
const priorityOptions = ['Critical', 'High', 'Medium', 'Low'];

export default function ProjectModal({ isOpen, onClose, editProject }: Props) {
  const { addProject, updateProject, deleteProject, departments } = useData();
  const deptNames = departments.map(d => d.name);

  const [form, setForm] = useState({
    id: '', name: '', department: deptNames[0] || '', owner: '',
    status: 'Not Started' as Project['status'], progress: 0,
    priority: 'Medium' as Project['priority'],
    startDate: '', targetDate: '', risks: '', objective: '', notes: '',
  });

  useEffect(() => {
    if (editProject) {
      setForm({
        id: editProject.id, name: editProject.name, department: editProject.department,
        owner: editProject.owner, status: editProject.status, progress: editProject.progress,
        priority: editProject.priority, startDate: editProject.startDate || '',
        targetDate: editProject.targetDate || '', risks: editProject.risks || '',
        objective: editProject.objective || '', notes: editProject.notes || '',
      });
    } else {
      setForm({ id: '', name: '', department: deptNames[0] || '', owner: '', status: 'Not Started', progress: 0, priority: 'Medium', startDate: '', targetDate: '', risks: '', objective: '', notes: '' });
    }
  }, [editProject, isOpen, deptNames]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.department || !form.owner) return;
    const projectData = { ...form, startDate: form.startDate || null, targetDate: form.targetDate || null };
    if (editProject) { updateProject(editProject.id, projectData); }
    else { addProject(projectData); }
    onClose();
  };

  const handleDelete = () => {
    if (editProject && confirm(`Delete "${editProject.name}"?`)) { deleteProject(editProject.id); onClose(); }
  };

  if (!isOpen) return null;

  const inputCls = "w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#1e293b] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 placeholder:text-[#94a3b8]";
  const labelCls = "block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-[#e2e8f0] rounded-xl shadow-2xl animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-[#f1f5f9] px-5 py-3.5 flex items-center justify-between z-10">
          <h2 className="text-[15px] font-bold text-[#0f172a]">{editProject ? 'Edit Project' : 'Create New Project'}</h2>
          <div className="flex items-center gap-2">
            {editProject && <button onClick={handleDelete} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>}
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] transition-all"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Project ID</label><input type="text" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="Auto" disabled={!!editProject} className={`${inputCls} disabled:opacity-50 font-mono`} /></div>
            <div className="col-span-2"><label className={labelCls}>Project Name *</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter project name" required className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Department *</label><select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} required className={inputCls}>{deptNames.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><label className={labelCls}>Owner *</label><input type="text" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Owner name" required className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className={inputCls}>{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className={labelCls}>Priority</label><select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))} className={inputCls}>{priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className={labelCls}>Progress %</label><input type="number" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Start Date</label><input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Target Date</label><input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Business Objective</label><textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} rows={2} placeholder="What outcome does this project achieve?" className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Key Risks / Blockers</label><textarea value={form.risks} onChange={e => setForm(f => ({ ...f, risks: e.target.value }))} rows={2} placeholder="Known risks, blockers..." className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional notes..." className={`${inputCls} resize-none`} /></div>
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-[12px]">Cancel</button>
            <button type="submit" className="btn-primary text-[12px]"><Save className="w-3.5 h-3.5" /> {editProject ? 'Save Changes' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
