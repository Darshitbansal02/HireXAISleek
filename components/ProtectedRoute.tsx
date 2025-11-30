"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "candidate" | "recruiter" | "admin";
  fallbackRoute?: string;
}

/**
 * ProtectedRoute Component
 * 
 * Wraps pages that require authentication and optionally a specific role.
 * Automatically redirects unauthenticated users or users without required role to login/fallback.
 * 
 * Usage:
 * ```tsx
 * <ProtectedRoute requiredRole="recruiter">
 *   <RecruiterDashboard />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredRole,
  fallbackRoute = "/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Check if authenticated
    if (!isAuthenticated) {
      router.push(fallbackRoute);
      return;
    }

    // Check if specific role is required
    if (requiredRole && user?.role !== requiredRole) {
      router.push(fallbackRoute);
      return;
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router, fallbackRoute]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated or role mismatch
  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null;
  }

  // Render children only when authenticated and role matches
  return <>{children}</>;
}
