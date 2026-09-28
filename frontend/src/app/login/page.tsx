"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoginForm from "@/components/auth/LoginForm";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, isLoading } = useAuth();
  const isExpired = searchParams.get("expired") === "1";

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "student") {
        router.replace("/dashboard/student");
      } else {
        router.replace("/dashboard/faculty");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);


  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      {isExpired && (
        <div
          role="status"
          className="mb-4 w-full max-w-md p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs font-medium text-center shadow-sm"
        >
          Your session has expired. Please sign in again to continue.
        </div>
      )}
      <LoginForm />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
