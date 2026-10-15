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
      className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/10 shadow-xs space-y-6"
    >
      {/* Success Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-ink/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-softgreen text-edugreen flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-edugreen block">
              Ingestion committed (HTTP 201)
            </span>
            <h2 id="upload-success-heading" className="text-xl font-display text-ink mt-0.5">
              Dataset Ingested Successfully
            </h2>
            <p className="text-xs text-ink/65 font-mono mt-0.5">
              File: <strong className="text-ink">{result.filename}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="py-2 px-3.5 rounded-xl bg-paper hover:bg-paper/80 border border-ink/10 text-ink text-xs font-medium transition-all duration-200 inline-flex items-center gap-2 self-start sm:self-auto btn-interactive"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Upload Another Dataset</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className={`grid grid-cols-1 ${hasPredictions ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-4`}>
        {/* Total Validated Rows */}
        <div className="p-4 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
          <div className="flex items-center justify-between mb-1 text-ink-muted">
            <span className="text-xs font-medium">Rows validated</span>
            <FileCheck className="w-4 h-4 text-edugreen" />
          </div>
          <p className="text-2xl font-sans font-bold tabular-nums text-ink">
            {result.total_rows}
          </p>
          <span className="text-[10px] text-ink/50">Total CSV data rows</span>
        </div>

        {/* Academic Records Created */}
        <div className="p-4 rounded-xl bg-softgreen/60 border border-edugreen/30 hover:border-edugreen/50 transition-colors">
          <div className="flex items-center justify-between mb-1 text-edugreen">
            <span className="text-xs font-medium">Records persisted</span>
            <CheckCircle className="w-4 h-4 text-edugreen" />
          </div>
          <p className="text-2xl font-sans font-bold tabular-nums text-ink">
            {result.records_created}
          </p>
          <span className="text-[10px] text-edugreen font-medium">Academic telemetry rows</span>
        </div>

        {/* New Students Created */}
        <div className="p-4 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
          <div className="flex items-center justify-between mb-1 text-ink-muted">
            <span className="text-xs font-medium">Students provisioned</span>
            <Users className="w-4 h-4 text-ink" />
          </div>
          <p className="text-2xl font-sans font-bold tabular-nums text-ink">
            {result.students_created}
          </p>
          <span className="text-[10px] text-ink/50">New student identities</span>
        </div>

        {/* Predictions Created (if generated) */}
        {hasPredictions && (
          <div className="p-4 rounded-xl bg-softgreen/40 border border-edugreen/25 hover:border-edugreen/40 transition-colors">
            <div className="flex items-center justify-between mb-1 text-edugreen">
              <span className="text-xs font-medium">Predictions created</span>
              <Brain className="w-4 h-4 text-edugreen" />
            </div>
            <p className="text-2xl font-sans font-bold tabular-nums text-ink">
              {result.predictions_created}
            </p>
            <span className="text-[10px] text-edugreen font-medium">Inference + SHAP rows</span>
          </div>
        )}
      </div>

      {/* Backend Confirmation Message */}
      <div className="p-4 rounded-xl bg-paper border border-ink/10">
        <p className="text-xs text-ink/75 font-medium">
          {result.message}
        </p>
      </div>

      {/* Risk Summary Cards (if predictions generated) */}
      {hasPredictions && result.risk_summary && (
        <div className="p-5 rounded-2xl bg-paper border border-ink/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-display text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-edugreen" />
              <span>Class Risk Distribution Breakdown</span>
            </h3>
            <span className="text-xs font-medium text-ink-muted tabular-nums">
              {result.predictions_created} total evaluated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Low Risk */}
            <div className="p-4 rounded-xl bg-softgreen/80 border border-edugreen/30 text-center shadow-xs hover:border-edugreen/50 transition-colors">
              <span className="text-xs font-medium text-edugreen block">
                Low risk
              </span>
              <p className="text-2xl font-sans font-bold tabular-nums text-ink mt-1">
                {result.risk_summary.low ?? 0}
              </p>
              <span className="text-[10px] text-edugreen font-mono">
                p &lt; 0.40
              </span>
            </div>

            {/* Medium Risk */}
            <div className="p-4 rounded-xl bg-amber/15 border border-amber/30 text-center shadow-xs hover:border-amber/50 transition-colors">
              <span className="text-xs font-medium text-amber-800 block">
                Medium risk
              </span>
              <p className="text-2xl font-sans font-bold tabular-nums text-ink mt-1">
                {result.risk_summary.medium ?? 0}
              </p>
              <span className="text-[10px] text-amber-800 font-mono">
                0.40 ≤ p &lt; 0.70
              </span>
            </div>

            {/* High Risk */}
            <div className="p-4 rounded-xl bg-coral/15 border border-coral/30 text-center shadow-xs hover:border-coral/50 transition-colors">
              <span className="text-xs font-medium text-coral block">
                High risk
              </span>
              <p className="text-2xl font-sans font-bold tabular-nums text-ink mt-1">
                {result.risk_summary.high ?? 0}
              </p>
              <span className="text-[10px] text-coral font-mono">
                p ≥ 0.70
              </span>
            </div>
          </div>

          {/* Primary Action Button: View updated class risk distribution */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-ink/10">
            <span className="text-xs text-ink/65">
              Predictions and SHAP factor attributions are now live on your faculty dashboard.
            </span>
            <Link
              href="/dashboard/faculty"
              id="view-updated-class-risk-distribution-btn"
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-edugreen hover:bg-edugreen/90 active:scale-[0.99] text-white text-xs font-medium shadow-xs transition-all duration-200 inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen flex-shrink-0 btn-interactive"
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
          className="p-4 rounded-xl bg-amber/10 border border-amber/30 text-xs text-amber-900 flex items-start gap-3 leading-relaxed"
        >
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold mb-0.5">
              Architecture Notice: Telemetry Ingestion Complete — No Predictions Generated
            </strong>
            <span className="text-ink/75">
              The CSV ingestion pipeline recorded student academic telemetry in PostgreSQL without automatic inference. Machine learning risk assessments and SHAP explanations can be evaluated on-demand via the Direct Student Review workflow or by enabling the prediction checkbox on upload.
            </span>
          </div>
        </div>
      )}

      {/* Post-Upload Navigation Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Link
          href="/dashboard/faculty"
          className="p-4 rounded-xl bg-paper hover:border-edugreen/30 border border-ink/10 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">
                View Updated Cohort Analytics
              </p>
              <p className="text-[11px] text-ink/50">
                Institutional aggregate population charts
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink/40 group-hover:translate-x-0.5 group-hover:text-edugreen transition-all" />
        </Link>

        <Link
          href="/dashboard/faculty/review"
          className="p-4 rounded-xl bg-paper hover:border-edugreen/30 border border-ink/10 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">
                Review Student by ID
              </p>
              <p className="text-[11px] text-ink/50">
                Inspect records &amp; evaluate predictions
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink/40 group-hover:translate-x-0.5 group-hover:text-edugreen transition-all" />
        </Link>
      </div>
    </section>
  );
}
