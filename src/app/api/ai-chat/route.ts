import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { requireUser } from '@/lib/api-auth';

/**
 * Xyro — the Xyrenis AI engine.
 *
 *   1. LLM-first: when an API key is configured, EVERY question goes to the
 *      model (Claude by default, Gemini if that key is set instead), grounded
 *      in a live snapshot of the whole portfolio so it never fabricates
 *      project facts. This is what makes Xyro genuinely conversational.
 *   2. Heuristic fallback (free, instant, deterministic): only used when NO
 *      API key is configured — answers structured queries (delayed projects,
 *      workload, risks, summaries) directly from live Supabase data.
 *
 * Both read the SAME real data. There are no hardcoded/fake numbers.
 */

// Public fallbacks (URL + publishable key ship in the client bundle); the
// endpoint itself is behind requireUser(), so this never serves anonymous
// callers. See src/app/api/projects/route.ts for the full rationale.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rfvhvpeqvuwrjcszyhbb.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_47y8Mn5-JzSks6SDSKxlqA_N4rBDTj3';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

// Google Gemini (Google AI Studio API key — NOT a Gemini Pro app subscription).
// Get a free key at https://aistudio.google.com/apikey
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ---------------------------------------------------------------- data layer

interface Proj {
  code: string; name: string; dept: string; owner: string;
  status: string; priority: string; progress: number; targetDate: string | null;
}
interface RiskRow { description: string; severity: string; score: number; status: string; owner: string; project: string; }
interface Data {
  projects: Proj[];
  risks: RiskRow[];
  departments: string[];
  kpi: {
    total: number; completed: number; inProgress: number; notStarted: number;
    delayed: number; onHold: number; openRisks: number; stuck: number;
  };
  workload: { owner: string; active: number }[];
}

const isCompleted = (s: string) => /complete|done|closed/i.test(s);
const daysUntil = (d: string | null) => {
  if (!d) return Infinity;
  const t = new Date(d).getTime();
  if (isNaN(t)) return Infinity;
  return Math.ceil((t - Date.now()) / 86400000);
};

async function loadData(): Promise<Data> {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const [{ data: depts }, { data: rawProjects }, { data: rawRisks }] = await Promise.all([
    db.from('departments').select('id,name'),
    db.from('projects').select('project_code,name,department_id,owner_name,status,priority,progress,target_date,archived'),
    db.from('risks').select('description,severity,score,status,owner_name,project_id'),
  ]);

  const deptMap: Record<string, string> = {};
  (depts || []).forEach(d => { deptMap[d.id] = d.name; });

  const projects: Proj[] = (rawProjects || [])
    .filter(p => !p.archived)
    .map(p => ({
      code: p.project_code || '',
      name: p.name || '',
      dept: (p.department_id && deptMap[p.department_id]) || 'Unassigned',
      owner: p.owner_name || 'Unassigned',
      status: p.status || 'Not Started',
      priority: p.priority || 'Medium',
      progress: typeof p.progress === 'number' ? p.progress : 0,
      targetDate: p.target_date || null,
    }));

  const risks: RiskRow[] = (rawRisks || []).map(r => ({
    description: r.description || '',
    severity: r.severity || '',
    score: typeof r.score === 'number' ? r.score : 0,
    status: r.status || 'Open',
    owner: r.owner_name || '',
    project: r.project_id || '',
  }));

  const kpi = {
    total: projects.length,
    completed: projects.filter(p => isCompleted(p.status)).length,
    inProgress: projects.filter(p => /progress/i.test(p.status)).length,
    notStarted: projects.filter(p => /not started|to ?do|backlog/i.test(p.status)).length,
    delayed: projects.filter(p => /delay|behind|overdue/i.test(p.status) || (!isCompleted(p.status) && daysUntil(p.targetDate) < 0)).length,
    onHold: projects.filter(p => /hold|paused|blocked/i.test(p.status)).length,
    openRisks: risks.filter(r => !/closed|resolved|mitigated/i.test(r.status)).length,
    stuck: projects.filter(p => {
      if (isCompleted(p.status)) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      const isDelayed = /delay/i.test(p.status);
      const isOverdue = p.targetDate ? p.targetDate < todayStr : false;
      return isDelayed || isOverdue;
    }).length,
  };

  const counts = new Map<string, number>();
  projects.filter(p => !isCompleted(p.status) && p.owner !== 'Unassigned')
    .forEach(p => counts.set(p.owner, (counts.get(p.owner) || 0) + 1));
  const workload = [...counts.entries()].map(([owner, active]) => ({ owner, active })).sort((a, b) => b.active - a.active);

  return { projects, risks, departments: [...new Set(projects.map(p => p.dept))].filter(Boolean), kpi, workload };
}

// ---------------------------------------------------------------- formatting

const pct = (n: number, total: number) => total ? Math.round((n / total) * 100) : 0;
const line = (p: Proj) => `• **${p.name}** — ${p.dept} · ${p.owner} · ${p.status} · ${p.progress}%${p.targetDate ? ` · due ${p.targetDate}` : ''}`;
const cap = <T,>(arr: T[], n = 12) => arr.slice(0, n);
const more = (arr: unknown[], n = 12) => arr.length > n ? `\n\n_…and ${arr.length - n} more._` : '';

// ---------------------------------------------------------------- heuristics

function heuristicAnswer(message: string, data: Data): string | null {
  const m = message.toLowerCase().trim();
  const { projects, risks, kpi, workload } = data;

  // pure greeting
  if (/^(hi|hello|hey|namaskara|namaste|good (morning|afternoon|evening)|yo)\b[\s!.]*$/i.test(m)) {
    return `🙏 Namaskara! I'm Xyro, your Xyrenis copilot. I'm tracking **${kpi.total} active projects** across **${data.departments.length} departments**. Ask me about delayed projects, team workload, risks, or any project's status.`;
  }

  // owner lookup — "projects handled by / assigned to / owned by <name>", or @name
  const owners = [...new Set(projects.map(p => p.owner))].filter(o => o && o !== 'Unassigned');
  const matchedOwner = owners.find(o => {
    const nameLower = o.toLowerCase();
    if (m.includes(nameLower)) return true;
    
    // Split name into parts (handling slash and space). Generic words like
    // "projects" or "team" must never match — owner strings such as
    // "Dominic / Projects team" would otherwise claim every projects question.
    const STOP = ['and', 'the', 'for', 'owner', 'team', 'teams', 'major', 'project', 'projects', 'group', 'dept', 'department', 'all'];
    const parts = nameLower.split(/[\s/]+/).filter(part => part.length > 2 && !STOP.includes(part));
    return parts.some(part => {
      const regex = new RegExp(`\\b${part}\\b`, 'i');
      return regex.test(m);
    });
  });

  // project lookup — by name or code
  const matchedProject = projects.find(p =>
    (p.code && m.includes(p.code.toLowerCase())) ||
    (p.name && p.name.length > 3 && m.includes(p.name.toLowerCase())));

  if (matchedProject && !/all|every|list|which projects/i.test(m)) {
    const p = matchedProject;
    const projRisks = risks.filter(r => r.project && (r.project === p.code));
    const dleft = daysUntil(p.targetDate);
    return `📌 **${p.name}** (${p.code})\n\n` +
      `• Department: **${p.dept}**\n• Owner: **${p.owner}**\n• Status: **${p.status}** · ${p.progress}% complete\n` +
      `• Priority: **${p.priority}**\n• Target: **${p.targetDate || 'not set'}**` +
      (dleft !== Infinity ? ` (${dleft < 0 ? `⚠️ ${Math.abs(dleft)} days overdue` : `${dleft} days left`})` : '') +
      (projRisks.length ? `\n• Open risks: **${projRisks.length}**` : '') +
      `\n\nWant the dependency map or a recovery plan for this one?`;
  }

  if (matchedOwner && /(project|task|handl|working|assign|own|doing|busy|load)/i.test(m)) {
    const theirs = projects.filter(p => {
      const ownerLower = p.owner.toLowerCase();
      if (ownerLower.includes(matchedOwner.toLowerCase())) return true;
      
      const matchedParts = matchedOwner.toLowerCase().split(/[\s/]+/).filter(part => part.length > 2 && !['and', 'the', 'for', 'owner', 'team', 'teams', 'major', 'project', 'projects', 'group', 'dept', 'department', 'all'].includes(part));
      return matchedParts.some(part => {
        const regex = new RegExp(`\\b${part}\\b`, 'i');
        return regex.test(ownerLower);
      });
    });
    const active = theirs.filter(p => !isCompleted(p.status));
    return `👤 **${matchedOwner}** owns **${theirs.length} projects** (${active.length} active):\n\n` +
      cap(theirs).map(line).join('\n') + more(theirs) +
      `\n\nWould you like to rebalance their workload or flag any at-risk items?`;
  }

  // delayed / overdue
  if (/(delay|behind schedule|overdue|slipping|late)/i.test(m)) {
    const delayed = projects.filter(p => /delay|behind|overdue/i.test(p.status) || (!isCompleted(p.status) && daysUntil(p.targetDate) < 0));
    if (!delayed.length) return `✅ Good news — **no projects are currently delayed**. ${kpi.stuck} are stuck (delayed or overdue), though. Want to see those?`;
    return `🔴 **${delayed.length} delayed projects** (${pct(delayed.length, kpi.total)}% of portfolio):\n\n` +
      cap(delayed).map(line).join('\n') + more(delayed) +
      `\n\nWant me to draft a recovery plan or identify the common bottlenecks?`;
  }

  // stuck / needs attention / escalation
  if (/(stuck|attention|escalat|at risk|deadline|due soon|this week|urgent)/i.test(m)) {
    const stuck = projects.filter(p => {
      if (isCompleted(p.status)) return false;
      const todayStr = new Date().toISOString().split('T')[0];
      const isDelayed = /delay/i.test(p.status);
      const isOverdue = p.targetDate ? p.targetDate < todayStr : false;
      return isDelayed || isOverdue;
    }).sort((a, b) => daysUntil(a.targetDate) - daysUntil(b.targetDate));
    if (!stuck.length) return `👍 Nothing critical — no active projects are stuck (delayed or overdue).`;
    return `⚠️ **${stuck.length} projects are stuck** (delayed or overdue):\n\n` +
      cap(stuck).map(p => {
        const d = daysUntil(p.targetDate);
        return `${line(p)} ${d !== Infinity ? (d < 0 ? `· **${Math.abs(d)}d overdue**` : `· **${d}d left**`) : ''}`;
      }).join('\n') + more(stuck) +
      `\n\nShall I notify the owners or escalate the critical ones?`;
  }

  // risks
  if (/\brisk/i.test(m)) {
    const open = risks.filter(r => !/closed|resolved|mitigated/i.test(r.status)).sort((a, b) => b.score - a.score);
    if (!open.length) return `✅ **No open risks** are currently logged across the portfolio.`;
    return `🛡️ **${open.length} open risks** across the portfolio. Highest-scoring:\n\n` +
      cap(open, 8).map(r => `• **${r.description.slice(0, 80)}** — score ${r.score}${r.owner ? ` · ${r.owner}` : ''}`).join('\n') + more(open, 8) +
      `\n\nWant the full risk register or mitigation suggestions for the top items?`;
  }

  // workload / capacity / bottleneck
  if (/(workload|capacity|overload|bottleneck|busiest|most projects|spare|available|who has)/i.test(m)) {
    if (!workload.length) return `No active project ownership data is available right now.`;
    const top = cap(workload, 8);
    const overloaded = workload.filter(w => w.active >= 4);
    return `📊 **Team workload** (active projects per owner):\n\n` +
      top.map((w, i) => `${i + 1}. **${w.owner}** — ${w.active} active${w.active >= 4 ? ' ⚠️' : ''}`).join('\n') +
      (overloaded.length ? `\n\n⚠️ **${overloaded.length} owners** are carrying 4+ active projects — candidates for rebalancing.` : '') +
      `\n\nWant me to recommend who can take on new work?`;
  }

  // department breakdown
  if (/(department|dept|by team|which team|each team)/i.test(m)) {
    const byDept = data.departments.map(d => {
      const ps = projects.filter(p => p.dept === d);
      return { d, total: ps.length, done: ps.filter(p => isCompleted(p.status)).length, delayed: ps.filter(p => /delay|behind/i.test(p.status) || (!isCompleted(p.status) && daysUntil(p.targetDate) < 0)).length };
    }).sort((a, b) => b.total - a.total);
    return `🏢 **Department breakdown:**\n\n` +
      byDept.map(x => `• **${x.d}** — ${x.total} projects · ${x.done} done · ${x.delayed} delayed (${pct(x.done, x.total)}% complete)`).join('\n') +
      `\n\nWant a deep-dive on any single department?`;
  }

  // portfolio summary / health / status report
  if (/(summary|overview|portfolio|health|status report|how are we|dashboard|how's everything|whats the status|what's the status)/i.test(m)) {
    return `📈 **Portfolio Summary**\n\n` +
      `• Total active: **${kpi.total}** across ${data.departments.length} departments\n` +
      `• ✅ Completed: **${kpi.completed}** (${pct(kpi.completed, kpi.total)}%)\n` +
      `• 🔄 In progress: **${kpi.inProgress}**\n` +
      `• ⏸ Not started: **${kpi.notStarted}**\n` +
      `• 🔴 Delayed: **${kpi.delayed}**\n` +
      `• ⚠️ Stuck / Overdue: **${kpi.stuck}**\n` +
      `• 🛡️ Open risks: **${kpi.openRisks}**\n\n` +
      `Overall health: **${kpi.delayed > kpi.total * 0.15 ? '🟠 Needs attention' : '🟢 On track'}**. Ask me to drill into any area.`;
  }

  // simple counts
  if (/(how many|count|number of)/i.test(m) && /(project|active)/i.test(m)) {
    return `There are **${kpi.total} active projects**: ${kpi.inProgress} in progress, ${kpi.completed} completed, ${kpi.notStarted} not started, and ${kpi.delayed} delayed.`;
  }

  return null; // → hand off to Claude
}

// ---------------------------------------------------------------- Claude context

function buildContext(data: Data, user?: { name?: string; department?: string; role?: string }): string {
  const { kpi } = data;
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim(); // names can contain stray newlines
  const projLines = cap(data.projects, 600)
    .map(p => `- ${p.code} | ${clean(p.name)} | ${p.dept} | ${clean(p.owner)} | ${p.status} | ${p.priority} | ${p.progress}% | due ${p.targetDate || 'n/a'}`)
    .join('\n');
  const riskLines = cap(data.risks.filter(r => !/closed|resolved/i.test(r.status)), 40)
    .map(r => `- [${r.score}] ${clean(r.description).slice(0, 100)} (${r.owner || 'unassigned'})`)
    .join('\n');
  return [
    `## Today's date\n${new Date().toISOString().split('T')[0]}`,
    user ? `## Current user\nName: ${user.name || 'unknown'} · Department: ${user.department || 'unassigned'} · Role: ${user.role || 'user'}` : '',
    `## Portfolio KPIs (live)\nTotal active: ${kpi.total} · Completed: ${kpi.completed} · In progress: ${kpi.inProgress} · Not started: ${kpi.notStarted} · Delayed: ${kpi.delayed} · Stuck / Overdue: ${kpi.stuck} · Open risks: ${kpi.openRisks}`,
    `## Departments\n${data.departments.join(', ')}`,
    `## Owner workload (active projects)\n${data.workload.slice(0, 20).map(w => `${w.owner}: ${w.active}`).join(' · ')}`,
    `## Projects (code | name | dept | owner | status | priority | progress | due)\n${projLines}`,
    riskLines ? `## Open risks (score | description | owner)\n${riskLines}` : '',
  ].filter(Boolean).join('\n\n');
}

const SYSTEM_PROMPT = `You are Xyro — the Xyrenis AI companion: an experienced Product Manager, Program/Portfolio Manager, Business Analyst and executive advisor for an enterprise project-tracking platform (airport operations, BIAL).

Personality: friendly, curious, intelligent, playful yet professional, encouraging — a teammate, not a support bot. Voice: warm, concise. Use relevant emojis naturally. Never robotic. Maintain conversation context — when the user says "that one" or "which is delayed", resolve it against what was just discussed.

FORMATTING (the chat window is narrow and renders only limited markdown): use short paragraphs and "• " bullet lists with **bold** for key figures. NEVER use markdown tables, headings (#), code fences, or horizontal rules — they render as raw symbols. Keep bold within a single line. Cap lists at ~10 items and say how many more exist.

Beyond live-data questions, you happily help with product & delivery craft: drafting PRDs, roadmaps, sprint plans, milestones, user stories, risk analyses, KPI explanations, meeting summaries, presentations, documentation, SQL / Power BI DAX snippets, UX recommendations and brainstorming. For these, ask brief clarifying questions when needed and produce crisp, structured output.

GROUNDING RULES (critical):
- For any fact about projects, people, departments, risks, owners, deadlines, or counts, use ONLY the live data block provided below. Never invent project names, numbers, owners, or dates.
- The platform currently tracks projects, risks, departments, and users. Tasks are managed on each project's Tasks tab (with assignment + email notification), but task contents are NOT included in your live data block — direct users there instead of guessing. It does NOT yet track subtasks, documents, or formal reporting structure; if asked, say so and offer the closest thing you DO have (e.g. project progress, owners, deadlines).
- You don't have live web/weather access. If asked, say so briefly, then pivot to something useful about their portfolio.
- General knowledge questions (Agile, Scrum, PM best practices, today's date) are fine to answer, then connect back to their projects where relevant.

Be action-oriented: after answering, suggest a concrete next step (escalate, rebalance, draft a recovery plan, notify an owner). Answer directly — do not expose your internal reasoning or planning; give the final answer only.`;

// ---------------------------------------------------------------- providers

type Turn = { role: 'user' | 'assistant'; content: string };
const FALLBACK_TAIL = `I can still help with structured queries: try "show delayed projects", "team workload", or "portfolio summary".`;

/** Google Gemini (Google AI Studio REST API). */
async function callGemini(convo: Turn[], context: string): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    system_instruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\n# LIVE DATA SNAPSHOT\n\n${context}` }] },
    contents: convo.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { temperature: 0.6, maxOutputTokens: 1500 },
  };
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const why = res.status === 404 || res.status === 400 ? `the Gemini model "${GEMINI_MODEL}" isn't available to this key (try GEMINI_MODEL=gemini-2.0-flash)`
        : res.status === 403 ? 'the Gemini API key looks invalid or lacks access'
        : res.status === 429 ? 'the Gemini free-tier rate limit was hit — try again shortly'
        : 'the Gemini API had a hiccup';
      return NextResponse.json({ response: `Sorry — ${why}. ${FALLBACK_TAIL}`, source: 'gemini-error' });
    }
    const json = await res.json();
    const text = (json?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text).join('').trim();
    if (!text) {
      // empty often means a safety block (finishReason: SAFETY) or no candidate
      return NextResponse.json({ response: `I couldn't generate a response to that one. ${FALLBACK_TAIL}`, source: 'gemini-empty' });
    }
    return NextResponse.json({ response: text, source: 'gemini' });
  } catch {
    return NextResponse.json({ response: `Sorry — I couldn't reach Gemini. ${FALLBACK_TAIL}`, source: 'gemini-error' });
  }
}

/** Anthropic Claude (Messages API). */
async function callClaude(convo: Turn[], context: string): Promise<Response> {
  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const completion = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        { type: 'text', text: `# LIVE DATA SNAPSHOT\n\n${context}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: convo,
    });
    const text = completion.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('\n').trim();
    return NextResponse.json({ response: text || "I'm not sure how to answer that — try rephrasing?", source: 'claude' });
  } catch (e: any) {
    const why = e?.status === 401 ? 'the Claude API key looks invalid'
      : e?.status === 429 ? 'Claude is rate-limited right now'
      : 'the Claude API had a hiccup';
    return NextResponse.json({ response: `Sorry — ${why}. ${FALLBACK_TAIL}`, source: 'claude-error' });
  }
}

// ---------------------------------------------------------------- handler

export async function POST(request: Request) {
  try {
    // Phase 0: the whole portfolio goes into the LLM context, so the endpoint
    // requires a verified session — and identity comes from the token, never
    // from the (spoofable) request body.
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const meta = { ...(auth.user.user_metadata || {}), ...(auth.user.app_metadata || {}) } as Record<string, string>;
    const user = {
      name: meta.full_name || auth.user.email?.split('@')[0] || 'user',
      department: meta.department,
      role: meta.role || 'user',
    };

    const body = await request.json().catch(() => ({}));
    // Accept either { messages:[{role,content}] } or legacy { message, history }
    const messages: { role: string; content: string }[] = Array.isArray(body.messages)
      ? body.messages
      : [...(body.history || []), ...(body.message ? [{ role: 'user', content: body.message }] : [])];

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser?.content) {
      return NextResponse.json({ error: 'No message provided.' }, { status: 400 });
    }

    let data: Data;
    try {
      data = await loadData();
    } catch (e: any) {
      return NextResponse.json({ response: `I couldn't reach the project database just now (${e.message}). Please try again in a moment.`, source: 'error' });
    }

    // 1) LLM-first: with a key configured, EVERY question goes to the model —
    //    that's what makes Xyro conversational. Claude is the default; Gemini
    //    only if that's the key that was provided.
    if (ANTHROPIC_API_KEY || GEMINI_API_KEY) {
      const context = buildContext(data, user);
      const convo = messages.slice(-12).filter(m => m.content?.trim()).map(m => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      }));
      while (convo.length && convo[0].role !== 'user') convo.shift(); // must start on a user turn
      if (ANTHROPIC_API_KEY) return callClaude(convo, context);
      return callGemini(convo, context);
    }

    // 2) No key: deterministic heuristic answers for structured queries.
    const heuristic = heuristicAnswer(lastUser.content, data);
    if (heuristic) {
      return NextResponse.json({ response: heuristic, source: 'heuristic' });
    }

    return NextResponse.json({
      response: `I can answer that once the AI engine is connected. For now I can help with anything structured — try "show delayed projects", "team workload", "open risks", or "summary". (Admin: set GEMINI_API_KEY or ANTHROPIC_API_KEY to unlock full conversation.)`,
      source: 'no-key',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to process request: ' + (err?.message || 'unknown') }, { status: 500 });
  }
}
