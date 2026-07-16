'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];
type UserRole = Profile['role'];

interface AuthState {
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  role: UserRole | null;
  permissions: string[];
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

import { supabase } from '@/lib/supabase/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    company: null,
    role: null,
    permissions: [],
    loading: true,
  });

  const hydrateUser = useCallback((
    user: any,
    profile: Profile | null,
    company: Company | null,
    permissions: string[]
  ) => {
    if (!user) {
      setState({ user: null, profile: null, company: null, role: null, permissions: [], loading: false });
      return;
    }

    setState({
      user: user as any,
      profile,
      company,
      role: profile?.role ?? null,
      permissions,
      loading: false,
    });
  }, []);

  useEffect(() => {
    // Lấy session tùy chỉnh từ API route nội bộ khi tải lại trang
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
    const headers: Record<string, string> = {};
    if (localToken) {
      headers['Authorization'] = `Bearer ${localToken}`;
    }

    fetch('/api/auth/session', { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          hydrateUser(data.user, data.profile, data.company, data.permissions);
        } else {
          hydrateUser(null, null, null, []);
        }
      })
      .catch((err) => {
        console.error('Lỗi lấy thông tin session:', err);
        hydrateUser(null, null, null, []);
      });
  }, [hydrateUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return { error: data.error || 'Đăng nhập thất bại' };
      }

      if (data.user) {
        if (data.token && typeof window !== 'undefined') {
          localStorage.setItem('bds_auth_token', data.token);
        }
        hydrateUser(data.user, data.profile, data.company, data.permissions);

        // Điều hướng dựa trên vai trò
        const role = data.profile?.role;
        if (role === 'super_admin') {
          router.push('/super-admin');
        } else if (role === 'landlord') {
          router.push('/landlord');
        } else if (role === 'sales_agent') {
          router.push('/customer/properties');
        } else {
          router.push('/admin');
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Lỗi kết nối máy chủ' };
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Lỗi khi thực hiện đăng xuất:', err);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bds_auth_token');
    }
    setState({ user: null, profile: null, company: null, role: null, permissions: [], loading: false });
    router.push('/customer/properties');
  };

  const hasPermission = useCallback((perm: string): boolean => {
    if (state.permissions.includes('*')) return true;
    return state.permissions.includes(perm);
  }, [state.permissions]);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
