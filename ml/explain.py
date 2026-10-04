"""SHAP explainability wrapper for the EduGuard student risk classifier.

Provides:
1. Model-agnostic Shapley value attribution supporting:
   - Linear models (shap.LinearExplainer for Logistic Regression or Linear SVM)
   - Tree models (shap.TreeExplainer for Random Forest and XGBoost)
   - Kernel models (shap.KernelExplainer as last resort with documented speed cost)
2. Local explanations: explain_instance(student: dict | pd.DataFrame) returning
   top contributing risk-increasing and protective factors with human-readable labels.
3. Global feature importance: explain_global_summary() based on mean absolute SHAP values.
4. Strict non-causal disclaimer distinguishing statistical feature contributions
   from causal mechanisms.
5. Anti-leakage verification: rejects any input containing G3 or missing required features.
"""

from pathlib import Path
from typing import Dict, Any, List, Union
import json
import numpy as np
import pandas as pd
import shap
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from ml.features import (
    create_feature_pipeline,
    validate_feature_input,
    get_feature_names_from_pipeline,
    EXPECTED_INPUT_COLUMNS
)
from ml.train import build_candidate_pipelines, RANDOM_STATE

# Non-causal interpretation disclaimer required for responsible educational AI
NON_CAUSAL_DISCLAIMER = (
    "SHAP feature contributions quantify how strongly and in what direction each "
    "attribute shifted the model's statistical risk prediction relative to the baseline. "
    "They do NOT establish causal relationships. For example, high absences correlate "
    "with predicted risk, but absences alone may reflect underlying health, family, or "
    "transportation challenges. Interventions must be guided by holistic human counseling, "
    "not automated causal assumptions."
)

# Human-readable display mapping for raw and engineered attributes
FEATURE_DISPLAY_NAMES: Dict[str, str] = {
    "G2": "Period 2 Grade (Midterm 2)",
    "G1": "Period 1 Grade (Midterm 1)",
    "grade_velocity": "Grade Velocity (G2 - G1)",
    "grade_average": "Midterm Grade Average",
    "failures": "Past Subject Failures",
    "absences": "Number of Absences",
    "chronic_absenteeism": "Chronic Absenteeism (>=10 Absences)",
    "studytime": "Weekly Study Time",
    "study_to_fail_ratio": "Study-to-Failure Ratio",
    "age": "Student Age",
    "Medu": "Mother's Education Level",
    "Fedu": "Father's Education Level",
    "traveltime": "Commute Travel Time",
    "famrel": "Family Relationship Quality",
    "freetime": "Free Time After School",
    "goout": "Socializing with Friends",
    "Dalc": "Workday Alcohol Consumption",
    "Walc": "Weekend Alcohol Consumption",
    "health": "Current Health Status",
    "schoolsup_yes": "Extra Educational School Support",
    "schoolsup_no": "No Extra School Support",
    "famsup_yes": "Family Educational Support",
    "famsup_no": "No Family Support",
    "paid_yes": "Extra Paid Tutoring",
    "paid_no": "No Paid Tutoring",
    "activities_yes": "Extracurricular Activities",
    "activities_no": "No Extracurriculars",
    "higher_yes": "Aspirations for Higher Education",
    "higher_no": "No Higher Education Aspirations",
    "internet_yes": "Internet Access at Home",
    "internet_no": "No Home Internet",
    "romantic_yes": "In a Romantic Relationship",
    "romantic_no": "Not in Romantic Relationship",
    "school_GP": "School: Gabriel Pereira",
    "school_MS": "School: Mousinho da Silveira",
    "sex_F": "Sex: Female",
    "sex_M": "Sex: Male",
    "address_U": "Home Address: Urban",
    "address_R": "Home Address: Rural",
    "famsize_LE3": "Family Size: <=3",
    "famsize_GT3": "Family Size: >3",
    "Pstatus_T": "Parents Cohabitation: Together",
    "Pstatus_A": "Parents Cohabitation: Apart",
    "guardian_mother": "Guardian: Mother",
    "guardian_father": "Guardian: Father",
    "guardian_other": "Guardian: Other",
    "reason_home": "School Choice Reason: Close to Home",
    "reason_reputation": "School Choice Reason: Reputation",
    "reason_course": "School Choice Reason: Course Preference",
    "reason_other": "School Choice Reason: Other",
    "Mjob_teacher": "Mother's Occupation: Teacher",
    "Mjob_health": "Mother's Occupation: Health Care",
    "Mjob_services": "Mother's Occupation: Civil Services",
    "Mjob_at_home": "Mother's Occupation: At Home",
    "Mjob_other": "Mother's Occupation: Other",
    "Fjob_teacher": "Father's Occupation: Teacher",
    "Fjob_health": "Father's Occupation: Health Care",
    "Fjob_services": "Father's Occupation: Civil Services",
    "Fjob_at_home": "Father's Occupation: At Home",
    "Fjob_other": "Father's Occupation: Other",
}


def get_display_name(feature_key: str) -> str:
    """Returns human-friendly label for internal feature matrix column."""
    if feature_key in FEATURE_DISPLAY_NAMES:
        return FEATURE_DISPLAY_NAMES[feature_key]
    if "_" in feature_key:
        prefix, suffix = feature_key.split("_", 1)
        return f"{prefix.capitalize()}: {suffix}"
    return feature_key.replace("_", " ").title()


class EduGuardExplainer:
    """Production-grade SHAP explainer for EduGuard risk predictions."""

    def __init__(
        self,
        trained_pipeline=None,
        background_data: pd.DataFrame = None,
        train_split_path: str | Path = "data/processed/train_split.csv"
    ):
        """Initializes the explainer with trained pipeline and training background distribution."""
        if trained_pipeline is None or background_data is None:
            train_path = Path(train_split_path)
            if not train_path.exists():
                raise FileNotFoundError(f"Training data file missing at: {train_path.resolve()}")
            train_df = pd.read_csv(train_path)
            X_train = train_df.drop(columns=["at_risk"])
            background_data = X_train

            # Try to load existing serialized pipeline, fallback to fitting Logistic Regression
            try:
                from ml.serialize import load_model_pipeline
                trained_pipeline = load_model_pipeline()
            except Exception:
                y_train = train_df["at_risk"]
                trained_pipeline = build_candidate_pipelines()["Logistic Regression"]
                trained_pipeline.fit(X_train, y_train)

        self.pipeline = trained_pipeline
        self.feature_pipeline = self.pipeline.named_steps["features"]
        self.classifier = self.pipeline.named_steps["classifier"]

        # Transform background dataset for SHAP reference expectations
        self.feature_names = get_feature_names_from_pipeline(self.feature_pipeline)
        self.X_background_trans = self.feature_pipeline.transform(background_data)

        # Initialize appropriate explainer based on model architecture
        if isinstance(self.classifier, (RandomForestClassifier, XGBClassifier)):
            # TreeExplainer for tree ensembles (fast: ~0.001s/sample)
            self.explainer_type = "tree"
            self.explainer = shap.TreeExplainer(self.classifier)
            exp_val = self.explainer.expected_value
            if isinstance(exp_val, (list, np.ndarray)):
                self.expected_value = float(exp_val[1]) if len(exp_val) > 1 else float(exp_val[0])
            else:
                self.expected_value = float(exp_val)
        elif isinstance(self.classifier, LogisticRegression) or (
            isinstance(self.classifier, SVC) and getattr(self.classifier, "kernel", "") == "linear"
        ):
            # LinearExplainer for linear classifiers (exact, analytic, ultra-fast: ~0.0002s/sample)
            self.explainer_type = "linear"
            self.explainer = shap.LinearExplainer(
                self.classifier,
                self.X_background_trans,
                feature_names=self.feature_names
            )
            self.expected_value = float(self.explainer.expected_value)
        else:
            # KernelExplainer as a last resort for non-linear kernel SVM (~1.5-2.5s/sample)
            self.explainer_type = "kernel"
            # Subsample background to 20 samples to keep evaluation tractable
            bg_sample = shap.sample(self.X_background_trans, 20, random_state=RANDOM_STATE)
            self.explainer = shap.KernelExplainer(
                lambda x: self.classifier.predict_proba(x)[:, 1],
                bg_sample
            )
            exp_val = self.explainer.expected_value
            if isinstance(exp_val, (list, np.ndarray)):
                self.expected_value = float(exp_val[1]) if len(exp_val) > 1 else float(exp_val[0])
            else:
                self.expected_value = float(exp_val)

    def compute_shap_matrix(self, X_trans: np.ndarray) -> np.ndarray:
        """Computes 2D SHAP value matrix of shape (N, num_features) consistently across explainers."""
        if self.explainer_type == "tree":
            res = self.explainer(X_trans)
            vals = res.values
            # Binary RandomForest yields (N, num_features, 2); class 1 is index 1
            if len(vals.shape) == 3:
                return vals[:, :, 1]
            return vals
        elif self.explainer_type == "linear":
            res = self.explainer(X_trans)
            return res.values
        else:
            # KernelExplainer
            vals = self.explainer.shap_values(X_trans, nsamples=50)
            if isinstance(vals, list):
                return np.array(vals[1]) if len(vals) > 1 else np.array(vals[0])
            return np.array(vals)

    def explain_instance(
        self,
        student_data: Union[Dict[str, Any], pd.Series, pd.DataFrame],
        top_k: int = 5
    ) -> Dict[str, Any]:
        """Generates local prediction explanation for an individual student record.
        
        Args:
            student_data: Raw student attributes (dict, Series, or 1-row DataFrame).
            top_k: Number of top driving factors to return.
            
        Returns:
            Dictionary containing predicted risk probability, risk level,
            top contributing factors, and ethical interpretation disclaimers.
        """
        # Convert dict or Series to single-row DataFrame
        if isinstance(student_data, dict):
            df = pd.DataFrame([student_data])
        elif isinstance(student_data, pd.Series):
            df = student_data.to_frame().T
        elif isinstance(student_data, pd.DataFrame):
            df = student_data.copy()
        else:
            raise TypeError(f"Unsupported student_data type: {type(student_data)}")

        # 1. Anti-leakage and schema validation
        validate_feature_input(df)

        # 2. Get model prediction and probability
        prob_at_risk = float(self.pipeline.predict_proba(df)[0, 1])

        # Risk categorization using centralized thresholds
        from ml.serialize import classify_risk_level
        risk_level = classify_risk_level(prob_at_risk)

        # 3. Transform features through identical pipeline
        X_trans = self.feature_pipeline.transform(df)

        # 4. Compute Shapley values
        shap_values_matrix = self.compute_shap_matrix(X_trans)
        shap_values = shap_values_matrix[0]

        # 5. Extract and rank individual factor contributions
        df_engineered = self.feature_pipeline.named_steps["engineer"].transform(df)
        factors: List[Dict[str, Any]] = []
        for idx, col_name in enumerate(self.feature_names):
            val = float(shap_values[idx])
            # Determine raw value from engineered features or raw inputs
            raw_val = None
            if col_name in df_engineered.columns:
                raw_val = df_engineered[col_name].iloc[0]
                if isinstance(raw_val, (np.floating, float)):
                    raw_val = round(float(raw_val), 2)
                elif isinstance(raw_val, (np.integer, int)):
                    raw_val = int(raw_val)
            elif "_" in col_name:
                # One-hot column e.g. Mjob_teacher
                base_col, category = col_name.split("_", 1)
                if base_col in df.columns:
                    raw_val = df[base_col].iloc[0]

            direction = "increases_risk" if val > 0 else "decreases_risk"
            disp_name = get_display_name(col_name)
            factors.append({
                "feature": col_name,
                "display_name": disp_name,
                "contribution": round(val, 4),
                "abs_contribution": abs(val),
                "direction": direction,
                "raw_value": raw_val,
                "interpretation": (
                    f"{disp_name} shifted risk upward (+{val:.2f})"
                    if val > 0 else
                    f"{disp_name} shifted risk downward ({val:.2f})"
                )
            })

        # Sort factors by absolute magnitude of contribution
        factors.sort(key=lambda x: x["abs_contribution"], reverse=True)
        top_factors = factors[:top_k]

        return {
            "predicted_risk_level": risk_level,
            "risk_probability": round(prob_at_risk, 4),
            "base_log_odds": round(self.expected_value, 4),
            "top_factors": top_factors,
            "all_factors_count": len(factors),
            "causal_disclaimer": NON_CAUSAL_DISCLAIMER
        }

    def explain_global_summary(
        self,
        output_dir: str | Path = "ml/reports",
        top_k: int = 15
    ) -> pd.DataFrame:
        """Computes global feature importance based on mean absolute SHAP values."""
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        # For fast execution, use full background for linear/tree or subset for kernel
        if self.explainer_type == "kernel":
            X_eval = self.X_background_trans[:30]
        else:
            X_eval = self.X_background_trans

        shap_matrix = self.compute_shap_matrix(X_eval)
        mean_abs_shap = np.mean(np.abs(shap_matrix), axis=0)

        df_global = pd.DataFrame({
            "feature": self.feature_names,
            "display_name": [get_display_name(f) for f in self.feature_names],
            "mean_abs_shap": mean_abs_shap
        }).sort_values(by="mean_abs_shap", ascending=False).reset_index(drop=True)

        # Save CSV report
        csv_file = out_path / "shap_global_summary.csv"
        df_global.to_csv(csv_file, index=False)

        # Plot top K global features
        plt.figure(figsize=(9, 6))
        top_plot = df_global.head(top_k).iloc[::-1]  # Highest at top
        plt.barh(top_plot["display_name"], top_plot["mean_abs_shap"], color="#3b82f6")
        plt.title(f"Top {top_k} Global Predictors by Mean |SHAP Value|\n(EduGuard Model)", fontsize=11, fontweight="bold")
        plt.xlabel("Mean |SHAP Value| (Impact on Model Log-Odds)")
        plt.tight_layout()
        plt.savefig(out_path / "shap_summary_plot.png", dpi=150)
        plt.close()

        print(f"Global SHAP summary exported to: {csv_file.resolve()}")
        return df_global


if __name__ == "__main__":
    print("Testing EduGuard SHAP Explainability Wrapper...")
    explainer = EduGuardExplainer()

    # Load a test sample
    test_df = pd.read_csv("data/processed/test_split.csv")
    sample_student = test_df.iloc[0].drop("at_risk").to_dict()

    explanation = explainer.explain_instance(sample_student, top_k=5)
    print("\nSample Student Explanation Result:")
    print(f"  Predicted Risk Level: {explanation['predicted_risk_level']}")
    print(f"  Risk Probability:     {explanation['risk_probability']*100:.2f}%")
    print(f"  Explainer Type:       {explainer.explainer_type}")
    print("\nTop Contributing Factors:")
    for f in explanation["top_factors"]:
        print(f"  - {f['display_name']} (raw: {f['raw_value']}): {f['contribution']:+.4f} ({f['direction']})")

    print("\nGenerating Global SHAP Importance Summary...")
    explainer.explain_global_summary()
