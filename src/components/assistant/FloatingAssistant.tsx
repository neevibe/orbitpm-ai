'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Send, X } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { TOP_LEVEL_DEPARTMENTS, getSubdivisions, hasSubdivisions } from '@/lib/org-structure';

/**
 * Xyro — the floating in-app assistant, available on every page:
 *   • answers "how do I…" questions from a built-in guide (instant, offline)
 *   • falls back to /api/ai-chat (live-data heuristics + LLM) for anything else
 *   • creates projects on the user's behalf via a guided question flow that
 *     goes through the normal addProject() path — permissions, persistence
 *     and audit all apply exactly as if they used the form.
 */

type Chip = { label: string; value: string };
type Msg = { role: 'user' | 'bot'; text: string; chips?: Chip[] };

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

const WELCOME: Msg = {
  role: 'bot',
  text: 'Hi, I’m Xyro! 👋 I can explain how anything in this app works, answer questions about your live portfolio, or create a project for you step by step.',
  chips: [
    { label: '➕ Add a project', value: 'add a project' },
    { label: 'How do I assign a task?', value: 'how do I assign a task' },
    { label: 'How do I export a PDF?', value: 'how do I export a pdf report' },
    { label: 'Show delayed projects', value: 'which projects are delayed?' },
  ],
};

export default function FloatingAssistant() {
  const { addProject, generateId } = useData();
  const { user, isDemoMode, canModifyDepartment } = useAuth();
  const router = useRouter();

  const currentUserName = isDemoMode
    ? 'Demo User'
    : (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || '';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [wizard, setWizard] = useState<{ step: WizardStep; draft: Draft } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const bot = (text: string, chips?: Chip[]) => setMessages(m => [...m, { role: 'bot', text, chips }]);

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
        setMessages(m => [...m, {
          role: 'bot',
          text: `Done! I’ve created "${draft.name}" (${created}) in ${draft.department}. It’s saved to the register and visible to your team.`,
          chips: [{ label: 'Open the project →', value: `__open__${created}` }],
        }]);
      } else {
        bot('I couldn’t create the project — you may not have edit rights in that department. Ask an admin for access, or try your own department.');
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

    if (/(add|create|new|make|start)\s+(a\s+|another\s+)?project/i.test(text)) { startWizard(); return; }

    const hit = GUIDE.find(g => g.answer && g.match.test(text));
    if (hit && /how|where|what|can i|guide|help|\?/i.test(text)) { bot(hit.answer); return; }

    // everything else → live-data AI endpoint
    setBusy(true);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: text }], user: currentUserName }),
      });
      const j = await res.json().catch(() => ({} as { response?: string }));
      bot(j.response || 'Sorry — I couldn’t get an answer just now. Please try again.');
    } catch {
      bot('Sorry — I couldn’t reach the assistant service. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print">
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Xyro"
          className="fixed bottom-5 right-5 z-[60] rounded-full hover:scale-110 transition-transform cursor-pointer drop-shadow-[0_4px_14px_rgba(99,102,241,0.45)]"
        >
          <Image src="/xyro.webp" alt="Xyro — Xyrenis assistant" width={64} height={64} className="w-16 h-16" priority />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[60] w-[380px] max-w-[calc(100vw-40px)] h-[560px] max-h-[calc(100vh-100px)] flex flex-col rounded-2xl shadow-2xl border border-[var(--color-x-border)] bg-[var(--color-x-surface)] overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                <Image src="/xyro.webp" alt="Xyro" width={32} height={32} className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[13px] font-bold leading-tight">Xyro</p>
                <p className="text-[10px] text-white/75 leading-tight">How-to help · portfolio Q&A · create projects</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"><X className="w-4 h-4" /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--color-x-bg)]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-[var(--color-x-surface)] border border-[var(--color-x-border)] text-[var(--color-x-text)] rounded-bl-md shadow-sm'
                }`}>
                  {m.text}
                  {m.chips && (
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
              <div className="flex justify-start">
                <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[12.5px] text-[var(--color-x-text-muted)] shadow-sm">Thinking…</div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[var(--color-x-border)] bg-[var(--color-x-surface)] flex items-center gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={wizard ? 'Type your answer… ("cancel" to stop)' : 'Ask me anything…'}
              className="x-input flex-1 text-[13px]"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || busy}
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
