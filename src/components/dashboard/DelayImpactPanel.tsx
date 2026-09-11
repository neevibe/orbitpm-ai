'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, TrendingDown, Minus, IndianRupee, Info } from 'lucide-react';
import type { Project } from '@/lib/mock-data';
import { monthOverMonthDelays, delayRevenueImpact } from '@/lib/delay-analytics';
import { formatINRCompact, formatDate, plural } from '@/lib/utils';
import { STATUS_COLORS, AXIS_TICK, BAR, TRACK } from '@/lib/chart-theme';

/**
 * Delay movement (last month vs this month) and the revenue impact of the
 * projects currently delayed.
 *
 * Both halves are derived, not measured — the register keeps no status history
 * and revenue is an optional input — so every number here is shown next to its
 * basis and its coverage. The panel is deliberately loud about what it does NOT
 * know: an impact figure covering 3 of 24 delayed projects is worse than no
 * figure if it is presented as the whole number.
 */
export default function DelayImpactPanel({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [showBasis, setShowBasis] = useState(false);

  const mom = useMemo(() => monthOverMonthDelays(projects), [projects]);
  const impact = useMemo(() => delayRevenueImpact(projects), [projects]);

  const chartData = [
    { name: mom.previous.label, period: 'Previous month', delayed: mom.previous.delayed, pct: mom.previous.delayedPct, fill: '#94a3b8' },
    { name: mom.current.label, period: 'This month', delayed: mom.current.delayed, pct: mom.current.delayedPct, fill: STATUS_COLORS['Delayed'] },
  ];

  const TrendIcon = mom.delta > 0 ? TrendingUp : mom.delta < 0 ? TrendingDown : Minus;
  const trendTone = mom.delta > 0 ? 'text-[#b91c1c]' : mom.delta < 0 ? 'text-[#15803d]' : 'text-[#64748b]';

  // Recovery is only observable for projects closed since completedAt started
  // being stamped. Until some exist, "recovered: 0" means "not measurable",
  // not "nothing recovered" — and the trend can therefore only ever rise.
  const recoveryMeasurable = useMemo(() => projects.some(p => p.completedAt), [projects]);

  const topImpact = impact.perProject.filter(r => r.quantified).slice(0, 5);
  const worstSlips = impact.perProject.slice(0, 5);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {/* ── Month-over-month delay comparison ───────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-[12px] font-semibold text-[#334155]">Delayed Projects — Last Month vs This Month</h3>
            <p className="text-[10px] text-[#94a3b8] mt-0.5">
              Reconstructed from Target Dates · {mom.previous.label} measured at close ({formatDate(mom.previous.asOf)}) · {mom.current.label} month-to-date
            </p>
          </div>
          <div className={`flex items-center gap-1 text-[13px] font-bold ${trendTone} tabular-nums shrink-0`}>
            <TrendIcon className="w-4 h-4" />
            {mom.delta > 0 ? '+' : ''}{mom.delta}
            {mom.deltaPct !== null && <span className="text-[10px] font-medium">({mom.deltaPct > 0 ? '+' : ''}{mom.deltaPct}%)</span>}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={168}>
          <BarChart data={chartData} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} />
            <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: TRACK, fillOpacity: 0.4 }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-[#0f172a] text-[#f8fafc] rounded-md px-3 py-2 text-[12px] shadow-lg">
                    <p className="text-[11px] text-[#cbd5e1] font-semibold mb-0.5">{d.period} · {d.name}</p>
                    <p>{plural(d.delayed, 'delayed project')}</p>
                    <p className="text-[11px] text-[#cbd5e1]">{d.pct}% of projects with a deadline</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="delayed" barSize={BAR.size * 2} radius={BAR.radius}>
              {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              <LabelList dataKey="delayed" position="top" style={{ fontSize: 12, fontWeight: 700, fill: '#334155' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Movement breakdown — the delta is only useful if you can see what moved */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-md border border-[#f1e0de] bg-[#faeceb] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[#b91c1c] font-semibold">Newly delayed</p>
            <p className="text-[16px] font-bold text-[#b91c1c] tabular-nums">{mom.newlyDelayed.length}</p>
          </div>
          <div className={`rounded-md border px-3 py-2 ${recoveryMeasurable ? 'border-[#dcebe2] bg-[#e9f4ee]' : 'border-[#e2e8f0] bg-[#f8fafc]'}`}>
            <p className={`text-[10px] uppercase tracking-wider font-semibold ${recoveryMeasurable ? 'text-[#15803d]' : 'text-[#94a3b8]'}`}>Recovered / closed</p>
            <p className={`text-[16px] font-bold tabular-nums ${recoveryMeasurable ? 'text-[#15803d]' : 'text-[#94a3b8]'}`}>
              {recoveryMeasurable ? mom.recovered.length : 'n/a'}
            </p>
          </div>
        </div>
        {!recoveryMeasurable && (
          <p className="mt-1.5 text-[10px] text-[#b45309] leading-relaxed">
            No project in this register carries a completion date, so recovery cannot be measured yet and this
            comparison can only rise. Completion dates are recorded from now on — next month&rsquo;s figure will
            net out projects that finish late.
          </p>
        )}

        {/* Department table — where the movement actually happened */}
        {mom.byDepartment.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#94a3b8] border-b border-[#f1f5f9]">
                  <th className="text-left font-semibold py-1.5">Department</th>
                  <th className="text-center font-semibold py-1.5">{mom.previous.label}</th>
                  <th className="text-center font-semibold py-1.5">{mom.current.label}</th>
                  <th className="text-center font-semibold py-1.5">Change</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {mom.byDepartment.map(r => (
                  <tr key={r.department} className="border-b border-[#f8fafc] last:border-0">
                    <td className="py-1.5 text-[#334155]">{r.department}</td>
                    <td className="py-1.5 text-center text-[#64748b]">{r.previous}</td>
                    <td className="py-1.5 text-center font-semibold text-[#1e293b]">{r.current}</td>
                    <td className={`py-1.5 text-center font-semibold ${r.delta > 0 ? 'text-[#b91c1c]' : r.delta < 0 ? 'text-[#15803d]' : 'text-[#cbd5e1]'}`}>
                      {r.delta > 0 ? `+${r.delta}` : r.delta}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-[#e2e8f0] font-bold text-[#1e293b]">
                  <td className="py-1.5">Total</td>
                  <td className="py-1.5 text-center">{mom.previous.delayed}</td>
                  <td className="py-1.5 text-center">{mom.current.delayed}</td>
                  <td className={`py-1.5 text-center ${trendTone}`}>{mom.delta > 0 ? `+${mom.delta}` : mom.delta}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Revenue impact of delay ─────────────────────────────────────── */}
      <div className="glass-card p-4 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-[#334155]">
              <IndianRupee className="w-3.5 h-3.5" /> Revenue Impact of Current Delays
            </h3>
            <p className="text-[10px] text-[#94a3b8] mt-0.5">
              Straight-line accrual on {plural(impact.perProject.length, 'delayed project')}
            </p>
          </div>
          <button
            onClick={() => setShowBasis(v => !v)}
            className="flex items-center gap-1 text-[10px] text-[#64748b] hover:text-[#1e40af] shrink-0"
          >
            <Info className="w-3 h-3" /> Basis
          </button>
        </div>

        {showBasis && (
          <div className="mb-3 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-[10.5px] text-[#475569] leading-relaxed">
            <p><strong>Revenue deferred</strong> = (Expected Annual Revenue ÷ 365) × days past Target Date. Revenue the project has not produced because it has not shipped.</p>
            <p className="mt-1"><strong>Carrying cost</strong> = (Utilized Budget ÷ days since Start Date) × days past Target Date. The project&rsquo;s own observed burn rate, extended over the overrun — no assumed overhead rate.</p>
            <p className="mt-1">Projects with neither input contribute <strong>nothing</strong> to the total; they are listed below as unquantified rather than counted as zero.</p>
          </div>
        )}

        {impact.quantified.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center rounded-md border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-8">
            <p className="text-[13px] font-semibold text-[#334155]">Not quantifiable yet</p>
            <p className="text-[11px] text-[#64748b] mt-1 max-w-sm">
              None of the {plural(impact.perProject.length, 'delayed project')} carries an Expected Annual Revenue or a
              recorded spend, so there is no basis for a rupee figure. Add
              <strong> Expected Annual Revenue</strong> on a project to switch this on.
            </p>
            <button
              onClick={() => router.push('/projects?stuck=true')}
              className="mt-3 text-[11px] font-semibold text-[#1e40af] hover:underline"
            >
              Review the {impact.perProject.length} delayed projects →
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border border-[#e2e8f0] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-semibold">Revenue deferred</p>
                <p className="text-[16px] font-bold text-[#b91c1c] tabular-nums">{formatINRCompact(impact.totalRevenueDeferred)}</p>
              </div>
              <div className="rounded-md border border-[#e2e8f0] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-semibold">Carrying cost</p>
                <p className="text-[16px] font-bold text-[#b45309] tabular-nums">{formatINRCompact(impact.totalCarryingCost)}</p>
              </div>
              <div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-semibold">Total impact</p>
                <p className="text-[16px] font-bold text-[#0f172a] tabular-nums">{formatINRCompact(impact.totalImpact)}</p>
              </div>
            </div>

            {/* Coverage — the trust score for the number above */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[#e7ecf3] overflow-hidden">
                <div className="h-full bg-[#1e40af] rounded-full" style={{ width: `${impact.coveragePct}%` }} />
              </div>
              <span className="text-[10px] text-[#64748b] tabular-nums shrink-0">
                Based on {impact.quantified.length} of {impact.perProject.length} delayed projects ({impact.coveragePct}%)
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#94a3b8] border-b border-[#f1f5f9]">
                    <th className="text-left font-semibold py-1.5">Project</th>
                    <th className="text-right font-semibold py-1.5">Days late</th>
                    <th className="text-right font-semibold py-1.5">Deferred</th>
                    <th className="text-right font-semibold py-1.5">Carrying</th>
                    <th className="text-right font-semibold py-1.5">Impact</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {topImpact.map(r => (
                    <tr
                      key={r.project.id}
                      onClick={() => router.push(`/projects/${r.project.id}`)}
                      className="border-b border-[#f8fafc] last:border-0 cursor-pointer hover:bg-[#f8fafc]"
                    >
                      <td className="py-1.5 text-[#334155] max-w-[180px] truncate" title={r.project.name}>{r.project.name}</td>
                      <td className="py-1.5 text-right text-[#b91c1c] font-semibold">{r.daysDelayed}</td>
                      <td className="py-1.5 text-right text-[#64748b]">{r.revenueDeferred != null ? formatINRCompact(r.revenueDeferred) : '—'}</td>
                      <td className="py-1.5 text-right text-[#64748b]">{r.carryingCost != null ? formatINRCompact(r.carryingCost) : '—'}</td>
                      <td className="py-1.5 text-right font-semibold text-[#0f172a]">{formatINRCompact(r.totalImpact)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* The gap list — named, not hidden */}
        {impact.unquantified.length > 0 && (
          <div className="mt-3 rounded-md border border-[#f0e4cf] bg-[#fbf3e4] px-3 py-2">
            <p className="text-[10.5px] font-semibold text-[#b45309]">
              {plural(impact.unquantified.length, 'delayed project')} cannot be costed
            </p>
            <p className="text-[10px] text-[#92400e] mt-0.5 leading-relaxed">
              Longest-running: {worstSlips.filter(r => !r.quantified).slice(0, 3).map(r => `${r.project.name.split('\n')[0].trim()} (${r.daysDelayed}d)`).join(' · ') || '—'}.
              Add Expected Annual Revenue to each to bring them into the total.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
