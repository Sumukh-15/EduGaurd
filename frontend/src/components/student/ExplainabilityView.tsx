"use client";

import React from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { FactorContribution } from "@/types/student";

interface ExplainabilityViewProps {
  factors: FactorContribution[];
  causalDisclaimer?: string;
  onRequestFactors?: () => void;
  isLoadingFactors?: boolean;
}

export default function ExplainabilityView({
  factors,
  causalDisclaimer,
  onRequestFactors,
  isLoadingFactors = false,
}: ExplainabilityViewProps) {
  // Find maximum absolute contribution for normalized bar scaling
  const maxAbsContrib = Math.max(
    ...factors.map((f) => Math.abs(f.contribution)),
    1.0
  );

  const defaultDisclaimer =
    "These factors show how the model contributed to this prediction. They are not proof of cause and should be interpreted with appropriate academic context.";

  if (factors.length === 0) {
    return (
      <section
        aria-labelledby="factors-heading"
        className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 id="factors-heading" className="text-lg font-bold text-slate-900 dark:text-white">
            Feature Attribution & Explainability
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mb-4">
          SHAP (SHapley Additive exPlanations) decomposes how each observed academic telemetry indicator shifted the model&apos;s statistical prediction relative to the population baseline.
        </p>

        <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Detailed Shapley attribution factors for your evaluation can be computed and visualized.
          </p>
          {onRequestFactors && (
            <button
              type="button"
              onClick={onRequestFactors}
              disabled={isLoadingFactors}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoadingFactors ? "Analyzing Telemetry..." : "Decompose Risk Factors (SHAP)"}</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="factors-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
    >
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Explainable AI (LinearSHAP)
          </span>
        </div>
        <h2 id="factors-heading" className="text-xl font-bold text-slate-900 dark:text-white">
          Top Contributing Academic Factors
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          The top 5 indicators driving the statistical risk classification, ranked by absolute Shapley impact value. Factors quantify associative attribution toward higher or lower risk relative to the student cohort baseline.
        </p>
      </div>

      {/* Factors List */}
      <div className="space-y-3.5" role="list" aria-label="Top 5 risk factor contributions">
        {factors.map((factor, idx) => {
          const isIncrease = factor.direction === "increases_risk";
          const barWidthPercent = Math.min(
            Math.max((Math.abs(factor.contribution) / maxAbsContrib) * 100, 8),
            100
          );

          return (
            <article
              key={factor.feature}
              role="listitem"
              className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {factor.display_name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono text-[10px] text-slate-400">
                        {factor.feature}
                      </span>
                      {factor.raw_value !== null && factor.raw_value !== undefined && (
                        <span>
                          • Observed: <strong className="text-slate-700 dark:text-slate-300">{String(factor.raw_value)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direction and Magnitude Badge */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      isIncrease
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900"
                    }`}
                  >
                    {isIncrease ? (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Increases Risk</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Protective (Decreases Risk)</span>
                      </>
                    )}
                  </span>

                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {factor.contribution > 0 ? `+${factor.contribution.toFixed(2)}` : factor.contribution.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Relative Magnitude Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-3">
                <div
                  style={{ width: `${barWidthPercent}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isIncrease ? "bg-rose-500 dark:bg-rose-600" : "bg-emerald-500 dark:bg-emerald-600"
                  }`}
                  aria-hidden="true"
                />
              </div>

              {factor.interpretation && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic leading-relaxed">
                  {factor.interpretation}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* Prominent Non-Causal Ethical Disclaimer */}
      <div
        role="note"
        aria-label="Ethical non-causal interpretation disclaimer"
        className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs leading-relaxed"
      >
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="block font-semibold mb-0.5">
            Non-Causal Interpretation Disclaimer:
          </strong>
          <span>
            {causalDisclaimer || defaultDisclaimer}
          </span>
        </div>
      </div>
    </section>
  );
}
