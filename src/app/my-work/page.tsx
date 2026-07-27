'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { isProjectOwner } from '@/lib/utils';
import { UserCircle2, FolderKanban, Rocket, CalendarClock, ListTodo, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import type { Task } from '@/components/project/KanbanBoard';
import type { Project } from '@/lib/mock-data';

/**
 * My Work — the personal tier of the three dashboard levels
 * (Portfolio → Command Center · Personal → here · Project → /projects/[id]).
 * Everything owned by or assigned to the signed-in user, in one place.
 */

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

export default function MyWorkPage() {
  const { projects, updateProject } = useData();
  const { user, isDemoMode } = useAuth();

  const fullName = isDemoMode
    ? 'Demo User'
    : (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || '';
  const email = user?.email || '';

  const myProjects = useMemo(
    () => projects.filter(p => !p.archived && isProjectOwner(p.owner, fullName, email)),
    [projects, fullName, email],
  );

  const myTasks = useMemo(() => {
    const nameLower = fullName.toLowerCase();
    const emailLower = email.toLowerCase();
    const out: { task: Task; project: Project }[] = [];
    for (const p of projects) {
      if (p.archived) continue;
      const tasks = (p.tasks as unknown as Task[]) ?? [];
      for (const t of tasks) {
        const byName = nameLower && t.assignee?.toLowerCase() === nameLower;
        const byEmail = emailLower && t.assigneeEmail?.toLowerCase() === emailLower;
        if (byName || byEmail) out.push({ task: t, project: p });
      }
    }
    return out.sort((a, b) => (a.task.dueDate || '9999').localeCompare(b.task.dueDate || '9999'));
  }, [projects, fullName, email]);

  const active = myProjects.filter(p => p.status !== 'Completed');
  const dueSoon = active.filter(p => {
    const d = daysUntil(p.targetDate);
    return d !== null && d >= 0 && d <= 7;
  });
  const overdue = active.filter(p => {
    const d = daysUntil(p.targetDate);
    return d !== null && d < 0;
  });
  const openTasks = myTasks.filter(({ task }) => task.status !== 'Completed');

  const toggleTask = (project: Project, task: Task) => {
    const tasks = ((project.tasks as unknown as Task[]) ?? []).map(t =>
      t.id === task.id ? { ...t, status: (t.status === 'Completed' ? 'To Do' : 'Completed') as Task['status'] } : t,
    );
    updateProject(project.id, { tasks } as unknown as Partial<Project>);
  };

  const metrics = [
    { label: 'My Projects', value: myProjects.length, icon: FolderKanban, accent: '#6366f1', trend: { tone: 'flat', text: `${myProjects.length - active.length} completed` } },
    { label: 'Active', value: active.length, icon: Rocket, accent: '#3b82f6', trend: { tone: overdue.length > 0 ? 'down' : 'flat', text: overdue.length > 0 ? `${overdue.length} overdue` : 'none overdue' } },
    { label: 'Due This Week', value: dueSoon.length, icon: CalendarClock, accent: '#f59e0b', trend: { tone: dueSoon.length > 0 ? 'warn' : 'flat', text: dueSoon.length > 0 ? 'plan the week' : 'clear runway' } },
    { label: 'My Open Tasks', value: openTasks.length, icon: ListTodo, accent: '#8b5cf6', trend: { tone: 'flat', text: `${myTasks.length - openTasks.length} done` } },
  ];

  return (
    <div className="x-page space-y-5">
      <div>
        <h1 className="x-page-title flex items-center gap-2">
          <UserCircle2 className="w-5 h-5 text-sky-500" /> My Work
        </h1>
        <p className="x-page-subtitle">Everything owned by or assigned to {fullName || 'you'}, in one place</p>
      </div>

      {/* Personal KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="x-metric" style={{ '--metric-accent': m.accent } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-2">
              <m.icon className="w-4 h-4" style={{ color: m.accent }} />
            </div>
            <p className="x-metric-value">{m.value}</p>
            <p className="x-metric-label">{m.label}</p>
            <span className={`x-metric-trend ${m.trend.tone}`}>
              {m.trend.tone === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {m.trend.tone === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {m.trend.text}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* My projects */}
        <div className="col-span-12 lg:col-span-7 x-card-flush">
          <div className="px-4 py-3 border-b border-[var(--color-x-border)]">
            <h3 className="text-[14px] font-bold text-[var(--color-x-text)]">My Projects</h3>
          </div>
          {myProjects.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <FolderKanban className="w-8 h-8 mx-auto text-[var(--color-x-text-faint)] mb-3" />
              <p className="text-[13px] font-semibold text-[var(--color-x-text)]">Nothing on your plate yet</p>
              <p className="text-[12px] text-[var(--color-x-text-muted)] mt-1 mb-4">Projects you own will show up here automatically.</p>
              <Link href="/projects" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 transition-colors">
                Browse projects
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="x-table">
                <thead>
                  <tr><th>Project</th><th>Status</th><th>Priority</th><th>Progress</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {myProjects.map(p => {
                    const d = daysUntil(p.targetDate);
                    return (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/projects/${p.id}`} className="font-semibold text-[var(--color-x-text)] hover:text-indigo-600 transition-colors">
                            {p.name}
                          </Link>
                          <p className="text-[11px] text-[var(--color-x-text-muted)]">{p.department}</p>
                        </td>
                        <td><span className={`status-badge ${p.status.toLowerCase().replace(' ', '-')}`}>{p.status}</span></td>
                        <td><span className={`x-priority-${p.priority.toLowerCase()}`}>{p.priority}</span></td>
                        <td>
                          <div className="flex items-center gap-2 min-w-[90px]">
                            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-x-border)] overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-[11px] font-semibold">{p.progress}%</span>
                          </div>
                        </td>
                        <td className={`whitespace-nowrap text-[12px] ${d !== null && d < 0 && p.status !== 'Completed' ? 'text-red-600 font-semibold' : ''}`}>
                          {fmtDate(p.targetDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* My tasks */}
        <div className="col-span-12 lg:col-span-5 x-card-flush">
          <div className="px-4 py-3 border-b border-[var(--color-x-border)] flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[var(--color-x-text)]">My Tasks</h3>
            <span className="text-[11px] font-semibold text-[var(--color-x-text-muted)] uppercase tracking-wider">{openTasks.length} open</span>
          </div>
          {myTasks.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <ListTodo className="w-8 h-8 mx-auto text-[var(--color-x-text-faint)] mb-3" />
              <p className="text-[13px] font-semibold text-[var(--color-x-text)]">No tasks assigned to you</p>
              <p className="text-[12px] text-[var(--color-x-text-muted)] mt-1">Tasks appear here when someone assigns you one from a project&apos;s Tasks tab.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-x-border)]">
              {myTasks.map(({ task, project }) => {
                const done = task.status === 'Completed';
                const d = daysUntil(task.dueDate);
                return (
                  <div key={`${project.id}-${task.id}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-x-bg)] transition-colors duration-200">
                    <button
                      onClick={() => toggleTask(project, task)}
                      title={done ? 'Mark as not done' : 'Mark as done'}
                      aria-label={done ? `Reopen task ${task.name}` : `Complete task ${task.name}`}
                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                        done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--color-x-border-hover)] hover:border-emerald-400'
                      }`}
                    >
                      {done && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium leading-tight truncate ${done ? 'line-through text-[var(--color-x-text-muted)]' : 'text-[var(--color-x-text)]'}`}>
                        {task.name}
                      </p>
                      <Link href={`/projects/${project.id}`} className="text-[11px] text-[var(--color-x-text-muted)] hover:text-indigo-600 transition-colors truncate block">
                        {project.name}
                      </Link>
                    </div>
                    {task.dueDate && (
                      <span className={`text-[11px] whitespace-nowrap ${!done && d !== null && d < 0 ? 'text-red-600 font-semibold' : 'text-[var(--color-x-text-muted)]'}`}>
                        {fmtDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
