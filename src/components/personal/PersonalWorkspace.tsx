'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Lock, Pencil, Download, Table2, BookOpen, X, Check } from 'lucide-react';
import { authedFetch } from '@/lib/supabase';
import { toast } from '@/components/ui/Toaster';
import { formatDate } from '@/lib/utils';

/**
 * Personal Workspace (Phase 2) — private projects, user-defined tables and a
 * daily work diary. Everything here belongs to the signed-in user only,
 * enforced by Row-Level Security (see supabase/migrations/0006). Personal
 * data never enters org KPIs, exports or other users' views.
 */

export type PColumn = { key: string; label: string; type: 'text' | 'number' | 'date' | 'select'; options?: string[] };
export type PTable = { id: string; name: string; columns: PColumn[]; rows: Record<string, string>[] };
export type PProject = { id: string; name: string; status: string; priority: string; progress: number; target_date: string | null; notes: string };
export type DiaryEntry = { id: string; entry_date: string; content: string; tags: string[] };

type WorkspaceData = {
  loading: boolean;
  configured: boolean;
  projects: PProject[];
  tables: PTable[];
  diary: DiaryEntry[];
};

export function usePersonalWorkspace(enabled: boolean) {
  const [data, setData] = useState<WorkspaceData>({ loading: true, configured: true, projects: [], tables: [], diary: [] });

  const reload = useCallback(async () => {
    if (!enabled) { setData(d => ({ ...d, loading: false })); return; }
    try {
      const res = await authedFetch('/api/personal');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setData({
        loading: false,
        configured: j.configured !== false,
        projects: j.projects ?? [],
        tables: j.tables ?? [],
        diary: j.diary ?? [],
      });
    } catch (e) {
      console.error('[personal] load failed:', e);
      setData(d => ({ ...d, loading: false }));
      toast({ kind: 'error', key: 'personal-load', text: 'Couldn’t load your personal workspace.' });
    }
  }, [enabled]);

  useEffect(() => { reload(); }, [reload]);
  return { ...data, reload };
}

export async function personalMutate(
  resource: 'project' | 'table' | 'diary',
  action: 'create' | 'update' | 'delete',
  payload: { id?: string; data?: Record<string, unknown> },
): Promise<boolean> {
  try {
    const res = await authedFetch('/api/personal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource, action, ...payload }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as { error?: string }));
      throw new Error(j.error || `HTTP ${res.status}`);
    }
    return true;
  } catch (e) {
    toast({ kind: 'error', text: e instanceof Error ? e.message : 'Save failed.' });
    return false;
  }
}

export function NotConfiguredNotice() {
  return (
    <div className="x-card p-8 text-center">
      <Lock className="w-8 h-8 mx-auto text-[var(--color-x-text-faint)] mb-3" />
      <p className="text-[14px] font-bold text-[var(--color-x-text)]">Personal workspace isn’t set up yet</p>
      <p className="text-[12.5px] text-[var(--color-x-text-muted)] mt-1 max-w-md mx-auto">
        An admin needs to run the migration <span className="font-mono">supabase/migrations/0006_personal_workspace.sql</span> in
        the Supabase SQL Editor once. After that, everyone gets their private area automatically.
      </p>
    </div>
  );
}

const STATUS = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
const PRIORITY = ['Critical', 'High', 'Medium', 'Low'];

// ─────────────────────────────────────────────────────── Personal Projects ──
export function PersonalProjects({ projects, reload }: { projects: PProject[]; reload: () => void }) {
  const [draft, setDraft] = useState<Partial<PProject> | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft?.name?.trim()) { toast({ kind: 'error', text: 'Give the project a name.' }); return; }
    setSaving(true);
    const data = {
      name: draft.name.trim(),
      status: draft.status || 'Not Started',
      priority: draft.priority || 'Medium',
      progress: Number(draft.progress) || 0,
      target_date: draft.target_date || null,
      notes: draft.notes || '',
    };
    const ok = draft.id
      ? await personalMutate('project', 'update', { id: draft.id, data })
      : await personalMutate('project', 'create', { data });
    setSaving(false);
    if (ok) { toast({ kind: 'success', text: draft.id ? 'Personal project updated' : 'Personal project created' }); setDraft(null); reload(); }
  };

  const remove = async (p: PProject) => {
    if (!confirm(`Delete personal project "${p.name}"? This cannot be undone.`)) return;
    if (await personalMutate('project', 'delete', { id: p.id })) { toast({ kind: 'info', text: 'Personal project deleted' }); reload(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[var(--color-x-text-muted)] flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Only you can see these — they never appear in org dashboards or exports.
        </p>
        <button onClick={() => setDraft({})} className="x-btn x-btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New personal project
        </button>
      </div>

      {draft && (
        <div className="x-card p-4 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <input className="x-input col-span-2" placeholder="Project name" value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            <select className="x-input" value={draft.status || 'Not Started'} onChange={e => setDraft({ ...draft, status: e.target.value })}>
              {STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="x-input" value={draft.priority || 'Medium'} onChange={e => setDraft({ ...draft, priority: e.target.value })}>
              {PRIORITY.map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="col-span-2 flex items-center gap-2">
              <label className="text-[11px] text-[var(--color-x-text-muted)] whitespace-nowrap">Progress {draft.progress ?? 0}%</label>
              <input type="range" min={0} max={100} value={draft.progress ?? 0} onChange={e => setDraft({ ...draft, progress: Number(e.target.value) })} className="flex-1" />
            </div>
            <input type="date" className="x-input" value={draft.target_date || ''} onChange={e => setDraft({ ...draft, target_date: e.target.value })} />
          </div>
          <textarea className="x-input w-full min-h-[70px]" placeholder="Notes (optional)" value={draft.notes || ''} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setDraft(null)} className="x-btn text-[12px] px-3 py-1.5">Cancel</button>
            <button onClick={save} disabled={saving} className="x-btn x-btn-primary text-[12px] px-3 py-1.5">{saving ? 'Saving…' : 'Save project'}</button>
          </div>
        </div>
      )}

      {projects.length === 0 && !draft ? (
        <div className="x-card px-4 py-12 text-center">
          <Lock className="w-8 h-8 mx-auto text-[var(--color-x-text-faint)] mb-3" />
          <p className="text-[13px] font-semibold text-[var(--color-x-text)]">No personal projects yet</p>
          <p className="text-[12px] text-[var(--color-x-text-muted)] mt-1">Track side work, learning goals or prep tasks — visible only to you.</p>
        </div>
      ) : projects.length > 0 && (
        <div className="x-card-flush overflow-x-auto">
          <table className="x-table">
            <thead><tr><th>Project</th><th>Status</th><th>Priority</th><th>Progress</th><th>Due</th><th /></tr></thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id}>
                  <td>
                    <span className="font-semibold text-[var(--color-x-text)] flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-[var(--color-x-text-faint)]" /> {p.name}
                    </span>
                    {p.notes && <p className="text-[11px] text-[var(--color-x-text-muted)] truncate max-w-[320px]">{p.notes}</p>}
                  </td>
                  <td><span className={`status-badge ${p.status.toLowerCase().replace(' ', '-')}`}>{p.status}</span></td>
                  <td><span className={`x-priority-${p.priority.toLowerCase()}`}>{p.priority}</span></td>
                  <td>
                    <div className="flex items-center gap-2 min-w-[90px]">
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-x-border)] overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-[12px]">{formatDate(p.target_date)}</td>
                  <td className="whitespace-nowrap">
                    <button onClick={() => setDraft(p)} title="Edit" className="p-1.5 rounded-md text-[var(--color-x-text-muted)] hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(p)} title="Delete" className="p-1.5 rounded-md text-[var(--color-x-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────── Custom Tables ──
const colKey = (label: string, existing: PColumn[]) => {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'col';
  let k = base, n = 2;
  while (existing.some(c => c.key === k)) k = `${base}_${n++}`;
  return k;
};

export function CustomTables({ tables, reload }: { tables: PTable[]; reload: () => void }) {
  const [activeId, setActiveId] = useState<string | null>(tables[0]?.id ?? null);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (activeId && !tables.some(t => t.id === activeId)) setActiveId(tables[0]?.id ?? null);
    if (!activeId && tables.length > 0) setActiveId(tables[0].id);
  }, [tables, activeId]);

  const active = tables.find(t => t.id === activeId) || null;

  const createTable = async () => {
    const name = newName.trim();
    if (!name) return;
    const ok = await personalMutate('table', 'create', {
      data: { name, columns: [{ key: 'item', label: 'Item', type: 'text' }], rows: [] },
    });
    if (ok) { toast({ kind: 'success', text: `Table "${name}" created` }); setNaming(false); setNewName(''); reload(); }
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* table list */}
      <div className="col-span-12 lg:col-span-3 space-y-2">
        <button onClick={() => setNaming(true)} className="w-full x-btn x-btn-primary text-[12px] px-3 py-2 flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New table
        </button>
        {naming && (
          <div className="x-card p-2.5 flex items-center gap-1.5">
            <input autoFocus className="x-input flex-1 text-[12px]" placeholder="Table name" value={newName}
              onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTable()} />
            <button onClick={createTable} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50"><Check className="w-4 h-4" /></button>
            <button onClick={() => setNaming(false)} className="p-1.5 rounded-md text-[var(--color-x-text-muted)] hover:bg-black/5"><X className="w-4 h-4" /></button>
          </div>
        )}
        {tables.map(t => (
          <button key={t.id} onClick={() => setActiveId(t.id)}
            className={`w-full text-left px-3 py-2 rounded-lg border text-[12.5px] font-medium transition-colors ${
              t.id === activeId ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-[var(--color-x-border)] bg-[var(--color-x-surface)] text-[var(--color-x-text-secondary)] hover:border-[var(--color-x-border-hover)]'
            }`}>
            <span className="flex items-center gap-1.5"><Table2 className="w-3.5 h-3.5" /> {t.name}</span>
            <span className="text-[10px] text-[var(--color-x-text-muted)]">{t.rows.length} rows · {t.columns.length} columns</span>
          </button>
        ))}
        {tables.length === 0 && !naming && (
          <p className="text-[11.5px] text-[var(--color-x-text-muted)] px-1">Build small private registers — a reading list, vendor tracker, interview pipeline — with your own columns.</p>
        )}
      </div>

      {/* editor */}
      <div className="col-span-12 lg:col-span-9">
        {active ? <TableEditor key={active.id} table={active} reload={reload} /> : (
          <div className="x-card px-4 py-12 text-center">
            <Table2 className="w-8 h-8 mx-auto text-[var(--color-x-text-faint)] mb-3" />
            <p className="text-[13px] font-semibold text-[var(--color-x-text)]">No table selected</p>
            <p className="text-[12px] text-[var(--color-x-text-muted)] mt-1">Create your first custom table to start tracking anything you like.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TableEditor({ table, reload }: { table: PTable; reload: () => void }) {
  const [columns, setColumns] = useState<PColumn[]>(table.columns);
  const [rows, setRows] = useState<Record<string, string>[]>(table.rows);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingCol, setAddingCol] = useState(false);
  const [colLabel, setColLabel] = useState('');
  const [colType, setColType] = useState<PColumn['type']>('text');

  const mutate = (nextCols: PColumn[], nextRows: Record<string, string>[]) => {
    setColumns(nextCols); setRows(nextRows); setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const ok = await personalMutate('table', 'update', { id: table.id, data: { columns, rows } });
    setSaving(false);
    if (ok) { setDirty(false); toast({ kind: 'success', key: 'table-save', text: 'Table saved' }); reload(); }
  };

  const addColumn = () => {
    const label = colLabel.trim();
    if (!label) return;
    mutate([...columns, { key: colKey(label, columns), label, type: colType }], rows);
    setAddingCol(false); setColLabel(''); setColType('text');
  };

  const removeColumn = (key: string) => {
    if (!confirm('Remove this column and its data from every row?')) return;
    mutate(columns.filter(c => c.key !== key), rows.map(r => { const { [key]: _drop, ...rest } = r; return rest; }));
  };

  const removeTable = async () => {
    if (!confirm(`Delete table "${table.name}" and all its rows? This cannot be undone.`)) return;
    if (await personalMutate('table', 'delete', { id: table.id })) { toast({ kind: 'info', text: 'Table deleted' }); reload(); }
  };

  return (
    <div className="x-card-flush">
      <div className="px-4 py-3 border-b border-[var(--color-x-border)] flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-[14px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[var(--color-x-text-faint)]" /> {table.name}
        </h3>
        <div className="flex items-center gap-1.5">
          {addingCol ? (
            <div className="flex items-center gap-1.5">
              <input autoFocus className="x-input text-[12px] w-36" placeholder="Column name" value={colLabel}
                onChange={e => setColLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColumn()} />
              <select className="x-input text-[12px]" value={colType} onChange={e => setColType(e.target.value as PColumn['type'])}>
                <option value="text">Text</option><option value="number">Number</option><option value="date">Date</option>
              </select>
              <button onClick={addColumn} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50"><Check className="w-4 h-4" /></button>
              <button onClick={() => setAddingCol(false)} className="p-1.5 rounded-md text-[var(--color-x-text-muted)] hover:bg-black/5"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={() => setAddingCol(true)} className="x-btn text-[12px] px-2.5 py-1.5 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Column</button>
          )}
          <button onClick={() => mutate(columns, [...rows, {}])} className="x-btn text-[12px] px-2.5 py-1.5 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Row</button>
          <button onClick={save} disabled={!dirty || saving} className="x-btn x-btn-primary text-[12px] px-3 py-1.5 disabled:opacity-40">
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
          <button onClick={removeTable} title="Delete table" className="p-1.5 rounded-md text-[var(--color-x-text-muted)] hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="x-table">
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} className="group">
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    <button onClick={() => removeColumn(c.key)} title="Remove column"
                      className="opacity-0 group-hover:opacity-100 text-[var(--color-x-text-faint)] hover:text-red-500 transition-opacity"><X className="w-3 h-3" /></button>
                  </span>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="text-center py-8 text-[12px] text-[var(--color-x-text-muted)]">No rows yet — click “+ Row” to start.</td></tr>
            )}
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map(c => (
                  <td key={c.key} className="!py-1.5">
                    <input
                      type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                      className="w-full bg-transparent border border-transparent hover:border-[var(--color-x-border)] focus:border-blue-400 rounded-md px-2 py-1 text-[12.5px] outline-none transition-colors"
                      value={row[c.key] ?? ''}
                      onChange={e => {
                        const next = rows.map((r, ri) => (ri === i ? { ...r, [c.key]: e.target.value } : r));
                        mutate(columns, next);
                      }}
                    />
                  </td>
                ))}
                <td className="!py-1.5">
                  <button onClick={() => mutate(columns, rows.filter((_, ri) => ri !== i))} title="Delete row"
                    className="p-1 rounded text-[var(--color-x-text-faint)] hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────── Work Diary ──
export function WorkDiary({ diary, reload, userName }: { diary: DiaryEntry[]; reload: () => void; userName: string }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(todayStr);

  // load an existing entry into the composer when its date is picked
  useEffect(() => {
    const existing = diary.find(e => e.entry_date === date);
    setContent(existing?.content ?? '');
    setTags(existing?.tags?.join(', ') ?? '');
  }, [date, diary]);

  const save = async () => {
    if (!content.trim()) { toast({ kind: 'error', text: 'Write something first.' }); return; }
    setSaving(true);
    const ok = await personalMutate('diary', 'create', {
      data: {
        entry_date: date,
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      },
    });
    setSaving(false);
    if (ok) { toast({ kind: 'success', text: `Diary saved for ${formatDate(date)}` }); reload(); }
  };

  const remove = async (e: DiaryEntry) => {
    if (!confirm(`Delete the diary entry for ${formatDate(e.entry_date)}?`)) return;
    if (await personalMutate('diary', 'delete', { id: e.id })) { toast({ kind: 'info', text: 'Entry deleted' }); reload(); }
  };

  const exportRange = () => {
    const inRange = diary
      .filter(e => e.entry_date >= from && e.entry_date <= to)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    if (inRange.length === 0) { toast({ kind: 'error', text: 'No diary entries in that date range.' }); return; }
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = inRange.map(e => `
      <section>
        <h2>${formatDate(e.entry_date)}${e.tags.length ? ` <span class="tags">${e.tags.map(esc).join(' · ')}</span>` : ''}</h2>
        ${esc(e.content).split(/\n+/).map(p => `<p>${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`).join('')}
      </section>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Work Log — ${esc(userName)}</title>
      <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; max-width: 720px; margin: 40px auto; line-height: 1.6; }
        h1 { font-size: 22px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
        .meta { color: #64748b; font-size: 13px; margin-bottom: 28px; }
        h2 { font-size: 15px; margin: 26px 0 6px; color: #1d4ed8; }
        .tags { font-size: 11px; color: #64748b; font-weight: normal; }
        p { font-size: 13.5px; margin: 4px 0; }
        @media print { body { margin: 10mm; } }
      </style></head><body>
      <h1>Work Log — ${esc(userName)}</h1>
      <p class="meta">${formatDate(from)} to ${formatDate(to)} · ${inRange.length} entr${inRange.length === 1 ? 'y' : 'ies'} · generated ${formatDate(todayStr)}</p>
      ${body}</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { toast({ kind: 'error', text: 'Pop-up blocked — allow pop-ups to export.' }); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* composer */}
      <div className="col-span-12 lg:col-span-7 space-y-4">
        <div className="x-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-[14px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-500" /> Today’s log
            </h3>
            <input type="date" max={todayStr} className="x-input text-[12px]" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <textarea
            className="x-input w-full min-h-[140px] text-[13px]"
            placeholder={'What did you work on? Achievements, decisions, blockers…\nUse **bold** for highlights — one entry per day, editable any time.'}
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input className="x-input flex-1 text-[12px]" placeholder="Tags (comma-separated: meeting, milestone, kudos…)" value={tags} onChange={e => setTags(e.target.value)} />
            <button onClick={save} disabled={saving} className="x-btn x-btn-primary text-[12px] px-3.5 py-2">{saving ? 'Saving…' : 'Save entry'}</button>
          </div>
        </div>

        {/* history */}
        <div className="space-y-2">
          {diary.length === 0 ? (
            <div className="x-card px-4 py-10 text-center">
              <BookOpen className="w-8 h-8 mx-auto text-[var(--color-x-text-faint)] mb-3" />
              <p className="text-[13px] font-semibold text-[var(--color-x-text)]">Your diary is empty</p>
              <p className="text-[12px] text-[var(--color-x-text-muted)] mt-1">Two minutes a day builds a powerful record for reviews and 1:1s.</p>
            </div>
          ) : diary.map(e => (
            <div key={e.id} className="x-card p-3.5 group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-bold text-blue-700 font-mono">{formatDate(e.entry_date)}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setDate(e.entry_date)} title="Edit" className="p-1 rounded text-[var(--color-x-text-muted)] hover:text-blue-600 hover:bg-blue-50"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(e)} title="Delete" className="p-1 rounded text-[var(--color-x-text-muted)] hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p className="text-[12.5px] text-[var(--color-x-text-secondary)] whitespace-pre-wrap leading-relaxed">{e.content}</p>
              {e.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {e.tags.map(t => <span key={t} className="x-badge x-badge-blue text-[10px]">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* export */}
      <div className="col-span-12 lg:col-span-5">
        <div className="x-card p-4 space-y-3">
          <h3 className="text-[14px] font-bold text-[var(--color-x-text)] flex items-center gap-1.5">
            <Download className="w-4 h-4 text-blue-500" /> Export for presentation
          </h3>
          <p className="text-[12px] text-[var(--color-x-text-muted)]">
            Turn a date range into a clean, printable work log for your manager 1:1s and reviews — save it as PDF from the print dialog.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-x-text-muted)]">From</label>
              <input type="date" className="x-input w-full text-[12px]" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-x-text-muted)]">To</label>
              <input type="date" className="x-input w-full text-[12px]" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          <button onClick={exportRange} className="w-full x-btn x-btn-primary text-[12px] px-3 py-2 flex items-center justify-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Generate work log
          </button>
          <p className="text-[11px] text-[var(--color-x-text-faint)]">
            {diary.filter(e => e.entry_date >= from && e.entry_date <= to).length} entries in the selected range.
          </p>
        </div>
      </div>
    </div>
  );
}
