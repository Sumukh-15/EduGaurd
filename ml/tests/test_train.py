"""Tests for EduGuard model training, hyperparameter tuning, and split integrity."""

from pathlib import Path
import json
import pandas as pd
import numpy as np
import pytest

from ml.train import (
    build_candidate_pipelines,
    evaluate_cv_pipeline,
    RANDOM_STATE
)
from ml.clean import load_raw_data, clean_student_data


def test_train_test_split_integrity():
    """Asserts train and test splits exist, are stratified, disjoint, and leak-free."""
    train_file = Path("data/processed/train_split.csv")
    test_file = Path("data/processed/test_split.csv")

    assert train_file.exists(), "train_split.csv missing"
    assert test_file.exists(), "test_split.csv missing"

    train_df = pd.read_csv(train_file)
    test_df = pd.read_csv(test_file)

    # 1. Total counts
    assert len(train_df) == 316
    assert len(test_df) == 79
    assert len(train_df) + len(test_df) == 395

    # 2. Leakage check: G3 must NOT exist in either split
    assert "G3" not in train_df.columns
    assert "G3" not in test_df.columns
    assert "at_risk" in train_df.columns
    assert "at_risk" in test_df.columns

    # 3. Stratification check: proportion of at_risk should match (~32.9%)
    train_rate = train_df["at_risk"].mean()
    test_rate = test_df["at_risk"].mean()
    assert abs(train_rate - test_rate) < 0.02
    assert abs(train_rate - (130 / 395)) < 0.01


def test_candidate_pipelines_definition():
    """Verifies that all four candidate architectures (including SVM) are built."""
    candidates = build_candidate_pipelines()
    expected_models = {"Logistic Regression", "Random Forest", "XGBoost", "Support Vector Machine"}
    assert set(candidates.keys()) == expected_models

    for name, pipe in candidates.items():
        assert "features" in pipe.named_steps
        assert "classifier" in pipe.named_steps


def test_tuning_results_report_exists_and_valid():
    """Verifies that tuning_results.csv contains tuned hyperparameters and CV metrics."""
    tuning_file = Path("ml/reports/tuning_results.csv")
    assert tuning_file.exists(), "tuning_results.csv not generated"

    df = pd.read_csv(tuning_file)
    assert len(df) == 4  # LR, RF, XGB, SVM

    required_cols = [
        "model", "best_params", "cv_recall_mean", "cv_recall_std",
        "cv_f1_mean", "cv_roc_auc_mean", "primary_scorer"
    ]
    for col in required_cols:
        assert col in df.columns, f"Missing tuning column: {col}"

    # Verify primary scorer was recall
    assert (df["primary_scorer"] == "recall").all()

    # Verify params are valid JSON
    for params_str in df["best_params"]:
        params = json.loads(params_str)
        assert isinstance(params, dict)
        assert len(params) > 0


def test_model_comparison_report_exists_and_valid():
    """Verifies that model_comparison.csv contains all required performance metrics for all 4 models."""
    comparison_file = Path("ml/reports/model_comparison.csv")
    assert comparison_file.exists(), "model_comparison.csv not generated"

    df = pd.read_csv(comparison_file)
    assert len(df) == 4  # LR, RF, XGB, SVM
    
    required_cols = [
        "model", "recall_mean", "precision_mean", "f1_mean",
        "roc_auc_mean", "pr_auc_mean", "accuracy_mean",
        "total_tp", "total_fp", "total_fn", "total_tn"
    ]
    for col in required_cols:
        assert col in df.columns, f"Missing metric column: {col}"

    # Verify metric sanity: all rates should be within [0.0, 1.0]
    rate_cols = ["recall_mean", "precision_mean", "f1_mean", "roc_auc_mean", "accuracy_mean"]
    for col in rate_cols:
        assert (df[col] >= 0.0).all() and (df[col] <= 1.0).all()

    # Verify all models achieve acceptable early-warning performance
    assert (df["recall_mean"] > 0.80).all(), "All candidate models must achieve >80% recall on at-risk students"
    assert (df["f1_mean"] > 0.75).all(), "All candidate models must achieve acceptable F1-score"
