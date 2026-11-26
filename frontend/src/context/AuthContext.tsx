'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { TOKEN_STORAGE_KEY } from '@/lib/api';
import type { Role, User } from '@/types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (fullName: string, username: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getHomeRouteByRole(role: Role): string {
  return role === 'ADMIN' || role === 'TEACHER' ? '/admin' : '/dashboard';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const persistAuth = useCallback((nextToken: string, nextUser: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        const tgInitData = window.Telegram?.WebApp?.initData;
        if (tgInitData && tgInitData.trim().length > 0) {
          window.Telegram?.WebApp?.ready?.();
          window.Telegram?.WebApp?.expand?.();
          const res = await api.post<{ token: string; user: User }>('/api/auth/telegram', {
            initData: tgInitData,
          });
          if (!active) return;
          persistAuth(res.data.token, res.data.user);
          return;
        }

        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedToken) {
          return;
        }

        const res = await api.get<{ user: User }>('/api/auth/me');
        if (!active) return;
        setToken(storedToken);
        setUser(res.data.user);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initAuth();

    return () => {
      active = false;
    };
  }, [persistAuth]);

  const login = useCallback(
    async (username: string, password: string): Promise<User> => {
      const res = await api.post<{ token: string; user: User }>('/api/auth/login', {
        username,
        password,
      });
      persistAuth(res.data.token, res.data.user);
      router.push(getHomeRouteByRole(res.data.user.role));
      return res.data.user;
    },
    [persistAuth, router]
  );

  const register = useCallback(
    async (fullName: string, username: string, password: string): Promise<User> => {
      const res = await api.post<{ token: string; user: User }>('/api/auth/register', {
        fullName,
        username,
        password,
      });
      persistAuth(res.data.token, res.data.user);
      router.push(getHomeRouteByRole(res.data.user.role));
      return res.data.user;
    },
    [persistAuth, router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
