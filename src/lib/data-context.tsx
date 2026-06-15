'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuth } from './auth-context';
import { generateProjectId, daysUntil } from './utils';
import {
  projects as initialProjects,
  departments as initialDepartments,
  risks as initialRisks,
  notifications as initialNotifications,
  type Project,
  type Risk,
  type Department,
} from './mock-data';

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
  // Data
  projects: Project[];
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

export function DataProvider({ children }: { children: ReactNode }) {
  // Department-scoped write permissions (super admins / CCO can modify everything).
  const { canModifyDepartment } = useAuth();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    
    async function fetchData() {
      console.log('Connecting to Supabase...');
      try {
        const { data: dbProjects } = await supabase.from('projects').select('*').neq('archived', true);
        if (dbProjects && dbProjects.length > 0) {
          const mappedProjects = dbProjects.map(p => ({
            id: p.project_code,
            name: p.name,
            department: p.department_id ? p.department_id : 'Unknown', // we will fetch depts below
            owner: p.owner_name || '',
            status: p.status,
            priority: p.priority,
            progress: p.progress,
            startDate: p.start_date,
            targetDate: p.target_date,
            objective: p.business_objective || '',
            kpi: p.kpi || '',
            projectDependencies: p.dependencies || '',
            supportTeam: p.support_team || '',
            notes: p.notes || '',
            risks: '',
            archived: p.archived,
            archivedAt: p.archived_at
          }));
          
          const { data: dbDepts } = await supabase.from('departments').select('*');
          if (dbDepts) {
            const deptMap: Record<string, string> = {};
            dbDepts.forEach(d => deptMap[d.id] = d.name);
            mappedProjects.forEach(p => {
              if (deptMap[p.department]) p.department = deptMap[p.department];
            });
          }
          setProjects(mappedProjects);
          console.log('Successfully loaded ' + mappedProjects.length + ' projects from live database!');
        }

        const { data: dbRisks } = await supabase.from('risks').select('*').neq('archived', true);
        if (dbRisks && dbRisks.length > 0) {
          // get project mapping
          const { data: dbProjs } = await supabase.from('projects').select('id, project_code');
          const projMap: Record<string, string> = {};
          if (dbProjs) dbProjs.forEach(p => projMap[p.id] = p.project_code);
          
          const mappedRisks = dbRisks.map(r => ({
            id: r.risk_code,
            projectId: projMap[r.project_id] || '',
            description: r.description,
            category: r.category || '',
            impact: r.impact || 'Low',
            likelihood: r.likelihood || 1,
            score: r.score || 1,
            severity: r.severity || 'Low',
            owner: r.owner_name || '',
            mitigation: r.mitigation || '',
            status: r.status,
            targetDate: r.target_date || ''
          }));
          setRisks(mappedRisks);
        }
      } catch (err) {
        console.error('[CRITICAL] Error fetching Supabase data:', err);
        alert('Error loading live data. Please check browser console.');
      }
    }
    fetchData();
  }, []);


  // ---- Audit helper ----
  const logAudit = useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp' | 'user'>) => {
    setAuditLog(prev => [{
      ...entry,
      id: `AUD-${Date.now()}`,
      user: 'Neeraj Prakash',
      timestamp: new Date(),
    }, ...prev]);
  }, []);

  // ---- Auto-notify helper ----
  const notify = useCallback((title: string, message: string, type: Notification['type'] = 'info') => {
    setNotifications(prev => [{
      id: Date.now(),
      title,
      message,
      type,
      time: 'Just now',
      read: false,
    }, ...prev]);
  }, []);

  // ============================================
  // COMPUTED: Departments derived from projects
  // ============================================
  const departmentColors: Record<string, string> = {
    'Digital & Data': '#5c7cfa',
    'Operations': '#f59e0b',
    'Commercial Development': '#10b981',
    'Advertising & Marketing': '#8b5cf6',
    'Retail & Commerce': '#f97316',
    'CBB': '#ec4899',
    'Strategic Support': '#06b6d4',
  };

  // Merge any custom departments added by user
  const [customDepartments, setCustomDepartments] = useState<{ name: string; color: string }[]>([]);

  const departments: Department[] = React.useMemo(() => {
    const allDeptNames = new Set([
      ...Object.keys(departmentColors),
      ...customDepartments.map(d => d.name),
      ...projects.map(p => p.department),
    ]);

    return Array.from(allDeptNames).map(name => {
      const deptProjects = projects.filter(p => p.department === name);
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
    const total = projects.length;
    const inProgress = projects.filter(p => p.status === 'In Progress').length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const delayed = projects.filter(p => p.status === 'Delayed').length;
    const notStarted = projects.filter(p => p.status === 'Not Started').length;
    const onHold = projects.filter(p => p.status === 'On Hold').length;
    const critical = projects.filter(p => p.priority === 'Critical').length;
    const high = projects.filter(p => p.priority === 'High').length;
    const medium = projects.filter(p => p.priority === 'Medium').length;
    const low = projects.filter(p => p.priority === 'Low').length;
    const openRisks = risks.filter(r => r.status === 'Open').length;
    const closedRisks = risks.filter(r => r.status === 'Closed').length;

    // Stuck: targetDate <= 7 days, any priority, status !== Completed, not dismissedFromStuck
    const stuckProjects = projects.filter(p => {
      if (p.status === 'Completed' || p.archived || p.dismissedFromStuck) return false;
      const days = daysUntil(p.targetDate);
      return days !== null && days <= 7;
    }).length;

    // Needs escalation: Critical + In Progress + has risks
    const projectsWithRisks = new Set(risks.filter(r => r.status === 'Open').map(r => r.projectId));
    const needsEscalation = projects.filter(p =>
      p.priority === 'Critical' &&
      p.status === 'In Progress' &&
      (projectsWithRisks.has(p.id) || (p.risks && p.risks.length > 0))
    ).length;

    // Owner bottlenecks: owners with 3+ active projects
    const ownerCounts: Record<string, number> = {};
    projects.filter(p => p.status === 'In Progress').forEach(p => {
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
    const newProject: Project = { ...project, id, archived: false } as Project;
    setProjects(prev => [...prev, newProject]);
    logAudit({ action: 'create', entityType: 'project', entityId: id, entityName: newProject.name, changes: {} });
    notify('Project Created', `${newProject.name} has been added to ${newProject.department}`, 'success');

    if (isSupabaseConfigured()) {
      supabase.from('departments').select('id').eq('name', newProject.department).single().then(({data: d}) => {
        const deptId = d?.id;
        supabase.from('projects').insert({
          project_code: id,
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
    return id;
  }, [projects, logAudit, notify, canModifyDepartment]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
      // Block edits to projects outside the user's department (super admins exempt).
      if (!canModifyDepartment(p.department)) {
        notify('Permission denied', `You can only edit projects in your own department.`, 'warning');
        return p;
      }
      const changes: Record<string, { old: any; new: any }> = {};
      Object.keys(updates).forEach(key => {
        const k = key as keyof Project;
        if (p[k] !== updates[k]) {
          changes[key] = { old: p[k], new: updates[k] };
        }
      });
      logAudit({ action: 'update', entityType: 'project', entityId: id, entityName: p.name, changes });
      if (updates.status === 'Delayed' && p.status !== 'Delayed') {
        notify('Project Delayed', `${p.name} has been marked as Delayed`, 'warning');
      }
      if (updates.status === 'Completed' && p.status !== 'Completed') {
        notify('Project Completed', `${p.name} has been completed! 🎉`, 'success');
      }
      
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
          supabase.from('projects').update(dbUpdates).eq('project_code', id).then(({error}) => { if (error) console.error(error); });
        }
      }
      
      return { ...p, ...updates };
    }));
  }, [logAudit, notify, canModifyDepartment]);

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
    }
    const now = new Date().toISOString();
    setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: true, archivedAt: now } : p));
    if (isSupabaseConfigured()) {
      supabase.from('projects').update({ archived: true, archived_at: now }).eq('project_code', id).then(({error}) => { if (error) console.error(error); });
    }
  }, [projects, logAudit, notify, canModifyDepartment]);

  // deleteProject now archives instead of deleting (for safety)
  const deleteProject = archiveProject;

  // Restore from history
  const restoreProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      notify('Project Restored', `${project.name} has been restored from history.`, 'success');
    }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: false, archivedAt: undefined } : p));
    if (isSupabaseConfigured()) {
      supabase.from('projects').update({ archived: false, archived_at: null }).eq('project_code', id).then(({error}) => { if (error) console.error(error); });
    }
  }, [projects, notify]);

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
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    setRisks(prev => prev.filter(r => r.projectId !== id));
    if (isSupabaseConfigured()) {
      supabase.from('projects').delete().eq('project_code', id).then(({error}) => { if (error) console.error(error); });
    }
  }, [projects, logAudit, notify, canModifyDepartment]);

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
      supabase.from('projects').select('id').eq('project_code', risk.projectId).single().then(({data: p}) => {
        if (p) {
          supabase.from('risks').insert({
            risk_code: id,
            project_id: p.id,
            description: risk.description,
            category: risk.category,
            impact: risk.impact,
            likelihood: risk.likelihood,
            score: risk.score,
            severity: risk.severity,
            owner_name: risk.owner,
            mitigation: risk.mitigation,
            status: risk.status,
            target_date: risk.targetDate || null
          }).then(({error}) => { if (error) console.error(error); });
        }
      });
    }
  }, [risks.length, logAudit, notify]);

  const updateRisk = useCallback((id: string, updates: Partial<Risk>) => {
    setRisks(prev => prev.map(r => {
      if (r.id !== id) return r;
      logAudit({ action: 'update', entityType: 'risk', entityId: id, entityName: r.description, changes: {} });
      if (isSupabaseConfigured()) {
        const dbUpdates: any = {};
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.impact !== undefined) dbUpdates.impact = updates.impact;
        if (updates.likelihood !== undefined) dbUpdates.likelihood = updates.likelihood;
        if (updates.score !== undefined) dbUpdates.score = updates.score;
        if (updates.severity !== undefined) dbUpdates.severity = updates.severity;
        if (updates.owner !== undefined) dbUpdates.owner_name = updates.owner;
        if (updates.mitigation !== undefined) dbUpdates.mitigation = updates.mitigation;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate || null;
        if (Object.keys(dbUpdates).length > 0) {
          supabase.from('risks').update(dbUpdates).eq('risk_code', id).then(({error}) => { if (error) console.error(error); });
        }
      }
      return { ...r, ...updates };
    }));
  }, [logAudit]);

  const deleteRisk = useCallback((id: string) => {
    const risk = risks.find(r => r.id === id);
    if (risk) logAudit({ action: 'delete', entityType: 'risk', entityId: id, entityName: risk.description, changes: {} });
    setRisks(prev => prev.filter(r => r.id !== id));
    if (isSupabaseConfigured()) {
      supabase.from('risks').update({ archived: true }).eq('risk_code', id).then(({error}) => { if (error) console.error(error); });
    }
  }, [risks, logAudit]);

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
      projects, departments, risks, notifications, auditLog, kpi,
      addProject, updateProject, splitProject, deleteProject,
      archiveProject, restoreProject, purgeProject, generateId,
      addDepartment, updateDepartment, deleteDepartment,
      addRisk, updateRisk, deleteRisk,
      importProjects,
      addNotification, markNotificationRead, markAllNotificationsRead,
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
