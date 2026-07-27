'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Users, Globe, Building2 } from 'lucide-react';
import { BIAL_EMPLOYEES } from '@/lib/employee-data';
import {
  TOP_LEVEL_DEPARTMENTS,
  BIAL_INTERNAL_DEPARTMENTS,
  OUTSIDE_BIAL_SUGGESTIONS,
  departmentDisplayName,
} from '@/lib/org-structure';
import type { ClassifiedDependency } from '@/lib/mock-data';

// Loose normalisation so the short employee-data dept labels match our verticals.
function normalizeDept(d: string): string {
  const s = d.toLowerCase();
  if (s.startsWith('digital')) return 'Digital & Data';
  if (s.startsWith('advert')) return 'Advertising & Marketing';
  if (s.startsWith('duty') || s === 'dutyfree') return 'Duty Free';
  if (s.startsWith('commercial')) return 'Commercial Development';
  if (s.startsWith('oper')) return 'Operations';
  if (s === 'basl') return 'BASL';
  if (s === 'cbb' || s.startsWith('amen')) return 'BASL';
  return d;
}

function employeesForDept(dept: string): { id: string; name: string }[] {
  return BIAL_EMPLOYEES
    .filter(e => normalizeDept(e.department) === dept)
    .map(e => ({ id: e.id, name: e.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const newDep = (): ClassifiedDependency => ({
  id: `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  kind: 'internal',
  owners: [],
  createdDate: new Date().toISOString().slice(0, 10),
  status: 'Pending',
});

interface Props {
  value: ClassifiedDependency[];
  onChange: (next: ClassifiedDependency[]) => void;
  readOnly?: boolean;
}

export default function DependencyBuilder({ value, onChange, readOnly }: Props) {
  const deps = value || [];
  const update = (id: string, patch: Partial<ClassifiedDependency>) =>
    onChange(deps.map(d => (d.id === id ? { ...d, ...patch } : d)));
  const remove = (id: string) => onChange(deps.filter(d => d.id !== id));
  const add = () => onChange([...deps, newDep()]);

  const inputCls =
    'w-full bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-[12px] text-[#1e293b] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50';

  return (
    <div className="space-y-2.5">
      {deps.length === 0 && (
        <p className="text-[11px] text-[#94a3b8] italic">No dependencies added yet.</p>
      )}

      {deps.map((dep, i) => (
        <DepRow key={dep.id} dep={dep} index={i} inputCls={inputCls}
          readOnly={readOnly} onUpdate={p => update(dep.id, p)} onRemove={() => remove(dep.id)} />
      ))}

      {!readOnly && (
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all">
          <Plus className="w-3.5 h-3.5" /> Add Dependency
        </button>
      )}
    </div>
  );
}

function DepRow({
  dep, index, inputCls, readOnly, onUpdate, onRemove,
}: {
  dep: ClassifiedDependency; index: number; inputCls: string; readOnly?: boolean;
  onUpdate: (p: Partial<ClassifiedDependency>) => void; onRemove: () => void;
}) {
  const employees = useMemo(
    () => (dep.kind === 'internal' && dep.department ? employeesForDept(dep.department) : []),
    [dep.kind, dep.department],
  );
  const [empOpen, setEmpOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!empOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEmpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [empOpen]);

  const owners = dep.owners || [];
  const toggleOwner = (name: string) =>
    onUpdate({ owners: owners.includes(name) ? owners.filter(o => o !== name) : [...owners, name] });

  const seg = (active: boolean) =>
    `flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
      active ? 'bg-white text-blue-600 shadow-sm' : 'text-[#64748b] hover:text-[#1e293b]'
    }`;

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Dependency {index + 1}</span>
        {!readOnly && (
          <button type="button" onClick={onRemove} className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Type: internal / external */}
      <div className="flex gap-1 p-1 rounded-lg bg-[#eef2f7]">
        <button type="button" disabled={readOnly} onClick={() => onUpdate({ kind: 'internal', externalScope: undefined, externalParty: undefined })} className={seg(dep.kind === 'internal')}>
          <Users className="w-3 h-3 inline mr-1" />Internal
        </button>
        <button type="button" disabled={readOnly} onClick={() => onUpdate({ kind: 'external', owners: [], externalScope: dep.externalScope || 'within_bial' })} className={seg(dep.kind === 'external')}>
          <Globe className="w-3 h-3 inline mr-1" />External
        </button>
      </div>

      {/* INTERNAL: department → employees */}
      {dep.kind === 'internal' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Internal department</label>
            <select disabled={readOnly} value={dep.department || ''} onChange={e => onUpdate({ department: e.target.value, owners: [] })} className={inputCls}>
              <option value="">Select department…</option>
              {TOP_LEVEL_DEPARTMENTS.map(d => <option key={d} value={d}>{departmentDisplayName(d)}</option>)}
            </select>
          </div>
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Dependent owner(s)</label>
            <button type="button" disabled={readOnly || !dep.department} onClick={() => setEmpOpen(o => !o)}
              className={`${inputCls} text-left flex items-center justify-between disabled:opacity-50`}>
              <span className={owners.length ? 'text-[#1e293b]' : 'text-[#94a3b8]'}>
                {owners.length ? `${owners.length} selected` : 'Select employees…'}
              </span>
            </button>
            {empOpen && employees.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-[#e2e8f0] bg-white shadow-lg py-1">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#f1f5f9] cursor-pointer text-[12px]">
                    <input type="checkbox" checked={owners.includes(emp.name)} onChange={() => toggleOwner(emp.name)} />
                    {emp.name}
                  </label>
                ))}
              </div>
            )}
            {dep.department && employees.length === 0 && (
              <p className="text-[10px] text-[#94a3b8] mt-1">No employees listed for this department.</p>
            )}
          </div>
          {owners.length > 0 && (
            <div className="col-span-2 flex flex-wrap gap-1">
              {owners.map(o => (
                <span key={o} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] border border-blue-100">
                  {o}
                  {!readOnly && <button type="button" onClick={() => toggleOwner(o)} className="text-blue-400 hover:text-blue-700">×</button>}
                </span>
              ))}
            </div>
          )}
          {/* Optional context for the internal dependency */}
          <div className="col-span-2">
            <input type="text" disabled={readOnly} value={dep.description || ''} onChange={e => onUpdate({ description: e.target.value })}
              placeholder="What is the dependency? (optional)" className={inputCls} />
          </div>
          <p className="col-span-2 text-[10px] text-[#94a3b8]">
            A read-only task will appear in {dep.department ? departmentDisplayName(dep.department) : 'the selected department'}; they track progress, status &amp; completion from their side.
          </p>
        </div>
      )}

      {/* EXTERNAL: vendor / partner record (no mirror — stays inside this project) */}
      {dep.kind === 'external' && (
        <div className="space-y-2">
          {/* Scope: Within BIAL / Outside BIAL */}
          <div className="flex gap-1 p-1 rounded-lg bg-[#eef2f7]">
            <button type="button" disabled={readOnly} onClick={() => onUpdate({ externalScope: 'within_bial' })} className={seg(dep.externalScope === 'within_bial')}>
              <Building2 className="w-3 h-3 inline mr-1" />Within BIAL
            </button>
            <button type="button" disabled={readOnly} onClick={() => onUpdate({ externalScope: 'outside_bial' })} className={seg(dep.externalScope === 'outside_bial')}>
              <Globe className="w-3 h-3 inline mr-1" />Outside BIAL
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Party identification differs by scope */}
            {dep.externalScope === 'within_bial' ? (
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-[#64748b] mb-1">BIAL function</label>
                <select disabled={readOnly} value={dep.externalParty || ''} onChange={e => onUpdate({ externalParty: e.target.value })} className={inputCls}>
                  <option value="">Select function…</option>
                  {BIAL_INTERNAL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Category</label>
                  <select disabled={readOnly} value={dep.externalCategory || ''} onChange={e => onUpdate({ externalCategory: e.target.value })} className={inputCls}>
                    <option value="">Select…</option>
                    {OUTSIDE_BIAL_SUGGESTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Vendor / Partner Name</label>
                  <input type="text" disabled={readOnly} value={dep.externalParty || ''} onChange={e => onUpdate({ externalParty: e.target.value })}
                    placeholder="e.g. Acme Vendor Pvt Ltd" className={inputCls} />
                </div>
              </>
            )}

            {/* Common vendor/partner tracking fields */}
            <div>
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Contact Person</label>
              <input type="text" disabled={readOnly} value={dep.contactPerson || ''} onChange={e => onUpdate({ contactPerson: e.target.value })}
                placeholder="Name / email / phone" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">SLA Date</label>
              <input type="date" disabled={readOnly} value={dep.slaDate || ''} onChange={e => onUpdate({ slaDate: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Status</label>
              <select disabled={readOnly} value={dep.status || 'Pending'} onChange={e => onUpdate({ status: e.target.value as ClassifiedDependency['status'] })} className={inputCls}>
                {['Pending', 'In Progress', 'Resolved', 'Blocked'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold text-[#64748b] mb-1">Notes</label>
              <textarea disabled={readOnly} value={dep.notes || ''} onChange={e => onUpdate({ notes: e.target.value })}
                rows={2} placeholder="SLA terms, scope, references…" className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
