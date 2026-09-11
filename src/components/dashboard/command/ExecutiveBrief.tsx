'use client';

import { ArrowRight, ShieldAlert } from 'lucide-react';
import type { Project } from '@/lib/mock-data';
import { plural } from '@/lib/utils';

export interface BriefAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface BriefInput {
  /** Ranked signals, most severe first. */
  signals: {
    severity: 'critical' | 'warning' | 'info';
    title: string;
    detail: string;
    count: number;
    onView?: () => void;
  }[];
  /** Projects driving the top signal, already ranked. */
  topProjects: Project[];
  actions: BriefAction[];
}

/**
 * The executive briefing.
 *
 * The previous "AI Recommendations" panel was a stack of four tinted cards of
 * equal weight, which is a notification list wearing an AI label: it told you
 * five things were wrong and ranked none of them. This states ONE lead
 * judgement in a sentence, shows the evidence behind it, names the projects
 * driving it, and offers the action — the order a person actually reads in.
 *
 * Everything here is derived from live register data. No score, confidence or
 * projection is invented; if there is nothing to report it says so plainly
 * rather than manufacturing an insight.
 */
export default function ExecutiveBrief({ signals, topProjects, actions }: BriefInput) {
  const lead = signals[0];

  if (!lead) {
    return (
      <div className="x-brief">
        <p className="x-brief-lead">Nothing requires your attention.</p>
        <p className="x-brief-body">
          No project is past its deadline, no high-impact risk is open, and no owner is over capacity.
        </p>
      </div>
    );
  }

  const tone =
    lead.severity === 'critical' ? 'var(--color-x-danger)'
    : lead.severity === 'warning' ? 'var(--color-x-warning)'
    : 'var(--color-x-text-muted)';

  return (
    <section className="x-brief" aria-labelledby="brief-lead">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-[18px] h-[18px] mt-[3px] flex-none" style={{ color: tone }} aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="brief-lead" className="x-brief-lead">{lead.title}</h2>
          <p className="x-brief-body mt-1.5">{lead.detail}</p>
        </div>
      </div>

      {/* Supporting signals — evidence for the lead, not four more headlines. */}
      {signals.length > 1 && (
        <div className="x-facts">
          {signals.slice(1, 4).map(s => (
            <button
              key={s.title}
              onClick={s.onView}
              disabled={!s.onView}
              className="text-left disabled:cursor-default group min-w-0"
            >
              <span className="x-fact-label block">{s.title}</span>
              <span
                className="x-fact-value group-hover:underline underline-offset-4 decoration-1"
                style={{ color: s.severity === 'critical' ? 'var(--color-x-danger)' : undefined }}
              >
                {s.count}
              </span>
              <span className="block text-[11.5px] text-[var(--color-x-text-muted)] mt-0.5">{s.detail}</span>
            </button>
          ))}
        </div>
      )}

      {/* The specific projects behind the lead judgement. */}
      {topProjects.length > 0 && (
        <div>
          <p className="x-fact-label mb-2">Driving this — {plural(topProjects.length, 'project')}</p>
          <ul className="flex flex-col">
            {topProjects.map((p, i) => (
              <li
                key={p.id}
                className="flex items-baseline gap-3 py-1.5 min-w-0"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-x-border)' }}
              >
                <span className="font-mono text-[11px] text-[var(--color-x-text-muted)] flex-none w-[104px] truncate">{p.id}</span>
                <span className="text-[13px] text-[var(--color-x-text)] truncate flex-1 min-w-0">
                  {p.name.replace(/\s+/g, ' ').trim()}
                </span>
                <span className="text-[12px] text-[var(--color-x-text-muted)] flex-none hidden sm:block truncate max-w-[140px]">{p.owner}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions.length > 0 && (
        <div className="x-brief-actions">
          {actions.map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`x-btn ${a.primary ? 'x-btn-primary' : 'x-btn-secondary'} text-[12px] px-3 py-1.5 inline-flex items-center gap-1.5`}
            >
              {a.label}
              {a.primary && <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
