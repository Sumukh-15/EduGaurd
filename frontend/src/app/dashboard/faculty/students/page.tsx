"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import { getFacultyStudents } from "@/lib/api/faculty_students";
import { ApiClientError } from "@/lib/api/client";
import {
  FacultyStudentFilterParams,
  FacultyStudentItem,
  FacultyStudentsListResponse,
} from "@/types/faculty_students";

type RiskFilterOption = "ALL" | "High" | "Medium" | "Low" | "UNEVALUATED";

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.detail;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred while communicating with the student directory service.";
}

function StudentsDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Query Sync
  const initialRiskParam = searchParams.get("risk_level");
  const initialFilter: RiskFilterOption =
    initialRiskParam === "High" || initialRiskParam === "Medium" || initialRiskParam === "Low"
      ? initialRiskParam
      : searchParams.get("evaluated") === "false"
      ? "UNEVALUATED"
      : "ALL";

  const [activeFilter, setActiveFilter] = useState<RiskFilterOption>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");
  const deferredSearch = React.useDeferredValue(searchQuery);
  const [sortOption, setSortOption] = useState<"risk_desc" | "risk_asc" | "student_code">(
    (searchParams.get("sort") as "risk_desc" | "risk_asc" | "student_code") || "risk_desc"
  );
  const [currentPage, setCurrentPage] = useState<number>(
    parseInt(searchParams.get("page") || "1", 10) || 1
  );
  const [pageSize] = useState<number>(20);

  // Data state
  const [data, setData] = useState<FacultyStudentsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch student directory data
  const fetchData = useCallback(async () => {
    try {
      const params: FacultyStudentFilterParams = {
        page: currentPage,
        page_size: pageSize,
        sort: sortOption,
      };

      if (deferredSearch.trim()) {
        params.search = deferredSearch.trim();
      }

      if (activeFilter === "High" || activeFilter === "Medium" || activeFilter === "Low") {
        params.risk_level = activeFilter;
      } else if (activeFilter === "UNEVALUATED") {
        params.evaluated = false;
      }

      const res = await getFacultyStudents(params);
      setData(res);
      setErrorMessage(null);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeFilter, deferredSearch, sortOption, currentPage, pageSize]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const params: FacultyStudentFilterParams = {
          page: currentPage,
          page_size: pageSize,
          sort: sortOption,
        };

        if (deferredSearch.trim()) {
          params.search = deferredSearch.trim();
        }

        if (activeFilter === "High" || activeFilter === "Medium" || activeFilter === "Low") {
          params.risk_level = activeFilter;
        } else if (activeFilter === "UNEVALUATED") {
          params.evaluated = false;
        }

        const res = await getFacultyStudents(params);
        if (isMounted) {
          setData(res);
          setErrorMessage(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(extractErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [activeFilter, deferredSearch, sortOption, currentPage, pageSize]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleFilterClick = (option: RiskFilterOption) => {
    setActiveFilter(option);
    setCurrentPage(1);
  };

  const handleRowClick = (studentId: number) => {
    router.push(`/dashboard/faculty/review?id=${studentId}`);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, studentId: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(`/dashboard/faculty/review?id=${studentId}`);
    }
  };

  const handleResetFilters = () => {
    setActiveFilter("ALL");
    setSearchQuery("");
    setSortOption("risk_desc");
    setCurrentPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const startItem = data && data.total > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = data ? Math.min(currentPage * pageSize, data.total) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-7 page-enter">
      {/* Header Banner - Dark Ink Editorial Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-ink text-paper shadow-sm border border-ink/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint/15 text-mint text-xs font-medium mb-2.5 backdrop-blur-sm border border-mint/20">
              <Users className="w-3.5 h-3.5" />
              <span>Student Cohort Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-white">
              Enrolled Students & Risk Triage
            </h1>
            <p className="text-xs sm:text-sm text-paper/80 mt-1.5 max-w-2xl leading-relaxed">
              Browse, search, and triage active students by predictive early-warning tier and top SHAP attribution factors. Select any student row for deep individual trajectory analysis.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/faculty/review"
              className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-paper text-xs font-medium transition-all duration-200 border border-white/10 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen btn-interactive"
            >
              <UserCheck className="w-3.5 h-3.5 text-mint" />
              <span>Direct ID Lookup</span>
            </Link>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              aria-label="Refresh student directory"
              className="py-2 px-3.5 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-medium transition-all duration-200 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-sm btn-interactive"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Chips, Search & Sort */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-4">
        {/* Row 1: Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink/60 mr-1 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Risk Filter:</span>
          </span>

          {/* ALL */}
          <button
            type="button"
            onClick={() => handleFilterClick("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeFilter === "ALL"
                ? "bg-ink text-paper border-ink shadow-sm"
                : "bg-paper text-ink/70 border-ink/10 hover:bg-ink/5"
            }`}
          >
            All Students
          </button>

          {/* High Risk */}
          <button
            type="button"
            onClick={() => handleFilterClick("High")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              activeFilter === "High"
                ? "bg-coral text-white border-coral shadow-sm shadow-coral/20"
                : "bg-coral/10 text-coral border-coral/20 hover:bg-coral/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-coral" />
            <span>High Risk</span>
          </button>

          {/* Medium Risk */}
          <button
            type="button"
            onClick={() => handleFilterClick("Medium")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              activeFilter === "Medium"
                ? "bg-amber text-ink border-amber shadow-sm shadow-amber/20"
                : "bg-amber/15 text-amber-700 border-amber/30 hover:bg-amber/25"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Medium Risk</span>
          </button>

          {/* Low Risk */}
          <button
            type="button"
            onClick={() => handleFilterClick("Low")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              activeFilter === "Low"
                ? "bg-edugreen text-white border-edugreen shadow-sm shadow-edugreen/20"
                : "bg-softgreen text-edugreen border-edugreen/20 hover:bg-softgreen/80"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-edugreen" />
            <span>Low Risk</span>
          </button>

          {/* Not Evaluated */}
          <button
            type="button"
            onClick={() => handleFilterClick("UNEVALUATED")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              activeFilter === "UNEVALUATED"
                ? "bg-ink/80 text-paper border-ink/80 shadow-sm"
                : "bg-paper text-ink/60 border-ink/10 hover:bg-ink/5"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ink/40" />
            <span>Not Evaluated</span>
          </button>
        </div>

        {/* Row 2: Search Input and Sort Select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-ink/5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student code (e.g. STU-1001)..."
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-paper border border-ink/10 text-ink placeholder-ink/40 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-ink/40 hover:text-ink rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-ink/60 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value as "risk_desc" | "risk_asc" | "student_code");
                setCurrentPage(1);
              }}
              className="py-2 px-3 rounded-xl bg-paper border border-ink/10 text-ink text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen"
            >
              <option value="risk_desc">Risk: High to Low</option>
              <option value="risk_asc">Risk: Low to High</option>
              <option value="student_code">Student Code (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-16 rounded-2xl bg-white border border-ink/10 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-edugreen animate-spin" />
          <p className="text-sm font-semibold text-ink/70">
            Loading student directory and latest risk evaluations...
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && errorMessage && (
        <div className="p-8 rounded-2xl bg-coral/10 border border-coral/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-coral mx-auto" />
          <h3 className="text-base font-bold text-coral">
            Failed to Load Student Directory
          </h3>
          <p className="text-xs sm:text-sm text-coral/80 max-w-md mx-auto">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-2 py-2 px-4 rounded-xl bg-coral text-white text-xs font-semibold hover:bg-coral-dark transition-colors shadow-sm"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* Populated Table */}
      {!isLoading && !errorMessage && data && (
        <>
          {data.items.length === 0 ? (
            /* Empty State */
            <div className="p-16 rounded-2xl bg-white border border-ink/10 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-paper flex items-center justify-center text-ink/40">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-ink">
                No Students Found
              </h3>
              <p className="text-xs sm:text-sm text-ink/60 max-w-md">
                {activeFilter !== "ALL" || deferredSearch
                  ? "No enrolled students match your active search and risk filter criteria."
                  : "No students are currently registered in the database. Ingest student records via dataset upload."}
              </p>
              {(activeFilter !== "ALL" || deferredSearch) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 py-2 px-4 rounded-xl bg-edugreen text-white text-xs font-semibold hover:bg-edugreen-dark transition-colors shadow-sm"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            /* Table of Students */
            <div className="rounded-2xl bg-white border border-ink/10 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-ink/10 bg-paper/60 text-xs font-semibold text-ink-muted">
                      <th scope="col" className="py-3.5 px-4 sm:px-6">
                        Student code
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        School
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Risk tier
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Risk probability
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Primary attribution factor
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Last evaluated
                      </th>
                      <th scope="col" className="py-3.5 px-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5 text-xs sm:text-sm">
                    {data.items.map((student: FacultyStudentItem) => {
                      const probPercent =
                        student.latest_risk_probability !== null
                          ? Math.round(student.latest_risk_probability * 100)
                          : null;

                      let badgeClass = "bg-paper text-ink/60 border-ink/10";
                      let barFillClass = "bg-ink/40";

                      if (student.latest_risk_level === "High") {
                        badgeClass = "bg-coral/10 text-coral border-coral/20";
                        barFillClass = "bg-coral";
                      } else if (student.latest_risk_level === "Medium") {
                        badgeClass = "bg-amber/15 text-amber-700 border-amber/30";
                        barFillClass = "bg-amber";
                      } else if (student.latest_risk_level === "Low") {
                        badgeClass = "bg-softgreen text-edugreen border-edugreen/30";
                        barFillClass = "bg-edugreen";
                      }

                      return (
                        <tr
                          key={student.id}
                          tabIndex={0}
                          role="link"
                          aria-label={`View detailed analysis for student ${student.student_code}`}
                          onClick={() => handleRowClick(student.id)}
                          onKeyDown={(e) => handleRowKeyDown(e, student.id)}
                          className="table-row-hover cursor-pointer focus:outline-none focus:bg-softgreen/20"
                        >
                          {/* Student Code */}
                          <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-ink">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-softgreen text-edugreen flex items-center justify-center text-xs">
                                <GraduationCap className="w-3.5 h-3.5" />
                              </div>
                              <span>{student.student_code}</span>
                            </div>
                          </td>

                          {/* School */}
                          <td className="py-3.5 px-4 text-ink/70 font-medium">
                            {student.school || "—"}
                          </td>

                          {/* Risk Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
                            >
                              {student.latest_risk_level
                                ? `${student.latest_risk_level} Risk`
                                : "Unevaluated"}
                            </span>
                          </td>

                          {/* Probability Bar */}
                          <td className="py-3.5 px-4">
                            {probPercent !== null ? (
                              <div className="space-y-1 max-w-[130px]">
                                <div className="flex items-center justify-between text-xs font-semibold text-ink/80">
                                  <span className="tabular-nums font-bold font-sans text-ink">{probPercent}%</span>
                                  <span className="text-[10px] text-ink/40 font-normal">
                                    prob
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-paper rounded-full overflow-hidden border border-ink/5">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${barFillClass}`}
                                    style={{ width: `${probPercent}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-ink/40 text-xs italic">
                                Pending inference
                              </span>
                            )}
                          </td>

                          {/* Top Factor Label */}
                          <td className="py-3.5 px-4 text-ink/80 font-medium">
                            {student.top_factor_label ? (
                              <span className="truncate block max-w-xs" title={student.top_factor_label}>
                                {student.top_factor_label}
                              </span>
                            ) : (
                              <span className="text-ink/40 italic text-xs">
                                None recorded
                              </span>
                            )}
                          </td>

                          {/* Last Evaluated */}
                          <td className="py-3.5 px-4 text-ink/60 text-xs">
                            {student.latest_prediction_date ? (
                              <time dateTime={student.latest_prediction_date}>
                                {new Date(student.latest_prediction_date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </time>
                            ) : (
                              <span className="italic text-ink/40">Never</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="text-xs font-semibold text-edugreen hover:underline">
                              Review &rarr;
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="py-3.5 px-4 sm:px-6 border-t border-ink/10 bg-paper/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink/60">
                <div>
                  Showing{" "}
                  <strong className="text-ink font-semibold">
                    {startItem}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-ink font-semibold">
                    {endItem}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-ink font-semibold">
                    {data.total}
                  </strong>{" "}
                  students
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                    className="p-1.5 rounded-lg border border-ink/10 bg-white text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                    className="p-1.5 rounded-lg border border-ink/10 bg-white text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FacultyStudentsPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "admin"]}>
      <Suspense
        fallback={
          <div className="p-16 rounded-2xl bg-white border border-ink/10 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-edugreen animate-spin" />
            <p className="text-sm font-semibold text-ink/70">
              Initializing student directory...
            </p>
          </div>
        }
      >
        <StudentsDirectoryContent />
      </Suspense>
    </RoleGuard>
  );
}
