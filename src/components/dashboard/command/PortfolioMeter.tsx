'use client';

export interface MeterSegment {
  name: string;
  value: number;
  color: string;
  onSelect?: () => void;
  selected?: boolean;
}

/**
 * Portfolio composition as a single horizontal part-to-whole bar.
 *
 * This replaces the donut. A donut with five slices forces the reader to
 * compare arc lengths and then travel to a detached legend to find out what
 * each one is; at these proportions the three small slices are visually
 * indistinguishable. A stacked bar reads left-to-right in one pass, direct-
 * labels every segment with its actual count, costs a third of the vertical
 * space, and each key entry doubles as the filter control.
 *
 * Segments are separated by a 2px surface gap so adjacent categories stay
 * distinct without depending on hue contrast alone, and every value is written
 * out — colour is never the only carrier of meaning.
 */
export default function PortfolioMeter({ segments, total }: { segments: MeterSegment[]; total: number }) {
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1;

  if (total === 0) {
    return (
      <p className="text-[13px] text-[var(--color-x-text-muted)] py-4">
        No active projects in this view.
      </p>
    );
  }

  return (
    <div>
      <div
        className="x-meter"
        role="img"
        aria-label={segments.map(s => `${s.name}: ${s.value}`).join(', ')}
      >
        {segments.filter(s => s.value > 0).map(s => (
          <i key={s.name} style={{ flexBasis: `${(s.value / sum) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="x-meter-key">
        {segments.map(s => {
          const pct = Math.round((s.value / sum) * 100);
          const Tag = s.onSelect ? 'button' : 'div';
          return (
            <Tag
              key={s.name}
              {...(s.onSelect ? { onClick: s.onSelect, 'aria-pressed': !!s.selected, type: 'button' as const } : {})}
            >
              <span className="x-meter-sw" style={{ background: s.color }} aria-hidden="true" />
              <span className="x-meter-name">{s.name}</span>
              <span className="x-meter-num">{s.value}</span>
              <span className="text-[11px] text-[var(--color-x-text-faint)] tabular-nums">{pct}%</span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
