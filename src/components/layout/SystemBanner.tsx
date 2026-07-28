'use client';

import { useState } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { useData } from '@/lib/data-context';

/**
 * Slim system-status banner — the enterprise pattern for degraded state.
 * Sits under the topbar, full width, one line; never a red pill screaming
 * inside a page header. Renders nothing while data is live or loading.
 */
export default function SystemBanner() {
  const { liveStatus } = useData();
  const [dismissed, setDismissed] = useState(false);

  if (liveStatus !== 'error' || dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2.5 px-4 h-9 text-[12px] font-medium border-b
                 bg-[var(--color-x-danger-light)] border-[color-mix(in_srgb,var(--color-x-danger)_25%,transparent)] text-[var(--color-x-danger)]"
    >
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">
        You&rsquo;re viewing an offline copy — the last live refresh failed. Data may be outdated.
      </span>
      <button
        onClick={() => window.location.reload()}
        className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded border border-current/30 hover:bg-white/40 transition-colors flex-shrink-0"
      >
        <RefreshCw className="w-3 h-3" /> Retry
      </button>
      <button onClick={() => setDismissed(true)} title="Dismiss" className="p-1 rounded hover:bg-white/40 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
