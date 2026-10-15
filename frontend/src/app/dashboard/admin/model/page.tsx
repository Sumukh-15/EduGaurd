"use client";

import React, { useEffect, useState } from "react";
import {
  Binary,
  Cpu,
  Info,
  Loader2,
  RefreshCw,
  Scale,
  ShieldAlert,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import { getAdminModelInfo } from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";
import { ModelInfo } from "@/types/admin";

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.detail;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred while loading model metadata.";
}

export default function AdminModelPage() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReload = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const data = await getAdminModelInfo();
      setModelInfo(data);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadModel() {
      try {
        const data = await getAdminModelInfo();
        if (isMounted) {
          setModelInfo(data);
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

    loadModel();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatMetric = (val: number | null | undefined, percentage = false) => {
    if (val === null || val === undefined) return "N/A";
    if (percentage) return `${(val * 100).toFixed(2)}%`;
    return val.toFixed(4);
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="max-w-7xl mx-auto space-y-7 page-enter">
        {/* Header Banner - Dark Ink Editorial Hero */}
        <div className="p-6 sm:p-8 rounded-2xl bg-ink text-paper shadow-sm border border-ink/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint/15 text-mint border border-mint/20 text-xs font-medium mb-2.5 backdrop-blur-sm">
                <Cpu className="w-4 h-4" />
                <span>Phase 1 ML telemetry &amp; pipeline</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-white">
                Model Architecture &amp; Evaluation Metrics
              </h1>
              <p className="text-xs sm:text-sm text-paper/80 mt-1.5 max-w-2xl leading-relaxed">
                Inspecting persistent machine learning artifacts, test partition performance metrics, decision thresholds, and SHAP explainability configurations.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleReload}
                disabled={isLoading || isRefreshing}
                className="btn-interactive inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-semibold transition-all border border-edugreen/30 disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Reload metadata</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Model System Disclaimer */}
        <div
          role="note"
          aria-label="Model scope disclaimer"
          className="p-4 rounded-xl bg-softgreen/60 border border-edugreen/30 text-xs text-ink flex items-start gap-3 leading-relaxed shadow-sm"
        >
          <Info className="w-5 h-5 text-edugreen flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold mb-0.5 text-ink">
              System-level baseline model information
            </strong>
            <span className="text-ink/80">
              This page displays benchmark evaluation metrics and architectural parameters of the active system model loaded by the backend. It represents global evaluation on test partition data and does not represent any individual student&apos;s risk prediction.
            </span>
          </div>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-coral/10 border border-coral/30 text-xs text-ink flex items-start gap-3 shadow-sm"
          >
            <ShieldAlert className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold text-coral">Failed to Load Model Metadata</strong>
              <p className="mt-0.5 text-ink/80 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 rounded-2xl bg-white border border-ink/10 shadow-sm flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-edugreen animate-spin mb-3" />
            <p className="text-sm font-semibold text-ink">
              Inspecting model artifacts and evaluation test metrics...
            </p>
          </div>
        )}

        {/* Content */}
        {!isLoading && modelInfo && (
          <>
            {/* Top Cards: Architecture, Version, Training Date, Feature Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-2 hover:border-ink/20 transition-all">
                <span className="text-xs font-medium text-ink-muted block">
                  Model version
                </span>
                <p className="text-2xl font-bold font-sans tabular-nums text-ink">
                  {modelInfo.model_version || "1.0.0"}
                </p>
                <span className="text-xs text-edugreen font-medium block">
                  ● Production active
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-2 hover:border-ink/20 transition-all">
                <span className="text-xs font-medium text-ink-muted block">
                  Algorithm type
                </span>
                <p className="text-lg font-bold text-ink">
                  {modelInfo.algorithm || "Logistic Regression"}
                </p>
                <span className="text-xs text-ink-muted block">
                  Scikit-Learn calibrated pipeline
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-2 hover:border-ink/20 transition-all">
                <span className="text-xs font-medium text-ink-muted block">
                  Training timestamp
                </span>
                <p className="text-base font-bold font-sans tabular-nums text-ink">
                  {modelInfo.training_date
                    ? new Date(modelInfo.training_date).toLocaleDateString()
                    : "Pre-trained"}
                </p>
                <span className="text-xs text-ink-muted block">
                  Artifact verified
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-2 hover:border-ink/20 transition-all">
                <span className="text-xs font-medium text-ink-muted block">
                  Permissible features
                </span>
                <p className="text-2xl font-bold font-sans tabular-nums text-ink">
                  {modelInfo.feature_count}
                </p>
                <span className="text-xs text-ink-muted block">
                  G3 target label strictly forbidden
                </span>
              </div>
            </div>

            {/* Test Partition Benchmark Metrics */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-ink/10 gap-2">
                <div>
                  <h2 className="font-display text-lg text-ink flex items-center gap-2">
                    <Scale className="w-5 h-5 text-edugreen" />
                    <span>Held-Out Test Set Performance Metrics</span>
                  </h2>
                  <p className="text-xs text-ink/60 mt-0.5">
                    Extracted from verified evaluation reports on the held-out student test partition (selected_model_test_metrics.json)
                  </p>
                </div>
                <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg bg-paper text-ink/70 border border-ink/10 self-start sm:self-auto">
                  Ground Truth Benchmark
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-paper border border-ink/10 text-center hover:border-ink/20 transition-all">
                  <span className="text-xs font-medium text-ink-muted block">
                    Accuracy
                  </span>
                  <p className="text-2xl font-bold font-sans tabular-nums text-ink mt-1">
                    {formatMetric(modelInfo.metrics.accuracy, true)}
                  </p>
                  <span className="text-[11px] text-ink-muted block mt-0.5 font-sans tabular-nums">
                    Score: {formatMetric(modelInfo.metrics.accuracy)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-paper border border-ink/10 text-center hover:border-ink/20 transition-all">
                  <span className="text-xs font-medium text-ink-muted block">
                    Precision
                  </span>
                  <p className="text-2xl font-bold font-sans tabular-nums text-ink mt-1">
                    {formatMetric(modelInfo.metrics.precision, true)}
                  </p>
                  <span className="text-[11px] text-ink-muted block mt-0.5 font-sans tabular-nums">
                    Score: {formatMetric(modelInfo.metrics.precision)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-paper border border-ink/10 text-center hover:border-ink/20 transition-all">
                  <span className="text-xs font-medium text-ink-muted block">
                    Recall
                  </span>
                  <p className="text-2xl font-bold font-sans tabular-nums text-ink mt-1">
                    {formatMetric(modelInfo.metrics.recall, true)}
                  </p>
                  <span className="text-[11px] text-ink-muted block mt-0.5 font-sans tabular-nums">
                    Score: {formatMetric(modelInfo.metrics.recall)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-paper border border-ink/10 text-center hover:border-ink/20 transition-all">
                  <span className="text-xs font-medium text-ink-muted block">
                    F1 score
                  </span>
                  <p className="text-2xl font-bold font-sans tabular-nums text-ink mt-1">
                    {formatMetric(modelInfo.metrics.f1_score, true)}
                  </p>
                  <span className="text-[11px] text-ink-muted block mt-0.5 font-sans tabular-nums">
                    Score: {formatMetric(modelInfo.metrics.f1_score)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-softgreen/30 border border-edugreen/30 text-center col-span-2 sm:col-span-1">
                  <span className="text-xs font-medium text-edugreen block">
                    ROC-AUC
                  </span>
                  <p className="text-2xl font-bold font-sans tabular-nums text-edugreen mt-1">
                    {formatMetric(modelInfo.metrics.roc_auc)}
                  </p>
                  <span className="text-[11px] text-ink-muted block mt-0.5 font-sans">
                    Discrimination area
                  </span>
                </div>
              </div>
            </div>

            {/* Threshold Configuration & Triage Logic */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Decision & Risk Thresholds */}
              <div className="p-6 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-ink/10">
                  <SlidersHorizontal className="w-5 h-5 text-edugreen" />
                  <h3 className="font-display text-lg text-ink">
                    Classification &amp; Risk Band Thresholds
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-paper border border-ink/10 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink block">
                        Binary classification threshold
                      </span>
                      <span className="text-ink-muted text-xs">
                        Cutoff for at_risk binary flag
                      </span>
                    </div>
                    <span className="font-sans font-bold text-sm text-edugreen tabular-nums">
                      {modelInfo.classification_threshold}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-softgreen/40 border border-edugreen/25 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink block">
                        Low risk band
                      </span>
                      <span className="text-ink/65 text-xs tabular-nums">
                        Probability &lt; {modelInfo.risk_thresholds.medium ?? 0.35}
                      </span>
                    </div>
                    <span className="font-medium text-xs text-edugreen-dark bg-softgreen px-2.5 py-1 rounded-md border border-edugreen/20">
                      Standard advisory
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber/10 border border-amber/25 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink block">
                        Medium risk band
                      </span>
                      <span className="text-ink/65 text-xs tabular-nums">
                        {modelInfo.risk_thresholds.medium ?? 0.35} ≤ Probability &lt; {modelInfo.risk_thresholds.high ?? 0.65}
                      </span>
                    </div>
                    <span className="font-medium text-xs text-amber-800 bg-amber/15 px-2.5 py-1 rounded-md border border-amber/20">
                      Academic monitoring
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-coral/10 border border-coral/25 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink block">
                        High risk band
                      </span>
                      <span className="text-ink/65 text-xs tabular-nums">
                        Probability ≥ {modelInfo.risk_thresholds.high ?? 0.65}
                      </span>
                    </div>
                    <span className="font-medium text-xs text-coral bg-coral/15 px-2.5 py-1 rounded-md border border-coral/20">
                      Urgent intervention
                    </span>
                  </div>
                </div>
              </div>

              {/* Explainability Pipeline */}
              <div className="p-6 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-ink/10">
                  <Workflow className="w-5 h-5 text-edugreen" />
                  <h3 className="font-display text-lg text-ink">
                    Explainability &amp; SHAP Configuration
                  </h3>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-ink/75">
                  <p>
                    EduGuard incorporates <strong className="text-ink">TreeExplainer / LinearExplainer</strong> attribution vectors for every prediction. Feature contributions are computed directly at inference time and decomposed into localized directional drivers.
                  </p>

                  <div className="p-3.5 rounded-xl bg-paper border border-ink/10 space-y-2">
                    <span className="text-xs font-medium text-ink-muted block">
                      Factor decomposition
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-ink/70">Top attributions extracted:</span>
                      <span className="font-sans font-bold tabular-nums text-ink">5 Factors</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink/70">Explanation persistence:</span>
                      <span className="font-mono text-xs font-semibold text-edugreen">PostgreSQL explanations table</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-softgreen/40 border border-edugreen/20 text-xs text-ink/80">
                    <strong className="text-ink">Rule-based recommendations:</strong> Generated deterministically from identified risk drivers. No generative hallucinations are utilized for academic advisories.
                  </div>
                </div>
              </div>
            </div>

            {/* Permissible Feature Registry */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-ink/10 gap-2">
                <div>
                  <h2 className="font-display text-lg text-ink flex items-center gap-2">
                    <Binary className="w-5 h-5 text-edugreen" />
                    <span>Permissible Features ({modelInfo.feature_count} Total)</span>
                  </h2>
                  <p className="text-xs text-ink/60 mt-0.5">
                    All input attributes required by the preprocessor pipeline. Any upload missing these columns or containing G3 will be rejected.
                  </p>
                </div>
                <span className="text-xs font-mono text-edugreen font-medium bg-softgreen px-2.5 py-1 rounded-lg border border-edugreen/20 self-start sm:self-auto">
                  Zero Data Leakage
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {modelInfo.feature_names.map((feat) => (
                  <span
                    key={feat}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-paper text-ink border border-ink/10 hover:border-edugreen/40 transition-colors"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
