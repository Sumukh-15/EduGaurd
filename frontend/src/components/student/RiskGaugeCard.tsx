"use client";

import React from "react";
import { AlertTriangle, CheckCircle, Clock, Cpu, ShieldAlert } from "lucide-react";
import { PredictionHistoryItem } from "@/types/student";

interface RiskGaugeCardProps {
  prediction: PredictionHistoryItem;
  academicRecordId?: number | null;
  onRefreshFactors?: () => void;
  isRefreshing?: boolean;
}

export default function RiskGaugeCard({
  prediction,
  academicRecordId,
  onRefreshFactors,
  isRefreshing = false,
}: RiskGaugeCardProps) {
  const probPercent = Math.round(prediction.risk_probability * 1000) / 10;
  const isBinaryAtRisk = prediction.at_risk_binary === 1;

  // Format timestamp cleanly
  const formattedDate = new Date(prediction.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Strict Phase 2 Tiers
  // Low: prob < 0.40, Medium: 0.40 <= prob < 0.70, High: prob >= 0.70
  const tierConfig = {
    Low: {
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
      accentBg: "bg-emerald-500",
      textAccent: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle,
      description: "Academic telemetry reflects stable performance with low probability of course distress.",
    },
    Medium: {
      badgeBg: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
      accentBg: "bg-amber-500",
      textAccent: "text-amber-600 dark:text-amber-400",
      icon: AlertTriangle,
      description: "Moderate statistical risk identified. Timely academic check-ins and tutoring recommended.",
    },
    High: {
      badgeBg: "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
      accentBg: "bg-rose-600",
      textAccent: "text-rose-600 dark:text-rose-400",
      icon: ShieldAlert,
      description: "Elevated probability of academic failure. Comprehensive institutional support advised.",
    },
  }[prediction.risk_level] || {
    badgeBg: "bg-slate-50 border-slate-200 text-slate-700",
    accentBg: "bg-slate-500",
    textAccent: "text-slate-600",
    icon: CheckCircle,
    description: "Statistical risk level computed from recorded academic indicators.",
  };

  const TierIcon = tierConfig.icon;

  return (
    <section
      aria-labelledby="risk-summary-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
    >
      {/* Header with Title and Model Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Academic Risk Assessment
          </span>
          <h2 id="risk-summary-heading" className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Latest Evaluation Summary
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>Model {prediction.model_version}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <time dateTime={prediction.created_at}>{formattedDate}</time>
          </div>
        </div>
      </div>

      {/* Main Grid: Probability Score & Visual Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
        {/* Left Column: Metric Highlight (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${tierConfig.badgeBg}`}
              >
                <TierIcon className="w-3.5 h-3.5" />
                <span>{prediction.risk_level} Risk Tier</span>
              </span>

              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isBinaryAtRisk
                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900"
                }`}
              >
                {isBinaryAtRisk ? "At-Risk Flagged" : "On Track"}
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${tierConfig.textAccent}`}>
                  {probPercent}%
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Statistical Probability
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {tierConfig.description}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>
              <strong className="text-slate-700 dark:text-slate-300">Raw Probability:</strong>{" "}
              <span className="font-mono">{prediction.risk_probability.toFixed(4)}</span>
            </p>
            <p>
              <strong className="text-slate-700 dark:text-slate-300">Binary Classification:</strong>{" "}
              <span>{prediction.at_risk_binary} ({isBinaryAtRisk ? "At-Risk Threshold >= 0.50" : "Below 0.50 Threshold"})</span>
            </p>
            {academicRecordId && (
              <p>
                <strong className="text-slate-700 dark:text-slate-300">Associated Record:</strong>{" "}
                <span>Telemetry Record #{academicRecordId}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Visual Range Gauge with Threshold Marks (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-4 lg:pl-6 lg:border-l border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <span>Risk Probability Spectrum</span>
              <span className="font-mono text-slate-500">{probPercent}%</span>
            </div>

            {/* Threshold Progress Bar */}
            <div
              role="progressbar"
              aria-valuenow={probPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Risk probability ${probPercent}%`}
              className="relative w-full h-5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5"
            >
              {/* Threshold Zones Background */}
              <div className="absolute inset-0 flex">
                <div className="w-[40%] bg-emerald-500/15 border-r border-emerald-500/30" title="Low Risk Zone (< 40%)" />
                <div className="w-[30%] bg-amber-500/15 border-r border-amber-500/30" title="Medium Risk Zone (40% - 69%)" />
                <div className="w-[30%] bg-rose-500/15" title="High Risk Zone (>= 70%)" />
              </div>

              {/* Active Marker / Fill */}
              <div
                style={{ width: `${Math.min(Math.max(prediction.risk_probability * 100, 3), 100)}%` }}
                className={`relative h-full rounded-full transition-all duration-500 shadow-sm ${tierConfig.accentBg}`}
              />
            </div>

            {/* Threshold Labels */}
            <div className="relative mt-2 flex justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400">0% (Low &lt;40%)</span>
              <span className="text-amber-600 dark:text-amber-400 text-center">40% - 69% (Medium)</span>
              <span className="text-rose-600 dark:text-rose-400 text-right">70%+ (High)</span>
            </div>
          </div>

          {/* Contextual Notice */}
          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300">
            <p className="leading-relaxed">
              <strong>Non-Deterministic Guidance:</strong> Probability represents statistical risk estimation based on historical academic patterns, not an absolute academic outcome or personal verdict.
            </p>
          </div>

          {onRefreshFactors && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onRefreshFactors}
                disabled={isRefreshing}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline disabled:opacity-50"
              >
                {isRefreshing ? "Evaluating factors..." : "Re-evaluate / Refresh SHAP Factors"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
