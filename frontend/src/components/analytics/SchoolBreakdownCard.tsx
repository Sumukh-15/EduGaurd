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
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-xs space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink/10">
        <div>
          <span className="text-xs font-medium text-ink-muted block">
            Institutional Breakdown
          </span>
          <h2 id="school-breakdown-heading" className="text-xl sm:text-2xl font-display font-normal text-ink mt-0.5">
            Campus Population &amp; At-Risk Partitioning
          </h2>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paper border border-ink/10 text-xs font-medium text-ink/70 self-start sm:self-auto">
          <Shield className="w-3.5 h-3.5 text-edugreen" />
          <span>Anonymized Cohorts</span>
        </div>
      </div>

      {schools.length === 0 ? (
        <div className="p-8 text-center text-xs text-ink/40">
          No campus distribution data currently available.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table">
            <thead>
              <tr className="border-b border-ink/10 text-xs font-medium text-ink-muted">
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
            <tbody className="divide-y divide-ink/10 font-medium">
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
                  <tr key={s.school} className="table-row-hover transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-paper border border-ink/10 text-ink flex items-center justify-center flex-shrink-0">
                          <School className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-ink leading-tight">
                            {schoolNames[s.school] || `Campus ${s.school}`}
                          </p>
                          <span className="text-[11px] text-ink/50 font-mono">
                            Code: {s.school}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-bold text-ink">
                      {s.student_count}
                    </td>

                    <td className="py-4 px-4 text-center text-ink/80 font-mono">
                      {s.evaluated_count}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 bg-ink/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${coverage}%` }}
                            className="h-full bg-edugreen rounded-full"
                          />
                        </div>
                        <span className="text-xs font-mono text-ink/60">
                          {coverage}%
                        </span>
                      </div>
                    </td>

                    <td className="py-4 pl-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          s.at_risk_count > 0
                            ? "bg-coral/15 text-coral border-coral/30"
                            : "bg-softgreen text-edugreen-dark border-edugreen/30"
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
