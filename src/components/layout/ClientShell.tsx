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
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.svg?v=2" alt="Xyrenis" className="h-14 w-auto object-contain animate-pulse" />
          <p className="text-[13px] text-[#64748b] font-medium">Loading Xyrenis...</p>
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
