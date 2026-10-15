"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  GraduationCap,
  LineChart,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import AcademicTrajectoryChart from "@/components/student/AcademicTrajectoryChart";
import AcademicHistoryTable from "@/components/student/AcademicHistoryTable";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api/client";
import { getStudentHistory, getStudentProfile } from "@/lib/api/students";
import {
  AcademicRecordHistoryItem,
  StudentDetail,
  StudentHistoryResponse,
} from "@/types/student";

export default function StudentPerformancePage() {
  const { user } = useAuth();
  const studentId = user?.student_id;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [history, setHistory] = useState<StudentHistoryResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!studentId) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const [profileData, historyData] = await Promise.all([
          getStudentProfile(studentId!),
          getStudentHistory(studentId!, "asc"), // asc for chronological timeline
        ]);

        if (!isMounted) return;
        setStudent(profileData);
        setHistory(historyData);
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiClientError) {
          setErrorMessage(err.detail);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Failed to load academic performance records.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  const records = history?.academic_records || [];
  const latestRecord: AcademicRecordHistoryItem | undefined =
    records.length > 0 ? records[records.length - 1] : undefined;

  // Compute Grade Velocity: G2 - G1
  const g1 = latestRecord?.G1 ?? null;
  const g2 = latestRecord?.G2 ?? null;
  const hasBothGrades = g1 !== null && g2 !== null;
  const gradeVelocity = hasBothGrades ? g2 - g1 : null;

  // Absences metrics
  const totalAbsences = latestRecord?.absences ?? 0;

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-8 max-w-6xl mx-auto pb-12 page-enter">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/8 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-edugreen bg-softgreen px-2.5 py-0.5 rounded-full border border-softgreen-border">
                Academic performance
              </span>
              <span className="text-xs text-ink-muted">
                Student ID: {student?.student_code || studentId}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-ink tracking-tight mt-1.5">
              Grade Trajectory & Academic Velocity
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl">
              Track your longitudinal performance across Period 1 (G1) and Period 2 (G2)
              assessments, attendance consistency, and grade trajectory.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/student/risk"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-paper border border-ink/12 text-ink text-xs font-medium shadow-xs hover:border-ink/25 transition-all duration-200 btn-interactive"
            >
              <Shield className="w-4 h-4 text-edugreen" />
              <span>View Risk & SHAP Analysis</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-muted" />
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-coral-soft border border-coral/30 text-xs font-semibold text-coral flex items-center justify-between shadow-xs animate-fade-in"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-coral" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-coral hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Supportive Non-Causal Ethics Disclaimer */}
        <div className="p-5 rounded-2xl bg-white border border-edugreen/25 shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-softgreen text-edugreen flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-xs text-ink/80 leading-relaxed">
              <span className="font-bold text-ink block mb-0.5">
                Supportive Performance Context & Non-Causal Disclaimer
              </span>
              <p>
                Academic performance trends and grade velocities are historical progress markers,
                not immutable forecasts. Fluctuations between assessments are a normal part of
                learning. Use these metrics as feedback to celebrate progress and identify where to
                seek additional faculty mentoring or peer study support.
              </p>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="p-12 rounded-3xl bg-white border border-ink/8 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-edugreen border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-ink-muted">
              Loading your academic records and grade trajectories...
            </p>
          </div>
        )}

        {!isLoading && records.length === 0 && (
          <div className="p-12 rounded-3xl bg-white border border-ink/8 text-center">
            <GraduationCap className="w-12 h-12 text-ink-muted/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-ink">No Academic Records Logged Yet</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto">
              Your academic records and milestone evaluations will appear here once your instructors
              or advisors submit your term assessments.
            </p>
          </div>
        )}

        {!isLoading && records.length > 0 && (
          <>
            {/* Top Stat Cards: Grade Velocity, Absences, Latest Milestone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Card 1: Grade Velocity */}
              <div className="p-6 rounded-3xl bg-white border border-ink/8 shadow-xs flex flex-col justify-between hover:border-ink/20 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-ink-muted">
                      Grade velocity (G2 − G1)
                    </span>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        gradeVelocity !== null && gradeVelocity >= 0
                          ? "bg-softgreen text-edugreen"
                          : "bg-amber-soft text-amber"
                      }`}
                    >
                      {gradeVelocity !== null && gradeVelocity >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-sans font-bold tabular-nums text-ink">
                      {gradeVelocity !== null
                        ? `${gradeVelocity > 0 ? "+" : ""}${gradeVelocity.toFixed(1)}`
                        : "N/A"}
                    </span>
                    <span className="text-xs font-medium text-ink-muted">pts</span>
                  </div>

                  <p className="text-xs text-ink-muted mt-3 leading-relaxed">
                    {gradeVelocity !== null ? (
                      gradeVelocity > 0 ? (
                        <span className="text-edugreen font-semibold">
                          Upward trajectory! Your score improved by {gradeVelocity.toFixed(1)} points between Period 1 and Period 2.
                        </span>
                      ) : gradeVelocity === 0 ? (
                        <span>Steady consistency maintained across both evaluation periods.</span>
                      ) : (
                        <span className="text-amber font-semibold">
                          Recent score dip ({gradeVelocity.toFixed(1)} pts). Consider connecting with your course mentor for mid-term review.
                        </span>
                      )
                    ) : (
                      "Requires both G1 and G2 assessment scores to compute trajectory delta."
                    )}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-ink/6 text-[11px] text-ink-muted flex items-center justify-between tabular-nums">
                  <span>G1: {g1 !== null ? `${g1}/20` : "--"}</span>
                  <ArrowRight className="w-3 h-3 text-ink-muted" />
                  <span>G2: {g2 !== null ? `${g2}/20` : "--"}</span>
                </div>
              </div>

              {/* Card 2: Absences & Attendance */}
              <div className="p-6 rounded-3xl bg-white border border-ink/8 shadow-xs flex flex-col justify-between hover:border-ink/20 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-ink-muted">
                      Course absences
                    </span>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        totalAbsences <= 4
                          ? "bg-softgreen text-edugreen"
                          : totalAbsences <= 10
                          ? "bg-amber-soft text-amber"
                          : "bg-coral-soft text-coral"
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-sans font-bold tabular-nums text-ink">{totalAbsences}</span>
                    <span className="text-xs font-medium text-ink-muted">missed sessions</span>
                  </div>

                  <p className="text-xs text-ink-muted mt-3 leading-relaxed">
                    {totalAbsences <= 4 ? (
                      <span className="text-edugreen font-semibold">
                        Excellent attendance! Staying present directly reinforces course comprehension.
                      </span>
                    ) : totalAbsences <= 10 ? (
                      <span className="text-amber font-semibold">
                        Moderate absences recorded. Make sure to review lecture notes for any missed modules.
                      </span>
                    ) : (
                      <span className="text-coral font-semibold">
                        Higher absence count recorded. Missed sessions strongly correlate with exam risk.
                      </span>
                    )}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-ink/6 text-[11px] text-ink-muted">
                  Recorded in term: {latestRecord?.term || "Current Term"}
                </div>
              </div>

              {/* Card 3: Dedicated Study Hours */}
              <div className="p-6 rounded-3xl bg-white border border-ink/8 shadow-xs flex flex-col justify-between hover:border-ink/20 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-ink-muted">
                      Weekly study commitment
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-softgreen text-edugreen flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-sans font-bold tabular-nums text-ink">
                      {latestRecord?.studytime === 1
                        ? "< 2"
                        : latestRecord?.studytime === 2
                        ? "2–5"
                        : latestRecord?.studytime === 3
                        ? "5–10"
                        : latestRecord?.studytime === 4
                        ? "> 10"
                        : "2–5"}
                    </span>
                    <span className="text-xs font-medium text-ink-muted">hrs/week</span>
                  </div>

                  <p className="text-xs text-ink-muted mt-3 leading-relaxed">
                    Consistent weekly study habits provide a strong protective buffer against
                    examination surprises.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-ink/6 text-[11px] text-ink-muted flex items-center justify-between">
                  <span>Self-reported dedication</span>
                  <Link
                    href="/dashboard/student"
                    className="text-edugreen hover:underline font-semibold"
                  >
                    Update in Dashboard →
                  </Link>
                </div>
              </div>
            </div>

            {/* Academic Trajectory Chart */}
            <div className="p-7 rounded-3xl bg-white border border-ink/8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-edugreen" />
                    <h2 className="text-base font-display text-ink">
                      Longitudinal Assessment Trajectory
                    </h2>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    Visualizing score trends across Period 1 (G1) and Period 2 (G2) milestones on
                    the 0–20 academic scale.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-ink-muted">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-edugreen" />
                    <span>Period 1 (G1)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-mint border border-ink/20" />
                    <span>Period 2 (G2)</span>
                  </div>
                </div>
              </div>

              <AcademicTrajectoryChart records={records} />
            </div>

            {/* Complete History Table */}
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-ink">Recorded Assessment Milestones</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Detailed breakdown of every recorded academic evaluation on file.
                </p>
              </div>
              <AcademicHistoryTable records={records} />
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
