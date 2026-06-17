'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { DataProvider } from '@/lib/data-context';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const FULL_BLEED_PAGES = ['/projects'];
// Pages that render standalone (no sidebar/topbar) and don't require auth.
const STANDALONE_PATHS = ['/', '/login', '/change-password'];
// Auth pages a logged-in user should be bounced away from (landing `/` is NOT one).
const AUTH_PATHS = ['/login', '/change-password'];
const HOME = '/command-center';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isStandalone = STANDALONE_PATHS.includes(pathname);
  const isAuthPath = AUTH_PATHS.includes(pathname);
  const isLanding = pathname === '/';
  const mustChangePassword = user?.user_metadata?.must_change_password === true;

  const [playReveal, setPlayReveal] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const show = sessionStorage.getItem('play_reveal') === 'true';
      if (show) {
        setPlayReveal(true);
        sessionStorage.removeItem('play_reveal');
        
        const fadeTimer = setTimeout(() => setFadingOut(true), 2300);
        const doneTimer = setTimeout(() => {
          setPlayReveal(false);
          setFadingOut(false);
        }, 2800);
        
        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(doneTimer);
        };
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (loading) return;

    // Unauthenticated visitors may see standalone pages (landing/login); everything else → login
    if (!user && !isStandalone) {
      router.replace('/login');
      return;
    }
    // First-time users must set a password before entering the app (landing still allowed)
    if (user && mustChangePassword && pathname !== '/change-password' && !isLanding) {
      router.replace('/change-password');
      return;
    }
    // Logged-in users shouldn't sit on login/change-password (once password is set)
    if (user && !mustChangePassword && isAuthPath) {
      router.replace(HOME);
    }
  }, [user, loading, isStandalone, isAuthPath, isLanding, mustChangePassword, pathname, router]);

  // Logo Reveal Animation Overlay
  if (playReveal) {
    return (
      <div 
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-500 ${
          fadingOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <video 
          src="/logo-reveal.mp4" 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Loading splash
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0f1623' }}>
        <div className="flex flex-col items-center gap-4">
          <img src="/logo-mark-white.png" alt="Xyrenis" className="h-12 w-auto object-contain animate-pulse" />
          <p className="text-[13px] font-medium" style={{ color: '#8ca4c0' }}>Loading Xyrenis…</p>
        </div>
      </div>
    );
  }

  // Standalone pages (landing, login, change-password) — no sidebar/topbar chrome
  if (isStandalone) return <>{children}</>;

  // Unauthenticated — blank while redirect fires
  if (!user) return null;

  // Force password change — blank while redirect to /change-password fires
  if (mustChangePassword) return null;

  const isFullBleed = FULL_BLEED_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'));

  return (
    <DataProvider>
      <Sidebar />
      <Topbar />
      <main
        className="ml-[212px] mt-[52px]"
        style={{ background: '#f8f9fa', padding: isFullBleed ? 0 : '24px', minHeight: 'calc(100vh - 52px)' }}
      >
        {children}
      </main>
    </DataProvider>
  );
}

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
