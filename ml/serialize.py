"""Serialization and export module for EduGuard machine learning artifacts.

Persists:
1. ml/artifacts/model_v1.joblib: The complete, fitted scikit-learn Pipeline
   (AcademicFeatureEngineer + ColumnTransformer + LogisticRegression).
2. ml/artifacts/model_metadata.json: Complete runtime schema, feature ordering,
   risk thresholds, version tags, environment dependencies, and test metrics.

Provides clean load/predict utility functions for backend API consumption.
"""

from datetime import datetime, timezone
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

# Centralized risk probability threshold definitions (single source of truth)
RISK_THRESHOLDS = {
    "low_max": 0.40,
    "medium_max": 0.70,
    "binary_decision_threshold": 0.50,
    "categories": {
        "Low": [0.0, 0.40],
        "Medium": [0.40, 0.70],
        "High": [0.70, 1.0]
    }
}


def classify_risk_level(prob: float) -> str:
    """Classifies risk level based on centralized threshold boundaries."""
    if prob >= RISK_THRESHOLDS["medium_max"]:
        return "High"
    if prob >= RISK_THRESHOLDS["low_max"]:
        return "Medium"
    return "Low"


def build_and_fit_final_pipeline(
    train_split_path: str | Path = "data/processed/train_split.csv"
) -> Tuple[Any, pd.DataFrame, pd.Series]:
    """Fits the winning Logistic Regression pipeline on the complete training split."""
    train_path = Path(train_split_path)
    if not train_path.exists():
        raise FileNotFoundError(f"Training split file missing at: {train_path.resolve()}")

    train_df = pd.read_csv(train_path)
    X_train = train_df.drop(columns=["at_risk"])
    y_train = train_df["at_risk"]

    validate_feature_input(X_train)

    pipeline = build_candidate_pipelines()["Logistic Regression"]
    pipeline.fit(X_train, y_train)

    return pipeline, X_train, y_train


def export_pipeline_artifacts(
    artifacts_dir: str | Path = "ml/artifacts",
    reports_dir: str | Path = "ml/reports"
) -> Tuple[Path, Path]:
    """Serializes the fitted pipeline and writes comprehensive metadata JSON."""
    art_path = Path(artifacts_dir)
    art_path.mkdir(parents=True, exist_ok=True)
    rep_path = Path(reports_dir)

    # 1. Fit winning pipeline on training split (test set strictly preserved)
    pipeline, X_train, y_train = build_and_fit_final_pipeline()

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
        "model_version": "v1.0.0",
        "algorithm": "LogisticRegression(C=0.5, class_weight='balanced', solver='lbfgs')",
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

    # 5. Persist artifacts
    model_file = art_path / "model_v1.joblib"
    metadata_file = art_path / "model_metadata.json"

    # Save fitted pipeline
    joblib.dump(pipeline, model_file, compress=3)

    # Save metadata JSON
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Pipeline artifact exported: {model_file.resolve()} ({model_file.stat().st_size / 1024:.1f} KB)")
    print(f"Metadata artifact exported: {metadata_file.resolve()}")

    return model_file, metadata_file


def load_model_pipeline(model_path: str | Path = "ml/artifacts/model_v1.joblib"):
    """Loads the serialized scikit-learn pipeline from disk."""
    path = Path(model_path)
    if not path.exists():
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
    model_path: str | Path = "ml/artifacts/model_v1.joblib"
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
    print("EduGuard Sub-step 1.6: Pipeline Serialization & Metadata Export")
    print("=" * 60)

    model_path, meta_path = export_pipeline_artifacts()

    # Verify loading and sample inference
    loaded_pipe = load_model_pipeline(model_path)
    loaded_meta = load_model_metadata(meta_path)

    test_df = pd.read_csv("data/processed/test_split.csv")
    sample_student = test_df.iloc[0].drop("at_risk").to_dict()

    prediction = predict_student(sample_student, pipeline=loaded_pipe)
    print(f"\nInference Verification on Sample Student:")
    print(f"  Risk Level:       {prediction['risk_level']}")
    print(f"  Risk Probability: {prediction['risk_probability']*100:.2f}%")
    print(f"  Binary Label:     {prediction['at_risk_binary']}")
    print(f"  Target Meaning:   {loaded_meta['schema']['target_mapping'][str(prediction['at_risk_binary'])]}")
