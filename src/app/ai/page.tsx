'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '@/lib/data-context';
import { Sparkles, Briefcase, BookOpen, BarChart3, Bot, User, Send, Zap, ChevronRight, RefreshCw } from 'lucide-react';

const modes = [
  { id: 'executive', label: 'Executive', icon: Briefcase, desc: 'Portfolio-level insights' },
  { id: 'project', label: 'Project', icon: Zap, desc: 'Delivery & task analysis' },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen, desc: 'Search documentation' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Data & trend analysis' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-[var(--color-x-bg)] border border-[var(--color-x-border)] rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const lines = msg.content.split('\n');

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-[var(--color-x-surface)] border border-[var(--color-x-border)]'
          : 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-sm'
      }`}>
        {isUser ? <User className="w-4 h-4 text-[var(--color-x-text-muted)]" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
        isUser
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'bg-[var(--color-x-bg)] border border-[var(--color-x-border)] text-[var(--color-x-text)]'
      }`}>
        {lines.map((line, i) => {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </p>
          );
        })}
        <p className={`text-[10px] mt-1.5 ${isUser ? 'text-indigo-200' : 'text-[var(--color-x-text-muted)]'}`}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function AICopilotPage() {
  const { kpi, projects, departments } = useData();
  const [activeMode, setActiveMode] = useState('executive');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: `Hello! I'm your AI Copilot. I've analysed your portfolio of **${kpi.totalProjects} projects** across **${departments.length} departments**.\n\nI can help you with risk analysis, delivery forecasts, team capacity, and executive reporting. What would you like to explore?`,
    timestamp: new Date(),
  }]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const stats = {
    totalProjects: kpi.totalProjects,
    completed: kpi.completed,
    delayed: kpi.delayed,
    inProgress: projects.filter(p => p.status === 'In Progress').length,
    notStarted: projects.filter(p => p.status === 'Not Started').length,
    openRisks: kpi.openRisks,
    stuckProjects: kpi.stuckProjects,
    departments: departments.map(d => d.name),
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: newHistory.slice(-8).map(m => ({ role: m.role, content: m.content })),
          mode: activeMode,
          stats,
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response ?? 'Sorry, I could not process that request. Please try again.',
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, isLoading, activeMode, stats]);

  const handleModeChange = (modeId: string) => {
    setActiveMode(modeId);
    const modeObj = modes.find(m => m.id === modeId);
    setMessages([{
      role: 'assistant',
      content: `Switched to **${modeObj?.label}** mode — ${modeObj?.desc}. I still have full access to your portfolio of **${kpi.totalProjects} projects**. How can I help?`,
      timestamp: new Date(),
    }]);
  };

  const quickPrompts = [
    'What are the biggest risks to delivery?',
    'Which projects are delayed?',
    'Forecast Q3 completion timeline',
    'Generate executive status report',
    'Who is overloaded this week?',
    'Department performance summary',
  ];

  const insights = [
    { title: 'Delivery Risk', desc: `${kpi.delayed} projects past target date need attention.`, dot: 'bg-red-500', prompt: 'Which projects are delayed and what are the root causes?' },
    { title: 'Resource Alert', desc: '3 PMs handling 4+ projects — above threshold.', dot: 'bg-amber-500', prompt: 'Who is overloaded and how should we redistribute?' },
    { title: 'Portfolio Health', desc: `Completion rate at ${kpi.totalProjects > 0 ? Math.round((kpi.completed / kpi.totalProjects) * 100) : 0}% — tracking positively.`, dot: 'bg-emerald-500', prompt: 'Generate an executive portfolio health summary' },
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
        <p className="x-page-subtitle">Intelligent assistant powered by live portfolio data</p>
      </div>

      <div className="flex-1 flex gap-5 min-h-0">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col x-card overflow-hidden">
          {/* Mode Selector */}
          <div className="flex items-center gap-1 p-2 border-b border-[var(--color-x-border)] bg-[var(--color-x-bg)] justify-between">
            <div className="flex items-center gap-1">
              {modes.map(m => (
                <button key={m.id} onClick={() => handleModeChange(m.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                    activeMode === m.id
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-[var(--color-x-text-secondary)] hover:text-[var(--color-x-text)] hover:bg-black/5'
                  }`}>
                  <m.icon className="w-3.5 h-3.5" /> {m.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMessages([{
                role: 'assistant',
                content: `Conversation cleared. Portfolio of **${kpi.totalProjects} projects** is still loaded. Ask me anything!`,
                timestamp: new Date(),
              }])}
              className="p-1.5 rounded-md hover:bg-[var(--color-x-border)] transition-colors"
              title="Clear conversation"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {isLoading && <TypingIndicator />}

            {/* Quick Prompts — only on first message */}
            {messages.length === 1 && !isLoading && (
              <div className="mt-6 ml-11">
                <p className="text-[11px] font-semibold text-[var(--color-x-text-muted)] uppercase tracking-wider mb-3">Suggested Queries</p>
                <div className="grid grid-cols-2 gap-2 max-w-[80%]">
                  {quickPrompts.map(p => (
                    <button key={p} onClick={() => sendMessage(p)}
                      className="text-left px-3 py-2 rounded-lg border border-[var(--color-x-border)] bg-[var(--color-x-surface)] hover:border-indigo-300 hover:bg-indigo-50 text-[12px] text-[var(--color-x-text-secondary)] hover:text-indigo-700 transition-all">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[var(--color-x-border)] bg-[var(--color-x-bg)]">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder={`Ask about your ${kpi.totalProjects} projects...`}
                disabled={isLoading}
                className="w-full bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-xl py-3 pl-4 pr-12 text-[13px] shadow-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all disabled:opacity-60"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-center text-[10px] text-[var(--color-x-text-muted)] mt-2">
              AI Copilot analyses live portfolio data. Verify critical decisions with source records.
            </p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[280px] flex flex-col gap-4">
          <div className="x-card p-4 bg-gradient-to-b from-indigo-50/50 to-transparent border-indigo-100/50">
            <h3 className="text-[13px] font-bold text-[var(--color-x-text)] mb-4 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-500" /> Auto-Insights
            </h3>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <button key={i} onClick={() => sendMessage(insight.prompt)}
                  className="w-full text-left p-3 rounded-xl border border-[var(--color-x-border)] bg-[var(--color-x-surface)] hover:shadow-sm hover:border-indigo-200 transition-all group">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${insight.dot}`} />
                    <span className="text-[11px] font-semibold text-[var(--color-x-text)]">{insight.title}</span>
                  </div>
                  <p className="text-[11px] text-[var(--color-x-text-secondary)] leading-relaxed">{insight.desc}</p>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Ask Copilot <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Portfolio Snapshot */}
          <div className="x-card p-4">
            <h3 className="text-[12px] font-bold text-[var(--color-x-text)] mb-3">Portfolio Snapshot</h3>
            <div className="space-y-2">
              {[
                { label: 'Total Projects', value: kpi.totalProjects, color: 'text-indigo-600' },
                { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600' },
                { label: 'Completed', value: kpi.completed, color: 'text-emerald-600' },
                { label: 'Delayed', value: kpi.delayed, color: 'text-red-600' },
                { label: 'Open Risks', value: kpi.openRisks, color: 'text-amber-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-x-text-muted)]">{item.label}</span>
                  <span className={`text-[12px] font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
