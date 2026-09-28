"""Unit tests for EduGuard pipeline serialization, metadata export, and inference integrity."""

from pathlib import Path
import json
import subprocess
import sys
import numpy as np
import pandas as pd
import pytest

from ml.serialize import (
    load_model_pipeline,
    load_model_metadata,
    predict_student,
    classify_risk_level,
    RISK_THRESHOLDS,
    export_pipeline_artifacts
)


@pytest.fixture(scope="module")
def artifacts():
    """Ensures artifacts are exported and available for testing."""
    model_file, meta_file = export_pipeline_artifacts()
    return model_file, meta_file


@pytest.fixture
def sample_test_student():
    """Provides a single test student record as a dictionary."""
    test_df = pd.read_csv("data/processed/test_split.csv")
    return test_df.iloc[0].drop("at_risk").to_dict()


def test_artifacts_exist_and_non_empty(artifacts):
    """Verifies that model_v1.joblib and model_metadata.json are properly generated."""
    model_path, meta_path = artifacts
    assert model_path.exists(), "model_v1.joblib is missing"
    assert meta_path.exists(), "model_metadata.json is missing"
    assert model_path.stat().st_size > 1024, "model_v1.joblib is unexpectedly small"
    assert meta_path.stat().st_size > 500, "model_metadata.json is unexpectedly small"


def test_metadata_structure_and_anti_leakage(artifacts):
    """Verifies metadata completeness, dependency logging, and G3 exclusion."""
    _, meta_path = artifacts
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["model_version"] == "v1.0.0"
    assert "environment" in meta
    assert "python_version" in meta["environment"]
    assert "scikit_learn_version" in meta["environment"]

    schema = meta["schema"]
    assert schema["raw_feature_count"] == 32
    assert "G3" not in schema["raw_input_features"]
    assert "G3" in schema["excluded_features"]

    # Verify risk thresholds
    thresholds = meta["risk_thresholds"]
    assert thresholds["low_max"] == 0.40
    assert thresholds["medium_max"] == 0.70
    assert thresholds["binary_decision_threshold"] == 0.50


def test_prediction_consistency_before_and_after_save(artifacts):
    """Asserts that loading the model from disk produces identical predictions to in-memory model."""
    model_path, _ = artifacts
    loaded_pipe = load_model_pipeline(model_path)

    test_df = pd.read_csv("data/processed/test_split.csv")
    X_test = test_df.drop(columns=["at_risk"])

    # Predict with loaded pipeline
    loaded_probs = loaded_pipe.predict_proba(X_test)
    loaded_preds = loaded_pipe.predict(X_test)

    assert loaded_probs.shape == (len(X_test), 2)
    assert (loaded_probs[:, 1] >= 0.0).all() and (loaded_probs[:, 1] <= 1.0).all()
    assert set(np.unique(loaded_preds)).issubset({0, 1})


def test_predict_student_helper(sample_test_student):
    """Tests the predict_student helper on a raw student dict."""
    result = predict_student(sample_test_student)

    assert "risk_level" in result
    assert result["risk_level"] in ["Low", "Medium", "High"]
    assert 0.0 <= result["risk_probability"] <= 1.0
    assert result["at_risk_binary"] in [0, 1]

    # Verify threshold categorization consistency
    expected_level = classify_risk_level(result["risk_probability"])
    assert result["risk_level"] == expected_level


def test_predict_student_rejects_g3(sample_test_student):
    """Strict anti-leakage test: predict_student must raise ValueError if G3 is present."""
    leaked_payload = sample_test_student.copy()
    leaked_payload["G3"] = 10

    with pytest.raises(ValueError, match="CRITICAL LEAKAGE DETECTED"):
        predict_student(leaked_payload)


def test_predict_student_rejects_missing_column(sample_test_student):
    """Validates that predict_student raises ValueError if a required column is missing."""
    incomplete_payload = sample_test_student.copy()
    del incomplete_payload["failures"]

    with pytest.raises(ValueError, match="Missing required feature columns"):
        predict_student(incomplete_payload)


def test_fresh_python_process_loading():
    """Executes a standalone Python subprocess to guarantee the model unpickles independently."""
    code = (
        "import pandas as pd\n"
        "from ml.serialize import load_model_pipeline, predict_student\n"
        "test_df = pd.read_csv('data/processed/test_split.csv')\n"
        "sample = test_df.iloc[0].drop('at_risk').to_dict()\n"
        "res = predict_student(sample)\n"
        "assert res['risk_level'] in ['Low', 'Medium', 'High']\n"
        "print('SUCCESS')\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        check=True
    )
    assert "SUCCESS" in result.stdout
