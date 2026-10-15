"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Cpu,
  Database,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UploadCloud,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import { getAdminAuditLogs, getAdminUsage } from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";
import { AuditLogItem, SystemUsage } from "@/types/admin";

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.detail;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred while communicating with the admin service.";
}

export default function AdminOverviewPage() {
  const [usage, setUsage] = useState<SystemUsage | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const [usageData, auditData] = await Promise.all([
        getAdminUsage(),
        getAdminAuditLogs({ limit: 10 }),
      ]);
      setUsage(usageData);
      setRecentAudits(auditData.items || []);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [usageData, auditData] = await Promise.all([
          getAdminUsage(),
          getAdminAuditLogs({ limit: 10 }),
        ]);
        if (isMounted) {
          setUsage(usageData);
          setRecentAudits(auditData.items || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(extractErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="max-w-7xl mx-auto space-y-7 page-enter">
        {/* Header Banner - Dark Ink Editorial Hero */}
        <div className="p-6 sm:p-8 rounded-2xl bg-ink text-paper shadow-sm border border-ink/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint/15 text-mint text-xs font-medium mb-2.5 backdrop-blur-sm border border-mint/20">
                <ShieldCheck className="w-4 h-4 text-mint" />
                <span>Administrative system console</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-white">
                System Overview &amp; Telemetry
              </h1>
              <p className="text-xs sm:text-sm text-paper/80 mt-1.5 max-w-2xl leading-relaxed">
                Institutional monitoring of registered accounts, academic telemetry records, early-warning ML evaluations, and security audit logs.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
                className="btn-interactive inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh telemetry</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-coral/10 border border-coral/20 text-xs text-coral flex items-start gap-3"
          >
            <ShieldAlert className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Failed to Load Administrative Telemetry</strong>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 rounded-2xl bg-white border border-ink/10 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-edugreen animate-spin mb-3" />
            <p className="text-sm font-semibold text-ink/70">
              Gathering database metrics and audit logs...
            </p>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && usage && (
          <>
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Users */}
              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted">
                    Total system users
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-softgreen text-edugreen flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-bold font-sans tabular-nums text-ink">
                    {usage.total_users}
                  </span>
                  <div className="mt-2 flex items-center gap-3 text-xs text-ink/60">
                    <span className="inline-flex items-center gap-1 text-edugreen font-medium tabular-nums">
                      <UserCheck className="w-3.5 h-3.5" />
                      {usage.active_users} active
                    </span>
                    {usage.inactive_users > 0 && (
                      <span className="inline-flex items-center gap-1 text-coral font-medium tabular-nums">
                        <UserX className="w-3.5 h-3.5" />
                        {usage.inactive_users} inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Students */}
              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted">
                    Enrolled students
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-paper text-ink/70 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-bold font-sans tabular-nums text-ink">
                    {usage.total_students}
                  </span>
                  <p className="mt-2 text-xs text-ink/60">
                    Across registered school cohorts
                  </p>
                </div>
              </div>

              {/* Academic Records */}
              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted">
                    Academic records
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-softgreen text-edugreen flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-bold font-sans tabular-nums text-ink">
                    {usage.total_academic_records}
                  </span>
                  <p className="mt-2 text-xs text-ink/60">
                    Telemetry records in database
                  </p>
                </div>
              </div>

              {/* Dataset Uploads */}
              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-muted">
                    Dataset ingestions
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-paper text-ink/70 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-bold font-sans tabular-nums text-ink">
                    {usage.total_dataset_uploads}
                  </span>
                  <p className="mt-2 text-xs text-ink/60">
                    Batches uploaded via CSV
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Row: User Roles Breakdown & ML Inferences */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Users by Role */}
              <div className="p-6 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg text-ink">
                      User Population by Role
                    </h2>
                    <p className="text-xs text-ink/60 mt-0.5">
                      Distribution of role-based credentials in PostgreSQL
                    </p>
                  </div>
                  <Link
                    href="/dashboard/admin/users"
                    className="text-xs font-semibold text-edugreen hover:underline flex items-center gap-1 group"
                  >
                    <span>Manage users</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-paper border border-ink/10 text-center">
                    <span className="text-xs font-medium text-ink-muted">
                      Admins
                    </span>
                    <p className="text-2xl font-bold font-sans tabular-nums text-ink mt-1">
                      {usage.users_by_role.admin}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-softgreen/40 border border-edugreen/20 text-center">
                    <span className="text-xs font-medium text-edugreen">
                      Faculty
                    </span>
                    <p className="text-2xl font-bold font-sans tabular-nums text-edugreen mt-1">
                      {usage.users_by_role.faculty}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-paper border border-ink/10 text-center">
                    <span className="text-xs font-medium text-ink-muted">
                      Students
                    </span>
                    <p className="text-2xl font-bold font-sans tabular-nums text-ink mt-1">
                      {usage.users_by_role.student}
                    </p>
                  </div>
                </div>

                {/* Progress Visualizer */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs text-ink/60">
                    <span>Role proportions</span>
                    <span>100% of accounts accounted for</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-paper border border-ink/5 overflow-hidden flex">
                    <div
                      style={{
                        width: `${usage.total_users > 0 ? (usage.users_by_role.admin / usage.total_users) * 100 : 0}%`,
                      }}
                      className="bg-ink h-full transition-all duration-300"
                      title={`Admin: ${usage.users_by_role.admin}`}
                    />
                    <div
                      style={{
                        width: `${usage.total_users > 0 ? (usage.users_by_role.faculty / usage.total_users) * 100 : 0}%`,
                      }}
                      className="bg-edugreen h-full transition-all duration-300"
                      title={`Faculty: ${usage.users_by_role.faculty}`}
                    />
                    <div
                      style={{
                        width: `${usage.total_users > 0 ? (usage.users_by_role.student / usage.total_users) * 100 : 0}%`,
                      }}
                      className="bg-mint h-full transition-all duration-300"
                      title={`Students: ${usage.users_by_role.student}`}
                    />
                  </div>
                </div>
              </div>

              {/* Predictions & Model Telemetry */}
              <div className="p-6 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg text-ink">
                      ML Inference Volume
                    </h2>
                    <p className="text-xs text-ink/60 mt-0.5">
                      Phase 1 early warning risk calculations executed
                    </p>
                  </div>
                  <Link
                    href="/dashboard/admin/model"
                    className="text-xs font-semibold text-edugreen hover:underline flex items-center gap-1 group"
                  >
                    <span>Model metadata</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-paper border border-ink/10">
                    <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
                      <TrendingUp className="w-4 h-4 text-edugreen" />
                      <span>Last 7 days</span>
                    </div>
                    <p className="text-2xl font-bold font-sans tabular-nums text-ink mt-2">
                      {usage.predictions_last_7_days}
                    </p>
                    <span className="text-[11px] text-ink-muted mt-0.5 block">
                      Evaluated predictions
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-paper border border-ink/10">
                    <div className="flex items-center gap-2 text-ink-muted text-xs font-medium">
                      <Calendar className="w-4 h-4 text-ink" />
                      <span>Last 30 days</span>
                    </div>
                    <p className="text-2xl font-bold font-sans tabular-nums text-ink mt-2">
                      {usage.predictions_last_30_days}
                    </p>
                    <span className="text-[11px] text-ink-muted mt-0.5 block">
                      Monthly cumulative
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-paper border border-ink/10 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">
                    Model algorithm:
                  </span>
                  <span className="font-mono font-medium text-ink">
                    Logistic Regression (32 Features)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/dashboard/admin/users"
                className="p-5 rounded-2xl bg-white border border-ink/10 hover:border-edugreen/40 hover:-translate-y-0.5 transition-all duration-200 shadow-sm group flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-edugreen transition-colors">
                    User Management
                  </h3>
                  <p className="text-xs text-ink/60 mt-0.5 leading-relaxed">
                    Create institutional accounts, toggle active status, and audit security permissions.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/admin/model"
                className="p-5 rounded-2xl bg-white border border-ink/10 hover:border-ink/30 hover:-translate-y-0.5 transition-all duration-200 shadow-sm group flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-paper text-ink flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-edugreen transition-colors">
                    Model &amp; Artifacts
                  </h3>
                  <p className="text-xs text-ink/60 mt-0.5 leading-relaxed">
                    Review genuine test metrics, decision thresholds, feature counts, and training date.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/admin/dataset"
                className="p-5 rounded-2xl bg-white border border-ink/10 hover:border-edugreen/40 hover:-translate-y-0.5 transition-all duration-200 shadow-sm group flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink group-hover:text-edugreen transition-colors">
                    Dataset Ingestion
                  </h3>
                  <p className="text-xs text-ink/60 mt-0.5 leading-relaxed">
                    Upload institutional CSV batches with automatic anti-leakage checks and audit logging.
                  </p>
                </div>
              </Link>
            </div>

            {/* Audit Logs Table */}
            <div className="p-6 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg text-ink">
                    Recent Security &amp; Operational Audit Logs
                  </h2>
                  <p className="text-xs text-ink/60 mt-0.5">
                    Immutable event ledger tracking account creations, status changes, assignments, and dataset ingestions
                  </p>
                </div>
                <span className="text-xs font-mono text-ink-muted">
                  Showing latest {recentAudits.length} events
                </span>
              </div>

              {recentAudits.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink/40">
                  No audit log events recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-ink/10">
                  <table className="w-full text-left text-xs" role="table">
                    <thead className="bg-paper border-b border-ink/10 text-xs font-medium text-ink-muted">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">Timestamp</th>
                        <th className="py-2.5 px-4 font-medium">Action</th>
                        <th className="py-2.5 px-4 font-medium">Actor</th>
                        <th className="py-2.5 px-4 font-medium">Target</th>
                        <th className="py-2.5 px-4 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5 text-ink/80">
                      {recentAudits.map((item) => (
                        <tr key={item.id} className="table-row-hover">
                          <td className="py-2.5 px-4 font-mono text-xs whitespace-nowrap text-ink-muted tabular-nums">
                            {new Date(item.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-medium text-[11px] ${
                                item.action.includes("create")
                                  ? "bg-softgreen text-edugreen border border-edugreen/20"
                                  : item.action.includes("deactiv")
                                  ? "bg-coral/10 text-coral border border-coral/20"
                                  : item.action.includes("upload")
                                  ? "bg-paper text-ink border border-ink/10"
                                  : "bg-softgreen/50 text-edugreen border border-edugreen/20"
                              }`}
                            >
                              {item.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="font-semibold text-ink">
                              {item.actor_email || `User #${item.actor_user_id}`}
                            </span>
                            {item.actor_role && (
                              <span className="text-xs text-ink-muted ml-1.5 font-mono">
                                ({item.actor_role})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-ink/70 max-w-xs truncate">
                            {item.target}
                          </td>
                          <td className="py-2.5 px-4 text-ink/60 max-w-xs truncate">
                            {item.details || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
