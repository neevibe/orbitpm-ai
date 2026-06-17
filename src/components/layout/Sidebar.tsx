'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, Briefcase, Users2,
  BookOpen, Sparkles, BarChart3, Zap, Puzzle,
  ShieldCheck, ChevronDown, AlertTriangle, Link2,
  Settings, Search, Plane, UserCog
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useData } from '@/lib/data-context';

const workspaces = [
  {
    items: [
      { name: 'Dashboard', href: '/command-center', icon: LayoutDashboard, accent: '#6366f1' },
    ]
  },
  {
    section: 'Execution',
    items: [
      { name: 'Projects', href: '/projects', icon: FolderKanban, accent: '#3b82f6' },
      { name: 'Portfolio', href: '/portfolio', icon: Briefcase, accent: '#8b5cf6' },
      { name: 'Dependencies', href: '/dependencies', icon: Link2, accent: '#f59e0b' },
    ]
  },
  {
    section: 'People',
    items: [
      { name: 'Workforce', href: '/workforce', icon: Users2, accent: '#10b981' },
      { name: 'Departments', href: '/departments', icon: Users2, accent: '#06b6d4' },
    ]
  },
  {
    section: 'Intelligence',
    items: [
      { name: 'AI Copilot', href: '/ai', icon: Sparkles, accent: '#a855f7' },
      { name: 'Analytics', href: '/analytics', icon: BarChart3, accent: '#f97316' },
      { name: 'Risk Register', href: '/risks', icon: AlertTriangle, accent: '#ef4444' },
    ]
  },
  {
    section: 'Platform',
    items: [
      { name: 'Knowledge', href: '/knowledge', icon: BookOpen, accent: '#14b8a6' },
      { name: 'Automations', href: '/automations', icon: Zap, accent: '#eab308' },
      { name: 'Integrations', href: '/integrations', icon: Puzzle, accent: '#6366f1' },
    ]
  },
  {
    section: null,
    items: [
      { name: 'Administration', href: '/admin', icon: ShieldCheck, accent: '#64748b' },
    ]
  }
];

// Admin-only items, appended to the Administration group for CCO / admins.
const adminOnlyItem = { name: 'User Management', href: '/admin/users', icon: UserCog, accent: '#e86c2d' };

export default function Sidebar() {
  const pathname = usePathname();
  const { kpi } = useData();
  const { isSuperAdmin } = useAuth();

  const [companyName, setCompanyName] = useState('Xyrenis Enterprise');
  const [initials, setInitials] = useState('XY');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('xyrenis_user_company');
      if (saved && saved.trim() !== '') {
        const name = saved === 'BIAL Commercial' ? 'Xyrenis Enterprise' : saved;
        setCompanyName(name);
        setInitials(name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase());
      }
    }
  }, []);

  const nav = isSuperAdmin
    ? workspaces.map(ws => (ws.items.some(i => i.href === '/admin') ? { ...ws, items: [...ws.items, adminOnlyItem] } : ws))
    : workspaces;

  const isActive = (href: string) => {
    if (href === '/command-center') return pathname === '/' || pathname === '/command-center' || pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[212px] bg-[var(--color-x-surface)] border-r border-[var(--color-x-border)] flex flex-col z-40 select-none">
      {/* Logo */}
      <div className="flex items-center justify-center py-4 px-3 border-b border-[var(--color-x-border)]">
        <img src="/logo.svg?v=3" alt="Xyrenis" className="h-14 w-auto object-contain" />
      </div>

      {/* Workspace Selector */}
      <div className="px-3 pt-3 pb-1">
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-[var(--color-x-border)] hover:border-[var(--color-x-border-hover)] hover:bg-[var(--color-x-bg)] transition-all group">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">{initials}</div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[12px] font-semibold text-[var(--color-x-text)] leading-tight truncate">{companyName}</p>
            <p className="text-[10px] text-[var(--color-x-text-muted)] leading-tight">{kpi.totalProjects} projects</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--color-x-text-muted)] group-hover:text-[var(--color-x-text-secondary)] transition-colors flex-shrink-0" />
        </button>
      </div>

      {/* Quick Search */}
      <div className="px-3 py-1.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
          <input type="text" placeholder="Search..." className="w-full bg-[var(--color-x-bg)] border border-transparent rounded-md py-1.5 pl-8 pr-3 text-[12px] text-[var(--color-x-text)] placeholder:text-[var(--color-x-text-muted)] outline-none focus:border-[var(--color-x-accent)] transition-colors" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
        {nav.map((ws, wi) => (
          <div key={wi}>
            {ws.section && (
              <p className="px-2.5 mb-1 text-[10px] font-semibold text-[var(--color-x-text-muted)] uppercase tracking-[0.08em]">
                {ws.section}
              </p>
            )}
            <div className="space-y-px">
              {ws.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-2.5 px-2.5 py-[6px] rounded-lg text-[13px] font-medium transition-all duration-150
                      ${active
                        ? 'text-[var(--color-x-accent)] bg-[var(--color-x-accent-light)]'
                        : 'text-[var(--color-x-text-secondary)] hover:text-[var(--color-x-text)] hover:bg-[var(--color-x-bg)]'
                      }`}
                  >
                    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-r-full" style={{ background: item.accent }} />}
                    <item.icon className="w-[15px] h-[15px] flex-shrink-0" style={active ? { color: item.accent } : undefined} />
                    <span className="flex-1">{item.name}</span>
                    {item.name === 'Risk Register' && kpi.openRisks > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-50 text-red-500 rounded-full border border-red-100 min-w-[18px] text-center">{kpi.openRisks}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[var(--color-x-border)]">
        <Link href="/admin" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--color-x-bg)] transition-all">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">NP</div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[var(--color-x-text)] leading-tight">Neeraj Prakash</p>
            <p className="text-[10px] text-[var(--color-x-text-muted)]">Super Admin</p>
          </div>
          <Settings className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
        </Link>
      </div>
    </aside>
  );
}
