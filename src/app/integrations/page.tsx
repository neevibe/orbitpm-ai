'use client';

import { Puzzle, Globe, MessageSquare, Database, Mail, GitPullRequest, Cloud, ExternalLink, Search, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const mockIntegrations = [
  { id: '1', name: 'Jira Software', desc: 'Sync issues, epics, and sprints bi-directionally.', icon: GitPullRequest, category: 'Development', status: 'Connected', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: '2', name: 'Slack', desc: 'Receive portfolio alerts and risk escalations in channels.', icon: MessageSquare, category: 'Communication', status: 'Connected', color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: '3', name: 'Microsoft Teams', desc: 'Bot integration for status updates and meetings.', icon: Globe, category: 'Communication', status: 'Not Connected', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: '4', name: 'Snowflake', desc: 'Export analytics data directly to data warehouse.', icon: Database, category: 'Data', status: 'Not Connected', color: 'text-sky-500', bg: 'bg-sky-50' },
  { id: '5', name: 'Outlook Calendar', desc: 'Sync project milestones and workforce capacity.', icon: Mail, category: 'Productivity', status: 'Connected', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: '6', name: 'AWS S3', desc: 'Store knowledge base documents and attachments.', icon: Cloud, category: 'Storage', status: 'Not Connected', color: 'text-orange-500', bg: 'bg-orange-50' },
];

export default function IntegrationsPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');

  if (authLoading) return null;
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
          <Shield className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-[18px] font-bold text-[#0f172a]">Access restricted</h1>
        <p className="text-[13px] text-[#64748b] mt-1 max-w-sm">The Integrations area is available to Super Admin accounts only.</p>
      </div>
    );
  }

  const filtered = mockIntegrations.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="x-page space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><Puzzle className="w-5 h-5 text-blue-500" /> Integrations</h1>
          <p className="x-page-subtitle">Connect Xyrenis with your enterprise ecosystem</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-x-text-muted)]" />
          <input type="text" placeholder="Search marketplace..." className="x-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 animate-fade-in">
        {filtered.map(app => (
          <div key={app.id} className="x-card p-5 flex flex-col h-full hover:border-blue-300 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${app.bg} flex items-center justify-center`}>
                <app.icon className={`w-6 h-6 ${app.color}`} />
              </div>
              {app.status === 'Connected' ? (
                <span className="x-badge x-badge-green text-[10px]">Connected</span>
              ) : (
                <span className="x-badge x-badge-gray text-[10px]">Available</span>
              )}
            </div>
            
            <h3 className="text-[14px] font-bold text-[var(--color-x-text)]">{app.name}</h3>
            <p className="text-[12px] text-[var(--color-x-text-secondary)] mt-1 mb-4 flex-1">{app.desc}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-x-border)]">
              <span className="text-[11px] text-[var(--color-x-text-muted)]">{app.category}</span>
              {app.status === 'Connected' ? (
                <button className="text-[12px] font-medium text-[var(--color-x-text-secondary)] hover:text-[var(--color-x-text)] flex items-center gap-1">Configure <ExternalLink className="w-3 h-3" /></button>
              ) : (
                <button className="text-[12px] font-medium text-blue-600 hover:text-blue-700">Connect</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center p-12 text-[var(--color-x-text-muted)]">No integrations found matching "{search}"</div>}
    </div>
  );
}
