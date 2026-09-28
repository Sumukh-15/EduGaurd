# Phase 1 Plan: Standalone Machine Learning Pipeline

## 1. What We Are Building and Why
In Phase 1, we build the standalone Python machine learning and explainability pipeline in `ml/`.
- **What**: An end-to-end ML workflow covering data ingestion, data cleaning, exploratory data analysis (EDA), leak-free feature engineering, multi-model training (Logistic Regression, Random Forest, XGBoost), cross-validation, model selection by Recall/F1 priority, SHAP-based feature attribution, artifact serialization, and an automated pytest test suite.
- **Why**: An educational early warning system must be reliable, reproducible, and explainable. Before wiring any models into the backend API or frontend UI, we need verified models, real benchmarked metrics logged in a transparent `MODEL_CARD.md`, and automated assertions proving zero target leakage ($G3$ completely excluded).

---

## 2. Exact List of Files to Create or Modify

We will break the implementation into reviewable sub-steps (pausing for your acceptance between each):

### Sub-step 1.1: Dependencies, Data Cleaning & EDA
- `ml/requirements.txt` — ML and testing package dependencies with pinned versions.
- `ml/clean.py` — Ingestion of `data/raw/student-mat.csv`, schema verification, target label creation (`at_risk = 1` if $G3 < 10$ else $0$), and strict removal of $G3$.
- `ml/eda.py` — Computes class distributions, descriptive statistics, feature correlations with `at_risk`, and saves summary outputs to `ml/reports/eda/`.

### Sub-step 1.2: Feature Engineering & Preprocessing Pipeline
- `ml/features.py` — Builds a scikit-learn `ColumnTransformer` pipeline:
  - Numeric scaling / passthrough for continuous/ordinal variables (`age`, `absences`, `studytime`, `failures`, `G1`, `G2`, etc.).
  - One-hot encoding for nominal categories (`Mjob`, `Fjob`, `reason`, `guardian`, `school`, `sex`, etc.).
  - Derived institutional signals: grade velocity ($\Delta G = G2 - G1$), chronic absenteeism flag ($\text{absences} > 10$).
  - Strict input validator ensuring $G3$ is rejected if present.

### Sub-step 1.3: Model Training & Cross-Validation
- `ml/train.py` — Stratified 80/20 train/test split (fixed random seed = 42 for reproducibility), 5-Fold Stratified Cross-Validation on the training split, training:
  - Model 1: **Logistic Regression** (interpretable linear baseline)
  - Model 2: **Random Forest** (non-linear bagging ensemble)
  - Model 3: **XGBoost** (gradient boosted decision trees)
  - Logs CV and test metrics (Accuracy, Precision, Recall, F1, ROC-AUC, PR-AUC) to `ml/reports/model_comparison.csv`.

### Sub-step 1.4: Model Selection & Model Card
- `ml/select_model.py` — Evaluates candidate models, prioritizes **Recall (Class 1)** and **F1-Score (Class 1)**, evaluates the winning model on the test holdout set, generates the confusion matrix, and writes `ml/reports/MODEL_CARD.md`.

### Sub-step 1.5: SHAP Explainability Wrapper
- `ml/explain.py` — Production-ready explainer wrapper:
  - Initializes TreeExplainer / LinearExplainer on the winning fitted model.
  - Implements `explain(features: dict) -> list[dict]` returning sorted feature contributions `[{feature: str, contribution: float, display_name: str, value: Any}]`.
  - Maps internal feature names to human-readable explanations (e.g., `G2` -> "Period 2 Midterm Grade").

### Sub-step 1.6: Serialization & Pipeline Export
- `ml/serialize.py` — Persists the fitted end-to-end pipeline to `ml/artifacts/model_v1.joblib` and writes `ml/artifacts/model_metadata.json` (feature input order, category mappings, risk probability thresholds, training date, model version, and performance metrics).

### Sub-step 1.7: Comprehensive PyTest Suite
- `ml/tests/__init__.py`
- `ml/tests/test_leakage.py` — Critical invariant: Asserts $G3$ is NEVER present in training features or model input schema.
- `ml/tests/test_features.py` — Tests transformation shapes, handling of unseen categories, and zero-NaN output.
- `ml/tests/test_predict.py` — Tests model predictions, probability ranges $[0.0, 1.0]$, and threshold binning (Low/Medium/High).
- `ml/tests/test_explain.py` — Tests SHAP attribution output structure, non-empty factor lists, and sign consistency.

---

## 3. Tools, Libraries, and Installs Needed on Your Machine

Before executing Phase 1 code, your local Python environment must be configured.

### Commands to Run:
```powershell
# 1. Create a dedicated Python 3.12 virtual environment in the project root:
py -3.12 -m venv .venv
# Reason: Keeps project dependencies isolated from system-wide Python.

# 2. Activate the virtual environment in PowerShell:
.\.venv\Scripts\Activate.ps1
# (If on macOS/Linux: source .venv/bin/activate)
# Reason: Ensures subsequent pip installs and python scripts run inside .venv.

# 3. Upgrade pip:
python -m pip install --upgrade pip
# Reason: Prevents wheel install issues on modern binary wheels.
```

The required libraries will be placed in `ml/requirements.txt` and installed via:
```powershell
pip install -r ml/requirements.txt
```
Key packages in `ml/requirements.txt`:
- `numpy>=1.26.0,<2.0.0` & `pandas>=2.1.0` (Core data manipulation)
- `scikit-learn>=1.4.0` (Preprocessors, Logistic Regression, Random Forest, metrics)
- `xgboost>=2.0.0` (Gradient boosting classifier)
- `shap>=0.45.0` (TreeSHAP & LinearSHAP explanations)
- `joblib>=1.3.0` (Model persistence)
- `pytest>=8.0.0` (Testing framework)
- `matplotlib>=3.8.0` (Visualization outputs for EDA reports)

*No external database, Docker container, or cloud accounts are needed for Phase 1.*

---

## 4. Assumptions and Architectural Decisions

1. **Model Selection Priority (Recall > F1 > ROC-AUC)**:
   - In academic early warning systems, a **False Negative** (a failing student who goes unnoticed and receives no intervention) has far worse consequences than a **False Positive** (a student receiving proactive academic tutoring).
   - Therefore, while monitoring Precision to avoid alert fatigue, model selection prioritizes **Recall on Class 1 (At Risk)** followed by **F1-Score**.
2. **Deterministic Reproducibility**:
   - All train/test splits, cross-validation folds, and model initializations use `random_state=42`.
3. **SHAP Granularity**:
   - One-hot encoded features will be aggregated or cleanly formatted so the frontend and API receive intelligible factors (e.g. "Low Period 2 Grade (G2 = 8)" rather than raw uninformative matrix column names).
4. **Risk Thresholds**:
   - **Low Risk**: Predicted probability $< 0.40$
   - **Medium Risk**: $0.40 \le \text{Probability} < 0.70$
   - **High Risk**: $\text{Probability} \ge 0.70$
   - Default binary threshold: $0.50$ (with threshold tuning documented in `MODEL_CARD.md`).
5. **No Data Leakage**:
   - $G3$ is removed immediately during `clean.py` and target extraction. Tests will fail if $G3$ is found anywhere in feature sets or serialized schemas.
