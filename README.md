# 🛰️ OrbitPM AI — Enterprise Project Governance Platform

> **AI-Powered Project Portfolio Intelligence for BIAL Commercial Department**
> Built with Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Recharts

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/orbitpm-ai)

---

## 📸 Screenshots

| Dashboard | Projects | Risk Register |
|-----------|----------|---------------|
| Executive KPI overview | 142 projects, table & kanban | Full risk tracking |

---

## ✨ Features

### 📊 Executive Dashboard
- Real-time KPI cards (Total Projects, In Progress, Delayed, Critical)
- CCO Decision View — Stuck Projects, Escalation Alerts, Owner Bottlenecks
- Portfolio trend charts (Area chart) + Status distribution (Donut chart)
- Department breakdown table with completion rates
- AI Executive Summary auto-generated from live data

### 📁 Project Management
- **142 real BIAL Commercial projects** across 7 departments
- Table view + Kanban board toggle
- Full-text search, status & department filters
- Create / Edit / Delete projects with full CRUD
- Click-through project detail pages

### ⚠️ Risk Register
- Risk tracking with Impact, Likelihood, Score, Category, Owner, Mitigation
- One-click Close/Reopen risk status
- High-severity alerts on sidebar badge

### 🔗 Dependencies Module
- Cross-project dependency tracking
- Assign to departments or individual users
- Status: Pending / In Progress / Blocked / Resolved

### 🤖 AI Insights
- Auto-generated portfolio intelligence from live data
- Detects: stuck projects, delayed patterns, owner bottlenecks, workload imbalance

### 🤖 AI Assistant (Copilot)
- Natural language queries about your project portfolio
- Answers: "Show delayed projects", "Executive summary", "Who is overloaded?"
- Context-aware responses using real project data

### 📈 Analytics
- Department-level stacked bar charts
- Priority distribution pie chart
- Owner workload analysis
- Completion rate heatmap per department
- Risk category breakdown

### 📤 Reports & Export
- Export to Excel (.xlsx) — BIAL-compatible format
- Sheets: Dashboard Summary, Master Index, Risk Register, Per-Department
- Import from Excel to sync project data

### ⚙️ Settings
- Excel import/export
- Team workload monitoring
- Department management

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/orbitpm-ai.git
cd orbitpm-ai

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it auto-redirects to the Executive Dashboard.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| UI | React 19 |
| Styling | Tailwind CSS v4 + Custom CSS |
| Charts | Recharts 3.x |
| Excel | SheetJS (xlsx) |
| Icons | Lucide React |
| State | React Context + useReducer |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── dashboard/        # Executive Dashboard
│   ├── projects/         # Project list + [id] detail pages
│   ├── risks/            # Risk Register
│   ├── dependencies/     # Dependency tracking
│   ├── ai-insights/      # AI-generated insights
│   ├── ai-assistant/     # AI Copilot chat
│   ├── analytics/        # Portfolio analytics charts
│   ├── reports/          # Excel export/reports
│   ├── team/             # Team workload view
│   ├── settings/         # Data import/export
│   └── api/
│       ├── export/       # Excel export API
│       └── import/       # Excel import API
├── components/
│   ├── layout/           # Sidebar, Topbar
│   └── modals/           # ProjectModal, RiskModal
└── lib/
    ├── data-context.tsx  # Global state management
    ├── mock-data.ts      # 142 BIAL projects + risks
    └── utils.ts          # Helpers
```

---

## 🌐 Deploy to Vercel (One Click)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select `orbitpm-ai` → Click **Deploy**
4. Done — your SaaS is live in ~2 minutes ✅

No environment variables required for the base MVP.

---

## 📊 Data

The platform comes pre-loaded with **142 real projects** from the BIAL Commercial Department across:
- Digital & Data (19 projects)
- Operations (35 projects)
- Commercial Development
- Advertising & Marketing
- Duty Free
- CBB & Lounge
- BASL

Data can be updated via Excel import in Settings → Data Sync.

---

## 👤 Author

**Neeraj Prakash** — BIAL Commercial Department

---

*Built with OrbitPM AI Platform — Enterprise Project Governance*
