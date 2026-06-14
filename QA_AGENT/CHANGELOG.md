# CHANGELOG — OrbitPM AI Enterprise Work Operating System

> Maintained by QA & Release Management Agent  
> Format: [TYPE] Description — Owner: Agent | Date: YYYY-MM-DD

---

## [v1.4.0] — 2026-06-01 (Current)

### ✨ Features
- [FEAT] Redefined Stuck Projects to target deadlines reaching in ≤ 7 days (any priority).
- [FEAT] Added dismissal action (Trash icon) to remove projects from Stuck list on both Dashboard and Command Center views.
- [FEAT] Added `daysUntil` centralized utility in `src/lib/utils.ts`.

### 🔧 Enhancements
- [ENH] Dashboard AI Insight card description and summary updated to match new 7-day Stuck definition.
- [ENH] AI Copilot stuck queries updated to return projects nearing 7-day deadlines.

---

## [v1.3.0] — 2026-06-01


### 🐛 Bug Fixes
- [FIX] Sidebar "BIAL Commercial" project count was hardcoded to 142 — now dynamic (`kpi.totalProjects`)
- [FIX] Dashboard "Stuck Projects" list — clicking a project navigated away instead of opening edit panel
- [FIX] Edit button was `opacity-0` (invisible) — now always visible with "Edit" label
- [FIX] Side panel had wrong animation (`slide-up` instead of `slide-in-right`)
- [FIX] Command Center stuck project rows were not clickable — no `onClick` handler

### ✨ Features
- [FEAT] Dashboard "Stuck Projects" logic updated — now shows Critical projects with deadline ≤30 days
- [FEAT] Quick-edit side panel added to Dashboard — click any project row to edit Status, Priority, Progress, Owner
- [FEAT] Quick-edit side panel added to Command Center — same UX as Dashboard
- [FEAT] Overdue badge on project rows (red) and urgency indicator (orange for ≤7 days)
- [FEAT] AI Copilot completely rebuilt with comprehensive query engine
- [FEAT] AI Copilot: handles delayed, overdue, deadline, department, owner, risk, project ID, summary queries
- [FEAT] AI Copilot: bold text rendering, copy-to-clipboard, new chat button
- [FEAT] Dark overlay added behind edit panel for visual clarity

### 🔧 Enhancements
- [ENH] Critical In-Progress Projects section (Dashboard) — now clickable, opens edit panel
- [ENH] Panel now slides in from right with proper CSS animation
- [ENH] AI Executive Summary on dashboard now references deadline-aware data

---

## [v1.2.0] — 2026-05-29

### ✨ Features
- [FEAT] Project Split Wizard — percentage-based allocation across departments and individuals
- [FEAT] Split asks for number of splits, assigns equal % with option to customise
- [FEAT] Cross-department dependency support (same project assigned to multiple owners)
- [FEAT] `splitGroupId` and `splitPercentage` added to Project interface

### 🐛 Bug Fixes
- [FIX] Project ID format standardised — Operations = `PROPS`, no zero-padding
- [FIX] Allocate modal replaced with robust Split Wizard in `projects/[id]/page.tsx`

---

## [v1.1.0] — 2026-05-14

### ✨ Features
- [FEAT] AI Copilot initial implementation (`/ai-assistant`)
- [FEAT] Analytics page with charts and KPI breakdown
- [FEAT] Risk Register full CRUD
- [FEAT] Departments page with live stats
- [FEAT] Portfolio view with Gantt-style timeline
- [FEAT] Supabase integration for persistent data storage
- [FEAT] Vercel deployment pipeline (orbitpm-ai.vercel.app)

### 🔧 Enhancements
- [ENH] Dark mode toggle
- [ENH] Command Center dashboard with live KPI cards
- [ENH] Workforce / Team page

---

## [v1.0.0] — 2026-05-01 (Initial Release)

### ✨ Features
- [FEAT] Project created — OrbitPM AI Enterprise Work Operating System
- [FEAT] Next.js 16 / Turbopack foundation
- [FEAT] Mock data layer (`src/lib/mock-data.ts`)
- [FEAT] Data context (`src/lib/data-context.tsx`) with `useData` hook
- [FEAT] Sidebar navigation with all modules
- [FEAT] Projects CRUD (create, edit, delete, archive)
- [FEAT] Dashboard with KPI cards, charts, department table
- [FEAT] Excel import/export via API routes
