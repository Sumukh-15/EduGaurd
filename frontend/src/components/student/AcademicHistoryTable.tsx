"use client";

import React from "react";
import {
  BookOpen,
  Calendar,
  ShieldCheck,
  UserCheck,
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
        className="p-8 rounded-2xl bg-white border border-ink/10 shadow-xs text-center space-y-3"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-paper border border-ink/10 text-ink/60 mb-1">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 id="history-records-heading" className="text-base font-heading font-extrabold text-ink">
          No Academic Records Available
        </h2>
        <p className="text-xs text-ink/65 max-w-md mx-auto leading-relaxed">
          No academic performance records have been recorded for your account yet.
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
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink/10">
        <div>
          <span className="text-xs font-medium text-ink-muted block">
            Academic performance log
          </span>
          <h2 id="history-records-heading" className="text-xl font-display text-ink mt-0.5 tracking-tight">
            Course Performance &amp; Evaluation Log
          </h2>
          <p className="text-xs text-ink/60 mt-1 max-w-xl leading-relaxed">
            Chronological log of verified faculty records and self-reported study habits across evaluation periods.
          </p>
        </div>

        <span className="text-xs font-medium px-3 py-1 rounded-full bg-paper border border-ink/10 text-ink/70 self-start sm:self-auto font-mono tabular-nums">
          {records.length} Recorded Period{records.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink/10">
        <table className="w-full text-left text-xs" role="table">
          <thead className="bg-paper/70 text-ink-muted font-medium border-b border-ink/10 text-xs">
            <tr>
              <th scope="col" className="py-3 px-3.5">#</th>
              <th scope="col" className="py-3 px-3.5">Assessment date</th>
              <th scope="col" className="py-3 px-3.5">Subject &amp; assessment</th>
              <th scope="col" className="py-3 px-3.5 text-center">Previous (G1)</th>
              <th scope="col" className="py-3 px-3.5 text-center">Latest (G2)</th>
              <th scope="col" className="py-3 px-3.5 text-center">Grade change</th>
              <th scope="col" className="py-3 px-3.5 text-center">Attendance</th>
              <th scope="col" className="py-3 px-3.5 text-center">Study time</th>
              <th scope="col" className="py-3 px-3.5 text-center">Data source</th>
              <th scope="col" className="py-3 px-3.5 text-right">Risk assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5 font-medium">
            {records.map((rec, idx) => {
              const deltaG =
                rec.G1 !== null && rec.G2 !== null ? Math.round((rec.G2 - rec.G1) * 10) / 10 : null;

              const linkedPred = rec.predictions && rec.predictions[0];
              const isFacultyVerified = rec.data_source !== "self_reported";

              return (
                <tr key={rec.id} className="table-row-hover">
                  <td className="py-3 px-3.5 text-ink/40 font-mono">
                    {idx + 1}
                  </td>

                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-1.5 font-mono text-ink">
                      <Calendar className="w-3.5 h-3.5 text-edugreen flex-shrink-0" />
                      <span>
                        {new Date(rec.recorded_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3.5 text-ink">
                    <div className="font-semibold text-ink">
                      {rec.subject || "Mathematics"}
                    </div>
                    <div className="text-[11px] text-ink/50">
                      {rec.assessment_name || rec.term || `Semester ${rec.current_semester}`}
                    </div>
                  </td>

                  <td className="py-3 px-3.5 text-center font-mono font-bold text-ink/75 tabular-nums">
                    {rec.G1 !== null ? `${rec.G1} / 20` : "-"}
                  </td>

                  <td className="py-3 px-3.5 text-center font-mono font-bold text-edugreen tabular-nums">
                    {rec.G2 !== null ? `${rec.G2} / 20` : "-"}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    {deltaG !== null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold font-mono tabular-nums ${
                          deltaG > 0
                            ? "text-edugreen"
                            : deltaG < 0
                            ? "text-coral"
                            : "text-ink/60"
                        }`}
                      >
                        {deltaG > 0 ? "+" : ""}
                        {deltaG} pts
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    <span
                      className={`font-semibold ${
                        rec.absences >= 10 ? "text-coral font-bold" : "text-ink"
                      }`}
                    >
                      {rec.absences} absences
                    </span>
                  </td>

                  <td className="py-3 px-3.5 text-center text-ink/70">
                    {studyTimeLabels[rec.studytime] || `Tier ${rec.studytime}`}
                  </td>

                  {/* Data Provenance Badge */}
                  <td className="py-3 px-3.5 text-center">
                    {isFacultyVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-softgreen border border-edugreen/25 text-edugreen">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified by Faculty</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-paper border border-ink/15 text-ink/70">
                        <UserCheck className="w-3 h-3 text-edugreen" />
                        <span>Self-reported</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-right">
                    {linkedPred ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          linkedPred.risk_level === "High"
                            ? "bg-coral/15 text-coral border-coral/30"
                            : linkedPred.risk_level === "Medium"
                            ? "bg-amber/15 text-ink border-amber/35"
                            : "bg-softgreen text-edugreen border-edugreen/30"
                        }`}
                      >
                        {linkedPred.risk_level} ({(linkedPred.risk_probability * 100).toFixed(1)}%)
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink/40">Pending Evaluation</span>
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
