"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  GraduationCap,
  Lightbulb,
  LineChart,
  Loader2,
  Shield,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import EmptyStateCard from "@/components/student/EmptyStateCard";
import ExplainabilityView from "@/components/student/ExplainabilityView";
import RiskGaugeCard from "@/components/student/RiskGaugeCard";
import StudentIdentityCard from "@/components/student/StudentIdentityCard";
import StudentAcademicDataCard from "@/components/student/StudentAcademicDataCard";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api/client";
import { getStudentHistory, getStudentProfile, predictStudentRisk } from "@/lib/api/students";
import {
  AcademicUpdateResponse,
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
  return "An unexpected error occurred while communicating with EduGuard.";
}

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const [dataLoaded, setDataLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [history, setHistory] = useState<StudentHistoryResponse | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<PredictionHistoryItem | null>(null);
  const [factors, setFactors] = useState<FactorContribution[]>([]);
  const [causalDisclaimer, setCausalDisclaimer] = useState<string | undefined>(undefined);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const studentId = user?.student_id;
  const isLoading = !!studentId && !dataLoaded && !errorMessage;

  // Load student profile, history, and latest risk status
  useEffect(() => {
    let isMounted = true;

    if (!studentId) {
      return;
    }

    async function fetchData() {
      try {
        const [profileData, historyData] = await Promise.all([
          getStudentProfile(studentId!),
          getStudentHistory(studentId!, "desc"),
        ]);

        if (!isMounted) return;

        setStudent(profileData);
        setHistory(historyData);

        // Check for existing prediction in history
        if (historyData.latest_prediction) {
          setCurrentPrediction(historyData.latest_prediction);

          // If backend provided top_factors directly from DB
          if (
            historyData.latest_prediction.top_factors &&
            historyData.latest_prediction.top_factors.length > 0
          ) {
            setFactors(historyData.latest_prediction.top_factors);
          } else if (typeof window !== "undefined") {
            // Fallback to cached factors if present
            const cachedFactorsKey = `eduguard_shap_factors_${studentId}`;
            const cached = sessionStorage.getItem(cachedFactorsKey);
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
                sessionStorage.removeItem(cachedFactorsKey);
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

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  // Handle explicit factor evaluation / refresh
  const handleEvaluate = async () => {
    if (!studentId) return;

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const predResponse = await predictStudentRisk({ student_id: studentId });
      const newPredItem: PredictionHistoryItem = {
        id: predResponse.prediction_id,
        student_id: predResponse.student_id,
        academic_record_id: predResponse.academic_record_id,
        risk_probability: predResponse.risk_probability,
        risk_level: predResponse.risk_level,
        at_risk_binary: predResponse.at_risk_binary,
        model_version: predResponse.model_version,
        created_at: predResponse.created_at,
        top_factors: predResponse.top_factors,
      };

      setCurrentPrediction(newPredItem);
      setFactors(predResponse.top_factors || []);
      setCausalDisclaimer(predResponse.causal_disclaimer);

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `eduguard_shap_factors_${studentId}`,
          JSON.stringify({
            prediction_id: predResponse.prediction_id,
            factors: predResponse.top_factors,
            disclaimer: predResponse.causal_disclaimer,
          })
        );
      }

      // Refresh history records
      const updatedHistory = await getStudentHistory(studentId, "desc");
      setHistory(updatedHistory);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsEvaluating(false);
    }
  };

  // Callback when student submits self-reported update
  const handleUpdateSuccess = async (res: AcademicUpdateResponse) => {
    setSuccessToast("Your study information was saved, and your risk assessment was updated.");
    setTimeout(() => setSuccessToast(null), 5000);

    if (res.prediction) {
      const pred = res.prediction;
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

      setCurrentPrediction(newPredItem);
      setFactors(pred.top_factors || []);
      setCausalDisclaimer(pred.causal_disclaimer);
    }

    // Refresh history
    if (studentId) {
      try {
        const updatedHistory = await getStudentHistory(studentId, "desc");
        setHistory(updatedHistory);
      } catch {
        // Non-blocking
      }
    }
  };

  const latestAcademicRecord = history?.academic_records?.[0];

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="max-w-6xl mx-auto space-y-7 page-enter">
        {/* Welcome Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-ink text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-edugreen/15 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-mint/25 text-mint text-xs font-medium mb-2.5">
                <GraduationCap className="w-4 h-4" />
                <span>Student Academic Portal • Growth &amp; Trajectory</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display tracking-tight">
                Welcome back, {user?.full_name || "Student"}
              </h1>
              <p className="text-xs sm:text-sm text-white/75 mt-1.5 max-w-2xl leading-relaxed">
                EduGuard brings together verified faculty assessment scores and your self-reported study habits to help you stay on track and get support when you need it.
              </p>
            </div>

            {user?.student_code && (
              <div className="p-3.5 bg-white/5 rounded-xl text-left sm:text-right backdrop-blur-xs self-start sm:self-auto border border-white/10">
                <p className="text-xs text-mint font-medium">
                  Student ID code
                </p>
                <p className="text-base font-mono font-bold text-white mt-0.5">
                  {user.student_code}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Success Toast / Notification */}
        {successToast && (
          <div className="p-4 rounded-xl bg-softgreen border border-edugreen/30 text-edugreen text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 rounded-2xl bg-white border border-ink/10 text-center flex flex-col items-center justify-center space-y-3 paper-surface">
            <Loader2 className="w-8 h-8 text-edugreen animate-spin" />
            <p className="text-sm font-semibold text-ink/70">
              Retrieving your academic records &amp; assessment...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <EmptyStateCard type="error" errorMessage={errorMessage} />
        )}

        {/* Unlinked Student State */}
        {!isLoading && !errorMessage && !studentId && (
          <EmptyStateCard type="not_linked" />
        )}

        {/* Content State */}
        {!isLoading && !errorMessage && student && (
          <>
            {/* 1. Student Identity Summary */}
            <StudentIdentityCard
              student={student}
              totalRecords={history?.total_records || 0}
              totalPredictions={history?.total_predictions || 0}
            />

            {/* 2. Official Academic Data vs Self-Reported Habits Card with Update Action */}
            {studentId && (
              <StudentAcademicDataCard
                studentId={studentId}
                latestRecord={latestAcademicRecord}
                onUpdateSuccess={handleUpdateSuccess}
              />
            )}

            {/* 3. No Academic Data State */}
            {history && history.total_records === 0 && (
              <EmptyStateCard type="no_academic_data" />
            )}

            {/* 4. Has Data But No Prediction State */}
            {history && history.total_records > 0 && !currentPrediction && (
              <EmptyStateCard
                type="no_prediction"
                onGeneratePrediction={handleEvaluate}
                isGenerating={isEvaluating}
              />
            )}

            {/* 5. Supportive Non-Causal Ethics Disclaimer */}
            {currentPrediction && (
              <div className="p-4.5 rounded-2xl bg-white border border-edugreen/25 shadow-xs relative overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-softgreen text-edugreen flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-ink/80 leading-relaxed">
                    <span className="font-bold text-ink block mb-0.5">
                      Supportive Non-Causal Early-Warning Notice
                    </span>
                    <p>
                      Risk calculations represent statistical associations based on historical cohort patterns—
                      <strong className="text-ink">
                        they are not causal mechanisms and do not define your innate potential or academic ability
                      </strong>
                      . All insights serve exclusively as constructive decision support to guide human advising and personalized study habits.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Question 1 & 2 & 5: How am I doing? What is my current risk? When was my data last updated? */}
            {currentPrediction && (
              <RiskGaugeCard
                prediction={currentPrediction}
                academicRecordId={currentPrediction.academic_record_id}
                onRefreshFactors={handleEvaluate}
                isRefreshing={isEvaluating}
              />
            )}

            {/* 7. Question 3: Why is my risk at this level? (SHAP Explainability) */}
            {currentPrediction && (
              <ExplainabilityView
                factors={factors}
                causalDisclaimer={causalDisclaimer}
                onRequestFactors={handleEvaluate}
                isLoadingFactors={isEvaluating}
              />
            )}

            {/* 8. Question 4: What should I do next? (Actionable Guidance Card) */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-ink-muted block">
                      Recommended steps
                    </span>
                    <h2 className="text-lg font-display text-ink mt-0.5 tracking-tight">
                      What Should I Do Next?
                    </h2>
                  </div>
                </div>

                <Link
                  href="/dashboard/student/recommendations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-medium shadow-sm transition-all duration-200 self-start sm:self-auto btn-interactive"
                >
                  <span>View All Recommendations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {currentPrediction?.risk_level === "Low" ? (
                <div className="p-4 rounded-xl bg-softgreen border border-edugreen/25 text-xs text-ink space-y-1">
                  <p className="font-bold text-sm text-edugreen">
                    &quot;You&apos;re currently on track. No urgent interventions are recommended.&quot;
                  </p>
                  <p className="text-ink/75 leading-relaxed">
                    Keep attending classes regularly, stay on top of upcoming assignments, and maintain your weekly study routine.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber/15 border border-amber/35 text-xs text-ink space-y-1">
                  <p className="font-bold text-sm text-ink">
                    Targeted recommendations are available based on your latest indicators.
                  </p>
                  <p className="text-ink/80 leading-relaxed">
                    Review specific guidance on exam preparation, syllabus topics, or attendance check-ins with your faculty mentor.
                  </p>
                </div>
              )}
            </div>

            {/* 9. Navigation Links to Detailed Student Subpages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <Link
                href="/dashboard/student/risk"
                className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface-interactive group flex flex-col justify-between transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink group-hover:text-edugreen transition-colors">
                    Risk &amp; SHAP Analysis
                  </h3>
                  <p className="text-[11px] text-ink/60 mt-1 leading-relaxed">
                    Dedicated on-demand evaluation, factor breakdown, and model confidence.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/student/performance"
                className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface-interactive group flex flex-col justify-between transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <LineChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink group-hover:text-edugreen transition-colors">
                    Academic Performance
                  </h3>
                  <p className="text-[11px] text-ink/60 mt-1 leading-relaxed">
                    G1/G2 trajectory charts, attendance tracking, and grade velocity delta.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/student/history"
                className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface-interactive group flex flex-col justify-between transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink group-hover:text-edugreen transition-colors">
                    Academic History Log
                  </h3>
                  <p className="text-[11px] text-ink/60 mt-1 leading-relaxed">
                    Chronological audit log of all term records and grade entries.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/student/recommendations"
                className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface-interactive group flex flex-col justify-between transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-paper border border-ink/10 text-amber flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink group-hover:text-edugreen transition-colors">
                    Recommendations
                  </h3>
                  <p className="text-[11px] text-ink/60 mt-1 leading-relaxed">
                    Personalized study strategies, habit adjustments, and mentorship advice.
                  </p>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
