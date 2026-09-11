'use client';

import { type ReactNode } from 'react';

/**
 * The dashboard widget shell.
 *
 * Every module on the Command Center is one of these: a titled card with an
 * optional control in the header and a body that fills the remaining height.
 * A single shell is what makes a dense grid read as one product rather than as
 * a pile of unrelated boxes — the failure mode of the previous pass was not
 * that cards existed, it was that each one styled itself.
 */
export default function Widget({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClass = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`x-widget ${className}`}>
      <header className="x-widget-head">
        <div className="min-w-0">
          <h3 className="x-widget-title">{title}</h3>
          {subtitle && <p className="x-widget-sub">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-1 flex-none">{action}</div>}
      </header>
      <div className={`x-widget-body ${bodyClass}`}>{children}</div>
    </section>
  );
}
