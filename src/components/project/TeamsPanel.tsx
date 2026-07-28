'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Plus, Trash2, ExternalLink, X } from 'lucide-react';
import { authedFetch } from '@/lib/supabase';
import { toast } from '@/components/ui/Toaster';
import { formatDate } from '@/lib/utils';

/**
 * Teams tab (Phase 3a) — MS Teams conversations linked to this project.
 * v1 stores deep links only ("Open in Teams"); live inline threads arrive in
 * Phase 3b once the Azure AD app registration + Graph admin consent exist.
 */

type TeamsLink = {
  id: string;
  project_code: string;
  task_id: string | null;
  title: string;
  deep_link_url: string;
  created_by_name: string;
  created_at: string;
};

export default function TeamsPanel({ projectCode, canEdit }: { projectCode: string; canEdit: boolean }) {
  const [links, setLinks] = useState<TeamsLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/teams-links?project=${encodeURIComponent(projectCode)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setConfigured(j.configured !== false);
      setLinks(j.links ?? []);
    } catch (e) {
      console.error('[teams-links]', e);
    } finally {
      setLoading(false);
    }
  }, [projectCode]);

  useEffect(() => { reload(); }, [reload]);

  const add = async () => {
    if (!title.trim() || !url.trim()) { toast({ kind: 'error', text: 'Give the conversation a name and paste its Teams link.' }); return; }
    setSaving(true);
    try {
      const res = await authedFetch('/api/teams-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', projectCode, title, url }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      toast({ kind: 'success', text: 'Teams conversation linked' });
      setAdding(false); setTitle(''); setUrl('');
      reload();
    } catch (e) {
      toast({ kind: 'error', text: e instanceof Error ? e.message : 'Could not link the conversation.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (link: TeamsLink) => {
    if (!confirm(`Unlink "${link.title}"? (The Teams conversation itself is untouched.)`)) return;
    try {
      const res = await authedFetch('/api/teams-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: link.id }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({} as { error?: string })); throw new Error(j.error || `HTTP ${res.status}`); }
      toast({ kind: 'info', text: 'Conversation unlinked' });
      reload();
    } catch (e) {
      toast({ kind: 'error', text: e instanceof Error ? e.message : 'Could not unlink.' });
    }
  };

  if (loading) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[0, 1].map(i => <div key={i} className="x-skeleton h-24" />)}</div>;
  }

  if (!configured) {
    return (
      <div className="x-card p-8 text-center">
        <MessageSquare className="w-8 h-8 mx-auto text-[var(--color-x-text-faint)] mb-3" />
        <p className="text-[14px] font-bold text-[var(--color-x-text)]">Teams linking isn’t set up yet</p>
        <p className="text-[12.5px] text-[var(--color-x-text-muted)] mt-1 max-w-md mx-auto">
          An admin needs to run <span className="font-mono">supabase/migrations/0007_teams_links.sql</span> in the Supabase SQL Editor once.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[12px] text-[var(--color-x-text-muted)]">
          Keep the project’s Microsoft Teams conversations one click away. In Teams: open the chat or channel post → <b>⋯ → Copy link</b>, then paste it here.
        </p>
        {canEdit && (
          <button onClick={() => setAdding(true)} className="x-btn x-btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Link a conversation
          </button>
        )}
      </div>

      {adding && (
        <div className="x-card p-4 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <input autoFocus className="x-input" placeholder='Name it (e.g. "Design sync — weekly")' value={title} onChange={e => setTitle(e.target.value)} />
            <input className="x-input font-mono text-[12px]" placeholder="https://teams.microsoft.com/l/…" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setAdding(false)} className="x-btn text-[12px] px-3 py-1.5 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={add} disabled={saving} className="x-btn x-btn-primary text-[12px] px-3 py-1.5">{saving ? 'Linking…' : 'Link conversation'}</button>
          </div>
        </div>
      )}

      {links.length === 0 && !adding ? (
        <div className="x-card px-4 py-12 text-center">
          <MessageSquare className="w-8 h-8 mx-auto text-[var(--color-x-text-faint)] mb-3" />
          <p className="text-[13px] font-semibold text-[var(--color-x-text)]">No Teams conversations linked yet</p>
          <p className="text-[12px] text-[var(--color-x-text-muted)] mt-1 max-w-sm mx-auto">
            Link the chat or channel where this project is discussed, and everyone lands in the right thread instantly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {links.map(l => (
            <div key={l.id} className="x-card p-4 flex items-start gap-3 group">
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4.5 h-4.5 w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--color-x-text)] truncate">{l.title}</p>
                <p className="text-[11px] text-[var(--color-x-text-muted)]">
                  Linked by {l.created_by_name || 'someone'} · {formatDate(l.created_at)}
                </p>
                <a
                  href={l.deep_link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11.5px] font-semibold hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Open in Teams
                </a>
              </div>
              {canEdit && (
                <button onClick={() => remove(l)} title="Unlink"
                  className="p-1.5 rounded-md text-[var(--color-x-text-faint)] hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[var(--color-x-text-faint)]">
        Coming in Phase 3b (needs your IT admin’s Microsoft approval): the conversation itself, displayed inline right here.
      </p>
    </div>
  );
}
