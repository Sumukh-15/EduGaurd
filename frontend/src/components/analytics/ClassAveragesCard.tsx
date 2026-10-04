"use client";

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle,
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
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Academic Telemetry
          </span>
          <h2 id="class-averages-heading" className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Cohort Class Performance Averages
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Aggregated metric averages across each student&apos;s latest recorded academic telemetry. Zero target leakage guarantee (evaluated strictly on G1 and G2).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60">
            {averages.total_students_with_records} Students with Telemetry
          </span>
        </div>
      </div>

      {/* Grid of 6 Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Average G1 */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              Mean Period 1 Grade (G1)
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Scale 0-20
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {averages.avg_g1.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">/ 20.0</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (averages.avg_g1 / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Average G2 */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              Mean Period 2 Grade (G2)
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Scale 0-20
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {averages.avg_g2.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">/ 20.0</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full"
              style={{ width: `${Math.min(100, (averages.avg_g2 / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Grade Velocity (G2 - G1) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              Mean Grade Velocity (G2 - G1)
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Delta Trend
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="flex items-center gap-1">
              {isVelocityPositive ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              ) : hasVelocity ? (
                <ArrowDownRight className="w-5 h-5 text-rose-500" />
              ) : (
                <Minus className="w-4 h-4 text-slate-400" />
              )}
              <span
                className={`text-2xl font-bold ${
                  isVelocityPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : hasVelocity
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {averages.avg_grade_velocity > 0 ? "+" : ""}
                {averages.avg_grade_velocity.toFixed(2)}
              </span>
            </div>
            <span className="text-xs text-slate-500">pts</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {averages.avg_grade_velocity < -2 ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
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
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Mean Absences
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Per Term
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {averages.avg_absences.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">missed days</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Institutional baseline across active cohort.
          </p>
        </div>

        {/* 5. Chronic Absenteeism (>= 10 absences) */}
        <div
          className={`p-4 rounded-xl border ${
            averages.chronic_absenteeism_pct > 20
              ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <AlertTriangle
                className={`w-3.5 h-3.5 ${
                  averages.chronic_absenteeism_pct > 20 ? "text-rose-500" : "text-amber-500"
                }`}
              />
              Chronic Absenteeism Rate
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              &ge; 10 Absences
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                averages.chronic_absenteeism_pct > 20
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {averages.chronic_absenteeism_pct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {averages.chronic_absenteeism_pct > 20
              ? "Elevated attendance friction; triggers rule-based interventions."
              : "Attendance within typical institutional operational bounds."}
          </p>
        </div>

        {/* 6. Course Failures Rate (> 0 failures) */}
        <div
          className={`p-4 rounded-xl border ${
            averages.failures_pct > 15
              ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <AlertCircle
                className={`w-3.5 h-3.5 ${
                  averages.failures_pct > 15 ? "text-amber-500" : "text-indigo-500"
                }`}
              />
              Prior Course Failures Rate
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              &gt; 0 Failures
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                averages.failures_pct > 15
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {averages.failures_pct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Percentage of cohort with documented previous subject failures.
          </p>
        </div>
      </div>
    </section>
  );
}
