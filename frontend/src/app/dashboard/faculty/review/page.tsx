"use client";

import React from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import { Info, Search, UserCheck } from "lucide-react";

export default function FacultyStudentReviewPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "admin"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-4">
            <UserCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Direct Student ID Lookup
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
            Authorized faculty and administrators may inspect individual student trajectories and SHAP risk factor breakdowns by looking up a specific student ID directly.
          </p>

          <div className="mt-8 max-w-md mx-auto p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 mb-2">
              <Search className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Direct ID Workflow
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-left">
              In accordance with institutional privacy standards and the locked Phase 2 API contract, EduGuard does not enumerate student directories. Faculty inspect targeted students via direct numeric ID entry.
            </p>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Interactive student ID search & inspection interface will be implemented in Phase 3 Sub-step 3.5.</span>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
