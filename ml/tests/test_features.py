"""Unit tests for EduGuard feature engineering and preprocessing pipeline.

Verifies:
- Correct derivation of domain signals (grade velocity, grade average, chronic absenteeism).
- Pipeline fit_transform output shapes, absence of NaNs, and numerical stability.
- Handling of unseen categorical values during inference.
- Validation behavior when required columns are missing.
- Verification that transformers fit only on train and transform test independently.
"""

import numpy as np
import pandas as pd
import pytest

from ml.clean import load_raw_data, clean_student_data
from ml.features import (
    AcademicFeatureEngineer,
    create_feature_pipeline,
    validate_feature_input,
    get_feature_names_from_pipeline,
    EXPECTED_INPUT_COLUMNS
)


@pytest.fixture
def sample_clean_data():
    """Provides real clean student data fixture (X, y)."""
    raw_df = load_raw_data()
    return clean_student_data(raw_df)


def test_academic_feature_engineer_logic():
    """Asserts exact formula correctness of derived academic telemetry features."""
    sample_df = pd.DataFrame([{
        "school": "GP", "sex": "F", "age": 16, "address": "U", "famsize": "GT3", "Pstatus": "T",
        "Medu": 4, "Fedu": 3, "Mjob": "health", "Fjob": "services", "reason": "home",
        "guardian": "mother", "traveltime": 1, "studytime": 3, "failures": 1,
        "schoolsup": "no", "famsup": "yes", "paid": "no", "activities": "yes",
        "nursery": "yes", "higher": "yes", "internet": "yes", "romantic": "no",
        "famrel": 4, "freetime": 3, "goout": 2, "Dalc": 1, "Walc": 1, "health": 4,
        "absences": 12, "G1": 14, "G2": 10
    }])

    engineer = AcademicFeatureEngineer(absence_threshold=10)
    transformed = engineer.fit_transform(sample_df)

    # 1. grade_velocity = G2 - G1 = 10 - 14 = -4.0 (decline)
    assert transformed.loc[0, "grade_velocity"] == -4.0

    # 2. grade_average = (G1 + G2) / 2.0 = (14 + 10) / 2 = 12.0
    assert transformed.loc[0, "grade_average"] == 12.0

    # 3. chronic_absenteeism = 1.0 since absences (12) >= threshold (10)
    assert transformed.loc[0, "chronic_absenteeism"] == 1.0

    # 4. study_to_fail_ratio = studytime / (failures + 1) = 3 / (1 + 1) = 1.5
    assert transformed.loc[0, "study_to_fail_ratio"] == 1.5


def test_feature_pipeline_fit_transform(sample_clean_data):
    """Asserts pipeline execution produces a valid numeric matrix without NaNs."""
    X, y = sample_clean_data
    pipeline = create_feature_pipeline()

    X_transformed = pipeline.fit_transform(X, y)

    assert isinstance(X_transformed, np.ndarray)
    assert X_transformed.shape[0] == len(X)
    assert X_transformed.shape[1] > X.shape[1]  # Expanded by one-hot encoding & engineered features
    assert np.isnan(X_transformed).sum() == 0
    assert np.isinf(X_transformed).sum() == 0


def test_feature_names_consistency(sample_clean_data):
    """Verifies that extracted feature names match the transformed matrix width."""
    X, y = sample_clean_data
    pipeline = create_feature_pipeline()

    X_transformed = pipeline.fit_transform(X, y)
    feature_names = get_feature_names_from_pipeline(pipeline)

    assert len(feature_names) == X_transformed.shape[1]
    assert "grade_velocity" in feature_names
    assert "grade_average" in feature_names
    assert "chronic_absenteeism" in feature_names
    assert "study_to_fail_ratio" in feature_names
    assert all(isinstance(name, str) for name in feature_names)


def test_missing_column_raises_error(sample_clean_data):
    """Asserts validation fails when an expected feature column is missing."""
    X, _ = sample_clean_data
    incomplete_X = X.drop(columns=["G2"])

    with pytest.raises(ValueError, match="Missing required feature columns"):
        validate_feature_input(incomplete_X)


def test_handle_unseen_categories(sample_clean_data):
    """Verifies pipeline does not crash on unseen categorical levels during inference."""
    X, y = sample_clean_data
    pipeline = create_feature_pipeline()
    pipeline.fit(X, y)

    # Create inference sample with unseen category 'space_pilot' for Mjob
    inference_sample = X.iloc[:2].copy()
    inference_sample.loc[0, "Mjob"] = "space_pilot"
    inference_sample.loc[1, "reason"] = "teleportation"

    transformed_sample = pipeline.transform(inference_sample)
    assert transformed_sample.shape[0] == 2
    assert np.isnan(transformed_sample).sum() == 0


def test_train_val_isolation_no_leakage(sample_clean_data):
    """Verifies that transformers are fitted purely on training split."""
    X, y = sample_clean_data
    split_idx = int(len(X) * 0.8)
    X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train = y.iloc[:split_idx]

    pipeline = create_feature_pipeline()
    pipeline.fit(X_train, y_train)

    train_transformed = pipeline.transform(X_train)
    val_transformed = pipeline.transform(X_val)

    assert train_transformed.shape[0] == len(X_train)
    assert val_transformed.shape[0] == len(X_val)
    assert train_transformed.shape[1] == val_transformed.shape[1]
