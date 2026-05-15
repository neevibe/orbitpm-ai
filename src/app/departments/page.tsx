'use client';

import { useState } from 'react';
import { Building2, Plus, X, Save } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DepartmentsPage() {
  const { departments, addDepartment } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const chartData = departments.map(d => ({ name: d.name, total: d.total, color: d.color }));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addDepartment({ name: newName.trim(), color: newColor });
    setNewName(''); setNewColor('#6366f1'); setShowAddModal(false);
  };

  const inputCls = "w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#1e293b] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 placeholder:text-[#94a3b8]";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">Departments</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">{departments.length} departments · Auto-calculated from projects</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-[12px]"><Plus className="w-3.5 h-3.5" /> Add Department</button>
      </div>

      <div className="glass-card p-4">
        <h3 className="text-[12px] font-semibold text-[#334155] mb-3">Projects per Department</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} width={140} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
            <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={18}>
              {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {departments.map((d) => (
          <div key={d.name} className="glass-card p-4 hover:border-indigo-200 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${d.color}15` }}>
                <Building2 className="w-4 h-4" style={{ color: d.color }} />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-[#0f172a]">{d.name}</h3>
                <p className="text-[11px] text-[#94a3b8]">{d.total} projects</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-2.5">
              {[
                { label: 'Active', value: d.inProgress, color: 'text-blue-500' },
                { label: 'Done', value: d.completed, color: 'text-emerald-500' },
                { label: 'Pending', value: d.notStarted, color: 'text-[#94a3b8]' },
                { label: 'Delayed', value: d.delayed, color: 'text-red-500' },
                { label: 'Critical', value: d.critical, color: 'text-amber-600' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className={`text-[15px] font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] text-[#94a3b8]">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
              <div className="h-full flex">
                {d.inProgress > 0 && <div className="bg-blue-500" style={{ width: `${(d.inProgress / d.total) * 100}%` }} />}
                {d.completed > 0 && <div className="bg-emerald-500" style={{ width: `${(d.completed / d.total) * 100}%` }} />}
                {d.delayed > 0 && <div className="bg-red-500" style={{ width: `${(d.delayed / d.total) * 100}%` }} />}
                {d.notStarted > 0 && <div className="bg-[#e2e8f0]" style={{ width: `${(d.notStarted / d.total) * 100}%` }} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white border border-[#e2e8f0] rounded-xl shadow-2xl animate-scale-in">
            <div className="border-b border-[#f1f5f9] px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#0f172a]">Add Department</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div><label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Department Name *</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="e.g., Cargo Operations" className={inputCls} /></div>
              <div><label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase tracking-wider">Color</label>
                <div className="flex items-center gap-3"><input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-10 h-10 rounded-lg border border-[#e2e8f0] cursor-pointer" /><span className="text-[13px] text-[#64748b] font-mono">{newColor}</span></div></div>
              <div className="flex justify-end gap-2.5 pt-1"><button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-[12px]">Cancel</button><button type="submit" className="btn-primary text-[12px]"><Save className="w-3.5 h-3.5" /> Add</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
