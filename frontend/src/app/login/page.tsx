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
      } else if (user.role === "admin") {
        router.replace("/dashboard/admin");
      } else {
        router.replace("/dashboard/faculty");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 bg-paper text-ink">
      {isExpired && (
        <div
          role="status"
          className="mb-4 w-full max-w-md p-3.5 bg-amber-soft border border-amber/30 rounded-2xl text-amber text-xs font-semibold text-center shadow-xs"
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
        <div className="min-h-screen flex items-center justify-center bg-paper">
          <div className="w-8 h-8 border-4 border-edugreen border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
