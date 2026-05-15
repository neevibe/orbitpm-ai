'use client';

import { Activity, Zap, TrendingUp, AlertTriangle, Brain, Users } from 'lucide-react';
import { useData } from '@/lib/data-context';
import React from 'react';

export default function AIInsightsPage() {
  const { projects, risks, departments, kpi } = useData();

  const insights = React.useMemo(() => {
    const result: { type: string; icon: any; title: string; desc: string; severity: string }[] = [];
    const stuckProjects = projects.filter(p => (p.priority === 'Critical' || p.priority === 'High') && p.status === 'In Progress' && p.progress === 0);
    if (stuckProjects.length > 0) {
      const topOwner = stuckProjects.reduce((acc, p) => { acc[p.owner] = (acc[p.owner] || 0) + 1; return acc; }, {} as Record<string, number>);
      const topOwnerName = Object.entries(topOwner).sort((a, b) => b[1] - a[1])[0];
      result.push({ type: 'critical', icon: AlertTriangle, title: `${stuckProjects.length} High-Priority Projects Stuck at 0%`, desc: `${topOwnerName?.[0] || 'Unknown'} is assigned to ${topOwnerName?.[1] || 0} of these. Resource reallocation recommended.`, severity: 'High' });
    }
    const delayed = projects.filter(p => p.status === 'Delayed');
    if (delayed.length > 0) { const depts = [...new Set(delayed.map(p => p.department))]; result.push({ type: 'warning', icon: TrendingUp, title: `${delayed.length} Project${delayed.length > 1 ? 's' : ''} Delayed`, desc: `Affected departments: ${depts.join(', ')}. Dependent projects may cascade.`, severity: 'Medium' }); }
    const notStartedPct = kpi.totalProjects > 0 ? Math.round((kpi.notStarted / kpi.totalProjects) * 100) : 0;
    if (notStartedPct > 50) { const topNotStarted = departments.filter(d => d.notStarted > 0).sort((a, b) => b.notStarted - a.notStarted).slice(0, 3); result.push({ type: 'insight', icon: Brain, title: 'Portfolio Imbalance Detected', desc: `${notStartedPct}% of projects (${kpi.notStarted}/${kpi.totalProjects}) are Not Started. Biggest backlogs: ${topNotStarted.map(d => `${d.name} (${d.notStarted})`).join(', ')}.`, severity: 'Medium' }); }
    const ownerCounts: Record<string, number> = {};
    projects.filter(p => p.status === 'In Progress').forEach(p => { ownerCounts[p.owner] = (ownerCounts[p.owner] || 0) + 1; });
    const overloaded = Object.entries(ownerCounts).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]);
    if (overloaded.length > 0) { result.push({ type: 'warning', icon: Users, title: 'Owner Workload Analysis', desc: `Overloaded: ${overloaded.slice(0, 3).map(([name, count]) => `${name} (${count})`).join(', ')}. Consider redistributing.`, severity: 'High' }); }
    const highRisks = risks.filter(r => r.impact === 'High' && r.status === 'Open');
    if (highRisks.length > 0) { result.push({ type: 'critical', icon: AlertTriangle, title: `${highRisks.length} High-Impact Risks Open`, desc: `Categories: ${[...new Set(highRisks.map(r => r.category))].join(', ')}. Immediate mitigation review required.`, severity: 'High' }); }
    const completed = projects.filter(p => p.status === 'Completed');
    const goodProgress = projects.filter(p => p.progress >= 50 && p.status === 'In Progress');
    if (completed.length > 0 || goodProgress.length > 0) { result.push({ type: 'success', icon: Zap, title: `${completed.length + goodProgress.length} On Track`, desc: `${completed.length} completed, ${goodProgress.length} above 50%.`, severity: 'Low' }); }
    return result;
  }, [projects, risks, departments, kpi]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">AI Insights</h1>
        <p className="text-[13px] text-[#64748b] mt-0.5">Auto-generated intelligence from live project data</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 bg-red-50 border-red-100"><p className="text-2xl font-bold text-red-500">{insights.filter(i => i.severity === 'High').length}</p><p className="text-[11px] text-[#64748b]">Critical Alerts</p></div>
        <div className="glass-card p-4 bg-amber-50 border-amber-100"><p className="text-2xl font-bold text-amber-500">{insights.filter(i => i.severity === 'Medium').length}</p><p className="text-[11px] text-[#64748b]">Warnings</p></div>
        <div className="glass-card p-4 bg-indigo-50 border-indigo-100"><p className="text-2xl font-bold text-indigo-500">{insights.length}</p><p className="text-[11px] text-[#64748b]">Total Insights</p></div>
      </div>
      <div className="space-y-2.5">
        {insights.map((insight, i) => (
          <div key={i} className="glass-card p-4 hover:border-indigo-200 transition-all">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                insight.type === 'critical' ? 'bg-red-50' : insight.type === 'warning' ? 'bg-amber-50' : insight.type === 'success' ? 'bg-emerald-50' : 'bg-indigo-50'
              }`}>
                <insight.icon className={`w-4 h-4 ${
                  insight.type === 'critical' ? 'text-red-500' : insight.type === 'warning' ? 'text-amber-500' : insight.type === 'success' ? 'text-emerald-500' : 'text-indigo-500'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-[13px] font-semibold text-[#0f172a]">{insight.title}</h3>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    insight.severity === 'High' ? 'bg-red-50 text-red-500 border-red-100' :
                    insight.severity === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'
                  }`}>{insight.severity}</span>
                </div>
                <p className="text-[12px] text-[#64748b] leading-relaxed">{insight.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
