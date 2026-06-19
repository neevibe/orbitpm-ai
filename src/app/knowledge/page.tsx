'use client';
import { BookOpen, FileText, Clock, Search, FolderOpen, Star, Plus, XCircle, Download, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function KnowledgePage() {
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [newDocForm, setNewDocForm] = useState({ title: '', category: 'SOPs', content: '' });

  const filteredDocs = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const handleAddDoc = () => {
    if (!newDocForm.title) return;
    const newDoc = {
      id: Math.random().toString(36).substring(2, 9),
      title: newDocForm.title,
      category: newDocForm.category,
      author: 'Admin User',
      updated: 'Just now',
      words: newDocForm.content.split(' ').length || 0,
      size: null,
      type: 'text/plain',
      content: newDocForm.content,
      icon: FileText
    };
    setDocs([newDoc, ...docs]);
    setNewDocForm({ title: '', category: 'SOPs', content: '' });
    setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      
      const newDoc = {
        id: Math.random().toString(36).substring(2, 9),
        title: file.name,
        category: 'Project Docs',
        author: 'Admin User',
        updated: 'Just now',
        words: 0,
        size: `${sizeMB} MB`,
        type: file.type,
        dataUrl: dataUrl,
        icon: FileText
      };

      setDocs(prev => [newDoc, ...prev]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadDoc = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.dataUrl || '#';
    link.download = doc.title;
    link.click();
  };

  const handleDeleteDoc = (id: string) => {
    if (!isSuperAdmin) return;
    if (confirm('Are you sure you want to delete this document?')) {
      setDocs(prev => prev.filter(d => d.id !== id));
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
    }
  };

  return (
    <div className="x-page space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="x-page-title flex items-center gap-2"><BookOpen className="w-5 h-5 text-teal-500" /> Knowledge Base</h1>
          <p className="x-page-subtitle">Documentation, wikis, and team knowledge</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64 mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-x-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="x-input pl-9 py-1.5"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <label className="x-btn x-btn-secondary flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm">
            <Plus className="w-4 h-4 text-slate-500" /> Upload File
            <input 
              type="file" 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,image/*,text/*" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>

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

      {/* Recent Documents Table */}
      <div className="x-card-flush animate-fade-in">
        <div className="px-4 py-3 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
          <h3 className="text-[13px] font-bold text-[var(--color-x-text)]">Recent Documents</h3>
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
              <tr key={doc.id} className="cursor-pointer hover:bg-slate-50/50" onClick={() => setSelectedDoc(doc)}>
                <td>
                  <div className="flex items-center gap-3">
                    {doc.dataUrl && doc.type?.startsWith('image/') ? (
                      <img src={doc.dataUrl} className="w-7 h-7 rounded object-cover border border-[var(--color-x-border)]" alt="" />
                    ) : (
                      <doc.icon className="w-4 h-4 text-[var(--color-x-text-muted)]" />
                    )}
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--color-x-text)] hover:text-indigo-600 transition-colors">{doc.title}</p>
                      <p className="text-[10px] text-[var(--color-x-text-muted)] font-medium">{doc.size || `${doc.words} words`}</p>
                    </div>
                  </div>
                </td>
                <td><span className="x-badge x-badge-gray text-[10px]">{doc.category}</span></td>
                <td className="text-[12px]">{doc.author}</td>
                <td className="text-[12px] text-[var(--color-x-text-muted)]">{doc.updated}</td>
                <td className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setSelectedDoc(doc)} title="View document" className="p-1.5 text-[var(--color-x-text-muted)] hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {doc.dataUrl && (
                      <button onClick={() => handleDownloadDoc(doc)} title="Download file" className="p-1.5 text-[var(--color-x-text-muted)] hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button onClick={() => handleDeleteDoc(doc.id)} title="Delete document" className="p-1.5 text-[var(--color-x-text-muted)] hover:text-red-500 hover:bg-slate-100 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDocs.length === 0 && (
          <div className="p-12 text-center text-[var(--color-x-text-muted)] flex flex-col items-center justify-center">
            <BookOpen className="w-8 h-8 text-[var(--color-x-text-muted)] opacity-50 mb-3" />
            <p className="text-[14px] font-semibold text-[var(--color-x-text)]">No Documents Yet</p>
            <p className="text-[12px]">Click "Upload File" or "Add Document" to start building your knowledge base.</p>
          </div>
        )}
      </div>

      {/* Add Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
              <h2 className="text-[15px] font-bold text-[var(--color-x-text)]">Add New Document</h2>
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

      {/* View Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedDoc(null)}>
          <div className="bg-[var(--color-x-surface)] border border-[var(--color-x-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[var(--color-x-border)] flex items-center justify-between bg-[var(--color-x-bg)]">
              <div>
                <h2 className="text-[15px] font-bold text-[var(--color-x-text)]">{selectedDoc.title}</h2>
                <p className="text-[11px] text-[var(--color-x-text-muted)]">{selectedDoc.category} · {selectedDoc.size || `${selectedDoc.words} words`}</p>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="p-2 rounded-full hover:bg-black/5 text-[var(--color-x-text-muted)] transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col items-center justify-center bg-slate-50">
              {selectedDoc.dataUrl ? (
                selectedDoc.type?.startsWith('image/') ? (
                  <img src={selectedDoc.dataUrl} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm border border-slate-200" alt={selectedDoc.title} />
                ) : selectedDoc.type === 'application/pdf' ? (
                  <iframe src={selectedDoc.dataUrl} className="w-full h-[60vh] rounded-lg border border-slate-200" title={selectedDoc.title} />
                ) : (
                  <div className="text-center p-8 bg-white border border-slate-200 rounded-xl max-w-sm w-full shadow-sm">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-[14px] font-bold text-slate-700 mb-1">No Inline Preview Available</p>
                    <p className="text-[12px] text-slate-500 mb-4">Preview is not supported for this file type ({selectedDoc.type}). Please download it to view.</p>
                    <button onClick={() => handleDownloadDoc(selectedDoc)} className="x-btn x-btn-primary mx-auto flex items-center gap-1.5">
                      <Download className="w-4 h-4" /> Download File
                    </button>
                  </div>
                )
              ) : (
                <div className="bg-white p-5 rounded-xl border border-slate-200 w-full shadow-sm">
                  <p className="text-[13px] text-[#1e293b] leading-relaxed whitespace-pre-wrap">{selectedDoc.content || 'No content.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
