'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, Briefcase, Users2,
  BookOpen, Sparkles, BarChart3, Zap, Puzzle,
  ShieldCheck, ChevronDown, AlertTriangle, Link2,
  Settings, Search, Plane, UserCog, Activity,
  UserCircle2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useData } from '@/lib/data-context';

const workspaces = [
  {
    items: [
      { name: 'Dashboard', href: '/command-center', icon: LayoutDashboard, accent: '#6366f1' },
      { name: 'My Work', href: '/my-work', icon: UserCircle2, accent: '#0ea5e9' },
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
      { name: 'Xyro AI', href: '/ai', icon: Sparkles, accent: '#a855f7' },
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
const adminOnlyAudit = { name: 'Audit & Activity', href: '/admin/audit', icon: Activity, accent: '#0ea5e9' };

export default function Sidebar() {
  const pathname = usePathname();
  const { kpi } = useData();
  const { isSuperAdmin, user, role } = useAuth();

  // Collapsible left rail: the collapsed flag lives on <html data-sidebar>, so
  // the sidebar, topbar and content margin (all sized via --sidebar-w) move
  // together with one attribute flip. Preference persists per browser.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('xyrenis_sidebar') === 'collapsed'
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded');
    localStorage.setItem('xyrenis_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const fullName = (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || 'User';
  const roleLabel = isSuperAdmin ? 'Super Admin' : (role && role !== 'user' ? role.replace(/_/g, ' ') : 'Member');

  const [companyName, setCompanyName] = useState('Xyrenis Enterprise');
  const [initials, setInitials] = useState('XY');
  
  const [profileName, setProfileName] = useState(fullName);
  const [profileRole, setProfileRole] = useState(roleLabel);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const loadProfile = () => {
    if (typeof window !== 'undefined') {
      const savedDetails = localStorage.getItem('user_profile_details');
      let nameToSet = fullName;
      let roleToSet = roleLabel;
      if (savedDetails) {
        try {
          const parsed = JSON.parse(savedDetails);
          if (parsed.name) nameToSet = parsed.name;
          if (parsed.designation) roleToSet = parsed.designation;
        } catch (e) {
          console.error(e);
        }
      }
      
      const savedAvatar = localStorage.getItem('user_profile_photo');
      
      setTimeout(() => {
        setProfileName(nameToSet);
        setProfileRole(roleToSet);
        setProfileAvatar(savedAvatar || null);
      }, 0);
    }
  };

  useEffect(() => {
    loadProfile();
    window.addEventListener('user-profile-updated', loadProfile);
    return () => window.removeEventListener('user-profile-updated', loadProfile);
  }, [fullName, roleLabel]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('xyrenis_user_company');
      if (saved && saved.trim() !== '') {
        const name = saved === 'BIAL Commercial' ? 'Xyrenis Enterprise' : saved;
        setTimeout(() => {
          setCompanyName(name);
          setInitials(name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase());
        }, 0);
      }
    }
  }, []);

  // Super-Admin-only destinations: the whole Administration section, plus
  // Automation and Integration (hidden entirely for normal users — not disabled).
  const SUPER_ADMIN_ONLY = new Set(['/admin', '/automations', '/integrations']);
  const nav = isSuperAdmin
    ? workspaces.map(ws => (ws.items.some(i => i.href === '/admin') ? { ...ws, items: [...ws.items, adminOnlyItem, adminOnlyAudit] } : ws))
    : workspaces
        .map(ws => ({ ...ws, items: ws.items.filter(i => !SUPER_ADMIN_ONLY.has(i.href)) }))
        .filter(ws => ws.items.length > 0);

  const isActive = (href: string) => {
    if (href === '/command-center') return pathname === '/' || pathname === '/command-center' || pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[var(--sidebar-w)] bg-[var(--color-x-surface)] border-r border-[var(--color-x-border)] flex flex-col z-40 select-none transition-[width] duration-200 ease-in-out">
      {/* Logo + collapse toggle */}
      <div className={`h-[52px] flex items-center border-b border-[var(--color-x-border)] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!collapsed && (
          <img src="/logo-mark.png" alt="Xyrenis" className="w-[140px] h-auto object-contain transition-opacity duration-200 hover:opacity-75" />
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-md text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] hover:bg-[var(--color-x-bg)] transition-colors cursor-pointer"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Workspace Selector */}
      {!collapsed && (
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
      )}

      {/* Quick Search */}
      {!collapsed && (
        <div className="px-3 py-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-x-text-muted)]" />
            <input type="text" placeholder="Search..." className="w-full bg-[var(--color-x-bg)] border border-transparent rounded-md py-1.5 pl-8 pr-3 text-[12px] text-[var(--color-x-text)] placeholder:text-[var(--color-x-text-muted)] outline-none focus:border-[var(--color-x-accent)] transition-colors" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-1 ${collapsed ? 'px-2 space-y-3 pt-3' : 'px-3 space-y-4'}`}>
        {nav.map((ws, wi) => (
          <div key={wi}>
            {ws.section && !collapsed && (
              <p className="px-2.5 mb-1 text-[10px] font-semibold text-[var(--color-x-text-muted)] uppercase tracking-[0.08em]">
                {ws.section}
              </p>
            )}
            {ws.section && collapsed && wi > 0 && <div className="mx-2 mb-2 border-t border-[var(--color-x-border)]" />}
            <div className="space-y-px">
              {ws.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200 ease-in-out
                      ${collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-[6px]'}
                      ${active
                        ? 'text-[var(--color-x-accent)] bg-[var(--color-x-accent-light)]'
                        : 'text-[var(--color-x-text-secondary)] hover:text-[var(--color-x-text)] hover:bg-[var(--color-x-bg)]'
                      }`}
                  >
                    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-r-full" style={{ background: item.accent }} />}
                    <item.icon className={`flex-shrink-0 ${collapsed ? 'w-[17px] h-[17px]' : 'w-[15px] h-[15px]'}`} style={active ? { color: item.accent } : undefined} />
                    {!collapsed && <span className="flex-1">{item.name}</span>}
                    {!collapsed && item.name === 'Risk Register' && kpi.openRisks > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-50 text-red-500 rounded-full border border-red-100 min-w-[18px] text-center">{kpi.openRisks}</span>
                    )}
                    {collapsed && item.name === 'Risk Register' && kpi.openRisks > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className={`border-t border-[var(--color-x-border)] ${collapsed ? 'p-2' : 'p-3'}`}>
        {(() => {
          const displayInitials = profileName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          return (
            <Link href="/settings" title={collapsed ? `${profileName} — Settings` : undefined} className={`flex items-center rounded-lg hover:bg-[var(--color-x-bg)] transition-all ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-2.5 py-2'}`}>
              <div className="w-7 h-7 rounded-full border border-indigo-100 flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 text-[10px] font-bold text-white flex-shrink-0">
                {profileAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  displayInitials
                )}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--color-x-text)] leading-tight truncate">{profileName}</p>
                    <p className="text-[10px] text-[var(--color-x-text-muted)] capitalize truncate">{profileRole}</p>
                  </div>
                  <Settings className="w-3.5 h-3.5 text-[var(--color-x-text-muted)] hover:text-indigo-600 transition-colors" />
                </>
              )}
            </Link>
          );
        })()}
      </div>
    </aside>
  );
}
