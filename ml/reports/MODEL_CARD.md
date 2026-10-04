# Model Card — EduGuard Student Academic Risk Classifier

## 1. Model Details
- **Model Name**: EduGuard Risk Classifier (Logistic Regression)
- **Model Version**: v1.1.0
- **Model Architecture**: Logistic Regression with tuned hyperparameters `{"C": 0.05, "penalty": "l1"}` integrated with an end-to-end leak-free `ColumnTransformer` feature engineering pipeline (`AcademicFeatureEngineer` + Median Imputation + `StandardScaler` + `OneHotEncoder`).
- **Target Definition**: Binary classification of student academic outcome:
  - **Class 1 (At Risk)**: Final course grade $G3 < 10$ (Universal passing grade threshold in Portuguese secondary education).
  - **Class 0 (Not At Risk)**: Final course grade $G3 \ge 10$.
- **Zero-Leakage Assurance**: The final grade ($G3$) is strictly used as the target derivation source and is excluded completely from input features $X$, transformers, and model inference.
- **Traceability**: Previous baseline artifact `model_v1.joblib` (v1.0.0) is preserved on disk to ensure full backward auditability of legacy predictions.

---

## 2. Model Selection Methodology & Priority Rules

### Decision Hierarchy
In academic early warning systems, **missing a failing student who needs intervention (False Negative) has significantly worse educational consequences than providing proactive support to a passing student (False Positive)**.
Therefore, candidate models were ranked according to:
1. **Primary**: Recall on Class 1 (At Risk) — minimizing false negatives.
2. **Secondary**: F1-Score on Class 1 — ensuring acceptable precision to avoid advisor alert fatigue.
3. **Tertiary**: ROC-AUC — verifying overall class separability across decision thresholds.

### Hyperparameter Tuning (Stratified 5-Fold CV on Training Split ONLY)

> **Integrity Safeguard**: Hyperparameter search (`GridSearchCV`) was executed exclusively on the 80% training split ($N=316$). The 20% test split ($N=79$) remained strictly untouched until final selection. The optimization objective refitted the estimator on **Recall** (Class 1) while recording F1 and ROC-AUC.

| Candidate Model | Tuned Best Hyperparameters | Tuned CV Recall | Tuned CV F1 | Tuned CV ROC-AUC |
| :--- | :--- | :---: | :---: | :---: |
| **Logistic Regression** | `{"C": 0.05, "penalty": "l1"}` | 99.05% (±1.90%) | 79.49% | 97.19% |
| **Random Forest** | `{"max_depth": 3, "min_samples_leaf": 1, "n_estimators": 50}` | 93.33% (±5.71%) | 87.10% | 95.56% |
| **XGBoost** | `{"learning_rate": 0.01, "max_depth": 2, "n_estimators": 50}` | 95.24% (±6.02%) | 88.81% | 96.75% |
| **Support Vector Machine** | `{"C": 0.5, "kernel": "rbf"}` | 96.19% (±4.67%) | 82.53% | 95.70% |

### Honest Comparison: Tuned vs. Untuned Performance

| Model Architecture | Baseline (Untuned) CV Recall | Tuned CV Recall | Baseline CV F1 | Tuned CV F1 | Baseline CV ROC-AUC | Tuned CV ROC-AUC | Net Impact of Recall Optimization |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Logistic Regression** | 95.24% | **99.05%** | 88.03% | 79.49% | 97.36% | 97.19% | Recall gained +3.81% (OOF false negatives reduced from 5 to 1) at the expense of lower precision. |
| **Random Forest** | 93.33% | 93.33% | 87.82% | 87.10% | 96.88% | 95.56% | Regularization slightly simplified trees (depth=3) without improving sensitivity. |
| **XGBoost** | 91.43% | 95.24% | 87.56% | 88.81% | 96.62% | 96.75% | Recall improved +3.81% and F1 improved +1.25% with shallow depth (max_depth=2). |
| **Support Vector Machine (SVM)** | 95.24% (linear) | 96.19% (rbf) | 84.75% | 82.53% | 96.12% | 95.70% | RBF kernel captured additional at-risk students (+0.95% recall) with moderate false alarm increase. |

### Justification for Selected Model (Logistic Regression)
**Logistic Regression** was selected because:
1. It achieved the **highest Recall** (99.05% mean fold, 99.04% pooled OOF), missing only **1** out of 104 at-risk students across all 5 cross-validation folds.
2. Under the strict primary priority (Recall $\to$ F1 $\to$ ROC-AUC), maximizing true positives for early intervention took precedence.
3. Linear decision boundaries yield exact, monotonic SHAP attributions via `shap.LinearExplainer`, maximizing explainability trust for educators without the latency penalty of kernel approximations.

---

## 3. Held-Out Test Set Performance (N = 79)

> **Important**: The test set (20% of data, $N=79$) was strictly held out and untouched during feature exploration, model training, cross-validation, and hyperparameter tuning. It was evaluated only once after the winning architecture was finalized.

| Metric | Held-Out Test Result | Interpretation |
| :--- | :---: | :--- |
| **Recall (Class 1, At Risk)** | **100.00%** | Detected 26 out of 26 at-risk students (0 missed). |
| **Precision (Class 1, At Risk)**| **66.67%** | 26 true risk alerts out of 39 total positive flags (13 false alarms). |
| **F1-Score (Class 1)** | **80.00%** | Harmonic balance between sensitivity and precision on held-out students. |
| **ROC-AUC** | **97.28%** | Excellent ranking discrimination on unseen data. |
| **PR-AUC** | **94.63%** | Precision-Recall curve area on imbalanced test cohort. |
| **Accuracy** | **83.54%** | Overall fraction of correct classifications (66 / 79). |
| **Specificity (Class 0)** | **75.47%** | Correctly identified 40 out of 53 passing students. |
| **Brier Score Loss** | **0.1095** | Measure of mean squared probability calibration error (lower is better). |

### Test Confusion Matrix
```
                     Predicted Not At Risk (0)    Predicted At Risk (1)
Actual Not At Risk (0)          40                          13
Actual At Risk (1)               0                          26
```

---

## 4. Configurable Risk Thresholds & Calibration Validation

### Environment-Backed Threshold Architecture
Decision thresholds are decoupled from model training and managed via environment configuration (`backend/app/core/config.py`):
- `RISK_LOW_MAX`: **0.40** (Scores below this are categorized as **Low Risk**).
- `RISK_HIGH_MIN`: **0.70** (Scores at or above this are categorized as **High Risk**).
- `BINARY_THRESHOLD`: **0.50** (Operational cutoff for the binary `at_risk_binary` flag).
- **Validation Invariant**: The configuration strictly enforces $0.0 \le \text{RISK\_LOW\_MAX} < \text{RISK\_HIGH\_MIN} \le 1.0$ at application startup.

### Reliability Curve & Probability Calibration
The model's probability outputs were verified using an empirical calibration curve (`ml/reports/calibration.png`):
- Across the held-out test cohort, predicted risk probabilities show strong monotonic alignment with observed failure rates.
- The Brier score loss of **0.1095** confirms low probability dispersion.
- Setting `RISK_LOW_MAX=0.40` ensures students with marginal risk are surfaced into the Medium Risk advisory bucket rather than dismissed, while `RISK_HIGH_MIN=0.70` reserves High Risk urgency alerts for students with unambiguous failure signals.

---

## 5. Explainability Architecture & Computational Speed Cost

EduGuard's explainability engine (`EduGuardExplainer`) employs a polymorphic design that dynamically matches explainer algorithms to model families:
1. **Linear Models (`Logistic Regression`, Linear SVM)**:
   - **Explainer**: `shap.LinearExplainer`.
   - **Properties**: Exact, analytic Shapley attribution on the log-odds scale.
   - **Inference Latency**: **~0.2 ms (0.0002s)** per student. Highly efficient for real-time and bulk uploads.
2. **Tree Models (`Random Forest`, `XGBoost`)**:
   - **Explainer**: `shap.TreeExplainer`.
   - **Properties**: Tree path feature attribution.
   - **Inference Latency**: **~1 ms (0.001s)** per student.
3. **Non-Linear Kernel Models (RBF SVM)**:
   - **Explainer**: `shap.KernelExplainer` (used only as a last resort).
   - **Speed Cost Warning**: Kernel SHAP evaluates combinatorial background permutations, requiring **~1.5 to 2.5 seconds per student**. In a 100-student batch upload, Kernel SHAP would require over 3 minutes of compute, violating the sub-2s PRD non-functional requirement.

---

## 6. Intended Use & Educational Scope

### Primary Intended Use
- **Advisory Early Warning**: Designed solely as an institutional decision-support tool for academic advisors, counselors, and faculty to identify students in Mathematics courses who may benefit from tutoring, mentoring, or remedial study sessions before the final examination.
- **Mid-Term Intervention Point**: Executed after the release of Period 2 assessment scores ($G2$), synthesizing academic momentum ($\Delta G = G2 - G1$), attendance, and historical resilience signals.

### Non-Goals (Strict Prohibitions)
- **NO Autonomous Grading or Pass/Fail Decisions**: The model does not award grades, enforce course retention, or dictate academic standing.
- **NO Punitive Action**: Predictions must never be used to penalize, disenroll, or stigmatize students.
- **NO Mental Health or Medical Diagnosis**: Lifestyle and family fields are sociological indicators from the research dataset, not clinical health diagnostics.
- **NO Automated Interventions**: Every flagged student must be reviewed by a human faculty member or academic advisor.

---

## 7. Tradeoff Analysis: False Positives vs. False Negatives

- **False Negative (FN) Impact (Cost: HIGH)**:
  - An at-risk student is classified as "Not At Risk".
  - *Consequence*: The student receives no early warning, no academic coaching, and fails the course at final examination.
  - *Mitigation*: The model was selected specifically for high sensitivity/recall (100.00% on test set), keeping FNs to an absolute minimum (0 student on test set).
- **False Positive (FP) Impact (Cost: MODERATE)**:
  - A passing student is classified as "At Risk".
  - *Consequence*: Advisor conducts a brief check-in; student is invited to extra tutoring or study sessions that they may not strictly need. While this incurs advisor time, it does not harm the student academically.
  - *Mitigation*: Precision is monitored (66.67% on test set) to prevent advisor fatigue.

---

## 8. Dataset Limitations & Caveats

1. **Small Sample Size ($N = 395$)**:
   - The dataset consists of 395 students from two secondary schools in the Alentejo region of Portugal, surveyed in 2008.
   - Sample sizes in smaller sub-categories (e.g. students with $>20$ absences or specific parental occupations) are limited.
2. **Domain & Subject Specificity**:
   - The current model is trained exclusively on secondary school Mathematics performance. Findings may not generalize directly to higher-education engineering, humanities, or language courses without retraining and re-calibration.
3. **Temporal Drift**:
   - Data collected in 2008 does not account for modern digital learning environments, LMS telemetries (e.g. Canvas/Moodle interactions), or remote instruction dynamics.
4. **Heuristic Project Assumptions**:
   - The chronic absenteeism indicator ($\\text{absences} \\ge 10$) is an EduGuard project-defined heuristic assumption, not an immutable institutional standard.
5. **Class Imbalance**:
   - 32.91% of students are at risk. Class weighting was applied to prevent majority-class bias.

---

## 9. Ethical Considerations & Human-in-the-Loop Protocol

1. **Human-in-the-Loop Requirement**:
   - All predictions and SHAP factor explanations must be interpreted by trained academic staff who understand the student's broader personal context.
2. **Transparent Explanations**:
   - No prediction is surfaced as a standalone number. Every inference is accompanied by top SHAP feature attribution factors explaining *why* the student was flagged.
3. **Data Privacy**:
   - Personal demographic attributes must be protected under applicable educational privacy laws (e.g. FERPA / GDPR).

---

## 10. Experimental Status Disclaimer

> **DISCLAIMER**:
> This model is an **educational research and early-warning prototype** developed as part of the EduGuard system.
> The reported cross-validation and test metrics demonstrate strong predictive capability on the benchmark UCI Student Performance dataset under experimental conditions.
> **This model is NOT claimed to be universally production-ready for live, unmonitored student interventions across other academic institutions without local domain calibration, data privacy verification, and formal institutional ethical approval.**
