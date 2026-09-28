"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, GraduationCap, Lightbulb, Loader2 } from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import EmptyStateCard from "@/components/student/EmptyStateCard";
import ExplainabilityView from "@/components/student/ExplainabilityView";
import RiskGaugeCard from "@/components/student/RiskGaugeCard";
import StudentIdentityCard from "@/components/student/StudentIdentityCard";
import { useAuth } from "@/context/AuthContext";
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
  return "An unexpected error occurred while communicating with EduGuard.";
}

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const [dataLoaded, setDataLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        // Fetch institutional profile & longitudinal history in parallel
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

          // Check if top_factors were cached for this student's latest evaluation
          if (typeof window !== "undefined") {
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
        // Note: If no prediction exists yet, EmptyStateCard (type='no_prediction')
        // is displayed with an explicit 'Generate Risk Evaluation' user action.
        // Opening or refreshing the page remains strictly read-only.
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
      };

      setCurrentPrediction(newPredItem);
      setFactors(predResponse.top_factors);
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
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="max-w-6xl mx-auto space-y-7">
        {/* Welcome Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-lg shadow-emerald-700/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-semibold mb-2.5 backdrop-blur-sm">
                <GraduationCap className="w-4 h-4" />
                <span>Student Academic Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.full_name || "Student"}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1.5 max-w-2xl leading-relaxed">
                EduGuard analyzes your historical attendance, midterm scores, and academic indicators to provide early-warning decision support and personalized interventions.
              </p>
            </div>

            {user?.student_code && (
              <div className="p-3.5 bg-white/10 rounded-xl text-left sm:text-right backdrop-blur-sm self-start sm:self-auto border border-white/10">
                <p className="text-[11px] text-emerald-200 uppercase tracking-wider font-semibold">
                  Student ID Code
                </p>
                <p className="text-base font-mono font-bold text-white mt-0.5">
                  {user.student_code}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Retrieving academic indicators & risk evaluation...
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

            {/* 2. No Academic Telemetry State */}
            {history && history.total_records === 0 && (
              <EmptyStateCard type="no_academic_data" />
            )}

            {/* 3. Has Telemetry But No Prediction State */}
            {history && history.total_records > 0 && !currentPrediction && (
              <EmptyStateCard
                type="no_prediction"
                onGeneratePrediction={handleEvaluate}
                isGenerating={isEvaluating}
              />
            )}

            {/* 4. Active Risk Assessment & Explainability View */}
            {currentPrediction && (
              <>
                <RiskGaugeCard
                  prediction={currentPrediction}
                  academicRecordId={currentPrediction.academic_record_id}
                  onRefreshFactors={handleEvaluate}
                  isRefreshing={isEvaluating}
                />

                <ExplainabilityView
                  factors={factors}
                  causalDisclaimer={causalDisclaimer}
                  onRequestFactors={handleEvaluate}
                  isLoadingFactors={isEvaluating}
                />
              </>
            )}

            {/* 5. Navigation Links to History & Recommendations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <Link
                href="/dashboard/student/history"
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Explore Academic History
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    View chronological semester records, grade changes, and past evaluation trajectory.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/student/recommendations"
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Targeted Interventions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Review actionable recommendations tailored to study habits, attendance, and exam prep.
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
