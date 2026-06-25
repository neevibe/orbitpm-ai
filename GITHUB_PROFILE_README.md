# Neeraj Prakash

**AI Product Manager** who ships production software without a traditional engineering team.

I use AI to collapse the gap between product strategy and working code — from architecture decisions to deployment pipelines. My work sits at the intersection of enterprise product thinking, LLM orchestration, and full-stack systems design.

---

## What I'm building

### [Xyrenis](https://github.com/neevibe/orbitpm-ai) — AI-Powered Enterprise Project Intelligence

A production enterprise portfolio management platform built for large multi-department organisations. Real-time AI copilot, 4-tier RBAC, pre-provisioned user activation, dependency tracking, risk register, audit trail, and a cinematic landing page — all shipped by one PM.

**What makes it interesting:**
- **Hybrid AI engine**: a heuristic router handles ~80% of queries instantly for free; Claude Opus 4.8 / Gemini 2.5 Flash handle the rest, grounded on live Supabase data — the LLM never fabricates project facts
- **Zero-friction demo**: one click, no credentials, fully masked fictional data via `sessionStorage` flag — no Supabase session created
- **RBAC enforced server-side**: 4 permission tiers (`view → edit → modify → admin`), department-scoped write guards, JWT validation on every API route
- **SSR-first**: Next.js 16 App Router, Framer Motion with `opacity: 1` initial states to avoid the production hydration trap

**Stack**: Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase · Anthropic Claude · Google Gemini · Framer Motion · Three.js · Radix UI · Vercel

[→ Live Demo](https://xyrenis-8k1bn7xv4-neeraj-s-projects6.vercel.app) · [→ Repo](https://github.com/neevibe/orbitpm-ai)

---

## How I work

**As a PM, I speak the language of both the boardroom and the codebase.**

Most PMs write specs and hand them to engineers. I write specs and then ship them — because I've found that the fastest path from insight to working software is closing the loop yourself, using AI as the engineering multiplier.

My workflow:
- **Identify the real problem** — not what users say they want, but what their behaviour reveals they need
- **Architect before building** — clear data models, auth boundaries, and API contracts before any code
- **Ship iteratively with a UAT gate** — feature branch → preview deploy → sign-off → production. Never push to main without approval
- **Ground AI in real data** — LLM tools are only as good as their context. I design systems where AI reads live state, not hallucinated stubs

---

## Capabilities

| Domain | What I bring |
|---|---|
| Product Strategy | Zero-to-one product definition, OKR design, stakeholder alignment |
| AI/LLM Integration | Hybrid heuristic + LLM engines, prompt engineering, provider orchestration (Claude, Gemini, OpenAI), RAG patterns |
| Full-Stack (via AI) | Next.js App Router, React, TypeScript, Supabase (auth + db + RLS), serverless API routes, Vercel CI/CD |
| Systems Design | RBAC architecture, audit trails, multi-tenant data models, SSR/hydration patterns |
| UX + Motion | Framer Motion, Tailwind CSS v4, Radix UI, cinematic landing pages, responsive design |
| Data | PostgreSQL, row-level security, data modelling, analytics dashboards |

---

## What I believe

Enterprise software doesn't have to be ugly, slow, or hard to understand. The same care that goes into a consumer product — the motion design, the empty states, the zero-friction onboarding — can and should exist in B2B tools. That's the product gap I'm closing.

AI is not a chatbot you bolt onto a product. It's an intelligence layer that, when built correctly, changes how people experience an entire system. The heuristic-first, LLM-fallback pattern I use in Xyrenis is the right architecture: deterministic where you can be, intelligent where you must be, always grounded in real data.

---

## Connect

- Email: prakneer@gmail.com
- Location: Bengaluru, India
- Currently: Building AI-native enterprise products at the Antigravity Project

*Open to conversations about AI product strategy, enterprise tooling, and what happens when PMs learn to ship.*
