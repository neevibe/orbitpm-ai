'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit3, Calendar, User, Building2, AlertTriangle, Clock, Target, FileText, MessageSquare, Activity, CheckCircle2, Zap, Save, X, Trash2 } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils';
import type { Project } from '@/lib/mock-data';

const statusOptions = ['In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
const priorityOptions = ['Critical', 'High', 'Medium', 'Low'];

export default function ProjectDetailPage() {
  const params = useParams(); const router = useRouter();
  const projectId = params.id as string;
  const { projects, risks, updateProject, deleteProject } = useData();
  const project = projects.find(p => p.id === projectId);
  const projectRisks = risks.filter(r => r.projectId === projectId);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  if (!project) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center"><p className="text-[14px] font-semibold text-[#64748b] mb-2">Project not found</p>
        <button onClick={() => router.push('/projects')} className="btn-secondary text-[12px]"><ArrowLeft className="w-3.5 h-3.5" /> Back</button></div></div>
  );

  const startEdit = () => { setEditForm({ ...project }); setIsEditing(true); };
  const saveEdit = () => { updateProject(project.id, editForm); setIsEditing(false); };
  const handleDelete = () => { if (confirm(`Delete "${project.name}"?`)) { deleteProject(project.id); router.push('/projects'); } };

  const inputCls = "bg-white border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[13px] text-[#1e293b] outline-none focus:border-indigo-500 w-full";
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'risks', label: 'Risks', icon: AlertTriangle, count: projectRisks.length },
    { id: 'updates', label: 'Updates', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start gap-3">
        <button onClick={() => router.push('/projects')} className="mt-0.5 w-8 h-8 rounded-lg bg-white border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f8fafc] transition-all">
          <ArrowLeft className="w-4 h-4 text-[#64748b]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono text-indigo-500">{project.id}</span>
            {isEditing ? (
              <select value={editForm.status || project.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))} className="text-[11px] bg-white border border-[#e2e8f0] rounded px-2 py-0.5 outline-none">
                {statusOptions.map(s => <option key={s}>{s}</option>)}</select>
            ) : <span className={`status-badge ${getStatusColor(project.status)}`}>{project.status}</span>}
            {isEditing ? (
              <select value={editForm.priority || project.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as any }))} className="text-[11px] bg-white border border-[#e2e8f0] rounded px-2 py-0.5 outline-none">
                {priorityOptions.map(p => <option key={p}>{p}</option>)}</select>
            ) : <span className={`priority-badge ${getPriorityColor(project.priority)}`}>{project.priority}</span>}
          </div>
          {isEditing ? <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="text-xl font-bold text-[#0f172a] bg-transparent border-b-2 border-indigo-500 outline-none w-full" />
            : <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">{project.name}</h1>}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (<><button onClick={() => setIsEditing(false)} className="btn-secondary text-[12px]"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={saveEdit} className="btn-primary text-[12px]"><Save className="w-3.5 h-3.5" /> Save</button></>
          ) : (<><button onClick={handleDelete} className="p-2 rounded-lg text-red-400 bg-red-50 hover:bg-red-100 transition-all border border-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={startEdit} className="btn-primary text-[12px]"><Edit3 className="w-3.5 h-3.5" /> Edit</button></>)}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { icon: User, label: 'Owner', value: project.owner, color: 'text-indigo-500', editable: true, key: 'owner' },
          { icon: Building2, label: 'Department', value: project.department, color: 'text-purple-500' },
          { icon: Calendar, label: 'Start Date', value: formatDate(project.startDate), color: 'text-emerald-500' },
          { icon: Target, label: 'Target', value: formatDate(project.targetDate), color: 'text-amber-500' },
          { icon: AlertTriangle, label: 'Open Risks', value: `${projectRisks.filter(r => r.status === 'Open').length}`, color: 'text-red-500' },
        ].map(item => (
          <div key={item.label} className="glass-card p-3">
            <div className="flex items-center gap-1.5 mb-1"><item.icon className={`w-3.5 h-3.5 ${item.color}`} /><span className="text-[10px] text-[#94a3b8] font-medium">{item.label}</span></div>
            {isEditing && item.editable ? <input value={(editForm as any)[item.key!] || ''} onChange={e => setEditForm(f => ({ ...f, [item.key!]: e.target.value }))} className={`${inputCls} text-[12px]`} />
              : <p className="text-[12px] font-semibold text-[#1e293b] truncate">{item.value || '—'}</p>}
          </div>
        ))}
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-semibold text-[#334155]">Progress</h3>
          {isEditing ? (
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={editForm.progress ?? project.progress} onChange={e => setEditForm(f => ({ ...f, progress: Number(e.target.value) }))} className="w-36 accent-indigo-500" />
              <span className="text-xl font-bold text-[#0f172a] w-12 text-right">{editForm.progress ?? project.progress}%</span></div>
          ) : <span className="text-xl font-bold text-[#0f172a]">{project.progress}%</span>}
        </div>
        <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${(isEditing ? editForm.progress ?? project.progress : project.progress) >= 80 ? 'bg-emerald-500' : (isEditing ? editForm.progress ?? project.progress : project.progress) >= 50 ? 'bg-blue-500' : (isEditing ? editForm.progress ?? project.progress : project.progress) > 0 ? 'bg-indigo-500' : 'bg-[#e2e8f0]'}`}
            style={{ width: `${Math.max(isEditing ? editForm.progress ?? project.progress : project.progress, 2)}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-[#e2e8f0] pb-px">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-t-lg transition-all ${activeTab === tab.id ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-500' : 'text-[#64748b] hover:text-[#334155] hover:bg-[#f8fafc]'}`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
            {tab.count !== undefined && tab.count > 0 && <span className="px-1 py-0.5 text-[9px] font-bold bg-[#f1f5f9] rounded">{tab.count}</span>}</button>))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-3">
            {(project.objective || isEditing) && (
              <div className="glass-card p-4"><h3 className="text-[12px] font-semibold text-[#334155] mb-1.5">Business Objective</h3>
                {isEditing ? <textarea value={editForm.objective || ''} onChange={e => setEditForm(f => ({ ...f, objective: e.target.value }))} rows={2} className={`${inputCls} resize-none text-[12px]`} />
                  : <p className="text-[12px] text-[#64748b] leading-relaxed">{project.objective}</p>}</div>)}
            {(project.risks || isEditing) && (
              <div className="glass-card p-4 border-amber-100"><h3 className="text-[12px] font-semibold text-amber-600 mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Key Risks</h3>
                {isEditing ? <textarea value={editForm.risks || ''} onChange={e => setEditForm(f => ({ ...f, risks: e.target.value }))} rows={2} className={`${inputCls} resize-none text-[12px]`} />
                  : <p className="text-[12px] text-[#64748b] leading-relaxed">{project.risks}</p>}</div>)}
            {(project.notes || isEditing) && (
              <div className="glass-card p-4"><h3 className="text-[12px] font-semibold text-[#334155] mb-1.5">Notes</h3>
                {isEditing ? <textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={`${inputCls} resize-none text-[12px]`} />
                  : <p className="text-[12px] text-[#64748b] leading-relaxed">{project.notes}</p>}</div>)}
          </div>
          <div className="glass-card p-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-indigo-100 self-start">
            <div className="flex items-center gap-1.5 mb-1.5"><Zap className="w-3.5 h-3.5 text-indigo-500" /><h3 className="text-[12px] font-semibold text-indigo-700">AI Health Assessment</h3></div>
            <p className="text-[12px] text-[#475569] leading-relaxed">
              {project.progress === 0 && project.priority === 'Critical' ? `⚠️ Critical project with 0% progress. Immediate action needed.`
                : project.status === 'Delayed' ? `🚨 This project is delayed. Review blockers and consider timeline adjustment.`
                : project.progress > 50 ? `✅ Good progress at ${project.progress}%. On track for delivery.`
                : `📊 Early stages. Monitor progress velocity to ensure target date feasibility.`}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="glass-card overflow-hidden">
          {projectRisks.length > 0 ? (
            <table className="data-table"><thead><tr><th>Risk ID</th><th>Description</th><th>Category</th><th>Impact</th><th>Mitigation</th><th>Status</th></tr></thead>
              <tbody>{projectRisks.map(r => (<tr key={r.id}><td><span className="font-mono text-[11px] text-indigo-500">{r.id}</span></td><td className="text-[#334155]">{r.description}</td>
                <td><span className="text-[11px] px-2 py-0.5 rounded bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]">{r.category}</span></td>
                <td><span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${r.impact === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{r.impact}</span></td>
                <td className="text-[#94a3b8] text-[11px]">{r.mitigation}</td><td><span className={`status-badge ${r.status === 'Open' ? 'in-progress' : 'completed'}`}>{r.status}</span></td></tr>))}</tbody></table>
          ) : <div className="p-10 text-center"><CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><p className="text-[12px] text-[#94a3b8]">No risks registered</p></div>}
        </div>
      )}

      {activeTab === 'updates' && <div className="glass-card p-8 text-center"><MessageSquare className="w-8 h-8 text-[#cbd5e1] mx-auto mb-2" /><p className="text-[12px] text-[#94a3b8]">No updates yet</p></div>}
      {activeTab === 'documents' && <div className="glass-card p-8 text-center"><FileText className="w-8 h-8 text-[#cbd5e1] mx-auto mb-2" /><p className="text-[12px] text-[#94a3b8]">No documents uploaded</p></div>}
    </div>
  );
}
