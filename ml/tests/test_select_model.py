"""Unit tests for EduGuard model selection, test evaluation, and model card generation."""

from pathlib import Path
import json
import pytest

from ml.select_model import select_best_model, evaluate_on_test_set


def test_select_best_model_priority_logic():
    """Asserts that selection follows the approved priority hierarchy: Recall > F1 > ROC-AUC."""
    info = select_best_model()

    assert info["selected_model_name"] == "Logistic Regression"
    assert "mean_fold_metrics" in info
    assert "pooled_oof_metrics" in info

    mean_metrics = info["mean_fold_metrics"]
    assert mean_metrics["recall"] > 0.90
    assert mean_metrics["f1"] > 0.85

    oof = info["pooled_oof_metrics"]
    cm = oof["confusion_matrix"]
    assert cm["tp"] + cm["fn"] + cm["fp"] + cm["tn"] == 316
    assert cm["tp"] == 99
    assert cm["fn"] == 5
    assert cm["fp"] == 22
    assert cm["tn"] == 190


def test_test_evaluation_artifacts_exist():
    """Verifies that test evaluation produces valid metrics and confusion matrix artifacts."""
    metrics_path = Path("ml/reports/selected_model_test_metrics.json")
    cm_plot_path = Path("ml/reports/test_confusion_matrix.png")

    assert metrics_path.exists(), "selected_model_test_metrics.json missing"
    assert cm_plot_path.exists(), "test_confusion_matrix.png missing"
    assert cm_plot_path.stat().st_size > 1000

    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    assert metrics["model"] == "Logistic Regression"
    assert metrics["test_samples"] == 79
    assert metrics["at_risk_samples"] == 26
    assert metrics["not_at_risk_samples"] == 53

    # Check metrics validity
    assert 0.80 <= metrics["recall"] <= 1.0
    assert 0.70 <= metrics["precision"] <= 1.0
    assert 0.80 <= metrics["f1"] <= 1.0
    assert 0.90 <= metrics["roc_auc"] <= 1.0
    assert 0.80 <= metrics["accuracy"] <= 1.0

    cm = metrics["confusion_matrix"]
    assert cm["tp"] + cm["fn"] + cm["fp"] + cm["tn"] == 79


def test_model_card_completeness_and_ethics():
    """Verifies that MODEL_CARD.md contains all required ethical guardrails and limitations."""
    card_path = Path("ml/reports/MODEL_CARD.md")
    assert card_path.exists(), "MODEL_CARD.md missing"

    content = card_path.read_text(encoding="utf-8")

    # Architecture and Metrics
    assert "Logistic Regression" in content
    assert "Held-Out Test Set Performance" in content
    assert "Confusion Matrix" in content

    # Non-Goals & Prohibitions
    assert "NO Autonomous Grading" in content
    assert "NO Punitive Action" in content
    assert "Human-in-the-Loop" in content

    # Limitations & Honest Disclaimers
    assert "Small Sample Size" in content
    assert "2008" in content
    assert "DISCLAIMER" in content
    assert "NOT claimed to be universally production-ready" in content
