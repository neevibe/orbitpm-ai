'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2, Wand2, Lock, IndianRupee, AlertCircle } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { generateProjectId, parseINR, formatINRCompact } from '@/lib/utils';
import {
  TOP_LEVEL_DEPARTMENTS, getSubdivisions, hasSubdivisions, departmentDisplayName,
} from '@/lib/org-structure';
import { employeesForDepartment } from '@/lib/employee-data';
import NotesLog from '@/components/NotesLog';
import DependencyBuilder from '@/components/modals/DependencyBuilder';
import type { Project, ClassifiedDependency } from '@/lib/mock-data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editProject?: Project | null;
  defaultDepartment?: string;
  defaultSubdivision?: string;
}

const statusOptions = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'] as const;
const priorityOptions = ['Critical', 'High', 'Medium', 'Low'] as const;

export default function ProjectModal({ isOpen, onClose, editProject, defaultDepartment, defaultSubdivision }: Props) {
  const { addProject, updateProject, archiveProject, purgeProject, departments, projects } = useData();
  const { isSuperAdmin, department: userDepartment, canModifyDepartment } = useAuth();

  // Canonical verticals (org-structure config). Non-super-admins are limited to
  // departments they may modify.
  const deptNames = useMemo(() => {
    if (isSuperAdmin) return TOP_LEVEL_DEPARTMENTS;
    return TOP_LEVEL_DEPARTMENTS.filter(d => canModifyDepartment(d));
  }, [isSuperAdmin, canModifyDepartment]);

  const allProjectIds = useMemo(() => projects.map(p => p.id), [projects]);

  const makeEmpty = (dept?: string) => ({
    id: '', name: '', department: dept || (isSuperAdmin ? deptNames[0] : userDepartment) || deptNames[0] || '',
    subdivision: '',
    owner: '', status: 'Not Started' as Project['status'], progress: 0,
    priority: 'Medium' as Project['priority'],
    startDate: '', targetDate: '',
    risks: '', objective: '', notes: '',
    projectDependencies: '', supportTeam: '', kpi: '',
    totalBudget: '', utilizedBudget: '',
  });

  const [form, setForm] = useState(makeEmpty());
  const [deps, setDeps] = useState<ClassifiedDependency[]>([]);
  const [autoId, setAutoId] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Sync form when modal opens / edit project changes
  useEffect(() => {
    if (!isOpen) return;
    setErrors([]);
    if (editProject) {
      setForm({
        id: editProject.id, name: editProject.name, department: editProject.department,
        subdivision: editProject.subdivision || '',
        owner: editProject.owner, status: editProject.status, progress: editProject.progress,
        priority: editProject.priority, startDate: editProject.startDate || '',
        targetDate: editProject.targetDate || '', risks: editProject.risks || '',
        objective: editProject.objective || '', notes: editProject.notes || '',
        projectDependencies: editProject.projectDependencies || '',
        supportTeam: editProject.supportTeam || '',
        kpi: editProject.kpi || '',
        totalBudget: editProject.totalBudget != null ? String(editProject.totalBudget) : '',
        utilizedBudget: editProject.utilizedBudget != null ? String(editProject.utilizedBudget) : '',
      });
      setDeps(editProject.classifiedDependencies || []);
      setAutoId('');
    } else {
      const dept = defaultDepartment || deptNames[0] || '';
      const empty = makeEmpty(dept);
      if (defaultSubdivision) {
        empty.subdivision = defaultSubdivision;
      }
      setForm(empty);
      setDeps([]);
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

  // Permission: can the current user modify this project / target department?
  const canModify = editProject
    ? canModifyDepartment(editProject.department)
    : canModifyDepartment(form.department);
  const readOnly = !canModify;

  const subdivisions = getSubdivisions(form.department);
  const subdivisionRequired = hasSubdivisions(form.department);

  // Project Owner options = employees mapped to the selected department. The
  // current owner is always kept selectable (so editing a legacy project whose
  // owner isn't in the roster — or a multi-name owner — never loses the value).
  const ownerOptions = useMemo(() => {
    const names = employeesForDepartment(form.department).map(e => e.name);
    if (form.owner && !names.includes(form.owner)) return [form.owner, ...names];
    return names;
  }, [form.department, form.owner]);

  const validateForm = (): string[] => {
    const e: string[] = [];
    if (!form.name.trim()) e.push('Project Name');
    if (!form.department) e.push('Department');
    if (subdivisionRequired && !form.subdivision) e.push('Sub-department');
    if (!form.owner.trim()) e.push('Project Owner');
    if (!form.priority) e.push('Priority');
    if (!form.startDate) e.push('Start Date');
    if (!form.targetDate) e.push('End Date');
    if (!form.status) e.push('Status');
    return e;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (readOnly) return; // defense-in-depth: block writes outside the user's department
    if (!canModifyDepartment(form.department)) return;

    const missing = validateForm();
    if (missing.length > 0) {
      setErrors(missing);
      return;
    }
    setErrors([]);

    const payload: Partial<Project> = {
      ...form,
      id: editProject ? editProject.id : (form.id || autoId),
      subdivision: form.subdivision || null,
      startDate: form.startDate || null,
      targetDate: form.targetDate || null,
      totalBudget: parseINR(form.totalBudget),
      utilizedBudget: parseINR(form.utilizedBudget),
      classifiedDependencies: deps,
    };
    if (editProject) {
      updateProject(editProject.id, payload);
    } else {
      addProject(payload as Omit<Project, 'id'> & { id?: string });
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
          <h2 className="text-[15px] font-bold text-[#0f172a]">{editProject ? (readOnly ? 'View Project' : 'Edit Project') : 'Create New Project'}</h2>
          <div className="flex items-center gap-2">
            {editProject && !readOnly && (
              <button onClick={handleArchive} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all text-[11px] font-semibold">
                <Trash2 className="w-3.5 h-3.5" /> Archive
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] transition-all"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Read-only banner — user cannot modify this department */}
          {readOnly && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-slate-600">View-only</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  You can view projects across all departments, but you can only add or edit projects in
                  {userDepartment ? <> your department (<strong>{userDepartment}</strong>)</> : ' your assigned department'}.
                </p>
              </div>
            </div>
          )}

          <fieldset disabled={readOnly} className="space-y-4 m-0 p-0 border-0 disabled:opacity-95">
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

          <div className={`grid ${subdivisionRequired ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
            <div><label className={labelCls}>Department *</label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value, subdivision: '', owner: '' }))} required disabled={!isSuperAdmin} className={`${inputCls} disabled:bg-[#f8fafc] disabled:text-[#64748b]`}>
                {deptNames.map(d => <option key={d} value={d}>{departmentDisplayName(d)}</option>)}
              </select>
              {!isSuperAdmin && <p className="text-[10px] text-[#94a3b8] mt-1">Locked to your department</p>}
            </div>
            {subdivisionRequired && (
              <div><label className={labelCls}>Sub-department *</label>
                <select value={form.subdivision} onChange={e => setForm(f => ({ ...f, subdivision: e.target.value }))} required className={inputCls}>
                  <option value="">Select…</option>
                  {subdivisions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div><label className={labelCls}>Project Owner *</label>
              <select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} required disabled={!form.department} className={inputCls}>
                <option value="">{form.department ? 'Select owner…' : 'Select a department first'}</option>
                {ownerOptions.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              {form.department && ownerOptions.length === 0 && (
                <p className="text-[10px] text-[#94a3b8] mt-1">No employees mapped to {departmentDisplayName(form.department)}.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Status *</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} required className={inputCls}>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className={labelCls}>Priority / Criticality *</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))} required className={inputCls}>
                {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className={labelCls}>Progress %</label>
              <input type="number" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} className={inputCls} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required className={inputCls} /></div>
            <div><label className={labelCls}>Target Date *</label>
              <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} required className={inputCls} /></div>
          </div>

          {/* Financial management (INR) */}
          <div className="border-t border-[#f1f5f9] pt-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
              <IndianRupee className="w-3.5 h-3.5" /> Financial Management (₹)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Total Budget</label>
                <input type="text" inputMode="decimal" value={form.totalBudget} onChange={e => setForm(f => ({ ...f, totalBudget: e.target.value }))}
                  placeholder="e.g. 2500000 or 2.5 Cr" className={inputCls} />
                <p className="text-[10px] text-[#94a3b8] mt-1">{formatINRCompact(parseINR(form.totalBudget))}</p>
              </div>
              <div>
                <label className={labelCls}>Utilized Budget</label>
                <input type="text" inputMode="decimal" value={form.utilizedBudget} onChange={e => setForm(f => ({ ...f, utilizedBudget: e.target.value }))}
                  placeholder="e.g. 40,00,000" className={inputCls} />
                <p className="text-[10px] text-[#94a3b8] mt-1">{formatINRCompact(parseINR(form.utilizedBudget))}</p>
              </div>
              <div>
                <label className={labelCls}>Balance Budget</label>
                <div className={`${inputCls} bg-[#f8fafc] text-[#1e293b] font-semibold flex items-center`}>
                  {formatINRCompact((parseINR(form.totalBudget) || 0) - (parseINR(form.utilizedBudget) || 0))}
                </div>
                <p className="text-[10px] text-[#94a3b8] mt-1">Auto: Total − Utilized</p>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="border-t border-[#f1f5f9] pt-4">
            <div>
              <label className={labelCls}>Support Team</label>
              <input type="text" value={form.supportTeam} onChange={e => setForm(f => ({ ...f, supportTeam: e.target.value }))}
                placeholder="e.g., IT Team, Vendor XYZ" className={inputCls} />
              <p className="text-[10px] text-[#94a3b8] mt-1">Team members or vendors supporting this project</p>
            </div>
          </div>

          {/* Dependency details (classified internal/external) */}
          <div className="border-t border-[#f1f5f9] pt-4">
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
              Dependency Details <span className="font-normal normal-case tracking-normal text-[#cbd5e1]">(optional)</span>
            </p>
            <DependencyBuilder value={deps} onChange={setDeps} readOnly={readOnly} />
          </div>

          <div><label className={labelCls}>Business Objective</label>
            <textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} rows={2} placeholder="What outcome does this project achieve?" className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>KPI (Key Performance Indicators)</label>
            <textarea value={form.kpi || ''} onChange={e => setForm(f => ({ ...f, kpi: e.target.value }))} rows={2} placeholder="e.g. 90% uptime, 15% revenue increase, NPS > 8" className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Key Risks / Blockers</label>
            <textarea value={form.risks} onChange={e => setForm(f => ({ ...f, risks: e.target.value }))} rows={2} placeholder="Known risks, blockers..." className={`${inputCls} resize-none`} /></div>
          <div><label className={labelCls}>Notes <span className="text-[10px] font-normal text-[#94a3b8]">(each entry is timestamped)</span></label>
            <NotesLog value={form.notes} onAdd={next => setForm(f => ({ ...f, notes: next }))} readOnly={readOnly}
              inputClassName={`${inputCls} flex-1`}
              buttonClassName="flex items-center gap-1 px-3 rounded-lg text-[12px] font-semibold text-white bg-[#e86c2d] whitespace-nowrap" /></div>
          </fieldset>

          {errors.length > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-red-700">Please complete the required fields</p>
                <p className="text-[11px] text-red-600 leading-relaxed">{errors.join(' · ')}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#f1f5f9]">
            <div>
              {editProject && !readOnly && (
                <button type="button" onClick={() => { if(confirm(`Permanently delete project ${editProject.id}?`)) { purgeProject(editProject.id); onClose(); } }} className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all font-semibold border border-transparent hover:border-red-100">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Project
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={onClose} className="btn-secondary text-[12px]">{readOnly ? 'Close' : 'Cancel'}</button>
              {!readOnly && (
                <button type="submit" className="btn-primary text-[12px]">
                  <Save className="w-3.5 h-3.5" /> {editProject ? 'Save Changes' : 'Create Project'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
