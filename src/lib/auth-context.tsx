'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Tiered RBAC permission levels (low → high). */
export type Permission = 'view' | 'edit' | 'modify' | 'admin';
export type UserType = 'internal' | 'external';

export const DEMO_SESSION_KEY = 'xyrenis_demo';
export const PW_RECOVERY_KEY = 'xyrenis_pw_recovery';

export type PasswordRecoveryState = 'active' | 'expired' | null;

/**
 * Capture Supabase password-recovery tokens from the URL hash at module-eval
 * time — before supabase-js asynchronously consumes and strips them. The reset
 * email can land the user anywhere in the app (even the landing page, when the
 * redirect URL isn't allow-listed and Supabase falls back to the Site URL), so
 * a sessionStorage flag lets the shell route them to /change-password from
 * wherever the tokens arrived.
 */
if (typeof window !== 'undefined') {
  try {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash.includes('type=recovery')) {
      sessionStorage.setItem(PW_RECOVERY_KEY, 'active');
    } else if (hash.includes('error_code=otp_expired') || hash.includes('error=access_denied')) {
      // Expired / already-used recovery link — Supabase redirects with an error
      // hash instead of tokens. Recovery is the only email link this app sends.
      sessionStorage.setItem(PW_RECOVERY_KEY, 'expired');
    }
  } catch { /* sessionStorage unavailable — fall back to the PASSWORD_RECOVERY event */ }
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
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
  /** 'active' while the user arrived via a password-recovery link; 'expired' if the link was dead. */
  passwordRecovery: PasswordRecoveryState;
  clearPasswordRecovery: () => void;
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

/**
 * Distinguish a genuinely dead session (expired/invalid refresh token → must
 * sign out) from a transient failure (offline / server hiccup → keep the stored
 * session and let autoRefresh recover). Only the former should log the user out.
 */
function isInvalidSessionError(err: unknown): boolean {
  if (!err) return false;
  const status = (err as { status?: number }).status;
  if (status === 400 || status === 401 || status === 403) return true;
  const msg = ((err as { message?: string }).message || '').toLowerCase();
  return msg.includes('refresh token') || msg.includes('invalid') || msg.includes('expired') || msg.includes('not found');
}

// Authorization claims come from app_metadata FIRST (only admins can write
// it), falling back to user_metadata for accounts that predate the metadata
// migration (scripts/migrate-authz-metadata.mjs).
function authClaim(user: User | null, key: string): string | undefined {
  const a = (user?.app_metadata as Record<string, unknown> | undefined)?.[key];
  if (typeof a === 'string' && a.trim()) return a;
  const m = (user?.user_metadata as Record<string, unknown> | undefined)?.[key];
  if (typeof m === 'string' && m.trim()) return m;
  return undefined;
}

function derivePermission(user: User | null): Permission {
  // 1. An explicit permission set by an admin always wins.
  const p = authClaim(user, 'permission') as Permission | undefined;
  if (p && p in PERM_RANK) return p;
  // 2. Admin / CCO roles are unconditionally admin.
  const role = authClaim(user, 'role') ?? 'user';
  if (ADMIN_ROLES.includes(role)) return 'admin';
  if (user?.email?.toLowerCase() === 'neeraj.p@bialairport.com') return 'admin';
  // 3. A user mapped to a department gets working authority over that department
  //    by default (add / edit / archive in own dept) — assigning a department is
  //    meant to grant access, not leave the user stuck in view-only. Admins can
  //    still raise to 'admin' or lower to 'edit' / 'view' explicitly.
  const dept = authClaim(user, 'department')?.trim();
  if (dept) return 'modify';
  // 4. No department, no explicit grant → View-Only (internal default & external).
  return 'view';
}

function deriveUserType(user: User | null): UserType {
  if (!user?.email) return 'external';
  return isInternalEmail(user.email) ? 'internal' : 'external';
}

const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@xyrenis.com',
  user_metadata: { full_name: 'Demo User', role: 'user' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  isDemoMode: false,
  role: 'user',
  department: null,
  permission: 'view',
  userType: 'internal',
  isAdmin: false,
  isSuperAdmin: false,
  canView: false,
  passwordRecovery: null,
  clearPasswordRecovery: () => {},
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  // Pick up a recovery flag captured from the URL hash (set at module eval,
  // possibly on a previous page in this tab). Server and client can disagree on
  // the initial value, but nothing renders from it until `loading` resolves.
  const [passwordRecovery, setPasswordRecovery] = useState<PasswordRecoveryState>(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(PW_RECOVERY_KEY);
    return stored === 'active' || stored === 'expired' ? stored : null;
  });

  useEffect(() => {
    // Check for active demo session first — no Supabase call needed
    if (typeof window !== 'undefined' && sessionStorage.getItem(DEMO_SESSION_KEY) === 'true') {
      setUser(DEMO_USER);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Validate the stored session against the server. If the access token is
        // dead, try ONE refresh.
        const { data: fresh, error } = await supabase.auth.getUser();
        if (!error && fresh.user) {
          setSession(data.session);
          setUser(fresh.user);
        } else {
          const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshed.session) {
            const { data: u } = await supabase.auth.getUser();
            setSession(refreshed.session);
            setUser(u.user ?? refreshed.session.user);
          } else if (isInvalidSessionError(refreshErr)) {
            // The session is genuinely invalid/expired — sign out cleanly so the
            // user isn't left with a dead token that 401s every authed call.
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            // Transient failure (offline, server hiccup, tab woke from sleep).
            // Keep the stored session rather than kicking the user out — Supabase's
            // autoRefresh will recover it. This is the fix for "logged out / have
            // to sign in repeatedly" after brief connectivity drops.
            setSession(data.session);
            setUser(data.session.user);
          }
        }
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem(PW_RECOVERY_KEY, 'active');
        setPasswordRecovery('active');
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(PW_RECOVERY_KEY);
        setPasswordRecovery(null);
      }
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

    // Real Supabase auth only. (The old "mock session" fallback for admin/demo
    // accounts created a fake 'mock_admin_token' that the server rejects — it
    // made the UI look logged-in while every authed API call 401'd. Removed.)
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

  const clearPasswordRecovery = () => {
    if (typeof window !== 'undefined') sessionStorage.removeItem(PW_RECOVERY_KEY);
    setPasswordRecovery(null);
  };

  const signOut = async () => {
    if (isDemoMode) {
      if (typeof window !== 'undefined') sessionStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setIsDemoMode(false);
      return;
    }
    const token = session?.access_token;
    logAuthEvent('auth.logout', { token, email: user?.email ?? undefined });
    await supabase.auth.signOut();
  };

  // Derived values
  const role: string = authClaim(user, 'role') ?? 'user';
  const department: string | null = authClaim(user, 'department') ?? null;
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
        user, session, loading, isDemoMode, role, department,
        permission, userType, isAdmin, isSuperAdmin, canView,
        passwordRecovery, clearPasswordRecovery,
        canEditDepartment, canModifyDepartment,
        signIn, signUp, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
