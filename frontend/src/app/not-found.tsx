"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Home,
  LogIn,
  Shield,
} from "lucide-react";

export default function NotFound() {
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
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main 404 Hero */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="max-w-md w-full text-center">
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-3xl bg-softgreen animate-pulse" />
            <div className="relative w-full h-full rounded-3xl bg-white border border-edugreen/30 flex items-center justify-center shadow-xs">
              <Compass className="w-10 h-10 text-edugreen" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-softgreen text-edugreen-dark border border-softgreen-border text-xs font-bold uppercase tracking-wider mb-3">
            Error 404 • Page Not Found
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
            Lost in the Curricula?
          </h1>

          <p className="mt-3 text-sm text-ink-muted leading-relaxed">
            We couldn&apos;t find the page you were looking for. It may have been moved, renamed, or
            requires institutional authentication.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Home className="w-3.5 h-3.5" />
              Return to Home
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-paper border border-ink/12 text-ink text-xs font-semibold shadow-xs transition-all"
            >
              <LogIn className="w-3.5 h-3.5 text-edugreen" />
              Sign In to Portal
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-ink/8 text-xs text-ink-muted">
            Need methodology details? Read our{" "}
            <Link href="/about" className="text-edugreen hover:underline font-semibold">
              About &amp; Research Documentation
            </Link>
            .
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-ink/8 bg-white/60 text-center text-xs text-ink-muted">
        <p>© EduGuard Academic Risk Early-Warning Platform. Transparent &amp; Supportive Decision Support.</p>
      </footer>
    </div>
  );
}
