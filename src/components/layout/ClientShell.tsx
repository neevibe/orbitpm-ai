'use client';

import { useEffect, useState } from 'react';
import { DataProvider } from '@/lib/data-context';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a minimal skeleton on the server/before hydration
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
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

  return (
    <DataProvider>
      <Sidebar />
      <Topbar />
      <main className="ml-[240px] mt-14 p-6 bg-mesh min-h-[calc(100vh-56px)]">
        {children}
      </main>
    </DataProvider>
  );
}
