'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, Sparkles, RefreshCw, Copy, Check, Search } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { formatDate } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestions = [
  'Show all delayed projects',
  'Which department has most critical projects?',
  'List projects nearing deadline this month',
  'Who owns the most active projects?',
  'What are open high-impact risks?',
  'Summarize the Operations department',
  'Show all Not Started projects',
  'Which projects are overdue?',
];

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

export default function AIAssistantPage() {
  const { projects, risks, departments, kpi } = useData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const generateResponse = useMemo(() => (query: string): string => {
    const q = query.toLowerCase().trim();
    const activePjs = projects.filter(p => !p.archived);

    // ── DELAYED ──────────────────────────────────────────────
    if (q.includes('delayed')) {
      const list = activePjs.filter(p => p.status === 'Delayed');
      if (!list.length) return '✅ Great news — no delayed projects right now!';
      const rows = list.map(p => `• **${p.id}** — ${p.name}\n  Dept: ${p.department} | Owner: ${p.owner || 'Unassigned'} | Progress: ${p.progress}%`).join('\n\n');
      return `📊 **Delayed Projects (${list.length})**\n\n${rows}\n\n⚠️ Recommend immediate escalation to department heads.`;
    }

    // ── OVERDUE ───────────────────────────────────────────────
    if (q.includes('overdue')) {
      const list = activePjs.filter(p => { const d = daysUntil(p.targetDate); return d !== null && d < 0 && p.status !== 'Completed'; });
      if (!list.length) return '✅ No overdue projects — all target dates are current.';
      const rows = list.sort((a,b)=>(daysUntil(a.targetDate)??0)-(daysUntil(b.targetDate)??0))
        .map(p => { const d = daysUntil(p.targetDate)!; return `• **${p.id}** — ${p.name}\n  Overdue by **${Math.abs(d)} days** | Dept: ${p.department} | Status: ${p.status}`; }).join('\n\n');
      return `🚨 **Overdue Projects (${list.length})**\n\n${rows}`;
    }

    // ── DEADLINE / NEARING / DUE SOON ────────────────────────
    if (q.includes('deadline') || q.includes('due') || q.includes('nearing') || q.includes('this month') || q.includes('upcoming')) {
      const days = q.includes('week') ? 7 : q.includes('month') ? 30 : 30;
      const list = activePjs.filter(p => { const d = daysUntil(p.targetDate); return d !== null && d >= 0 && d <= days && p.status !== 'Completed'; })
        .sort((a,b) => (daysUntil(a.targetDate)??999) - (daysUntil(b.targetDate)??999));
      if (!list.length) return `✅ No projects due in the next ${days} days.`;
      const rows = list.map(p => { const d = daysUntil(p.targetDate)!; return `• **${p.id}** — ${p.name}\n  ⏰ ${d} day${d!==1?'s':''} left | ${p.department} | ${p.priority} | ${p.status}`; }).join('\n\n');
      return `📅 **Projects Due in ${days} Days (${list.length})**\n\n${rows}`;
    }

    // ── CRITICAL ──────────────────────────────────────────────
    if (q.includes('critical')) {
      // by dept?
      if (q.includes('department') || q.includes('dept')) {
        const sorted = [...departments].sort((a,b)=>b.critical-a.critical);
        const rows = sorted.filter(d=>d.critical>0).map((d,i)=>`${i+1}. **${d.name}** — ${d.critical} critical project${d.critical>1?'s':''}`).join('\n');
        return `🔴 **Critical Projects by Department:**\n\n${rows}\n\nFocus on the top departments for immediate leadership review.`;
      }
      const list = activePjs.filter(p => p.priority === 'Critical');
      if (!list.length) return '✅ No critical priority projects at the moment.';
      const rows = list.map(p => `• **${p.id}** — ${p.name}\n  ${p.department} | Owner: ${p.owner||'Unassigned'} | Status: ${p.status} | Progress: ${p.progress}%`).join('\n\n');
      return `🔴 **Critical Projects (${list.length})**\n\n${rows}`;
    }

    // ── NOT STARTED ───────────────────────────────────────────
    if (q.includes('not started')) {
      const list = activePjs.filter(p => p.status === 'Not Started');
      if (!list.length) return '✅ All projects have been kicked off — none are in "Not Started" status.';
      const rows = list.slice(0, 15).map(p => `• **${p.id}** — ${p.name} | ${p.department} | ${p.priority}`).join('\n');
      return `🔲 **Not Started Projects (${list.length})**\n\n${rows}${list.length > 15 ? `\n\n...and ${list.length - 15} more.` : ''}`;
    }

    // ── STUCK / DEADLINE REACHING ─────────────────────────────
    if (q.includes('stuck') || q.includes('0%') || q.includes('zero progress') || q.includes('no progress') || q.includes('reaching') || q.includes('deadline')) {
      const list = activePjs.filter(p => {
        if (p.status === 'Completed' || p.dismissedFromStuck) return false;
        const todayStr = new Date().toISOString().split('T')[0];
        const isDelayed = p.status === 'Delayed';
        const isOverdue = p.targetDate ? p.targetDate < todayStr : false;
        return isDelayed || isOverdue;
      });
      if (!list.length) return '✅ No stuck projects — all projects have comfortable timelines or have been dismissed.';
      const rows = list.slice(0, 8).map(p => {
        const d = daysUntil(p.targetDate);
        return `• **${p.id}** — ${p.name}\n  ⏰ ${d !== null && d < 0 ? `Overdue by ${Math.abs(d)} days` : `${d !== null ? `${d} days remaining` : 'No deadline set'}`} · ${p.department} · ${p.owner||'Unassigned'} · Priority: ${p.priority}`;
      }).join('\n\n');
      return `⚠️ **Stuck Projects (Delayed or Overdue): ${list.length}**\n\n${rows}${list.length>8?`\n\n...and ${list.length-8} more.`:''}`;
    }

    // ── SPECIFIC DEPARTMENT ───────────────────────────────────
    const deptMatch = departments.find(d => q.includes(d.name.toLowerCase()));
    if (deptMatch) {
      const deptPjs = activePjs.filter(p => p.department === deptMatch.name);
      const delayed = deptPjs.filter(p => p.status === 'Delayed');
      const critical = deptPjs.filter(p => p.priority === 'Critical');
      const inProg = deptPjs.filter(p => p.status === 'In Progress');
      const completed = deptPjs.filter(p => p.status === 'Completed');
      const overdue = deptPjs.filter(p => { const d = daysUntil(p.targetDate); return d !== null && d < 0 && p.status !== 'Completed'; });

      let detail = '';
      if (q.includes('critical') && critical.length) {
        detail = `\n\n🔴 **Critical Projects:**\n${critical.slice(0,5).map(p=>`• ${p.id} — ${p.name} (${p.status}, ${p.progress}%)`).join('\n')}`;
      } else if (q.includes('delayed') && delayed.length) {
        detail = `\n\n⏰ **Delayed Projects:**\n${delayed.slice(0,5).map(p=>`• ${p.id} — ${p.name} (${p.progress}%)`).join('\n')}`;
      }

      return `🏢 **${deptMatch.name} Department Summary**\n\n• Total: **${deptPjs.length}** projects\n• In Progress: **${inProg.length}**\n• Completed: **${completed.length}**\n• Delayed: **${delayed.length}** ${delayed.length>0?'⚠️':''}\n• Critical: **${critical.length}** ${critical.length>0?'🔴':''}\n• Overdue: **${overdue.length}** ${overdue.length>0?'🚨':''}${detail}`;
    }

    // ── OWNER / WORKLOAD ──────────────────────────────────────
    if (q.includes('owner') || q.includes('workload') || q.includes('most projects') || q.includes('assigned')) {
      // specific owner?
      const ownerRegex = /(?:owned by|assigned to|projects (?:for|by)|owner[:\s]+)\s*([a-zA-Z\s]{3,30})/i;
      const m = query.match(ownerRegex);
      if (m?.[1]) {
        const name = m[1].trim().toLowerCase();
        const found = activePjs.filter(p => p.owner?.toLowerCase().includes(name));
        if (!found.length) return `I couldn't find any projects owned by **${m[1].trim()}**. Double-check the name.`;
        const rows = found.map(p => `• **${p.id}** — ${p.name}\n  ${p.status} | ${p.priority} | ${p.progress}%`).join('\n\n');
        return `👤 **Projects owned by ${m[1].trim()} (${found.length})**\n\n${rows}`;
      }
      // workload ranking
      const ownerMap: Record<string,number> = {};
      activePjs.filter(p => p.status === 'In Progress').forEach(p => { if (p.owner) ownerMap[p.owner] = (ownerMap[p.owner]||0)+1; });
      const sorted = Object.entries(ownerMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
      const rows = sorted.map(([name,count],i) => `${i+1}. **${name}** — ${count} active project${count>1?'s':''} ${count>=5?'🔴 Overloaded':count>=3?'🟠 At Capacity':'✅'}`).join('\n');
      return `👥 **Owner Workload (Active Projects)**\n\n${rows}\n\nConsider redistributing work from overloaded owners.`;
    }

    // ── RISKS ─────────────────────────────────────────────────
    if (q.includes('risk')) {
      const openRisks = risks.filter(r => r.status === 'Open');
      const high = openRisks.filter(r => r.impact === 'High');
      if (q.includes('high')) {
        if (!high.length) return '✅ No high-impact open risks at this time.';
        const rows = high.map(r => `• **${r.id}** — ${r.description}\n  Project: ${r.projectId} | Owner: ${r.owner} | Category: ${r.category}`).join('\n\n');
        return `🚨 **High-Impact Open Risks (${high.length})**\n\n${rows}\n\nImmediate mitigation review recommended.`;
      }
      const rows = openRisks.slice(0,8).map(r => `• **${r.id}** — ${r.description} [${r.impact}]\n  Project: ${r.projectId} | ${r.category}`).join('\n\n');
      return `⚠️ **Open Risks (${openRisks.length})**\n\n${rows || 'No open risks right now. ✅'}`;
    }

    // ── PROGRESS / STATUS ─────────────────────────────────────
    if (q.includes('progress') || q.includes('complete') || q.includes('status') || q.includes('how many')) {
      const byStatus: Record<string, number> = {};
      activePjs.forEach(p => { byStatus[p.status] = (byStatus[p.status]||0)+1; });
      const rows = Object.entries(byStatus).sort((a,b)=>b[1]-a[1]).map(([s,c]) => `• **${s}**: ${c} projects`).join('\n');
      return `📊 **Portfolio Status Breakdown (${activePjs.length} total)**\n\n${rows}\n\nAverage progress across all active projects: **${Math.round(activePjs.reduce((s,p)=>s+p.progress,0)/activePjs.length)}%**`;
    }

    // ── EXECUTIVE SUMMARY ─────────────────────────────────────
    if (q.includes('summary') || q.includes('executive') || q.includes('overview') || q.includes('report')) {
      const overdue = activePjs.filter(p => { const d = daysUntil(p.targetDate); return d!==null && d<0 && p.status!=='Completed'; });
      const nearDeadline = activePjs.filter(p => { const d = daysUntil(p.targetDate); return d!==null && d>=0 && d<=14 && p.status!=='Completed'; });
      const stuck = activePjs.filter(p => {
        if (p.status === 'Completed' || p.dismissedFromStuck) return false;
        const todayStr = new Date().toISOString().split('T')[0];
        const isDelayed = p.status === 'Delayed';
        const isOverdue = p.targetDate ? p.targetDate < todayStr : false;
        return isDelayed || isOverdue;
      });
      const topRisks = risks.filter(r => r.status==='Open' && r.impact==='High').slice(0,3);
      const deptSummary = [...departments].sort((a,b)=>b.critical-a.critical).slice(0,3).map(d=>`  • ${d.name}: ${d.total} total, ${d.critical} critical`).join('\n');

      return `📋 **Executive Summary — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}**

The Commercial Department manages **${kpi.totalProjects} projects** across ${departments.filter(d=>d.total>0).length} departments.

**Portfolio Health:**
• ✅ ${kpi.inProgress} in progress · ${kpi.completed} completed
• 🚨 ${kpi.delayed} delayed · ${kpi.critical} critical
• ⚠️ ${kpi.openRisks} open risks · ${stuck.length} stuck

**Urgent Attention:**
• ${overdue.length} projects are overdue
• ${nearDeadline.length} projects due within 14 days

**Top Departments by Critical Projects:**
${deptSummary}
${topRisks.length ? `\n**High-Impact Risks:**\n${topRisks.map(r=>`  • ${r.description} (${r.projectId})`).join('\n')}` : ''}

**Recommendation:** Prioritise review of overdue and critical projects with Operations and Digital & Data leads.`;
    }

    // ── SPECIFIC PROJECT ID ───────────────────────────────────
    const projectIdMatch = query.match(/\b(PR[A-Z]+_\d+)\b/i);
    if (projectIdMatch) {
      const p = projects.find(x => x.id.toLowerCase() === projectIdMatch[1].toLowerCase());
      if (!p) return `I couldn't find project **${projectIdMatch[1]}**. Please verify the project ID.`;
      const d = daysUntil(p.targetDate);
      return `📁 **${p.id} — ${p.name}**\n\n• Department: ${p.department}\n• Owner: ${p.owner||'Unassigned'}\n• Status: **${p.status}**\n• Priority: **${p.priority}**\n• Progress: **${p.progress}%**\n• Start: ${formatDate(p.startDate)}\n• Target: ${formatDate(p.targetDate)}${d!==null ? ` (${d<0?`overdue by ${Math.abs(d)} days`:`${d} days left`})`:''}\n• Objective: ${p.objective||'—'}\n• KPI: ${p.kpi||'—'}\n• Notes: ${p.notes||'—'}`;
    }

    // ── PROJECT NAME SEARCH ───────────────────────────────────
    const nameSearch = activePjs.filter(p => p.name.toLowerCase().includes(q) || (p.owner||'').toLowerCase().includes(q));
    if (nameSearch.length > 0 && nameSearch.length <= 5) {
      const rows = nameSearch.map(p => `• **${p.id}** — ${p.name}\n  ${p.department} | ${p.status} | ${p.priority} | ${p.progress}%`).join('\n\n');
      return `🔍 **Matching Projects (${nameSearch.length})**\n\n${rows}`;
    }

    // ── DEFAULT PORTFOLIO SNAPSHOT ────────────────────────────
    const overdue = activePjs.filter(p => { const d = daysUntil(p.targetDate); return d!==null && d<0 && p.status!=='Completed'; });
    return `I have live access to your **${kpi.totalProjects}-project** portfolio. Here's a snapshot:\n\n• **${kpi.inProgress}** in progress · **${kpi.delayed}** delayed · **${kpi.critical}** critical\n• **${kpi.openRisks}** open risks · **${overdue.length}** overdue\n\nTry asking:\n• "Show delayed projects"\n• "Summarize Operations department"\n• "Who owns the most projects?"\n• "Which projects are due this month?"\n• "List all critical risks"\n• Any project ID like "PROPS_5"`;
  }, [projects, risks, departments, kpi]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    const response = generateResponse(msg);
    setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date() }]);
    setIsTyping(false);
  };

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  // Simple markdown renderer for bold
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">AI Project Copilot</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">Ask anything about your {kpi.totalProjects} projects, risks, and portfolio</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] hover:text-[#64748b] border border-[#e2e8f0] px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> New Chat
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-5 shadow-md">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-bold text-[#0f172a] mb-1">How can I help you today?</h2>
            <p className="text-[13px] text-[#64748b] mb-6 max-w-md text-center leading-relaxed">
              I have live access to your commercial portfolio — <strong>{kpi.totalProjects}</strong> projects, <strong>{risks.length}</strong> risks, across <strong>{departments.filter(d=>d.total>0).length}</strong> departments.
            </p>
            <div className="grid grid-cols-2 gap-2.5 max-w-lg w-full">
              {suggestions.map(s => (
                <button key={s} onClick={() => handleSend(s)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#e2e8f0] hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left group">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="text-[12px] text-[#475569] group-hover:text-[#1e293b] transition-colors">{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`group relative max-w-2xl rounded-xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-[#e2e8f0] text-[#334155]'
                }`}>
                  {m.role === 'assistant' ? renderContent(m.content) : m.content}
                  {m.role === 'assistant' && (
                    <button
                      onClick={() => copyMessage(m.content, i)}
                      className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-[#f8fafc] border border-[#e2e8f0] text-[#94a3b8] hover:text-[#64748b]"
                    >
                      {copiedIdx === i ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex items-center gap-2.5">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about projects, risks, deadlines, departments..."
            className="w-full bg-white border border-[#e2e8f0] rounded-xl pl-10 pr-5 py-3 text-[13px] text-[#1e293b] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-[#94a3b8]"
          />
        </div>
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="w-11 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 flex items-center justify-center hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 transition-all shadow-md"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
