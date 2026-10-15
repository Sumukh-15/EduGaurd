"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Loader2,
  Lock,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import ExplainabilityView from "@/components/student/ExplainabilityView";
import RiskGaugeCard from "@/components/student/RiskGaugeCard";
import StudentIdentityCard from "@/components/student/StudentIdentityCard";
import StudentAcademicReviewSummary from "@/components/faculty/StudentAcademicReviewSummary";
import RecommendationCard from "@/components/student/RecommendationCard";
import { ApiClientError } from "@/lib/api/client";
import { getStudentHistory, getStudentProfile, predictStudentRisk } from "@/lib/api/students";
import { getStudentRecommendations } from "@/lib/api/recommendations";
import {
  AcademicUpdateResponse,
  FactorContribution,
  PredictionHistoryItem,
  StudentDetail,
  StudentHistoryResponse,
} from "@/types/student";
import { RecommendationRead } from "@/types/recommendation";

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
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Loaded data
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [history, setHistory] = useState<StudentHistoryResponse | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<PredictionHistoryItem | null>(null);
  const [factors, setFactors] = useState<FactorContribution[]>([]);
  const [causalDisclaimer, setCausalDisclaimer] = useState<string | undefined>(undefined);
  const [recommendations, setRecommendations] = useState<RecommendationRead[]>([]);

  // Execute lookup for a given student ID
  const executeLookup = React.useCallback(async (id: number) => {
    setIsLoading(true);
    setHasSearched(true);
    setValidationError(null);
    setErrorMessage(null);
    setNotFoundId(null);
    setActiveStudentId(id);

    // Clear previous student payload
    setStudent(null);
    setHistory(null);
    setLatestPrediction(null);
    setFactors([]);
    setCausalDisclaimer(undefined);
    setRecommendations([]);

    try {
      // Parallel fetch: profile, history, and recommendations
      const [profileData, historyData, recData] = await Promise.all([
        getStudentProfile(id),
        getStudentHistory(id, "desc"),
        getStudentRecommendations(id).catch(() => null),
      ]);

      setStudent(profileData);
      setHistory(historyData);
      if (recData?.recommendations) {
        setRecommendations(recData.recommendations);
      }

      if (historyData.latest_prediction) {
        setLatestPrediction(historyData.latest_prediction);

        if (
          historyData.latest_prediction.top_factors &&
          historyData.latest_prediction.top_factors.length > 0
        ) {
          setFactors(historyData.latest_prediction.top_factors);
        } else if (typeof window !== "undefined") {
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

  // Check URL query param on mount
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (!idParam) return;
    const parsed = parseInt(idParam, 10);
    if (isNaN(parsed) || parsed <= 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    executeLookup(parsed);
  }, [searchParams, executeLookup]);

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

  // Evaluate risk via POST /api/predict
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
        top_factors: predRes.top_factors,
      };

      setLatestPrediction(newPredItem);
      setFactors(predRes.top_factors || []);
      setCausalDisclaimer(predRes.causal_disclaimer);

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

      // Refresh history & recommendations
      const [updatedHistory, updatedRecs] = await Promise.all([
        getStudentHistory(activeStudentId, "desc"),
        getStudentRecommendations(activeStudentId).catch(() => null),
      ]);
      setHistory(updatedHistory);
      if (updatedRecs?.recommendations) {
        setRecommendations(updatedRecs.recommendations);
      }
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsEvaluating(false);
    }
  };

  // Faculty data update success handler
  const handleAcademicUpdateSuccess = async (response: AcademicUpdateResponse) => {
    setSuccessToast(
      "Verified academic update recorded in PostgreSQL. ML risk assessment & recommendations updated."
    );
    setTimeout(() => setSuccessToast(null), 6000);

    if (response.prediction) {
      const pred = response.prediction;
      const newPredItem: PredictionHistoryItem = {
        id: pred.prediction_id,
        student_id: pred.student_id,
        academic_record_id: pred.academic_record_id,
        risk_probability: pred.risk_probability,
        risk_level: pred.risk_level,
        at_risk_binary: pred.at_risk_binary,
        model_version: pred.model_version,
        created_at: pred.created_at,
        top_factors: pred.top_factors,
      };

      setLatestPrediction(newPredItem);
      setFactors(pred.top_factors || []);
      setCausalDisclaimer(pred.causal_disclaimer);
    }

    if (activeStudentId) {
      try {
        const [updatedHistory, updatedRecs] = await Promise.all([
          getStudentHistory(activeStudentId, "desc"),
          getStudentRecommendations(activeStudentId).catch(() => null),
        ]);
        setHistory(updatedHistory);
        if (updatedRecs?.recommendations) {
          setRecommendations(updatedRecs.recommendations);
        }
      } catch {
        // Non-blocking
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 page-enter">
      {/* Header Banner - Dark Ink Editorial Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-ink text-paper shadow-sm border border-ink/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint/15 text-mint text-xs font-medium mb-2.5 backdrop-blur-sm border border-mint/20">
              <UserCheck className="w-4 h-4" />
              <span>Faculty Evaluation Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-white">
              Individual Student Academic Review
            </h1>
            <p className="text-xs sm:text-sm text-paper/80 mt-1.5 max-w-2xl leading-relaxed">
              Review verified assessment scores, student study habits, machine learning risk factors, and recommended interventions. Record new assessment marks to trigger live risk recalculation.
            </p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl text-left sm:text-right backdrop-blur-sm border border-white/10 self-start sm:self-auto flex-shrink-0">
            <p className="text-xs text-paper/70 font-medium">
              Evaluation mode
            </p>
            <p className="text-sm font-semibold text-white capitalize mt-0.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-mint" />
              <span>Assigned Review</span>
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-coral/10 border border-coral/20 text-coral text-xs font-medium flex items-center gap-2.5 shadow-sm animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-coral flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-xl bg-softgreen border border-edugreen/30 text-edugreen text-xs font-medium flex items-center gap-2.5 shadow-sm animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-edugreen flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Search Input Form */}
      <section
        aria-labelledby="student-lookup-heading"
        className="p-6 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-4"
      >
        <div>
          <h2 id="student-lookup-heading" className="text-lg font-display text-ink">
            Lookup Student Profile
          </h2>
          <p className="text-xs text-ink/60 mt-0.5">
            Enter the student database integer ID to inspect records or record verified academic updates.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="student-id-input" className="sr-only">
                Numeric Student ID
              </label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink/40">
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
                placeholder="Enter Student ID (e.g. 1, 2, 3, 4)..."
                disabled={isLoading}
                aria-invalid={validationError ? "true" : "false"}
                aria-describedby={validationError ? "id-validation-error" : undefined}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-ink/10 bg-paper text-ink placeholder-ink/40 text-sm focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="py-2.5 px-6 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition-all duration-200 disabled:opacity-50 inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen flex-shrink-0 btn-interactive"
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
            <p id="id-validation-error" className="text-xs font-medium text-coral flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{validationError}</span>
            </p>
          )}
        </form>
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="p-16 rounded-2xl bg-white border border-ink/10 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-edugreen animate-spin" />
          <p className="text-sm font-semibold text-ink/70">
            Querying student profile and academic records from PostgreSQL...
          </p>
        </div>
      )}

      {/* Initial Guidance State */}
      {!hasSearched && !isLoading && (
        <div className="p-12 rounded-2xl bg-white border border-ink/10 shadow-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-softgreen text-edugreen mb-1">
            <UserCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-ink">
            Awaiting Student Selection
          </h2>
          <p className="text-xs sm:text-sm text-ink/60 max-w-md mx-auto leading-relaxed">
            Enter a student ID in the box above or select a student from your Faculty Cohort Directory to review academic progress, SHAP explanations, and record official marks.
          </p>
        </div>
      )}

      {/* Student Not Found State */}
      {notFoundId !== null && !isLoading && (
        <div className="p-10 rounded-2xl bg-paper border border-ink/10 text-center space-y-3 shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ink/5 text-ink/50 mb-1">
            <UserX className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-ink">
            Student Record Not Found (ID: {notFoundId})
          </h2>
          <p className="text-xs text-ink/60 max-w-md mx-auto leading-relaxed">
            No student was found in PostgreSQL corresponding to ID <strong className="font-mono text-ink">{notFoundId}</strong>.
          </p>
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

          {/* Section 2: Academic Performance Summary with Faculty Data Entry Form */}
          <StudentAcademicReviewSummary
            studentId={student.id}
            studentCode={student.student_code}
            studentName={student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim()}
            history={history}
            onEvaluate={handleEvaluateTelemetry}
            isEvaluating={isEvaluating}
            onAcademicUpdateSuccess={handleAcademicUpdateSuccess}
          />

          {/* Section 3: Risk Evaluation & Gauge (if evaluated) */}
          {latestPrediction && (
            <RiskGaugeCard
              prediction={latestPrediction}
              academicRecordId={latestPrediction.academic_record_id}
              onRefreshFactors={handleEvaluateTelemetry}
              isRefreshing={isEvaluating}
            />
          )}

          {/* Section 4: SHAP Feature Attribution */}
          {latestPrediction && (
            <ExplainabilityView
              factors={factors}
              causalDisclaimer={causalDisclaimer}
              onRequestFactors={handleEvaluateTelemetry}
              isLoadingFactors={isEvaluating}
            />
          )}

          {/* Section 5: Institutional Recommendations */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-ink/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber/15 text-amber-700 flex items-center justify-center font-bold">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Recommended Interventions ({recommendations.length})
                  </h3>
                  <p className="text-xs text-ink/60">
                    Rule-based guidance evaluated from the student&apos;s latest academic indicators.
                  </p>
                </div>
              </div>
            </div>

            {recommendations.length === 0 ? (
              <div className="p-4 rounded-xl bg-softgreen border border-edugreen/30 text-xs text-edugreen">
                <span className="font-bold">Student is currently on track:</span> No urgent academic remediation or attendance interventions are triggered.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {recommendations.map((rec, idx) => (
                  <RecommendationCard
                    key={rec.id || `rec-${idx}`}
                    recommendation={rec}
                    index={idx}
                  />
                ))}
              </div>
            )}
          </div>
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
            <Loader2 className="w-8 h-8 text-edugreen animate-spin" />
            <p className="text-xs text-ink/50">Loading student review interface...</p>
          </div>
        }
      >
        <StudentReviewContent />
      </Suspense>
    </RoleGuard>
  );
}
