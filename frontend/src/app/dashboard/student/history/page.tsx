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
      <div className="max-w-5xl mx-auto space-y-7">
        {/* Header Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-700/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold mb-2.5 backdrop-blur-sm">
                <History className="w-4 h-4" />
                <span>Longitudinal Trajectory</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Academic History &amp; Trajectory
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/90 mt-1.5 max-w-2xl leading-relaxed">
                Chronological timeline of your course performance periods, verified grade trends, and historical risk evaluations computed by the EduGuard ML pipeline.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl text-left sm:text-right backdrop-blur-sm border border-white/10">
                <p className="text-[11px] text-indigo-200 uppercase tracking-wider font-semibold">
                  Institutional ID
                </p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">
                  {user?.student_code || `Student #${studentId}`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                aria-label="Refresh academic history"
                className="py-2 px-3.5 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Updating..." : "Refresh History"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Retrieving your longitudinal telemetry records from PostgreSQL...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 mb-1">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
              Unable to Load Academic History
            </h2>
            <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="mt-2 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-2"
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
              <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 mb-1">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  No Academic History Recorded Yet
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your student account is active, but official academic performance telemetry has not yet been logged by your instructors or faculty administration.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/student"
                    className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
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
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        Recorded Periods
                      </span>
                      <Calendar className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {history.total_records}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Telemetry submissions logged
                    </span>
                  </div>

                  {/* Latest Midterm (G2) */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        Latest Mark (G2)
                      </span>
                      <GraduationCap className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {latestRecord && latestRecord.G2 !== null ? `${latestRecord.G2} / 20` : "N/A"}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {latestRecord?.term || "Most recent period"}
                    </span>
                  </div>

                  {/* Net Trajectory Velocity */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        Net Grade Shift
                      </span>
                      {netVelocity && netVelocity > 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {netVelocity !== null
                        ? `${netVelocity > 0 ? "+" : ""}${netVelocity} pts`
                        : "N/A"}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Overall change across periods
                    </span>
                  </div>

                  {/* Model Predictions Logged */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        ML Evaluations
                      </span>
                      <Clock className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      {history.total_predictions}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Risk forecasts generated
                    </span>
                  </div>
                </div>

                {/* Section 1: Academic Trajectory Chart */}
                <AcademicTrajectoryChart records={history.academic_records} />

                {/* Section 2: Risk Evaluation Trajectory Timeline */}
                <RiskTrajectoryTimeline predictions={history.predictions} />

                {/* Section 3: Detailed Academic Telemetry Table */}
                <AcademicHistoryTable records={history.academic_records} />

                {/* Read-Only Invariant & Ethical Context Footer */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed">
                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    <span>Non-Causal Interpretation &amp; Audit Trail Guarantee</span>
                  </div>
                  <p>
                    This longitudinal history is strictly read-only and maintained for educational self-monitoring. Historical records and predictive assessments reflect verified institutional telemetry logged in PostgreSQL. Model forecasts reflect statistical risk patterns and do not determine final academic outcomes.
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
