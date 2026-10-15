"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  History,
  Loader2,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import AcademicHistoryTable from "@/components/student/AcademicHistoryTable";
import AcademicTrajectoryChart from "@/components/student/AcademicTrajectoryChart";
import RiskTrajectoryTimeline from "@/components/student/RiskTrajectoryTimeline";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api/client";
import { getStudentHistory } from "@/lib/api/students";
import { StudentHistoryResponse } from "@/types/student";

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.detail;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred while retrieving your academic history.";
}

export default function StudentHistoryPage() {
  const { user } = useAuth();
  const studentId = user?.student_id;

  const [dataLoaded, setDataLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<StudentHistoryResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = !!studentId && !dataLoaded && !errorMessage;

  const fetchHistory = async () => {
    if (!studentId) return;

    try {
      setErrorMessage(null);
      // Fetch chronological history (order=asc: earlier to later)
      const data = await getStudentHistory(studentId, "asc");
      setHistory(data);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setDataLoaded(true);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (!studentId) return;

    async function loadInitial() {
      try {
        const data = await getStudentHistory(studentId!, "asc");
        if (isMounted) {
          setHistory(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(extractErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setDataLoaded(true);
        }
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchHistory();
  };

  // Trajectory Summary Indicators
  const records = history?.academic_records || [];
  const latestRecord = records[records.length - 1];
  const firstRecord = records[0];

  const netVelocity =
    latestRecord && firstRecord && latestRecord.G2 !== null && firstRecord.G2 !== null
      ? Math.round((latestRecord.G2 - firstRecord.G2) * 10) / 10
      : null;

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="max-w-5xl mx-auto space-y-7 page-enter">
        {/* Header Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-ink text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-edugreen/15 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-mint/25 text-mint text-xs font-medium mb-2.5">
                <History className="w-4 h-4" />
                <span>Longitudinal Trajectory • Historical Evaluation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display tracking-tight">
                Academic History &amp; Trajectory
              </h1>
              <p className="text-xs sm:text-sm text-white/75 mt-1.5 max-w-2xl leading-relaxed">
                Chronological timeline of your course performance periods, verified grade trends, and historical risk evaluations computed by the EduGuard ML pipeline.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
              <div className="p-3 bg-white/5 rounded-xl text-left sm:text-right backdrop-blur-xs border border-white/10">
                <p className="text-xs text-mint font-medium">
                  Institutional ID
                </p>
                <p className="text-sm font-semibold text-white font-mono mt-0.5">
                  {user?.student_code || `Student #${studentId}`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                aria-label="Refresh academic history"
                className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-medium border border-white/10 transition-all duration-200 flex items-center gap-2 focus:outline-none btn-interactive"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Updating..." : "Refresh History"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 rounded-2xl bg-white border border-ink/10 text-center flex flex-col items-center justify-center space-y-3 paper-surface">
            <Loader2 className="w-8 h-8 text-edugreen animate-spin" />
            <p className="text-sm font-semibold text-ink/70">
              Retrieving your longitudinal academic records from PostgreSQL...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="p-8 rounded-2xl bg-coral/10 border border-coral/30 text-center space-y-3 paper-surface">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-coral/15 text-coral mb-1">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-ink">
              Unable to Load Academic History
            </h2>
            <p className="text-xs text-ink/75 max-w-md mx-auto">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="mt-2 py-2 px-4 rounded-xl bg-coral text-white text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Loading</span>
            </button>
          </div>
        )}

        {/* Populated Content */}
        {!isLoading && !errorMessage && history && (
          <>
            {/* Zero Records Empty State */}
            {history.total_records === 0 ? (
              <div className="p-12 rounded-2xl bg-white border border-ink/10 shadow-sm text-center space-y-4 paper-surface">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-paper text-ink/40 mb-1">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-ink">
                  No Academic History Recorded Yet
                </h2>
                <p className="text-xs sm:text-sm text-ink/65 max-w-md mx-auto leading-relaxed">
                  Your student account is active, but official academic performance updates have not yet been logged by your instructors or faculty administration.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/student"
                    className="inline-flex items-center gap-2 text-xs font-bold text-edugreen hover:underline"
                  >
                    <span>Return to Student Risk Overview</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {/* Longitudinal Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Evaluation Periods */}
                  <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface hover:border-ink/20 transition-colors">
                    <div className="flex items-center justify-between text-ink/45 mb-2">
                      <span className="text-xs font-medium text-ink-muted">
                        Recorded periods
                      </span>
                      <Calendar className="w-4 h-4 text-edugreen" />
                    </div>
                    <p className="text-2xl font-sans font-bold tabular-nums text-ink">
                      {history.total_records}
                    </p>
                    <span className="text-[11px] text-ink/50">
                      Academic updates logged
                    </span>
                  </div>

                  {/* Latest Midterm (G2) */}
                  <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface hover:border-ink/20 transition-colors">
                    <div className="flex items-center justify-between text-ink/45 mb-2">
                      <span className="text-xs font-medium text-ink-muted">
                        Latest mark (G2)
                      </span>
                      <GraduationCap className="w-4 h-4 text-edugreen" />
                    </div>
                    <p className="text-2xl font-sans font-bold tabular-nums text-edugreen">
                      {latestRecord && latestRecord.G2 !== null ? `${latestRecord.G2} / 20` : "N/A"}
                    </p>
                    <span className="text-[11px] text-ink/50">
                      {latestRecord?.term || "Most recent period"}
                    </span>
                  </div>

                  {/* Net Trajectory Velocity */}
                  <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface hover:border-ink/20 transition-colors">
                    <div className="flex items-center justify-between text-ink/45 mb-2">
                      <span className="text-xs font-medium text-ink-muted">
                        Net grade shift
                      </span>
                      {netVelocity && netVelocity > 0 ? (
                        <TrendingUp className="w-4 h-4 text-edugreen" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-coral" />
                      )}
                    </div>
                    <p className={`text-2xl font-sans font-bold tabular-nums ${netVelocity && netVelocity > 0 ? "text-edugreen" : netVelocity && netVelocity < 0 ? "text-coral" : "text-ink"}`}>
                      {netVelocity !== null
                        ? `${netVelocity > 0 ? "+" : ""}${netVelocity} pts`
                        : "N/A"}
                    </p>
                    <span className="text-[11px] text-ink/50">
                      Overall change across periods
                    </span>
                  </div>

                  {/* Model Predictions Logged */}
                  <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface hover:border-ink/20 transition-colors">
                    <div className="flex items-center justify-between text-ink/45 mb-2">
                      <span className="text-xs font-medium text-ink-muted">
                        ML evaluations
                      </span>
                      <Clock className="w-4 h-4 text-edugreen" />
                    </div>
                    <p className="text-2xl font-sans font-bold tabular-nums text-ink">
                      {history.total_predictions}
                    </p>
                    <span className="text-[11px] text-ink/50">
                      Risk forecasts generated
                    </span>
                  </div>
                </div>

                {/* Section 1: Academic Trajectory Chart */}
                <AcademicTrajectoryChart records={history.academic_records} />

                {/* Section 2: Risk Evaluation Trajectory Timeline */}
                <RiskTrajectoryTimeline predictions={history.predictions} />

                {/* Section 3: Detailed Academic Records Table */}
                <AcademicHistoryTable records={history.academic_records} />

                {/* Read-Only Invariant & Ethical Context Footer */}
                <div className="p-4 rounded-xl bg-paper border border-ink/10 text-xs text-ink/70 space-y-1.5 leading-relaxed">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <Shield className="w-4 h-4 text-edugreen" />
                    <span>About Your Academic History &amp; Records</span>
                  </div>
                  <p>
                    This longitudinal history is maintained for educational self-monitoring. Historical records and predictive assessments reflect verified institutional marks and your reported study habits logged in PostgreSQL. Model forecasts reflect statistical risk patterns and do not determine final academic outcomes.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </RoleGuard>
  );
}
