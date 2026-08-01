/**
 * Fully fictional data for demo mode ("Try Live Demo"). No real names, no
 * proprietary information — a believable sample organisation ("Meridian
 * Group") so a prospect can walk through every surface with realistic content.
 *
 * Departments carry sub-departments (via the `subdivision` field, which the
 * data-driven department toggles pick up), projects span every status and
 * priority with tasks, milestones, dependencies and budgets, and the risk +
 * notification sets keep the whole app feeling actively used.
 */

import type { Project, Risk } from './mock-data';
import type { Notification } from './data-context';

// ── Sample org: departments + sub-departments + brand colors ──────────────
export const DEMO_DEPARTMENTS: { name: string; color: string; subdivisions: string[] }[] = [
  { name: 'Technology',          color: '#2563eb', subdivisions: ['Infrastructure', 'Cybersecurity', 'Data & AI', 'Applications'] },
  { name: 'Commercial',          color: '#0891b2', subdivisions: ['Sales', 'Partnerships', 'Loyalty', 'Brand & Marketing'] },
  { name: 'Finance',             color: '#059669', subdivisions: ['FP&A', 'Procurement', 'Treasury'] },
  { name: 'Operations',          color: '#d97706', subdivisions: ['Facilities', 'Supply Chain', 'Service Delivery'] },
  { name: 'Human Resources',     color: '#7c3aed', subdivisions: ['Talent Acquisition', 'People Operations', 'Learning & Development'] },
  { name: 'Customer Experience', color: '#db2777', subdivisions: ['Digital Product', 'Customer Support', 'UX Research'] },
];

// ── Sample team (owners + assignees) ──────────────────────────────────────
export const DEMO_TEAM: { name: string; role: string; email: string; department: string }[] = [
  { name: 'Priya Nair',      role: 'Head of Transformation', email: 'priya.nair@meridian-demo.com',      department: 'Technology' },
  { name: 'Daniel Okafor',   role: 'Engineering Manager',    email: 'daniel.okafor@meridian-demo.com',   department: 'Technology' },
  { name: 'Sofia Almeida',   role: 'Security Lead',          email: 'sofia.almeida@meridian-demo.com',   department: 'Technology' },
  { name: 'Wei Chen',        role: 'Data Platform Lead',     email: 'wei.chen@meridian-demo.com',        department: 'Technology' },
  { name: 'Marcus Bennett',  role: 'Commercial Director',    email: 'marcus.bennett@meridian-demo.com',  department: 'Commercial' },
  { name: 'Ana Ribeiro',     role: 'Partnerships Manager',   email: 'ana.ribeiro@meridian-demo.com',     department: 'Commercial' },
  { name: 'Hiroshi Tanaka',  role: 'Finance Controller',     email: 'hiroshi.tanaka@meridian-demo.com',  department: 'Finance' },
  { name: 'Elena Popova',    role: 'Procurement Lead',       email: 'elena.popova@meridian-demo.com',    department: 'Finance' },
  { name: 'James Sullivan',  role: 'Operations Manager',     email: 'james.sullivan@meridian-demo.com',  department: 'Operations' },
  { name: 'Fatima Al-Rashid',role: 'Supply Chain Lead',      email: 'fatima.alrashid@meridian-demo.com', department: 'Operations' },
  { name: 'Grace Mwangi',    role: 'Head of People',         email: 'grace.mwangi@meridian-demo.com',     department: 'Human Resources' },
  { name: 'Tom Whitfield',   role: 'L&D Manager',            email: 'tom.whitfield@meridian-demo.com',    department: 'Human Resources' },
  { name: 'Isabella Rossi',  role: 'Head of CX',             email: 'isabella.rossi@meridian-demo.com',   department: 'Customer Experience' },
  { name: 'Noah Kim',        role: 'Product Manager',        email: 'noah.kim@meridian-demo.com',         department: 'Customer Experience' },
  { name: 'Leila Haddad',    role: 'UX Research Lead',       email: 'leila.haddad@meridian-demo.com',     department: 'Customer Experience' },
  { name: 'Oliver Grant',    role: 'Programme Analyst',      email: 'oliver.grant@meridian-demo.com',     department: 'Operations' },
];

const emailFor = (name: string) => DEMO_TEAM.find(t => t.name === name)?.email || 'team@meridian-demo.com';

// helper: build a task quickly
type DemoTask = { id: string; name: string; assignee: string; assigneeEmail?: string; status: string; priority?: string; dueDate?: string; progress?: number };
const task = (id: string, name: string, assignee: string, status: string, extra: Partial<DemoTask> = {}): DemoTask => ({
  id, name, assignee, assigneeEmail: emailFor(assignee), status, ...extra,
});

// ── Projects ──────────────────────────────────────────────────────────────
export const DEMO_PROJECTS: Project[] = [
  {
    id: 'MER-TEC-01', name: 'ERP Modernisation Programme', department: 'Technology', subdivision: 'Applications',
    owner: 'Priya Nair', status: 'In Progress', progress: 62, priority: 'High',
    startDate: '2026-01-15', targetDate: '2026-11-30',
    objective: 'Migrate the legacy ERP to a cloud-native platform across Finance, HR and Operations.',
    kpi: 'Cutover with < 4h downtime; 100% GL reconciliation post-migration.',
    notes: 'Phase 1 (Finance) live. Phase 2 (HR + Ops) in build.', risks: 'Vendor delivery risk on integration module.',
    totalBudget: 42000000, utilizedBudget: 26000000, financials: { budget: 42000000, spent: 26000000 },
    classifiedDependencies: [
      { id: 'd1', kind: 'internal', department: 'Finance', description: 'Chart-of-accounts sign-off', status: 'Resolved', owners: ['Hiroshi Tanaka'] },
      { id: 'd2', kind: 'internal', department: 'Human Resources', description: 'Payroll data mapping', status: 'In Progress', owners: ['Grace Mwangi'] },
    ],
    tasks: [
      task('t1', 'Finance module cutover', 'Daniel Okafor', 'Completed', { progress: 100 }),
      task('t2', 'HR data migration', 'Grace Mwangi', 'In Progress', { progress: 55, dueDate: '2026-08-20' }),
      task('t3', 'Operations rollout', 'James Sullivan', 'To Do', { progress: 0, dueDate: '2026-10-10' }),
      task('t4', 'Integration testing', 'Wei Chen', 'In Progress', { progress: 40 }),
      task('t5', 'Go-live readiness review', 'Priya Nair', 'Backlog', { progress: 0 }),
    ],
  },
  {
    id: 'MER-CX-01', name: 'Customer Portal v2', department: 'Customer Experience', subdivision: 'Digital Product',
    owner: 'Noah Kim', status: 'In Progress', progress: 45, priority: 'Critical',
    startDate: '2026-02-01', targetDate: '2026-07-31',
    objective: 'Rebuild the self-service portal with unified identity and real-time dashboards.',
    kpi: 'Raise self-service resolution from 48% to 70%.',
    notes: 'Beta targeted Q3. Depends on API Gateway (MER-TEC-03).', risks: 'UX research recruitment delayed 2 weeks.',
    totalBudget: 18000000, utilizedBudget: 8100000, financials: { budget: 18000000, spent: 8100000 },
    classifiedDependencies: [
      { id: 'd1', kind: 'internal', department: 'Technology', description: 'API Gateway endpoints', status: 'In Progress', owners: ['Wei Chen'] },
    ],
    tasks: [
      task('t1', 'Identity integration', 'Sofia Almeida', 'In Progress', { progress: 60 }),
      task('t2', 'Dashboard components', 'Noah Kim', 'In Progress', { progress: 50 }),
      task('t3', 'Accessibility audit', 'Leila Haddad', 'To Do', { progress: 0, dueDate: '2026-07-05' }),
      task('t4', 'Beta launch', 'Isabella Rossi', 'Backlog', { progress: 0 }),
    ],
  },
  {
    id: 'MER-TEC-02', name: 'Multi-Cloud Migration – Phase 2', department: 'Technology', subdivision: 'Infrastructure',
    owner: 'Daniel Okafor', status: 'On Hold', progress: 28, priority: 'High',
    startDate: '2026-03-01', targetDate: '2026-12-31',
    objective: 'Lift-and-shift on-premise workloads to AWS + Azure with DR.',
    kpi: 'Reduce infra opex 22%; 99.95% availability.',
    notes: 'On hold pending security sign-off.', risks: 'Security clearance blocking workload transfer.',
    totalBudget: 35000000, utilizedBudget: 9800000, financials: { budget: 35000000, spent: 9800000 },
    tasks: [
      task('t1', 'Landing zone setup', 'Daniel Okafor', 'Completed', { progress: 100 }),
      task('t2', 'Security review', 'Sofia Almeida', 'Review', { progress: 70, dueDate: '2026-07-15' }),
      task('t3', 'Workload migration wave 1', 'Wei Chen', 'To Do', { progress: 0 }),
    ],
  },
  {
    id: 'MER-FIN-01', name: 'ESG & Sustainability Reporting Hub', department: 'Finance', subdivision: 'FP&A',
    owner: 'Hiroshi Tanaka', status: 'In Progress', progress: 74, priority: 'Medium',
    startDate: '2025-10-01', targetDate: '2026-06-30',
    objective: 'Centralise ESG data and automate regulatory reporting.',
    kpi: 'Cut reporting cycle from 6 weeks to 5 days.',
    notes: 'Data pipeline live; regulatory submission due June.', risks: 'Regulatory scope may expand.',
    totalBudget: 6500000, utilizedBudget: 4810000, financials: { budget: 6500000, spent: 4810000 },
    tasks: [
      task('t1', 'Data pipeline', 'Wei Chen', 'Completed', { progress: 100 }),
      task('t2', 'Regulatory templates', 'Hiroshi Tanaka', 'In Progress', { progress: 65 }),
      task('t3', 'Auditor walkthrough', 'Elena Popova', 'To Do', { progress: 0, dueDate: '2026-06-20' }),
    ],
  },
  {
    id: 'MER-TEC-03', name: 'API Gateway Rollout', department: 'Technology', subdivision: 'Applications',
    owner: 'Wei Chen', status: 'Completed', progress: 100, priority: 'High',
    startDate: '2025-09-01', targetDate: '2026-03-31',
    objective: 'Unified API gateway with rate-limiting, OAuth 2.0 and observability.',
    kpi: 'All 40 services behind the gateway; p95 latency < 120ms.',
    notes: 'Deployed March 2026. All services migrated.', risks: 'None outstanding.',
    totalBudget: 9500000, utilizedBudget: 9200000, financials: { budget: 9500000, spent: 9200000 },
    tasks: [
      task('t1', 'Gateway deployment', 'Wei Chen', 'Completed', { progress: 100 }),
      task('t2', 'Service migration', 'Daniel Okafor', 'Completed', { progress: 100 }),
    ],
  },
  {
    id: 'MER-HR-01', name: 'Workforce Analytics Platform', department: 'Human Resources', subdivision: 'People Operations',
    owner: 'Grace Mwangi', status: 'Not Started', progress: 0, priority: 'Medium',
    startDate: '2026-07-01', targetDate: '2027-01-31',
    objective: 'Real-time capacity, attrition prediction and skill-gap analytics.',
    kpi: 'Predict attrition 1 quarter ahead at 80% precision.',
    notes: 'Scoping workshop scheduled for July.', risks: 'Depends on ERP data availability.',
    totalBudget: 11000000, utilizedBudget: 0, financials: { budget: 11000000, spent: 0 },
    classifiedDependencies: [
      { id: 'd1', kind: 'internal', department: 'Technology', description: 'ERP data feed post-migration', status: 'Pending', owners: ['Priya Nair'] },
    ],
    tasks: [ task('t1', 'Scoping workshop', 'Grace Mwangi', 'Backlog', { progress: 0, dueDate: '2026-07-18' }) ],
  },
  {
    id: 'MER-COM-01', name: 'Loyalty Programme Revamp', department: 'Commercial', subdivision: 'Loyalty',
    owner: 'Marcus Bennett', status: 'In Progress', progress: 55, priority: 'High',
    startDate: '2026-01-01', targetDate: '2026-08-31',
    objective: 'Next-gen loyalty engine with personalised rewards and gamification.',
    kpi: 'Lift repeat-purchase rate 15%.',
    notes: 'Tier structure finalised; soft launch July.', risks: 'Partner API timelines uncertain.',
    totalBudget: 23000000, utilizedBudget: 12650000, financials: { budget: 23000000, spent: 12650000 },
    classifiedDependencies: [
      { id: 'd1', kind: 'external', department: 'Payments Partner', description: 'Rewards settlement API', status: 'In Progress', owners: ['Ana Ribeiro'] },
    ],
    tasks: [
      task('t1', 'Rewards engine', 'Ana Ribeiro', 'In Progress', { progress: 60 }),
      task('t2', 'Tier migration', 'Marcus Bennett', 'In Progress', { progress: 45 }),
      task('t3', 'Soft launch', 'Isabella Rossi', 'To Do', { progress: 0, dueDate: '2026-07-25' }),
    ],
  },
  {
    id: 'MER-TEC-04', name: 'Zero-Trust Security Programme', department: 'Technology', subdivision: 'Cybersecurity',
    owner: 'Sofia Almeida', status: 'In Progress', progress: 38, priority: 'Critical',
    startDate: '2026-02-15', targetDate: '2026-11-30',
    objective: 'Enterprise-wide zero-trust network access and identity hardening.',
    kpi: '100% workforce on phishing-resistant MFA.',
    notes: 'Identity platform deployed; network segmentation underway.', risks: 'Unmanaged endpoint inventory larger than scoped.',
    totalBudget: 29000000, utilizedBudget: 11020000, financials: { budget: 29000000, spent: 11020000 },
    tasks: [
      task('t1', 'MFA rollout', 'Sofia Almeida', 'In Progress', { progress: 70 }),
      task('t2', 'Network segmentation', 'Daniel Okafor', 'In Progress', { progress: 30 }),
      task('t3', 'Endpoint onboarding', 'Wei Chen', 'To Do', { progress: 0, dueDate: '2026-09-30' }),
    ],
  },
  {
    id: 'MER-FIN-02', name: 'Procurement Digitisation', department: 'Finance', subdivision: 'Procurement',
    owner: 'Elena Popova', status: 'In Progress', progress: 50, priority: 'Medium',
    startDate: '2025-11-01', targetDate: '2026-07-31',
    objective: 'Source-to-pay automation with supplier portal and e-invoicing.',
    kpi: 'Cut invoice processing cost 40%.',
    notes: 'Supplier portal in pilot with 20 vendors.', risks: 'Supplier onboarding slower than planned.',
    totalBudget: 7800000, utilizedBudget: 3900000, financials: { budget: 7800000, spent: 3900000 },
    tasks: [
      task('t1', 'Supplier portal pilot', 'Elena Popova', 'In Progress', { progress: 60 }),
      task('t2', 'E-invoicing integration', 'Hiroshi Tanaka', 'To Do', { progress: 0 }),
    ],
  },
  {
    id: 'MER-CX-02', name: 'Mobile App Relaunch', department: 'Customer Experience', subdivision: 'Digital Product',
    owner: 'Noah Kim', status: 'Delayed', progress: 32, priority: 'High',
    startDate: '2026-01-20', targetDate: '2026-06-15',
    objective: 'Complete rebuild on React Native with offline-first architecture.',
    kpi: 'App-store rating from 3.6 to 4.5.',
    notes: 'App-store policy review added a 3-week delay.', risks: 'Privacy manifest changes may need more dev cycles.',
    totalBudget: 16000000, utilizedBudget: 5120000, financials: { budget: 16000000, spent: 5120000 },
    tasks: [
      task('t1', 'Design system', 'Leila Haddad', 'Completed', { progress: 100 }),
      task('t2', 'Offline sync engine', 'Noah Kim', 'In Progress', { progress: 40 }),
      task('t3', 'Internal beta', 'Isabella Rossi', 'To Do', { progress: 0, dueDate: '2026-07-10' }),
    ],
  },
  {
    id: 'MER-OPS-01', name: 'Warehouse Automation', department: 'Operations', subdivision: 'Supply Chain',
    owner: 'Fatima Al-Rashid', status: 'In Progress', progress: 48, priority: 'High',
    startDate: '2026-02-01', targetDate: '2026-10-31',
    objective: 'Automated pick-and-pack with robotics and real-time inventory.',
    kpi: 'Raise throughput 35%; cut pick errors to < 0.2%.',
    notes: 'Robotics vendor selected; site retrofit in progress.', risks: 'Facility retrofit dependency on landlord approvals.',
    totalBudget: 31000000, utilizedBudget: 14880000, financials: { budget: 31000000, spent: 14880000 },
    classifiedDependencies: [
      { id: 'd1', kind: 'internal', department: 'Operations', description: 'Facilities retrofit', status: 'In Progress', owners: ['James Sullivan'] },
    ],
    tasks: [
      task('t1', 'Robotics procurement', 'Fatima Al-Rashid', 'Completed', { progress: 100 }),
      task('t2', 'Site retrofit', 'James Sullivan', 'In Progress', { progress: 40 }),
      task('t3', 'WMS integration', 'Wei Chen', 'To Do', { progress: 0, dueDate: '2026-09-15' }),
    ],
  },
  {
    id: 'MER-OPS-02', name: 'Facilities Energy Optimisation', department: 'Operations', subdivision: 'Facilities',
    owner: 'James Sullivan', status: 'Completed', progress: 100, priority: 'Low',
    startDate: '2025-08-01', targetDate: '2026-02-28',
    objective: 'IoT-based HVAC and lighting optimisation across 12 sites.',
    kpi: 'Cut energy consumption 18%.',
    notes: 'Delivered; 19% energy reduction achieved.', risks: 'None.',
    totalBudget: 5400000, utilizedBudget: 5100000, financials: { budget: 5400000, spent: 5100000 },
    tasks: [ task('t1', 'IoT rollout', 'Oliver Grant', 'Completed', { progress: 100 }) ],
  },
  {
    id: 'MER-COM-02', name: 'Retail Media Network Launch', department: 'Commercial', subdivision: 'Brand & Marketing',
    owner: 'Ana Ribeiro', status: 'In Progress', progress: 22, priority: 'Medium',
    startDate: '2026-04-01', targetDate: '2026-12-15',
    objective: 'Stand up a retail-media advertising network for brand partners.',
    kpi: 'Sign 25 brand advertisers in year one.',
    notes: 'Ad-serving platform evaluation underway.', risks: 'Ad-tech build-vs-buy decision pending.',
    totalBudget: 14500000, utilizedBudget: 3190000, financials: { budget: 14500000, spent: 3190000 },
    tasks: [
      task('t1', 'Platform evaluation', 'Ana Ribeiro', 'In Progress', { progress: 40 }),
      task('t2', 'Advertiser pipeline', 'Marcus Bennett', 'To Do', { progress: 0 }),
    ],
  },
  {
    id: 'MER-HR-02', name: 'Leadership Development Academy', department: 'Human Resources', subdivision: 'Learning & Development',
    owner: 'Tom Whitfield', status: 'In Progress', progress: 66, priority: 'Low',
    startDate: '2025-12-01', targetDate: '2026-08-31',
    objective: 'Launch a structured leadership pathway with coaching and cohorts.',
    kpi: 'Fill 60% of leadership roles internally.',
    notes: 'Cohort 1 in progress; cohort 2 enrolling.', risks: 'Manager time availability for coaching.',
    totalBudget: 3200000, utilizedBudget: 2112000, financials: { budget: 3200000, spent: 2112000 },
    tasks: [
      task('t1', 'Curriculum design', 'Tom Whitfield', 'Completed', { progress: 100 }),
      task('t2', 'Cohort 1 delivery', 'Grace Mwangi', 'In Progress', { progress: 70 }),
    ],
  },
  {
    id: 'MER-CX-03', name: 'Voice-of-Customer Analytics', department: 'Customer Experience', subdivision: 'UX Research',
    owner: 'Leila Haddad', status: 'Delayed', progress: 40, priority: 'Medium',
    startDate: '2026-01-10', targetDate: '2026-05-31',
    objective: 'Unify survey, support and social signals into a single CX index.',
    kpi: 'Weekly CX index with drill-down by journey.',
    notes: 'Sentiment model retraining slipped 3 weeks.', risks: 'Data quality from legacy survey tool.',
    totalBudget: 4100000, utilizedBudget: 1640000, financials: { budget: 4100000, spent: 1640000 },
    tasks: [
      task('t1', 'Signal ingestion', 'Wei Chen', 'Completed', { progress: 100 }),
      task('t2', 'Sentiment model', 'Leila Haddad', 'In Progress', { progress: 45 }),
    ],
  },
  {
    id: 'MER-FIN-03', name: 'Treasury Cash-Flow Forecasting', department: 'Finance', subdivision: 'Treasury',
    owner: 'Hiroshi Tanaka', status: 'Not Started', progress: 0, priority: 'Low',
    startDate: '2026-08-01', targetDate: '2026-12-31',
    objective: 'AI-assisted 13-week rolling cash-flow forecast.',
    kpi: 'Forecast accuracy within ±3%.',
    notes: 'Kicks off Q3 after ESG hub wraps.', risks: 'Data consolidation across entities.',
    totalBudget: 2600000, utilizedBudget: 0, financials: { budget: 2600000, spent: 0 },
    tasks: [ task('t1', 'Requirements', 'Hiroshi Tanaka', 'Backlog', { progress: 0 }) ],
  },
  {
    id: 'MER-COM-03', name: 'B2B Sales Enablement Platform', department: 'Commercial', subdivision: 'Sales',
    owner: 'Marcus Bennett', status: 'In Progress', progress: 58, priority: 'Medium',
    startDate: '2025-11-15', targetDate: '2026-07-15',
    objective: 'CRM-integrated content, quoting and pipeline analytics for sales.',
    kpi: 'Cut quote turnaround from 4 days to same-day.',
    notes: 'Quoting module live; analytics in build.', risks: 'CRM data hygiene.',
    totalBudget: 8900000, utilizedBudget: 5162000, financials: { budget: 8900000, spent: 5162000 },
    tasks: [
      task('t1', 'Quoting module', 'Marcus Bennett', 'Completed', { progress: 100 }),
      task('t2', 'Pipeline analytics', 'Oliver Grant', 'In Progress', { progress: 45 }),
    ],
  },
  {
    id: 'MER-OPS-03', name: 'Service Delivery SLA Overhaul', department: 'Operations', subdivision: 'Service Delivery',
    owner: 'Oliver Grant', status: 'In Progress', progress: 30, priority: 'High',
    startDate: '2026-03-10', targetDate: '2026-06-01',
    objective: 'Redefine SLAs and stand up automated SLA breach alerting.',
    kpi: 'Raise SLA attainment from 91% to 98%.',
    notes: 'Overdue — SLA definitions under exec review.', risks: 'Cross-department SLA ownership disputes.',
    totalBudget: 3600000, utilizedBudget: 1080000, financials: { budget: 3600000, spent: 1080000 },
    tasks: [
      task('t1', 'SLA definitions', 'Oliver Grant', 'Review', { progress: 60 }),
      task('t2', 'Breach alerting', 'Wei Chen', 'To Do', { progress: 0 }),
    ],
  },
  {
    id: 'MER-TEC-05', name: 'Enterprise Data Lakehouse', department: 'Technology', subdivision: 'Data & AI',
    owner: 'Wei Chen', status: 'In Progress', progress: 52, priority: 'High',
    startDate: '2025-10-15', targetDate: '2026-09-30',
    objective: 'Consolidate analytics onto a governed lakehouse with a semantic layer.',
    kpi: 'Single source of truth for 90% of executive KPIs.',
    notes: 'Ingestion framework live; semantic layer in build.', risks: 'Data ownership and governance sign-off.',
    totalBudget: 21000000, utilizedBudget: 10920000, financials: { budget: 21000000, spent: 10920000 },
    tasks: [
      task('t1', 'Ingestion framework', 'Wei Chen', 'Completed', { progress: 100 }),
      task('t2', 'Semantic layer', 'Daniel Okafor', 'In Progress', { progress: 40 }),
      task('t3', 'BI migration', 'Oliver Grant', 'To Do', { progress: 0, dueDate: '2026-09-01' }),
    ],
  },
];

// ── Risks ───────────────────────────────────────────────────────────────
export const DEMO_RISKS: Risk[] = [
  { id: 'MER-RISK-01', projectId: 'MER-TEC-01', description: 'Integration vendor flagged a 6-week delay on the finance connector.', category: 'Vendor', impact: 'High', likelihood: 3, score: 12, severity: 'High', owner: 'Priya Nair', mitigation: 'Engage a secondary vendor as contingency; re-sequence dependent milestones.', status: 'Open', targetDate: '2026-08-31' },
  { id: 'MER-RISK-02', projectId: 'MER-CX-02', description: 'New privacy-manifest requirements may require additional development cycles.', category: 'Compliance', impact: 'Medium', likelihood: 4, score: 8, severity: 'Medium', owner: 'Noah Kim', mitigation: 'Allocate a 2-week buffer; legal review in progress.', status: 'Open', targetDate: '2026-06-30' },
  { id: 'MER-RISK-03', projectId: 'MER-TEC-04', description: '340 unmanaged endpoints discovered outside the original scope.', category: 'Scope', impact: 'High', likelihood: 3, score: 12, severity: 'High', owner: 'Sofia Almeida', mitigation: 'Phased onboarding: critical assets first, BYOD in Phase 3.', status: 'Open', targetDate: '2026-09-30' },
  { id: 'MER-RISK-04', projectId: 'MER-OPS-01', description: 'Facility retrofit dependent on landlord approvals not yet secured.', category: 'External', impact: 'High', likelihood: 2, score: 8, severity: 'Medium', owner: 'James Sullivan', mitigation: 'Escalate to legal; prepare alternate site as fallback.', status: 'Open', targetDate: '2026-08-15' },
  { id: 'MER-RISK-05', projectId: 'MER-COM-01', description: 'Payments partner rewards-settlement API timelines uncertain.', category: 'Vendor', impact: 'Medium', likelihood: 3, score: 9, severity: 'Medium', owner: 'Ana Ribeiro', mitigation: 'Build an abstraction layer to swap providers if needed.', status: 'Open', targetDate: '2026-07-31' },
  { id: 'MER-RISK-06', projectId: 'MER-OPS-03', description: 'Cross-department disputes over SLA ownership are stalling sign-off.', category: 'Organisational', impact: 'Medium', likelihood: 4, score: 12, severity: 'High', owner: 'Oliver Grant', mitigation: 'Exec steering committee to arbitrate ownership by 1 June.', status: 'Open', targetDate: '2026-06-01' },
  { id: 'MER-RISK-07', projectId: 'MER-CX-03', description: 'Legacy survey-tool data quality is degrading sentiment-model accuracy.', category: 'Data', impact: 'Medium', likelihood: 3, score: 9, severity: 'Medium', owner: 'Leila Haddad', mitigation: 'Add validation rules; backfill from support transcripts.', status: 'Open', targetDate: '2026-05-31' },
  { id: 'MER-RISK-08', projectId: 'MER-TEC-02', description: 'Security clearance for workload transfer is blocking the migration wave.', category: 'Security', impact: 'High', likelihood: 3, score: 12, severity: 'High', owner: 'Sofia Almeida', mitigation: 'Fast-track review with the CISO; prioritise low-sensitivity workloads first.', status: 'Open', targetDate: '2026-07-15' },
  { id: 'MER-RISK-09', projectId: 'MER-FIN-02', description: 'Supplier onboarding to the new portal is slower than planned.', category: 'Adoption', impact: 'Low', likelihood: 3, score: 6, severity: 'Low', owner: 'Elena Popova', mitigation: 'Dedicated onboarding concierge for the top 50 suppliers.', status: 'Open', targetDate: '2026-07-31' },
  { id: 'MER-RISK-10', projectId: 'MER-TEC-05', description: 'Data-governance sign-off pending could delay the semantic layer.', category: 'Governance', impact: 'Medium', likelihood: 2, score: 6, severity: 'Medium', owner: 'Wei Chen', mitigation: 'Stand up a data council; ratify policies in the next cycle.', status: 'Open', targetDate: '2026-08-31' },
  { id: 'MER-RISK-11', projectId: 'MER-TEC-03', description: 'Rate-limit thresholds needed tuning post-launch to avoid throttling.', category: 'Technical', impact: 'Low', likelihood: 2, score: 4, severity: 'Low', owner: 'Wei Chen', mitigation: 'Adaptive rate limits deployed; monitoring in place.', status: 'Closed', targetDate: '2026-03-15' },
  { id: 'MER-RISK-12', projectId: 'MER-OPS-02', description: 'Initial IoT sensor batch had a 4% defect rate.', category: 'Vendor', impact: 'Low', likelihood: 2, score: 4, severity: 'Low', owner: 'Oliver Grant', mitigation: 'Vendor replaced defective units; a QA gate was added at receiving.', status: 'Closed', targetDate: '2026-01-31' },
  { id: 'MER-RISK-13', projectId: 'MER-COM-01', description: 'Gamification mechanics could be gamed without abuse controls.', category: 'Product', impact: 'Medium', likelihood: 3, score: 9, severity: 'Medium', owner: 'Marcus Bennett', mitigation: 'Add velocity checks and anomaly detection before launch.', status: 'Open', targetDate: '2026-08-10' },
  { id: 'MER-RISK-14', projectId: 'MER-FIN-01', description: 'Expanding ESG regulation may add disclosure requirements mid-project.', category: 'Regulatory', impact: 'Medium', likelihood: 3, score: 9, severity: 'Medium', owner: 'Hiroshi Tanaka', mitigation: 'Design flexible schema; monitor regulatory bulletins monthly.', status: 'Open', targetDate: '2026-06-30' },
];

// ── Notifications (make the system feel actively used) ─────────────────────
export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 1, title: 'Project delayed', message: '“Mobile App Relaunch” slipped past its target date — now overdue.', type: 'critical', time: '2h ago', read: false },
  { id: 2, title: 'Approval requested', message: 'Marcus Bennett requested budget approval for Retail Media Network Launch.', type: 'warning', time: '4h ago', read: false },
  { id: 3, title: 'Risk raised', message: 'Sofia Almeida raised a High risk on Zero-Trust Security Programme.', type: 'warning', time: '6h ago', read: false },
  { id: 4, title: 'Milestone completed', message: 'API Gateway Rollout reached 100% — programme closed.', type: 'success', time: 'Yesterday', read: true },
  { id: 5, title: 'AI insight', message: 'Wei Chen is on 4 active projects — a potential capacity bottleneck.', type: 'insight', time: 'Yesterday', read: true },
  { id: 6, title: 'New task assigned', message: 'You were assigned “Go-live readiness review” on ERP Modernisation.', type: 'info', time: '2 days ago', read: true },
  { id: 7, title: 'SLA at risk', message: 'Service Delivery SLA Overhaul is overdue and pending exec review.', type: 'warning', time: '2 days ago', read: true },
];
