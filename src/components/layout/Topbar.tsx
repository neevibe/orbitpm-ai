'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, Sparkles, Command, X, CheckCheck, Sun, Moon, ChevronRight, LogOut } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';

const routeNames: Record<string, string> = {
  '/': 'Command Center', '/command-center': 'Command Center', '/dashboard': 'Command Center',
  '/projects': 'Projects', '/portfolio': 'Portfolio', '/workforce': 'Workforce',
  '/departments': 'Departments', '/knowledge': 'Knowledge', '/ai': 'AI Copilot',
  '/ai-insights': 'AI Copilot', '/ai-assistant': 'AI Copilot',
  '/analytics': 'Analytics', '/risks': 'Risk Register', '/dependencies': 'Dependencies',
  '/automations': 'Automations', '/integrations': 'Integrations',
  '/admin': 'Administration', '/settings': 'Administration',
  '/reports': 'Reports', '/team': 'Workforce',
};

export default function Topbar() {
  const pathname = usePathname();
  const { notifications, markAllNotificationsRead, markNotificationRead } = useData();
  const { user, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  // Build breadcrumb
  const segments = pathname.split('/').filter(Boolean);
  const currentRoute = routeNames[pathname] || routeNames['/' + segments[0]] || segments[0] || 'Command Center';

  return (
    <header className="fixed top-0 left-[248px] right-0 h-[52px] bg-[var(--color-x-surface)]/90 backdrop-blur-xl border-b border-[var(--color-x-border)] flex items-center justify-between px-5 z-30">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-[var(--color-x-text-muted)]">Xyrenis</span>
        <ChevronRight className="w-3 h-3 text-[var(--color-x-text-muted)]" />
        <span className="font-semibold text-[var(--color-x-text)]">{currentRoute}</span>
        {segments.length > 1 && (
          <>
            <ChevronRight className="w-3 h-3 text-[var(--color-x-text-muted)]" />
            <span className="text-[var(--color-x-text-secondary)] font-mono text-[12px]">{segments[segments.length - 1]}</span>
          </>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5">
        {/* Global Search */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-x-border)] hover:border-[var(--color-x-border-hover)] bg-[var(--color-x-bg)] transition-all group mr-1">
          <Search className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
          <span className="text-[12px] text-[var(--color-x-text-muted)]">Search...</span>
          <div className="flex items-center gap-0.5 ml-4 px-1 py-0.5 rounded bg-[var(--color-x-surface)] border border-[var(--color-x-border)]">
            <Command className="w-2.5 h-2.5 text-[var(--color-x-text-muted)]" />
            <span className="text-[9px] text-[var(--color-x-text-muted)] font-medium">K</span>
          </div>
        </button>

        {/* AI */}
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 hover:border-indigo-300 transition-all">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[11px] font-semibold text-indigo-600">Ask AI</span>
        </button>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-x-bg)] transition-all" title="Toggle theme">
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[var(--color-x-text-muted)]" />}
        </button>

        {/* User avatar + logout */}
        {user && (
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-[var(--color-x-border)]">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: '#e86c2d' }}>
              {user.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-x-bg)] transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
            </button>
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-x-bg)] transition-all">
            <Bell className="w-4 h-4 text-[var(--color-x-text-muted)]" />
            {unread > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white">{unread}</span>}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-10 w-[360px] x-modal z-50 animate-scale-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-x-border)]">
                  <h3 className="text-[13px] font-semibold text-[var(--color-x-text)]">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unread > 0 && <button onClick={() => markAllNotificationsRead()} className="text-[11px] text-[var(--color-x-accent)] hover:underline flex items-center gap-1 font-medium"><CheckCheck className="w-3 h-3" />Read all</button>}
                    <button onClick={() => setShowNotifications(false)} className="text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text-secondary)]"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.slice(0, 8).map(n => (
                    <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`px-4 py-3 border-b border-[var(--color-x-border)]/50 hover:bg-[var(--color-x-bg)] transition-colors cursor-pointer ${!n.read ? 'bg-indigo-50/30' : ''}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'critical' ? 'bg-red-500' : n.type === 'warning' ? 'bg-amber-500' : n.type === 'success' ? 'bg-emerald-500' : n.type === 'insight' ? 'bg-indigo-500' : 'bg-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[var(--color-x-text)]">{n.title}</p>
                          <p className="text-[11px] text-[var(--color-x-text-secondary)] mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-[var(--color-x-text-muted)] mt-1">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
