'use client';

import { useState } from 'react';
import { X, Link2, Lock, GitMerge, Save } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { departmentDisplayName, resolveHierarchy } from '@/lib/org-structure';
import { formatDate } from '@/lib/utils';
import type { ClassifiedDependency, DependencyTaskStatus } from '@/lib/mock-data';

const STATUS_OPTIONS: DependencyTaskStatus[] = ['Pending', 'In Progress', 'Resolved', 'Blocked'];

interface Props {
  /** Canonical parent project id (project_code). */
  parentId: string;
  /** The ClassifiedDependency.id this mirrored task represents. */
  depId: string;
  onClose: () => void;
}

/**
 * Dedicated read-only-parent / editable-task view for an INTERNAL mirrored
 * dependency. Replaces the standard Edit Project modal for mirror rows: the
 * dependent department can only update task-tracking fields, never the parent
 * project's own data (name, department, budget, priority, owner).
 */
export default function DependencyTaskModal({ parentId, depId, onClose }: Props) {
  const { projects, updateDependencyTask } = useData();
  const parent = projects.find(p => p.id === parentId && !p.isDependencyMirror);
  const dep = parent?.classifiedDependencies?.find(d => d.id === depId);

  const [form, setForm] = useState<Partial<ClassifiedDependency>>({
    assignedUser: dep?.assignedUser ?? dep?.owners?.[0] ?? '',
    status: dep?.status ?? 'Pending',
    progress: dep?.progress ?? 0,
    completionDate: dep?.completionDate ?? '',
    comments: dep?.comments ?? '',
    blockingReason: dep?.blockingReason ?? '',
  });

  if (!parent || !dep) {
    return (
      <Shell onClose={onClose} fromDept="">
        <p className="text-[13px] text-[var(--color-x-text-muted)] p-6">This dependency task no longer exists.</p>
      </Shell>
    );
  }

  const hierarchy = resolveHierarchy(parent.department, parent.subdivision);
  const fromDept = departmentDisplayName(parent.department);

  const save = () => {
    updateDependencyTask(parent.id, depId, form);
    onClose();
  };

  const input =
    'w-full bg-white border border-[var(--color-x-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--color-x-text)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50';
  const label = 'block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase tracking-wider';

  return (
    <Shell onClose={onClose} fromDept={fromDept}>
      {/* Read-only parent context */}
      <div className="px-6 pt-5">
        <div className="rounded-xl border border-[var(--color-x-border)] bg-[var(--color-x-bg)] p-4">
          <div className="flex items-center gap-1.5 mb-3 text-[11px] font-bold text-[var(--color-x-text-muted)] uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" /> Read-only — owned by {fromDept}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ReadField label="Parent Project" value={parent.name} />
            <ReadField label="Parent Department" value={hierarchy.verticalDisplay + (hierarchy.subdivision ? ` ↳ ${hierarchy.subdivision}` : '')} />
            <ReadField label="Source Project Owner" value={parent.owner} />
            <ReadField label="Dependency Type" value="Internal" />
            <ReadField label="Created Date" value={dep.createdDate ? formatDate(dep.createdDate) : '—'} />
            <ReadField label="Current Status" value={parent.status} />
          </div>
        </div>
      </div>

      {/* Editable task fields */}
      <div className="px-6 py-5 space-y-4">
        <h3 className="text-[12px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Your dependency task
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Assigned User</label>
            <input className={input} value={form.assignedUser || ''} onChange={e => setForm(f => ({ ...f, assignedUser: e.target.value }))} placeholder="Who owns this in your dept" />
          </div>
          <div>
            <label className={label}>Dependency Status</label>
            <select className={input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as DependencyTaskStatus }))}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Progress %</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={form.progress ?? 0} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} className="flex-1 accent-indigo-600" />
              <span className="text-[13px] font-bold text-[var(--color-x-text)] w-10 text-right">{form.progress ?? 0}%</span>
            </div>
          </div>
          <div>
            <label className={label}>Completion Date</label>
            <input type="date" className={input} value={form.completionDate || ''} onChange={e => setForm(f => ({ ...f, completionDate: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className={label}>Comments</label>
          <textarea className={`${input} resize-none`} rows={2} value={form.comments || ''} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} placeholder="Notes / updates for the parent team" />
        </div>
        {form.status === 'Blocked' && (
          <div>
            <label className={`${label} text-red-500`}>Blocking Reason</label>
            <textarea className={`${input} resize-none border-red-200 focus:border-red-400 focus:ring-red-50`} rows={2} value={form.blockingReason || ''} onChange={e => setForm(f => ({ ...f, blockingReason: e.target.value }))} placeholder="Why is this blocked?" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[var(--color-x-border)] flex items-center justify-end gap-2 bg-[var(--color-x-bg)]">
        <button onClick={onClose} className="x-btn x-btn-secondary">Cancel</button>
        <button onClick={save} className="x-btn x-btn-primary"><Save className="w-4 h-4" /> Save Task</button>
      </div>
    </Shell>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[var(--color-x-text-muted)] mb-0.5 uppercase tracking-wider">{label}</p>
      <p className="text-[13px] font-semibold text-[var(--color-x-text)]">{value || '—'}</p>
    </div>
  );
}

function Shell({ children, onClose, fromDept }: { children: React.ReactNode; onClose: () => void; fromDept: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center"><Link2 className="w-4 h-4 text-indigo-600" /></div>
            <div>
              <h2 className="text-[15px] font-bold text-[var(--color-x-text)]">Dependency Task</h2>
              {fromDept && (
                <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-600">
                  <GitMerge className="w-3 h-3" /> Task Migrated from {fromDept}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 text-[var(--color-x-text-muted)] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
