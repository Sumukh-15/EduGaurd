"use client";

import React from "react";
import {
  BookOpen,
  Calendar,
} from "lucide-react";
import { AcademicRecordHistoryItem } from "@/types/student";

interface AcademicHistoryTableProps {
  records: AcademicRecordHistoryItem[];
}

export default function AcademicHistoryTable({ records }: AcademicHistoryTableProps) {
  if (records.length === 0) {
    return (
      <section
        aria-labelledby="history-records-heading"
        className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 mb-1">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 id="history-records-heading" className="text-base font-bold text-slate-900 dark:text-white">
          No Telemetry Records Available
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          No longitudinal academic telemetry records have been logged in PostgreSQL for your account yet.
        </p>
      </section>
    );
  }

  const studyTimeLabels: Record<number, string> = {
    1: "< 2h / wk",
    2: "2 - 5h / wk",
    3: "5 - 10h / wk",
    4: "> 10h / wk",
  };

  return (
    <section
      aria-labelledby="history-records-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Longitudinal Log
          </span>
          <h2 id="history-records-heading" className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Academic Performance Log (Chronological: Earlier → Later)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Complete record of verified academic indicators logged across your enrollment journey.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto font-mono">
          {records.length} Total Telemetry Period{records.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs" role="table">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="py-3 px-3.5">#</th>
              <th scope="col" className="py-3 px-3.5">Period / Date</th>
              <th scope="col" className="py-3 px-3.5">Term / Semester</th>
              <th scope="col" className="py-3 px-3.5 text-center">G1</th>
              <th scope="col" className="py-3 px-3.5 text-center">G2</th>
              <th scope="col" className="py-3 px-3.5 text-center">Velocity (ΔG)</th>
              <th scope="col" className="py-3 px-3.5 text-center">Absences</th>
              <th scope="col" className="py-3 px-3.5 text-center">Study Time</th>
              <th scope="col" className="py-3 px-3.5 text-center">Support</th>
              <th scope="col" className="py-3 px-3.5 text-right">Linked Evaluation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {records.map((rec, idx) => {
              const deltaG =
                rec.G1 !== null && rec.G2 !== null ? Math.round((rec.G2 - rec.G1) * 10) / 10 : null;

              const linkedPred = rec.predictions && rec.predictions[0];

              return (
                <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3.5 text-slate-400 font-mono">
                    {idx + 1}
                  </td>

                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span>
                        {new Date(rec.recorded_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3.5 text-slate-800 dark:text-slate-200">
                    {rec.term || `Semester ${rec.current_semester}`}
                  </td>

                  <td className="py-3 px-3.5 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {rec.G1 !== null ? `${rec.G1} / 20` : "-"}
                  </td>

                  <td className="py-3 px-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {rec.G2 !== null ? `${rec.G2} / 20` : "-"}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    {deltaG !== null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold font-mono ${
                          deltaG > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : deltaG < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-500"
                        }`}
                      >
                        {deltaG > 0 ? "+" : ""}
                        {deltaG}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    <span
                      className={`font-semibold ${
                        rec.absences >= 10 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {rec.absences}
                    </span>
                  </td>

                  <td className="py-3 px-3.5 text-center text-slate-600 dark:text-slate-400">
                    {studyTimeLabels[rec.studytime] || `Tier ${rec.studytime}`}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    {rec.schoolsup || rec.famsup ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {rec.schoolsup ? "School " : ""}
                        {rec.famsup ? "Family" : ""}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">None</span>
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-right">
                    {linkedPred ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          linkedPred.risk_level === "High"
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900"
                            : linkedPred.risk_level === "Medium"
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900"
                        }`}
                      >
                        {linkedPred.risk_level} ({(linkedPred.risk_probability * 100).toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
