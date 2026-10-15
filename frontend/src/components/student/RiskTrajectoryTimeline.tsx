"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Info,
  ShieldAlert,
  TrendingDown,
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
        className="p-6 rounded-2xl bg-white border border-ink/10 shadow-xs text-center space-y-3"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-paper border border-ink/10 text-ink/60 mb-1">
          <Clock className="w-6 h-6" />
        </div>
        <h2 id="risk-timeline-heading" className="text-base font-heading font-extrabold text-ink">
          No Historical Risk Assessments Recorded
        </h2>
        <p className="text-xs text-ink/65 max-w-md mx-auto leading-relaxed">
          No previous risk assessments have been calculated yet. As new assessment scores and study updates are recorded, your risk trajectory over time will appear here.
        </p>
      </section>
    );
  }

  const tierStyles = {
    Low: {
      badge: "bg-softgreen text-edugreen border-edugreen/30",
      accent: "bg-edugreen",
      icon: CheckCircle,
    },
    Medium: {
      badge: "bg-amber/15 text-ink border-amber/35",
      accent: "bg-amber",
      icon: AlertTriangle,
    },
    High: {
      badge: "bg-coral/15 text-coral border-coral/30",
      accent: "bg-coral",
      icon: ShieldAlert,
    },
  };

  // Check if risk decreased in recent evaluations
  let hasInterventionImprovement = false;
  if (predictions.length >= 2) {
    const latest = predictions[predictions.length - 1];
    const previous = predictions[predictions.length - 2];
    if (latest.risk_probability < previous.risk_probability - 0.05) {
      hasInterventionImprovement = true;
    }
  }

  return (
    <section
      aria-labelledby="risk-timeline-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink/10">
        <div>
          <span className="text-xs font-semibold text-ink/50 uppercase tracking-wider block">
            Progress Over Time
          </span>
          <h2 id="risk-timeline-heading" className="text-xl font-bold text-ink mt-0.5 tracking-tight">
            Risk Assessment Trajectory
          </h2>
          <p className="text-xs text-ink/60 mt-1 max-w-xl leading-relaxed">
            Progression of your estimated risk levels across academic evaluations.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper border border-ink/10 text-xs font-semibold text-ink/70 self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-edugreen" />
          <span>{predictions.length} Total Assessment{predictions.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Intervention Loop Success Notice (if risk decreased) */}
      {hasInterventionImprovement && (
        <div className="p-4 rounded-xl bg-softgreen border border-edugreen/30 text-ink text-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white text-edugreen flex-shrink-0 shadow-xs">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <strong className="block font-semibold text-edugreen">Positive Academic Progression:</strong>
            <span className="text-ink/80">Risk decreased after subsequent academic updates and faculty guidance.</span>
          </div>
        </div>
      )}

      {/* Sequential Stepper Overview */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-3 min-w-max">
          {predictions.map((pred, i) => {
            const config = tierStyles[pred.risk_level] || tierStyles.Low;
            const probPct = Math.round(pred.risk_probability * 1000) / 10;
            const isLast = i === predictions.length - 1;

            return (
              <React.Fragment key={pred.id}>
                <div className="p-3.5 rounded-xl border border-ink/10 bg-paper min-w-[160px]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/45">
                      Assessment #{i + 1}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${config.badge}`}
                    >
                      {pred.risk_level} Risk
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-ink">
                      {probPct}%
                    </span>
                    <span className="text-[10px] text-ink/45">
                      risk
                    </span>
                  </div>

                  <p className="text-[10px] text-ink/45 font-mono mt-1">
                    {new Date(pred.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {!isLast && (
                  <ArrowRight className="w-4 h-4 text-ink/30 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detailed Chronological Evaluation Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
          Chronological Assessment Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {predictions.map((pred, idx) => {
            const config = tierStyles[pred.risk_level] || tierStyles.Low;
            const Icon = config.icon;
            const probPct = Math.round(pred.risk_probability * 1000) / 10;

            return (
              <div
                key={pred.id}
                className="p-4 rounded-xl border border-ink/10 bg-white shadow-sm paper-surface flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-paper border border-ink/10 text-ink flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-ink">
                      Assessment Record #{pred.id}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badge} inline-flex items-center gap-1`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{pred.risk_level} Risk</span>
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-ink/10">
                  <div>
                    <span className="text-[10px] text-ink/45 uppercase tracking-wider block">
                      Assessed Risk Level
                    </span>
                    <span className="text-xl font-extrabold text-ink font-mono">
                      {probPct}%
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-ink/45 uppercase tracking-wider block">
                      Assessment Date
                    </span>
                    <span className="text-xs text-ink/75">
                      {new Date(pred.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advisory Callout */}
      <div className="p-3.5 rounded-xl bg-paper border border-ink/10 flex items-start gap-2.5 text-xs text-ink/70">
        <Info className="w-4 h-4 text-edugreen flex-shrink-0 mt-0.5" />
        <span>
          <strong>About your risk trajectory:</strong> Changes in your risk score over time reflect shifts in observed assessment marks, attendance records, and study habits. They demonstrate how proactive adjustments can help keep you on track.
        </span>
      </div>
    </section>
  );
}
