'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Send, X } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { TOP_LEVEL_DEPARTMENTS, getSubdivisions, hasSubdivisions } from '@/lib/org-structure';

/**
 * Xyro — the living AI companion, floating on every page:
 *   • animated mascot launcher (floats, waves, sparkles, greets first-time visitors)
 *   • answers "how do I…" questions from a built-in guide (instant, offline)
 *   • falls back to /api/ai-chat (live-data heuristics + LLM) for anything else,
 *     with animated thinking states and word-by-word streamed replies
 *   • creates projects on the user's behalf via a guided question flow that
 *     goes through the normal addProject() path — permissions, persistence
 *     and audit all apply exactly as if they used the form.
 */

type Chip = { label: string; value: string };
type Msg = { role: 'user' | 'bot'; text: string; chips?: Chip[]; full?: string };

type Draft = { name?: string; department?: string; subdivision?: string | null; owner?: string; priority?: string; targetDate?: string | null };
type WizardStep = 'name' | 'department' | 'subdivision' | 'owner' | 'priority' | 'target' | 'confirm';

// ---- built-in how-to guide (matched by keywords, answered instantly) ----
const GUIDE: { match: RegExp; answer: string }[] = [
  { match: /(quick\s*edit|edit).*(project)|pencil/i, answer: 'To edit a project: on the Projects page, hover over a row and click the ✏️ pencil (Quick Edit). On the Dashboard or Command Center, click any project row to open the Quick Edit side panel — you can change status, priority, progress, owner and manage tasks there. For every field, open the project and use Edit on the detail page.' },
  { match: /(assign|add|create).*(task)|task.*(assign|email)/i, answer: 'To assign a task: open a project → Tasks (List) tab → Add Task. Choose "Organization" to pick a department and employee, or "External User" to enter an email address. The assignee gets an email with the task details. You can also assign tasks from the Quick Edit side panel on the Dashboard/Command Center. Task status can be changed from the dropdown on each task, and tasks can be deleted with the trash icon.' },
  { match: /(export|download|print).*(pdf|report)|pdf/i, answer: 'To export a report as PDF: open the Command Center (or Analytics) and click "Export PDF". In the print dialog, keep "Background graphics" ON and turn "Headers and footers" OFF for a clean result. The export prints landscape and matches the on-screen layout.' },
  { match: /(reset|forgot|change).*(password)/i, answer: 'To reset your password: on the login page click "Forgot password?", enter your email, and open the link in the email you receive. It takes you to a page where you set a new password. Links are single-use — if it says expired, request a fresh one.' },
  { match: /(archive|restore|delete).*(project)|history/i, answer: 'To archive a project: hover its row on the Projects page → ⋯ menu → Archive. Archived projects live in the History tab, where you can Restore them or delete permanently. Archiving is reversible; permanent delete is not.' },
  { match: /(filter|search|find|my projects)/i, answer: 'On the Projects page use the search box (name, ID or owner), the status/priority dropdowns, and the Filters button for owner, "My projects only" and sorting. Click a KPI card on the Command Center to filter the whole view by that metric.' },
  { match: /(department|drill)/i, answer: 'The Departments page shows every department with its project counts and completion. Click a department to drill into its projects — you can search, filter and edit all fields inline (if you have edit rights for that department).' },
  { match: /(risk)/i, answer: 'Risks live on the Risks page and on each project’s Risks tab. Add a risk with its impact, likelihood and mitigation; it rolls up into the Open Risks KPI and Portfolio Health.' },
  { match: /(role|permission|access|admin)/i, answer: 'Access is tiered: View < Edit < Modify < Admin. You can modify projects in your own department; admins can edit everything. Admins manage users, departments and permissions under Admin → User Management.' },
  { match: /(excel|import|export data)/i, answer: 'Use Export on the Projects page to download the live register as an Excel workbook. Imports are admin-managed — ask an admin to load a workbook so it doesn’t overwrite user-added projects.' },
];

// instant emotional reactions (checked before everything else)
const REACTIONS: { match: RegExp; answer: string }[] = [
  { match: /^(thanks|thank you|thankyou|thx|ty)\b/i, answer: '😊 Anytime! Ready for your next big idea?' },
  { match: /^(awesome|amazing|great|love it|perfect|nice|wow)\b[\s!.]*$/i, answer: '🎉 Yay! Glad you like it. What shall we build next?' },
  { match: /^(bye|goodbye|see you|good night)\b/i, answer: '👋 See you soon! I’ll be right here whenever you need me.' },
];

const THINKING_LABELS = ['Thinking…', 'Connecting ideas…', 'Checking best practices…', 'Almost finished…', 'Creating something awesome…'];

const BASE_CHIPS: Chip[] = [
  { label: '➕ Add a project', value: 'add a project' },
  { label: '📅 Generate a roadmap', value: 'generate a roadmap for my department’s projects' },
  { label: '📊 Analyze my portfolio', value: 'give me an executive summary of my portfolio health' },
  { label: '📝 Draft a PRD', value: 'help me draft a PRD — ask me what you need to know' },
  { label: '❓ How do I assign a task?', value: 'how do I assign a task' },
];

// context-aware extras, keyed by where the user is in the app
function contextFor(pathname: string): { note: string; chips: Chip[] } | null {
  if (/^\/(analytics|command-center|dashboard|reports)/.test(pathname)) {
    return {
      note: '📊 I see you’re looking at analytics — want help with your KPIs?',
      chips: [{ label: '📈 Explain my KPIs', value: 'explain my key KPIs and what they mean' }, { label: '⚠️ What needs attention?', value: 'which projects need my attention right now?' }],
    };
  }
  if (/^\/projects/.test(pathname)) {
    return {
      note: '📁 You’re in Projects — want me to generate milestones or user stories?',
      chips: [{ label: '🗓 Generate milestones', value: 'help me generate milestones for a project' }, { label: '📝 Write user stories', value: 'help me write user stories for a project' }],
    };
  }
  if (/^\/risks/.test(pathname)) {
    return {
      note: '🛡 Looking at risks — I can help you analyze or mitigate them.',
      chips: [{ label: '🔍 Analyze top risks', value: 'analyze my top risks and suggest mitigations' }],
    };
  }
  if (/^\/(workforce|departments|team)/.test(pathname)) {
    return {
      note: '👥 Reviewing the team — want a workload check?',
      chips: [{ label: '⚖️ Who is overloaded?', value: 'who is overloaded this week and how should we redistribute?' }],
    };
  }
  return null;
}

function makeWelcome(pathname: string): Msg {
  const ctx = contextFor(pathname);
  return {
    role: 'bot',
    text: `Hi, I’m Xyro! 👋 Let’s build something amazing together.\n\nI can help you:\n• Plan projects, roadmaps & milestones\n• Create and assign tasks\n• Analyze your portfolio, KPIs & risks\n• Draft PRDs, user stories & reports\n• Answer anything about this app${ctx ? `\n\n${ctx.note}` : ''}`,
    chips: [...(ctx?.chips ?? []), ...BASE_CHIPS],
  };
}

// minimal markdown: **bold** within streamed text
function renderRich(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className={i > 0 ? 'mt-1' : ''}>
        {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
      </p>
    );
  });
}

export default function FloatingAssistant() {
  const { addProject, generateId } = useData();
  const { user, isDemoMode, canModifyDepartment } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const currentUserName = isDemoMode
    ? 'Demo User'
    : (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || '';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState(THINKING_LABELS[0]);
  const [wizard, setWizard] = useState<{ step: WizardStep; draft: Draft } | null>(null);
  const [waving, setWaving] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; cx: string; cy: string; color: string; left: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open, busy]);

  // seed / refresh the contextual welcome whenever the panel opens on a fresh chat
  useEffect(() => {
    if (open && messages.length === 0) setMessages([makeWelcome(pathname)]);
  }, [open, messages.length, pathname]);

  // first-visit greeting bubble (once per session, only if never opened)
  useEffect(() => {
    if (sessionStorage.getItem('xyro_greeted')) return;
    const t = setTimeout(() => {
      if (!openedRef.current) { setShowGreeting(true); setWaving(true); setTimeout(() => setWaving(false), 2800); }
    }, 6000);
    return () => clearTimeout(t);
  }, []);

  // wave every couple of minutes while idle
  useEffect(() => {
    const iv = setInterval(() => {
      if (!openedRef.current) { setWaving(true); setTimeout(() => setWaving(false), 2800); }
    }, 120000);
    return () => clearInterval(iv);
  }, []);

  // rotate thinking labels while busy
  useEffect(() => {
    if (!busy) return;
    let i = 0;
    setThinkingLabel(THINKING_LABELS[0]);
    const iv = setInterval(() => { i = (i + 1) % THINKING_LABELS.length; setThinkingLabel(THINKING_LABELS[i]); }, 1700);
    return () => clearInterval(iv);
  }, [busy]);

  // word-by-word streaming of the newest bot message (when it carries `full`)
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'bot' || !last.full || last.text === last.full) return;
    const words = last.full.split(' ');
    const shown = last.text ? last.text.split(' ').length : 0;
    const t = setTimeout(() => {
      setMessages(m => {
        const copy = [...m];
        const tail = copy[copy.length - 1];
        if (!tail?.full) return m;
        const next = words.slice(0, shown + 2).join(' ');
        copy[copy.length - 1] = { ...tail, text: next, full: next === tail.full ? undefined : tail.full };
        return copy;
      });
    }, 35);
    return () => clearTimeout(t);
  }, [messages]);

  const dismissGreeting = useCallback(() => {
    setShowGreeting(false);
    sessionStorage.setItem('xyro_greeted', '1');
  }, []);

  const openPanel = useCallback(() => {
    openedRef.current = true;
    dismissGreeting();
    setOpen(true);
  }, [dismissGreeting]);

  const bot = (text: string, chips?: Chip[]) => setMessages(m => [...m, { role: 'bot', text, chips }]);
  const botStream = (text: string, chips?: Chip[]) => setMessages(m => [...m, { role: 'bot', text: '', full: text, chips }]);

  const celebrate = () => {
    const colors = ['#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24', '#60a5fa'];
    setConfetti(Array.from({ length: 16 }, (_, i) => ({
      id: Date.now() + i,
      cx: `${(Math.random() * 2 - 1) * 130}px`,
      cy: `${-40 - Math.random() * 160}px`,
      color: colors[i % colors.length],
      left: `${20 + Math.random() * 60}%`,
    })));
    setTimeout(() => setConfetti([]), 1600);
  };

  // ------------------------------------------------ add-project wizard
  const startWizard = () => {
    const editable = TOP_LEVEL_DEPARTMENTS.filter(d => canModifyDepartment(d));
    if (editable.length === 0) {
      bot('You currently have view-only access, so I can’t create projects on your behalf. An admin can grant you edit rights for your department under Admin → User Management — after that, just ask me again!');
      return;
    }
    setWizard({ step: 'name', draft: {} });
    bot('Great — let’s create a project. What should it be called?');
  };

  const cancelWizard = () => {
    setWizard(null);
    bot('No problem, I’ve cancelled that. Anything else I can help with?');
  };

  const parseDate = (s: string): string | null | undefined => {
    const t = s.trim().toLowerCase();
    if (!t || t === 'skip' || t === 'no' || t === 'none') return null;
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return t;
    m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return undefined; // unparseable
  };

  const stepWizard = (raw: string) => {
    if (!wizard) return;
    const text = raw.trim();
    if (/^cancel$/i.test(text)) { cancelWizard(); return; }
    const { step, draft } = wizard;

    if (step === 'name') {
      if (!text) { bot('Please type a project name (or "cancel").'); return; }
      setWizard({ step: 'department', draft: { ...draft, name: text } });
      const editable = TOP_LEVEL_DEPARTMENTS.filter(d => canModifyDepartment(d));
      bot('Which department does it belong to?', editable.map(d => ({ label: d, value: d })));
      return;
    }
    if (step === 'department') {
      const dept = TOP_LEVEL_DEPARTMENTS.find(d => d.toLowerCase() === text.toLowerCase())
        || TOP_LEVEL_DEPARTMENTS.find(d => d.toLowerCase().includes(text.toLowerCase()));
      if (!dept) { bot('Please pick one of the departments:', TOP_LEVEL_DEPARTMENTS.map(d => ({ label: d, value: d }))); return; }
      if (!canModifyDepartment(dept)) {
        bot(`You don’t have edit rights in ${dept}, so I can’t create the project there. Pick a different department, or ask an admin for access.`, TOP_LEVEL_DEPARTMENTS.filter(d => canModifyDepartment(d)).map(d => ({ label: d, value: d })));
        return;
      }
      if (hasSubdivisions(dept)) {
        setWizard({ step: 'subdivision', draft: { ...draft, department: dept } });
        bot(`Which subdivision of ${dept}? (or Skip)`, [...getSubdivisions(dept).map(s => ({ label: s, value: s })), { label: 'Skip', value: 'skip' }]);
      } else {
        setWizard({ step: 'owner', draft: { ...draft, department: dept, subdivision: null } });
        bot('Who owns this project?', currentUserName ? [{ label: `Me (${currentUserName})`, value: currentUserName }] : undefined);
      }
      return;
    }
    if (step === 'subdivision') {
      const subs = getSubdivisions(draft.department);
      const sub = /^skip$/i.test(text) ? null : (subs.find(s => s.toLowerCase() === text.toLowerCase()) || subs.find(s => s.toLowerCase().includes(text.toLowerCase())) || null);
      setWizard({ step: 'owner', draft: { ...draft, subdivision: sub } });
      bot('Who owns this project?', currentUserName ? [{ label: `Me (${currentUserName})`, value: currentUserName }] : undefined);
      return;
    }
    if (step === 'owner') {
      if (!text) { bot('Please type the owner’s name.'); return; }
      setWizard({ step: 'priority', draft: { ...draft, owner: text } });
      bot('What priority?', ['Critical', 'High', 'Medium', 'Low'].map(p => ({ label: p, value: p })));
      return;
    }
    if (step === 'priority') {
      const pr = ['Critical', 'High', 'Medium', 'Low'].find(p => p.toLowerCase() === text.toLowerCase()) || 'Medium';
      setWizard({ step: 'target', draft: { ...draft, priority: pr } });
      bot('Target date? Type it as DD-MM-YYYY (or "skip").', [{ label: 'Skip', value: 'skip' }]);
      return;
    }
    if (step === 'target') {
      const parsed = parseDate(text);
      if (parsed === undefined) { bot('I couldn’t read that date — please use DD-MM-YYYY or YYYY-MM-DD, or "skip".'); return; }
      const d = { ...draft, targetDate: parsed };
      setWizard({ step: 'confirm', draft: d });
      bot(
        `Here’s what I’ll create:\n\n• Name: ${d.name}\n• Department: ${d.department}${d.subdivision ? ` ↳ ${d.subdivision}` : ''}\n• Owner: ${d.owner}\n• Priority: ${d.priority}\n• Target date: ${d.targetDate || '—'}\n\nShall I create it?`,
        [{ label: '✅ Create project', value: 'confirm' }, { label: 'Cancel', value: 'cancel' }],
      );
      return;
    }
    if (step === 'confirm') {
      if (!/^(confirm|yes|create|ok|okay|y)$/i.test(text)) { cancelWizard(); return; }
      const today = new Date().toISOString().split('T')[0];
      const id = generateId(draft.department!);
      const created = addProject({
        id,
        name: draft.name!,
        department: draft.department!,
        subdivision: draft.subdivision ?? null,
        owner: draft.owner || currentUserName,
        status: 'Not Started',
        priority: (draft.priority as 'Critical' | 'High' | 'Medium' | 'Low') || 'Medium',
        progress: 0,
        startDate: today,
        targetDate: draft.targetDate ?? null,
        objective: '', kpi: '', projectDependencies: '', supportTeam: '', notes: '', risks: '',
      } as Parameters<typeof addProject>[0]);
      setWizard(null);
      if (created) {
        celebrate();
        setMessages(m => [...m, {
          role: 'bot',
          text: `🎉 Done! I’ve created "${draft.name}" (${created}) in ${draft.department}. It’s saved to the register and visible to your team.\n\nReady for your next big idea?`,
          chips: [{ label: 'Open the project →', value: `__open__${created}` }, { label: '➕ Add another', value: 'add a project' }],
        }]);
      } else {
        bot('😅 I couldn’t create the project — you may not have edit rights in that department. Ask an admin for access, or try your own department.');
      }
      return;
    }
  };

  // ------------------------------------------------ main send handler
  const handleSend = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput('');

    // chip action: open a created project
    if (text.startsWith('__open__')) { router.push(`/projects/${text.slice(8)}`); return; }

    setMessages(m => [...m, { role: 'user', text }]);

    if (wizard) { stepWizard(text); return; }

    const react = REACTIONS.find(r => r.match.test(text));
    if (react) { bot(react.answer); return; }

    if (/(add|create|new|make|start)\s+(a\s+|another\s+)?project/i.test(text)) { startWizard(); return; }

    const hit = GUIDE.find(g => g.answer && g.match.test(text));
    if (hit && /how|where|what|can i|guide|help|\?/i.test(text)) { botStream(hit.answer); return; }

    // everything else → live-data AI endpoint
    setBusy(true);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.full ?? m.text }));
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: text }], user: currentUserName }),
      });
      const j = await res.json().catch(() => ({} as { response?: string }));
      botStream(j.response || '😅 Sorry — I couldn’t get an answer just now. Please try again.');
    } catch {
      bot('😅 Sorry — I couldn’t reach the assistant service. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print">
      {/* Floating launcher */}
      {!open && (
        <div className="fixed bottom-5 right-5 z-[60] xyro-launcher-float">
          {/* first-visit greeting bubble */}
          {showGreeting && (
            <div className="xyro-bubble absolute bottom-full right-0 mb-3 w-[290px] rounded-2xl border border-[var(--color-x-border)] bg-[var(--color-x-surface)] shadow-2xl p-4">
              <button onClick={dismissGreeting} className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/5 text-[var(--color-x-text-muted)]" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
              <p className="text-[13px] font-bold text-[var(--color-x-text)]">👋 Welcome to Xyrenis!</p>
              <p className="text-[12px] text-[var(--color-x-text-secondary)] mt-1 leading-relaxed">I’m Xyro, your AI companion. Ask me anything, or let’s build something incredible together.</p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {[
                  { label: '✨ Build a project', value: 'add a project' },
                  { label: '📊 Analytics', value: 'give me an executive summary of my portfolio health' },
                  { label: '📅 Planning', value: 'help me generate milestones for a project' },
                ].map(c => (
                  <button
                    key={c.value}
                    onClick={() => { openPanel(); setTimeout(() => handleSend(c.value), 350); }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="xyro-launcher-tilt">
            <button
              onClick={openPanel}
              title="Xyro"
              aria-label="Open Xyro, your AI companion"
              className="group relative block rounded-full cursor-pointer xyro-launcher-glow xyro-hover-bounce transition-transform hover:scale-110"
            >
              {/* ambient sparkles */}
              <span aria-hidden className="xyro-sparkle-dot pointer-events-none absolute -top-1 -left-2 text-[11px] text-purple-400" style={{ animation: 'xyro-sparkle 3.2s ease-in-out infinite' }}>✦</span>
              <span aria-hidden className="xyro-sparkle-dot pointer-events-none absolute -top-2 right-1 text-[9px] text-indigo-300" style={{ animation: 'xyro-sparkle 4.1s ease-in-out 1.2s infinite' }}>✦</span>
              <span aria-hidden className="xyro-sparkle-dot pointer-events-none absolute bottom-0 -left-3 text-[8px] text-fuchsia-300" style={{ animation: 'xyro-sparkle 3.7s ease-in-out 2.1s infinite' }}>✦</span>
              {/* hover sparkle burst */}
              <span aria-hidden className="pointer-events-none absolute -top-2 -right-2 text-[13px] text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity">✨</span>
              <span className={waving ? 'block xyro-waving' : 'block'}>
                <Image src="/xyro.webp" alt="Xyro — your AI companion" width={72} height={72} className="w-[72px] h-[72px] max-sm:w-[60px] max-sm:h-[60px]" priority />
              </span>
              {/* hover tooltip */}
              <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-xl bg-[var(--color-x-text)] text-[var(--color-x-surface)] text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                👋 Hi! I’m Xyro. Need help building something?
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Xyro AI companion"
          className="xyro-panel-pop fixed bottom-5 right-5 z-[60] w-[380px] max-w-[calc(100vw-40px)] h-[560px] max-h-[calc(100vh-100px)] flex flex-col rounded-[28px] shadow-2xl border border-[var(--color-x-border)] overflow-hidden backdrop-blur-xl"
          style={{ background: 'color-mix(in srgb, var(--color-x-surface) 88%, transparent)' }}
        >
          {/* confetti burst */}
          {confetti.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
              {confetti.map(c => (
                <span
                  key={c.id}
                  className="absolute bottom-16 w-2 h-2 rounded-sm"
                  style={{ left: c.left, background: c.color, '--cx': c.cx, '--cy': c.cy, animation: 'xyro-confetti 1.4s ease-out forwards' } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden xyro-avatar-bob">
                <Image src="/xyro.webp" alt="Xyro" width={36} height={36} className="w-9 h-9" />
              </div>
              <div>
                <p className="text-[13px] font-bold leading-tight">Xyro</p>
                <p className="text-[10px] text-white/75 leading-tight">Let’s build something amazing together</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close Xyro" className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"><X className="w-4 h-4" /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-1.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'bot' && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mb-0.5">
                    <Image src="/xyro.webp" alt="" width={24} height={24} className="w-6 h-6" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-[var(--color-x-surface)] border border-[var(--color-x-border)] text-[var(--color-x-text)] rounded-bl-md shadow-sm'
                }`}>
                  {m.role === 'bot' ? renderRich(m.text) : <span className="whitespace-pre-wrap">{m.text}</span>}
                  {m.full && <span className="inline-block w-[2px] h-[13px] ml-0.5 align-middle bg-indigo-400 animate-pulse" />}
                  {m.chips && !m.full && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.chips.map(c => (
                        <button
                          key={c.value}
                          onClick={() => handleSend(c.value)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-end gap-1.5 justify-start">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mb-0.5 xyro-avatar-bob">
                  <Image src="/xyro.webp" alt="" width={24} height={24} className="w-6 h-6" />
                </div>
                <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[12px] text-[var(--color-x-text-muted)] shadow-sm flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    {[0, 1, 2].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ animation: `xyro-think-dot 1.1s ease-in-out ${d * 0.18}s infinite` }} />
                    ))}
                  </span>
                  {thinkingLabel}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[var(--color-x-border)] flex items-center gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={wizard ? 'Type your answer… ("cancel" to stop)' : 'Ask me anything…'}
              className="x-input flex-1 text-[13px]"
              aria-label="Message Xyro"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
