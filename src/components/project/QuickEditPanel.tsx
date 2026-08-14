'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2, Edit3, ListTodo, Plus, Save, Trash2, User, X } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useToast } from '@/components/ui';
import { BIAL_EMPLOYEES } from '@/lib/employee-data';
import { daysUntil, formatDate, canBeDelayed } from '@/lib/utils';
import { authedFetch } from '@/lib/supabase';
import DepartmentLabel from '@/components/DepartmentLabel';
import type { Project } from '@/lib/mock-data';
import type { Task } from '@/components/project/KanbanBoard';

const STATUS_OPTIONS = ['In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const TASK_STATUSES = ['Backlog', 'To Do', 'In Progress', 'Review', 'Completed'];
const EXTERNAL = '__external__';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPLOYEE_DEPARTMENTS = Array.from(new Set(BIAL_EMPLOYEES.map(e => e.department))).sort();

/**
 * The ONE quick-edit side panel, shared by Dashboard and Command Center (and
 * any future list view). Edits core project fields and manages the project's
 * task list — assign to an organization employee (department → person) or an
 * external user by email; assignees are notified by email either way.
 */
export default function QuickEditPanel({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { projects, updateProject } = useData();
  const router = useRouter();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  // Task form
  const [taskName, setTaskName] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskExtEmail, setTaskExtEmail] = useState('');
  const [taskDue, setTaskDue] = useState('');

  // Always render the LIVE project from context so task/field edits made
  // through this panel are immediately reflected.
  const live = useMemo(
    () => (project ? projects.find(p => p.id === project.id) ?? project : null),
    [project, projects],
  );

  if (!live) return null;
  const tasks = ((live.tasks as unknown as Task[]) ?? []);

  const startEdit = () => { setEditForm({ status: live.status, priority: live.priority, progress: live.progress, owner: live.owner }); setIsEditing(true); };
  const saveEdit = () => { updateProject(live.id, editForm); setIsEditing(false); };

  const setTasks = (updated: Task[]) => updateProject(live.id, { tasks: updated } as unknown as Partial<Project>);

  const notifyAssignee = async (to: string, assigneeName: string | null, name: string, due: string) => {
    try {
      const res = await authedFetch('/api/notify-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, assigneeName, taskName: name, projectId: live.id, projectName: live.name, dueDate: due }),
      });
      const j = await res.json().catch(() => ({} as { sent?: boolean; reason?: string }));
      if (res.ok && j.sent) toast(`Task assigned — notification emailed to ${to}.`, 'success');
      else toast(j.reason || 'Task assigned, but the email notification could not be sent.', 'info');
    } catch {
      toast('Task assigned, but the email notification could not be sent.', 'info');
    }
  };

  const addTask = async () => {
    if (!taskName.trim() || !taskAssignee) return;
    const isExternal = taskAssignee === EXTERNAL;
    const employee = BIAL_EMPLOYEES.find(e => e.id === taskAssignee);
    const extEmail = taskExtEmail.trim().toLowerCase();
    if (isExternal && !EMAIL_RE.test(extEmail)) { toast('Enter a valid email for the external assignee.', 'error'); return; }
    if (!isExternal && !employee) { toast('Select an assignee.', 'error'); return; }

    const today = new Date().toISOString().split('T')[0];
    const due = taskDue || today;
    const newTask: Task = {
      id: Math.random().toString(36).slice(2, 11),
      name: taskName.trim(),
      assignee: isExternal ? extEmail : employee!.name,
      assigneeEmail: isExternal ? extEmail : employee!.email,
      external: isExternal,
      status: 'To Do',
      priority: 'Medium',
      progress: 0,
      startDate: today,
      endDate: due,
      dueDate: due,
      responsible: isExternal ? 'External' : employee!.department,
      accountable: live.owner || 'Unassigned',
      consulted: '',
      informed: '',
    };
    setTasks([...tasks, newTask]);
    setTaskName(''); setTaskAssignee(''); setTaskExtEmail(''); setTaskDue('');
    await notifyAssignee(isExternal ? extEmail : employee!.email, isExternal ? null : employee!.name, newTask.name, due);
  };

  const days = daysUntil(live.targetDate);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[var(--color-x-surface)] shadow-2xl border-l border-[var(--color-x-border)] h-full overflow-y-auto animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-x-border)] flex items-center justify-between bg-gradient-to-r from-blue-50 to-sky-50 sticky top-0 z-10">
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-blue-500 font-bold">{live.id}</p>
            <h2 className="text-[14px] font-bold text-[var(--color-x-text)] leading-tight truncate">{live.name}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isEditing ? (
              <button onClick={startEdit} className="x-btn x-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[12px]"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
            ) : (
              <button onClick={saveEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[12px] font-bold hover:bg-emerald-700 transition-colors"><Save className="w-3.5 h-3.5" /> Save</button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 text-[var(--color-x-text-muted)]"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Deadline banner */}
          {days !== null && (
            <div className={`rounded-xl p-3 border flex items-center gap-2 ${days < 0 ? 'bg-red-50 border-red-200' : days <= 7 ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'}`}>
              <Calendar className={`w-4 h-4 ${days < 0 ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className={`text-[12px] font-bold ${days < 0 ? 'text-red-700' : 'text-amber-700'}`}>
                  {days < 0 ? `Overdue by ${Math.abs(days)} days` : `${days} days until deadline`}
                </p>
                <p className="text-[11px] text-[var(--color-x-text-muted)]">Target: {formatDate(live.targetDate)}{live.revisedDate ? ` · Revised: ${formatDate(live.revisedDate)}` : ''}</p>
              </div>
            </div>
          )}

          {/* Core fields */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase tracking-wider">Status</label>
            {isEditing ? (
              <>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Project['status'] }))} className="x-input w-full">
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} disabled={s === 'Delayed' && !canBeDelayed(live.targetDate)}>{s}</option>
                  ))}
                </select>
                {editForm.status === 'Delayed' && !canBeDelayed(live.targetDate) && (
                  <p className="text-[10px] text-red-500 mt-1">“Delayed” only applies once the Target Date ({formatDate(live.targetDate)}) has passed.</p>
                )}
              </>
            ) : <p className="text-[13px] font-semibold text-[var(--color-x-text)]">{live.status}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase tracking-wider">Priority</label>
            {isEditing ? (
              <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as Project['priority'] }))} className="x-input w-full">
                {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            ) : <p className="text-[13px] font-semibold text-[var(--color-x-text)]">{live.priority}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase tracking-wider">Progress</label>
            {isEditing ? (
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" value={editForm.progress ?? 0} onChange={e => setEditForm(f => ({ ...f, progress: Number(e.target.value) }))} className="flex-1 accent-blue-600" />
                <span className="text-[14px] font-bold text-[var(--color-x-text)] w-10 text-right">{editForm.progress}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="x-progress flex-1"><div className="x-progress-bar x-progress-indigo" style={{ width: `${live.progress}%` }} /></div>
                <span className="text-[14px] font-bold text-[var(--color-x-text)]">{live.progress}%</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase tracking-wider">Owner</label>
            {isEditing ? (
              <input value={editForm.owner || ''} onChange={e => setEditForm(f => ({ ...f, owner: e.target.value }))} className="x-input w-full" />
            ) : <p className="text-[13px] font-semibold text-[var(--color-x-text)]">{live.owner || '—'}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase tracking-wider">Department ↳ Subdivision</label>
            <DepartmentLabel department={live.department} subdivision={live.subdivision} variant="stacked" className="text-[13px]" />
          </div>

          {/* Tasks */}
          <div className="pt-2 border-t border-[var(--color-x-border)]">
            <label className="text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <ListTodo className="w-3.5 h-3.5 text-blue-500" /> Tasks ({tasks.length})
            </label>

            {tasks.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-[var(--color-x-border)] group">
                    <div className="min-w-0 flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${(t.status as string) === 'Completed' ? 'text-emerald-500' : 'text-[var(--color-x-text-muted)]'}`} />
                      <div className="min-w-0">
                        <p className={`text-[12px] font-medium truncate ${(t.status as string) === 'Completed' ? 'line-through text-[var(--color-x-text-muted)]' : 'text-[var(--color-x-text)]'}`}>{t.name}</p>
                        <p className="text-[10px] text-[var(--color-x-text-muted)] flex items-center gap-1"><User className="w-2.5 h-2.5" /> {t.assignee}{t.external ? ' · external' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <select
                        value={t.status}
                        onChange={e => setTasks(tasks.map(x => x.id === t.id ? { ...x, status: e.target.value as Task['status'], progress: e.target.value === 'Completed' ? 100 : x.progress } : x))}
                        className="text-[10px] font-semibold rounded-md px-1.5 py-1 border border-[var(--color-x-border)] bg-[var(--color-x-bg)] text-[var(--color-x-text-secondary)] cursor-pointer outline-none"
                      >
                        {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={() => setTasks(tasks.filter(x => x.id !== t.id))}
                        title="Delete task"
                        className="p-1 rounded text-[var(--color-x-text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Assign a new task */}
            <div className="rounded-xl border border-dashed border-[var(--color-x-border)] p-3 space-y-2">
              <input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="New task name…" className="x-input w-full text-[12px]" />
              <div className="flex gap-2">
                <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} className="x-input flex-1 text-[12px]">
                  <option value="">Assign to…</option>
                  <option value={EXTERNAL}>✉ External user (by email)</option>
                  {EMPLOYEE_DEPARTMENTS.map(d => (
                    <optgroup key={d} label={d}>
                      {BIAL_EMPLOYEES.filter(e => e.department === d).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} className="x-input w-[130px] text-[12px]" title="Due date" />
              </div>
              {taskAssignee === EXTERNAL && (
                <input value={taskExtEmail} onChange={e => setTaskExtEmail(e.target.value)} type="email" placeholder="external@company.com" className="x-input w-full text-[12px]" />
              )}
              <button
                onClick={addTask}
                disabled={!taskName.trim() || !taskAssignee || (taskAssignee === EXTERNAL && !taskExtEmail.trim())}
                className="x-btn x-btn-primary w-full flex items-center justify-center gap-1.5 py-1.5 text-[12px] disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Assign Task
              </button>
              <p className="text-[10px] text-[var(--color-x-text-muted)]">The assignee is notified by email when the task is assigned.</p>
            </div>
          </div>

          <button
            onClick={() => router.push(`/projects/${live.id}`)}
            className="w-full mt-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[13px] rounded-xl border border-blue-100 transition-colors"
          >
            Open Full Project Detail →
          </button>
        </div>
      </div>
    </div>
  );
}
