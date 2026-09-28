"use client";

import React from "react";
import { AlertCircle, Clock, FileQuestion, Sparkles, UserX } from "lucide-react";
import Link from "next/link";

interface EmptyStateCardProps {
  type: "no_academic_data" | "no_prediction" | "not_linked" | "error";
  errorMessage?: string;
  onGeneratePrediction?: () => void;
  isGenerating?: boolean;
}

export default function EmptyStateCard({
  type,
  errorMessage,
  onGeneratePrediction,
  isGenerating = false,
}: EmptyStateCardProps) {
  if (type === "not_linked") {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mb-4">
          <UserX className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Student Profile Not Linked
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
          Your user account is authenticated, but is not currently associated with an institutional student profile record. Please contact your institutional administration.
        </p>
      </div>
    );
  }

  if (type === "no_academic_data") {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 mb-2">
          <FileQuestion className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          No Academic Telemetry Recorded Yet
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          Your institutional records (attendance, midterm exam scores, course study hours) have not yet been entered into EduGuard by your faculty or department registrar.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto">
          An academic evaluation is not currently available. Once telemetry is recorded, the predictive early-warning model will compute your risk score and feature breakdown.
        </p>
      </div>
    );
  }

  if (type === "no_prediction") {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Academic Telemetry Ready for Evaluation
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          Your academic records have been persisted, but an initial risk evaluation has not yet been computed for your profile.
        </p>
        {onGeneratePrediction && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onGeneratePrediction}
              disabled={isGenerating}
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? "Evaluating Telemetry..." : "Generate Risk Evaluation"}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Error state
  return (
    <div className="p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 mb-2">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200">
        Unable to Load Academic Risk Data
      </h2>
      <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
        {errorMessage || "An error occurred while connecting to the EduGuard analytics backend."}
      </p>
      <div className="pt-2">
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-rose-800 dark:text-rose-300 underline hover:no-underline inline-flex items-center gap-1.5"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Reload Portal</span>
        </Link>
      </div>
    </div>
  );
}
