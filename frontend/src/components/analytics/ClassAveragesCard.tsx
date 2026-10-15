"use client";

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  GraduationCap,
  Minus,
  TrendingUp,
} from "lucide-react";
import { ClassAverages } from "@/types/analytics";

interface ClassAveragesCardProps {
  averages: ClassAverages;
}

export default function ClassAveragesCard({ averages }: ClassAveragesCardProps) {
  const hasVelocity = averages.avg_grade_velocity !== 0;
  const isVelocityPositive = averages.avg_grade_velocity > 0;

  return (
    <section
      aria-labelledby="class-averages-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-xs space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-ink-muted block">
            Academic Telemetry
          </span>
          <h2 id="class-averages-heading" className="text-xl sm:text-2xl font-display font-normal text-ink mt-0.5">
            Cohort Class Performance Averages
          </h2>
          <p className="text-xs text-ink/65 mt-1 max-w-xl leading-relaxed">
            Aggregated metric averages across each student&apos;s latest recorded academic telemetry. Zero target leakage guarantee (evaluated strictly on G1 and G2).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-medium px-3 py-1.5 rounded-xl bg-softgreen text-edugreen-dark border border-edugreen/30">
            {averages.total_students_with_records} Students with Telemetry
          </span>
        </div>
      </div>

      {/* Grid of 6 Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Average G1 */}
        <div className="p-4 rounded-xl bg-paper border border-ink/10 hover:border-ink/25 hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-semibold text-ink/75 mb-1.5">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-ink/70" />
              Mean Period 1 Grade (G1)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-paper border border-ink/10 text-ink/70 font-medium">
              0 - 20
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-sans font-bold tabular-nums text-ink">
              {averages.avg_g1.toFixed(1)}
            </span>
            <span className="text-xs text-ink/50 font-mono">/ 20.0</span>
          </div>
          <div className="w-full bg-ink/10 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-ink h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (averages.avg_g1 / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Average G2 */}
        <div className="p-4 rounded-xl bg-paper border border-ink/10 hover:border-ink/25 hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-semibold text-ink/75 mb-1.5">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-edugreen" />
              Mean Period 2 Grade (G2)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-softgreen text-edugreen font-medium border border-edugreen/25">
              0 - 20
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-sans font-bold tabular-nums text-ink">
              {averages.avg_g2.toFixed(1)}
            </span>
            <span className="text-xs text-ink/50 font-mono">/ 20.0</span>
          </div>
          <div className="w-full bg-ink/10 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-edugreen h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (averages.avg_g2 / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Grade Velocity (G2 - G1) */}
        <div className="p-4 rounded-xl bg-paper border border-ink/10 hover:border-ink/25 hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-semibold text-ink/75 mb-1.5">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-edugreen" />
              Mean Grade Velocity (G2 - G1)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-paper border border-ink/10 text-ink/70 font-medium">
              Delta Trend
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="flex items-center gap-1">
              {isVelocityPositive ? (
                <ArrowUpRight className="w-5 h-5 text-edugreen" />
              ) : hasVelocity ? (
                <ArrowDownRight className="w-5 h-5 text-coral" />
              ) : (
                <Minus className="w-4 h-4 text-ink/40" />
              )}
              <span
                className={`text-2xl font-sans font-bold tabular-nums ${
                  isVelocityPositive
                    ? "text-edugreen"
                    : hasVelocity
                    ? "text-coral"
                    : "text-ink"
                }`}
              >
                {averages.avg_grade_velocity > 0 ? "+" : ""}
                {averages.avg_grade_velocity.toFixed(2)}
              </span>
            </div>
            <span className="text-xs text-ink/50">pts</span>
          </div>
          <p className="text-[11px] text-ink/60 mt-2">
            {averages.avg_grade_velocity < -2 ? (
              <span className="text-coral font-medium">
                Critical deceleration threshold &lt; -2 pts
              </span>
            ) : isVelocityPositive ? (
              "Positive cohort trajectory between evaluations."
            ) : (
              "Stable trajectory across evaluation windows."
            )}
          </p>
        </div>

        {/* 4. Average Absences */}
        <div className="p-4 rounded-xl bg-paper border border-ink/10 hover:border-ink/25 hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-semibold text-ink/75 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-ink/70" />
              Mean Absences
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-paper border border-ink/10 text-ink/70 font-medium">
              Per Term
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-sans font-bold tabular-nums text-ink">
              {averages.avg_absences.toFixed(1)}
            </span>
            <span className="text-xs text-ink/50">missed days</span>
          </div>
          <p className="text-[11px] text-ink/60 mt-2">
            Institutional baseline across active cohort.
          </p>
        </div>

        {/* 5. Chronic Absenteeism (>= 10 absences) */}
        <div
          className={`p-4 rounded-xl border transition-all duration-200 ${
            averages.chronic_absenteeism_pct > 20
              ? "bg-coral/10 border-coral/30 hover:border-coral/50"
              : "bg-paper border-ink/10 hover:border-ink/25 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-ink/75 mb-1.5">
            <span className="flex items-center gap-1.5">
              <AlertTriangle
                className={`w-3.5 h-3.5 ${
                  averages.chronic_absenteeism_pct > 20 ? "text-coral" : "text-amber-500"
                }`}
              />
              Chronic Absenteeism Rate
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-paper border border-ink/10 text-ink/70 font-medium">
              &ge; 10 Absences
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-sans font-bold tabular-nums ${
                averages.chronic_absenteeism_pct > 20
                  ? "text-coral"
                  : "text-ink"
              }`}
            >
              {averages.chronic_absenteeism_pct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-ink/60 mt-2">
            {averages.chronic_absenteeism_pct > 20
              ? "Elevated attendance friction; triggers rule-based interventions."
              : "Attendance within typical institutional operational bounds."}
          </p>
        </div>

        {/* 6. Course Failures Rate (> 0 failures) */}
        <div
          className={`p-4 rounded-xl border transition-all duration-200 ${
            averages.failures_pct > 15
              ? "bg-amber/10 border-amber/30 hover:border-amber/50"
              : "bg-paper border-ink/10 hover:border-ink/25 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-ink/75 mb-1.5">
            <span className="flex items-center gap-1.5">
              <AlertCircle
                className={`w-3.5 h-3.5 ${
                  averages.failures_pct > 15 ? "text-amber-500" : "text-ink/70"
                }`}
              />
              Prior Course Failures Rate
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-paper border border-ink/10 text-ink/70 font-medium">
              &gt; 0 Failures
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-sans font-bold tabular-nums ${
                averages.failures_pct > 15
                  ? "text-amber-700"
                  : "text-ink"
              }`}
            >
              {averages.failures_pct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-ink/60 mt-2">
            Percentage of cohort with documented previous subject failures.
          </p>
        </div>
      </div>
    </section>
  );
}
