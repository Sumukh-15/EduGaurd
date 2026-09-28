"use client";

import React from "react";
import { School, Shield } from "lucide-react";
import { SchoolDistribution } from "@/types/analytics";

interface SchoolBreakdownCardProps {
  schools: SchoolDistribution[];
}

export default function SchoolBreakdownCard({ schools }: SchoolBreakdownCardProps) {
  const schoolNames: Record<string, string> = {
    GP: "Gabriel Pereira High School (GP)",
    MS: "Mousinho da Silveira (MS)",
  };

  return (
    <section
      aria-labelledby="school-breakdown-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Institutional Breakdown
          </span>
          <h2 id="school-breakdown-heading" className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Campus Population &amp; At-Risk Partitioning
          </h2>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <span>Anonymized Cohorts</span>
        </div>
      </div>

      {schools.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">
          No campus distribution data currently available.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th scope="col" className="pb-3 pr-4">
                  Campus / Institution
                </th>
                <th scope="col" className="pb-3 px-4 text-center">
                  Total Enrolled
                </th>
                <th scope="col" className="pb-3 px-4 text-center">
                  Evaluated Students
                </th>
                <th scope="col" className="pb-3 px-4 text-center">
                  Evaluation Coverage
                </th>
                <th scope="col" className="pb-3 pl-4 text-right">
                  Flagged At-Risk
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {schools.map((s) => {
                const coverage =
                  s.student_count > 0
                    ? Math.round((s.evaluated_count / s.student_count) * 100)
                    : 0;
                const atRiskPct =
                  s.evaluated_count > 0
                    ? Math.round((s.at_risk_count / s.evaluated_count) * 100)
                    : 0;

                return (
                  <tr key={s.school} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                          <School className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {schoolNames[s.school] || `Campus ${s.school}`}
                          </p>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Code: {s.school}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-slate-900 dark:text-white">
                      {s.student_count}
                    </td>

                    <td className="py-4 px-4 text-center text-slate-700 dark:text-slate-300">
                      {s.evaluated_count}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${coverage}%` }}
                            className="h-full bg-indigo-600 rounded-full"
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                          {coverage}%
                        </span>
                      </div>
                    </td>

                    <td className="py-4 pl-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          s.at_risk_count > 0
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900"
                        }`}
                      >
                        {s.at_risk_count} students ({atRiskPct}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
