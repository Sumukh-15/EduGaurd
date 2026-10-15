"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Cpu,
  Loader2,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import AnalyticsEmptyState from "@/components/analytics/AnalyticsEmptyState";
import AnalyticsStatCard from "@/components/analytics/AnalyticsStatCard";
import ClassAveragesCard from "@/components/analytics/ClassAveragesCard";
import RiskDistributionChart from "@/components/analytics/RiskDistributionChart";
import RiskTrendChart from "@/components/analytics/RiskTrendChart";
import SchoolBreakdownCard from "@/components/analytics/SchoolBreakdownCard";
import StudentsWorseningCard from "@/components/analytics/StudentsWorseningCard";
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

export default function FacultyDetailedAnalyticsPage() {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<FacultyAnalyticsResponse | null>(null);
  const [bucket, setBucket] = useState<"day" | "week">("day");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = !dataLoaded && !errorMessage;

  const fetchAnalytics = async (selectedBucket: "day" | "week") => {
    try {
      setErrorMessage(null);
      const data = await getFacultyAnalytics(selectedBucket);
      setAnalytics(data);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setDataLoaded(true);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics(bucket);
  }, [bucket]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics(bucket);
  };

  const handleBucketChange = (newBucket: "day" | "week") => {
    setBucket(newBucket);
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
      <div className="max-w-6xl mx-auto space-y-7 pb-12 page-enter">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs">
          <Link
            href="/dashboard/faculty"
            className="inline-flex items-center gap-1.5 text-ink/60 hover:text-edugreen font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Faculty Dashboard</span>
          </Link>

          <Link
            href="/dashboard/faculty/students"
            className="text-edugreen font-medium hover:underline"
          >
            Open Student Directory &rarr;
          </Link>
        </div>

        {/* Detailed Hero Header - Dark Ink Editorial Hero */}
        <div className="p-6 sm:p-8 rounded-2xl bg-ink text-paper shadow-sm border border-ink/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint/15 text-mint text-xs font-medium mb-2.5 backdrop-blur-sm border border-mint/20">
                <BarChart3 className="w-4 h-4" />
                <span>PRD F9 / F11 Analytics &amp; Trends</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-normal tracking-tight text-white">
                Cohort Analytics &amp; Risk Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-paper/80 mt-1.5 max-w-2xl leading-relaxed">
                Comprehensive class-level academic telemetry averages, temporal risk distribution trends, and deteriorating trajectory tracking across scoped students.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
              <div className="inline-flex items-center bg-white/10 p-1 rounded-xl border border-white/20 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => handleBucketChange("day")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    bucket === "day"
                      ? "bg-white text-ink shadow-sm"
                      : "text-paper/80 hover:text-white"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Daily</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBucketChange("week")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    bucket === "week"
                      ? "bg-white text-ink shadow-sm"
                      : "text-paper/80 hover:text-white"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Weekly</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="py-2 px-3.5 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Recalculating..." : "Refresh Trends"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Callout */}
        <div
          role="note"
          aria-label="Institutional privacy guarantee"
          className="p-4 rounded-xl bg-softgreen/40 border border-edugreen/20 text-ink/80 text-xs flex items-start gap-3 leading-relaxed"
        >
          <Shield className="w-5 h-5 text-edugreen flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold mb-0.5 text-ink">
              Population Anonymity Guarantee &amp; Zero Target Leakage
            </strong>
            <span>
              All analytics, class averages, and risk trends are computed with zero target label leakage ($G3$ is excluded). Individual student records are scoped to assigned advisees.
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 rounded-2xl bg-white border border-ink/10 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-edugreen animate-spin" />
            <p className="text-sm font-semibold text-ink/70">
              Aggregating longitudinal trends and telemetry averages...
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

        {/* Analytics Content */}
        {!isLoading && !errorMessage && analytics && (
          <>
            {/* Empty states */}
            {analytics.total_students === 0 && <AnalyticsEmptyState type="no_students" />}

            {analytics.total_students > 0 && analytics.evaluated_students === 0 && (
              <AnalyticsEmptyState type="no_evaluations" />
            )}

            {analytics.total_students > 0 && (
              <>
                {/* 1. Macro Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <AnalyticsStatCard
                    title="Total Population"
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
                    subtitle={`Classified at-risk at threshold >= 0.50`}
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

                {/* 2. Class Averages Cards (PRD F9) */}
                <ClassAveragesCard averages={analytics.class_averages} />

                {/* 3. Recharts Risk Trend Over Time (PRD F11) */}
                <RiskTrendChart
                  trend={analytics.risk_trend}
                  bucket={bucket}
                  onBucketChange={handleBucketChange}
                  isUpdating={isRefreshing}
                />

                {/* 4. Deteriorating Students Trajectory Alert (Worsening >= 15%) */}
                <StudentsWorseningCard
                  students={analytics.students_worsening}
                  count={analytics.students_worsening_count}
                />

                {/* 5. Risk Distribution Chart with Recharts Donut & Bar */}
                {analytics.evaluated_students > 0 && (
                  <RiskDistributionChart
                    distribution={analytics.risk_distribution}
                    percentages={analytics.risk_percentages}
                    evaluatedCount={analytics.evaluated_students}
                  />
                )}

                {/* 6. Campus / School Breakdown */}
                {analytics.school_distribution.length > 0 && (
                  <SchoolBreakdownCard schools={analytics.school_distribution} />
                )}

                {/* Footer Metadata */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink/60 border-t border-ink/10">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-edugreen" />
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
          </>
        )}
      </div>
    </RoleGuard>
  );
}
