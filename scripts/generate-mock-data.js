const fs = require('fs');
const path = require('path');

const bialData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/lib/bial-data.json'), 'utf8'));

// Generate TypeScript file with all projects
let ts = `// Auto-generated project data
// Contains all projects and risks for the Enterprise portfolio
// Generated: ${new Date().toISOString()}

export interface Allocation {
  id: string;
  type: 'individual' | 'department';
  target: string;
  percentage: number;
}

export interface DetailedDependency {
  id: string;
  targetProjectId?: string;
  description: string;
  allocations: Allocation[];
}

export interface Project {
  id: string;
  name: string;
  department: string;
  owner: string;
  status: 'In Progress' | 'Not Started' | 'Completed' | 'Delayed' | 'On Hold';
  progress: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  startDate: string | null;
  targetDate: string | null;
  risks: string;
  objective: string;
  kpi?: string;
  notes: string;
  projectDependencies?: string;
  detailedDependencies?: DetailedDependency[];
  allocations?: Allocation[];
  splitGroupId?: string;
  splitPercentage?: number;
  supportTeam?: string;
  archived?: boolean;
  archivedAt?: string;
  financials?: {
    budget: number;
    spent: number;
  };
  tasks?: {
    id: string;
    name: string;
    assignee: string;
    allocations?: Allocation[];
    status: 'Not Started' | 'In Progress' | 'Done';
  }[];
}

export interface Risk {
  id: string;
  projectId: string;
  description: string;
  category: string;
  impact: 'High' | 'Medium' | 'Low';
  likelihood: number;
  score: number;
  severity: string;
  owner: string;
  mitigation: string;
  status: 'Open' | 'Closed';
  targetDate: string;
}

export interface Department {
  name: string;
  total: number;
  inProgress: number;
  completed: number;
  notStarted: number;
  delayed: number;
  critical: number;
  pctDone: number;
  color: string;
}

export const projects: Project[] = `;

// Map old IDs to new IDs
const deptCounters = {};
const oldToNewId = {};

const DEPT_PREFIX_MAP = {
  'Digital & Data': 'PRDIGI',
  'Operations': 'PROPS',
  'Commercial Development': 'PRCOMDEV',
  'Advertising & Marketing': 'PRADMKT',
  'Duty Free': 'PRRETAIL',
  'CBB': 'PRAMEN',
  'Strategic Support': 'PRSTRAT',
};

function getNewId(dept, oldId) {
  if (!deptCounters[dept]) deptCounters[dept] = 1;
  const prefix = DEPT_PREFIX_MAP[dept] || ('PR' + dept.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 5));
  const newId = `${prefix}_${deptCounters[dept]++}`;
  oldToNewId[oldId] = newId;
  return newId;
}

// First pass: assign new IDs
bialData.projects.forEach(p => {
  getNewId(p.department, p.id);
});

// Clean up project data and update references
const cleanProjects = bialData.projects.map(p => {
  // Fix comma-separated or space-separated old IDs in dependencies
  let updatedDependencies = p.projectDependencies || '';
  Object.keys(oldToNewId).forEach(old => {
    // Basic string replace for dependencies (this works since old IDs are unique strings like PROPS_20)
    updatedDependencies = updatedDependencies.replace(new RegExp(old, 'g'), oldToNewId[old]);
  });

  return {
    ...p,
    id: oldToNewId[p.id],
    startDate: p.startDate || null,
    targetDate: p.targetDate || null,
    risks: p.risks || '',
    objective: p.objective || '',
    notes: p.notes || '',
    projectDependencies: updatedDependencies,
  };
});

ts += JSON.stringify(cleanProjects, null, 2) + ';\n\n';

// Risks
ts += 'export const risks: Risk[] = ';
const cleanRisks = bialData.risks.map(r => {
  const impact = ['High', 'Medium', 'Low'].includes(r.impact) ? r.impact : 'Medium';
  const score = r.score || ((impact === 'High' ? 3 : impact === 'Medium' ? 2 : 1) * (r.likelihood || 2));
  return {
    ...r,
    projectId: oldToNewId[r.projectId] || r.projectId,
    impact,
    score,
    severity: score >= 6 ? 'High' : score >= 3 ? 'Medium' : 'Low',
    status: r.status === 'Closed' ? 'Closed' : 'Open',
  };
});
ts += JSON.stringify(cleanRisks, null, 2) + ';\n\n';

// Static data
ts += `export const departments: Department[] = [
  { name: 'Digital & Data', total: 19, inProgress: 18, completed: 0, notStarted: 1, delayed: 0, critical: 6, pctDone: 0, color: '#5c7cfa' },
  { name: 'Operations', total: 35, inProgress: 22, completed: 0, notStarted: 11, delayed: 2, critical: 6, pctDone: 0, color: '#f59e0b' },
  { name: 'Commercial Development', total: 20, inProgress: 10, completed: 1, notStarted: 9, delayed: 0, critical: 1, pctDone: 5, color: '#10b981' },
  { name: 'Advertising & Marketing', total: 15, inProgress: 2, completed: 0, notStarted: 13, delayed: 0, critical: 0, pctDone: 0, color: '#8b5cf6' },
  { name: 'Duty Free', total: 32, inProgress: 0, completed: 0, notStarted: 32, delayed: 0, critical: 0, pctDone: 0, color: '#f97316' },
  { name: 'CBB', total: 6, inProgress: 0, completed: 0, notStarted: 6, delayed: 0, critical: 0, pctDone: 0, color: '#ec4899' },
  { name: 'Strategic Support', total: 15, inProgress: 0, completed: 0, notStarted: 15, delayed: 0, critical: 0, pctDone: 0, color: '#06b6d4' },
];
`;

const inProgressCount = cleanProjects.filter(p => p.status === 'In Progress').length;
const completedCount = cleanProjects.filter(p => p.status === 'Completed').length;
const delayedCount = cleanProjects.filter(p => p.status === 'Delayed').length;
const notStartedCount = cleanProjects.filter(p => p.status === 'Not Started').length;
const criticalCount = cleanProjects.filter(p => p.priority === 'Critical').length;
const highCount = cleanProjects.filter(p => p.priority === 'High').length;

ts += `export const kpiSummary = {
  totalProjects: ${cleanProjects.length},
  inProgress: ${inProgressCount},
  completed: ${completedCount},
  delayed: ${delayedCount},
  notStarted: ${notStartedCount},
  critical: ${criticalCount},
  high: ${highCount},

  medium: ${cleanProjects.filter(p => p.priority === 'Medium').length},
  low: ${cleanProjects.filter(p => p.priority === 'Low').length},
  openRisks: ${cleanRisks.filter(r => r.status === 'Open').length},
  highSeverityRisks: ${cleanRisks.filter(r => r.severity === 'High').length},
};

export const riskCategories = ['Data/Technical', 'Vendor/External', 'Data Quality', 'Compliance', 'Governance', 'People/Culture', 'Resource', 'Technical', 'Financial', 'Adoption'];

export const statusOptions = ['In Progress', 'Not Started', 'Completed', 'Delayed', 'On Hold'];
export const priorityOptions = ['Critical', 'High', 'Medium', 'Low'];

export const monthlyTrend = [
  { month: 'Oct', completed: 0, delayed: 0, inProgress: 28, newProjects: 12 },
  { month: 'Nov', completed: 0, delayed: 0, inProgress: 35, newProjects: 8 },
  { month: 'Dec', completed: 0, delayed: 1, inProgress: 38, newProjects: 5 },
  { month: 'Jan', completed: 0, delayed: 1, inProgress: 42, newProjects: 15 },
  { month: 'Feb', completed: 0, delayed: 1, inProgress: 45, newProjects: 10 },
  { month: 'Mar', completed: 1, delayed: 2, inProgress: 48, newProjects: 20 },
  { month: 'Apr', completed: 1, delayed: 2, inProgress: 50, newProjects: 18 },
  { month: 'May', completed: 1, delayed: 2, inProgress: 52, newProjects: 14 },
];

export const notifications = [
  { id: 1, title: 'Project Delayed', message: 'PROPR_02: Parking guidance system is now delayed', type: 'warning' as const, time: '2 hours ago', read: false },
  { id: 2, title: 'Risk Escalation', message: 'RSK-004: Compliance gap requires immediate attention', type: 'critical' as const, time: '3 hours ago', read: false },
  { id: 3, title: 'AI Insight', message: 'Digital & Data has 6 critical projects with 0% progress', type: 'insight' as const, time: '5 hours ago', read: false },
  { id: 4, title: 'Milestone Due', message: 'PRDIGI_03: Payment Gateway pilot due May 15', type: 'info' as const, time: '1 day ago', read: true },
  { id: 5, title: 'Owner Bottleneck', message: 'Musthaq Ahamed has 7 active projects assigned', type: 'warning' as const, time: '1 day ago', read: true },
];
`;

const outputPath = path.resolve(__dirname, '../src/lib/mock-data.ts');
fs.writeFileSync(outputPath, ts);
console.log(`Generated mock-data.ts with ${cleanProjects.length} projects and ${cleanRisks.length} risks`);
