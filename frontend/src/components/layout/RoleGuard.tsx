"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";
import { ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Route protection guard for dashboard views.
 *
 * Enforces role-based boundaries on client views:
 * - Unauthenticated users -> /login
 * - Students accessing faculty routes -> /dashboard/student
 * - Faculty/Admin accessing student routes -> /dashboard/faculty
 *
 * NOTE: The FastAPI backend remains authoritative for all data security boundaries.
 */
export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      if (user.role === "student") {
        router.replace("/dashboard/student");
      } else {
        router.replace("/dashboard/faculty");
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  // Loading state while session hydrates from client storage and /api/auth/me
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Unauthorized role
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Your account role ({user.role}) does not have permission to view this section. Redirecting to your portal...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
