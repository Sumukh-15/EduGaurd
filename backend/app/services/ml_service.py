"""Machine Learning and SHAP Explainer service for EduGuard API."""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np
import pandas as pd
import sklearn

from backend.app.core.config import settings
from ml.explain import EduGuardExplainer, NON_CAUSAL_DISCLAIMER, get_display_name
from ml.features import EXPECTED_INPUT_COLUMNS, validate_feature_input
from ml.serialize import (
    RISK_THRESHOLDS,
    classify_risk_level,
    load_model_metadata,
    load_model_pipeline,
)

logger = logging.getLogger("eduguard.ml_service")


class MLModelUnavailableException(Exception):
    """Raised when inference is requested but ML model artifacts are not ready."""
    pass


class MLService:
    """Singleton service wrapping the serialized Phase 1 model and SHAP explainer."""

    def __init__(self) -> None:
        self.pipeline: Optional[Any] = None
        self.metadata: Optional[Dict[str, Any]] = None
        self.explainer: Optional[EduGuardExplainer] = None
        self.is_ready: bool = False
        self.model_version: str = "v1.1.0"

    def get_thresholds(self) -> Dict[str, Any]:
        """Returns active environment-backed risk thresholds."""
        return {
            "low_max": settings.RISK_LOW_MAX,
            "medium_max": settings.RISK_HIGH_MIN,
            "binary_decision_threshold": settings.BINARY_THRESHOLD,
            "categories": {
                "Low": [0.0, settings.RISK_LOW_MAX],
                "Medium": [settings.RISK_LOW_MAX, settings.RISK_HIGH_MIN],
                "High": [settings.RISK_HIGH_MIN, 1.0],
            },
        }

    def load_artifacts(self) -> bool:
        """Load serialized pipeline, metadata, and initialize SHAP explainer."""
        model_path = settings.resolved_model_path
        metadata_path = settings.resolved_metadata_path

        try:
            logger.info("Loading ML model artifact from: %s", model_path)
            self.pipeline = load_model_pipeline(model_path)

            logger.info("Loading ML metadata from: %s", metadata_path)
            self.metadata = load_model_metadata(metadata_path)
            self.model_version = self.metadata.get("model_version", "v1.1.0")

            # Validate runtime scikit-learn version against serialized version
            serialized_sklearn = self.metadata.get("environment", {}).get("scikit_learn_version")
            current_sklearn = sklearn.__version__
            if serialized_sklearn and serialized_sklearn.split(".")[:2] != current_sklearn.split(".")[:2]:
                logger.warning(
                    "Scikit-learn version mismatch: Serialized with %s, running with %s",
                    serialized_sklearn,
                    current_sklearn,
                )

            # Initialize SHAP explainer with trained pipeline
            logger.info("Initializing EduGuard SHAP explainer...")
            self.explainer = EduGuardExplainer(trained_pipeline=self.pipeline)

            self.is_ready = True
            logger.info("MLService successfully initialized with model %s.", self.model_version)
            return True

        except Exception as exc:
            logger.error("Failed to load ML artifacts: %s", exc)
            self.pipeline = None
            self.metadata = None
            self.explainer = None
            self.is_ready = False
            return False

    def predict(
        self,
        features: Union[Dict[str, Any], pd.DataFrame, pd.Series],
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """Perform risk prediction and SHAP explanation for a student's telemetry.

        Guarantees:
        1. Raises MLModelUnavailableException if artifacts are not loaded.
        2. Strictly rejects any input containing G3 or missing features.
        3. Preserves exact Phase 1 risk thresholds and binary cutoff (0.50).
        4. Provides decomposed SHAP factors with non-causal disclaimer.
        """
        if not self.is_ready or self.pipeline is None or self.explainer is None:
            raise MLModelUnavailableException(
                "ML model artifacts are not loaded. Ensure Phase 1 serialization has completed successfully."
            )

        # Convert to single-row DataFrame
        if isinstance(features, dict):
            # Strict boundary check against target leakage
            if "G3" in features:
                raise ValueError("Target label 'G3' is strictly forbidden as an input feature.")
            df = pd.DataFrame([features])
        elif isinstance(features, pd.Series):
            if "G3" in features.index:
                raise ValueError("Target label 'G3' is strictly forbidden as an input feature.")
            df = features.to_frame().T
        elif isinstance(features, pd.DataFrame):
            if "G3" in features.columns:
                raise ValueError("Target label 'G3' is strictly forbidden as an input feature.")
            df = features.copy()
        else:
            raise TypeError(f"Unsupported features type: {type(features)}")

        # Validate feature presence and zero leakage
        validate_feature_input(df)

        # 1. Prediction probabilities
        prob_at_risk = float(self.pipeline.predict_proba(df)[0, 1])
        risk_level = classify_risk_level(prob_at_risk, thresholds=self.get_thresholds())
        binary_label = int(prob_at_risk >= settings.BINARY_THRESHOLD)

        # 2. Local SHAP explanation
        explanation = self.explainer.explain_instance(df, top_k=top_k)

        return {
            "risk_level": risk_level,
            "risk_probability": round(prob_at_risk, 4),
            "at_risk_binary": binary_label,
            "model_version": self.model_version,
            "base_log_odds": explanation["base_log_odds"],
            "top_factors": explanation["top_factors"],
            "all_factors_count": explanation["all_factors_count"],
            "causal_disclaimer": NON_CAUSAL_DISCLAIMER,
        }

    def predict_batch(
        self,
        features_list: List[Dict[str, Any]],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Perform vectorized risk prediction and SHAP explanation for a batch of student records.

        Guarantees:
        1. Raises MLModelUnavailableException if artifacts are not loaded.
        2. Strictly rejects any input containing G3 or missing features.
        3. Preserves exact Phase 1 risk thresholds and binary cutoff (0.50).
        4. Returns list of prediction dicts matching the structure of predict().
        """
        if not self.is_ready or self.pipeline is None or self.explainer is None:
            raise MLModelUnavailableException(
                "ML model artifacts are not loaded. Ensure Phase 1 serialization has completed successfully."
            )

        if not features_list:
            return []

        # Convert to DataFrame
        for item in features_list:
            if "G3" in item:
                raise ValueError("Target label 'G3' is strictly forbidden as an input feature.")

        df = pd.DataFrame(features_list)
        validate_feature_input(df)

        # 1. Prediction probabilities (vectorized)
        probs_at_risk = self.pipeline.predict_proba(df)[:, 1]

        # 2. Transform through feature pipeline and compute SHAP values (vectorized)
        X_trans = self.explainer.feature_pipeline.transform(df)
        shap_values_matrix = self.explainer.compute_shap_matrix(X_trans)

        # 3. Transform for engineered features to extract raw values
        df_engineered = self.explainer.feature_pipeline.named_steps["engineer"].transform(df)

        results: List[Dict[str, Any]] = []
        num_rows = len(features_list)
        feature_names = self.explainer.feature_names
        active_thresholds = self.get_thresholds()

        for i in range(num_rows):
            prob = float(probs_at_risk[i])
            risk_lvl = classify_risk_level(prob, thresholds=active_thresholds)
            bin_label = int(prob >= settings.BINARY_THRESHOLD)

            row_shap = shap_values_matrix[i]
            factors: List[Dict[str, Any]] = []
            for idx, col_name in enumerate(feature_names):
                val = float(row_shap[idx])
                raw_val = None
                if col_name in df_engineered.columns:
                    raw_val = df_engineered[col_name].iloc[i]
                    if isinstance(raw_val, (np.floating, float)):
                        raw_val = round(float(raw_val), 2)
                    elif isinstance(raw_val, (np.integer, int)):
                        raw_val = int(raw_val)
                elif "_" in col_name:
                    base_col, category = col_name.split("_", 1)
                    if base_col in df.columns:
                        raw_val = df[base_col].iloc[i]

                direction = "increases_risk" if val > 0 else "decreases_risk"
                disp_name = get_display_name(col_name)
                factors.append({
                    "feature": col_name,
                    "display_name": disp_name,
                    "contribution": round(val, 4),
                    "abs_contribution": abs(val),
                    "direction": direction,
                    "raw_value": raw_val,
                    "interpretation": (
                        f"{disp_name} shifted risk upward (+{val:.2f})"
                        if val > 0 else
                        f"{disp_name} shifted risk downward ({val:.2f})"
                    ),
                })

            factors.sort(key=lambda x: x["abs_contribution"], reverse=True)
            top_factors = factors[:top_k]

            results.append({
                "risk_level": risk_lvl,
                "risk_probability": round(prob, 4),
                "at_risk_binary": bin_label,
                "model_version": self.model_version,
                "base_log_odds": float(self.explainer.expected_value),
                "top_factors": top_factors,
                "all_factors_count": len(factors),
                "causal_disclaimer": NON_CAUSAL_DISCLAIMER,
            })

        return results


# Singleton instance
ml_service = MLService()
