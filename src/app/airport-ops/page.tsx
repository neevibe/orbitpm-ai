'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Loader2, MousePointerClick } from 'lucide-react';
import { AppProvider, useApp } from '@/context/AppContext';
import StatsHeader from '@/components/dashboard/StatsHeader';
import ProjectViews from '@/components/dashboard/ProjectViews';

// 3D canvas is client-only — avoid SSR for WebGL
const AirportCanvas = dynamic(() => import('@/components/three/AirportCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-[#94a3b8]">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-[12px] font-medium">Loading command center…</span>
      </div>
    </div>
  ),
});

function CanvasOverlay() {
  const { activeDomain, domains } = useApp();
  const active = activeDomain ? domains.find(d => d.key === activeDomain) : null;
  return (
    <div className="absolute top-4 left-4 z-10 pointer-events-none">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: '1px solid #e8edf3' }}>
        <MousePointerClick className="w-4 h-4 text-[#6366f1]" />
        <span className="text-[12px] font-semibold text-[#475569]">
          {active ? <>Viewing <span style={{ color: active.color }}>{active.label}</span></> : 'Click a zone to filter'}
        </span>
      </div>
    </div>
  );
}

function Workspace() {
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div className="flex flex-col gap-4 p-5" style={{ minHeight: 'calc(100vh - 52px)', background: 'linear-gradient(180deg,#f8fafc,#eef2f7)' }}>
      {/* page heading */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[20px] font-extrabold text-[#0f172a] tracking-tight">Airport Command Center</h1>
          <p className="text-[13px] text-[#64748b]">Live operational view across runway, retail, duty-free, and ground ops</p>
        </div>
      </div>

      {/* metrics */}
      <StatsHeader />

      {/* 3D canvas */}
      <div className="relative rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          height: panelOpen ? '46vh' : '70vh',
          minHeight: 320,
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid #e8edf3',
          boxShadow: '0 10px 40px -20px rgba(15,23,42,0.25)',
        }}>
        <CanvasOverlay />
        <button
          onClick={() => setPanelOpen(p => !p)}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid #e8edf3' }}
          title={panelOpen ? 'Expand canvas' : 'Show data panel'}
        >
          <Maximize2 className="w-4 h-4 text-[#64748b]" />
        </button>
        <AirportCanvas />
      </div>

      {/* slide-out data panel */}
      <div className="transition-all duration-300" style={{ maxHeight: panelOpen ? 2000 : 44, overflow: 'hidden' }}>
        <button
          onClick={() => setPanelOpen(p => !p)}
          className="w-full flex items-center justify-center gap-2 py-2 mb-3 rounded-xl text-[12.5px] font-semibold text-[#64748b] transition-colors hover:text-[#4f46e5]"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #e8edf3' }}
        >
          {panelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          {panelOpen ? 'Hide task panel' : 'Show task panel'}
        </button>
        <ProjectViews />
      </div>
    </div>
  );
}

export default function AirportOpsPage() {
  return (
    <AppProvider>
      <Workspace />
    </AppProvider>
  );
}
