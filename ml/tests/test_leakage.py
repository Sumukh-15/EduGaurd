"""Strict anti-leakage test suite for EduGuard.

Ensures that the final grade (G3) never leaks into the feature set at any stage
of the data loading, cleaning, feature engineering, or model input pipeline.
"""

from pathlib import Path
import pandas as pd
import pytest

from ml.clean import load_raw_data, clean_student_data, get_clean_dataset
from ml.features import (
    AcademicFeatureEngineer,
    create_feature_pipeline,
    validate_feature_input,
    EXPECTED_INPUT_COLUMNS
)


def test_raw_data_contains_g3():
    """Confirms the raw UCI dataset has G3 as the outcome source."""
    raw_df = load_raw_data()
    assert "G3" in raw_df.columns
    assert len(raw_df) == 395


def test_clean_student_data_drops_g3():
    """Strict assertion: clean_student_data drops G3 from feature matrix X."""
    raw_df = load_raw_data()
    X, y = clean_student_data(raw_df)

    assert "G3" not in X.columns
    assert "G3" not in list(X.columns)
    assert "at_risk" not in X.columns
    assert y.name == "at_risk"
    assert len(X.columns) == 32
    assert len(y) == len(X)
    
    # Confirm at_risk target is correctly computed from G3 < 10
    expected_target = (pd.to_numeric(raw_df["G3"]) < 10).astype(int)
    pd.testing.assert_series_equal(y, expected_target, check_names=False)


def test_feature_validator_rejects_g3():
    """Asserts that validate_feature_input immediately flags G3 with an explicit error."""
    raw_df = load_raw_data()
    with pytest.raises(ValueError, match="CRITICAL LEAKAGE DETECTED"):
        validate_feature_input(raw_df)


def test_feature_engineer_transformer_rejects_g3():
    """Asserts that AcademicFeatureEngineer raises ValueError if G3 is passed."""
    raw_df = load_raw_data()
    transformer = AcademicFeatureEngineer()
    
    with pytest.raises(ValueError, match="CRITICAL LEAKAGE DETECTED"):
        transformer.fit(raw_df)

    with pytest.raises(ValueError, match="CRITICAL LEAKAGE DETECTED"):
        transformer.transform(raw_df)


def test_feature_pipeline_rejects_g3():
    """Asserts that the complete feature pipeline refuses to process data containing G3."""
    raw_df = load_raw_data()
    pipeline = create_feature_pipeline()
    
    with pytest.raises(ValueError, match="CRITICAL LEAKAGE DETECTED"):
        pipeline.fit(raw_df)


def test_processed_file_zero_leakage():
    """If data/processed/student_clean.csv exists, assert G3 is completely absent."""
    clean_csv = Path("data/processed/student_clean.csv")
    if clean_csv.exists():
        df = pd.read_csv(clean_csv)
        assert "G3" not in df.columns, "G3 was detected in data/processed/student_clean.csv!"
        assert "at_risk" in df.columns
