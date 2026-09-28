"use client";

import React from "react";
import { AlertCircle, RefreshCw, Users, UsersRound } from "lucide-react";

interface AnalyticsEmptyStateProps {
  type: "no_students" | "no_evaluations" | "error";
  errorMessage?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export default function AnalyticsEmptyState({
  type,
  errorMessage,
  onRetry,
  isRetrying = false,
}: AnalyticsEmptyStateProps) {
  if (type === "no_students") {
    return (
      <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 mb-2">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          No Student Records Found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          The institutional database does not currently contain registered student records. Ingest cohort datasets via Dataset Management to initialize early-warning monitoring.
        </p>
      </div>
    );
  }

  if (type === "no_evaluations") {
    return (
      <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
          <UsersRound className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          No Student Evaluations Recorded Yet
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Enrolled students exist in the registry, but no ML risk evaluations have been computed yet. Risk distributions will populate as academic telemetry is evaluated.
        </p>
      </div>
    );
  }

  // Error State
  return (
    <div className="p-10 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 mb-1">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200">
        Unable to Load Faculty Analytics
      </h2>
      <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
        {errorMessage || "An error occurred while fetching cohort analytics from the FastAPI backend."}
      </p>
      {onRetry && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Reconnecting..." : "Retry Connection"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
