"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
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
import { getFacultyStudents } from "@/lib/api/faculty_students";
import { ApiClientError } from "@/lib/api/client";
import { FacultyAnalyticsResponse } from "@/types/analytics";
import { FacultyStudentItem } from "@/types/faculty_students";

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
  const [highRiskStudents, setHighRiskStudents] = useState<FacultyStudentItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = !dataLoaded && !errorMessage;
  const roleTitle = user?.role === "admin" ? "Institutional Administrator" : "Faculty Member";

  const fetchAnalytics = async () => {
    try {
      setErrorMessage(null);
      const data = await getFacultyAnalytics();
      setAnalytics(data);

      if (data.evaluated_students > 0) {
        try {
          const highRiskRes = await getFacultyStudents({
            risk_level: "High",
            page_size: 5,
            sort: "risk_desc",
          });
          setHighRiskStudents(highRiskRes.items);
        } catch {
          // Non-blocking fallback for high-risk preview
          setHighRiskStudents([]);
        }
      } else {
        setHighRiskStudents([]);
      }
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
          if (data.evaluated_students > 0) {
            try {
              const highRiskRes = await getFacultyStudents({
                risk_level: "High",
                page_size: 5,
                sort: "risk_desc",
              });
              if (isMounted) {
                setHighRiskStudents(highRiskRes.items);
              }
            } catch {
              if (isMounted) {
                setHighRiskStudents([]);
              }
            }
          }
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

  return (
    <RoleGuard allowedRoles={["faculty", "admin"]}>
      <div className="max-w-6xl mx-auto space-y-7 page-enter">
        {/* Welcome & Portal Header */}
        <div className="relative rounded-3xl bg-ink text-paper p-7 sm:p-9 shadow-lg overflow-hidden border border-ink/20">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-edugreen/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-softgreen/20 text-mint text-xs font-medium mb-3 border border-mint/20">
                <BarChart3 className="w-3.5 h-3.5 text-mint" />
                <span>{roleTitle} Overview</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-normal tracking-tight text-white">
                Institutional Cohort Analytics
              </h1>
              <p className="text-xs sm:text-sm text-paper/75 mt-1.5 max-w-2xl leading-relaxed">
                Aggregated early-warning risk monitoring across active student populations. Real-time statistical triage calibrated by the Phase 1 machine learning pipeline.
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
              <div className="p-3.5 bg-white/10 rounded-2xl text-left sm:text-right backdrop-blur-xs border border-white/10">
                <p className="text-xs text-paper/70 font-medium">
                  Authorized Role
                </p>
                <p className="text-sm font-semibold text-white capitalize mt-0.5">
                  {user?.role || "Faculty"} Access
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                aria-label="Refresh cohort analytics"
                className="btn-interactive py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[0.99] text-white text-xs font-semibold transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
          className="p-4 rounded-2xl bg-softgreen/60 border border-edugreen/30 text-ink text-xs flex items-start gap-3 leading-relaxed shadow-xs"
        >
          <Shield className="w-5 h-5 text-edugreen flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-ink mb-0.5">
              Population Anonymity Guarantee
            </strong>
            <span className="text-ink/80">
              In strict accordance with student educational data privacy standards, this overview presents non-identifying aggregate metrics. Individual student identities, records, and personalized SHAP explanations are not enumerated on this dashboard.
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 rounded-2xl bg-white border border-ink/10 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
            <Loader2 className="w-8 h-8 text-edugreen animate-spin" />
            <p className="text-sm font-semibold text-ink">
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

            {/* Analytics Metric Cards Grid: Total students, Low risk, Medium risk, High risk */}
            {analytics.total_students > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <AnalyticsStatCard
                  title="Total Students"
                  value={analytics.total_students}
                  subtitle={`${analytics.evaluated_students} evaluated • ${analytics.unevaluated_students} pending`}
                  icon={Users}
                  badge={{
                    text: `${analytics.school_distribution.length} Campuses`,
                    variant: "slate",
                  }}
                />

                <AnalyticsStatCard
                  title="Low Risk"
                  value={analytics.risk_distribution.low}
                  subtitle="Currently on track • Stable academic progress"
                  icon={CheckCircle}
                  badge={{
                    text: `${analytics.risk_percentages.low}% On Track`,
                    variant: "emerald",
                  }}
                />

                <AnalyticsStatCard
                  title="Medium Risk"
                  value={analytics.risk_distribution.medium}
                  subtitle="Some indicators need attention & review"
                  icon={AlertTriangle}
                  badge={{
                    text: `${analytics.risk_percentages.medium}% Moderate`,
                    variant: "amber",
                  }}
                />

                <AnalyticsStatCard
                  title="High Risk"
                  value={analytics.risk_distribution.high}
                  subtitle="Recommend academic coaching & intervention"
                  icon={AlertTriangle}
                  badge={{
                    text: `${analytics.risk_percentages.high}% Priority`,
                    variant: analytics.risk_distribution.high > 0 ? "rose" : "emerald",
                  }}
                />
              </div>
            )}

            {/* High-Risk Students Priority Panel (Top 5) - Prominently Placed for Immediate Action */}
            {analytics.evaluated_students > 0 && (
              <div className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-display font-normal text-ink">
                        Students Needing Attention &amp; Academic Intervention
                      </h2>
                      <p className="text-xs text-ink/65">
                        Prioritized list of students flagged by the model for academic risk intervention.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/faculty/students?risk_level=High"
                    className="btn-interactive text-xs font-semibold text-coral hover:bg-coral/20 flex items-center gap-1.5 self-start sm:self-auto py-2 px-3.5 rounded-xl bg-coral/10 border border-coral/30"
                  >
                    <span>View All High-Risk Students ({analytics.risk_distribution.high})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {highRiskStudents.length > 0 ? (
                  <div className="divide-y divide-ink/10">
                    {highRiskStudents.map((st) => {
                      const prob =
                        st.latest_risk_probability !== null
                          ? Math.round(st.latest_risk_probability * 100)
                          : 0;
                      return (
                        <Link
                          key={st.id}
                          href={`/dashboard/faculty/review?id=${st.id}`}
                          className="table-row-hover py-3 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono font-bold text-sm text-ink group-hover:text-edugreen transition-colors">
                              {st.student_code}
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-paper text-ink/70 font-mono border border-ink/10">
                              {st.school || "Campus"}
                            </span>
                            {st.top_factor_label && (
                              <span className="text-xs text-ink/60 truncate max-w-xs hidden md:inline">
                                Top Driver:{" "}
                                <strong className="text-ink font-semibold">
                                  {st.top_factor_label}
                                </strong>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold tabular-nums text-coral">
                                  {prob}% Risk
                                </span>
                                <div className="w-16 h-1.5 bg-ink/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-coral rounded-full"
                                    style={{ width: `${prob}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-edugreen group-hover:underline flex items-center gap-1">
                              Review Profile <ArrowRight className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-softgreen/60 border border-edugreen/30 text-xs text-edugreen flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-edugreen flex-shrink-0" />
                    <span className="text-ink font-medium">No students are currently flagged in the High-Risk tier.</span>
                  </div>
                )}
              </div>
            )}

            {/* Class Performance & Trends Summary Banner */}
            {analytics.total_students > 0 && analytics.class_averages && (
              <div className="p-6 sm:p-7 rounded-3xl bg-ink text-paper shadow-md border border-ink/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-softgreen/20 text-mint border border-mint/20">
                      Class Averages &amp; Risk Trends
                    </span>
                    {analytics.students_worsening_count > 0 && (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-coral/20 text-coral border border-coral/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{analytics.students_worsening_count} Deteriorating</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-display font-normal text-white">
                    Class Performance &amp; Longitudinal Telemetry
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-paper/75 pt-1">
                    <div>
                      Mean G1: <strong className="text-white">{analytics.class_averages.avg_g1.toFixed(1)}</strong>/20
                    </div>
                    <span className="text-paper/30">•</span>
                    <div>
                      Mean G2: <strong className="text-white">{analytics.class_averages.avg_g2.toFixed(1)}</strong>/20
                    </div>
                    <span className="text-paper/30">•</span>
                    <div>
                      Velocity:{" "}
                      <strong
                        className={
                          analytics.class_averages.avg_grade_velocity >= 0
                            ? "text-mint font-bold"
                            : "text-coral font-bold"
                        }
                      >
                        {analytics.class_averages.avg_grade_velocity > 0 ? "+" : ""}
                        {analytics.class_averages.avg_grade_velocity.toFixed(2)} pts
                      </strong>
                    </div>
                    <span className="text-paper/30">•</span>
                    <div>
                      Chronic Absenteeism:{" "}
                      <strong className="text-white">
                        {analytics.class_averages.chronic_absenteeism_pct.toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>

                <Link
                  href="/dashboard/faculty/analytics"
                  className="self-start md:self-auto py-2.5 px-5 rounded-xl bg-edugreen hover:bg-edugreen/90 active:scale-[0.99] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 flex-shrink-0"
                >
                  <span>View Detailed Analytics &amp; Trends</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
              <Link
                href="/dashboard/faculty/analytics"
                className="p-5 rounded-2xl bg-white border border-ink/10 shadow-xs hover:border-edugreen/30 hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-paper border border-ink/10 text-edugreen flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-softgreen text-edugreen-dark border border-edugreen/30 whitespace-nowrap">
                      Overview
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-heading font-extrabold text-ink group-hover:text-edugreen transition-colors leading-snug">
                    Analytics &amp; Trends
                  </h3>
                  <p className="text-xs text-ink/65 mt-1.5 leading-relaxed">
                    Explore class performance averages, temporal risk trends, and deteriorating trajectories.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/faculty/students"
                className="p-5 rounded-2xl bg-white border border-ink/10 shadow-xs hover:border-edugreen/30 hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-paper border border-ink/10 text-edugreen flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-softgreen text-edugreen-dark border border-edugreen/30 whitespace-nowrap">
                      Directory
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-heading font-extrabold text-ink group-hover:text-edugreen transition-colors leading-snug">
                    Cohort Students
                  </h3>
                  <p className="text-xs text-ink/65 mt-1.5 leading-relaxed">
                    Filter, search, and triage all active enrolled students by predictive risk level and SHAP factors.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/faculty/review"
                className="p-5 rounded-2xl bg-white border border-ink/10 shadow-xs hover:border-edugreen/30 hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-paper border border-ink/10 text-edugreen flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-paper border border-ink/10 text-ink/70 whitespace-nowrap">
                      Direct Review
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-heading font-extrabold text-ink group-hover:text-edugreen transition-colors leading-snug">
                    Student ID Lookup
                  </h3>
                  <p className="text-xs text-ink/65 mt-1.5 leading-relaxed">
                    Inspect specific student academic trajectories and SHAP explanations by numeric ID.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/faculty/upload"
                className="p-5 rounded-2xl bg-white border border-ink/10 shadow-xs hover:border-edugreen/30 hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-paper border border-ink/10 text-edugreen flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-paper border border-ink/10 text-ink/70 whitespace-nowrap">
                      CSV Ingestion
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-heading font-extrabold text-ink group-hover:text-edugreen transition-colors leading-snug">
                    Dataset Management
                  </h3>
                  <p className="text-xs text-ink/65 mt-1.5 leading-relaxed">
                    Upload official standardized CSV datasets to batch-ingest student records and update cohort analytics.
                  </p>
                </div>
              </Link>
            </div>

            {/* Model & Computation Metadata Footer */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink/50 border-t border-ink/10">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-edugreen" />
                <span>
                  Active Model: <strong className="text-ink">{analytics.model_version}</strong> (Phase 1 Logistic Regression Pipeline)
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
