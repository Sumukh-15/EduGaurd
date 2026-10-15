"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Info,
  ShieldAlert,
} from "lucide-react";
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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const probPercent = Math.round(prediction.risk_probability * 1000) / 10;

  // Format timestamp cleanly
  const formattedDate = new Date(prediction.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Student-friendly tone and clear questions answered immediately:
  // 1. How am I doing?
  // 2. What is my current risk?
  const riskPresentations = {
    Low: {
      headline: "You're currently on track.",
      statusText: "Low Academic Risk",
      badgeBg: "bg-softgreen border-edugreen/30 text-edugreen",
      accentBg: "bg-edugreen",
      textAccent: "text-edugreen",
      icon: CheckCircle,
      guidance:
        "Your recent marks and attendance show steady academic progress. Keep up your current study habits and assignments.",
    },
    Medium: {
      headline: "Some academic indicators need attention.",
      statusText: "Medium Academic Risk",
      badgeBg: "bg-amber/15 border-amber/35 text-ink",
      accentBg: "bg-amber",
      textAccent: "text-amber",
      icon: AlertTriangle,
      guidance:
        "A few factors, such as recent quiz marks, attendance sessions, or weekly study time, suggest that timely review with an instructor or peer tutor could help you stay ahead.",
    },
    High: {
      headline:
        "Several indicators suggest that you may benefit from academic support.",
      statusText: "Elevated Risk",
      badgeBg: "bg-coral/15 border-coral/35 text-coral",
      accentBg: "bg-coral",
      textAccent: "text-coral",
      icon: ShieldAlert,
      guidance:
        "Your recent academic indicators indicate that extra coursework assistance, structured tutoring, or meeting with your faculty mentor will provide significant support.",
    },
  }[prediction.risk_level] || {
    headline: "Your risk assessment has been calculated.",
    statusText: `${prediction.risk_level} Risk`,
    badgeBg: "bg-paper border-ink/20 text-ink",
    accentBg: "bg-ink/60",
    textAccent: "text-ink",
    icon: CheckCircle,
    guidance: "Risk level assessed from your latest academic updates.",
  };

  const TierIcon = riskPresentations.icon;

  return (
    <section
      aria-labelledby="risk-summary-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface transition-all space-y-6"
    >
      {/* Header with Title and Timestamp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-ink/10">
        <div>
          <span className="text-xs font-medium text-ink-muted block">
            Academic assessment
          </span>
          <h2 id="risk-summary-heading" className="text-xl font-display text-ink mt-0.5 tracking-tight">
            How Am I Doing?
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-paper border border-ink/10 text-ink/60 text-xs">
            <Clock className="w-3.5 h-3.5 text-edugreen" />
            <span>Last updated: <time dateTime={prediction.created_at}>{formattedDate}</time></span>
          </div>
        </div>
      </div>

      {/* Main Answers: How am I doing? & What is my current risk? */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Direct Assessment Answer (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${riskPresentations.badgeBg}`}
              >
                <TierIcon className="w-3.5 h-3.5" />
                <span>{riskPresentations.statusText}</span>
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-display text-ink tracking-tight mt-1">
              &quot;{riskPresentations.headline}&quot;
            </h3>

            <p className="text-xs sm:text-sm text-ink/75 mt-2.5 leading-relaxed">
              {riskPresentations.guidance}
            </p>
          </div>

          {/* Model Estimate Advisory Note */}
          <div className="p-3.5 rounded-xl bg-paper border border-ink/10 text-xs text-ink/70 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-edugreen flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>About your risk score:</strong> This assessment is an early-warning estimate based on historical academic trends. It is not an absolute prediction of your final grades or academic outcome.
            </p>
          </div>
        </div>

        {/* Right Column: Visual Range Gauge (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-4 lg:pl-6 lg:border-l border-ink/10">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-semibold text-ink/80">
                Risk assessment level
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-sans font-bold tabular-nums ${riskPresentations.textAccent}`}>
                  {probPercent}%
                </span>
                <span className="text-[11px] text-ink/50">estimated risk</span>
              </div>
            </div>

            {/* Threshold Progress Bar */}
            <div
              role="progressbar"
              aria-valuenow={probPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Risk probability ${probPercent}%`}
              className="relative w-full h-5 rounded-full bg-paper border border-ink/10 overflow-hidden p-0.5"
            >
              {/* Threshold Zones Background */}
              <div className="absolute inset-0 flex">
                <div
                  className="w-[40%] bg-edugreen/15 border-r border-edugreen/30"
                  title="Low Risk Zone (< 40%)"
                />
                <div
                  className="w-[30%] bg-amber/15 border-r border-amber/30"
                  title="Medium Risk Zone (40% - 69%)"
                />
                <div
                  className="w-[30%] bg-coral/15"
                  title="High Risk Zone (>= 70%)"
                />
              </div>

              {/* Active Marker / Fill */}
              <div
                style={{ width: `${Math.min(Math.max(prediction.risk_probability * 100, 4), 100)}%` }}
                className={`relative h-full rounded-full transition-all duration-500 shadow-sm ${riskPresentations.accentBg}`}
              />
            </div>

            {/* Threshold Labels */}
            <div className="relative mt-2 flex justify-between text-[11px] font-medium">
              <span className="text-edugreen font-semibold">0% – 39% (On Track)</span>
              <span className="text-amber font-semibold text-center">40% – 69% (Attention)</span>
              <span className="text-coral font-semibold text-right">70%+ (Academic Support)</span>
            </div>
          </div>

          {onRefreshFactors && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onRefreshFactors}
                disabled={isRefreshing}
                className="text-xs font-semibold text-edugreen hover:text-edugreen-dark hover:underline disabled:opacity-50 transition-colors"
              >
                {isRefreshing ? "Recalculating..." : "Request updated assessment"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Optional Collapsible Technical Details Section */}
      <div className="pt-2 border-t border-ink/10">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-xs font-semibold text-ink/60 hover:text-ink inline-flex items-center gap-1.5 focus:outline-none transition-colors"
        >
          <span>Technical Details (Model &amp; Classification)</span>
          {showTechnicalDetails ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="mt-3 p-4 rounded-xl bg-paper border border-ink/10 text-xs text-ink/80 space-y-1.5 animate-in fade-in duration-150">
            <p className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-edugreen flex-shrink-0" />
              <span>
                <strong>Model Version:</strong> Logistic Regression Pipeline ({prediction.model_version})
              </span>
            </p>
            <p>
              <strong>Exact Statistical Probability:</strong>{" "}
              <span className="font-mono text-ink font-semibold">{prediction.risk_probability.toFixed(4)}</span>
            </p>
            <p>
              <strong>Binary Classification Output:</strong>{" "}
              <span className="font-medium">{prediction.at_risk_binary} (Decision threshold: 0.50)</span>
            </p>
            {academicRecordId && (
              <p>
                <strong>Underlying Academic Record ID:</strong> #{academicRecordId}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
