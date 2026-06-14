'use client';

import { Plane, ShoppingBag, ShoppingCart, Settings2, type LucideIcon } from 'lucide-react';
import { useApp, HEALTH_COLOR, type Domain } from '@/context/AppContext';

const ICONS: Record<Domain, LucideIcon> = {
  runway: Plane,
  retail: ShoppingBag,
  dutyfree: ShoppingCart,
  operations: Settings2,
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 96, h = 30, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  const id = `spark-${color.replace('#', '')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.6} fill={color} />
    </svg>
  );
}

export default function StatsHeader() {
  const { domains, activeDomain, toggleDomain, getDomainHealth, getDomainScore, getOpenTaskCount } = useApp();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {domains.map(d => {
        const Icon = ICONS[d.key];
        const health = getDomainHealth(d.key);
        const score = getDomainScore(d.key);
        const open = getOpenTaskCount(d.key);
        const active = activeDomain === d.key;
        const healthColor = HEALTH_COLOR[health];
        return (
          <button
            key={d.key}
            onClick={() => toggleDomain(d.key)}
            className="text-left rounded-2xl p-4 transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${active ? d.color : '#e8edf3'}`,
              boxShadow: active ? `0 12px 30px -12px ${d.color}66` : '0 1px 2px rgba(15,23,42,0.04)',
              outline: active ? `1px solid ${d.color}` : 'none',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: d.soft }}>
                  <Icon className="w-[18px] h-[18px]" style={{ color: d.color }} />
                </div>
                <div>
                  <p className="text-[12.5px] font-bold text-[#1e293b] leading-tight">{d.short}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: healthColor }} />
                    <span className="text-[10.5px] font-medium" style={{ color: healthColor }}>
                      {health === 'healthy' ? 'All clear' : health === 'progress' ? 'In progress' : 'Delayed'}
                    </span>
                  </div>
                </div>
              </div>
              <Sparkline data={d.trend} color={d.color} />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[26px] font-extrabold leading-none" style={{ color: '#0f172a' }}>{score}<span className="text-[14px] text-[#94a3b8] font-bold">%</span></p>
                <p className="text-[10.5px] text-[#94a3b8] font-medium mt-1">Health score</p>
              </div>
              <div className="text-right">
                <p className="text-[18px] font-bold leading-none text-[#334155]">{open}</p>
                <p className="text-[10.5px] text-[#94a3b8] font-medium mt-1">Open tasks</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
