'use client';

import { useState } from 'react';
import { Clock, Plus } from 'lucide-react';

/** "15 Jun 2026, 02:30 PM" — date + time stamp shown on every note entry. */
export function formatNoteStamp(d = new Date()) {
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/** Prepend a new timestamped entry to the notes log (newest first). */
export function prependNote(existing: string, text: string) {
  const entry = `[${formatNoteStamp()}] ${text.trim()}`;
  return existing && existing.trim() ? `${entry}\n${existing}` : entry;
}

/**
 * Timestamped, append-only notes log. The raw value stays a newline-separated
 * string (one entry per line, each prefixed with "[stamp]"), so it persists in the
 * existing `notes` column with no schema change. Adding a note stamps it with the
 * current date/time so you can always see what was last updated and when.
 */
export default function NotesLog({
  value,
  onAdd,
  readOnly = false,
  inputClassName = '',
  buttonClassName = '',
}: {
  value: string;
  onAdd: (next: string) => void;
  readOnly?: boolean;
  inputClassName?: string;
  buttonClassName?: string;
}) {
  const [draft, setDraft] = useState('');
  const entries = (value || '').split('\n').map(s => s.trim()).filter(Boolean);

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onAdd(prependNote(value || '', t));
    setDraft('');
  };

  return (
    <div>
      {!readOnly && (
        <div className="flex gap-2 mb-2.5">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Add a note…"
            className={inputClassName || 'flex-1 px-3 py-2 rounded-lg text-[13px] border border-[#e2e8f0] outline-none focus:border-[#e86c2d]'}
          />
          <button
            type="button"
            onClick={add}
            className={buttonClassName || 'flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#e86c2d] whitespace-nowrap'}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      )}
      {entries.length === 0 ? (
        <p className="text-[12px] text-[#94a3b8]">No notes yet.</p>
      ) : (
        <ul className="space-y-2 max-h-44 overflow-y-auto pr-1">
          {entries.map((e, i) => {
            const m = e.match(/^\[(.+?)\]\s*([\s\S]*)$/);
            return (
              <li key={i} className="text-[12.5px] text-[#475569] leading-snug border-l-2 border-[#f1d9c9] pl-2.5">
                {m ? (
                  <>
                    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[#94a3b8] mb-0.5">
                      <Clock className="w-3 h-3" /> {m[1]}
                    </span>
                    {m[2]}
                  </>
                ) : e}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
