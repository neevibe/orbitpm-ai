'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { Sparkles, Briefcase, BookOpen, BarChart3, Bot, User, Send, Zap, ChevronRight } from 'lucide-react';

const modes = [
  { id: 'executive', label: 'Executive', icon: Briefcase, desc: 'Portfolio-level insights' },
  { id: 'project', label: 'Project', icon: Zap, desc: 'Delivery & task analysis' },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen, desc: 'Search documentation' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Data & trend analysis' },
];

export default function AICopilotPage() {
  const { kpi, projects, departments } = useData();
  const [activeMode, setActiveMode] = useState('executive');
  const [input, setInput] = useState('');

  const messages = [
    { role: 'assistant', content: `Hello Neeraj. I'm Xyrenis Copilot. I've analyzed your portfolio of ${kpi.totalProjects} projects across ${departments.length} departments. How can I assist you today?` },
    { role: 'user', content: 'What are the biggest risks to Q3 delivery?' },
    { role: 'assistant', content: `Based on current data, there are **${kpi.delayed} delayed projects** and **${kpi.openRisks} open risks**. I recommend immediate review of:\n\n1. Digital Transformation (3 critical risks)\n2. T2 Commercial Rollout (Delayed by 2 weeks)\n\nWould you like me to generate a detailed risk report for these programs?` }
  ];

  const quickPrompts = [
    'Which projects are at risk?',
    'Who is overloaded this week?',
    'Forecast Q3 delivery timeline',
    'Generate executive status report',
    'Summarize open high-impact risks',
    'Team capacity analysis'
  ];

  const insights = [
    { title: 'Delivery Risk', desc: `${kpi.stuckProjects} project${kpi.stuckProjects !== 1 ? 's' : ''} have deadlines reaching in ≤7 days.`, color: 'text-red-500', bg: 'bg-red-50' },
    { title: 'Resource Alert', desc: `3 project managers are handling 4+ projects simultaneously.`, color: 'text-amber-500', bg: 'bg-amber-50' },
    { title: 'Portfolio Health', desc: `Overall completion rate is tracking positively at ${kpi.totalProjects > 0 ? Math.round((kpi.completed/kpi.totalProjects)*100) : 0}%.`, color: 'text-emerald-500', bg: 'bg-emerald-50' }
  ];

  return (
    <div className="x-page h-[calc(100vh-100px)] flex flex-col">
      <div className="mb-4">
        <h1 className="x-page-title flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </span>
          AI Copilot
        </h1>
        <p className="x-page-subtitle">Intelligent assistant powered by portfolio data</p>
      </div>

      <div className="flex-1 flex gap-5 min-h-0">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col x-card overflow-hidden">
          {/* Mode Selector */}
          <div className="flex items-center gap-1 p-2 border-b border-[var(--color-x-border)] bg-[var(--color-x-bg)]">
            {modes.map(m => (
              <button key={m.id} onClick={() => setActiveMode(m.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${activeMode === m.id ? 'bg-white shadow-sm text-indigo-600' : 'text-[var(--color-x-text-secondary)] hover:text-[var(--color-x-text)] hover:bg-black/5'}`}>
                <m.icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm' : 'bg-[var(--color-x-surface)] border border-[var(--color-x-border)]'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-[var(--color-x-text-muted)]" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${msg.role === 'assistant' ? 'bg-[var(--color-x-bg)] border border-[var(--color-x-border)] text-[var(--color-x-text)]' : 'bg-indigo-600 text-white shadow-sm'}`}>
                  {msg.content.split('\n').map((line, j) => <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>)}
                </div>
              </div>
            ))}

            {/* Quick Prompts */}
            <div className="mt-8">
              <p className="text-[11px] font-semibold text-[var(--color-x-text-muted)] uppercase tracking-wider mb-3 ml-11">Suggested Queries</p>
              <div className="grid grid-cols-2 gap-2 ml-11 max-w-[80%]">
                {quickPrompts.map(p => (
                  <button key={p} className="text-left px-3 py-2 rounded-lg border border-[var(--color-x-border)] bg-[var(--color-x-surface)] hover:border-indigo-300 hover:bg-indigo-50 text-[12px] text-[var(--color-x-text-secondary)] hover:text-indigo-700 transition-all">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[var(--color-x-border)] bg-[var(--color-x-bg)]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Ask Copilot about your ${kpi.totalProjects} projects...`}
                className="w-full bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-xl py-3 pl-4 pr-12 text-[13px] shadow-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
                onKeyDown={e => { if (e.key === 'Enter') setInput(''); }}
              />
              <button onClick={() => setInput('')} className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-center text-[10px] text-[var(--color-x-text-muted)] mt-2">AI Copilot can make mistakes. Consider verifying important data points.</p>
          </div>
        </div>

        {/* Right Sidebar - Insights */}
        <div className="w-[300px] flex flex-col gap-4">
          <div className="x-card p-4 bg-gradient-to-b from-indigo-50/50 to-transparent border-indigo-100/50">
            <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-4 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-500" /> Auto-Insights
            </h3>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="p-3 rounded-xl border border-[var(--color-x-border)] bg-[var(--color-x-surface)] hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${insight.bg} ${insight.color.replace('text-', 'bg-')}`} />
                      <span className="text-[11px] font-semibold text-[var(--color-x-text)]">{insight.title}</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-x-text-secondary)] leading-relaxed">{insight.desc}</p>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Generate report <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
