'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useData } from '@/lib/data-context';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestions = [
  'Show all delayed projects',
  'Which department has the most critical projects?',
  'Generate executive summary for this week',
  'Who has the most projects assigned?',
  'What are the open high-impact risks?',
  'Which projects are stuck at 0%?',
];

export default function AIAssistantPage() {
  const { projects, risks, departments, kpi } = useData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('delayed')) {
      const delayed = projects.filter(p => p.status === 'Delayed');
      if (delayed.length === 0) return '✅ Great news! There are no delayed projects at the moment.';
      return `📊 **Delayed Projects (${delayed.length})**\n\n${delayed.map(p => `• **${p.id}** — ${p.name}\n  Department: ${p.department} · Owner: ${p.owner || 'Unassigned'}`).join('\n\n')}\n\n⚠️ Recommend immediate escalation to department heads.`;
    }

    if (q.includes('critical') && q.includes('department')) {
      const deptCritical = departments.map(d => ({ name: d.name, critical: d.critical })).sort((a, b) => b.critical - a.critical);
      return `🔴 **Critical Projects by Department:**\n\n${deptCritical.filter(d => d.critical > 0).map((d, i) => `${i + 1}. **${d.name}** — ${d.critical} critical project${d.critical > 1 ? 's' : ''}`).join('\n')}\n\nFocus on the top departments for immediate leadership review.`;
    }

    if (q.includes('executive summary') || q.includes('summary')) {
      const deptActive = departments.filter(d => d.total > 0).length;
      const stuckList = projects.filter(p => (p.priority === 'Critical' || p.priority === 'High') && p.status === 'In Progress' && p.progress === 0).slice(0, 3);
      return `📋 **Executive Summary — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}**\n\nThe BIAL Commercial Department has **${kpi.totalProjects} active projects** across ${deptActive} departments.\n\n**Key Highlights:**\n• ✅ ${kpi.inProgress} projects in progress, ${kpi.completed} completed\n• 🚨 ${kpi.delayed} projects delayed\n• ⚡ ${kpi.critical} critical priority items\n• 🔴 ${kpi.openRisks} open risks\n\n**Top Concerns:**\n${stuckList.map((p, i) => `${i + 1}. ${p.name} (${p.id}) — 0% progress`).join('\n')}\n\n**Recommendation:** Schedule urgent review with Digital & Data and Operations leads.`;
    }

    if (q.includes('most projects') || q.includes('owner') || q.includes('assigned')) {
      const ownerMap: Record<string, number> = {};
      projects.filter(p => p.status === 'In Progress').forEach(p => {
        if (p.owner) ownerMap[p.owner] = (ownerMap[p.owner] || 0) + 1;
      });
      const sorted = Object.entries(ownerMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
      return `👥 **Owner Workload (Active Projects):**\n\n${sorted.map(([name, count], i) => `${i + 1}. **${name}** — ${count} active project${count > 1 ? 's' : ''} ${count >= 5 ? '🔴 Overloaded' : count >= 3 ? '🟠 At Capacity' : '✅'}`).join('\n')}\n\nConsider redistributing from overloaded owners.`;
    }

    if (q.includes('risk') && q.includes('high')) {
      const highRisks = risks.filter(r => r.impact === 'High' && r.status === 'Open');
      if (highRisks.length === 0) return '✅ No high-impact open risks at this time.';
      return `🚨 **High-Impact Open Risks (${highRisks.length}):**\n\n${highRisks.map(r => `• **${r.id}** — ${r.description}\n  Project: ${r.projectId} · Owner: ${r.owner} · Category: ${r.category}`).join('\n\n')}\n\nImmediate mitigation review recommended.`;
    }

    if (q.includes('stuck') || q.includes('0%')) {
      const stuck = projects.filter(p => (p.priority === 'Critical' || p.priority === 'High') && p.status === 'In Progress' && p.progress === 0);
      if (stuck.length === 0) return '✅ No stuck projects detected — all high-priority projects show some progress.';
      return `⚠️ **Stuck Projects (High Priority, 0% Progress): ${stuck.length}**\n\n${stuck.slice(0, 6).map(p => `• **${p.id}** — ${p.name}\n  ${p.department} · ${p.owner || 'Unassigned'} · ${p.priority}`).join('\n\n')}\n\nThese need immediate leadership attention and unblocking.`;
    }

    // Default
    return `I've analyzed the portfolio of **${kpi.totalProjects} projects**. Here's a quick snapshot:\n\n• **${kpi.inProgress}** in progress · **${kpi.delayed}** delayed · **${kpi.critical}** critical\n• **${kpi.openRisks}** open risks · **${kpi.stuckProjects}** stuck projects\n\nTry asking about delayed projects, executive summaries, owner workload, or high-impact risks for detailed analysis.`;
  };

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 900 + Math.random() * 500));

    const response = generateResponse(msg);
    const aiMsg: Message = { role: 'assistant', content: response, timestamp: new Date() };
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">AI Project Copilot</h1>
        <p className="text-[13px] text-[#64748b] mt-0.5">Ask anything about your projects, risks, and portfolio</p>
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
              I have live access to your BIAL Commercial portfolio — {kpi.totalProjects} projects, {risks.length} risks, and {departments.filter(d => d.total > 0).length} departments.
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
                <div className={`max-w-2xl rounded-xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-[#e2e8f0] text-[#334155]'
                }`}>
                  {m.content}
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
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about projects, risks, performance..."
            className="w-full bg-white border border-[#e2e8f0] rounded-xl px-5 py-3 text-[13px] text-[#1e293b] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-[#94a3b8]"
          />
        </div>
        <button
          onClick={() => handleSend()}
          className="w-11 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 flex items-center justify-center hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-md"
        >
          <Send className="w-4.5 h-4.5 text-white" />
        </button>
      </div>
    </div>
  );
}
