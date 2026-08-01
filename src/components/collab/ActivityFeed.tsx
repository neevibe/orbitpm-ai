'use client';

import { useEffect, useState } from 'react';
import { Activity, FolderPlus, Pencil, Archive, RotateCcw, Trash2, GitBranch, AlertTriangle, Send } from 'lucide-react';
import { authedFetch } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

// Sample audit trail shown in demo mode (no real API call).
const DEMO_ACTIVITY: FeedEvent[] = [
  { id: 'a1', at: new Date(Date.now() - 45 * 60000).toISOString(), actor: 'Sofia Almeida', action: 'risk.create', entityId: 'MER-TEC-04', entityName: 'Zero-Trust Security Programme', alertTitle: '' },
  { id: 'a2', at: new Date(Date.now() - 2 * 3600000).toISOString(), actor: 'System', action: 'teams.alert_sent', entityId: 'MER-CX-02', entityName: 'Mobile App Relaunch', alertTitle: 'Project delayed' },
  { id: 'a3', at: new Date(Date.now() - 3 * 3600000).toISOString(), actor: 'Wei Chen', action: 'project.update', entityId: 'MER-TEC-05', entityName: 'Enterprise Data Lakehouse', alertTitle: '' },
  { id: 'a4', at: new Date(Date.now() - 5 * 3600000).toISOString(), actor: 'Priya Nair', action: 'project.update', entityId: 'MER-TEC-01', entityName: 'ERP Modernisation Programme', alertTitle: '' },
  { id: 'a5', at: new Date(Date.now() - 26 * 3600000).toISOString(), actor: 'Wei Chen', action: 'project.archive', entityId: 'MER-TEC-03', entityName: 'API Gateway Rollout', alertTitle: '' },
  { id: 'a6', at: new Date(Date.now() - 28 * 3600000).toISOString(), actor: 'Marcus Bennett', action: 'project.create', entityId: 'MER-COM-02', entityName: 'Retail Media Network Launch', alertTitle: '' },
  { id: 'a7', at: new Date(Date.now() - 50 * 3600000).toISOString(), actor: 'Elena Popova', action: 'risk.create', entityId: 'MER-FIN-02', entityName: 'Procurement Digitisation', alertTitle: '' },
  { id: 'a8', at: new Date(Date.now() - 52 * 3600000).toISOString(), actor: 'James Sullivan', action: 'project.update', entityId: 'MER-OPS-01', entityName: 'Warehouse Automation', alertTitle: '' },
];

/**
 * Recent Activity (dashboard) — real events from the audit trail, including
 * automated alerts that were actually delivered to the Teams channel. Never
 * shows fabricated entries; empty state is honest.
 */

type FeedEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entityId: string;
  entityName: string;
  alertTitle: string;
};

const ICONS: Record<string, { icon: typeof Pencil; cls: string }> = {
  'project.create':  { icon: FolderPlus,    cls: 'text-[var(--color-x-accent)] bg-[var(--color-x-accent-light)]' },
  'project.update':  { icon: Pencil,        cls: 'text-[var(--color-x-text-secondary)] bg-[var(--color-x-bg)]' },
  'project.archive': { icon: Archive,       cls: 'text-[var(--color-x-text-secondary)] bg-[var(--color-x-bg)]' },
  'project.restore': { icon: RotateCcw,     cls: 'text-[var(--color-x-success)] bg-[var(--color-x-success-light)]' },
  'project.delete':  { icon: Trash2,        cls: 'text-[var(--color-x-danger)] bg-[var(--color-x-danger-light)]' },
  'project.split':   { icon: GitBranch,     cls: 'text-[var(--color-x-accent)] bg-[var(--color-x-accent-light)]' },
  'risk.create':     { icon: AlertTriangle, cls: 'text-[var(--color-x-warning)] bg-[var(--color-x-warning-light)]' },
  'risk.update':     { icon: AlertTriangle, cls: 'text-[var(--color-x-text-secondary)] bg-[var(--color-x-bg)]' },
  'risk.delete':     { icon: AlertTriangle, cls: 'text-[var(--color-x-text-secondary)] bg-[var(--color-x-bg)]' },
  'teams.alert_sent':{ icon: Send,          cls: 'text-[var(--color-x-accent)] bg-[var(--color-x-accent-light)]' },
};

const VERBS: Record<string, string> = {
  'project.create': 'created',
  'project.update': 'updated',
  'project.archive': 'archived',
  'project.restore': 'restored',
  'project.delete': 'deleted',
  'project.split': 'split',
  'risk.create': 'raised a risk on',
  'risk.update': 'updated a risk on',
  'risk.delete': 'archived a risk on',
};

function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function ActivityFeed() {
  const { isDemoMode } = useAuth();
  const [events, setEvents] = useState<FeedEvent[] | null>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    // Demo mode never calls the (authenticated) audit API — it would 401.
    // Show a believable sample activity trail instead.
    if (isDemoMode) { setEvents(DEMO_ACTIVITY); return; }
    (async () => {
      try {
        const res = await authedFetch('/api/activity?limit=12');
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
        setConfigured(j.configured !== false);
        setEvents(j.events ?? []);
      } catch (e) {
        console.error('[activity]', e);
        setEvents([]);
      }
    })();
  }, [isDemoMode]);

  return (
    <div className="x-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-[var(--color-x-text-muted)]" />
        <h3 className="text-[13px] font-semibold text-[var(--color-x-text)]">Recent Activity</h3>
        <span className="ml-auto text-[10.5px] text-[var(--color-x-text-muted)]">from the audit trail · alerts marked when sent to Teams</span>
      </div>

      {events === null ? (
        <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="x-skeleton h-9" />)}</div>
      ) : !configured ? (
        <p className="text-[12px] text-[var(--color-x-text-muted)] py-4 text-center">
          The audit trail isn’t enabled yet — an admin needs to run <code className="font-mono">supabase/migrations/0002_audit_log.sql</code> once.
        </p>
      ) : events.length === 0 ? (
        <p className="text-[12px] text-[var(--color-x-text-muted)] py-4 text-center">
          Nothing yet. Project and risk changes — and alerts sent to your Teams channel — will appear here as they happen.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1">
          {events.map(e => {
            const meta = ICONS[e.action] || ICONS['project.update'];
            const Icon = meta.icon;
            return (
              <div key={e.id} className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-md hover:bg-[var(--color-x-bg)] transition-colors min-w-0">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <p className="text-[12px] text-[var(--color-x-text-secondary)] truncate flex-1 min-w-0">
                  {e.action === 'teams.alert_sent' ? (
                    <>
                      <span className="font-medium text-[var(--color-x-text)]">Teams alert</span>
                      {' — '}{e.alertTitle || 'notification'}{e.entityName ? <>: <span className="font-medium text-[var(--color-x-text)]">{e.entityName}</span></> : null}
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-[var(--color-x-text)]">{e.actor || 'Someone'}</span>
                      {' '}{VERBS[e.action] || 'changed'}{' '}
                      <span className="font-medium text-[var(--color-x-text)]">{e.entityName || e.entityId}</span>
                    </>
                  )}
                </p>
                <span className="text-[10.5px] text-[var(--color-x-text-faint)] flex-shrink-0 tabular-nums">{relTime(e.at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
