'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, Building2, AlertTriangle,
  FileText, Settings, Bot, ChevronDown,
  Activity, Users, BarChart3, Link2
} from 'lucide-react';
import { useData } from '@/lib/data-context';

const navSections = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Projects', href: '/projects', icon: FolderKanban },
      { name: 'Departments', href: '/departments', icon: Building2 },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Risk Register', href: '/risks', icon: AlertTriangle },
      { name: 'Dependencies', href: '/dependencies', icon: Link2 },
      { name: 'AI Insights', href: '/ai-insights', icon: Activity },
      { name: 'AI Assistant', href: '/ai-assistant', icon: Bot },
    ]
  },
  {
    label: 'Management',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Team', href: '/team', icon: Users },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { kpi } = useData();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] flex flex-col z-40" style={{ background: '#1a2233' }}>
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#e86c2d' }}>
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </div>
        <div>
          <h1 className="text-[14px] font-bold leading-none" style={{ color: '#ffffff' }}>OrbitPM</h1>
          <p className="text-[10px] font-medium tracking-wider uppercase mt-0.5" style={{ color: '#e86c2d' }}>AI Platform</p>
        </div>
      </div>

      {/* Org Selector */}
      <div className="px-3 py-2.5">
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded transition-colors" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#e86c2d' }}>
            BL
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: '#e8eaf0' }}>BIAL Commercial</p>
            <p className="text-[10px]" style={{ color: '#7a8499' }}>Bangalore Airport</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7a8499' }} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: '#5a6478' }}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative flex items-center gap-2.5 px-2.5 py-[7px] rounded text-[13px] font-medium transition-all duration-150"
                    style={{
                      color: isActive ? '#ffffff' : '#9aa3b5',
                      background: isActive ? 'rgba(232, 108, 45, 0.18)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9aa3b5'; } }}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: '#e86c2d' }} />
                    )}
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                    {item.name === 'Risk Register' && kpi.openRisks > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded" style={{ background: '#dc2626', color: '#fff' }}>{kpi.openRisks}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded cursor-pointer" style={{ color: '#9aa3b5' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#e86c2d' }}>
            NP
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold" style={{ color: '#e8eaf0' }}>Neeraj Prakash</p>
            <p className="text-[10px]" style={{ color: '#7a8499' }}>Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
