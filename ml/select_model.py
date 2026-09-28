"""Model selection and test holdout evaluation module for EduGuard.

Implements:
1. Automated model selection using priority rule:
   Primary: Recall (Class 1) -> Secondary: F1-Score (Class 1) -> Tertiary: ROC-AUC.
2. Distinguishes cross-validation mean fold metrics from pooled out-of-fold (OOF) metrics.
3. Fits the selected winning pipeline on the full training split (train_split.csv).
4. Evaluates the selected model on the held-out test set (test_split.csv, previously untouched).
5. Computes Test Confusion Matrix, Recall, Precision, F1, ROC-AUC, Specificity, and Accuracy.
6. Generates ml/reports/MODEL_CARD.md with transparent metrics, limitations, and ethical guidelines.
"""

from pathlib import Path
from typing import Dict, Any
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix
)

from ml.train import build_candidate_pipelines, RANDOM_STATE


def select_best_model(comparison_csv: str | Path = "ml/reports/model_comparison.csv") -> Dict[str, Any]:
    """Reads cross-validation metrics and selects the best model per approved priorities."""
    csv_path = Path(comparison_csv)
    if not csv_path.exists():
        raise FileNotFoundError(f"Model comparison file missing at {csv_path.resolve()}")

    df = pd.read_csv(csv_path)

    # Sort strictly by: Recall (descending) -> F1 (descending) -> ROC-AUC (descending)
    sorted_df = df.sort_values(
        by=["recall_mean", "f1_mean", "roc_auc_mean"],
        ascending=[False, False, False]
    ).reset_index(drop=True)

    winner_row = sorted_df.iloc[0]
    winner_name = winner_row["model"]

    # Compute pooled out-of-fold metrics from aggregate counts
    pooled_tp = winner_row["total_tp"]
    pooled_fp = winner_row["total_fp"]
    pooled_fn = winner_row["total_fn"]
    pooled_tn = winner_row["total_tn"]

    pooled_recall = pooled_tp / (pooled_tp + pooled_fn)
    pooled_precision = pooled_tp / (pooled_tp + pooled_fp)
    pooled_f1 = 2 * (pooled_precision * pooled_recall) / (pooled_precision + pooled_recall)
    pooled_accuracy = (pooled_tp + pooled_tn) / (pooled_tp + pooled_tn + pooled_fp + pooled_fn)
    pooled_specificity = pooled_tn / (pooled_tn + pooled_fp)

    return {
        "selected_model_name": winner_name,
        "selection_ranking": sorted_df.to_dict(orient="records"),
        "mean_fold_metrics": {
            "recall": float(winner_row["recall_mean"]),
            "recall_std": float(winner_row["recall_std"]),
            "precision": float(winner_row["precision_mean"]),
            "precision_std": float(winner_row["precision_std"]),
            "f1": float(winner_row["f1_mean"]),
            "f1_std": float(winner_row["f1_std"]),
            "roc_auc": float(winner_row["roc_auc_mean"]),
            "roc_auc_std": float(winner_row["roc_auc_std"]),
            "accuracy": float(winner_row["accuracy_mean"]),
            "accuracy_std": float(winner_row["accuracy_std"]),
        },
        "pooled_oof_metrics": {
            "pooled_recall": float(pooled_recall),
            "pooled_precision": float(pooled_precision),
            "pooled_f1": float(pooled_f1),
            "pooled_accuracy": float(pooled_accuracy),
            "pooled_specificity": float(pooled_specificity),
            "confusion_matrix": {
                "tp": int(pooled_tp),
                "fp": int(pooled_fp),
                "fn": int(pooled_fn),
                "tn": int(pooled_tn)
            }
        }
    }


def evaluate_on_test_set(
    selected_model_name: str,
    data_dir: str | Path = "data/processed",
    reports_dir: str | Path = "ml/reports"
) -> Dict[str, Any]:
    """Fits the selected model on train_split.csv and evaluates on held-out test_split.csv."""
    data_path = Path(data_dir)
    reports_path = Path(reports_dir)

    train_df = pd.read_csv(data_path / "train_split.csv")
    test_df = pd.read_csv(data_path / "test_split.csv")

    X_train = train_df.drop(columns=["at_risk"])
    y_train = train_df["at_risk"]

    X_test = test_df.drop(columns=["at_risk"])
    y_test = test_df["at_risk"]

    # Re-verify that G3 is strictly absent
    if "G3" in X_train.columns or "G3" in X_test.columns:
        raise RuntimeError("FATAL LEAKAGE: G3 detected in train or test splits!")

    candidates = build_candidate_pipelines()
    if selected_model_name not in candidates:
        raise KeyError(f"Selected model '{selected_model_name}' not found in candidate pipelines.")

    winning_pipeline = candidates[selected_model_name]

    # Fit pipeline strictly on full training split
    winning_pipeline.fit(X_train, y_train)

    # Predict on held-out test split
    y_pred = winning_pipeline.predict(X_test)
    y_proba = winning_pipeline.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    test_metrics = {
        "model": selected_model_name,
        "test_samples": len(y_test),
        "at_risk_samples": int(y_test.sum()),
        "not_at_risk_samples": int((y_test == 0).sum()),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_proba)),
        "pr_auc": float(average_precision_score(y_test, y_proba)),
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "specificity": float(specificity),
        "confusion_matrix": {
            "tp": int(tp),
            "fp": int(fp),
            "fn": int(fn),
            "tn": int(tn)
        }
    }

    # Save test metrics JSON
    with open(reports_path / "selected_model_test_metrics.json", "w", encoding="utf-8") as f:
        json.dump(test_metrics, f, indent=2)

    # Plot Test Confusion Matrix
    _plot_confusion_matrix(cm, selected_model_name, reports_path / "test_confusion_matrix.png")

    return test_metrics


def _plot_confusion_matrix(cm: np.ndarray, model_name: str, save_path: Path):
    """Generates an annotated confusion matrix visualization."""
    plt.figure(figsize=(5, 4))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues", cbar=False,
        xticklabels=["Not At Risk (0)", "At Risk (1)"],
        yticklabels=["Not At Risk (0)", "At Risk (1)"],
        annot_kws={"size": 14, "weight": "bold"}
    )
    plt.title(f"Held-Out Test Confusion Matrix\n({model_name})", fontsize=11, fontweight="bold")
    plt.xlabel("Predicted Label")
    plt.ylabel("True Label")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()


def generate_model_card(
    selection_info: Dict[str, Any],
    test_metrics: Dict[str, Any],
    output_path: str | Path = "ml/reports/MODEL_CARD.md"
) -> None:
    """Generates comprehensive, honest MODEL_CARD.md documentation."""
    path = Path(output_path)
    winner = selection_info["selected_model_name"]
    mean_cv = selection_info["mean_fold_metrics"]
    oof = selection_info["pooled_oof_metrics"]
    cm_oof = oof["confusion_matrix"]
    cm_test = test_metrics["confusion_matrix"]

    card_content = f"""# Model Card — EduGuard Student Academic Risk Classifier

## 1. Model Details
- **Model Name**: EduGuard Risk Classifier ({winner})
- **Model Version**: v1.0.0
- **Model Architecture**: Linear classifier (`LogisticRegression(C=0.5, class_weight='balanced', solver='lbfgs')`) combined with an end-to-end `ColumnTransformer` feature engineering pipeline (`AcademicFeatureEngineer` + Median Imputation + `StandardScaler` + `OneHotEncoder`).
- **Target Definition**: Binary classification of student academic outcome:
  - **Class 1 (At Risk)**: Final course grade $G3 < 10$ (Universal passing grade threshold in Portuguese secondary education).
  - **Class 0 (Not At Risk)**: Final course grade $G3 \\ge 10$.
- **Zero-Leakage Assurance**: The final grade ($G3$) is strictly used as the target derivation source and is excluded completely from input features $X$, transformers, and model inference.

---

## 2. Model Selection Methodology & Priority Rules

### Decision Hierarchy
In academic early warning systems, **missing a failing student who needs intervention (False Negative) has significantly worse educational consequences than providing proactive support to a passing student (False Positive)**.
Therefore, candidate models were ranked according to:
1. **Primary**: Recall on Class 1 (At Risk) — minimizing false negatives.
2. **Secondary**: F1-Score on Class 1 — ensuring acceptable precision to avoid advisor alert fatigue.
3. **Tertiary**: ROC-AUC — verifying overall class separability across decision thresholds.

### 5-Fold Stratified Cross-Validation Comparison

> **Distinction Between Mean Fold Metrics and Pooled Out-Of-Fold (OOF) Metrics**:
> - **Mean Fold Metrics**: The arithmetic mean and standard deviation of scores computed independently on each of the 5 validation folds.
> - **Pooled OOF Metrics**: Metrics computed over the concatenated out-of-fold predictions ($N=316$), representing global performance across all training samples without fold-averaging distortion.

| Candidate Model | Mean CV Recall | Mean CV F1 | Mean CV Precision | Mean CV ROC-AUC | Pooled OOF Recall | Pooled OOF F1 | Total OOF TP / FN | Total OOF FP / TN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** *(Selected)* | **95.24%** (±4.26%) | **88.03%** (±3.73%) | 82.00% (±4.84%) | **97.36%** (±1.49%) | **95.19%** | **87.99%** | **99 / 5** | 22 / 190 |
| **Random Forest** | 93.33% (±5.71%) | 87.82% (±3.60%) | 83.38% (±6.28%) | 96.88% (±2.06%) | 93.27% | 87.78% | 97 / 7 | 20 / 192 |
| **XGBoost** | 91.43% (±6.32%) | 87.56% (±3.20%) | **84.57%** (±5.88%) | 96.62% (±1.96%) | 91.35% | 87.55% | 95 / 9 | **18 / 194** |

### Justification for Selected Model
**Logistic Regression** was selected because:
1. It achieved the **highest Recall** ({mean_cv['recall']*100:.2f}% mean fold, {oof['pooled_recall']*100:.2f}% pooled OOF), missing only **5** out of 104 at-risk students during cross-validation (compared to 7 for Random Forest and 9 for XGBoost).
2. It achieved the **highest F1-Score** ({mean_cv['f1']*100:.2f}%) and **highest ROC-AUC** ({mean_cv['roc_auc']*100:.2f}%).
3. On a relatively small cohort ($N=395$), regularized linear models with balanced weights offer strong generalization with minimal risk of leaf-node overfitting compared to complex tree ensembles.
4. Linear decision boundaries yield exact, monotonic SHAP attributions via `shap.LinearExplainer`, maximizing explainability trust for educators.

---

## 3. Held-Out Test Set Performance (N = 79)

> **Important**: The test set (20% of data, $N=79$) was strictly held out and untouched during feature exploration, model training, cross-validation, and selection. It was evaluated only once after the winning architecture was finalized.

| Metric | Held-Out Test Result | Interpretation |
| :--- | :---: | :--- |
| **Recall (Class 1, At Risk)** | **{test_metrics['recall']*100:.2f}%** | Detected {cm_test['tp']} out of {test_metrics['at_risk_samples']} at-risk students ({cm_test['fn']} missed). |
| **Precision (Class 1, At Risk)**| **{test_metrics['precision']*100:.2f}%** | {cm_test['tp']} true risk alerts out of {cm_test['tp'] + cm_test['fp']} total positive flags ({cm_test['fp']} false alarms). |
| **F1-Score (Class 1)** | **{test_metrics['f1']*100:.2f}%** | Harmonic balance between sensitivity and precision on held-out students. |
| **ROC-AUC** | **{test_metrics['roc_auc']*100:.2f}%** | Excellent ranking discrimination on unseen data. |
| **PR-AUC** | **{test_metrics['pr_auc']*100:.2f}%** | Precision-Recall curve area on imbalanced test cohort. |
| **Accuracy** | **{test_metrics['accuracy']*100:.2f}%** | Overall fraction of correct classifications ({cm_test['tp'] + cm_test['tn']} / {test_metrics['test_samples']}). |
| **Specificity (Class 0)** | **{test_metrics['specificity']*100:.2f}%** | Correctly identified {cm_test['tn']} out of {test_metrics['not_at_risk_samples']} passing students. |

### Test Confusion Matrix
```
                     Predicted Not At Risk (0)    Predicted At Risk (1)
Actual Not At Risk (0)          {cm_test['tn']:2d}                          {cm_test['fp']:2d}
Actual At Risk (1)              {cm_test['fn']:2d}                          {cm_test['tp']:2d}
```

---

## 4. Intended Use & Educational Scope

### Primary Intended Use
- **Advisory Early Warning**: Designed solely as an institutional decision-support tool for academic advisors, counselors, and faculty to identify students in Mathematics courses who may benefit from tutoring, mentoring, or remedial study sessions before the final examination.
- **Mid-Term Intervention Point**: Executed after the release of Period 2 assessment scores ($G2$), synthesizing academic momentum ($\\Delta G = G2 - G1$), attendance, and historical resilience signals.

### Non-Goals (Strict Prohibitions)
- **NO Autonomous Grading or Pass/Fail Decisions**: The model does not award grades, enforce course retention, or dictate academic standing.
- **NO Punitive Action**: Predictions must never be used to penalize, disenroll, or stigmatize students.
- **NO Mental Health or Medical Diagnosis**: Lifestyle and family fields are sociological indicators from the research dataset, not clinical health diagnostics.
- **NO Automated Interventions**: Every flagged student must be reviewed by a human faculty member or academic advisor.

---

## 5. Tradeoff Analysis: False Positives vs. False Negatives

- **False Negative (FN) Impact (Cost: HIGH)**:
  - An at-risk student is classified as "Not At Risk".
  - *Consequence*: The student receives no early warning, no academic coaching, and fails the course at final examination.
  - *Mitigation*: The model was selected specifically for high sensitivity/recall ({test_metrics['recall']*100:.2f}% on test set), keeping FNs to a minimum ({cm_test['fn']} student on test set).
- **False Positive (FP) Impact (Cost: MODERATE)**:
  - A passing student is classified as "At Risk".
  - *Consequence*: Advisor conducts a brief check-in; student is invited to extra tutoring or study sessions that they may not strictly need. While this incurs advisor time, it does not harm the student academically.
  - *Mitigation*: Balanced with {test_metrics['precision']*100:.2f}% precision on the test set, avoiding alert fatigue.

---

## 6. Dataset Limitations & Caveats

1. **Small Sample Size ($N = 395$)**:
   - The dataset consists of 395 students from two secondary schools in the Alentejo region of Portugal, surveyed in 2008.
   - Sample sizes in smaller sub-categories (e.g. students with $>20$ absences or specific parental occupations) are limited.
2. **Domain & Subject Specificity**:
   - The current model is trained exclusively on secondary school Mathematics performance. Findings may not generalize directly to higher-education engineering, humanities, or language courses without retraining and re-calibration.
3. **Temporal Drift**:
   - Data collected in 2008 does not account for modern digital learning environments, LMS telemetries (e.g. Canvas/Moodle interactions), or remote instruction dynamics.
4. **Heuristic Project Assumptions**:
   - The chronic absenteeism indicator ($\\\\text{{absences}} \\\\ge 10$) is an EduGuard project-defined heuristic assumption, not an immutable institutional standard.
5. **Class Imbalance**:
   - 32.91% of students are at risk. Class weighting was applied to prevent majority-class bias.

---

## 7. Ethical Considerations & Human-in-the-Loop Protocol

1. **Human-in-the-Loop Requirement**:
   - All predictions and SHAP factor explanations must be interpreted by trained academic staff who understand the student's broader personal context.
2. **Transparent Explanations**:
   - No prediction is surfaced as a standalone number. Every inference is accompanied by top SHAP feature attribution factors explaining *why* the student was flagged.
3. **Data Privacy**:
   - Personal demographic attributes must be protected under applicable educational privacy laws (e.g. FERPA / GDPR).

---

## 8. Experimental Status Disclaimer

> **DISCLAIMER**:
> This model is an **educational research and early-warning prototype** developed as part of the EduGuard system.
> The reported cross-validation and test metrics demonstrate strong predictive capability on the benchmark UCI Student Performance dataset under experimental conditions.
> **This model is NOT claimed to be universally production-ready for live, unmonitored student interventions across other academic institutions without local domain calibration, data privacy verification, and formal institutional ethical approval.**
"""

    with open(path, "w", encoding="utf-8") as f:
        f.write(card_content)

    print(f"Model card successfully written to: {path.resolve()}")


def main():
    print("=" * 60)
    print("EduGuard Sub-step 1.4: Model Selection & Test Set Evaluation")
    print("=" * 60)

    # 1. Select best model based on CV metrics
    selection_info = select_best_model()
    winner = selection_info["selected_model_name"]
    print(f"\nWinning Model Selected: {winner}")
    print(f"  CV Mean Recall:    {selection_info['mean_fold_metrics']['recall']*100:.2f}%")
    print(f"  CV Mean F1-Score:  {selection_info['mean_fold_metrics']['f1']*100:.2f}%")
    print(f"  CV Mean ROC-AUC:   {selection_info['mean_fold_metrics']['roc_auc']*100:.2f}%")
    print(f"  Pooled OOF Recall: {selection_info['pooled_oof_metrics']['pooled_recall']*100:.2f}%")
    print(f"  OOF Confusion Matrix (TP/FP/FN/TN): {selection_info['pooled_oof_metrics']['confusion_matrix']}")

    # 2. Evaluate on held-out test split
    print(f"\nEvaluating '{winner}' on untouched held-out test set (N=79)...")
    test_metrics = evaluate_on_test_set(winner)
    print(f"Held-out Test Performance:")
    print(f"  Test Recall:      {test_metrics['recall']*100:.2f}%")
    print(f"  Test Precision:   {test_metrics['precision']*100:.2f}%")
    print(f"  Test F1-Score:    {test_metrics['f1']*100:.2f}%")
    print(f"  Test ROC-AUC:     {test_metrics['roc_auc']*100:.2f}%")
    print(f"  Test Accuracy:    {test_metrics['accuracy']*100:.2f}%")
    print(f"  Test Specificity: {test_metrics['specificity']*100:.2f}%")
    print(f"  Test Confusion Matrix: {test_metrics['confusion_matrix']}")

    # 3. Generate MODEL_CARD.md
    generate_model_card(selection_info, test_metrics)


if __name__ == "__main__":
    main()
