'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase, isSupabaseConfigured, getAccessToken, authedFetch } from './supabase';
import { useAuth } from './auth-context';
import { generateProjectId, daysUntil, normalizeProjectStatus, reconcileStatusProgress, canBeDelayed, formatDate } from './utils';
import { toast } from '@/components/ui/Toaster';
import {
  projects as initialProjects,
  departments as initialDepartments,
  risks as initialRisks,
  notifications as initialNotifications,
  type Project,
  type Risk,
  type Department,
  type ClassifiedDependency,
} from './mock-data';
import { DEMO_PROJECTS, DEMO_RISKS, DEMO_NOTIFICATIONS, DEMO_DEPARTMENTS } from './demo-data';
import { DEMO_USER_NAME } from './auth-context';

/**
 * POST a project/risk mutation to the server, attaching the caller's Supabase
 * access token so the persistent audit trail can attribute the change to the
 * real signed-in user (not a hardcoded name). Never throws, but a failed write
 * MUST reach the user via onFailure — the local state already shows the change,
 * so a silent server failure means work that evaporates on the next refresh.
 */
async function persistProjectMutation(
  body: Record<string, unknown>,
  onFailure?: (message: string) => void,
) {
  try {
    const token = await getAccessToken();
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as { error?: string }));
      throw new Error(j.error || `Server responded ${res.status}`);
    }
  } catch (err) {
    console.error('Error persisting mutation:', err);
    onFailure?.(err instanceof Error ? err.message : 'Could not reach the server');
  }
}

// ============================================
// TYPES
// ============================================

export interface AuditEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'project' | 'department' | 'risk' | 'blocker';
  entityId: string;
  entityName: string;
  changes: Record<string, { old: any; new: any }>;
  user: string;
  timestamp: Date;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'warning' | 'critical' | 'insight' | 'info' | 'success';
  time: string;
  read: boolean;
}

interface DataContextType {
  /** 'live' = register loaded from the server · 'cached' = still on bundled
   *  fallback (loading or demo) · 'error' = server refresh FAILED — what's on
   *  screen is not live data and the UI must say so. */
  liveStatus: 'live' | 'cached' | 'error';
  /** Visibility scope applied by the server (Phase 1 departmental privacy).
   *  null until the first successful live load (and always null in demo). */
  scope: { admin: boolean; department: string | null; shared: number } | null;
  /** Organization-wide aggregate counts (numbers only) — lets the dashboard
   *  show full-company figures even when detail rows are department-scoped. */
  orgStats: Record<string, number> | null;
  // Data
  projects: Project[];
  archivedProjects: Project[];
  departments: Department[];
  risks: Risk[];
  notifications: Notification[];
  auditLog: AuditEntry[];

  // Computed KPIs
  kpi: {
    totalProjects: number;
    inProgress: number;
    completed: number;
    delayed: number;
    notStarted: number;
    onHold: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    openRisks: number;
    closedRisks: number;
    totalRisks: number;
    stuckProjects: number;
    needsEscalation: number;
    ownerBottlenecks: number;
  };

  // Project CRUD
  addProject: (project: Omit<Project, 'id'> & { id?: string }) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  /** Update a single internal dependency task inside a parent project. Permissioned
   *  to the dependency's TARGET (dependent) department, not the parent's.
   *  Returns true if the DB write succeeded, false otherwise. */
  updateDependencyTask: (parentId: string, depId: string, patch: Partial<ClassifiedDependency>) => Promise<boolean>;
  splitProject: (originalId: string, splits: { department: string, owner?: string, percentage: number }[]) => void;
  deleteProject: (id: string) => void;       // kept for compatibility — now archives
  archiveProject: (id: string) => void;       // soft-delete: moves to history
  restoreProject: (id: string) => void;       // restore from history
  purgeProject: (id: string) => void;         // permanent delete (from history only)
  generateId: (department: string) => string; // auto-generate next ID for dept

  // Department CRUD
  addDepartment: (dept: Omit<Department, 'total' | 'inProgress' | 'completed' | 'notStarted' | 'delayed' | 'critical' | 'pctDone'>) => void;
  updateDepartment: (name: string, updates: Partial<Department>) => void;
  deleteDepartment: (name: string) => void;

  // Risk CRUD
  addRisk: (risk: Omit<Risk, 'id'>) => void;
  updateRisk: (id: string, updates: Partial<Risk>) => void;
  deleteRisk: (id: string) => void;

  // Bulk operations
  importProjects: (projects: Project[]) => void;

  // Notifications
  addNotification: (n: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

function normalizeDeptName(d: string | null | undefined): string {
  if (!d) return '';
  const s = d.toLowerCase().trim();
  if (s.startsWith('digital')) return 'Digital & Data';
  if (s.startsWith('advertis')) return 'Advertising & Marketing';
  if (s.startsWith('duty') || s === 'dutyfree') return 'Duty Free';
  if (s.startsWith('commercial')) return 'Commercial Development';
  if (s.startsWith('oper')) return 'Operations';
  if (s === 'basl') return 'BASL';
  if (s === 'cbb' || s === 'ccb' || s.startsWith('amen')) return 'BASL';
  return d;
}

// Treat null / undefined / '' / [] as the same "no value" so an edit that leaves
// an empty field empty is not recorded as a change.
function isEmptyValue(v: unknown): boolean {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

// Value-equality for audit diffing. A plain `!==` treats the fresh arrays the
// edit modal always rebuilds (classifiedDependencies, tasks) as changed even
// when their contents are identical, which logged phantom "updated" entries in
// the audit trail / activity feed. Compare by value: reference, empty-equivalent,
// then structural (deep) equality for objects and arrays.
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (isEmptyValue(a) && isEmptyValue(b)) return true;
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  }
  return false;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { canModifyDepartment, user, isDemoMode } = useAuth();
  const currentUserName = isDemoMode
    ? DEMO_USER_NAME
    : (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || 'A user';

  const collectDependentDepartments = useCallback((project: Project | undefined): string[] => {
    if (!project?.classifiedDependencies?.length) return [];
    const sourceDept = normalizeDeptName(project.department);
    const set = new Set<string>();
    project.classifiedDependencies.forEach(dep => {
      if (dep.kind !== 'internal') return;
      const target = normalizeDeptName(dep.department || '');
      if (target && target !== sourceDept) set.add(target);
    });
    return Array.from(set);
  }, []);

  const [projects, setProjects] = useState<Project[]>(
    (isDemoMode ? DEMO_PROJECTS : initialProjects).map(p => reconcileStatusProgress(normalizeProjectStatus(p))),
  );
  const [risks, setRisks] = useState<Risk[]>(isDemoMode ? DEMO_RISKS : initialRisks);
  const [notifications, setNotifications] = useState<Notification[]>(isDemoMode ? DEMO_NOTIFICATIONS : initialNotifications);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [liveStatus, setLiveStatus] = useState<'live' | 'cached' | 'error'>('cached');
  const [scope, setScope] = useState<{ admin: boolean; department: string | null; shared: number } | null>(null);
  const [orgStats, setOrgStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    // Demo mode: use local demo data only — never call the real API
    if (isDemoMode) return;
    if (!isSupabaseConfigured()) return;

    async function fetchData() {
      try {
        const res = await authedFetch('/api/projects');
        if (!res.ok) throw new Error(res.status === 401 ? 'Session expired (401)' : `API request failed (${res.status})`);
        const data = await res.json();
        // Enforce the Delayed rule on read: any "Delayed" project whose Target
        // Date is still in the future is shown as In Progress (incl. legacy data).
        // Enforce both invariants on read so stored/legacy data is consistent:
        // Delayed only when past its target date, and Completed ⇔ 100% progress.
        if (data.projects && data.projects.length > 0) setProjects((data.projects as Project[]).map(p => reconcileStatusProgress(normalizeProjectStatus(p))));
        if (data.risks && data.risks.length > 0) setRisks(data.risks);
        if (data.scope) setScope(data.scope);
        if (data.orgStats) setOrgStats(data.orgStats);
        setLiveStatus('live');
      } catch (err) {
        // The screen is still showing the BUNDLED fallback register — never
        // let that pass silently as live data (reported: '163 projects?').
        console.error('[DataContext] Error fetching live data:', err);
        setLiveStatus('error');
        toast({
          kind: 'error',
          key: 'live-data',
          text: 'Couldn\u2019t load live data \u2014 you\u2019re seeing an offline copy. Please sign out and back in.',
        });
      }
    }
    fetchData();
  }, [isDemoMode]);


  // ---- Audit helper ----
  const logAudit = useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp' | 'user'>) => {
    setAuditLog(prev => [{
      ...entry,
      id: `AUD-${Date.now()}`,
      user: currentUserName,
      timestamp: new Date(),
    }, ...prev]);
  }, []);

  // Forward ref so archiveProject's Undo toast can call restoreProject,
  // which is defined further down (would otherwise be a use-before-declare).
  const restoreRef = useRef<((id: string) => void) | null>(null);

  // ---- Auto-notify helper ----
  // Every notification also surfaces as a non-blocking bottom-right toast, so
  // CRUD feedback is immediate without opening the bell. Toasts sharing the
  // same title replace each other instead of stacking (rapid edits).
  const notify = useCallback((title: string, message: string, type: Notification['type'] = 'info') => {
    setNotifications(prev => [{
      id: Date.now(),
      title,
      message,
      type,
      time: 'Just now',
      read: false,
    }, ...prev]);
    toast({
      kind: type === 'success' ? 'success' : type === 'warning' || type === 'critical' ? 'error' : 'info',
      text: title === 'Not saved to server' ? `${title} — ${message}` : title,
      key: title,
    });
  }, []);

  // A failed server save must be loud: local state already shows the change,
  // so without this the user gets a success toast and loses the work on the
  // next refresh (reported: 10+ projects added, gone after reload).
  const saveFailed = useCallback((what: string) => (msg: string) => {
    notify('Not saved to server', `${what} was NOT saved (${msg}). It will disappear when the page reloads — please retry, and contact an admin if it keeps failing.`, 'critical');
  }, [notify]);

  // ============================================
  // COMPUTED: Departments derived from projects
  // ============================================
  const departmentColors: Record<string, string> = {
    'Digital & Data': '#5c7cfa',
    'Operations': '#f59e0b',
    'Commercial Development': '#10b981',
    'Advertising & Marketing': '#8b5cf6',
    'Duty Free': '#f97316',
    'CBB': '#ec4899',
    'BASL': '#06b6d4',
    // demo-mode sample departments (harmless in production — these names never
    // appear in real data)
    ...Object.fromEntries(DEMO_DEPARTMENTS.map(d => [d.name, d.color])),
  };

  // Merge any custom departments added by user
  const [customDepartments, setCustomDepartments] = useState<{ name: string; color: string }[]>([]);

  // Memoized projects list including virtual duplicates for cross-department dependencies
  const projectsWithDuplicates = React.useMemo(() => {
    const active = projects.filter(p => !p.archived);
    const list: Project[] = [...active];

    active.forEach(proj => {
      if (proj.classifiedDependencies) {
        proj.classifiedDependencies.forEach(dep => {
          // Only INTERNAL dependencies create a read-only mirrored task in the
          // target department. External (vendor/partner) dependencies stay as
          // records inside the parent project and never spawn a mirror.
          if (dep.kind !== 'internal') return;

          const targetDept = normalizeDeptName(dep.department || '');
          const assignedOwner = dep.assignedUser || dep.owners?.[0] || '';
          const sourceDept = normalizeDeptName(proj.department);

          if (targetDept && targetDept !== sourceDept) {
            const alreadyExists = list.some(item =>
              item.isDependencyMirror &&
              item.mirrorParentId === proj.id &&
              item.mirrorDepId === dep.id,
            );
            if (!alreadyExists) {
              list.push({
                ...proj,
                department: targetDept,
                owner: assignedOwner || proj.owner,
                // The mirror's own task status is what the dependent dept tracks,
                // falling back to the parent status until they set one.
                status: dep.status === 'Resolved' ? 'Completed'
                  : dep.status === 'Blocked' ? 'Delayed'
                  : dep.status === 'In Progress' ? 'In Progress'
                  : proj.status,
                progress: dep.progress ?? proj.progress,
                isDependencyMirror: true,
                originalDepartment: sourceDept,
                mirrorParentId: proj.id,
                mirrorDepId: dep.id,
              });
            }
          }
        });
      }
    });

    return list;
  }, [projects]);

  const departments: Department[] = React.useMemo(() => {
    const activeProjects = projectsWithDuplicates;
    const allDeptNames = new Set([
      ...Object.keys(departmentColors),
      ...customDepartments.map(d => d.name),
      ...activeProjects.map(p => p.department),
    ]);

    return Array.from(allDeptNames).map(name => {
      const deptProjects = activeProjects.filter(p => p.department === name);
      const custom = customDepartments.find(d => d.name === name);
      return {
        name,
        total: deptProjects.length,
        inProgress: deptProjects.filter(p => p.status === 'In Progress').length,
        completed: deptProjects.filter(p => p.status === 'Completed').length,
        notStarted: deptProjects.filter(p => p.status === 'Not Started').length,
        delayed: deptProjects.filter(p => p.status === 'Delayed').length,
        critical: deptProjects.filter(p => p.priority === 'Critical').length,
        pctDone: deptProjects.length > 0
          ? Math.round((deptProjects.filter(p => p.status === 'Completed').length / deptProjects.length) * 100)
          : 0,
        color: custom?.color || departmentColors[name] || '#64748b',
      };
    }).filter(d => d.total > 0 || customDepartments.some(cd => cd.name === d.name));
  }, [projects, customDepartments]);

  // ============================================
  // COMPUTED: KPIs derived from projects + risks
  // ============================================
  const kpi = React.useMemo(() => {
    const active = projects.filter(p => !p.archived);
    const total = active.length;
    const inProgress = active.filter(p => p.status === 'In Progress').length;
    const completed = active.filter(p => p.status === 'Completed').length;
    const delayed = active.filter(p => p.status === 'Delayed').length;
    const notStarted = active.filter(p => p.status === 'Not Started').length;
    const onHold = active.filter(p => p.status === 'On Hold').length;
    const critical = active.filter(p => p.priority === 'Critical').length;
    const high = active.filter(p => p.priority === 'High').length;
    const medium = active.filter(p => p.priority === 'Medium').length;
    const low = active.filter(p => p.priority === 'Low').length;
    const openRisks = risks.filter(r => r.status === 'Open').length;
    const closedRisks = risks.filter(r => r.status === 'Closed').length;

    // Stuck: status === 'Delayed' OR (targetDate < Today and status !== 'Completed')
    const stuckProjects = active.filter(p => {
      if (p.status === 'Completed' || p.dismissedFromStuck) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      const isDelayed = p.status === 'Delayed';
      const isOverdue = p.targetDate ? p.targetDate < todayStr : false;
      return isDelayed || isOverdue;
    }).length;

    // Needs escalation: Critical + In Progress + has risks
    const projectsWithRisks = new Set(risks.filter(r => r.status === 'Open').map(r => r.projectId));
    const needsEscalation = active.filter(p =>
      p.priority === 'Critical' &&
      p.status === 'In Progress' &&
      (projectsWithRisks.has(p.id) || (p.risks && p.risks.length > 0))
    ).length;

    // Owner bottlenecks: owners with 3+ active projects
    const ownerCounts: Record<string, number> = {};
    active.filter(p => p.status !== 'Completed' && (p.status as string) !== 'Cancelled').forEach(p => {
      ownerCounts[p.owner] = (ownerCounts[p.owner] || 0) + 1;
    });
    const ownerBottlenecks = Object.values(ownerCounts).filter(c => c >= 3).length;

    return {
      totalProjects: total, inProgress, completed, delayed, notStarted, onHold,
      critical, high, medium, low, openRisks, closedRisks,
      totalRisks: risks.length, stuckProjects, needsEscalation, ownerBottlenecks,
    };
  }, [projects, risks]);

  // ============================================
  // PROJECT CRUD
  // ============================================
  const generateId = useCallback((department: string): string => {
    return generateProjectId(department, projects.map(p => p.id));
  }, [projects]);

  const addProject = useCallback((project: Omit<Project, 'id'> & { id?: string }): string => {
    if (!canModifyDepartment(project.department)) {
      notify('Permission denied', `You can only add projects in your own department.`, 'warning');
      return '';
    }
    const id = project.id || generateProjectId(project.department, projects.map(p => p.id));
    // Enforce the Delayed rule: a new project can't be "Delayed" unless its
    // Target Date has already passed (else it's stored as In Progress).
    const newProject: Project = reconcileStatusProgress(normalizeProjectStatus({ ...project, id, archived: false } as Project));
    setProjects(prev => [...prev, newProject]);
    logAudit({ action: 'create', entityType: 'project', entityId: id, entityName: newProject.name, changes: {} });
    notify('Project Created', `${newProject.name} has been added to ${newProject.department}`, 'success');

    // Sync to local Excel files
    authedFetch('/api/sync-local-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', project: newProject }),
    }).catch(err => console.error('Error syncing project to local Excel:', err));

    if (isSupabaseConfigured()) {
      persistProjectMutation({ action: 'create', project: newProject, audit: { entityName: newProject.name } }, saveFailed(`Project "${newProject.name}"`));
    }
    return id;
  }, [projects, logAudit, notify, canModifyDepartment, saveFailed]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    let updatedProj: Project | null = null;
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
      // Block edits to projects outside the user's department (super admins exempt).
      if (!canModifyDepartment(p.department)) {
        notify('Permission denied', `You can only edit projects in your own department.`, 'warning');
        return p;
      }
      // Enforce the Delayed rule at write time so the DB, audit, and display all
      // agree: a project can only be "Delayed" once its Target Date has passed.
      // If someone (e.g. via the quick-edit panel) sets Delayed too early, keep
      // it In Progress and say why — the check uses the effective target date.
      const effective: Partial<Project> = { ...updates };
      if (effective.status === 'Delayed') {
        const nextTarget = effective.targetDate !== undefined ? effective.targetDate : p.targetDate;
        if (!canBeDelayed(nextTarget)) {
          effective.status = 'In Progress';
          notify('Kept as In Progress', `${p.name} can only be marked Delayed after its Target Date (${formatDate(nextTarget)}) has passed.`, 'warning');
        }
      }
      // Couple "Completed" status and 100% progress, reacting only to the field
      // the user actually changed (so un-completing by lowering the status never
      // gets undone): marking Completed fills progress to 100; setting progress
      // to 100 marks Completed.
      if (effective.status === 'Completed') effective.progress = 100;
      else if (effective.progress === 100) effective.status = 'Completed';
      const changes: Record<string, { old: any; new: any }> = {};
      Object.keys(effective).forEach(key => {
        const k = key as keyof Project;
        if (!valuesEqual(p[k], effective[k])) {
          changes[key] = { old: p[k], new: effective[k] };
        }
      });
      // Nothing genuinely changed (e.g. re-saving the modal without edits) — do
      // not log a phantom "updated" event, fire a status alert, or write to the
      // server/Excel for a no-op save.
      if (Object.keys(changes).length === 0) return p;
      logAudit({ action: 'update', entityType: 'project', entityId: id, entityName: p.name, changes });
      if (effective.status === 'Delayed' && p.status !== 'Delayed') {
        notify('Project Delayed', `${p.name} has been marked as Delayed`, 'warning');
      }
      if (effective.status === 'Completed' && p.status !== 'Completed') {
        notify('Project Completed', `${p.name} has been completed! 🎉`, 'success');
      }

      if (isSupabaseConfigured()) {
        persistProjectMutation({ action: 'update', project: { id }, updates: effective, audit: { entityName: p.name, changes } }, saveFailed(`The edit to "${p.name}"`));
      }

      updatedProj = { ...p, ...effective };
      return updatedProj;
    }));

    if (updatedProj) {
      authedFetch('/api/sync-local-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', project: updatedProj }),
      }).catch(err => console.error('Error syncing project to local Excel:', err));
    }
  }, [logAudit, notify, canModifyDepartment, saveFailed]);

  // Update one internal dependency task inside its parent project. Unlike
  // updateProject, this is gated on the dependency's TARGET (dependent) department
  // so a member of that department can maintain their mirrored task without
  // holding edit rights over the parent project's own department.
  const updateDependencyTask = useCallback(async (parentId: string, depId: string, patch: Partial<ClassifiedDependency>): Promise<boolean> => {
    const parent = projects.find(p => p.id === parentId && !p.isDependencyMirror);
    if (!parent) return false;
    const dep = (parent.classifiedDependencies || []).find(d => d.id === depId);
    if (!dep) return false;
    // Permission: admins pass; otherwise the user must be able to modify the
    // dependency's target department.
    if (!canModifyDepartment(dep.department)) {
      notify('Permission denied', `You can only update dependency tasks for your own department.`, 'warning');
      return false;
    }
    const nextDeps = (parent.classifiedDependencies || []).map(d => (d.id === depId ? { ...d, ...patch } : d));
    // Update in-memory state immediately so the UI reflects changes without waiting for the network.
    setProjects(prev => prev.map(p => (p.id === parentId ? { ...p, classifiedDependencies: nextDeps } : p)));
    logAudit({ action: 'update', entityType: 'project', entityId: parentId, entityName: parent.name, changes: { dependencyTask: { old: depId, new: patch } } });

    if (!isSupabaseConfigured()) return true;

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({
          action: 'update',
          project: { id: parentId },
          updates: { classifiedDependencies: nextDeps },
          audit: { entityName: parent.name },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error('[updateDependencyTask] API error', res.status, body);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[updateDependencyTask] Network error', err);
      return false;
    }
  }, [projects, canModifyDepartment, notify, logAudit]);

  const splitProject = useCallback((originalId: string, splits: { department: string, owner?: string, percentage: number }[]) => {
    const originalProject = projects.find(p => p.id === originalId);
    if (!originalProject || splits.length === 0) return;

    // Splitting moves/clones work across departments — require modify rights on the source
    // and every target department (super admins satisfy all of these).
    if (!canModifyDepartment(originalProject.department) || !splits.every(s => canModifyDepartment(s.department))) {
      notify('Permission denied', `You can only split projects within departments you manage.`, 'warning');
      return;
    }

    const splitGroupId = originalProject.splitGroupId || originalProject.id;

    // Pre-allocate every piece's ID up front (the original keeps its ID; each extra
    // piece gets a fresh one) so we can cross-link them as dependencies.
    const currentProjectIds = projects.map(p => p.id);
    const pieces = splits.map((s, i) => {
      if (i === 0) return { id: originalId, ...s };
      const newId = generateProjectId(s.department, currentProjectIds);
      currentProjectIds.push(newId);
      return { id: newId, ...s };
    });

    // Auto-create dependencies: every piece depends on every OTHER piece in the group.
    const depsFor = (id: string) => pieces.filter(p => p.id !== id).map(p => p.id).join(', ');

    // The first piece updates the original project in place (department, owner, %, links).
    const primary = pieces[0];
    updateProject(originalId, {
      department: primary.department,
      owner: primary.owner || originalProject.owner,
      splitPercentage: primary.percentage,
      splitGroupId,
      projectDependencies: depsFor(primary.id),
    });

    // The remaining pieces are spawned as new linked projects.
    pieces.slice(1).forEach(piece => {
      const newProject: Omit<Project, 'id'> & { id?: string } = {
        ...originalProject,
        id: piece.id,
        department: piece.department,
        owner: piece.owner || originalProject.owner,
        splitPercentage: piece.percentage,
        splitGroupId,
        projectDependencies: depsFor(piece.id),
        tasks: [], // wipe tasks so they start fresh
        allocations: [],
        detailedDependencies: [],
      };
      addProject(newProject);
    });

    notify('Project Split', `Split ${originalProject.name} into ${pieces.length} pieces — owners assigned and dependencies linked.`, 'success');
  }, [projects, updateProject, addProject, notify, canModifyDepartment]);

  // Soft delete — moves to history (archived = true)
  const archiveProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project && !canModifyDepartment(project.department)) {
      notify('Permission denied', `You can only archive projects in your own department.`, 'warning');
      return;
    }
    if (project) {
      logAudit({ action: 'update', entityType: 'project', entityId: id, entityName: project.name, changes: { archived: { old: false, new: true } } });
      notify('Project Archived', `${project.name} moved to history. Can be restored anytime.`, 'info');
      // destructive action → toast with inline Undo (restores from history)
      toast({ kind: 'info', text: `"${project.name}" archived`, undo: () => restoreRef.current?.(id) });

      // Fan out a notification to every department that had a mirror of this
      // project via a dependency, so dependent teams aren't surprised when the
      // shadow row disappears from their list.
      collectDependentDepartments(project).forEach(dept => {
        notify(
          `Linked project archived (${dept})`,
          `${currentUserName} archived "${project.name}" in ${project.department}. The dependency mirror in ${dept} has been removed.`,
          'warning',
        );
      });

      // Sync local Excel
      authedFetch('/api/sync-local-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', project }),
      }).catch(err => console.error('Error syncing project archive to local Excel:', err));
    }
    const now = new Date().toISOString();
    setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: true, archivedAt: now } : p));
    if (isSupabaseConfigured()) {
      persistProjectMutation({ action: 'archive', project: { id }, audit: { entityName: project?.name } }, saveFailed(`Archiving "${project?.name ?? id}"`));
    }
  }, [projects, logAudit, notify, canModifyDepartment, collectDependentDepartments, currentUserName, saveFailed]);

  // deleteProject now archives instead of deleting (for safety)
  const deleteProject = archiveProject;

  // Restore from history
  const restoreProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project && !canModifyDepartment(project.department)) {
      notify('Permission denied', `You can only restore projects in your own department.`, 'warning');
      return;
    }
    if (project) {
      logAudit({ action: 'update', entityType: 'project', entityId: id, entityName: project.name, changes: { archived: { old: true, new: false } } });
      notify('Project Restored', `${project.name} has been restored from history.`, 'success');

      // Sync local Excel
      authedFetch('/api/sync-local-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', project: { ...project, archived: false } }),
      }).catch(err => console.error('Error syncing project restore to local Excel:', err));
    }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: false, archivedAt: undefined } : p));
    if (isSupabaseConfigured()) {
      persistProjectMutation({ action: 'restore', project: { id }, audit: { entityName: project?.name } }, saveFailed(`Restoring "${project?.name ?? id}"`));
    }
  }, [projects, logAudit, notify, canModifyDepartment, saveFailed]);

  useEffect(() => { restoreRef.current = restoreProject; }, [restoreProject]);

  // Permanent delete — only from archived projects
  const purgeProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project && !canModifyDepartment(project.department)) {
      notify('Permission denied', `You can only delete projects in your own department.`, 'warning');
      return;
    }
    if (project) {
      logAudit({ action: 'delete', entityType: 'project', entityId: id, entityName: project.name, changes: {} });
      notify('Project Permanently Deleted', `${project.name} has been permanently removed.`, 'warning');

      // Fan out a notification to every department that depended on this
      // project so they know who removed it and from where.
      collectDependentDepartments(project).forEach(dept => {
        notify(
          `Linked project deleted (${dept})`,
          `${currentUserName} permanently deleted "${project.name}" from ${project.department}. The dependency mirror in ${dept} has been removed.`,
          'critical',
        );
      });

      // Sync local Excel
      authedFetch('/api/sync-local-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', project }),
      }).catch(err => console.error('Error syncing project purge to local Excel:', err));
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    setRisks(prev => prev.filter(r => r.projectId !== id));
    if (isSupabaseConfigured()) {
      persistProjectMutation({ action: 'delete', project: { id }, audit: { entityName: project?.name } }, saveFailed(`Deleting "${project?.name ?? id}"`));
    }
  }, [projects, logAudit, notify, canModifyDepartment, collectDependentDepartments, currentUserName, saveFailed]);

  // ============================================
  // DEPARTMENT CRUD
  // ============================================
  const addDepartment = useCallback((dept: { name: string; color: string }) => {
    setCustomDepartments(prev => [...prev, dept]);
    logAudit({ action: 'create', entityType: 'department', entityId: dept.name, entityName: dept.name, changes: {} });
    notify('Department Added', `${dept.name} department has been created`, 'success');
  }, [logAudit, notify]);

  const updateDepartment = useCallback((name: string, updates: Partial<Department>) => {
    setCustomDepartments(prev => prev.map(d => d.name === name ? { ...d, ...updates } : d));
  }, []);

  const deleteDepartment = useCallback((name: string) => {
    setCustomDepartments(prev => prev.filter(d => d.name !== name));
    logAudit({ action: 'delete', entityType: 'department', entityId: name, entityName: name, changes: {} });
  }, [logAudit]);

  // ============================================
  // RISK CRUD
  // ============================================
  const addRisk = useCallback((risk: Omit<Risk, 'id'>) => {
    const id = `RSK-${String(risks.length + 1).padStart(3, '0')}`;
    setRisks(prev => [...prev, { ...risk, id }]);
    logAudit({ action: 'create', entityType: 'risk', entityId: id, entityName: risk.description, changes: {} });
    notify('Risk Added', `New ${risk.impact} impact risk: ${risk.description.substring(0, 50)}...`, risk.impact === 'High' ? 'critical' : 'warning');
    if (isSupabaseConfigured()) {
      persistProjectMutation({ action: 'create_risk', project: { id, ...risk }, audit: { entityName: risk.description } }, saveFailed('The new risk'));
    }
  }, [risks.length, logAudit, notify, saveFailed]);

  const updateRisk = useCallback((id: string, updates: Partial<Risk>) => {
    setRisks(prev => prev.map(r => {
      if (r.id !== id) return r;
      logAudit({ action: 'update', entityType: 'risk', entityId: id, entityName: r.description, changes: {} });
      if (isSupabaseConfigured()) {
        persistProjectMutation({ action: 'update_risk', project: { id }, updates, audit: { entityName: r.description } }, saveFailed('The risk update'));
      }
      return { ...r, ...updates };
    }));
  }, [logAudit, saveFailed]);

  const deleteRisk = useCallback((id: string) => {
    const risk = risks.find(r => r.id === id);
    if (risk) logAudit({ action: 'delete', entityType: 'risk', entityId: id, entityName: risk.description, changes: {} });
    setRisks(prev => prev.filter(r => r.id !== id));
    if (isSupabaseConfigured()) {
      persistProjectMutation({ action: 'delete_risk', project: { id }, audit: { entityName: risk?.description } }, saveFailed('The risk deletion'));
    }
  }, [risks, logAudit, saveFailed]);

  // ============================================
  // BULK IMPORT
  // ============================================
  const importProjects = useCallback((newProjects: Project[]) => {
    setProjects(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const toAdd = newProjects.filter(p => !existingIds.has(p.id));
      
      // For existing projects, update them instead of ignoring
      const updatedMap = new Map(newProjects.filter(p => existingIds.has(p.id)).map(p => [p.id, p]));
      
      const newPrev = prev.map(p => {
        if (updatedMap.has(p.id)) {
          const updates = updatedMap.get(p.id)!;
          
          if (isSupabaseConfigured()) {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
            if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
            if (updates.owner !== undefined) dbUpdates.owner_name = updates.owner;
            if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate || null;
            if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate || null;
            if (updates.objective !== undefined) dbUpdates.business_objective = updates.objective;
            if (updates.kpi !== undefined) dbUpdates.kpi = updates.kpi;
            if (updates.projectDependencies !== undefined) dbUpdates.dependencies = updates.projectDependencies;
            if (updates.supportTeam !== undefined) dbUpdates.support_team = updates.supportTeam;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
            if (Object.keys(dbUpdates).length > 0) {
              supabase.from('projects').update(dbUpdates).eq('project_code', p.id).then(({error}) => { if (error) console.error(error); });
            }
          }
          return { ...p, ...updates };
        }
        return p;
      });

      // Handle completely new projects
      toAdd.forEach(newProject => {
        if (isSupabaseConfigured()) {
          supabase.from('departments').select('id').eq('name', newProject.department).single().then(({data: d}) => {
            const deptId = d?.id;
            supabase.from('projects').insert({
              project_code: newProject.id,
              name: newProject.name,
              department_id: deptId,
              status: newProject.status,
              priority: newProject.priority,
              progress: newProject.progress,
              owner_name: newProject.owner || null,
              start_date: newProject.startDate || null,
              target_date: newProject.targetDate || null,
              business_objective: newProject.objective || null,
              kpi: newProject.kpi || null,
              dependencies: newProject.projectDependencies || null,
              support_team: newProject.supportTeam || null,
              notes: newProject.notes || null
            }).then(({error}) => { if (error) console.error(error); });
          });
        }
      });

      notify('Import Complete', `Updated ${updatedMap.size} existing projects, added ${toAdd.length} new projects`, 'success');
      return [...newPrev, ...toAdd];
    });
  }, [notify]);

  // ============================================
  // NOTIFICATION CRUD
  // ============================================
  const addNotification = useCallback((n: Omit<Notification, 'id'>) => {
    setNotifications(prev => [{ ...n, id: Date.now() }, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  return (
    <DataContext.Provider value={{
      liveStatus: isDemoMode ? 'live' : liveStatus,
      scope,
      orgStats,
      projects: projectsWithDuplicates,
      archivedProjects: projects.filter(p => p.archived),
      departments,
      risks,
      notifications,
      auditLog,
      kpi,
      addProject,
      updateProject,
      updateDependencyTask,
      splitProject,
      deleteProject,
      archiveProject,
      restoreProject,
      purgeProject,
      generateId,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      addRisk,
      updateRisk,
      deleteRisk,
      importProjects,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
