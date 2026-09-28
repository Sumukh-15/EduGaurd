"use client";

import React from "react";
import { AlertTriangle, CheckCircle, Info, ShieldAlert } from "lucide-react";
import { RiskDistribution, RiskPercentages } from "@/types/analytics";

interface RiskDistributionChartProps {
  distribution: RiskDistribution;
  percentages: RiskPercentages;
  evaluatedCount: number;
}

export default function RiskDistributionChart({
  distribution,
  percentages,
  evaluatedCount,
}: RiskDistributionChartProps) {
  const lowPct = evaluatedCount > 0 ? percentages.low : 0;
  const medPct = evaluatedCount > 0 ? percentages.medium : 0;
  const highPct = evaluatedCount > 0 ? percentages.high : 0;

  return (
    <section
      aria-labelledby="risk-distribution-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Population Stratification
            </span>
            <h2 id="risk-distribution-heading" className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              Risk Triage Distribution
            </h2>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {evaluatedCount} Evaluated Students
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
          Authoritative categorization of the active student cohort into operational triage tiers using Phase 1 Logistic Regression risk probability thresholds.
        </p>
      </div>

      {/* Segmented Distribution Bar */}
      <div>
        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          <span>Cohort Proportions</span>
          <span className="font-mono text-slate-500">
            {evaluatedCount > 0 ? "100% of Evaluated" : "No evaluations recorded"}
          </span>
        </div>

        <div
          role="img"
          aria-label={`Risk distribution: Low ${lowPct}%, Medium ${medPct}%, High ${highPct}%`}
          className="w-full h-6 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex p-0.5 gap-0.5"
        >
          {lowPct > 0 && (
            <div
              style={{ width: `${lowPct}%` }}
              className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
              title={`Low Risk: ${distribution.low} students (${lowPct}%)`}
            />
          )}
          {medPct > 0 && (
            <div
              style={{ width: `${medPct}%` }}
              className={`h-full bg-amber-500 transition-all duration-500 ${
                lowPct === 0 ? "rounded-l-full" : ""
              } ${highPct === 0 ? "rounded-r-full" : ""}`}
              title={`Medium Risk: ${distribution.medium} students (${medPct}%)`}
            />
          )}
          {highPct > 0 && (
            <div
              style={{ width: `${highPct}%` }}
              className="h-full bg-rose-600 rounded-r-full transition-all duration-500"
              title={`High Risk: ${distribution.high} students (${highPct}%)`}
            />
          )}
          {evaluatedCount === 0 && (
            <div className="w-full h-full bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-[10px] text-slate-500">
              No evaluations available
            </div>
          )}
        </div>
      </div>

      {/* Triage Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Low Tier Card */}
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Low Risk Tier</span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
              &lt; 40%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {distribution.low}
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              ({lowPct}%)
            </span>
          </div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-1">
            Satisfactory course trajectory with minimal early-warning indicators.
          </p>
        </div>

        {/* Medium Tier Card */}
        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Medium Risk Tier</span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              40% - 69%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {distribution.medium}
            </span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              ({medPct}%)
            </span>
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-1">
            Emerging academic friction; recommended for targeted check-ins.
          </p>
        </div>

        {/* High Tier Card */}
        <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>High Risk Tier</span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
              &ge; 70%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-900 dark:text-rose-100">
              {distribution.high}
            </span>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              ({highPct}%)
            </span>
          </div>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-1">
            Urgent risk of course distress; requires faculty intervention.
          </p>
        </div>
      </div>

      {/* Threshold Context Note */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Binary Classification Threshold:</strong> Students with risk probability &ge; 0.50 are formally flagged as at-risk in the backend classification ledger.
        </span>
      </div>
    </section>
  );
}
