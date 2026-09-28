"""SHAP explainability wrapper for the EduGuard student risk classifier.

Provides:
1. Exact Shapley value attribution using shap.LinearExplainer for the trained
   Logistic Regression pipeline.
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
    # Clean up standard one-hot names, e.g. "Mjob_health" -> "Mother's Job: health"
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
            y_train = train_df["at_risk"]

            # Initialize and fit winning Logistic Regression pipeline
            trained_pipeline = build_candidate_pipelines()["Logistic Regression"]
            trained_pipeline.fit(X_train, y_train)
            background_data = X_train

        self.pipeline = trained_pipeline
        self.feature_pipeline = self.pipeline.named_steps["features"]
        self.classifier = self.pipeline.named_steps["classifier"]

        # Transform background dataset for SHAP reference expectations
        self.feature_names = get_feature_names_from_pipeline(self.feature_pipeline)
        self.X_background_trans = self.feature_pipeline.transform(background_data)

        # shap.LinearExplainer provides exact, analytic Shapley values for linear models
        self.explainer = shap.LinearExplainer(
            self.classifier,
            self.X_background_trans,
            feature_names=self.feature_names
        )
        self.expected_value = float(self.explainer.expected_value)

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
        if prob_at_risk >= 0.70:
            risk_level = "High"
        elif prob_at_risk >= 0.40:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # 3. Transform features through identical pipeline
        X_trans = self.feature_pipeline.transform(df)

        # 4. Compute exact Shapley values (on log-odds scale for Class 1)
        shap_res = self.explainer(X_trans)
        shap_values = shap_res.values[0]  # Array of length len(self.feature_names)

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
            factors.append({
                "feature": col_name,
                "display_name": get_display_name(col_name),
                "contribution": round(val, 4),
                "abs_contribution": abs(val),
                "direction": direction,
                "raw_value": raw_val,
                "interpretation": (
                    f"{get_display_name(col_name)} shifted risk upward (+{val:.2f})"
                    if val > 0 else
                    f"{get_display_name(col_name)} shifted risk downward ({val:.2f})"
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

        shap_matrix = self.explainer(self.X_background_trans).values
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
    print("\nTop Contributing Factors:")
    for f in explanation["top_factors"]:
        print(f"  - {f['display_name']} (raw: {f['raw_value']}): {f['contribution']:+.4f} ({f['direction']})")

    print("\nGenerating Global SHAP Importance Summary...")
    explainer.explain_global_summary()
