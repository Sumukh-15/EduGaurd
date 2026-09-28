"""Unit tests for EduGuard SHAP explainability wrapper."""

from pathlib import Path
import pandas as pd
import pytest

from ml.explain import EduGuardExplainer, NON_CAUSAL_DISCLAIMER
from ml.clean import load_raw_data, clean_student_data


@pytest.fixture(scope="module")
def explainer():
    """Initializes EduGuardExplainer once for test module."""
    return EduGuardExplainer()


@pytest.fixture
def sample_student_dict():
    """Provides a valid raw student record dictionary."""
    train_df = pd.read_csv("data/processed/train_split.csv")
    return train_df.iloc[0].drop("at_risk").to_dict()


def test_explain_instance_output_schema(explainer, sample_student_dict):
    """Verifies output format, metric ranges, and factor fields of local explanations."""
    result = explainer.explain_instance(sample_student_dict, top_k=5)

    assert "predicted_risk_level" in result
    assert result["predicted_risk_level"] in ["Low", "Medium", "High"]
    assert 0.0 <= result["risk_probability"] <= 1.0
    assert "base_log_odds" in result
    assert "causal_disclaimer" in result
    assert NON_CAUSAL_DISCLAIMER in result["causal_disclaimer"]

    top_factors = result["top_factors"]
    assert len(top_factors) == 5
    for factor in top_factors:
        assert "feature" in factor
        assert "display_name" in factor
        assert "contribution" in factor
        assert "direction" in factor
        assert factor["direction"] in ["increases_risk", "decreases_risk"]
        assert "raw_value" in factor
        assert "interpretation" in factor


def test_explainer_rejects_g3_leakage(explainer, sample_student_dict):
    """Asserts that explainer raises ValueError if G3 is passed in the student payload."""
    leaked_student = sample_student_dict.copy()
    leaked_student["G3"] = 14

    with pytest.raises(ValueError, match="CRITICAL LEAKAGE DETECTED"):
        explainer.explain_instance(leaked_student)


def test_explainer_rejects_missing_features(explainer, sample_student_dict):
    """Asserts that explainer raises ValueError if required features are missing."""
    incomplete_student = sample_student_dict.copy()
    del incomplete_student["G2"]

    with pytest.raises(ValueError, match="Missing required feature columns"):
        explainer.explain_instance(incomplete_student)


def test_feature_names_ordering_matches_pipeline(explainer):
    """Verifies that explainer feature names strictly match model pipeline output columns."""
    assert len(explainer.feature_names) == explainer.X_background_trans.shape[1]
    assert "grade_average" in explainer.feature_names
    assert "G2" in explainer.feature_names
    assert "absences" in explainer.feature_names


def test_input_data_types_flexibility(explainer, sample_student_dict):
    """Verifies explainer accepts dict, pd.Series, and single-row pd.DataFrame."""
    # Dict
    res_dict = explainer.explain_instance(sample_student_dict)
    
    # Series
    series_input = pd.Series(sample_student_dict)
    res_series = explainer.explain_instance(series_input)

    # DataFrame
    df_input = pd.DataFrame([sample_student_dict])
    res_df = explainer.explain_instance(df_input)

    assert res_dict["predicted_risk_level"] == res_series["predicted_risk_level"] == res_df["predicted_risk_level"]
    assert abs(res_dict["risk_probability"] - res_series["risk_probability"]) < 1e-4
    assert abs(res_dict["risk_probability"] - res_df["risk_probability"]) < 1e-4


def test_global_summary_artifacts_generated(explainer):
    """Verifies global SHAP explanation outputs summary table and plot."""
    df_global = explainer.explain_global_summary()

    assert isinstance(df_global, pd.DataFrame)
    assert len(df_global) == len(explainer.feature_names)
    assert "feature" in df_global.columns
    assert "mean_abs_shap" in df_global.columns

    csv_path = Path("ml/reports/shap_global_summary.csv")
    plot_path = Path("ml/reports/shap_summary_plot.png")
    assert csv_path.exists()
    assert plot_path.exists()
    assert plot_path.stat().st_size > 1000
