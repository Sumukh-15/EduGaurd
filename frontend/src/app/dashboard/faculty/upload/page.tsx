"use client";

import React from "react";
import RoleGuard from "@/components/layout/RoleGuard";
import { Info, UploadCloud } from "lucide-react";

export default function FacultyDatasetUploadPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "admin"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-4">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Batch Dataset Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
            Authorized faculty and administrators may upload standardized CSV academic files (max 10MB) to ingest new cohort records and update institutional early-warning analytics.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Interactive drag-and-drop CSV uploader and progress tracking will be implemented in Phase 3 Sub-step 3.6.</span>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
