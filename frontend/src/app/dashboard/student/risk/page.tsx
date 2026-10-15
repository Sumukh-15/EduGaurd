"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Lightbulb,
  LineChart,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import ExplainabilityView from "@/components/student/ExplainabilityView";
import RiskGaugeCard from "@/components/student/RiskGaugeCard";
import EmptyStateCard from "@/components/student/EmptyStateCard";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api/client";
import { getStudentHistory, getStudentProfile, predictStudentRisk } from "@/lib/api/students";
import {
  FactorContribution,
  PredictionHistoryItem,
  StudentDetail,
} from "@/types/student";

export default function StudentRiskPage() {
  const { user } = useAuth();
  const studentId = user?.student_id;

  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<PredictionHistoryItem | null>(null);
  const [factors, setFactors] = useState<FactorContribution[]>([]);
  const [causalDisclaimer, setCausalDisclaimer] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    if (!studentId) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const [profileData, historyData] = await Promise.all([
          getStudentProfile(studentId!),
          getStudentHistory(studentId!, "desc"),
        ]);

        if (!isMounted) return;
        setStudent(profileData);

        if (historyData.latest_prediction) {
          setCurrentPrediction(historyData.latest_prediction);
          if (
            historyData.latest_prediction.top_factors &&
            historyData.latest_prediction.top_factors.length > 0
          ) {
            setFactors(historyData.latest_prediction.top_factors);
          } else if (typeof window !== "undefined") {
            const cachedKey = `eduguard_shap_factors_${studentId}`;
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
                // ignore invalid cache
              }
            }
          }
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiClientError) {
          setErrorMessage(err.detail);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Failed to load student risk telemetry.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  // On-demand risk calculation handler
  const handleCheckRisk = async () => {
    if (!studentId) return;
    setIsEvaluating(true);
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      const predResponse = await predictStudentRisk({ student_id: studentId });

      const newPredictionItem: PredictionHistoryItem = {
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

      setCurrentPrediction(newPredictionItem);
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

      setSuccessToast(
        `Academic risk analysis completed successfully (${predResponse.risk_level} Risk tier).`
      );
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while calculating academic risk.");
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["student"]}>
      <div className="space-y-8 max-w-6xl mx-auto pb-12 page-enter">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/8 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-edugreen bg-softgreen px-2.5 py-0.5 rounded-full border border-softgreen-border">
                Student decision support
              </span>
              <span className="text-xs text-ink-muted">
                Student ID: {student?.student_code || studentId}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-ink tracking-tight mt-1.5">
              Academic Risk & SHAP Explainability
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl">
              Transparent, non-causal early warning evaluation powered by calibrated machine
              learning and mathematical LinearSHAP factor contributions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCheckRisk}
              disabled={isEvaluating || isLoading}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-medium shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none btn-interactive"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating Evaluation...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Check Risk Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success / Error Alerts */}
        {successToast && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-softgreen border border-edugreen/30 text-xs font-semibold text-edugreen-dark flex items-center justify-between shadow-xs animate-fade-in"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-edugreen" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-xs text-edugreen hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-coral-soft border border-coral/30 text-xs font-semibold text-coral flex items-center justify-between shadow-xs animate-fade-in"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-coral" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-coral hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mandatory Non-Causal Ethics Disclaimer */}
        <div className="p-5 rounded-2xl bg-white border border-edugreen/25 shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-softgreen text-edugreen flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-xs text-ink/80 leading-relaxed">
              <span className="font-bold text-ink block mb-0.5">
                Supportive Non-Causal Early-Warning Disclaimer
              </span>
              <p>
                EduGuard risk calculations represent statistical associations based on historical
                cohort data—
                <strong className="text-ink">
                  they are not causal mechanisms and do not define your innate potential or academic ability
                </strong>
                . All insights serve exclusively as constructive decision support to guide human
                advising, personalized study habits, and institutional tutoring.
              </p>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="p-12 rounded-3xl bg-white border border-ink/8 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-edugreen border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-ink-muted">
              Loading your academic risk telemetry...
            </p>
          </div>
        )}

        {/* Content View */}
        {!isLoading && (
          <>
            {currentPrediction ? (
              <div className="space-y-8">
                {/* Risk Gauge Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <RiskGaugeCard
                      prediction={currentPrediction}
                      academicRecordId={currentPrediction.academic_record_id}
                      onRefreshFactors={handleCheckRisk}
                      isRefreshing={isEvaluating}
                    />
                  </div>

                  {/* Supportive Quick Actions Card */}
                  <div className="p-6 rounded-3xl bg-white border border-ink/8 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-edugreen" />
                        <h3 className="text-sm font-bold text-ink">Actionable Next Steps</h3>
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        Use this risk evaluation as a roadmap. Explore targeted study tips or inspect
                        how your grades have changed across milestones.
                      </p>

                      <div className="mt-5 space-y-2.5">
                        <Link
                          href="/dashboard/student/recommendations"
                          className="flex items-center justify-between p-3 rounded-xl bg-paper hover:bg-softgreen/60 border border-ink/6 transition-all group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Lightbulb className="w-4 h-4 text-edugreen" />
                            <span className="text-xs font-semibold text-ink">
                              Personalized Recommendations
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-edugreen group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                          href="/dashboard/student/performance"
                          className="flex items-center justify-between p-3 rounded-xl bg-paper hover:bg-softgreen/60 border border-ink/6 transition-all group"
                        >
                          <div className="flex items-center gap-2.5">
                            <LineChart className="w-4 h-4 text-edugreen" />
                            <span className="text-xs font-semibold text-ink">
                              Grade Velocity & Trajectory
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-edugreen group-hover:translate-x-0.5 transition-all" />
                        </Link>

                        <Link
                          href="/dashboard/student/history"
                          className="flex items-center justify-between p-3 rounded-xl bg-paper hover:bg-softgreen/60 border border-ink/6 transition-all group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Shield className="w-4 h-4 text-edugreen" />
                            <span className="text-xs font-semibold text-ink">
                              Full Academic Log
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-edugreen group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-ink/8 text-[11px] text-ink-muted">
                      Evaluated with Model Version:{" "}
                      <span className="font-semibold text-ink">{currentPrediction.model_version}</span>
                    </div>
                  </div>
                </div>

                {/* SHAP Factor Attribution Breakdown */}
                <ExplainabilityView
                  factors={factors}
                  causalDisclaimer={causalDisclaimer}
                  onRequestFactors={handleCheckRisk}
                  isLoadingFactors={isEvaluating}
                />
              </div>
            ) : (
              <EmptyStateCard
                type="no_prediction"
                onGeneratePrediction={handleCheckRisk}
                isGenerating={isEvaluating}
              />
            )}
          </>
        )}
      </div>
    </RoleGuard>
  );
}
