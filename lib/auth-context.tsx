"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api-client";

export interface User {
  id: number;
  email: string;
  role: "candidate" | "recruiter" | "admin";
  full_name?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName: string, role: "candidate" | "recruiter") => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Initialize auth state from localStorage to prevent logout on refresh
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");

        if (token) {
          try {
            // Restore token to API Client
            apiClient.setToken(token);

            // Fetch user details to confirm validity and get Role
            // This prevents the "Redirect to Login" issue on refresh
            const userData = await apiClient.getCurrentUser();

            if (mountedRef.current) {
              setUser(userData);
            }
          } catch (e) {
            console.error("Session restore failed", e);
            // If token is invalid/expired, clear it
            apiClient.clearAuth();
            localStorage.removeItem("auth_token");
          }
        }
      }

      if (mountedRef.current) {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    if (!mountedRef.current) return Promise.reject("Component unmounted");

    setIsLoading(true);
    setError(null);
    try {
      const { user: userData } = await apiClient.login({ email, password });
      if (mountedRef.current) {
        setUser(userData);
      }
      return userData;
    } catch (err: any) {
      const message = err.message || "Login failed";
      if (mountedRef.current) {
        setError(message);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const register = async (email: string, password: string, fullName: string, role: "candidate" | "recruiter") => {
    if (!mountedRef.current) return Promise.reject("Component unmounted");

    setIsLoading(true);
    setError(null);
    try {
      const { user: userData } = await apiClient.register({
        email,
        password,
        full_name: fullName,
        role,
      });
      if (mountedRef.current) {
        setUser(userData);
      }
      return userData;
    } catch (err: any) {
      const message = err.message || "Registration failed";
      if (mountedRef.current) {
        setError(message);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const logout = () => {
    apiClient.clearAuth();
    if (mountedRef.current) {
      setUser(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
