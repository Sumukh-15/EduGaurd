"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Route index for /dashboard.
 * Redirects user to their appropriate dashboard subpath based on active role.
 */
export default function DashboardIndexPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
    } else if (user.role === "student") {
      router.replace("/dashboard/student");
    } else {
      router.replace("/dashboard/faculty");
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Navigating to role portal...
      </p>
    </div>
  );
}
