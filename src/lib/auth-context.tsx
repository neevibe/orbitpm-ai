'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Tiered RBAC permission levels (low → high). */
export type Permission = 'view' | 'edit' | 'modify' | 'admin';
export type UserType = 'internal' | 'external';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Legacy role string (kept for back-compat). */
  role: string;
  /** The department this user is scoped to (admins are unscoped). */
  department: string | null;
  /** Tiered permission: view < edit < modify < admin. */
  permission: Permission;
  /** internal = @bialairport.com, external = anyone else. */
  userType: UserType;
  /** True for permission === 'admin'. */
  isAdmin: boolean;
  /** Back-compat alias for isAdmin. */
  isSuperAdmin: boolean;
  /** Any signed-in user can view. */
  canView: boolean;
  canEditDepartment: (dept?: string | null) => boolean;
  canModifyDepartment: (dept?: string | null) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const PERM_RANK: Record<Permission, number> = { view: 0, edit: 1, modify: 2, admin: 3 };
const ADMIN_ROLES = ['cco', 'admin', 'super_admin'];

function isInternalEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@bialairport.com');
}

function derivePermission(user: User | null): Permission {
  // 1. An explicit permission set by an admin always wins.
  const p = user?.user_metadata?.permission as Permission | undefined;
  if (p && p in PERM_RANK) return p;
  // 2. Admin / CCO roles are unconditionally admin.
  const role = (user?.user_metadata?.role as string) ?? 'user';
  if (ADMIN_ROLES.includes(role)) return 'admin';
  if (user?.email?.toLowerCase() === 'neeraj.p@bialairport.com') return 'admin';
  // 3. A user mapped to a department gets working authority over that department
  //    by default (add / edit / archive in own dept) — assigning a department is
  //    meant to grant access, not leave the user stuck in view-only. Admins can
  //    still raise to 'admin' or lower to 'edit' / 'view' explicitly.
  const dept = (user?.user_metadata?.department as string | undefined)?.trim();
  if (dept) return 'modify';
  // 4. No department, no explicit grant → View-Only (internal default & external).
  return 'view';
}

function deriveUserType(user: User | null): UserType {
  if (!user?.email) return 'external';
  return isInternalEmail(user.email) ? 'internal' : 'external';
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  role: 'user',
  department: null,
  permission: 'view',
  userType: 'internal',
  isAdmin: false,
  isSuperAdmin: false,
  canView: false,
  canEditDepartment: () => false,
  canModifyDepartment: () => false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const { data: fresh } = await supabase.auth.getUser();
        setUser(fresh.user ?? data.session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /** Best-effort client → audit log (login / logout). Never blocks or throws. */
  const logAuthEvent = (
    action: 'auth.login' | 'auth.logout' | 'auth.login_failed',
    opts?: { token?: string; email?: string; status?: 'success' | 'failure' },
  ) => {
    try {
      fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        },
        body: JSON.stringify({
          action,
          module: 'auth',
          status: opts?.status ?? (action === 'auth.login_failed' ? 'failure' : 'success'),
          entityType: 'session',
          entityName: opts?.email,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch { /* ignore */ }
  };

  const signIn = async (email: string, password: string) => {
    const emailLower = email.trim().toLowerCase();

    // Demo/Admin bypass — try Supabase first, then fall back to mock session
    if (emailLower === 'demo@xyrenis.com' || emailLower === 'neeraj.p@bialairport.com') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.session) {
        return { error: null };
      }
      // Mock session fallback
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: emailLower,
        user_metadata: {
          role: 'admin',
          permission: 'admin',
          full_name: emailLower === 'neeraj.p@bialairport.com' ? 'Neeraj Prakash' : 'Demo Executive',
          department: 'CCO',
          employee_code: emailLower === 'neeraj.p@bialairport.com' ? '102754' : 'DEMO100',
          must_change_password: false,
        },
        app_metadata: {},
        created_at: new Date().toISOString(),
      };
      setUser(mockUser as any);
      setSession({
        access_token: 'mock_admin_token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock_admin_refresh',
        user: mockUser,
      } as any);
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logAuthEvent('auth.login_failed', { email: emailLower });
    } else {
      logAuthEvent('auth.login', { token: data.session?.access_token, email: emailLower });
    }
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const emailLower = email.trim().toLowerCase();

    // Bypass for test admin account
    if (emailLower === 'neeraj.p@bialairport.com') {
      return signIn(email, password);
    }

    // Activation-first registration.
    //
    // Every BIAL employee is *pre-provisioned* in Supabase (via the employee
    // master). A plain supabase.auth.signUp() therefore fails with
    // "User already registered". Instead we hit a server route that:
    //   • finds the pre-provisioned account and lets the user set their own
    //     password + activate it (inheriting their department / role), OR
    //   • creates a brand-new external account if the email isn't pre-provisioned.
    // Either way no confirmation email is sent.
    let res: Response;
    try {
      res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password }),
      });
    } catch {
      return { error: 'Could not reach the server. Please try again.' };
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: json.error || 'Registration failed. Please try again.' };
    }

    // Account is ready — sign the user straight in (no email round-trip).
    const { error } = await supabase.auth.signInWithPassword({ email: emailLower, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    // Capture the token before the session is torn down so the actor resolves.
    const token = session?.access_token;
    logAuthEvent('auth.logout', { token, email: user?.email ?? undefined });
    await supabase.auth.signOut();
  };

  // Derived values
  const role: string = user?.user_metadata?.role ?? 'user';
  const department: string | null = user?.user_metadata?.department ?? null;
  const permission = derivePermission(user);
  const userType = deriveUserType(user);
  const isAdmin = permission === 'admin';
  const isSuperAdmin = isAdmin;
  const canView = !!user;

  const canEditDepartment = (dept?: string | null): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    if (permission === 'edit' || permission === 'modify') {
      if (!dept || !department) return true; // unscoped editor
      return dept.trim().toLowerCase() === department.trim().toLowerCase();
    }
    return false;
  };

  const canModifyDepartment = (dept?: string | null): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    if (permission === 'modify') {
      if (!dept || !department) return true;
      return dept.trim().toLowerCase() === department.trim().toLowerCase();
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, loading, role, department,
        permission, userType, isAdmin, isSuperAdmin, canView,
        canEditDepartment, canModifyDepartment,
        signIn, signUp, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
