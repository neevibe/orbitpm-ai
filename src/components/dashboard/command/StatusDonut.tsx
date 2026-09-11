'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
  onSelect?: () => void;
  selected?: boolean;
}

/**
 * Open-vs-closed status donut with a centre total — the signature widget of an
 * enterprise PM dashboard, and the shape executives already know how to read.
 *
 * The centre carries the headline figure so the ring never has to be decoded to
 * get the number, and every slice is direct-labelled with its count and share
 * in the legend beneath, so colour is never the only carrier of meaning.
 */
export default function StatusDonut({
  slices,
  centreValue,
  centreLabel,
}: {
  slices: DonutSlice[];
  centreValue: string | number;
  centreLabel: string;
}) {
  const data = slices.filter(s => s.value > 0);
  const total = slices.reduce((a, s) => a + s.value, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 min-h-[132px]">
        {total === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[12px] text-[var(--color-x-text-muted)]">No data in this view</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius="66%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="var(--color-x-surface)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {data.map(s => (
                    <Cell
                      key={s.name}
                      fill={s.color}
                      cursor={s.onSelect ? 'pointer' : 'default'}
                      opacity={slices.some(x => x.selected) && !s.selected ? 0.3 : 1}
                      onClick={s.onSelect}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="x-donut-value">{centreValue}</span>
              <span className="x-donut-label">{centreLabel}</span>
            </div>
          </>
        )}
      </div>

      <ul className="x-legend">
        {slices.map(s => (
          <li key={s.name}>
            <button
              type="button"
              onClick={s.onSelect}
              disabled={!s.onSelect}
              aria-pressed={!!s.selected}
              className="x-legend-item"
            >
              <span className="x-legend-sw" style={{ background: s.color }} aria-hidden="true" />
              <span className="x-legend-name">{s.name}</span>
              <span className="x-legend-num">{s.value}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
