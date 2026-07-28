'use client';

import { useEffect, useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { authedFetch } from '@/lib/supabase';
import { BIAL_EMPLOYEES } from '@/lib/employee-data';

/**
 * Microsoft Teams collaboration primitives for data views.
 *
 * - usePresence(names): resolves owner names → work emails (exact roster
 *   match) and fetches live Teams presence via /api/integrations/presence.
 *   Renders nothing when the viewer hasn't connected Microsoft — dots only
 *   appear when they're real.
 * - <OwnerAvatar>: initial avatar + presence dot.
 * - <ShareToTeamsButton>: opens the Microsoft Teams share composer with a
 *   link to the entity — works for any signed-in Teams user, no OAuth needed.
 */

export type PresenceMap = Record<string, { status: string; label: string }>;

export function emailForName(name: string): string {
  const n = (name || '').trim().toLowerCase();
  if (!n) return '';
  return BIAL_EMPLOYEES.find(e => e.name.trim().toLowerCase() === n)?.email || '';
}

export function usePresence(names: string[]): { presence: PresenceMap; live: boolean } {
  const [presence, setPresence] = useState<PresenceMap>({});
  const [live, setLive] = useState(false);

  const emails = useMemo(
    () => Array.from(new Set(names.map(emailForName).filter(Boolean))).sort(),
    [names]
  );
  const key = emails.join(',');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch('/api/integrations/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: key.split(',') }),
        });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled && j.available) { setPresence(j.presence || {}); setLive(true); }
      } catch { /* presence is best-effort decoration */ }
    })();
    return () => { cancelled = true; };
  }, [key]);

  return { presence, live };
}

const DOT: Record<string, string> = {
  available: 'bg-[#59a14f]',
  busy: 'bg-[#d1615d]',
  away: 'bg-[#e8a838]',
  offline: 'bg-slate-300',
};

export function OwnerAvatar({ name, presence }: { name: string; presence?: { status: string; label: string } }) {
  const initials = (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
  return (
    <span className="relative inline-flex flex-shrink-0" title={presence ? `${name} — ${presence.label} in Teams` : name}>
      <span className="w-6 h-6 rounded-full bg-[var(--color-x-accent-light)] text-[var(--color-x-accent)] text-[9.5px] font-bold flex items-center justify-center border border-[var(--color-x-accent-muted)]">
        {initials}
      </span>
      {presence && (
        <span className={`absolute -bottom-px -right-px w-2 h-2 rounded-full ring-2 ring-[var(--color-x-surface)] ${DOT[presence.status] || DOT.offline}`} />
      )}
    </span>
  );
}

export function ShareToTeamsButton({ url, text, compact }: { url: string; text: string; compact?: boolean }) {
  const share = (e: React.MouseEvent) => {
    e.stopPropagation();
    const href = `https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&msgText=${encodeURIComponent(text)}`;
    window.open(href, '_blank', 'noopener,noreferrer,width=700,height=600');
  };
  if (compact) {
    return (
      <button
        onClick={share}
        title="Share to Microsoft Teams"
        className="p-1.5 rounded-md text-[var(--color-x-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-x-accent)] hover:bg-[var(--color-x-accent-light)] transition-all"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>
    );
  }
  return (
    <button onClick={share} className="x-btn x-btn-secondary text-[12px] px-3 py-1.5 flex items-center gap-1.5">
      <Share2 className="w-3.5 h-3.5" /> Share to Teams
    </button>
  );
}
