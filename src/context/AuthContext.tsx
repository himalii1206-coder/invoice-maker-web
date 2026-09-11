'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Company } from '../types/index';
import { api } from '../lib/api';
import { toast } from 'react-toastify';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

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

  const login = async (credentials: any) => {
    try {
      setIsLoading(true);
      const { data } = await api.post('/auth/login', credentials);

      if (data.success) {
        const { user: userData, company: companyData, accessToken, refreshToken } = data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        setUser(userData);
        setCompany(companyData);

        toast.success(`Welcome back, ${userData.firstName}!`);
        router.push('/dashboard');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please check credentials.';
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
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser
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
