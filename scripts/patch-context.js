const fs = require('fs');

let content = fs.readFileSync('src/lib/data-context.tsx', 'utf8');

// Add imports
if (!content.includes('import { supabase, isSupabaseConfigured }')) {
  content = content.replace(
    "import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';",
    "import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';\nimport { supabase, isSupabaseConfigured } from './supabase';"
  );
}

// Add fetch on mount
if (!content.includes('useEffect(() => {')) {
  const fetchEffect = `
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    
    async function fetchData() {
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
            archived: p.archived,
            archivedAt: p.archived_at
          }));
          
          const { data: dbDepts } = await supabase.from('departments').select('*');
          if (dbDepts) {
            const deptMap = {};
            dbDepts.forEach(d => deptMap[d.id] = d.name);
            mappedProjects.forEach(p => {
              if (deptMap[p.department]) p.department = deptMap[p.department];
            });
          }
          setProjects(mappedProjects);
        }

        const { data: dbRisks } = await supabase.from('risks').select('*').neq('archived', true);
        if (dbRisks && dbRisks.length > 0) {
          // get project mapping
          const { data: dbProjs } = await supabase.from('projects').select('id, project_code');
          const projMap = {};
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
        console.error('Error fetching Supabase data:', err);
      }
    }
    fetchData();
  }, []);
`;
  content = content.replace(
    "export function DataProvider({ children }: { children: ReactNode }) {\n  const [projects, setProjects] = useState<Project[]>(initialProjects);\n  const [risks, setRisks] = useState<Risk[]>(initialRisks);\n  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);\n  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);",
    "export function DataProvider({ children }: { children: ReactNode }) {\n  const [projects, setProjects] = useState<Project[]>(initialProjects);\n  const [risks, setRisks] = useState<Risk[]>(initialRisks);\n  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);\n  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);\n" + fetchEffect
  );
}

// Update addProject
if (!content.includes("supabase.from('projects').insert")) {
  content = content.replace(
    "notify('Project Created', `${newProject.name} has been added to ${newProject.department}`, 'success');\n    return id;",
    "notify('Project Created', `${newProject.name} has been added to ${newProject.department}`, 'success');\n    \n    if (isSupabaseConfigured()) {\n      supabase.from('departments').select('id').eq('name', newProject.department).single().then(({data: d}) => {\n        const deptId = d?.id;\n        supabase.from('projects').insert({\n          project_code: id,\n          name: newProject.name,\n          department_id: deptId,\n          status: newProject.status,\n          priority: newProject.priority,\n          progress: newProject.progress,\n          owner_name: newProject.owner\n        }).then(({error}) => { if (error) console.error(error); });\n      });\n    }\n    return id;"
  );
}

// Update updateProject
if (!content.includes("supabase.from('projects').update")) {
  content = content.replace(
    "notify('Project Completed', `${p.name} has been completed! 🎉`, 'success');\n      }\n      return { ...p, ...updates };",
    "notify('Project Completed', `${p.name} has been completed! 🎉`, 'success');\n      }\n      \n      if (isSupabaseConfigured()) {\n        const dbUpdates: any = {};\n        if (updates.name !== undefined) dbUpdates.name = updates.name;\n        if (updates.status !== undefined) dbUpdates.status = updates.status;\n        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;\n        if (updates.progress !== undefined) dbUpdates.progress = updates.progress;\n        if (updates.owner !== undefined) dbUpdates.owner_name = updates.owner;\n        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;\n        if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate;\n        if (updates.objective !== undefined) dbUpdates.business_objective = updates.objective;\n        if (updates.kpi !== undefined) dbUpdates.kpi = updates.kpi;\n        if (updates.projectDependencies !== undefined) dbUpdates.dependencies = updates.projectDependencies;\n        if (updates.supportTeam !== undefined) dbUpdates.support_team = updates.supportTeam;\n        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;\n        if (Object.keys(dbUpdates).length > 0) {\n          supabase.from('projects').update(dbUpdates).eq('project_code', id).then(({error}) => { if (error) console.error(error); });\n        }\n      }\n      \n      return { ...p, ...updates };"
  );
}

// Update archiveProject
if (!content.includes("archived: true").toString().includes("supabase")) {
    content = content.replace(
        "setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: true, archivedAt: new Date().toISOString() } : p));",
        "const now = new Date().toISOString();\n    setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: true, archivedAt: now } : p));\n    if (isSupabaseConfigured()) {\n      supabase.from('projects').update({ archived: true, archived_at: now }).eq('project_code', id).then(({error}) => { if (error) console.error(error); });\n    }"
    );
}

fs.writeFileSync('src/lib/data-context.tsx', content, 'utf8');
console.log('Patched data-context.tsx successfully');
