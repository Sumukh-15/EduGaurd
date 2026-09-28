"use client";

import React from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  History,
  PlayCircle,
  Shield,
} from "lucide-react";
import { AcademicRecordHistoryItem, StudentHistoryResponse } from "@/types/student";

interface StudentAcademicReviewSummaryProps {
  history: StudentHistoryResponse;
  onEvaluate?: () => void;
  isEvaluating?: boolean;
}

export default function StudentAcademicReviewSummary({
  history,
  onEvaluate,
  isEvaluating = false,
}: StudentAcademicReviewSummaryProps) {
  const latestRecord: AcademicRecordHistoryItem | undefined = history.academic_records[0];

  const studyTimeLabels: Record<number, string> = {
    1: "< 2 hours / week",
    2: "2 - 5 hours / week",
    3: "5 - 10 hours / week",
    4: "> 10 hours / week",
  };

  if (history.total_records === 0) {
    return (
      <section
        aria-labelledby="academic-summary-heading"
        className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 mb-1">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 id="academic-summary-heading" className="text-lg font-bold text-slate-900 dark:text-white">
          No Academic Telemetry Available
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          No course performance records are registered for this student in PostgreSQL. Academic telemetry must be recorded by faculty or imported before ML risk inference can be computed.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="academic-summary-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Telemetry Assessment
          </span>
          <h2 id="academic-summary-heading" className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Academic Performance &amp; Trajectory Summary
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {history.total_records} Recorded Period{history.total_records === 1 ? "" : "s"}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            {history.total_predictions} Evaluation{history.total_predictions === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Latest Record Highlight */}
      {latestRecord && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Latest Evaluation Period: {latestRecord.term || "Current Term"} (Semester {latestRecord.current_semester})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Recorded: {new Date(latestRecord.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* G1 Grade */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Period 1 (G1)
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {latestRecord.G1 !== null ? `${latestRecord.G1} / 20` : "N/A"}
              </p>
              <span className="text-[10px] text-slate-400">Baseline Grade</span>
            </div>

            {/* G2 Grade */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Period 2 (G2)
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {latestRecord.G2 !== null ? `${latestRecord.G2} / 20` : "N/A"}
              </p>
              <span className="text-[10px] text-slate-400">Midterm Grade</span>
            </div>

            {/* Absences */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Absences
              </span>
              <p className={`text-lg font-bold mt-0.5 ${latestRecord.absences >= 10 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
                {latestRecord.absences} Days
              </p>
              <span className="text-[10px] text-slate-400">Recorded sessions</span>
            </div>

            {/* Study Time */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Study Time
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {studyTimeLabels[latestRecord.studytime] || `Tier ${latestRecord.studytime}`}
              </p>
              <span className="text-[10px] text-slate-400">Weekly allocation</span>
            </div>

            {/* Past Failures */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Past Failures
              </span>
              <p className={`text-lg font-bold mt-0.5 ${latestRecord.failures > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {latestRecord.failures}
              </p>
              <span className="text-[10px] text-slate-400">Course credits failed</span>
            </div>

            {/* Educational Support */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Support Active
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {latestRecord.schoolsup ? "School " : ""}{latestRecord.famsup ? "Family" : ""}{!latestRecord.schoolsup && !latestRecord.famsup ? "None" : ""}
              </p>
              <span className="text-[10px] text-slate-400">Remedial flags</span>
            </div>
          </div>
        </div>
      )}

      {/* Unevaluated Telemetry Prompt */}
      {!history.latest_prediction && onEvaluate && (
        <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Unevaluated Academic Telemetry Available
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                This student has recorded academic performance data, but no machine learning risk evaluation has been computed yet.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onEvaluate}
            disabled={isEvaluating}
            className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2 self-start sm:self-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 flex-shrink-0"
          >
            <PlayCircle className={`w-4 h-4 ${isEvaluating ? "animate-spin" : ""}`} />
            <span>{isEvaluating ? "Computing Inference..." : "Evaluate Latest Telemetry"}</span>
          </button>
        </div>
      )}

      {/* Historical Telemetry Table (Chronological) */}
      {history.academic_records.length > 1 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Telemetry Record History ({history.academic_records.length} periods)
            </h3>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs" role="table">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Date</th>
                  <th scope="col" className="py-2.5 px-3">Term</th>
                  <th scope="col" className="py-2.5 px-3 text-center">G1</th>
                  <th scope="col" className="py-2.5 px-3 text-center">G2</th>
                  <th scope="col" className="py-2.5 px-3 text-center">Absences</th>
                  <th scope="col" className="py-2.5 px-3 text-center">Study Time</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Linked Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {history.academic_records.slice(0, 5).map((rec, idx) => {
                  const linkedPred = rec.predictions && rec.predictions[0];
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {new Date(rec.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                        {rec.term || `Semester ${rec.current_semester}`}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {rec.G1 !== null ? rec.G1 : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {rec.G2 !== null ? rec.G2 : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {rec.absences}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">
                        Tier {rec.studytime}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {linkedPred ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            linkedPred.risk_level === "High"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : linkedPred.risk_level === "Medium"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}>
                            {linkedPred.risk_level} ({(linkedPred.risk_probability * 100).toFixed(1)}%)
                          </span>
                        ) : idx === 0 && history.latest_prediction ? (
                          <span className="text-[10px] text-indigo-500 font-semibold">Latest Active</span>
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
        </div>
      )}

      {/* Immutability Invariant Note */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <Shield className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Append-Only Invariant:</strong> Academic telemetry records and ML prediction events are strictly append-only. Historical risk evaluations cannot be altered or overwritten.
        </span>
      </div>
    </section>
  );
}
