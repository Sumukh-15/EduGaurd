"use client";

import React from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import { Clock, Info } from "lucide-react";

export default function StudentHistoryPage() {
  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-4">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Academic History & Risk Trajectory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
            This module provides a chronological view of your semester records, historical attendance trends, and past risk assessments computed by the EduGuard ML pipeline.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Interactive timeline and charts will be implemented in Phase 3 Sub-step 3.3.</span>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
