import { useEffect, useRef } from 'react';

/**
 * Accessibility behaviour for modal dialogs, designed to retrofit existing
 * modals without restructuring their JSX:
 *   • Escape closes the dialog
 *   • focus moves to the first focusable element on open
 *   • Tab is trapped inside the dialog
 *   • body scroll is locked while open
 *   • focus is restored to the trigger on close
 *
 * Usage:
 *   const ref = useModalA11y<HTMLDivElement>(isOpen, onClose);
 *   <div ref={ref} role="dialog" aria-modal="true" aria-label="…"> … </div>
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter(el => el.offsetParent !== null);

    // Focus the first interactive element (a field if present, else a button).
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}
