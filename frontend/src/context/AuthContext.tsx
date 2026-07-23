import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setClientToken } from '../api/client';

export interface User {
  id: number;
  email: string;
  name?: string;
  created_at?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name?: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync token with API client whenever it changes
  useEffect(() => {
    setClientToken(token);
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      setToken(response.token);
      setCurrentUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await api.post<AuthResponse>('/auth/register', { email, password, name });
      setToken(response.token);
      setCurrentUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
