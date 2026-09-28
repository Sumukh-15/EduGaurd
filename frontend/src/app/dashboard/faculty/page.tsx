"use client";

import React from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, BarChart3, UploadCloud, UserCheck } from "lucide-react";
import Link from "next/link";

export default function FacultyDashboardPage() {
  const { user } = useAuth();

  const roleTitle = user?.role === "admin" ? "Institutional Administrator" : "Faculty Member";

  return (
    <RoleGuard allowedRoles={["faculty", "admin"]}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-700/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold mb-2">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{roleTitle} Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Welcome back, {user?.full_name}
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-xl">
                EduGuard Decision Support System allows faculty and administrators to monitor population risk distributions and inspect targeted student interventions.
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-xl text-right backdrop-blur-sm self-start sm:self-auto">
              <p className="text-[11px] text-indigo-200 uppercase tracking-wider font-semibold">
                Account Status
              </p>
              <p className="text-sm font-semibold text-white">
                Authorized Faculty Access
              </p>
            </div>
          </div>
        </div>

        {/* Milestone Notice */}
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">
              Phase 3 Sub-step 3.2 — Application Shell & RBAC Active
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Live population risk charts and cohort statistics will be implemented in Sub-step 3.4.
            </p>
          </div>
        </div>

        {/* Navigation Shortcut Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard/faculty/review"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Student Review
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                Direct ID Lookup
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Inspect specific student records by entering a known student ID (not a student directory).
            </p>
          </Link>

          <Link
            href="/dashboard/faculty/upload"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Dataset Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload institutional CSV datasets to ingest student academic records and update cohort metrics.
            </p>
          </Link>
        </div>
      </div>
    </RoleGuard>
  );
}
