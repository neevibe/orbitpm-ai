'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Search, Bell, Sparkles, Command, X, CheckCheck, Sun, Moon, ChevronRight, LogOut,
  FolderKanban, Briefcase, Users2, Link2, AlertTriangle, BookOpen, Zap, Puzzle, LayoutDashboard, BarChart3 
} from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';

const routeNames: Record<string, string> = {
  '/': 'Command Center', '/command-center': 'Command Center', '/dashboard': 'Command Center',
  '/projects': 'Projects', '/portfolio': 'Portfolio', '/workforce': 'Workforce',
  '/departments': 'Departments', '/knowledge': 'Knowledge', '/ai': 'Xyro AI',
  '/ai-insights': 'Xyro AI', '/ai-assistant': 'Xyro AI',
  '/analytics': 'Analytics', '/risks': 'Risk Register', '/dependencies': 'Dependencies',
  '/automations': 'Automations', '/integrations': 'Integrations',
  '/admin': 'Administration', '/settings': 'Administration',
  '/reports': 'Reports', '/team': 'Workforce',
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, markAllNotificationsRead, markNotificationRead, projects, departments, risks } = useData();
  const { user, signOut, isDemoMode } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keydown handler for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autofocus input when modal opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [searchOpen]);

  const handleNavigate = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  };

  // Search logic
  const filteredProjects = searchQuery.trim() === '' ? [] : projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.owner && p.owner.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 5);

  const filteredRisks = searchQuery.trim() === '' ? [] : risks.filter(r => 
    r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const filteredDepts = searchQuery.trim() === '' ? [] : departments.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const pageItems = [
    { name: 'Dashboard', href: '/command-center', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
    { name: 'Dependencies', href: '/dependencies', icon: Link2 },
    { name: 'Workforce', href: '/workforce', icon: Users2 },
    { name: 'Departments', href: '/departments', icon: Users2 },
    { name: 'Xyro (AI Copilot)', href: '/ai', icon: Sparkles },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Risk Register', href: '/risks', icon: AlertTriangle },
    { name: 'Knowledge', href: '/knowledge', icon: BookOpen },
    { name: 'Automations', href: '/automations', icon: Zap },
    { name: 'Integrations', href: '/integrations', icon: Puzzle },
  ];

  const filteredPages = searchQuery.trim() === '' 
    ? pageItems.slice(0, 4)
    : pageItems.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  // Build breadcrumb
  const segments = pathname.split('/').filter(Boolean);
  const currentRoute = routeNames[pathname] || routeNames['/' + segments[0]] || segments[0] || 'Command Center';

  return (
    <header className="fixed top-0 left-[212px] right-0 h-[52px] bg-[var(--color-x-surface)]/90 backdrop-blur-xl border-b border-[var(--color-x-border)] flex items-center justify-between px-5 z-30">
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
        <button 
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-x-border)] hover:border-[var(--color-x-border-hover)] bg-[var(--color-x-bg)] transition-all group mr-1 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
          <span className="text-[12px] text-[var(--color-x-text-muted)]">Search...</span>
          <div className="flex items-center gap-0.5 ml-4 px-1 py-0.5 rounded bg-[var(--color-x-surface)] border border-[var(--color-x-border)]">
            <Command className="w-2.5 h-2.5 text-[var(--color-x-text-muted)]" />
            <span className="text-[9px] text-[var(--color-x-text-muted)] font-medium">K</span>
          </div>
        </button>

        {/* AI */}
        <button 
          onClick={() => router.push('/ai')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 hover:border-indigo-300 transition-all cursor-pointer"
        >
          <Image src="/xyro.webp" alt="Xyro" width={20} height={20} className="w-5 h-5" />
          <span className="text-[11px] font-semibold text-indigo-600">Ask Xyro</span>
        </button>

        {/* Global Search Dialog */}
        {searchOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 transition-opacity"
              onClick={() => setSearchOpen(false)}
            />
            {/* Search Box */}
            <div className="fixed top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-lg bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-in max-h-[60vh] flex flex-col">
              {/* Input Header */}
              <div className="p-3 border-b border-[var(--color-x-border)] flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--color-x-text-muted)] flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search projects, risks, departments, or pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-[var(--color-x-text)] placeholder:text-[var(--color-x-text-muted)]"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[var(--color-x-text-muted)] bg-[var(--color-x-bg)] border border-[var(--color-x-border)] px-1.5 py-0.5 rounded font-mono">ESC</span>
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="p-1 rounded-md hover:bg-[var(--color-x-bg)] text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Results Body */}
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {/* If no query, show pages or quick navigation */}
                {searchQuery.trim() === '' ? (
                  <div>
                    <h4 className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-x-text-muted)]">Quick Links</h4>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {pageItems.map((item) => (
                        <button
                          key={item.href}
                          onClick={() => handleNavigate(item.href)}
                          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--color-x-bg)] text-left transition-colors cursor-pointer w-full"
                        >
                          <item.icon className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-[12px] font-medium text-[var(--color-x-text-secondary)]">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Matching Pages */}
                    {filteredPages.length > 0 && (
                      <div>
                        <h4 className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-x-text-muted)]">Pages</h4>
                        <div className="space-y-0.5 mt-1">
                          {filteredPages.map((item) => (
                            <button
                              key={item.href}
                              onClick={() => handleNavigate(item.href)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--color-x-bg)] text-left transition-colors cursor-pointer"
                            >
                              <item.icon className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                              <span className="text-[12px] font-medium text-[var(--color-x-text)]">{item.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Projects */}
                    {filteredProjects.length > 0 && (
                      <div>
                        <h4 className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-x-text-muted)]">Projects</h4>
                        <div className="space-y-0.5 mt-1">
                          {filteredProjects.map((proj) => (
                            <button
                              key={proj.id}
                              onClick={() => handleNavigate(`/projects/${proj.id}`)}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-x-bg)] text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FolderKanban className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-[var(--color-x-text)] truncate">{proj.name}</p>
                                  <p className="text-[10px] text-[var(--color-x-text-muted)] truncate">{proj.id} · {proj.owner}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full ${
                                proj.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                proj.status === 'Delayed' ? 'bg-red-50 text-red-600 border border-red-100' :
                                proj.status === 'On Hold' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>{proj.status}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Risks */}
                    {filteredRisks.length > 0 && (
                      <div>
                        <h4 className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-x-text-muted)]">Risks</h4>
                        <div className="space-y-0.5 mt-1">
                          {filteredRisks.map((risk) => (
                            <button
                              key={risk.id}
                              onClick={() => handleNavigate(`/risks`)}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-x-bg)] text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-[var(--color-x-text)] truncate">{risk.description}</p>
                                  <p className="text-[10px] text-[var(--color-x-text-muted)] truncate">{risk.category} · Project: {risk.projectId}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full ${
                                risk.impact === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                                risk.impact === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>Impact: {risk.impact}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Departments */}
                    {filteredDepts.length > 0 && (
                      <div>
                        <h4 className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-x-text-muted)]">Departments</h4>
                        <div className="space-y-0.5 mt-1">
                          {filteredDepts.map((dept) => (
                            <button
                              key={dept.name}
                              onClick={() => handleNavigate(`/departments`)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--color-x-bg)] text-left transition-colors cursor-pointer"
                            >
                              <Users2 className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                              <span className="text-[12px] font-medium text-[var(--color-x-text)]">{dept.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {filteredPages.length === 0 && filteredProjects.length === 0 && filteredRisks.length === 0 && filteredDepts.length === 0 && (
                      <div className="text-center py-6">
                        <Search className="w-6 h-6 text-[var(--color-x-text-muted)] mx-auto mb-2 opacity-40" />
                        <p className="text-[12px] font-medium text-[var(--color-x-text-secondary)]">No results found for &ldquo;{searchQuery}&rdquo;</p>
                        <p className="text-[11px] text-[var(--color-x-text-muted)] mt-0.5">Try searching with other terms or check your spelling.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}



        {/* Demo mode badge + exit */}
        {isDemoMode && (
          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-[var(--color-x-border)]">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>
              ✦ Demo Mode — Masked Data
            </span>
            <button onClick={() => signOut()} title="Exit demo" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-x-bg)] transition-all">
              <LogOut className="w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
            </button>
          </div>
        )}

        {/* User avatar + logout */}
        {user && !isDemoMode && (
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
