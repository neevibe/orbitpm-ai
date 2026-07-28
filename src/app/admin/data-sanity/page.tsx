'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Stethoscope, Loader2, RefreshCw, Shield, ArrowLeft, Users2, Building2, GitMerge, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authedFetch } from '@/lib/supabase';
import { toast } from '@/components/ui/Toaster';

/**
 * Data Sanity (admin) — live-database audit: department coverage, the
 * Unknown-department bucket, owner identity variants (mergeable in one
 * click), subdivision usage, and status/date contradictions.
 */

type Report = {
  totals: { projects: number; active: number; archived: number };
  departments: { name: string; active: number; archived: number }[];
  unknownDepartment: { count: number; sample: { code: string; name: string; owner: string }[] };
  owners: {
    distinct: number;
    variantGroups: { canonical: string; variants: { name: string; count: number }[] }[];
    compound: { name: string; count: number }[];
    ambiguous: { name: string; count: number }[];
    unknown: { name: string; count: number }[];
  };
  subdivisions: { department: string; values: { sub: string; count: number; configured: boolean }[] }[];
  contradictions: {
    completedNotFull: { count: number; sample: { code: string; progress: number | null }[] };
    completedAtZero: number;
    targetBeforeStart: { count: number; sample: { code: string; start: string | null; target: string | null }[] };
  };
};

function Section({ icon: Icon, title, badge, children }: {
  icon: typeof Users2; title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="x-card p-5">
      <h2 className="text-[13px] font-semibold text-[var(--color-x-text)] flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[var(--color-x-text-muted)]" /> {title}
        {badge && <span className="x-badge x-badge-amber text-[10px]">{badge}</span>}
      </h2>
      {children}
    </div>
  );
}

export default function DataSanityPage() {
  const { isSuperAdmin, loading } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const res = await authedFetch('/api/admin/data-sanity');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setReport(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the audit.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { if (!loading && isSuperAdmin) load(); }, [loading, isSuperAdmin, load]);

  const fixOwners = async () => {
    if (!report) return;
    const n = report.owners.variantGroups.length;
    if (!confirm(`Merge ${n} owner name group(s) to their roster full names? This updates the owner field on the affected projects and is recorded in the audit trail.`)) return;
    setFixing(true);
    try {
      const res = await authedFetch('/api/admin/data-sanity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix_owners' }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      const rows = (j.renamed as { rows: number }[]).reduce((s, r) => s + r.rows, 0);
      toast({ kind: 'success', text: `Merged ${j.renamed.length} spelling(s) across ${rows} project(s).` });
      load();
    } catch (e) {
      toast({ kind: 'error', text: e instanceof Error ? e.message : 'Merge failed.' });
    } finally {
      setFixing(false);
    }
  };

  if (loading) return null;
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Shield className="w-8 h-8 text-red-500 mb-3" />
        <h1 className="text-[16px] font-bold text-[var(--color-x-text)]">Access restricted</h1>
        <p className="text-[13px] text-[var(--color-x-text-muted)] mt-1">Data Sanity is available to Super Admin accounts only.</p>
      </div>
    );
  }

  return (
    <div className="x-page space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-x-surface)] border border-[var(--color-x-border)] text-[12px] font-medium text-[var(--color-x-text-secondary)] hover:border-blue-200 hover:text-blue-600 transition-all">
          <ArrowLeft className="w-3.5 h-3.5" /> Admin
        </Link>
        <div>
          <h1 className="x-page-title flex items-center gap-2"><Stethoscope className="w-5 h-5 text-blue-500" /> Data Sanity</h1>
          <p className="x-page-subtitle">Live audit of the production register — departments, owner identities, contradictions</p>
        </div>
        <button onClick={load} disabled={busy} className="ml-auto x-btn text-[12px] px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Re-run audit
        </button>
      </div>

      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-700">{error}</div>}
      {!report && busy && <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="x-skeleton h-28" />)}</div>}

      {report && (
        <>
          {/* Departments coverage — answers "where did X department go" directly */}
          <Section icon={Building2} title="Departments — registered vs actual projects"
            badge={report.unknownDepartment.count > 0 ? `${report.unknownDepartment.count} without department` : undefined}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {report.departments.map(d => (
                <div key={d.name} className={`p-3 rounded-lg border ${d.active === 0 ? 'border-amber-300 bg-amber-50' : 'border-[var(--color-x-border)]'}`}>
                  <p className="text-[12px] font-semibold text-[var(--color-x-text)] truncate">{d.name}</p>
                  <p className="text-[11px] text-[var(--color-x-text-muted)]">{d.active} active · {d.archived} archived{d.active === 0 ? ' — empty!' : ''}</p>
                </div>
              ))}
            </div>
            {report.unknownDepartment.count > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-[12px] font-semibold text-amber-800 mb-1.5">
                  {report.unknownDepartment.count} active project(s) point at no valid department — they show as “Unknown” and vanish from department pages:
                </p>
                <div className="space-y-0.5">
                  {report.unknownDepartment.sample.map(p => (
                    <p key={p.code} className="text-[11.5px] text-amber-900 font-mono truncate">{p.code} · {p.name}{p.owner ? ` · ${p.owner}` : ''}</p>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Owner identities */}
          <Section icon={Users2} title={`Owner identities (${report.owners.distinct} distinct spellings)`}
            badge={report.owners.variantGroups.length > 0 ? `${report.owners.variantGroups.length} mergeable` : undefined}>
            {report.owners.variantGroups.length > 0 ? (
              <>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <p className="text-[12px] text-[var(--color-x-text-secondary)]">
                    These spellings are the same person (matched against the User list) and can be merged safely:
                  </p>
                  <button onClick={fixOwners} disabled={fixing} className="x-btn x-btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50">
                    {fixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                    {fixing ? 'Merging…' : 'Merge all to full names'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {report.owners.variantGroups.map(g => (
                    <div key={g.canonical} className="p-3 rounded-lg border border-[var(--color-x-border)]">
                      <p className="text-[12px] font-semibold text-[var(--color-x-text)]">{g.canonical}</p>
                      <p className="text-[11px] text-[var(--color-x-text-muted)]">
                        {g.variants.map(v => `“${v.name}” (${v.count})`).join(' + ')}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[12px] text-[var(--color-x-text-muted)] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No mergeable owner variants — every owner matches the User list exactly.</p>
            )}

            {(report.owners.compound.length > 0 || report.owners.ambiguous.length > 0 || report.owners.unknown.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-x-text-muted)] mb-1">Multiple people ({report.owners.compound.length})</p>
                  {report.owners.compound.slice(0, 8).map(o => <p key={o.name} className="text-[11.5px] text-[var(--color-x-text-secondary)] truncate">{o.name} ({o.count})</p>)}
                  {report.owners.compound.length === 0 && <p className="text-[11.5px] text-[var(--color-x-text-faint)]">none</p>}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-x-text-muted)] mb-1">Ambiguous first names ({report.owners.ambiguous.length})</p>
                  {report.owners.ambiguous.slice(0, 8).map(o => <p key={o.name} className="text-[11.5px] text-[var(--color-x-text-secondary)] truncate">{o.name} ({o.count}) — write the full name</p>)}
                  {report.owners.ambiguous.length === 0 && <p className="text-[11.5px] text-[var(--color-x-text-faint)]">none</p>}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-x-text-muted)] mb-1">Not on the User list ({report.owners.unknown.length})</p>
                  {report.owners.unknown.slice(0, 8).map(o => <p key={o.name} className="text-[11.5px] text-[var(--color-x-text-secondary)] truncate">{o.name} ({o.count})</p>)}
                  {report.owners.unknown.length === 0 && <p className="text-[11.5px] text-[var(--color-x-text-faint)]">none</p>}
                </div>
              </div>
            )}
          </Section>

          {/* Subdivisions present in data */}
          <Section icon={Building2} title="Sub-departments found in the data">
            {report.subdivisions.length === 0 ? (
              <p className="text-[12px] text-[var(--color-x-text-muted)]">No project carries a sub-department value yet. Set them on projects (Edit → Subdivision) and the toggles appear automatically.</p>
            ) : (
              <div className="space-y-2">
                {report.subdivisions.map(d => (
                  <div key={d.department} className="text-[12px]">
                    <span className="font-semibold text-[var(--color-x-text)]">{d.department}: </span>
                    {d.values.map(v => (
                      <span key={v.sub} className={`inline-block mr-1.5 mb-1 px-2 py-0.5 rounded-full border text-[11px] ${v.configured ? 'border-[var(--color-x-border)] text-[var(--color-x-text-secondary)]' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                        {v.sub} ({v.count}){!v.configured && ' — not in config'}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Contradictions */}
          <Section icon={AlertTriangle} title="Contradictions"
            badge={(report.contradictions.completedNotFull.count + report.contradictions.targetBeforeStart.count) > 0 ? `${report.contradictions.completedNotFull.count + report.contradictions.targetBeforeStart.count} found` : undefined}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-[var(--color-x-text-secondary)]">
              <div>
                <p className="font-semibold text-[var(--color-x-text)] mb-1">Completed but progress &lt; 100% — {report.contradictions.completedNotFull.count}</p>
                {report.contradictions.completedNotFull.sample.map(p => <p key={p.code} className="font-mono text-[11.5px]">{p.code} · {p.progress ?? 0}%</p>)}
              </div>
              <div>
                <p className="font-semibold text-[var(--color-x-text)] mb-1">Target date before start date — {report.contradictions.targetBeforeStart.count}</p>
                {report.contradictions.targetBeforeStart.sample.map(p => <p key={p.code} className="font-mono text-[11.5px]">{p.code} · {p.start} → {p.target}</p>)}
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
