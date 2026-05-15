'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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
  addProject: (project: Omit<Project, 'id'> & { id?: string }) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

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
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

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
    'Duty Free': '#f97316',
    'CBB & Lounge': '#ec4899',
    'BASL': '#06b6d4',
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

    // Stuck: Critical/High + In Progress + 0% progress
    const stuckProjects = projects.filter(p =>
      (p.priority === 'Critical' || p.priority === 'High') &&
      p.status === 'In Progress' &&
      p.progress === 0
    ).length;

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
  const addProject = useCallback((project: Omit<Project, 'id'> & { id?: string }) => {
    const id = project.id || `PR${project.department.substring(0, 4).toUpperCase()}_${String(projects.length + 1).padStart(2, '0')}`;
    const newProject: Project = { ...project, id } as Project;
    setProjects(prev => [...prev, newProject]);
    logAudit({ action: 'create', entityType: 'project', entityId: id, entityName: newProject.name, changes: {} });
    notify('Project Created', `${newProject.name} has been added to ${newProject.department}`, 'success');
  }, [projects.length, logAudit, notify]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
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
      return { ...p, ...updates };
    }));
  }, [logAudit, notify]);

  const deleteProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      logAudit({ action: 'delete', entityType: 'project', entityId: id, entityName: project.name, changes: {} });
      notify('Project Deleted', `${project.name} has been removed`, 'warning');
    }
    setProjects(prev => prev.filter(p => p.id !== id));
    setRisks(prev => prev.filter(r => r.projectId !== id));
  }, [projects, logAudit, notify]);

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
  }, [risks.length, logAudit, notify]);

  const updateRisk = useCallback((id: string, updates: Partial<Risk>) => {
    setRisks(prev => prev.map(r => {
      if (r.id !== id) return r;
      logAudit({ action: 'update', entityType: 'risk', entityId: id, entityName: r.description, changes: {} });
      return { ...r, ...updates };
    }));
  }, [logAudit]);

  const deleteRisk = useCallback((id: string) => {
    const risk = risks.find(r => r.id === id);
    if (risk) logAudit({ action: 'delete', entityType: 'risk', entityId: id, entityName: risk.description, changes: {} });
    setRisks(prev => prev.filter(r => r.id !== id));
  }, [risks, logAudit]);

  // ============================================
  // BULK IMPORT
  // ============================================
  const importProjects = useCallback((newProjects: Project[]) => {
    setProjects(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const toAdd = newProjects.filter(p => !existingIds.has(p.id));
      notify('Import Complete', `${toAdd.length} new projects imported`, 'success');
      return [...prev, ...toAdd];
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
      addProject, updateProject, deleteProject,
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
