"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  History,
  PlayCircle,
  PlusCircle,
  Shield,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { AcademicRecordHistoryItem, AcademicUpdateResponse, StudentHistoryResponse } from "@/types/student";
import FacultyAcademicDataEntryModal from "./FacultyAcademicDataEntryModal";

interface StudentAcademicReviewSummaryProps {
  studentId?: number;
  studentCode?: string;
  studentName?: string;
  history: StudentHistoryResponse;
  onEvaluate?: () => void;
  isEvaluating?: boolean;
  onAcademicUpdateSuccess?: (response: AcademicUpdateResponse) => void;
}

export default function StudentAcademicReviewSummary({
  studentId,
  studentCode = "",
  studentName = "",
  history,
  onEvaluate,
  isEvaluating = false,
  onAcademicUpdateSuccess,
}: StudentAcademicReviewSummaryProps) {
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const latestRecord: AcademicRecordHistoryItem | undefined = history.academic_records[0];

  const studyTimeLabels: Record<number, string> = {
    1: "< 2 hours / week",
    2: "2 - 5 hours / week",
    3: "5 - 10 hours / week",
    4: "> 10 hours / week",
  };

  const handleUpdateSuccess = (response: AcademicUpdateResponse) => {
    if (onAcademicUpdateSuccess) {
      onAcademicUpdateSuccess(response);
    }
  };

  return (
    <section
      aria-labelledby="academic-summary-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-xs space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink/10">
        <div>
          <span className="text-xs font-medium text-ink-muted block">
            Academic performance log
          </span>
          <h2 id="academic-summary-heading" className="text-xl font-display text-ink mt-0.5">
            Verified Academic Records &amp; Trajectory
          </h2>
          <p className="text-xs text-ink/65 mt-0.5">
            Official marks recorded by faculty and student self-reported study habits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {studentId && (
            <button
              type="button"
              onClick={() => setIsEntryModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-edugreen hover:bg-edugreen/90 active:scale-[0.99] text-white text-xs font-medium shadow-xs transition-all duration-200 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen btn-interactive"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record Academic Update</span>
            </button>
          )}

          <span className="text-xs font-medium px-3 py-1 rounded-xl bg-paper border border-ink/10 text-ink/70 tabular-nums">
            {history.total_records} Record{history.total_records === 1 ? "" : "s"}
          </span>
          <span className="text-xs font-medium px-3 py-1 rounded-xl bg-softgreen text-edugreen border border-edugreen/30 tabular-nums">
            {history.total_predictions} Evaluation{history.total_predictions === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {history.total_records === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-ink/20 bg-paper/30 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-paper border border-ink/10 text-ink/60 mb-1">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-heading font-extrabold text-ink">
            No Academic Records Logged Yet
          </h3>
          <p className="text-xs text-ink/65 max-w-md mx-auto leading-relaxed">
            No assessment scores have been registered for this student in PostgreSQL. Use the &quot;Record Academic Update&quot; button above to log the first assessment marks and calculate initial risk.
          </p>
        </div>
      ) : (
        <>
          {/* Latest Record Highlight */}
          {latestRecord && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-edugreen" />
                    <span>
                      {latestRecord.subject || "Mathematics"} • {latestRecord.assessment_name || "Midterm Evaluation"}
                    </span>
                  </h3>
                  {latestRecord.data_source === "self_reported" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-paper text-ink/80 border border-ink/15">
                      <UserCheck className="w-3 h-3" />
                      <span>Self-reported</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-softgreen text-edugreen border border-edugreen/30">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified by Faculty</span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-ink/50 font-mono">
                  Recorded: {new Date(latestRecord.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* G1 Grade */}
                <div className="p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
                  <span className="text-xs font-medium text-ink-muted block">
                    Period 1 (G1)
                  </span>
                  <p className="text-lg font-sans font-bold tabular-nums text-ink mt-0.5">
                    {latestRecord.G1 !== null ? `${latestRecord.G1} / 20` : "N/A"}
                  </p>
                  <span className="text-[10px] text-ink/50">Baseline grade</span>
                </div>

                {/* G2 Grade */}
                <div className="p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
                  <span className="text-xs font-medium text-ink-muted block">
                    Period 2 (G2)
                  </span>
                  <p className="text-lg font-sans font-bold tabular-nums text-edugreen mt-0.5">
                    {latestRecord.G2 !== null ? `${latestRecord.G2} / 20` : "N/A"}
                  </p>
                  <span className="text-[10px] text-ink/50">Midterm grade</span>
                </div>

                {/* Absences */}
                <div className="p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
                  <span className="text-xs font-medium text-ink-muted block">
                    Absences
                  </span>
                  <p className={`text-lg font-sans font-bold tabular-nums mt-0.5 ${latestRecord.absences >= 10 ? "text-coral" : "text-ink"}`}>
                    {latestRecord.absences} Days
                  </p>
                  <span className="text-[10px] text-ink/50">Recorded sessions</span>
                </div>

                {/* Study Time */}
                <div className="p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
                  <span className="text-xs font-medium text-ink-muted block">
                    Study time
                  </span>
                  <p className="text-sm font-semibold text-ink mt-1">
                    {studyTimeLabels[latestRecord.studytime] || `Tier ${latestRecord.studytime}`}
                  </p>
                  <span className="text-[10px] text-ink/50">Self-reported habit</span>
                </div>

                {/* Past Difficulties */}
                <div className="p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
                  <span className="text-xs font-medium text-ink-muted block">
                    Past difficulties
                  </span>
                  <p className={`text-lg font-sans font-bold tabular-nums mt-0.5 ${latestRecord.failures > 0 ? "text-coral" : "text-edugreen"}`}>
                    {latestRecord.failures} courses
                  </p>
                  <span className="text-[10px] text-ink/50">Prior failed credits</span>
                </div>

                {/* Educational Support */}
                <div className="p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
                  <span className="text-xs font-medium text-ink-muted block">
                    Support active
                  </span>
                  <p className="text-sm font-semibold text-ink mt-1">
                    {latestRecord.schoolsup ? "School " : ""}{latestRecord.famsup ? "Family" : ""}{!latestRecord.schoolsup && !latestRecord.famsup ? "None" : ""}
                  </p>
                  <span className="text-[10px] text-ink/50">Remedial flags</span>
                </div>
              </div>
            </div>
          )}

          {/* Unevaluated Academic Data Prompt */}
          {!history.latest_prediction && onEvaluate && (
            <div className="p-4 rounded-xl bg-amber/10 border border-amber/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    Unevaluated Academic Records Available
                  </p>
                  <p className="text-xs text-ink/75 mt-0.5">
                    This student has recorded academic performance data, but no machine learning risk evaluation has been computed yet.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onEvaluate}
                disabled={isEvaluating}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-medium shadow-xs transition-all duration-200 disabled:opacity-50 inline-flex items-center gap-2 self-start sm:self-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 flex-shrink-0 btn-interactive"
              >
                <PlayCircle className={`w-4 h-4 ${isEvaluating ? "animate-spin" : ""}`} />
                <span>{isEvaluating ? "Computing Inference..." : "Evaluate Latest Record"}</span>
              </button>
            </div>
          )}

          {/* Historical Record Table */}
          {history.academic_records.length > 1 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-ink/40" />
                <h3 className="text-xs font-semibold text-ink-muted">
                  Academic record history ({history.academic_records.length} periods)
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-ink/10">
                <table className="w-full text-left text-xs" role="table">
                  <thead className="bg-paper/70 text-ink-muted font-medium border-b border-ink/10 text-xs">
                    <tr>
                      <th scope="col" className="py-2.5 px-3">Date</th>
                      <th scope="col" className="py-2.5 px-3">Subject &amp; assessment</th>
                      <th scope="col" className="py-2.5 px-3 text-center">G1</th>
                      <th scope="col" className="py-2.5 px-3 text-center">G2</th>
                      <th scope="col" className="py-2.5 px-3 text-center">Absences</th>
                      <th scope="col" className="py-2.5 px-3 text-center">Study time</th>
                      <th scope="col" className="py-2.5 px-3 text-center">Data source</th>
                      <th scope="col" className="py-2.5 px-3 text-right">Evaluation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10 font-medium">
                    {history.academic_records.slice(0, 5).map((rec, idx) => {
                      const linkedPred = rec.predictions && rec.predictions[0];
                      const isFaculty = rec.data_source !== "self_reported";

                      return (
                        <tr key={rec.id} className="table-row-hover">
                          <td className="py-2.5 px-3 font-mono text-ink/60">
                            {new Date(rec.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="py-2.5 px-3 text-ink">
                            <span className="font-semibold">{rec.subject || "Mathematics"}</span>
                            <span className="text-ink/40 ml-1.5 text-[11px]">
                              ({rec.assessment_name || rec.term || `Sem ${rec.current_semester}`})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                            {rec.G1 !== null ? rec.G1 : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-edugreen tabular-nums">
                            {rec.G2 !== null ? rec.G2 : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-center tabular-nums">
                            {rec.absences}
                          </td>
                          <td className="py-2.5 px-3 text-center text-ink/60">
                            Tier {rec.studytime}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isFaculty ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-softgreen text-edugreen border border-edugreen/30">
                                Faculty
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-paper text-ink/80 border border-ink/15">
                                Self-reported
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {linkedPred ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium tabular-nums ${
                                linkedPred.risk_level === "High"
                                  ? "bg-coral/15 text-coral border border-coral/30"
                                  : linkedPred.risk_level === "Medium"
                                  ? "bg-amber/15 text-amber-800 border border-amber/30"
                                  : "bg-softgreen text-edugreen border border-edugreen/30"
                              }`}>
                                {linkedPred.risk_level} ({(linkedPred.risk_probability * 100).toFixed(1)}%)
                              </span>
                            ) : idx === 0 && history.latest_prediction ? (
                              <span className="text-[10px] text-edugreen font-medium">Latest Active</span>
                            ) : (
                              <span className="text-[10px] text-ink/40">None</span>
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
        </>
      )}

      {/* Append-Only Invariant Notice */}
      <div className="p-3.5 rounded-xl bg-paper border border-ink/10 flex items-start gap-2.5 text-xs text-ink/75">
        <Shield className="w-4 h-4 text-edugreen flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-ink">Audit Trail Integrity:</strong> Academic performance records and model risk evaluations are strictly append-only in PostgreSQL. Historical evaluations cannot be overwritten or altered.
        </span>
      </div>

      {/* Data Entry Modal */}
      {studentId && (
        <FacultyAcademicDataEntryModal
          studentId={studentId}
          studentCode={studentCode}
          studentName={studentName}
          currentG1={latestRecord?.G1}
          currentAbsences={latestRecord?.absences || 0}
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </section>
  );
}
