# Model Card — EduGuard Student Academic Risk Classifier

## 1. Model Details
- **Model Name**: EduGuard Risk Classifier (Logistic Regression)
- **Model Version**: v1.0.0
- **Model Architecture**: Linear classifier (`LogisticRegression(C=0.5, class_weight='balanced', solver='lbfgs')`) combined with an end-to-end `ColumnTransformer` feature engineering pipeline (`AcademicFeatureEngineer` + Median Imputation + `StandardScaler` + `OneHotEncoder`).
- **Target Definition**: Binary classification of student academic outcome:
  - **Class 1 (At Risk)**: Final course grade $G3 < 10$ (Universal passing grade threshold in Portuguese secondary education).
  - **Class 0 (Not At Risk)**: Final course grade $G3 \ge 10$.
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
1. It achieved the **highest Recall** (95.24% mean fold, 95.19% pooled OOF), missing only **5** out of 104 at-risk students during cross-validation (compared to 7 for Random Forest and 9 for XGBoost).
2. It achieved the **highest F1-Score** (88.03%) and **highest ROC-AUC** (97.36%).
3. On a relatively small cohort ($N=395$), regularized linear models with balanced weights offer strong generalization with minimal risk of leaf-node overfitting compared to complex tree ensembles.
4. Linear decision boundaries yield exact, monotonic SHAP attributions via `shap.LinearExplainer`, maximizing explainability trust for educators.

---

## 3. Held-Out Test Set Performance (N = 79)

> **Important**: The test set (20% of data, $N=79$) was strictly held out and untouched during feature exploration, model training, cross-validation, and selection. It was evaluated only once after the winning architecture was finalized.

| Metric | Held-Out Test Result | Interpretation |
| :--- | :---: | :--- |
| **Recall (Class 1, At Risk)** | **88.46%** | Detected 23 out of 26 at-risk students (3 missed). |
| **Precision (Class 1, At Risk)**| **79.31%** | 23 true risk alerts out of 29 total positive flags (6 false alarms). |
| **F1-Score (Class 1)** | **83.64%** | Harmonic balance between sensitivity and precision on held-out students. |
| **ROC-AUC** | **97.97%** | Excellent ranking discrimination on unseen data. |
| **PR-AUC** | **96.38%** | Precision-Recall curve area on imbalanced test cohort. |
| **Accuracy** | **88.61%** | Overall fraction of correct classifications (70 / 79). |
| **Specificity (Class 0)** | **88.68%** | Correctly identified 47 out of 53 passing students. |

### Test Confusion Matrix
```
                     Predicted Not At Risk (0)    Predicted At Risk (1)
Actual Not At Risk (0)          47                           6
Actual At Risk (1)               3                          23
```

---

## 4. Intended Use & Educational Scope

### Primary Intended Use
- **Advisory Early Warning**: Designed solely as an institutional decision-support tool for academic advisors, counselors, and faculty to identify students in Mathematics courses who may benefit from tutoring, mentoring, or remedial study sessions before the final examination.
- **Mid-Term Intervention Point**: Executed after the release of Period 2 assessment scores ($G2$), synthesizing academic momentum ($\Delta G = G2 - G1$), attendance, and historical resilience signals.

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
  - *Mitigation*: The model was selected specifically for high sensitivity/recall (88.46% on test set), keeping FNs to a minimum (3 student on test set).
- **False Positive (FP) Impact (Cost: MODERATE)**:
  - A passing student is classified as "At Risk".
  - *Consequence*: Advisor conducts a brief check-in; student is invited to extra tutoring or study sessions that they may not strictly need. While this incurs advisor time, it does not harm the student academically.
  - *Mitigation*: Balanced with 79.31% precision on the test set, avoiding alert fatigue.

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
   - The chronic absenteeism indicator ($\\text{absences} \\ge 10$) is an EduGuard project-defined heuristic assumption, not an immutable institutional standard.
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
