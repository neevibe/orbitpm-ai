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
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-white border-r border-[#e2e8f0] flex flex-col z-40">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#f1f5f9]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </div>
        <div>
          <h1 className="text-[14px] font-bold text-[#1e293b] tracking-tight leading-none">OrbitPM</h1>
          <p className="text-[10px] font-semibold text-indigo-500 tracking-wider uppercase mt-0.5">AI Platform</p>
        </div>
      </div>

      {/* Org Selector */}
      <div className="px-3 py-2.5">
        <button className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#cbd5e1] transition-all group">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[9px] font-bold text-white">
            BL
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[12px] font-semibold text-[#1e293b] leading-tight truncate">BIAL Commercial</p>
            <p className="text-[10px] text-[#94a3b8]">Bangalore Airport</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#64748b] transition-colors flex-shrink-0" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold text-[#94a3b8] uppercase tracking-[0.08em]">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150
                      ${isActive
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-[#64748b] hover:text-[#1e293b] hover:bg-[#f8fafc]'
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 bg-indigo-500 rounded-r-full" />
                    )}
                    <item.icon className="w-[16px] h-[16px] flex-shrink-0" />
                    <span>{item.name}</span>
                    {item.name === 'Risk Register' && kpi.openRisks > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-500 rounded border border-red-100">{kpi.openRisks}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-[#f1f5f9]">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#f8fafc] transition-all cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
            NP
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#1e293b]">Neeraj Prakash</p>
            <p className="text-[10px] text-[#94a3b8]">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
