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
      <div className="max-w-6xl mx-auto space-y-8 pb-12 page-enter">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-softgreen text-edugreen border border-edugreen/25">
                <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Advisory Guidance</span>
              </span>
              <span className="text-xs text-ink/30">•</span>
              <span className="text-xs text-ink/60">
                Decision Support
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-ink tracking-tight">
              What Should I Do Next?
            </h1>
            <p className="text-sm text-ink/65 mt-1 max-w-3xl">
              Supportive, rule-based recommendations evaluated from your observed academic marks and attendance to help you prioritize study habits and coursework review.
            </p>
          </div>

          {/* Refresh Control */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink/15 bg-white hover:bg-paper text-xs font-medium text-ink shadow-xs transition-all duration-200 disabled:opacity-50 btn-interactive"
              aria-label="Refresh recommendations"
            >
              <RefreshCw
                className={`w-4 h-4 text-ink/60 ${
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
          <div className="p-12 text-center rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-softgreen text-edugreen mb-3 animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h2 className="text-base font-semibold text-ink">
              Evaluating Academic Recommendations...
            </h2>
            <p className="text-sm text-ink/60 mt-1">
              Checking academic indicators against institutional guidelines.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="p-6 rounded-2xl bg-coral/10 border border-coral/30 shadow-sm paper-surface">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-xl bg-coral/15 text-coral shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-ink">
                  Unable to Load Recommendations
                </h3>
                <p className="text-sm text-ink/75 mt-1">
                  {errorMessage}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-coral text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                  <Link
                    href="/dashboard/student"
                    className="text-xs font-medium text-coral hover:underline"
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
              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface hover:border-ink/20 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted">
                    Total suggestions
                  </span>
                  <div className="p-2 rounded-xl bg-softgreen text-edugreen">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-sans font-bold tabular-nums text-ink">
                    {totalCount}
                  </span>
                  <span className="text-xs text-ink/50">
                    actionable items
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface hover:border-ink/20 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted">
                    High priority
                  </span>
                  <div className="p-2 rounded-xl bg-coral/15 text-coral">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-sans font-bold tabular-nums text-coral">
                    {highPriorityCount}
                  </span>
                  <span className="text-xs text-ink/50">
                    immediate attention
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface hover:border-ink/20 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted">
                    Medium priority
                  </span>
                  <div className="p-2 rounded-xl bg-amber/15 text-amber">
                    <Info className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-sans font-bold tabular-nums text-amber">
                    {mediumPriorityCount}
                  </span>
                  <span className="text-xs text-ink/50">
                    study / attendance habit
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface hover:border-ink/20 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted">
                    Current risk status
                  </span>
                  <div className="p-2 rounded-xl bg-paper text-edugreen">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-semibold text-ink truncate">
                    {response.risk_level || "On Track"} Risk
                  </div>
                  <div className="text-xs text-ink/50 truncate mt-0.5 tabular-nums">
                    {response.risk_probability !== null && response.risk_probability !== undefined
                      ? `${(response.risk_probability * 100).toFixed(1)}% estimated risk`
                      : "Evaluated from latest academic update"}
                  </div>
                </div>
              </div>
            </div>

            {/* State 1: No Academic Record Registered Yet */}
            {response.academic_record_id === null && totalCount === 0 && (
              <div className="p-12 text-center rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-paper text-ink/40 mb-4">
                  <FileQuestion className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-ink">
                  Academic Data Not Yet Available
                </h2>
                <p className="text-sm text-ink/60 mt-2 max-w-md mx-auto">
                  Recommendations cannot be evaluated until your assessment scores and attendance are recorded by faculty.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard/student"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-sm font-semibold transition-colors"
                  >
                    <span>Return to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* State 2: Academic Record exists, but ZERO recommendations triggered (Low Risk / On Track) */}
            {response.academic_record_id !== null && totalCount === 0 && (
              <div className="p-10 rounded-2xl bg-white border border-edugreen/25 shadow-sm space-y-6 text-center sm:text-left paper-surface">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-softgreen text-edugreen flex-shrink-0">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-ink">
                      &quot;You&apos;re currently on track. No urgent interventions are recommended.&quot;
                    </h2>
                    <p className="text-sm text-ink/70 leading-relaxed max-w-2xl">
                      Your recent assessment marks and attendance records currently meet all institutional passing and engagement standards.
                    </p>
                  </div>
                </div>

                {/* Maintenance Guidance */}
                <div className="p-5 rounded-xl bg-paper border border-ink/10 space-y-3">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                    Recommended Maintenance Guidance
                  </h3>
                  <ul className="text-xs text-ink/75 space-y-2 list-disc list-inside">
                    <li>Maintain your current attendance consistency and avoid unexcused absences.</li>
                    <li>Continue your dedicated weekly study routines and assignment reviews.</li>
                    <li>Feel free to visit instructor office hours to preview upcoming syllabus topics.</li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href="/dashboard/student"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-bold transition-colors shadow-sm"
                  >
                    <span>Back to Risk Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/dashboard/student/history"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-paper border border-ink/15 text-ink text-xs font-semibold hover:border-ink/30 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Academic History</span>
                  </Link>
                </div>
              </div>
            )}

            {/* State 3: Recommendations Triggered */}
            {totalCount > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-edugreen" />
                    <h2 className="text-base font-bold text-ink">
                      Recommended Next Actions ({totalCount})
                    </h2>
                  </div>
                  <span className="text-xs text-ink/45">
                    Ordered by priority
                  </span>
                </div>

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

            {/* Advisory Notice */}
            <div className="p-5 rounded-2xl bg-paper border border-ink/10 flex items-start gap-4">
              <div className="p-2 rounded-xl bg-white border border-ink/10 text-edugreen shrink-0 shadow-xs">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs text-ink/80">
                <h3 className="font-bold text-sm text-ink">
                  Advisory Support Notice
                </h3>
                <p className="leading-relaxed">
                  These recommendations are supportive guidelines generated to help you prioritize your studies. They are not disciplinary actions or automatic decisions. Feel free to discuss them with your faculty mentor.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
