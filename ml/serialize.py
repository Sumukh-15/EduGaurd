"""Serialization and export module for EduGuard machine learning artifacts.

Persists:
1. ml/artifacts/model_v1_1.joblib: The complete, fitted scikit-learn Pipeline
   with tuned hyperparameters and leak-free preprocessing.
   (model_v1.joblib is preserved for backward traceability).
2. ml/artifacts/model_metadata.json: Complete runtime schema, feature ordering,
   environment-backed risk thresholds, version tags (v1.1.0), dependencies, and test metrics.

Provides clean load/predict utility functions for backend API consumption.
"""

from datetime import datetime, timezone
import os
from pathlib import Path
from typing import Dict, Any, Tuple, Union
import json
import joblib
import numpy as np
import pandas as pd
import sklearn

from ml.features import (
    create_feature_pipeline,
    validate_feature_input,
    get_feature_names_from_pipeline,
    EXPECTED_INPUT_COLUMNS,
    ENGINEERED_NUMERIC_FEATURES
)
from ml.train import build_candidate_pipelines, RANDOM_STATE

MODEL_VERSION = "v1.1.0"

# Environment-backed risk thresholds
try:
    from backend.app.core.config import settings
    _DEFAULT_LOW_MAX = settings.RISK_LOW_MAX
    _DEFAULT_HIGH_MIN = settings.RISK_HIGH_MIN
    _DEFAULT_BINARY_THRESH = settings.BINARY_THRESHOLD
except Exception:
    _DEFAULT_LOW_MAX = float(os.getenv("RISK_LOW_MAX", "0.40"))
    _DEFAULT_HIGH_MIN = float(os.getenv("RISK_HIGH_MIN", "0.70"))
    _DEFAULT_BINARY_THRESH = float(os.getenv("BINARY_THRESHOLD", "0.50"))


def get_risk_thresholds(
    low_max: float = None,
    high_min: float = None,
    binary_threshold: float = None
) -> Dict[str, Any]:
    """Generates centralized risk threshold mapping with low < high validation."""
    l_max = _DEFAULT_LOW_MAX if low_max is None else low_max
    h_min = _DEFAULT_HIGH_MIN if high_min is None else high_min
    b_thresh = _DEFAULT_BINARY_THRESH if binary_threshold is None else binary_threshold

    if not (0.0 <= l_max < h_min <= 1.0):
        raise ValueError(
            f"Invalid thresholds: low_max ({l_max}) must be strictly less than "
            f"high_min ({h_min}) and both must lie in [0.0, 1.0]."
        )
    if not (0.0 <= b_thresh <= 1.0):
        raise ValueError(f"Invalid binary_threshold ({b_thresh}): must lie in [0.0, 1.0].")

    return {
        "low_max": l_max,
        "medium_max": h_min,
        "binary_decision_threshold": b_thresh,
        "categories": {
            "Low": [0.0, l_max],
            "Medium": [l_max, h_min],
            "High": [h_min, 1.0]
        }
    }


# Centralized risk probability threshold definitions (single source of truth)
RISK_THRESHOLDS = get_risk_thresholds()


def classify_risk_level(prob: float, thresholds: Dict[str, Any] = None) -> str:
    """Classifies risk level based on centralized threshold boundaries."""
    t = thresholds or RISK_THRESHOLDS
    if prob >= t["medium_max"]:
        return "High"
    if prob >= t["low_max"]:
        return "Medium"
    return "Low"


def build_and_fit_final_pipeline(
    train_split_path: str | Path = "data/processed/train_split.csv",
    comparison_csv: str | Path = "ml/reports/model_comparison.csv",
    tuning_csv: str | Path = "ml/reports/tuning_results.csv"
) -> Tuple[Any, pd.DataFrame, pd.Series, str, Dict[str, Any]]:
    """Fits the selected winning pipeline on the complete training split."""
    train_path = Path(train_split_path)
    if not train_path.exists():
        raise FileNotFoundError(f"Training split file missing at: {train_path.resolve()}")

    train_df = pd.read_csv(train_path)
    X_train = train_df.drop(columns=["at_risk"])
    y_train = train_df["at_risk"]

    validate_feature_input(X_train)

    # Determine winning model from comparison CSV if available
    winner_name = "Logistic Regression"
    comp_path = Path(comparison_csv)
    if comp_path.exists():
        df_comp = pd.read_csv(comp_path)
        sorted_comp = df_comp.sort_values(
            by=["recall_mean", "f1_mean", "roc_auc_mean"],
            ascending=[False, False, False]
        )
        winner_name = sorted_comp.iloc[0]["model"]

    # Read tuned parameters from tuning_results.csv if available
    tuned_params_dict = {}
    tune_path = Path(tuning_csv)
    if tune_path.exists():
        df_tune = pd.read_csv(tune_path)
        for _, row in df_tune.iterrows():
            tuned_params_dict[row["model"]] = json.loads(row["best_params"])

    candidates = build_candidate_pipelines(tuned_params=tuned_params_dict)
    if winner_name not in candidates:
        if winner_name == "SVM" and "Support Vector Machine" in candidates:
            winner_name = "Support Vector Machine"
        else:
            winner_name = "Logistic Regression"

    pipeline = candidates[winner_name]
    pipeline.fit(X_train, y_train)

    winning_params = tuned_params_dict.get(winner_name, {})
    return pipeline, X_train, y_train, winner_name, winning_params


def export_pipeline_artifacts(
    artifacts_dir: str | Path = "ml/artifacts",
    reports_dir: str | Path = "ml/reports"
) -> Tuple[Path, Path]:
    """Serializes the fitted pipeline and writes comprehensive metadata JSON."""
    art_path = Path(artifacts_dir)
    art_path.mkdir(parents=True, exist_ok=True)
    rep_path = Path(reports_dir)

    # 1. Fit winning pipeline on training split (test set strictly preserved)
    pipeline, X_train, y_train, winner_name, winning_params = build_and_fit_final_pipeline()

    # 2. Extract feature metadata
    feature_names = get_feature_names_from_pipeline(pipeline.named_steps["features"])

    # 3. Load existing test evaluation metrics (without re-evaluating or touching test split)
    test_metrics_path = rep_path / "selected_model_test_metrics.json"
    test_metrics = {}
    if test_metrics_path.exists():
        with open(test_metrics_path, "r", encoding="utf-8") as f:
            test_metrics = json.load(f)

    # 4. Construct comprehensive metadata dictionary
    metadata: Dict[str, Any] = {
        "model_name": "EduGuard Student Academic Risk Classifier",
        "model_version": MODEL_VERSION,
        "selected_model": winner_name,
        "algorithm": f"{winner_name} with tuned hyperparameters: {json.dumps(winning_params)}",
        "tuned_hyperparameters": winning_params,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "random_state": RANDOM_STATE,
        "environment": {
            "python_version": "3.12",
            "scikit_learn_version": sklearn.__version__,
            "numpy_version": np.__version__,
            "pandas_version": pd.__version__,
            "joblib_version": joblib.__version__
        },
        "schema": {
            "raw_input_features": list(EXPECTED_INPUT_COLUMNS),
            "raw_feature_count": len(EXPECTED_INPUT_COLUMNS),
            "engineered_features": list(ENGINEERED_NUMERIC_FEATURES),
            "transformed_features": feature_names,
            "transformed_feature_count": len(feature_names),
            "excluded_features": ["G3"],
            "target": "at_risk",
            "target_mapping": {
                "0": "Not At Risk (Final Grade G3 >= 10)",
                "1": "At Risk (Final Grade G3 < 10)"
            }
        },
        "risk_thresholds": RISK_THRESHOLDS,
        "validation_metrics": test_metrics,
        "disclaimer": (
            "EduGuard is an educational decision-support research prototype. "
            "It is NOT validated or certified for autonomous, unmonitored student interventions."
        )
    }

    # 5. Persist artifacts: save model_v1_1.joblib while keeping model_v1.joblib
    model_file = art_path / "model_v1_1.joblib"
    metadata_file = art_path / "model_metadata.json"

    # Save fitted pipeline
    joblib.dump(pipeline, model_file, compress=3)

    # If model_v1.joblib does not exist, create it as baseline copy
    v1_file = art_path / "model_v1.joblib"
    if not v1_file.exists():
        joblib.dump(pipeline, v1_file, compress=3)

    # Save metadata JSON
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Pipeline artifact exported: {model_file.resolve()} ({model_file.stat().st_size / 1024:.1f} KB)")
    print(f"Metadata artifact exported: {metadata_file.resolve()}")

    return model_file, metadata_file


def load_model_pipeline(model_path: str | Path = "ml/artifacts/model_v1_1.joblib"):
    """Loads the serialized scikit-learn pipeline from disk (falls back to model_v1.joblib if needed)."""
    path = Path(model_path)
    if not path.exists():
        fallback = Path("ml/artifacts/model_v1.joblib")
        if fallback.exists():
            path = fallback
        else:
            raise FileNotFoundError(f"Model artifact not found at: {path.resolve()}")
    return joblib.load(path)


def load_model_metadata(metadata_path: str | Path = "ml/artifacts/model_metadata.json") -> Dict[str, Any]:
    """Loads the model metadata dictionary from disk."""
    path = Path(metadata_path)
    if not path.exists():
        raise FileNotFoundError(f"Metadata artifact not found at: {path.resolve()}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def predict_student(
    student_data: Union[Dict[str, Any], pd.Series, pd.DataFrame],
    pipeline=None,
    model_path: str | Path = "ml/artifacts/model_v1_1.joblib"
) -> Dict[str, Any]:
    """Inference helper for raw student records."""
    if pipeline is None:
        pipeline = load_model_pipeline(model_path)

    if isinstance(student_data, dict):
        df = pd.DataFrame([student_data])
    elif isinstance(student_data, pd.Series):
        df = student_data.to_frame().T
    elif isinstance(student_data, pd.DataFrame):
        df = student_data.copy()
    else:
        raise TypeError(f"Unsupported student_data type: {type(student_data)}")

    validate_feature_input(df)

    prob_at_risk = float(pipeline.predict_proba(df)[0, 1])
    risk_level = classify_risk_level(prob_at_risk)
    binary_label = int(prob_at_risk >= RISK_THRESHOLDS["binary_decision_threshold"])

    return {
        "risk_level": risk_level,
        "risk_probability": round(prob_at_risk, 4),
        "at_risk_binary": binary_label
    }


if __name__ == "__main__":
    print("=" * 60)
    print("EduGuard ML Pipeline Serialization & Metadata Export (v1.1.0)")
    print("=" * 60)

    model_path, meta_path = export_pipeline_artifacts()

    # Verify loading and sample inference
    loaded_pipe = load_model_pipeline(model_path)
    loaded_meta = load_model_metadata(meta_path)

    test_df = pd.read_csv("data/processed/test_split.csv")
    sample_student = test_df.iloc[0].drop("at_risk").to_dict()

    prediction = predict_student(sample_student, pipeline=loaded_pipe)
    print(f"\nInference Verification on Sample Student:")
    print(f"  Selected Model:   {loaded_meta.get('selected_model')}")
    print(f"  Model Version:    {loaded_meta.get('model_version')}")
    print(f"  Risk Level:       {prediction['risk_level']}")
    print(f"  Risk Probability: {prediction['risk_probability']*100:.2f}%")
    print(f"  Binary Label:     {prediction['at_risk_binary']}")
    print(f"  Target Meaning:   {loaded_meta['schema']['target_mapping'][str(prediction['at_risk_binary'])]}")
