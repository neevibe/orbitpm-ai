'use client';

import { Puzzle, MessageSquare, Database, Mail, GitPullRequest, Cloud, Search, Shield, CheckCircle2, Copy, ChevronDown, ChevronUp, Loader2, CalendarPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { authedFetch } from '@/lib/supabase';
import { toast } from '@/components/ui/Toaster';

/**
 * Integrations (super-admin) — Microsoft Teams + Outlook are live: one
 * Microsoft sign-in (delegated OAuth via /api/integrations/teams) powers
 * both. The rest are roadmap tiles shown honestly as "Coming soon".
 */

const roadmapIntegrations = [
  { id: 'jira', name: 'Jira Software', desc: 'Sync issues, epics, and sprints bi-directionally.', icon: GitPullRequest, category: 'Development', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'slack', name: 'Slack', desc: 'Receive portfolio alerts and risk escalations in channels.', icon: MessageSquare, category: 'Communication', color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'snowflake', name: 'Snowflake', desc: 'Export analytics data directly to data warehouse.', icon: Database, category: 'Data', color: 'text-sky-500', bg: 'bg-sky-50' },
  { id: 's3', name: 'AWS S3', desc: 'Store knowledge base documents and attachments.', icon: Cloud, category: 'Storage', color: 'text-orange-500', bg: 'bg-orange-50' },
];

type MsStatus = {
  configured: boolean;
  tableReady: boolean;
  connected: boolean;
  account: string;
  redirectUri: string;
};

type MsProps = {
  status: MsStatus | null;
  busy: boolean;
  connect: () => void;
  disconnect: () => void;
};

function CopyRow({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <code className="text-[11px] font-mono bg-[var(--color-x-surface-2)] border border-[var(--color-x-border)] rounded px-1.5 py-0.5 truncate">{value}</code>
      <button
        title="Copy"
        onClick={() => { navigator.clipboard.writeText(value); toast({ kind: 'info', text: 'Copied', key: 'copy' }); }}
        className="p-1 rounded text-[var(--color-x-text-faint)] hover:text-[var(--color-x-text)] hover:bg-[var(--color-x-surface-2)] flex-shrink-0"
      >
        <Copy className="w-3 h-3" />
      </button>
    </div>
  );
}

function MsBadge({ status }: { status: MsStatus | null }) {
  if (!status) return <span className="x-badge x-badge-gray text-[10px]">Checking…</span>;
  if (status.connected) return <span className="x-badge x-badge-green text-[10px]">Connected</span>;
  if (status.configured) return <span className="x-badge x-badge-blue text-[10px]">Ready to connect</span>;
  return <span className="x-badge x-badge-amber text-[10px]">Setup required</span>;
}

function MsActions({ status, busy, connect, disconnect }: MsProps) {
  if (!status) return <Loader2 className="w-4 h-4 animate-spin text-[var(--color-x-text-faint)]" />;
  if (status.connected) {
    return (
      <button onClick={disconnect} disabled={busy} className="text-[12px] font-medium text-[var(--color-x-text-secondary)] hover:text-red-600 disabled:opacity-50">
        {busy ? 'Working…' : 'Disconnect'}
      </button>
    );
  }
  if (status.configured && status.tableReady) {
    return (
      <button onClick={connect} disabled={busy} className="x-btn x-btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        {busy ? 'Redirecting…' : 'Connect'}
      </button>
    );
  }
  return <span className="text-[12px] text-[var(--color-x-text-faint)]">Awaiting setup</span>;
}

function TeamsTile(props: MsProps) {
  const { status } = props;
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div className="x-card p-5 flex flex-col h-full border-blue-200 hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-blue-500" />
        </div>
        <MsBadge status={status} />
      </div>

      <h3 className="text-[14px] font-bold text-[var(--color-x-text)]">Microsoft Teams</h3>
      <p className="text-[12px] text-[var(--color-x-text-secondary)] mt-1 flex-1">
        {status?.connected
          ? <>Signed in as <b>{status.account || 'your Microsoft account'}</b>. Project deep links work today; inline conversations arrive next.</>
          : 'Link project conversations and sign in with Microsoft to unlock live Teams features.'}
      </p>

      {status && !status.configured && (
        <div className="mt-3">
          <button
            onClick={() => setShowSetup(s => !s)}
            className="text-[12px] font-medium text-amber-700 flex items-center gap-1"
          >
            {showSetup ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            IT admin setup checklist
          </button>
          {showSetup && (
            <ol className="mt-2 space-y-2 text-[11.5px] text-[var(--color-x-text-secondary)] list-decimal pl-4">
              <li>Azure Portal → <b>Microsoft Entra ID → App registrations → New registration</b>.</li>
              <li>
                <span>Add a <b>Web</b> redirect URI:</span>
                <div className="mt-1"><CopyRow value={status.redirectUri} /></div>
              </li>
              <li>Create a <b>client secret</b> (Certificates &amp; secrets) and copy its value.</li>
              <li>
                <span>In Vercel → Settings → Environment Variables, add:</span>
                <div className="mt-1 space-y-1">
                  <CopyRow value="MS_TEAMS_CLIENT_ID" />
                  <CopyRow value="MS_TEAMS_CLIENT_SECRET" />
                  <CopyRow value="MS_TEAMS_TENANT_ID" />
                </div>
                <span className="block mt-1 text-[var(--color-x-text-muted)]">(tenant ID is optional — defaults to any work account)</span>
              </li>
              {!status.tableReady && (
                <li>Run <code className="font-mono">supabase/migrations/0008_ms_connections.sql</code> in the Supabase SQL Editor.</li>
              )}
              <li>Redeploy, then this tile switches to <b>Ready to connect</b>.</li>
            </ol>
          )}
        </div>
      )}

      {status && status.configured && !status.tableReady && (
        <p className="mt-3 text-[11.5px] text-amber-700">
          One step left: run <code className="font-mono">supabase/migrations/0008_ms_connections.sql</code> in the Supabase SQL Editor.
        </p>
      )}

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--color-x-border)]">
        <span className="text-[11px] text-[var(--color-x-text-muted)]">Communication</span>
        <MsActions {...props} />
      </div>
    </div>
  );
}

function OutlookTile(props: MsProps) {
  const { status } = props;
  return (
    <div className="x-card p-5 flex flex-col h-full border-blue-200 hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
          <CalendarPlus className="w-6 h-6 text-blue-600" />
        </div>
        <MsBadge status={status} />
      </div>

      <h3 className="text-[14px] font-bold text-[var(--color-x-text)]">Outlook Calendar &amp; Mail</h3>
      <p className="text-[12px] text-[var(--color-x-text-secondary)] mt-1 flex-1">
        {status?.connected
          ? <>Ready. Open any project’s <b>Tasks</b> tab and use the calendar / mail icons on a task to schedule a meeting or send an email — from your own account.</>
          : 'Schedule meetings and send emails about any task, straight from the task list. Uses the same Microsoft sign-in as Teams.'}
      </p>

      {status && !status.configured && (
        <p className="mt-3 text-[11.5px] text-amber-700">
          Completes automatically once the Microsoft Teams setup (left) is done — it’s one shared sign-in.
        </p>
      )}

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--color-x-border)]">
        <span className="text-[11px] text-[var(--color-x-text-muted)]">Productivity</span>
        <MsActions {...props} />
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MsStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await authedFetch('/api/integrations/teams');
      if (res.ok) setStatus(await res.json());
    } catch (e) {
      console.error('[integrations/teams]', e);
    }
  }, []);

  useEffect(() => {
    reload();
    // Landed back from Microsoft? The callback redirects here with a result flag.
    const q = new URLSearchParams(window.location.search);
    const result = q.get('teams');
    if (result === 'connected') {
      toast({ kind: 'success', text: 'Microsoft account connected — Teams and Outlook features are live for you.' });
    } else if (result === 'error') {
      toast({ kind: 'error', text: `Microsoft sign-in failed: ${q.get('reason') || 'unknown error'}` });
    }
    if (result) window.history.replaceState(null, '', window.location.pathname);
  }, [reload]);

  const connect = async () => {
    setBusy(true);
    try {
      const res = await authedFetch('/api/integrations/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect' }),
      });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || `HTTP ${res.status}`);
      window.location.href = j.url; // off to Microsoft sign-in
    } catch (e) {
      toast({ kind: 'error', text: e instanceof Error ? e.message : 'Could not start Microsoft sign-in.' });
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect your Microsoft account? Teams and Outlook features will stop working for you until you reconnect.')) return;
    setBusy(true);
    try {
      const res = await authedFetch('/api/integrations/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({} as { error?: string })); throw new Error(j.error || `HTTP ${res.status}`); }
      toast({ kind: 'info', text: 'Microsoft account disconnected.' });
      reload();
    } catch (e) {
      toast({ kind: 'error', text: e instanceof Error ? e.message : 'Could not disconnect.' });
    } finally {
      setBusy(false);
    }
  };

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

  const msProps: MsProps = { status, busy, connect, disconnect };
  const q = search.toLowerCase();
  const filtered = roadmapIntegrations.filter(i => i.name.toLowerCase().includes(q));
  const showTeams = 'microsoft teams'.includes(q);
  const showOutlook = 'outlook calendar & mail'.includes(q);

  return (
    <div className="x-page space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><Puzzle className="w-5 h-5 text-blue-500" /> Integrations</h1>
          <p className="x-page-subtitle">Connect Xyrenis with your enterprise ecosystem</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-x-text-muted)]" />
          <input type="text" placeholder="Search integrations..." className="x-input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
        {showTeams && <TeamsTile {...msProps} />}
        {showOutlook && <OutlookTile {...msProps} />}
        {filtered.map(app => (
          <div key={app.id} className="x-card p-5 flex flex-col h-full transition-all opacity-80">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${app.bg} flex items-center justify-center`}>
                <app.icon className={`w-6 h-6 ${app.color}`} />
              </div>
              <span className="x-badge x-badge-gray text-[10px]">Coming soon</span>
            </div>

            <h3 className="text-[14px] font-bold text-[var(--color-x-text)]">{app.name}</h3>
            <p className="text-[12px] text-[var(--color-x-text-secondary)] mt-1 mb-4 flex-1">{app.desc}</p>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-x-border)]">
              <span className="text-[11px] text-[var(--color-x-text-muted)]">{app.category}</span>
              <span className="text-[12px] text-[var(--color-x-text-faint)]">On the roadmap</span>
            </div>
          </div>
        ))}
      </div>
      {!showTeams && !showOutlook && filtered.length === 0 && (
        <div className="text-center p-12 text-[var(--color-x-text-muted)]">No integrations found matching &quot;{search}&quot;</div>
      )}
    </div>
  );
}
