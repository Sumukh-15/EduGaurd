"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle,
  FileCheck,
  RotateCcw,
  Shield,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { DatasetUploadResponse } from "@/types/dataset";

interface DatasetUploadResultCardProps {
  result: DatasetUploadResponse;
  onReset: () => void;
}

export default function DatasetUploadResultCard({
  result,
  onReset,
}: DatasetUploadResultCardProps) {
  const hasPredictions = typeof result.predictions_created === "number" && result.predictions_created > 0;

  return (
    <section
      aria-labelledby="upload-success-heading"
      className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-6"
    >
      {/* Success Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-emerald-100 dark:border-emerald-950">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Ingestion Committed (HTTP 201)
            </span>
            <h2 id="upload-success-heading" className="text-xl font-bold text-slate-900 dark:text-white">
              Dataset Ingested Successfully
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              File: <strong className="text-slate-800 dark:text-slate-200">{result.filename}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Upload Another Dataset</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className={`grid grid-cols-1 ${hasPredictions ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-4`}>
        {/* Total Validated Rows */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1 text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rows Validated</span>
            <FileCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {result.total_rows}
          </p>
          <span className="text-[10px] text-slate-400">Total CSV data rows</span>
        </div>

        {/* Academic Records Created */}
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
          <div className="flex items-center justify-between mb-1 text-emerald-700 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Records Persisted</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">
            {result.records_created}
          </p>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">Academic telemetry rows</span>
        </div>

        {/* New Students Created */}
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60">
          <div className="flex items-center justify-between mb-1 text-indigo-700 dark:text-indigo-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Students Provisioned</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-200">
            {result.students_created}
          </p>
          <span className="text-[10px] text-indigo-700/80 dark:text-indigo-400">New student identities</span>
        </div>

        {/* Predictions Created (if generated) */}
        {hasPredictions && (
          <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60">
            <div className="flex items-center justify-between mb-1 text-purple-700 dark:text-purple-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Predictions Created</span>
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-extrabold text-purple-900 dark:text-purple-200">
              {result.predictions_created}
            </p>
            <span className="text-[10px] text-purple-700/80 dark:text-purple-400">Inference + SHAP rows</span>
          </div>
        )}
      </div>

      {/* Backend Confirmation Message */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {result.message}
        </p>
      </div>

      {/* Risk Summary Cards (if predictions generated) */}
      {hasPredictions && result.risk_summary && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/20 to-purple-50/20 dark:from-slate-850 dark:via-indigo-950/20 dark:to-purple-950/20 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Class Risk Distribution Breakdown</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {result.predictions_created} total evaluated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Low Risk */}
            <div className="p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-900/60 text-center shadow-sm">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Low Risk
              </span>
              <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">
                {result.risk_summary.low ?? 0}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400/90 font-mono">
                p &lt; 0.40
              </span>
            </div>

            {/* Medium Risk */}
            <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900/60 text-center shadow-sm">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                Medium Risk
              </span>
              <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">
                {result.risk_summary.medium ?? 0}
              </p>
              <span className="text-[10px] text-amber-600 dark:text-amber-400/90 font-mono">
                0.40 ≤ p &lt; 0.70
              </span>
            </div>

            {/* High Risk */}
            <div className="p-4 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-900/60 text-center shadow-sm">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                High Risk
              </span>
              <p className="text-2xl font-extrabold text-rose-900 dark:text-rose-200 mt-1">
                {result.risk_summary.high ?? 0}
              </p>
              <span className="text-[10px] text-rose-600 dark:text-rose-400/90 font-mono">
                p ≥ 0.70
              </span>
            </div>
          </div>

          {/* Primary Action Button: View updated class risk distribution */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Predictions and SHAP factor attributions are now live on your faculty dashboard.
            </span>
            <Link
              href="/dashboard/faculty"
              id="view-updated-class-risk-distribution-btn"
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 flex-shrink-0"
            >
              <BarChart3 className="w-4 h-4" />
              <span>View updated class risk distribution</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Mandatory Invariant Callout when NO predictions generated */}
      {!hasPredictions && (
        <div
          role="note"
          aria-label="No predictions generated disclaimer"
          className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 leading-relaxed"
        >
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold mb-0.5">
              Architecture Notice: Telemetry Ingestion Complete — No Predictions Generated
            </strong>
            <span>
              The CSV ingestion pipeline recorded student academic telemetry in PostgreSQL without automatic inference. Machine learning risk assessments and SHAP explanations can be evaluated on-demand via the Direct Student Review workflow or by enabling the prediction checkbox on upload.
            </span>
          </div>
        </div>
      )}

      {/* Post-Upload Navigation Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Link
          href="/dashboard/faculty"
          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                View Updated Cohort Analytics
              </p>
              <p className="text-[11px] text-slate-400">
                Institutional aggregate population charts
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-indigo-600 transition-all" />
        </Link>

        <Link
          href="/dashboard/faculty/review"
          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Review Student by ID
              </p>
              <p className="text-[11px] text-slate-400">
                Inspect records &amp; evaluate predictions
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-600 transition-all" />
        </Link>
      </div>
    </section>
  );
}
