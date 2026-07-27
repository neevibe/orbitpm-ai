'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Non-blocking toast notifications (bottom-right, auto-dismiss).
 *
 * Fire from anywhere — components, context providers, plain modules — via the
 * `toast()` helper; no React context plumbing needed:
 *
 *   toast({ kind: 'success', text: 'Project created' });
 *   toast({ kind: 'info', text: 'Project archived', undo: () => restore(id) });
 *   toast({ kind: 'success', text: 'Changes saved', key: 'save' });  // replaces, never stacks
 */

export type ToastDetail = {
  kind?: 'success' | 'error' | 'info';
  text: string;
  /** Toasts sharing a key replace each other instead of stacking (noisy saves). */
  key?: string;
  /** Renders an inline Undo button; dismisses the toast when clicked. */
  undo?: () => void;
};

export function toast(detail: ToastDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ToastDetail>('xyrenis:toast', { detail }));
  }
}

type ToastItem = ToastDetail & { id: number; leaving?: boolean };

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
  error: <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
};

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const dismiss = (id: number) => {
      const t = timers.current.get(id);
      if (t) { clearTimeout(t); timers.current.delete(id); }
      // play the leave animation, then drop
      setToasts(list => list.map(x => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => setToasts(list => list.filter(x => x.id !== id)), 240);
    };

    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail?.text) return;
      const id = nextId.current++;
      setToasts(list => {
        const filtered = detail.key ? list.filter(x => x.key !== detail.key) : list;
        return [...filtered.slice(-3), { ...detail, id }]; // max 4 visible
      });
      // destructive actions with Undo get longer to react
      const ttl = detail.undo ? 6000 : 3500;
      timers.current.set(id, setTimeout(() => dismiss(id), ttl));
    };

    window.addEventListener('xyrenis:toast', onToast);
    const timersAtMount = timers.current;
    return () => {
      window.removeEventListener('xyrenis:toast', onToast);
      timersAtMount.forEach(clearTimeout);
    };
  }, []);

  const close = (id: number) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    setToasts(list => list.map(x => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts(list => list.filter(x => x.id !== id)), 240);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="x-toast-viewport no-print" aria-live="polite" role="status">
      {toasts.map(t => (
        <div key={t.id} className={`x-toast ${t.leaving ? 'leaving' : ''}`}>
          {ICONS[t.kind || 'info']}
          <span className="flex-1 leading-snug">{t.text}</span>
          {t.undo && !t.leaving && (
            <button
              onClick={() => { t.undo?.(); close(t.id); }}
              className="text-[12px] font-bold text-indigo-600 hover:text-indigo-700 px-1.5 py-0.5 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              Undo
            </button>
          )}
          <button onClick={() => close(t.id)} aria-label="Dismiss notification" className="p-1 rounded-md text-[var(--color-x-text-faint)] hover:text-[var(--color-x-text-secondary)] hover:bg-black/5 transition-colors cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
