import type { ComponentType, ReactNode } from 'react';

/**
 * Consistent empty state across pages (replaces the ad-hoc per-page markup).
 */
export function EmptyState({ icon: Icon, title, description, action }: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-[var(--color-x-bg)] border border-[var(--color-x-border)] flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-[var(--color-x-text-faint)]" />
        </div>
      )}
      <p className="text-h3 font-bold text-[var(--color-x-text)]">{title}</p>
      {description && <p className="text-meta text-[var(--color-x-text-muted)] mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
