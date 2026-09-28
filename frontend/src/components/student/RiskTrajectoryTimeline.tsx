"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Info,
  ShieldAlert,
} from "lucide-react";
import { PredictionHistoryItem } from "@/types/student";

interface RiskTrajectoryTimelineProps {
  predictions: PredictionHistoryItem[];
}

export default function RiskTrajectoryTimeline({ predictions }: RiskTrajectoryTimelineProps) {
  if (predictions.length === 0) {
    return (
      <section
        aria-labelledby="risk-timeline-heading"
        className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 mb-1">
          <Clock className="w-6 h-6" />
        </div>
        <h2 id="risk-timeline-heading" className="text-base font-bold text-slate-900 dark:text-white">
          No Historical Evaluations Recorded
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          No machine learning risk assessments have been computed for your profile yet. Historical risk evaluations will appear here chronologically as academic telemetry is evaluated.
        </p>
      </section>
    );
  }

  const tierStyles = {
    Low: {
      badge:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      accent: "bg-emerald-500",
      icon: CheckCircle,
    },
    Medium: {
      badge:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      accent: "bg-amber-500",
      icon: AlertTriangle,
    },
    High: {
      badge:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      accent: "bg-rose-600",
      icon: ShieldAlert,
    },
  };

  return (
    <section
      aria-labelledby="risk-timeline-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Model Forecast Sequence
          </span>
          <h2 id="risk-timeline-heading" className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Risk Evaluation Trajectory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Sequential progression of historical machine learning risk assessments computed across academic evaluation periods.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>{predictions.length} Total Evaluation{predictions.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Sequential Stepper Overview (Horizontal scroll for multiple evaluations) */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-3 min-w-max">
          {predictions.map((pred, i) => {
            const config = tierStyles[pred.risk_level] || tierStyles.Low;
            const probPct = Math.round(pred.risk_probability * 1000) / 10;
            const isLast = i === predictions.length - 1;

            return (
              <React.Fragment key={pred.id}>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 min-w-[150px]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Eval #{i + 1}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${config.badge}`}
                    >
                      {pred.risk_level}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-900 dark:text-white">
                      {probPct}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (prob)
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    {new Date(pred.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {!isLast && (
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detailed Chronological Evaluation Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Chronological Evaluation Details (Earlier → Later)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {predictions.map((pred, idx) => {
            const config = tierStyles[pred.risk_level] || tierStyles.Low;
            const Icon = config.icon;
            const probPct = Math.round(pred.risk_probability * 1000) / 10;
            const isBinaryAtRisk = pred.at_risk_binary === 1;

            return (
              <div
                key={pred.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Evaluation Record #{pred.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badge} inline-flex items-center gap-1`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{pred.risk_level}</span>
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isBinaryAtRisk
                          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900"
                      }`}
                    >
                      {isBinaryAtRisk ? "At-Risk" : "Safe"}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Assessed Probability
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {probPct}%
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Model Ingested
                    </span>
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                      {pred.model_version}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 font-mono">
                  <span>Inference Timestamp:</span>
                  <time dateTime={pred.created_at}>
                    {new Date(pred.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Descriptive Advisory Callout */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Descriptive Notice:</strong> Risk trajectory reflects model assessments computed at discrete points in time. Variations reflect shifts in observed academic telemetry and do not constitute causal proof of intervention efficacy.
        </span>
      </div>
    </section>
  );
}
