"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Cpu,
  Loader2,
  RefreshCw,
  Shield,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import AnalyticsEmptyState from "@/components/analytics/AnalyticsEmptyState";
import AnalyticsStatCard from "@/components/analytics/AnalyticsStatCard";
import RiskDistributionChart from "@/components/analytics/RiskDistributionChart";
import SchoolBreakdownCard from "@/components/analytics/SchoolBreakdownCard";
import { useAuth } from "@/context/AuthContext";
import { getFacultyAnalytics } from "@/lib/api/analytics";
import { ApiClientError } from "@/lib/api/client";
import { FacultyAnalyticsResponse } from "@/types/analytics";

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.detail;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred while communicating with the analytics service.";
}

export default function FacultyDashboardPage() {
  const { user } = useAuth();

  const [dataLoaded, setDataLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<FacultyAnalyticsResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = !dataLoaded && !errorMessage;
  const roleTitle = user?.role === "admin" ? "Institutional Administrator" : "Faculty Member";

  const fetchAnalytics = async () => {
    try {
      setErrorMessage(null);
      const data = await getFacultyAnalytics();
      setAnalytics(data);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setDataLoaded(true);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const data = await getFacultyAnalytics();
        if (isMounted) {
          setAnalytics(data);
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
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  const coveragePercent =
    analytics && analytics.total_students > 0
      ? Math.round((analytics.evaluated_students / analytics.total_students) * 100)
      : 0;

  const avgProbPercent =
    analytics && analytics.average_risk_probability !== null
      ? (analytics.average_risk_probability * 100).toFixed(1)
      : "0.0";

  return (
    <RoleGuard allowedRoles={["faculty", "admin"]}>
      <div className="max-w-6xl mx-auto space-y-7">
        {/* Welcome & Portal Header */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-700/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold mb-2.5 backdrop-blur-sm">
                <BarChart3 className="w-4 h-4" />
                <span>{roleTitle} Overview</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Institutional Cohort Analytics
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/90 mt-1.5 max-w-2xl leading-relaxed">
                Aggregated early-warning risk monitoring across active student populations. Real-time statistical triage calibrated by the Phase 1 machine learning pipeline.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl text-left sm:text-right backdrop-blur-sm border border-white/10">
                <p className="text-[11px] text-indigo-200 uppercase tracking-wider font-semibold">
                  Authorized Role
                </p>
                <p className="text-sm font-bold text-white capitalize mt-0.5">
                  {user?.role || "Faculty"} Access
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                aria-label="Refresh cohort analytics"
                className="py-2 px-3.5 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Updating..." : "Refresh Analytics"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Ethical Guarantee Callout */}
        <div
          role="note"
          aria-label="Institutional privacy guarantee"
          className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 text-xs flex items-start gap-3 leading-relaxed"
        >
          <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold mb-0.5">
              Population Anonymity Guarantee
            </strong>
            <span>
              In strict accordance with student educational data privacy standards, this overview presents non-identifying aggregate metrics. Individual student identities, records, and personalized SHAP explanations are not enumerated on this dashboard.
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Aggregating institutional risk analytics from PostgreSQL...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <AnalyticsEmptyState
            type="error"
            errorMessage={errorMessage}
            onRetry={handleManualRefresh}
            isRetrying={isRefreshing}
          />
        )}

        {/* Populated Analytics */}
        {!isLoading && !errorMessage && analytics && (
          <>
            {/* Zero Students Empty State */}
            {analytics.total_students === 0 && (
              <AnalyticsEmptyState type="no_students" />
            )}

            {/* Students exist but zero evaluations */}
            {analytics.total_students > 0 && analytics.evaluated_students === 0 && (
              <AnalyticsEmptyState type="no_evaluations" />
            )}

            {/* Analytics Metric Cards Grid */}
            {analytics.total_students > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <AnalyticsStatCard
                  title="Total Enrolled Population"
                  value={analytics.total_students}
                  subtitle={`${analytics.unevaluated_students} students pending initial evaluation`}
                  icon={Users}
                  badge={{
                    text: `${analytics.school_distribution.length} Campuses`,
                    variant: "slate",
                  }}
                />

                <AnalyticsStatCard
                  title="Evaluation Coverage"
                  value={analytics.evaluated_students}
                  subtitle={`of ${analytics.total_students} registered students evaluated`}
                  icon={CheckCircle}
                  progress={{
                    value: coveragePercent,
                    label: "Evaluation Coverage",
                  }}
                  badge={{
                    text: `${coveragePercent}% Coverage`,
                    variant: coveragePercent >= 70 ? "emerald" : "amber",
                  }}
                />

                <AnalyticsStatCard
                  title="Flagged At-Risk Students"
                  value={analytics.at_risk_count}
                  subtitle={`Classified at-risk at binary threshold >= 0.50`}
                  icon={AlertTriangle}
                  badge={{
                    text: `${analytics.at_risk_percentage}% At-Risk`,
                    variant: analytics.at_risk_count > 0 ? "rose" : "emerald",
                  }}
                />

                <AnalyticsStatCard
                  title="Cohort Mean Risk Probability"
                  value={`${avgProbPercent}%`}
                  subtitle={`Average raw probability: ${analytics.average_risk_probability.toFixed(4)}`}
                  icon={Activity}
                  badge={{
                    text: `Model ${analytics.model_version}`,
                    variant: "indigo",
                  }}
                />
              </div>
            )}

            {/* Risk Distribution Chart */}
            {analytics.evaluated_students > 0 && (
              <RiskDistributionChart
                distribution={analytics.risk_distribution}
                percentages={analytics.risk_percentages}
                evaluatedCount={analytics.evaluated_students}
              />
            )}

            {/* School / Campus Breakdown */}
            {analytics.school_distribution.length > 0 && (
              <SchoolBreakdownCard schools={analytics.school_distribution} />
            )}

            {/* Operational Navigation Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <Link
                href="/dashboard/faculty/review"
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Direct Student ID Lookup
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Phase 3.5
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Inspect specific student academic trajectories and SHAP explanations by numeric ID (not a student directory).
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/faculty/upload"
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Dataset Management
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Phase 3.6
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Upload official standardized CSV datasets to batch-ingest student records and update cohort analytics.
                  </p>
                </div>
              </Link>
            </div>

            {/* Model & Computation Metadata Footer */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  Active Model: <strong>{analytics.model_version}</strong> (Phase 1 Logistic Regression Pipeline)
                </span>
              </div>
              <div>
                Computed:{" "}
                <time dateTime={analytics.generated_at}>
                  {new Date(analytics.generated_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </time>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
