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
  const p = user?.user_metadata?.permission as Permission | undefined;
  if (p && p in PERM_RANK) return p;
  const role = (user?.user_metadata?.role as string) ?? 'user';
  if (ADMIN_ROLES.includes(role)) return 'admin';
  // neeraj.p@bialairport.com is always admin
  if (user?.email?.toLowerCase() === 'neeraj.p@bialairport.com') return 'admin';
  return 'view'; // default: View-Only until admin grants more
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

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const emailLower = email.trim().toLowerCase();

    // Bypass for test admin account
    if (emailLower === 'neeraj.p@bialairport.com') {
      return signIn(email, password);
    }

    const internal = isInternalEmail(emailLower);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'user',
          permission: 'view',
          userType: internal ? 'internal' : 'external',
          must_change_password: false,
        },
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'https://orbitpm-ai.vercel.app'}/login`,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
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
