'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

// ============================================================
// Toasts + Confirm dialog — replaces native alert() / confirm()
// ============================================================

type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'default';
}
interface PendingConfirm extends ConfirmOptions { resolve: (ok: boolean) => void; }

interface UIContextValue {
  toast: (message: string, type?: ToastType) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextValue | null>(null);

const TOAST_ICON = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const TOAST_ACCENT = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-indigo-500',
};
const TOAST_ICON_COLOR = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-indigo-500',
};

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => setPending({ ...opts, resolve }));
  }, []);

  const settle = useCallback((ok: boolean) => {
    setPending(p => { p?.resolve(ok); return null; });
  }, []);

  // Escape / Enter on the confirm dialog.
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false);
      if (e.key === 'Enter') settle(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, settle]);

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map(t => {
          const Icon = TOAST_ICON[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-2.5 bg-[var(--color-x-surface)] border border-[var(--color-x-border)] border-l-[3px] ${TOAST_ACCENT[t.type]} rounded-lg shadow-lg px-3.5 py-3 animate-slide-in-right`}
            >
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${TOAST_ICON_COLOR[t.type]}`} />
              <p className="text-meta text-[var(--color-x-text)] flex-1 leading-snug">{t.message}</p>
              <button
                onClick={() => setToasts(x => x.filter(z => z.id !== t.id))}
                className="text-[var(--color-x-text-faint)] hover:text-[var(--color-x-text)] transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {pending && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => settle(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={pending.title}
            className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                {pending.tone === 'danger' && (
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-h3 font-bold text-[var(--color-x-text)]">{pending.title}</h2>
                  {pending.message && (
                    <p className="text-meta text-[var(--color-x-text-muted)] mt-1 leading-relaxed whitespace-pre-line">{pending.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-[var(--color-x-bg)] border-t border-[var(--color-x-border)] flex justify-end gap-2">
              <button onClick={() => settle(false)} className="x-btn x-btn-secondary">
                {pending.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => settle(true)}
                autoFocus
                className={`x-btn ${pending.tone === 'danger' ? 'x-btn-danger' : 'x-btn-primary'}`}
              >
                {pending.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within <UIProvider>');
  return ctx;
}

/** toast('Saved', 'success') */
export const useToast = () => useUI().toast;
/** if (await confirm({ title, tone:'danger' })) { … } */
export const useConfirm = () => useUI().confirm;
