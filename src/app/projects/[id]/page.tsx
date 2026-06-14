'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit3, Calendar, User, Building2, AlertTriangle, Clock, Target, FileText, MessageSquare, Activity, CheckCircle2, Zap, Save, X, Trash2, DollarSign, ListTodo, Plus } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils';
import type { Project, Allocation } from '@/lib/mock-data';

const statusOptions = ['In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
const priorityOptions = ['Critical', 'High', 'Medium', 'Low'];

export default function ProjectDetailPage() {
  const params = useParams(); const router = useRouter();
  const projectId = params.id as string;
  const { projects, risks, updateProject, deleteProject, addProject, splitProject, departments } = useData();
  const project = projects.find(p => p.id === projectId);
  const projectRisks = risks.filter(r => r.projectId === projectId);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocationsForm, setAllocationsForm] = useState<Allocation[]>([]);

  if (!project) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <p className="text-[14px] font-semibold text-[var(--color-x-text-muted)] mb-2">Project not found</p>
        <button onClick={() => router.push('/projects')} className="x-btn x-btn-secondary"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
      </div>
    </div>
  );

  const startEdit = () => { setEditForm({ ...project }); setIsEditing(true); };
  const saveEdit = () => { updateProject(project.id, editForm); setIsEditing(false); };
  const handleDelete = () => { if (confirm(`Delete "${project.name}"?`)) { deleteProject(project.id); router.push('/projects'); } };
  
  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTaskName,
      assignee: newTaskAssignee || project.owner || 'Unassigned',
      status: 'Not Started' as const
    };
    updateProject(project.id, { tasks: [...(project.tasks || []), newTask] });
    setIsTaskModalOpen(false);
    setNewTaskName('');
    setNewTaskAssignee('');
  };

  const [isSplitWizardOpen, setIsSplitWizardOpen] = useState(false);
  const [splitCount, setSplitCount] = useState<number>(2);
  const [splitsForm, setSplitsForm] = useState<{ department: string, percentage: number }[]>([]);

  const openSplitWizard = () => {
    setSplitCount(2);
    setSplitsForm([
      { department: project.department, percentage: 50 },
      { department: '', percentage: 50 }
    ]);
    setIsSplitWizardOpen(true);
  };

  const handleSplitCountChange = (count: number) => {
    const safeCount = Math.max(1, Math.min(count, 10));
    setSplitCount(safeCount);
    const equalPct = Math.floor(100 / safeCount);
    const remainder = 100 - (equalPct * safeCount);
    
    const newSplits = Array.from({ length: safeCount }).map((_, i) => ({
      department: i === 0 ? project.department : '',
      percentage: equalPct + (i === 0 ? remainder : 0)
    }));
    setSplitsForm(newSplits);
  };

  const handleSaveSplit = () => {
    const total = splitsForm.reduce((sum, s) => sum + Number(s.percentage), 0);
    if (total !== 100) {
      alert("Total split percentage must equal exactly 100%");
      return;
    }
    if (splitsForm.some(s => !s.department)) {
      alert("Please select a target department for all splits.");
      return;
    }
    splitProject(project.id, splitsForm);
    setIsSplitWizardOpen(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, count: project.tasks?.length || 0 },
    { id: 'dependencies', label: 'Dependencies', icon: Target, count: project.detailedDependencies?.length || (project.projectDependencies ? 1 : 0) },
    { id: 'risks', label: 'Risks', icon: AlertTriangle, count: projectRisks.length },
    { id: 'updates', label: 'Updates', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-6xl">
      <div className="flex items-start gap-4">
        <button onClick={() => router.push('/projects')} className="mt-1 w-9 h-9 rounded-xl bg-[var(--color-x-surface)] border border-[var(--color-x-border)] flex items-center justify-center hover:bg-[var(--color-x-bg)] transition-all shadow-sm">
          <ArrowLeft className="w-4 h-4 text-[var(--color-x-text-secondary)]" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[12px] font-mono font-semibold text-indigo-600 tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{project.id}</span>
            {isEditing ? (
              <select value={editForm.status || project.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))} className="x-input py-1 text-[12px] w-32">
                {statusOptions.map(s => <option key={s}>{s}</option>)}</select>
            ) : <span className={`x-badge ${getStatusColor(project.status) === 'bg-emerald-500' ? 'x-badge-green' : getStatusColor(project.status) === 'bg-red-500' ? 'x-badge-red' : getStatusColor(project.status) === 'bg-amber-400' ? 'x-badge-amber' : getStatusColor(project.status) === 'bg-blue-500' ? 'x-badge-blue' : 'x-badge-gray'}`}>{project.status}</span>}
            {isEditing ? (
              <select value={editForm.priority || project.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as any }))} className="x-input py-1 text-[12px] w-32">
                {priorityOptions.map(p => <option key={p}>{p}</option>)}</select>
            ) : <span className={`x-priority-${project.priority.toLowerCase()}`}>{project.priority}</span>}
          </div>
          {isEditing ? <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="text-2xl font-bold text-[var(--color-x-text)] bg-transparent border-b-2 border-indigo-500 outline-none w-full pb-1" />
            : <h1 className="text-2xl font-bold text-[var(--color-x-text)] tracking-tight">{project.name}</h1>}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (<><button onClick={() => setIsEditing(false)} className="x-btn x-btn-secondary"><X className="w-4 h-4" /> Cancel</button>
            <button onClick={saveEdit} className="x-btn x-btn-primary"><Save className="w-4 h-4" /> Save</button></>
          ) : (<><button onClick={handleDelete} className="p-2.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-all border border-red-100"><Trash2 className="w-4 h-4" /></button>
            <button onClick={openSplitWizard} className="x-btn x-btn-secondary"><Target className="w-4 h-4" /> Split Project</button>
            <button onClick={startEdit} className="x-btn x-btn-secondary"><Edit3 className="w-4 h-4" /> Edit</button></>)}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { icon: User, label: 'Owner', value: project.owner, color: 'text-indigo-500', editable: true, key: 'owner' },
          { icon: Building2, label: 'Department', value: project.department, color: 'text-purple-500' },
          { icon: Calendar, label: 'Start Date', value: formatDate(project.startDate), color: 'text-emerald-500' },
          { icon: Target, label: 'Target Date', value: formatDate(project.targetDate), color: 'text-amber-500' },
          { icon: AlertTriangle, label: 'Open Risks', value: `${projectRisks.filter(r => r.status === 'Open').length}`, color: 'text-red-500' },
        ].map(item => (
          <div key={item.label} className="x-card p-4 hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2 mb-2"><item.icon className={`w-4 h-4 ${item.color}`} /><span className="text-[11px] text-[var(--color-x-text-muted)] font-bold uppercase tracking-wider">{item.label}</span></div>
            {isEditing && item.editable ? <input value={(editForm as any)[item.key!] || ''} onChange={e => setEditForm(f => ({ ...f, [item.key!]: e.target.value }))} className="x-input" />
              : <p className="text-[13px] font-bold text-[var(--color-x-text)] truncate">{item.value || '—'}</p>}
          </div>
        ))}
      </div>

      <div className="x-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)]">Execution Progress</h3>
          {isEditing ? (
            <div className="flex items-center gap-4">
              <input type="range" min="0" max="100" value={editForm.progress ?? project.progress} onChange={e => setEditForm(f => ({ ...f, progress: Number(e.target.value) }))} className="w-48 accent-indigo-600" />
              <span className="text-xl font-bold text-[var(--color-x-text)] w-12 text-right">{editForm.progress ?? project.progress}%</span></div>
          ) : <span className="text-xl font-bold text-[var(--color-x-text)]">{project.progress}%</span>}
        </div>
        <div className="w-full h-3 bg-[var(--color-x-bg)] border border-[var(--color-x-border)] rounded-full overflow-hidden shadow-inner">
          <div className={`h-full rounded-full transition-all duration-500 ${(isEditing ? editForm.progress ?? project.progress : project.progress) >= 80 ? 'bg-emerald-500' : (isEditing ? editForm.progress ?? project.progress : project.progress) >= 50 ? 'bg-indigo-500' : (isEditing ? editForm.progress ?? project.progress : project.progress) > 0 ? 'bg-purple-500' : 'bg-[var(--color-x-border)]'}`}
            style={{ width: `${Math.max(isEditing ? editForm.progress ?? project.progress : project.progress, 2)}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-[var(--color-x-border)] pb-px mt-8">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-t-xl transition-all ${activeTab === tab.id ? 'text-indigo-700 bg-indigo-50 border-b-2 border-indigo-600' : 'text-[var(--color-x-text-secondary)] hover:text-[var(--color-x-text)] hover:bg-[var(--color-x-bg)] border-b-2 border-transparent'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
            {tab.count !== undefined && tab.count > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-white border border-[var(--color-x-border)] shadow-sm rounded-md">{tab.count}</span>}</button>))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {project.allocations && project.allocations.length > 0 && (
              <div className="x-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><Target className="w-4 h-4 text-indigo-500" /> Responsibility Allocation</h3>
                </div>
                <div className="flex w-full h-4 rounded-full overflow-hidden mb-3 border border-[var(--color-x-border)] shadow-inner">
                  {project.allocations.map((a, i) => (
                    <div key={a.id} className={`${['bg-indigo-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-rose-500'][i % 6]} hover:brightness-110 transition-all`} style={{ width: `${a.percentage}%` }} title={`${a.target} (${a.percentage}%)`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  {project.allocations.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-2 text-[12px]">
                      <div className={`w-2.5 h-2.5 rounded-full ${['bg-indigo-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-rose-500'][i % 6]}`} />
                      <span className="font-bold text-[var(--color-x-text)]">{a.target || 'Unassigned'}</span>
                      <span className="text-[var(--color-x-text-muted)]">({a.percentage}%)</span>
                      <span className="text-[10px] uppercase font-bold text-[var(--color-x-text-muted)] bg-[var(--color-x-bg)] px-1.5 py-0.5 rounded">{a.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(project.objective || isEditing) && (
              <div className="x-card p-5"><h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-2">Business Objective</h3>
                {isEditing ? <textarea value={editForm.objective || ''} onChange={e => setEditForm(f => ({ ...f, objective: e.target.value }))} rows={2} className="x-input resize-none" />
                  : <p className="text-[13px] text-[var(--color-x-text-secondary)] leading-relaxed">{project.objective}</p>}</div>)}
            {(project.kpi || isEditing) && (
              <div className="x-card p-5"><h3 className="text-[13px] font-bold text-emerald-600 mb-2">Key Performance Indicators</h3>
                {isEditing ? <textarea value={editForm.kpi || ''} onChange={e => setEditForm(f => ({ ...f, kpi: e.target.value }))} rows={2} className="x-input resize-none" />
                  : <p className="text-[13px] text-[var(--color-x-text-secondary)] leading-relaxed">{project.kpi}</p>}</div>)}
            {(project.risks || isEditing) && (
              <div className="x-card p-5 border-amber-200 bg-amber-50/30"><h3 className="text-[13px] font-bold text-amber-700 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Key Risks Summary</h3>
                {isEditing ? <textarea value={editForm.risks || ''} onChange={e => setEditForm(f => ({ ...f, risks: e.target.value }))} rows={2} className="x-input resize-none" />
                  : <p className="text-[13px] text-[var(--color-x-text-secondary)] leading-relaxed">{project.risks}</p>}</div>)}
            {(project.notes || isEditing) && (
              <div className="x-card p-5"><h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-2">Notes</h3>
                {isEditing ? <textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="x-input resize-none" />
                  : <p className="text-[13px] text-[var(--color-x-text-secondary)] leading-relaxed">{project.notes}</p>}</div>)}
          </div>
          <div className="col-span-1 space-y-4">
            <div className="x-card p-5 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border-indigo-100/50">
              <div className="flex items-center gap-2 mb-2"><div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-indigo-600" /></div><h3 className="text-[13px] font-bold text-indigo-800">AI Health Assessment</h3></div>
              <p className="text-[12px] text-indigo-900/80 leading-relaxed font-medium">
                {project.progress === 0 && project.priority === 'Critical' ? `⚠️ Critical project with 0% progress. Immediate action needed.`
                  : project.status === 'Delayed' ? `🚨 This project is delayed. Review blockers and consider timeline adjustment.`
                  : project.progress > 50 ? `✅ Good progress at ${project.progress}%. On track for delivery.`
                  : `📊 Early stages. Monitor progress velocity to ensure target date feasibility.`}
              </p>
            </div>
            
            {(project.supportTeam || isEditing) && (
              <div className="x-card p-5">
                <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-2">Supporting Team</h3>
                {isEditing ? <input value={editForm.supportTeam || ''} onChange={e => setEditForm(f => ({ ...f, supportTeam: e.target.value }))} className="x-input" placeholder="e.g. IT, Vendors..." />
                  : <p className="text-[12px] text-[var(--color-x-text-secondary)] font-medium">{project.supportTeam}</p>}
              </div>
            )}
            
            <div className="x-card p-5 border-emerald-100">
              <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-3 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-emerald-500" /> Financials</h3>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase">Budget</label>
                    <input type="number" value={editForm.financials?.budget || project.financials?.budget || 0} onChange={e => setEditForm(f => ({ ...f, financials: { ...f.financials, budget: Number(e.target.value), spent: f.financials?.spent || project.financials?.spent || 0 } }))} className="x-input py-1.5 text-[12px]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase">Spent</label>
                    <input type="number" value={editForm.financials?.spent || project.financials?.spent || 0} onChange={e => setEditForm(f => ({ ...f, financials: { ...f.financials, spent: Number(e.target.value), budget: f.financials?.budget || project.financials?.budget || 0 } }))} className="x-input py-1.5 text-[12px]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase">Budget</span>
                      <span className="text-[15px] font-bold text-[var(--color-x-text)]">${(project.financials?.budget || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase">Spent</span>
                      <span className="text-[15px] font-bold text-indigo-600">${(project.financials?.spent || 0).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--color-x-bg)] rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(((project.financials?.spent || 0) / (project.financials?.budget || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Legacy dependency string visualization (if any and not migrated) */}
            {(project.projectDependencies && !project.detailedDependencies?.length && isEditing) && (
              <div className="x-card p-5">
                <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-2">Legacy Dependencies</h3>
                <input value={editForm.projectDependencies || ''} onChange={e => setEditForm(f => ({ ...f, projectDependencies: e.target.value }))} className="x-input" placeholder="e.g. PRDIGI_03..." />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dependencies' && (
        <div className="x-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><Target className="w-4 h-4 text-indigo-500" /> Dependency Management Framework</h3>
            <button onClick={() => {
              const newDep = { id: Math.random().toString(36).substring(2), description: 'New Dependency', allocations: [] };
              updateProject(project.id, { detailedDependencies: [...(project.detailedDependencies || []), newDep] });
            }} className="x-btn x-btn-primary flex items-center gap-2 py-1.5 px-3 text-[11px]"><Plus className="w-3.5 h-3.5" /> Add Dependency</button>
          </div>
          
          {(project.detailedDependencies || []).length > 0 ? (
            <div className="space-y-4">
              {project.detailedDependencies!.map(dep => (
                <div key={dep.id} className="p-4 rounded-xl border border-[var(--color-x-border)] bg-[var(--color-x-bg)]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={dep.description}
                        onChange={e => {
                          const newDeps = project.detailedDependencies!.map(d => d.id === dep.id ? { ...d, description: e.target.value } : d);
                          updateProject(project.id, { detailedDependencies: newDeps });
                        }}
                        className="text-[14px] font-bold text-[var(--color-x-text)] bg-transparent border-b border-transparent hover:border-[var(--color-x-border)] focus:border-indigo-500 outline-none w-full pb-0.5 transition-colors" 
                        placeholder="Dependency Description (e.g., API Integration from IT)"
                      />
                    </div>
                    <button 
                      onClick={() => updateProject(project.id, { detailedDependencies: project.detailedDependencies!.filter(d => d.id !== dep.id) })}
                      className="p-1.5 text-[var(--color-x-text-muted)] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Dependency Allocation Area */}
                  <div className="pl-4 border-l-2 border-indigo-100 mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-wider">Stakeholder Ownership Split</span>
                      <button 
                        onClick={() => {
                          const newDeps = [...project.detailedDependencies!];
                          const dIdx = newDeps.findIndex(d => d.id === dep.id);
                          newDeps[dIdx].allocations.push({ id: Math.random().toString(36).substring(2), type: 'department', target: '', percentage: 0 });
                          updateProject(project.id, { detailedDependencies: newDeps });
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        + Assign Owner
                      </button>
                    </div>
                    
                    {dep.allocations.length > 0 ? (
                      <div className="space-y-2">
                        {/* Visual Bar */}
                        <div className="flex w-full h-2 rounded-full overflow-hidden border border-[var(--color-x-border)]">
                          {dep.allocations.map((a, i) => (
                            <div key={a.id} className={`${['bg-indigo-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500'][i % 5]}`} style={{ width: `${a.percentage}%` }} title={`${a.target} (${a.percentage}%)`} />
                          ))}
                        </div>
                        {/* Allocation Rows */}
                        {dep.allocations.map((alloc, aIdx) => (
                          <div key={alloc.id} className="flex items-center gap-2">
                            <select 
                              value={alloc.type} 
                              onChange={e => {
                                const newDeps = [...project.detailedDependencies!];
                                const dIdx = newDeps.findIndex(d => d.id === dep.id);
                                newDeps[dIdx].allocations[aIdx].type = e.target.value as 'individual' | 'department';
                                updateProject(project.id, { detailedDependencies: newDeps });
                              }}
                              className="x-input py-1 px-2 text-[11px] w-28 bg-white"
                            >
                              <option value="individual">Individual</option>
                              <option value="department">Department</option>
                            </select>
                            
                            {alloc.type === 'department' ? (
                              <select 
                                value={alloc.target}
                                onChange={e => {
                                  const newDeps = [...project.detailedDependencies!];
                                  const dIdx = newDeps.findIndex(d => d.id === dep.id);
                                  newDeps[dIdx].allocations[aIdx].target = e.target.value;
                                  updateProject(project.id, { detailedDependencies: newDeps });
                                }}
                                className="x-input py-1 px-2 text-[11px] flex-1 bg-white"
                              >
                                <option value="">Select Department...</option>
                                {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                              </select>
                            ) : (
                              <input 
                                type="text" 
                                value={alloc.target}
                                onChange={e => {
                                  const newDeps = [...project.detailedDependencies!];
                                  const dIdx = newDeps.findIndex(d => d.id === dep.id);
                                  newDeps[dIdx].allocations[aIdx].target = e.target.value;
                                  updateProject(project.id, { detailedDependencies: newDeps });
                                }}
                                placeholder="Person Name"
                                className="x-input py-1 px-2 text-[11px] flex-1 bg-white"
                              />
                            )}
                            
                            <div className="flex items-center gap-1">
                              <input 
                                type="number" 
                                min="0" max="100" 
                                value={alloc.percentage}
                                onChange={e => {
                                  const newDeps = [...project.detailedDependencies!];
                                  const dIdx = newDeps.findIndex(d => d.id === dep.id);
                                  newDeps[dIdx].allocations[aIdx].percentage = Number(e.target.value);
                                  updateProject(project.id, { detailedDependencies: newDeps });
                                }}
                                className="x-input py-1 px-2 text-[11px] w-14 text-right bg-white"
                              />
                              <span className="text-[11px] font-bold text-[var(--color-x-text-muted)]">%</span>
                            </div>
                            
                            <button 
                              onClick={() => {
                                const newDeps = [...project.detailedDependencies!];
                                const dIdx = newDeps.findIndex(d => d.id === dep.id);
                                newDeps[dIdx].allocations = newDeps[dIdx].allocations.filter(a => a.id !== alloc.id);
                                updateProject(project.id, { detailedDependencies: newDeps });
                              }}
                              className="p-1 text-[var(--color-x-text-muted)] hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[var(--color-x-text-muted)] italic">No ownership allocated yet. Split the responsibility above.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-[var(--color-x-bg)] rounded-xl border border-dashed border-[var(--color-x-border)]">
              <Target className="w-8 h-8 text-[var(--color-x-text-muted)] opacity-50 mx-auto mb-2" />
              <p className="text-[13px] font-bold text-[var(--color-x-text)]">No dependencies</p>
              <p className="text-[12px] text-[var(--color-x-text-secondary)] mt-1 max-w-sm mx-auto">Track cross-department and individual dependencies with precise percentage-based ownership splits.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="x-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5"><ListTodo className="w-4 h-4 text-indigo-500" /> Project Tasks & Steps</h3>
            <button onClick={() => setIsTaskModalOpen(true)} className="x-btn x-btn-primary flex items-center gap-2 py-1.5 px-3 text-[11px]"><Plus className="w-3.5 h-3.5" /> Add Task</button>
          </div>
          {(project.tasks || []).length > 0 ? (
            <div className="space-y-2">
              {project.tasks!.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-x-border)] hover:border-indigo-200 hover:bg-indigo-50/20 transition-colors group">
                  <div className="flex items-center gap-3">
                    <button className="text-[var(--color-x-text-muted)] hover:text-emerald-500 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                    <div>
                      <p className="text-[13px] font-medium text-[var(--color-x-text)]">{task.name}</p>
                      <p className="text-[11px] text-[var(--color-x-text-muted)] flex items-center gap-1 mt-0.5"><User className="w-3 h-3" /> {task.assignee}</p>
                    </div>
                  </div>
                  <span className={`x-badge ${task.status === 'Done' ? 'x-badge-green' : task.status === 'In Progress' ? 'x-badge-blue' : 'x-badge-gray'}`}>{task.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-[var(--color-x-border)] rounded-xl">
              <ListTodo className="w-8 h-8 text-[var(--color-x-text-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-[13px] font-medium text-[var(--color-x-text)]">No tasks assigned</p>
              <p className="text-[11px] text-[var(--color-x-text-muted)]">Break this project down into assignable steps.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="x-card-flush overflow-hidden">
          {projectRisks.length > 0 ? (
            <table className="x-table">
              <thead><tr><th>Risk ID</th><th>Description</th><th>Category</th><th>Impact</th><th>Mitigation</th><th>Status</th></tr></thead>
              <tbody>{projectRisks.map(r => (<tr key={r.id}>
                <td><span className="font-mono text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{r.id}</span></td>
                <td className="text-[12px] font-medium text-[var(--color-x-text)]">{r.description}</td>
                <td><span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-x-bg)] text-[var(--color-x-text-secondary)] border border-[var(--color-x-border)]">{r.category}</span></td>
                <td><span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${r.impact === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{r.impact}</span></td>
                <td className="text-[var(--color-x-text-secondary)] text-[12px]">{r.mitigation}</td>
                <td><span className={`x-badge ${r.status === 'Open' ? 'x-badge-blue' : 'x-badge-green'}`}>{r.status}</span></td></tr>))}</tbody></table>
          ) : <div className="p-16 text-center"><CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" /><p className="text-[13px] font-medium text-[var(--color-x-text-muted)]">No risks registered</p></div>}
        </div>
      )}

      {activeTab === 'updates' && <div className="x-card p-16 text-center"><MessageSquare className="w-10 h-10 text-[var(--color-x-border)] mx-auto mb-3" /><p className="text-[13px] font-medium text-[var(--color-x-text-muted)]">No updates yet</p></div>}
      {activeTab === 'documents' && <div className="x-card p-16 text-center"><FileText className="w-10 h-10 text-[var(--color-x-border)] mx-auto mb-3" /><p className="text-[13px] font-medium text-[var(--color-x-text-muted)]">No documents uploaded</p></div>}
      
      {/* Add Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-5 py-4 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
              <h2 className="text-[15px] font-bold text-[var(--color-x-text)]">Add New Task</h2>
              <button onClick={() => setIsTaskModalOpen(false)} className="p-1.5 rounded-full hover:bg-black/5 text-[var(--color-x-text-muted)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase">Task Name</label>
                <input 
                  type="text" 
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="x-input w-full" 
                  placeholder="e.g. Gather requirements" 
                  autoFocus 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase">Assignee</label>
                <input 
                  type="text" 
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="x-input w-full" 
                  placeholder="e.g. John Doe" 
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--color-x-border)] mt-4">
                <button onClick={() => setIsTaskModalOpen(false)} className="x-btn x-btn-secondary">Cancel</button>
                <button onClick={handleAddTask} className="x-btn x-btn-primary" disabled={!newTaskName.trim()}>Save Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Project Wizard */}
      {isSplitWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-5 py-4 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
              <h2 className="text-[15px] font-bold text-[var(--color-x-text)]">Split Project Wizard</h2>
              <button onClick={() => setIsSplitWizardOpen(false)} className="p-1.5 rounded-full hover:bg-black/5 text-[var(--color-x-text-muted)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                <label className="block text-[12px] font-bold text-indigo-800 mb-2">How many ways do you want to split this project?</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="2" max="10" 
                    value={splitCount}
                    onChange={e => handleSplitCountChange(Number(e.target.value))}
                    className="x-input py-1.5 px-3 text-[14px] w-24 font-bold"
                  />
                  <span className="text-[12px] text-indigo-600">This will physically clone the project into target departments.</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-wider px-2">
                  <span>Target Department</span>
                  <span>Ownership %</span>
                </div>
                {splitsForm.map((split, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-[var(--color-x-bg)] p-3 rounded-lg border border-[var(--color-x-border)]">
                    <div className="flex-1">
                      <select 
                        value={split.department}
                        onChange={e => {
                          const newSplits = [...splitsForm];
                          newSplits[idx].department = e.target.value;
                          setSplitsForm(newSplits);
                        }}
                        className="x-input py-1.5 px-3 text-[13px] w-full font-semibold"
                      >
                        <option value="">Select Department...</option>
                        {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2 w-28 bg-white border border-[var(--color-x-border)] rounded-lg px-3 py-1.5">
                      <input 
                        type="number" 
                        min="1" max="100" 
                        value={split.percentage}
                        onChange={e => {
                          const newSplits = [...splitsForm];
                          newSplits[idx].percentage = Number(e.target.value);
                          setSplitsForm(newSplits);
                        }}
                        className="w-12 text-right outline-none font-bold text-[13px]"
                      />
                      <span className="text-[13px] font-bold text-[var(--color-x-text-muted)]">%</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-x-border)]">
                <div className="text-[12px] font-medium text-[var(--color-x-text-muted)]">
                  Total: <strong className={splitsForm.reduce((s, x) => s + Number(x.percentage), 0) === 100 ? 'text-emerald-500' : 'text-red-500'}>
                    {splitsForm.reduce((s, x) => s + Number(x.percentage), 0)}%
                  </strong>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsSplitWizardOpen(false)} className="x-btn x-btn-secondary">Cancel</button>
                  <button onClick={handleSaveSplit} className="x-btn x-btn-primary bg-indigo-600 hover:bg-indigo-700">Split & Clone Project</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
