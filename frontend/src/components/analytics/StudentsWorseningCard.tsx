"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { WorseningStudentItem } from "@/types/analytics";

interface StudentsWorseningCardProps {
  students: WorseningStudentItem[];
  count: number;
}

export default function StudentsWorseningCard({
  students,
  count,
}: StudentsWorseningCardProps) {
  return (
    <section
      aria-labelledby="worsening-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              count > 0
                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {count > 0 ? (
              <TrendingDown className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="worsening-heading" className="text-xl font-bold text-slate-900 dark:text-white">
                Deteriorating Trajectory Alerts
              </h2>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  count > 0
                    ? "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300"
                    : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                {count} {count === 1 ? "Student" : "Students"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Students whose latest risk probability increased by &ge; 15% (+0.15) relative to their previous prediction.
            </p>
          </div>
        </div>

        {count > 0 && (
          <Link
            href="/dashboard/faculty/students?sort=risk_desc"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Cohort Students</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {count > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
          {students.map((st) => {
            const prevPct = Math.round(st.previous_risk_probability * 100);
            const latestPct = Math.round(st.latest_risk_probability * 100);
            const deltaPct = Math.round(st.risk_delta * 100);

            return (
              <div
                key={st.student_id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {st.student_code}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {st.previous_risk_level} ({prevPct}%)
                    </span>
                    <span>&rarr;</span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        st.latest_risk_level === "High"
                          ? "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200"
                          : "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                      }`}
                    >
                      {st.latest_risk_level} ({latestPct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-900/60">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+{deltaPct}% Risk Delta</span>
                  </div>

                  <Link
                    href={`/dashboard/faculty/review?id=${st.student_id}`}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                  >
                    Inspect Profile &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <strong className="block font-semibold">Zero Deteriorating Outliers Detected</strong>
            <span>
              No students experienced a sharp risk probability increase (&ge; 15%) across their consecutive evaluations.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
