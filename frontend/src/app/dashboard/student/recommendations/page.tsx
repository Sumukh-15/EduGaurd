"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  History,
  Info,
  Layers,
  Lightbulb,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import RecommendationCard from "@/components/student/RecommendationCard";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api/client";
import { getStudentRecommendations } from "@/lib/api/recommendations";
import { StudentRecommendationsResponse } from "@/types/recommendation";

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.detail;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred while retrieving your academic recommendations.";
}

export default function StudentRecommendationsPage() {
  const { user } = useAuth();
  const studentId = user?.student_id;

  const [dataLoaded, setDataLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<StudentRecommendationsResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = !!studentId && !dataLoaded && !errorMessage;

  const fetchRecommendations = useCallback(async () => {
    if (!studentId) return;

    try {
      setErrorMessage(null);
      // Retrieve authoritative deterministic recommendations from locked backend endpoint
      const data = await getStudentRecommendations(studentId);
      setResponse(data);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setDataLoaded(true);
      setIsRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    let isMounted = true;
    if (!studentId) return;

    async function load() {
      try {
        setErrorMessage(null);
        const data = await getStudentRecommendations(studentId!);
        if (isMounted) {
          setResponse(data);
          setDataLoaded(true);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(extractErrorMessage(err));
          setDataLoaded(true);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRecommendations();
  };

  const recommendations = response?.recommendations || [];
  const totalCount = recommendations.length;
  const highPriorityCount = recommendations.filter(
    (r) => r.priority.toLowerCase() === "high"
  ).length;
  const mediumPriorityCount = recommendations.filter(
    (r) => r.priority.toLowerCase() === "medium"
  ).length;

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Deterministic Advisory Guidance</span>
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Decision Support
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Academic Recommendations & Intervention View
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Supportive, rule-based recommendations evaluated from your observed academic telemetry
              to help you prioritize study habits, attendance, and coursework review.
            </p>
          </div>

          {/* Read-Only Refresh Control */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all disabled:opacity-50"
              aria-label="Refresh recommendations"
            >
              <RefreshCw
                className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
                aria-hidden="true"
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-3 animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Evaluating Academic Recommendations...
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Querying institutional heuristics and latest telemetry snapshot.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-rose-900 dark:text-rose-200">
                  Unable to Load Recommendations
                </h3>
                <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">
                  {errorMessage}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                  <Link
                    href="/dashboard/student"
                    className="text-xs font-medium text-rose-700 dark:text-rose-300 hover:underline"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success / Loaded Content */}
        {!isLoading && !errorMessage && response && (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Suggestions
                  </span>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {totalCount}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    active rule triggers
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    High Priority
                  </span>
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                    {highPriorityCount}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    immediate focus
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Medium Priority
                  </span>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <Info className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                    {mediumPriorityCount}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    habit / support
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Evaluation Basis
                  </span>
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {response.student_code}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {response.prediction_id
                      ? `Linked Eval #${response.prediction_id}`
                      : "Telemetry Telemetry"}
                  </div>
                </div>
              </div>
            </div>

            {/* Context Notice / Model Snapshot Banner */}
            {response.prediction_id && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Evaluated alongside Model Prediction #{response.prediction_id}:
                    </span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">
                      Assigned Risk:{" "}
                      <strong className="text-slate-800 dark:text-slate-100">
                        {response.risk_level || "Standard"}
                      </strong>{" "}
                      {response.risk_probability !== null && response.risk_probability !== undefined && (
                        <span>
                          ({(response.risk_probability * 100).toFixed(1)}% probability)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5 shrink-0">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Strictly Read-Only Snapshot</span>
                </div>
              </div>
            )}

            {/* State 1: No Telemetry or No Record */}
            {response.academic_record_id === null && totalCount === 0 && (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-4">
                  <FileQuestion className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Academic Telemetry Not Available
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                  Intervention recommendations cannot be generated until your coursework telemetry,
                  period grades, and attendance records are uploaded by faculty administration.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/student"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                  >
                    <span>Return to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* State 2: Telemetry exists, but ZERO recommendations triggered (Ideal/On Track) */}
            {response.academic_record_id !== null && totalCount === 0 && (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 shadow-sm">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-4">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  No Active Intervention Recommendations
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-lg mx-auto">
                  Your academic indicators currently meet institutional passing and attendance thresholds.
                  No heuristic rules (grade drop, low secondary score, chronic absence, or low study time)
                  were triggered.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/dashboard/student/history"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
                  >
                    <History className="w-4 h-4" />
                    <span>View Academic Trajectory</span>
                  </Link>
                  <Link
                    href="/dashboard/student"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                  >
                    <span>View Risk Assessment</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* State 3: Recommendations Available (Canonical Order) */}
            {totalCount > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Identified Advisory Guidance ({totalCount})
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Ordered by institutional priority
                  </span>
                </div>

                {/* Canonical List of Recommendation Cards */}
                <div className="grid grid-cols-1 gap-4">
                  {recommendations.map((item, idx) => (
                    <RecommendationCard
                      key={item.id || `rec-${idx}`}
                      recommendation={item}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Supportive / Non-Causal Advisory Notice Card */}
            <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                  <h3 className="font-bold text-sm sm:text-base text-amber-950 dark:text-amber-100">
                    Important Guidance & Non-Causal Principle
                  </h3>
                  <p className="leading-relaxed">
                    {response.advisory_notice || (
                      <>
                        These recommendations are generated from predefined academic indicators and are intended
                        as supportive guidance. They are not causal conclusions or automatic decisions. Discuss
                        appropriate next steps with a faculty member or academic advisor.
                      </>
                    )}
                  </p>
                  <p className="text-amber-800/90 dark:text-amber-300/80 text-xs">
                    Recommendations never enforce disciplinary sanctions or grade penalties. They highlight
                    opportunities for tutoring, syllabus review, and structured time management.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation to Related Student Views */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard/student"
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Current Risk Dashboard
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Inspect current risk gauge and SHAP feature contributions
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/dashboard/student/history"
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Academic History & Trajectory
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Explore chronological grade shift and past model evaluations
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
