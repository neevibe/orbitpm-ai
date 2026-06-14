'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** The user's role: 'cco' / 'admin' / 'super_admin' = full access; otherwise restricted. */
  role: string;
  /** The department this user may modify projects in (super admins may modify all). */
  department: string | null;
  /** True if the user can do everything across all departments (CCO / admin). */
  isSuperAdmin: boolean;
  /** Whether the current user may add/edit projects in the given department. */
  canModifyDepartment: (dept?: string | null) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const SUPER_ADMIN_ROLES = ['cco', 'admin', 'super_admin'];

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  role: 'user',
  department: null,
  isSuperAdmin: false,
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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (email.trim().toLowerCase() === 'demo@xyrenis.com') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.session) {
        return { error: null };
      }
      // Fallback mock session for demonstration when Supabase is offline/unseeded
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000000',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'demo@xyrenis.com',
        user_metadata: {
          role: 'cco', // CCO role provides super admin access
          full_name: 'Demo Executive',
          department: 'Operations',
          employee_code: 'DEMO100',
          must_change_password: false
        },
        app_metadata: {},
        created_at: new Date().toISOString()
      };
      setUser(mockUser as any);
      setSession({
        access_token: 'mock_demo_token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock_demo_refresh_token',
        user: mockUser
      } as any);
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'user', must_change_password: false } },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const role: string = user?.user_metadata?.role ?? 'user';
  const department: string | null = user?.user_metadata?.department ?? null;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(role);

  const canModifyDepartment = (dept?: string | null) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (!dept || !department) return false;
    return dept.trim().toLowerCase() === department.trim().toLowerCase();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, role, department, isSuperAdmin, canModifyDepartment, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
