"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, Home, RefreshCw, Shield } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected errors for telemetry
    console.error("EduGuard UI Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-mint selection:text-ink">
      {/* Header */}
      <header className="border-b border-ink/8 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-edugreen flex items-center justify-center text-white shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-ink">EduGuard</span>
          </Link>
        </div>
      </header>

      {/* Main Error Card */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="max-w-md w-full text-center">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="w-full h-full rounded-3xl bg-coral-soft border border-coral/30 flex items-center justify-center shadow-xs">
              <AlertOctagon className="w-9 h-9 text-coral" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral-soft text-coral border border-coral/25 text-xs font-bold uppercase tracking-wider mb-3">
            System Notice
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
            Something went unexpectedly wrong
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-ink-muted leading-relaxed">
            EduGuard encountered an unexpected rendering error. Your data and session credentials
            remain secure.
          </p>

          {error?.message && (
            <div className="mt-4 p-3 rounded-xl bg-white border border-ink/8 text-left text-[11px] font-mono text-ink-muted break-all max-h-24 overflow-y-auto">
              {error.message}
            </div>
          )}

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-paper border border-ink/12 text-ink text-xs font-semibold shadow-xs transition-all"
            >
              <Home className="w-3.5 h-3.5 text-edugreen" />
              Return Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-ink/8 bg-white/60 text-center text-xs text-ink-muted">
        <p>© EduGuard Early-Warning Platform. Safe recovery boundary active.</p>
      </footer>
    </div>
  );
}
