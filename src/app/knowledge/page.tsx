'use client';

import { BookOpen, FileText, Clock, Search, FolderOpen, Star, MoreVertical, Plus, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function KnowledgePage() {
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ title: '', category: 'SOPs', content: '' });

  const filteredDocs = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const handleAddDoc = () => {
    if (!newDocForm.title) return;
    const newDoc = {
      id: Math.random().toString(36).substr(2, 9),
      title: newDocForm.title,
      category: newDocForm.category,
      author: 'Admin User', // Hardcoded for MVP
      updated: 'Just now',
      words: newDocForm.content.split(' ').length || 0,
      icon: FileText
    };
    setDocs([newDoc, ...docs]);
    setNewDocForm({ title: '', category: 'SOPs', content: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="x-page space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><BookOpen className="w-5 h-5 text-teal-500" /> Knowledge Base</h1>
          <p className="x-page-subtitle">Documentation, wikis, and team knowledge</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-x-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="x-input pl-9 py-1.5"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="x-btn x-btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Document
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Documents', value: docs.length.toString(), icon: FileText, accent: '#14b8a6' },
          { label: 'Active Wikis', value: docs.filter(d => d.category === 'Team Wiki').length.toString(), icon: BookOpen, accent: '#3b82f6' },
          { label: 'Updates This Week', value: docs.length > 0 ? '1' : '0', icon: Clock, accent: '#8b5cf6' },
        ].map((m, i) => (
          <div key={m.label} className={`x-metric animate-slide-up stagger-${i + 1}`} style={{ '--metric-accent': m.accent } as React.CSSProperties}>
            <m.icon className="w-4 h-4 mb-2" style={{ color: m.accent }} />
            <p className="x-metric-value">{m.value}</p>
            <p className="x-metric-label">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Removed Categories Grid since this starts empty */}

      {/* Recent Documents Table */}
      <div className="x-card-flush animate-fade-in">
        <div className="px-4 py-3 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)]">Recent Documents</h3>
          <button className="text-[11px] font-medium text-[var(--color-x-accent)] hover:underline">View All</button>
        </div>
        <table className="x-table">
          <thead>
            <tr>
              <th className="w-1/2">Name</th>
              <th>Category</th>
              <th>Author</th>
              <th>Last Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map(doc => (
              <tr key={doc.id} className="cursor-pointer">
                <td>
                  <div className="flex items-center gap-3">
                    <doc.icon className="w-4 h-4 text-[var(--color-x-text-muted)]" />
                    <div>
                      <p className="text-[13px] font-medium text-[var(--color-x-text)] group-hover:text-[var(--color-x-accent)] transition-colors">{doc.title}</p>
                      <p className="text-[10px] text-[var(--color-x-text-muted)]">{doc.words} words</p>
                    </div>
                  </div>
                </td>
                <td><span className="x-badge x-badge-gray text-[10px]">{doc.category}</span></td>
                <td className="text-[12px]">{doc.author}</td>
                <td className="text-[12px] text-[var(--color-x-text-muted)]">{doc.updated}</td>
                <td className="text-right">
                  <button className="p-1 text-[var(--color-x-text-muted)] hover:text-[var(--color-x-text)] hover:bg-[var(--color-x-bg)] rounded">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDocs.length === 0 && (
          <div className="p-12 text-center text-[var(--color-x-text-muted)] border-2 border-dashed border-transparent flex flex-col items-center justify-center">
            <BookOpen className="w-8 h-8 text-[var(--color-x-text-muted)] opacity-50 mb-3" />
            <p className="text-[14px] font-semibold text-[var(--color-x-text)]">No Documents Yet</p>
            <p className="text-[12px]">Click "Add Document" to start building your knowledge base.</p>
          </div>
        )}
      </div>

      {/* Add Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
              <h2 className="text-[16px] font-bold text-[var(--color-x-text)]">Add New Document</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-black/5 text-[var(--color-x-text-muted)] transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase">Document Title</label>
                <input 
                  type="text" 
                  value={newDocForm.title}
                  onChange={(e) => setNewDocForm({ ...newDocForm, title: e.target.value })}
                  className="x-input w-full" 
                  placeholder="e.g. Q3 Marketing Plan" 
                  autoFocus 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase">Category</label>
                <select 
                  value={newDocForm.category}
                  onChange={(e) => setNewDocForm({ ...newDocForm, category: e.target.value })}
                  className="x-input w-full"
                >
                  <option>Team Wiki</option>
                  <option>SOPs</option>
                  <option>Meeting Notes</option>
                  <option>Project Docs</option>
                  <option>Templates</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-x-text-muted)] mb-1 uppercase">Content (Draft)</label>
                <textarea 
                  value={newDocForm.content}
                  onChange={(e) => setNewDocForm({ ...newDocForm, content: e.target.value })}
                  className="x-input w-full resize-none h-32" 
                  placeholder="Start writing..." 
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--color-x-border)] mt-4">
                <button onClick={() => setIsModalOpen(false)} className="x-btn x-btn-secondary">Cancel</button>
                <button onClick={handleAddDoc} className="x-btn x-btn-primary" disabled={!newDocForm.title}>Save Document</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
