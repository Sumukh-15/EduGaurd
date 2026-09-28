"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import ExplainabilityView from "@/components/student/ExplainabilityView";
import RiskGaugeCard from "@/components/student/RiskGaugeCard";
import StudentIdentityCard from "@/components/student/StudentIdentityCard";
import StudentAcademicReviewSummary from "@/components/faculty/StudentAcademicReviewSummary";
import { ApiClientError } from "@/lib/api/client";
import { getStudentHistory, getStudentProfile, predictStudentRisk } from "@/lib/api/students";
import {
  FactorContribution,
  PredictionHistoryItem,
  StudentDetail,
  StudentHistoryResponse,
} from "@/types/student";

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.detail;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred while communicating with EduGuard services.";
}

function StudentReviewContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || "";

  // Search input state
  const [studentIdInput, setStudentIdInput] = useState<string>(initialId);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Active student state
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [notFoundId, setNotFoundId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Loaded data
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [history, setHistory] = useState<StudentHistoryResponse | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<PredictionHistoryItem | null>(null);
  const [factors, setFactors] = useState<FactorContribution[]>([]);
  const [causalDisclaimer, setCausalDisclaimer] = useState<string | undefined>(undefined);

  // Execute lookup for a given student ID
  const executeLookup = React.useCallback(async (id: number) => {
    setIsLoading(true);
    setHasSearched(true);
    setValidationError(null);
    setErrorMessage(null);
    setNotFoundId(null);
    setActiveStudentId(id);

    // Clear previous student payload to avoid stale display
    setStudent(null);
    setHistory(null);
    setLatestPrediction(null);
    setFactors([]);
    setCausalDisclaimer(undefined);

    try {
      // Parallel fetch: profile and longitudinal telemetry history
      const [profileData, historyData] = await Promise.all([
        getStudentProfile(id),
        getStudentHistory(id, "desc"),
      ]);

      setStudent(profileData);
      setHistory(historyData);

      // PREDICTION REUSE:
      // If a latest prediction exists in history, display it directly.
      // Do NOT create an unnecessary duplicate prediction record.
      if (historyData.latest_prediction) {
        setLatestPrediction(historyData.latest_prediction);

        // Check if SHAP factors were cached in sessionStorage for this prediction
        if (typeof window !== "undefined") {
          const cachedKey = `eduguard_shap_factors_${id}`;
          const cached = sessionStorage.getItem(cachedKey);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (
                parsed.prediction_id === historyData.latest_prediction.id &&
                Array.isArray(parsed.factors)
              ) {
                setFactors(parsed.factors);
                setCausalDisclaimer(parsed.disclaimer);
              }
            } catch {
              sessionStorage.removeItem(cachedKey);
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 404) {
        setNotFoundId(id);
      } else if (err instanceof ApiClientError && err.status === 403) {
        setErrorMessage(
          "Access Denied: You do not have institutional authorization to review this student record."
        );
      } else {
        setErrorMessage(extractErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check URL query param on mount (e.g. /dashboard/faculty/review?id=1)
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (!idParam) return;
    const parsed = parseInt(idParam, 10);
    if (isNaN(parsed) || parsed <= 0) return;

    let isMounted = true;

    async function loadParamStudent() {
      try {
        const [profileData, historyData] = await Promise.all([
          getStudentProfile(parsed),
          getStudentHistory(parsed, "desc"),
        ]);
        if (!isMounted) return;

        setStudent(profileData);
        setHistory(historyData);
        setActiveStudentId(parsed);
        setHasSearched(true);
        setValidationError(null);
        setErrorMessage(null);
        setNotFoundId(null);

        if (historyData.latest_prediction) {
          setLatestPrediction(historyData.latest_prediction);
          if (typeof window !== "undefined") {
            const cachedKey = `eduguard_shap_factors_${parsed}`;
            const cached = sessionStorage.getItem(cachedKey);
            if (cached) {
              try {
                const p = JSON.parse(cached);
                if (p.prediction_id === historyData.latest_prediction.id && Array.isArray(p.factors)) {
                  setFactors(p.factors);
                  setCausalDisclaimer(p.disclaimer);
                }
              } catch {
                sessionStorage.removeItem(cachedKey);
              }
            }
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setHasSearched(true);
        setActiveStudentId(parsed);
        if (err instanceof ApiClientError && err.status === 404) {
          setNotFoundId(parsed);
        } else if (err instanceof ApiClientError && err.status === 403) {
          setErrorMessage(
            "Access Denied: You do not have institutional authorization to review this student record."
          );
        } else {
          setErrorMessage(extractErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadParamStudent();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = studentIdInput.trim();
    if (!trimmed) {
      setValidationError("Please enter a numeric Student ID.");
      return;
    }

    const parsedId = parseInt(trimmed, 10);
    if (isNaN(parsedId) || parsedId <= 0 || String(parsedId) !== trimmed) {
      setValidationError("Student ID must be a positive whole number (e.g. 1, 2, 7).");
      return;
    }

    executeLookup(parsedId);
  };

  // Evaluate telemetry via existing POST /api/predict
  const handleEvaluateTelemetry = async () => {
    if (!activeStudentId) return;

    try {
      setIsEvaluating(true);
      setErrorMessage(null);

      const predRes = await predictStudentRisk({ student_id: activeStudentId });

      const newPredItem: PredictionHistoryItem = {
        id: predRes.prediction_id,
        student_id: predRes.student_id,
        academic_record_id: predRes.academic_record_id,
        risk_probability: predRes.risk_probability,
        risk_level: predRes.risk_level,
        at_risk_binary: predRes.at_risk_binary,
        model_version: predRes.model_version,
        created_at: predRes.created_at,
      };

      setLatestPrediction(newPredItem);
      setFactors(predRes.top_factors || []);
      setCausalDisclaimer(predRes.causal_disclaimer);

      // Cache SHAP factors in sessionStorage for future inspection
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `eduguard_shap_factors_${activeStudentId}`,
          JSON.stringify({
            prediction_id: predRes.prediction_id,
            factors: predRes.top_factors,
            disclaimer: predRes.causal_disclaimer,
          })
        );
      }

      // Refresh longitudinal history to reflect newly appended prediction
      const updatedHistory = await getStudentHistory(activeStudentId, "desc");
      setHistory(updatedHistory);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-700/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold mb-2.5 backdrop-blur-sm">
              <UserCheck className="w-4 h-4" />
              <span>Direct Review Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Direct Student ID Review
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 mt-1.5 max-w-2xl leading-relaxed">
              Authorized faculty and administrators can review specific student academic records, longitudinal performance telemetry, and machine learning risk evaluations by entering a numeric student ID.
            </p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl text-left sm:text-right backdrop-blur-sm border border-white/10 self-start sm:self-auto flex-shrink-0">
            <p className="text-[11px] text-indigo-200 uppercase tracking-wider font-semibold">
              Inspection Mode
            </p>
            <p className="text-sm font-bold text-white capitalize mt-0.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-200" />
              <span>Direct-ID Only</span>
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Callout: Strict Absence of Directory */}
      <div
        role="note"
        aria-label="Direct lookup privacy constraint"
        className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 text-xs flex items-start gap-3 leading-relaxed"
      >
        <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="block font-semibold mb-0.5">
            Privacy &amp; Direct-ID Boundary Constraint
          </strong>
          <span>
            In strict compliance with institutional data governance, student directory enumeration and browseable student rosters are prohibited. Faculty members must provide the specific numeric Student ID for the individual student under review.
          </span>
        </div>
      </div>

      {/* Search Input Form */}
      <section
        aria-labelledby="student-lookup-heading"
        className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div>
          <h2 id="student-lookup-heading" className="text-base font-bold text-slate-900 dark:text-white">
            Lookup Student by ID
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enter the student database integer ID assigned by institutional registry.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="student-id-input" className="sr-only">
                Numeric Student ID
              </label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="student-id-input"
                name="studentId"
                type="number"
                min="1"
                step="1"
                value={studentIdInput}
                onChange={(e) => {
                  setStudentIdInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Enter Student ID (e.g. 1, 2, 7)..."
                disabled={isLoading}
                aria-invalid={validationError ? "true" : "false"}
                aria-describedby={validationError ? "id-validation-error" : undefined}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 flex-shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading Student...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Review Student</span>
                </>
              )}
            </button>
          </div>

          {validationError && (
            <p id="id-validation-error" className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{validationError}</span>
            </p>
          )}
        </form>
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Querying student profile and longitudinal records from PostgreSQL...
          </p>
        </div>
      )}

      {/* Initial Guidance State (No search performed yet) */}
      {!hasSearched && !isLoading && (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-1">
            <UserCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Awaiting Student ID Input
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Enter a student database numeric ID in the input box above and click &quot;Review Student&quot; to inspect demographic metadata, longitudinal telemetry, and model risk forecasts.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-500">
              <Lock className="w-3 h-3" />
              Student enumeration is disabled
            </span>
          </div>
        </div>
      )}

      {/* Student Not Found State (404) */}
      {notFoundId !== null && !isLoading && (
        <div className="p-10 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 mb-1">
            <UserX className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Student Not Found (ID: {notFoundId})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            No institutional student record was found in PostgreSQL corresponding to ID <strong className="font-mono">{notFoundId}</strong>. Please check the numeric ID with institutional administration.
          </p>
          <p className="text-[11px] text-slate-400">
            For data security and privacy reasons, lists of valid student IDs are not displayed.
          </p>
        </div>
      )}

      {/* General Error State */}
      {errorMessage && !isLoading && (
        <div className="p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 mb-1">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
            Review Request Failed
          </h2>
          <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
            {errorMessage}
          </p>
          {activeStudentId && (
            <button
              type="button"
              onClick={() => executeLookup(activeStudentId)}
              className="mt-2 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      )}

      {/* Populated Student Review Sections */}
      {!isLoading && student && history && (
        <div className="space-y-7">
          {/* Section 1: Student Identity & Profile */}
          <StudentIdentityCard
            student={student}
            totalRecords={history.total_records}
            totalPredictions={history.total_predictions}
          />

          {/* Section 2: Risk Evaluation & Gauge (if evaluated) */}
          {latestPrediction && (
            <RiskGaugeCard
              prediction={latestPrediction}
              academicRecordId={latestPrediction.academic_record_id}
              onRefreshFactors={handleEvaluateTelemetry}
              isRefreshing={isEvaluating}
            />
          )}

          {/* Section 3: SHAP Feature Attribution (if prediction exists) */}
          {latestPrediction && (
            <ExplainabilityView
              factors={factors}
              causalDisclaimer={causalDisclaimer}
              onRequestFactors={handleEvaluateTelemetry}
              isLoadingFactors={isEvaluating}
            />
          )}

          {/* Section 4: Academic Telemetry & History Breakdown */}
          <StudentAcademicReviewSummary
            history={history}
            onEvaluate={handleEvaluateTelemetry}
            isEvaluating={isEvaluating}
          />
        </div>
      )}
    </div>
  );
}

export default function FacultyStudentReviewPage() {
  return (
    <RoleGuard allowedRoles={["faculty", "admin"]}>
      <Suspense
        fallback={
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-400">Loading student review interface...</p>
          </div>
        }
      >
        <StudentReviewContent />
      </Suspense>
    </RoleGuard>
  );
}
