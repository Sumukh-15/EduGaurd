"""Machine Learning and SHAP Explainer service for EduGuard API."""

import logging
from pathlib import Path
from typing import Any, Dict, Optional, Union
import pandas as pd
import sklearn

from backend.app.core.config import settings
from ml.explain import EduGuardExplainer, NON_CAUSAL_DISCLAIMER
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
        self.model_version: str = "v1.0.0"

    def load_artifacts(self) -> bool:
        """Load serialized pipeline, metadata, and initialize SHAP explainer."""
        model_path = settings.resolved_model_path
        metadata_path = settings.resolved_metadata_path

        try:
            logger.info("Loading ML model artifact from: %s", model_path)
            self.pipeline = load_model_pipeline(model_path)

            logger.info("Loading ML metadata from: %s", metadata_path)
            self.metadata = load_model_metadata(metadata_path)
            self.model_version = self.metadata.get("model_version", "v1.0.0")

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
        risk_level = classify_risk_level(prob_at_risk)
        binary_label = int(prob_at_risk >= RISK_THRESHOLDS["binary_decision_threshold"])

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


# Singleton instance
ml_service = MLService()
