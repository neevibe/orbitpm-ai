# Xyrenis — AI-Powered Enterprise Project Intelligence

> Built by an AI Product Manager. Shipped to production. Zero traditional engineering headcount.

**[→ Live Demo](https://xyrenis-8k1bn7xv4-neeraj-s-projects6.vercel.app)** — click "Try Live Demo Account", no sign-up required.

---

## What this is

Xyrenis is a production enterprise project portfolio management platform built for complex, multi-department organisations. It replaces the spreadsheet-and-meeting cycle with a real-time AI copilot that knows your portfolio, surfaces risks before they escalate, and answers natural-language questions like *"who's overloaded?"* or *"which critical projects will miss their deadline?"* — grounded entirely on live data.

Built from scratch by one AI Product Manager: product strategy → design → full-stack code → CI/CD → production. No engineering team.

---

## System Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│  BROWSER  (Next.js 16 · React 19 · TypeScript · Tailwind CSS v4)         │
│                                                                           │
│  Landing Page                Auth Shell               Core App Pages      │
│  Cinematic hero (video)      RBAC routing guard        Command Center      │
│  Pill nav · Framer Motion    4-tier permission check   Projects · Portfolio│
│  3× marquee ribbons          Demo session flag         Departments · Risks │
│  Demo login (1 click)        Logo reveal animation     AI Copilot · Admin  │
│                                                                           │
│  Data Context (React Context — no Redux)                                  │
│  Live ↔ Demo switch · Optimistic CRUD · KPI memoisation · Mirror logic   │
├───────────────────────────────────────────────────────────────────────────┤
│  NEXT.JS SERVER  (App Router · SSR-first · Serverless)                   │
│                                                                           │
│  Auth Middleware                   API Routes                             │
│  Supabase JWT validation           /api/ai-chat       Hybrid AI engine    │
│  4-tier RBAC derivation            /api/projects      CRUD + Supabase     │
│  Dept-scoped write guards          /api/audit         Event persistence   │
│  Pre-provisioned activation        /api/auth/activate Employee onboarding │
│  Session refresh recovery          /api/admin/*       User management     │
│                                    /api/export · /api/import  xlsx        │
├───────────────────────────────────────────────────────────────────────────┤
│  AI COPILOT ENGINE  (/api/ai-chat)                                        │
│                                                                           │
│  ① Heuristic Router  (free · instant · deterministic)                    │
│     Regex intent classifier → answers from live Supabase snapshot        │
│     Covers: delayed projects · team workload · risk register ·            │
│     owner lookups · dept breakdowns · portfolio summaries · project detail│
│                                                                           │
│  ↓ Falls through for open-ended / conversational queries                 │
│                                                                           │
│  ② LLM Fallback  (grounded on the same live data)                        │
│     Primary:  Claude Opus 4.8   (Anthropic)                              │
│     Alternate: Gemini 2.5 Flash (Google) — env-var hot-switch            │
│     12-turn conversation memory · prompt cache · 1500 token output cap   │
├───────────────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                               │
│                                                                           │
│  Supabase (PostgreSQL)          Demo Data           LLM Providers         │
│  projects · departments         demo-data.ts        Anthropic API         │
│  risks · audit_log             10 fictional projects Google Gemini API    │
│  auth.users (pre-provisioned)   sessionStorage flag  Prompt cache         │
│  RLS · service key server-only  view-only perms     env-var provider swap │
│                                                                           │
│  Deploy: Vercel (Edge CDN · serverless · GitHub auto-deploy on push)     │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 (CSS `@theme`), Framer Motion v12 |
| 3D / WebGL | Three.js, @react-three/fiber, @react-three/drei |
| Charts | Recharts, Apache ECharts |
| UI Primitives | Radix UI (accessible, headless) |
| Auth | Supabase Auth (JWT, 4-tier RBAC, RLS) |
| Database | Supabase (PostgreSQL) |
| AI — Primary | Anthropic Claude Opus 4.8 |
| AI — Alternate | Google Gemini 2.5 Flash |
| Data Export | SheetJS (xlsx) |
| Deploy | Vercel (Edge Network, preview-per-branch) |

---

## Core Features

### AI Copilot — Hybrid Engine
The copilot uses a two-stage approach that is faster and cheaper than a pure LLM:

1. **Heuristic router** handles ~80% of queries instantly, for free. A regex intent classifier detects structured questions (delayed projects, workload, risk counts, owner lookups) and answers them directly from a live Supabase data snapshot — no LLM call, no latency, no cost.

2. **LLM fallback** (Claude Opus 4.8 / Gemini 2.5 Flash) handles the rest: open-ended conversation, follow-up questions, meeting-note parsing, recovery plans. Both layers read the same live data so the LLM can never fabricate project facts.

Switch providers by setting `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` in your environment — no code change needed.

### RBAC & Multi-department Access
- 4-tier permission model: `view → edit → modify → admin`
- Department-scoped write guards: users can only modify projects in their own department
- Pre-provisioned employee activation — admins seed users; employees set their own password on first login
- Internal (`@org.com`) vs external user classification

### Demo Mode
- One click, zero credentials, instant access
- Completely fictional data: 10 enterprise-style projects, invented names, no proprietary information
- Bypasses Supabase entirely — `sessionStorage` flag activates a client-side fake data layer
- View-only permissions throughout; amber "Demo Mode — Masked Data" badge in topbar

### Project Portfolio
- Command Center: live KPIs, escalation flags, owner bottlenecks, portfolio health
- Projects: table + Kanban + Gantt + RACI matrix views
- Portfolio: cross-department analytics, completion rate heatmap, priority distribution
- Departments: per-department breakdown with drill-down
- Dependencies: internal (cross-department mirror logic) + external (vendor/partner)
- Risk Register: severity scoring, mitigation tracking, open/closed lifecycle

### Admin Console
- User management: roles, departments, permissions, internal/external badge
- Audit log: every CRUD action and auth event persisted to Supabase
- Admin monitoring dashboard with filterable timeline

---

## Key Design Decisions

**Hybrid AI over pure LLM** — Pure LLMs hallucinate project facts and cost money on every query. The heuristic layer handles deterministic questions instantly and for free. The LLM is only invoked for genuinely ambiguous queries, and always receives a live data snapshot as grounding context so it cannot fabricate numbers.

**React Context over Redux** — The data model is a single coherent portfolio owned by one organisation. Context with memoized selectors is simpler, faster to build, and right-sized for this scope. No ceremony.

**SSR-first, selective `'use client'`** — Next.js App Router defaults to server components. Only interactive leaves are marked client. Framer Motion `initial` states are `opacity: 1` to prevent the SSR/hydration visibility gap that makes content invisible on production deployments.

**Demo mode via `sessionStorage` flag** — Demo accounts that hit Supabase create real auth sessions, leave orphaned data, and require credential management. A client-side flag with static fake data is instant, zero-cost, and completely isolated.

**RBAC at the auth layer, not the UI** — Permissions are derived server-side from Supabase `user_metadata` on every request. Every API route validates the JWT and re-derives permissions independently. The UI hides buttons as a convenience; the server actually enforces them.

---

## Getting Started

```bash
git clone https://github.com/neevibe/orbitpm-ai.git
cd orbitpm-ai
npm install

# Copy and fill in environment variables
cp .env.example .env.local
```

Required env vars:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional (AI copilot — at least one required for LLM fallback):
```
ANTHROPIC_API_KEY=      # Claude Opus 4.8
GEMINI_API_KEY=         # Gemini 2.5 Flash (takes priority if both set)
```

```bash
npm run dev
# → http://localhost:3000
```

The demo mode works with zero env vars. Click "Try Live Demo Account" on the login page.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page (cinematic hero, pill nav)
│   ├── login/page.tsx            # Auth: sign-in / sign-up / demo
│   ├── command-center/page.tsx   # Main executive dashboard
│   ├── projects/                 # List view + /[id] detail page
│   ├── portfolio/                # Portfolio analytics
│   ├── departments/              # Department breakdown
│   ├── workforce/                # Capacity + workload
│   ├── risks/                    # Risk register
│   ├── dependencies/             # Dependency graph
│   ├── ai/page.tsx               # AI Copilot chat
│   ├── admin/                    # Admin console + audit log + user mgmt
│   └── api/                      # All serverless routes
├── components/
│   ├── layout/                   # AuthShell, Sidebar, Topbar
│   ├── modals/                   # ProjectModal, RiskModal, DependencyBuilder
│   ├── project/                  # Gantt, Kanban, RACI
│   └── ui/                       # Design system primitives (Radix-based)
└── lib/
    ├── auth-context.tsx          # Auth state, RBAC derivation, demo mode
    ├── data-context.tsx          # All data state + mutations + KPI engine
    ├── mock-data.ts              # Production seed data
    ├── demo-data.ts              # Fictional demo data (safe to share)
    └── supabase.ts               # Supabase client configuration
```

---

## Philosophy

This project is a live proof of concept for **AI-native product management**: a product manager with a clear vision and fluency in AI tools can ship a production-grade enterprise application — architecture, implementation, deployment, CI/CD — without a traditional engineering team.

Every decision was driven by product thinking first: *what does the user actually need, and what is the simplest thing that delivers it reliably in production?*

The result is not a prototype. It runs in production, serves a real organisation's project portfolio, and has a live demo you can explore right now.

---

*Built by [Neeraj Prakash](https://github.com/neevibe) · AI Product Manager · Bengaluru, India*
