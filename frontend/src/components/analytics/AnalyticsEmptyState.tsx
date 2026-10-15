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
      <div className="p-10 rounded-2xl bg-white border border-ink/10 shadow-xs text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-paper border border-ink/10 text-ink mb-2">
          <Users className="w-7 h-7 text-ink/70" />
        </div>
        <h2 className="text-xl font-display font-normal text-ink">
          No Student Records Found
        </h2>
        <p className="text-sm text-ink/65 max-w-md mx-auto leading-relaxed">
          The institutional database does not currently contain registered student records. Ingest cohort datasets via Dataset Management to initialize early-warning monitoring.
        </p>
      </div>
    );
  }

  if (type === "no_evaluations") {
    return (
      <div className="p-10 rounded-2xl bg-white border border-ink/10 shadow-xs text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-softgreen text-edugreen border border-edugreen/30 mb-2">
          <UsersRound className="w-7 h-7 text-edugreen" />
        </div>
        <h2 className="text-xl font-display font-normal text-ink">
          No Student Evaluations Recorded Yet
        </h2>
        <p className="text-sm text-ink/65 max-w-md mx-auto leading-relaxed">
          Enrolled students exist in the registry, but no ML risk evaluations have been computed yet. Risk distributions will populate as academic telemetry is evaluated.
        </p>
      </div>
    );
  }

  // Error State
  return (
    <div className="p-10 rounded-2xl bg-coral/5 border border-coral/30 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-coral/15 text-coral mb-1">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-display font-normal text-coral">
        Unable to Load Faculty Analytics
      </h2>
      <p className="text-xs text-ink/70 max-w-md mx-auto">
        {errorMessage || "An error occurred while fetching cohort analytics from the FastAPI backend."}
      </p>
      {onRetry && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="btn-interactive py-2.5 px-5 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Reconnecting..." : "Retry Connection"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
