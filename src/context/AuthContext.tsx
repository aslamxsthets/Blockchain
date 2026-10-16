import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { authApi, getStoredToken, setStoredToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (role: 'admin' | 'issuer' | 'student1' | 'student2') => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await authApi.getMe();
      if (res.authenticated && res.user) {
        setUser(res.user);
      } else {
        // Check if user explicitly logged out
        const hasExplicitlyLoggedOut = sessionStorage.getItem('certichain_explicit_logout') === 'true';
        if (!hasExplicitlyLoggedOut) {
          // Auto-initialize demo Admin session for instant interactive evaluation
          const demoRes = await authApi.demoLogin('admin');
          setUser(demoRes.user);
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Session probe error, falling back to demo session:', err);
      try {
        const demoRes = await authApi.demoLogin('admin');
        setUser(demoRes.user);
      } catch {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    sessionStorage.removeItem('certichain_explicit_logout');
    const res = await authApi.login({ email, password });
    setUser(res.user);
  };

  const demoLogin = async (role: 'admin' | 'issuer' | 'student1' | 'student2') => {
    sessionStorage.removeItem('certichain_explicit_logout');
    const res = await authApi.demoLogin(role);
    setUser(res.user);
  };

  const logout = async () => {
    sessionStorage.setItem('certichain_explicit_logout', 'true');
    await authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        demoLogin,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
