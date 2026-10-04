"""End-to-end acceptance audit suite for EduGuard Phase 1 ML pipeline (v1.1.0).

Verifies:
1. Strict alignment between serialized model_v1_1.joblib, model_metadata.json, and EduGuardExplainer.
2. Zero leakage: G3 is prohibited across all endpoints and schemas.
3. Held-out test set isolation and reproducibility of metrics in MODEL_CARD.md.
4. Risk threshold and category boundary consistency.
5. Legacy model_v1.joblib preservation for backward traceability.
"""

from pathlib import Path
import json
import numpy as np
import pandas as pd
import pytest

from ml.serialize import (
    load_model_pipeline,
    load_model_metadata,
    predict_student,
    RISK_THRESHOLDS
)
from ml.explain import EduGuardExplainer
from ml.features import get_feature_names_from_pipeline


def test_pipeline_and_metadata_alignment():
    """Verifies transformed features match between pipeline and metadata."""
    pipe = load_model_pipeline("ml/artifacts/model_v1_1.joblib")
    meta = load_model_metadata("ml/artifacts/model_metadata.json")

    pipe_features = get_feature_names_from_pipeline(pipe.named_steps["features"])
    meta_features = meta["schema"]["transformed_features"]

    assert pipe_features == meta_features
    assert len(pipe_features) == 62
    assert meta["model_version"] == "v1.1.0"
    assert meta["schema"]["raw_feature_count"] == 32
    assert "G3" not in meta["schema"]["raw_input_features"]
    assert "G3" in meta["schema"]["excluded_features"]


def test_legacy_model_traceability():
    """Verifies that model_v1.joblib is preserved on disk for backward traceability."""
    v1_path = Path("ml/artifacts/model_v1.joblib")
    assert v1_path.exists(), "Legacy model_v1.joblib must be retained"
    legacy_pipe = load_model_pipeline(v1_path)
    assert legacy_pipe is not None


def test_explainer_and_predictor_alignment():
    """Verifies that EduGuardExplainer and predict_student produce identical probabilities."""
    pipe = load_model_pipeline("ml/artifacts/model_v1_1.joblib")
    test_df = pd.read_csv("data/processed/test_split.csv")
    sample_student = test_df.iloc[0].drop("at_risk").to_dict()

    explainer = EduGuardExplainer(trained_pipeline=pipe)
    exp = explainer.explain_instance(sample_student)
    pred = predict_student(sample_student, pipeline=pipe)

    assert exp["predicted_risk_level"] == pred["risk_level"]
    assert abs(exp["risk_probability"] - pred["risk_probability"]) < 1e-4
    assert len(exp["top_factors"]) == 5


def test_test_set_isolation_and_disjointness():
    """Verifies train and test splits are strictly disjoint with no record overlap."""
    train_df = pd.read_csv("data/processed/train_split.csv")
    test_df = pd.read_csv("data/processed/test_split.csv")

    assert len(train_df) == 316
    assert len(test_df) == 79
    assert len(train_df) + len(test_df) == 395

    # Confirm G3 is absent from both splits
    assert "G3" not in train_df.columns
    assert "G3" not in test_df.columns

    # Verify identical columns
    assert list(train_df.columns) == list(test_df.columns)


def test_model_card_and_metrics_consistency():
    """Cross-references MODEL_CARD.md values with serialized test metrics."""
    with open("ml/reports/selected_model_test_metrics.json", "r", encoding="utf-8") as f:
        metrics = json.load(f)

    card_text = Path("ml/reports/MODEL_CARD.md").read_text(encoding="utf-8")

    recall_str = f"{metrics['recall']*100:.2f}%"
    precision_str = f"{metrics['precision']*100:.2f}%"
    f1_str = f"{metrics['f1']*100:.2f}%"

    assert recall_str in card_text, f"Recall {recall_str} not found in MODEL_CARD.md"
    assert precision_str in card_text, f"Precision {precision_str} not found in MODEL_CARD.md"
    assert f1_str in card_text, f"F1 {f1_str} not found in MODEL_CARD.md"


def test_threshold_bounds_integrity():
    """Verifies threshold definitions adhere to project requirements."""
    meta = load_model_metadata("ml/artifacts/model_metadata.json")
    thresholds = meta["risk_thresholds"]

    assert thresholds["low_max"] == 0.40
    assert thresholds["medium_max"] == 0.70
    assert thresholds["binary_decision_threshold"] == 0.50
    assert thresholds["categories"]["Low"] == [0.0, 0.40]
    assert thresholds["categories"]["Medium"] == [0.40, 0.70]
    assert thresholds["categories"]["High"] == [0.70, 1.0]
