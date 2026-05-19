'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DataProvider } from '@/lib/data-context';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Pages that manage their own padding/layout
const FULL_BLEED_PAGES = ['/projects'];

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#f8f9fa' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: '#e86c2d' }}>
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </div>
          <p className="text-[13px] text-[#64748b] font-medium">Loading OrbitPM AI...</p>
        </div>
      </div>
    );
  }

  const isFullBleed = FULL_BLEED_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'));

  return (
    <DataProvider>
      <Sidebar />
      <Topbar />
      <main
        className="ml-[220px] mt-14 min-h-[calc(100vh-56px)]"
        style={{ background: '#f8f9fa', padding: isFullBleed ? 0 : '24px' }}
      >
        {children}
      </main>
    </DataProvider>
  );
}
