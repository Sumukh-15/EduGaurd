"use client";

import React from "react";
import Link from "next/link";
import {
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
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-xs space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              count > 0
                ? "bg-coral/15 text-coral"
                : "bg-softgreen text-edugreen"
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
              <h2 id="worsening-heading" className="text-xl sm:text-2xl font-display font-normal text-ink">
                Deteriorating Trajectory Alerts
              </h2>
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                  count > 0
                    ? "bg-coral/15 text-coral border-coral/30"
                    : "bg-softgreen text-edugreen-dark border-edugreen/30"
                }`}
              >
                {count} {count === 1 ? "Student" : "Students"}
              </span>
            </div>
            <p className="text-xs text-ink/65 mt-0.5">
              Students whose latest risk probability increased by &ge; 15% (+0.15) relative to their previous prediction.
            </p>
          </div>
        </div>

        {count > 0 && (
          <Link
            href="/dashboard/faculty/students?sort=risk_desc"
            className="text-xs font-semibold text-edugreen hover:text-edugreen-dark flex items-center gap-1.5 self-start sm:self-auto group"
          >
            <span>View All Cohort Students</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {count > 0 ? (
        <div className="divide-y divide-ink/10 border border-ink/10 rounded-xl overflow-hidden">
          {students.map((st) => {
            const prevPct = Math.round(st.previous_risk_probability * 100);
            const latestPct = Math.round(st.latest_risk_probability * 100);
            const deltaPct = Math.round(st.risk_delta * 100);

            return (
              <div
                key={st.student_id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white table-row-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-ink">
                    {st.student_code}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-ink/60">
                    <span className="px-2 py-0.5 rounded bg-paper text-ink/80 font-mono border border-ink/10">
                      {st.previous_risk_level} ({prevPct}%)
                    </span>
                    <span>&rarr;</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        st.latest_risk_level === "High"
                          ? "bg-coral/15 text-coral border border-coral/30"
                          : "bg-amber/15 text-amber-900 border border-amber/30"
                      }`}
                    >
                      {st.latest_risk_level} ({latestPct}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="flex items-center gap-1 text-xs font-bold text-coral bg-coral/15 px-2.5 py-1 rounded-lg border border-coral/30">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+{deltaPct}% Risk Delta</span>
                  </div>

                  <Link
                    href={`/dashboard/faculty/review?id=${st.student_id}`}
                    className="text-xs font-bold text-edugreen hover:underline"
                  >
                    Inspect Profile &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-softgreen/60 border border-edugreen/30 flex items-center gap-3 text-xs text-edugreen">
          <CheckCircle2 className="w-5 h-5 text-edugreen flex-shrink-0" />
          <div>
            <strong className="block font-bold text-ink">Zero Deteriorating Outliers Detected</strong>
            <span className="text-ink/80">
              No students experienced a sharp risk probability increase (&ge; 15%) across their consecutive evaluations.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
