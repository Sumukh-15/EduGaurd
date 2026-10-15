"use client";

import React, { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Sparkles,
} from "lucide-react";
import { FactorContribution } from "@/types/student";

interface ExplainabilityViewProps {
  factors: FactorContribution[];
  causalDisclaimer?: string;
  onRequestFactors?: () => void;
  isLoadingFactors?: boolean;
}

// Student-friendly mapping for features
const FEATURE_EXPLANATIONS: Record<
  string,
  { friendlyName: string; explanation: string }
> = {
  grade_velocity: {
    friendlyName: "Change in your recent grades",
    explanation: "How your score changed between your previous and latest assessment.",
  },
  absences: {
    friendlyName: "Attendance & missed sessions",
    explanation: "The total number of class absences recorded this academic term.",
  },
  studytime: {
    friendlyName: "Weekly study time",
    explanation: "The amount of dedicated study hours you spend per week outside of class.",
  },
  failures: {
    friendlyName: "Previous academic difficulties",
    explanation: "Number of courses previously failed prior to this academic term.",
  },
  G2: {
    friendlyName: "Latest assessment score",
    explanation: "Your performance in the most recent midterm evaluation.",
  },
  G1: {
    friendlyName: "Previous assessment score",
    explanation: "Your performance in the first evaluation period of the course.",
  },
  schoolsup: {
    friendlyName: "Extra school academic support",
    explanation: "Participation in institutional tutoring and remedial classes.",
  },
  famsup: {
    friendlyName: "Family educational support",
    explanation: "Access to family assistance and study resources at home.",
  },
  paid: {
    friendlyName: "Supplemental coursework classes",
    explanation: "Enrollment in additional extra-curricular instruction.",
  },
  higher: {
    friendlyName: "Higher education aspirations",
    explanation: "Commitment and goals toward pursuing university education.",
  },
  internet: {
    friendlyName: "Home internet access",
    explanation: "Availability of reliable online study materials and connectivity.",
  },
};

export default function ExplainabilityView({
  factors,
  causalDisclaimer,
  onRequestFactors,
  isLoadingFactors = false,
}: ExplainabilityViewProps) {
  const [showTechnicalShap, setShowTechnicalShap] = useState(false);

  // Find maximum absolute contribution for normalized bar scaling
  const maxAbsContrib = Math.max(
    ...factors.map((f) => Math.abs(f.contribution)),
    1.0
  );

  const defaultDisclaimer =
    "These indicators highlight which academic areas have the strongest relationship with your current risk score. They are meant to guide your study focus and conversation with teachers, not to define your abilities.";

  if (factors.length === 0) {
    return (
      <section
        aria-labelledby="factors-heading"
        className="p-6 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface"
      >
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-5 h-5 text-edugreen" />
          <h2 id="factors-heading" className="font-display text-lg text-ink">
            Why is my risk at this level?
          </h2>
        </div>
        <p className="text-xs text-ink/60 max-w-xl mb-4">
          Discover which specific academic factors (like attendance, study habits, and recent test marks) are currently having the largest impact on your score.
        </p>

        <div className="p-6 rounded-xl border border-dashed border-ink/20 bg-paper text-center">
          <p className="text-xs text-ink/65 mb-4">
            Factors can be analyzed to give you personalized insights into your risk assessment.
          </p>
          {onRequestFactors && (
            <button
              type="button"
              onClick={onRequestFactors}
              disabled={isLoadingFactors}
              className="btn-interactive py-2.5 px-4 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoadingFactors ? "Analyzing factors..." : "Analyze key factors"}</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="factors-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface space-y-6"
    >
      {/* Section Header: Clear Question */}
      <div>
        <div className="flex items-center gap-2 text-edugreen mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-medium text-ink-muted">
            Risk factor breakdown
          </span>
        </div>
        <h2 id="factors-heading" className="font-display text-xl text-ink tracking-tight">
          Why is my risk at this level?
        </h2>
        <p className="text-xs sm:text-sm text-ink/60 mt-1 max-w-2xl leading-relaxed">
          Here are the most important factors influencing your current risk assessment. Understanding these can help you focus on what matters most for your academic progress.
        </p>
      </div>

      {/* Factors List with Human-Friendly Mapping */}
      <div className="space-y-3.5" role="list" aria-label="Key factors influencing risk">
        {factors.map((factor, idx) => {
          const isIncrease = factor.direction === "increases_risk";
          const meta = FEATURE_EXPLANATIONS[factor.feature] || {
            friendlyName: factor.display_name || factor.feature,
            explanation: factor.interpretation || "Factor influencing model risk assessment.",
          };

          const barWidthPercent = Math.min(
            Math.max((Math.abs(factor.contribution) / maxAbsContrib) * 100, 10),
            100
          );

          return (
            <article
              key={factor.feature}
              role="listitem"
              className="p-4 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-start sm:items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-white border border-ink/15 text-ink font-bold font-sans tabular-nums text-xs flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      {meta.friendlyName}
                    </h3>
                    <p className="text-xs text-ink/60 mt-0.5">
                      {meta.explanation}
                    </p>
                  </div>
                </div>

                {/* Clear Direction Badge */}
                <div className="flex items-center gap-2 self-start sm:self-auto pl-9 sm:pl-0">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
                      isIncrease
                        ? "bg-coral/15 text-coral border-coral/30"
                        : "bg-softgreen text-edugreen border-edugreen/30"
                    }`}
                  >
                    {isIncrease ? (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Increases risk</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Decreases risk (protective)</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Relative Magnitude Bar */}
              <div className="w-full bg-ink/10 h-2 rounded-full overflow-hidden mt-3">
                <div
                  style={{ width: `${barWidthPercent}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isIncrease ? "bg-coral" : "bg-edugreen"
                  }`}
                  aria-hidden="true"
                />
              </div>
            </article>
          );
        })}
      </div>

      {/* Advisory Note */}
      <div
        role="note"
        aria-label="About your risk factors"
        className="p-4 rounded-xl bg-paper border border-ink/10 text-ink/75 flex items-start gap-3 text-xs leading-relaxed"
      >
        <Info className="w-4 h-4 text-edugreen flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-ink block mb-0.5 font-semibold">
            About your risk factors:
          </strong>
          <span>{causalDisclaimer || defaultDisclaimer}</span>
        </div>
      </div>

      {/* Expandable Technical SHAP Details for Faculty/Admin */}
      <div className="pt-2 border-t border-ink/10">
        <button
          type="button"
          onClick={() => setShowTechnicalShap(!showTechnicalShap)}
          className="btn-interactive text-xs font-medium text-ink-muted hover:text-ink inline-flex items-center gap-1.5 focus:outline-none transition-colors"
        >
          <span>View technical SHAP details</span>
          {showTechnicalShap ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showTechnicalShap && (
          <div className="mt-3 p-4 rounded-xl bg-paper border border-ink/10 text-xs font-mono space-y-2 modal-panel-enter">
            <p className="text-ink/60 font-sans text-xs">
              Computed via LinearSHAP explainer against the standardized logistic regression model:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ink/10 text-xs font-medium text-ink-muted">
                    <th className="py-2 px-2.5">Feature name</th>
                    <th className="py-2 px-2.5">Observed value</th>
                    <th className="py-2 px-2.5 text-right">Shapley value (log-odds impact)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {factors.map((f) => (
                    <tr key={f.feature} className="table-row-hover">
                      <td className="py-2 px-2.5 font-semibold text-ink">
                        {f.feature}
                      </td>
                      <td className="py-2 px-2.5 text-ink/60 tabular-nums">
                        {f.raw_value !== null ? String(f.raw_value) : "-"}
                      </td>
                      <td
                        className={`py-2 px-2.5 text-right font-semibold tabular-nums ${
                          f.contribution > 0 ? "text-coral" : "text-edugreen"
                        }`}
                      >
                        {f.contribution > 0
                          ? `+${f.contribution.toFixed(4)}`
                          : f.contribution.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
