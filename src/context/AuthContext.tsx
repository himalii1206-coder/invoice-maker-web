'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Company, Permission } from '../types/index';
import { api } from '../lib/api';
import { toast } from 'react-toastify';
import { useRouter, usePathname } from 'next/navigation';

/**
 * A login that stopped at the second factor. The challenge token stands in for
 * the password having already been accepted; it is short lived and useless
 * against any other endpoint.
 */
export interface TwoFactorChallenge {
  challengeToken: string;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  invoiceSettings: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => Promise<TwoFactorChallenge | void>;
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Mirrors the server's permission matrix; the API still enforces it. */
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/accept-invite'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchCurrentUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        setIsLoading(false);
        return;
      }

      const { data } = await api.get('/auth/me');
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        setCompany(data.data.user.company || null);
      }
    } catch (err) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const isPublic = PUBLIC_ROUTES.includes(pathname);
      if (!user && !isPublic) {
        router.push('/login');
      } else if (user && isPublic) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  /** Stores tokens and user state after any successful authentication. */
  const completeSignIn = (payload: any, greeting: string) => {
    const { user: userData, company: companyData, accessToken, refreshToken } = payload;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    setUser(userData);
    setCompany(companyData);

    toast.success(greeting);
    router.push('/dashboard');
  };

  const login = async (credentials: any): Promise<TwoFactorChallenge | void> => {
    try {
      setIsLoading(true);
      const { data } = await api.post('/auth/login', credentials);

      if (!data.success) return;

      // The password was right but the account has 2FA on: hand the challenge
      // back so the login screen can ask for the code.
      if (data.data?.requiresTwoFactor) {
        return { challengeToken: data.data.challengeToken };
      }

      completeSignIn(data.data, `Welcome back, ${data.data.user.firstName}!`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please check credentials.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactor = async (challengeToken: string, code: string) => {
    try {
      setIsLoading(true);
      const { data } = await api.post('/auth/login/2fa', { challengeToken, code });

      if (data.success) {
        completeSignIn(data.data, `Welcome back, ${data.data.user.firstName}!`);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'That code was not accepted.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    try {
      setIsLoading(true);
      const { data } = await api.post('/auth/register', payload);

      if (data.success) {
        const { user: userData, company: companyData, accessToken, refreshToken } = data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        setUser(userData);
        setCompany(companyData);

        toast.success('Registration successful! Welcome to InvoiceMaker.');
        router.push('/dashboard');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch (e) {
      // Ignore logout request errors
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setCompany(null);
      toast.success('Logged out successfully');
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        invoiceSettings: company?.invoiceSettings || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyTwoFactor,
        register,
        logout,
        refreshUser,
        // Default to allowed for a user whose payload predates the permission
        // map, so an older session never loses access it should still have.
        can: (permission: Permission) => user?.permissions?.[permission] ?? true
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
