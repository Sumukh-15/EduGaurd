"""Feature engineering and preprocessing pipeline for EduGuard.

Implements leak-free transformations using scikit-learn Pipeline and ColumnTransformer:
- Derives academic signals: grade velocity (ΔG = G2 - G1), grade average,
  chronic absenteeism indicator, and study-to-failure ratio.
- Handles one-hot encoding with handle_unknown='ignore' for robust inference.
- Implements strict validation asserting G3 is never present in features.
"""

from typing import List, Tuple
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer


# Raw input feature columns expected (strictly 32 features, G3 excluded)
RAW_NUMERIC_FEATURES = [
    "age", "Medu", "Fedu", "traveltime", "studytime", "failures",
    "famrel", "freetime", "goout", "Dalc", "Walc", "health",
    "absences", "G1", "G2"
]

RAW_BINARY_CATEGORICAL = [
    "school", "sex", "address", "famsize", "Pstatus",
    "schoolsup", "famsup", "paid", "activities", "nursery",
    "higher", "internet", "romantic"
]

RAW_NOMINAL_CATEGORICAL = [
    "Mjob", "Fjob", "reason", "guardian"
]

EXPECTED_INPUT_COLUMNS = (
    RAW_NUMERIC_FEATURES + RAW_BINARY_CATEGORICAL + RAW_NOMINAL_CATEGORICAL
)

# Derived feature names produced by AcademicFeatureEngineer
ENGINEERED_NUMERIC_FEATURES = [
    "grade_velocity",
    "grade_average",
    "chronic_absenteeism",
    "study_to_fail_ratio"
]

ALL_NUMERIC_FEATURES = RAW_NUMERIC_FEATURES + ENGINEERED_NUMERIC_FEATURES
ALL_CATEGORICAL_FEATURES = RAW_BINARY_CATEGORICAL + RAW_NOMINAL_CATEGORICAL


def validate_feature_input(df: pd.DataFrame) -> None:
    """Validates input features for presence of required columns and absence of G3.
    
    Raises:
        ValueError: If G3 is present (leakage) or if required columns are missing.
    """
    if "G3" in df.columns:
        raise ValueError(
            "CRITICAL LEAKAGE DETECTED: 'G3' is present in feature input. "
            "G3 is the final outcome and must never enter the feature set."
        )

    missing = set(EXPECTED_INPUT_COLUMNS) - set(df.columns)
    if missing:
        raise ValueError(f"Missing required feature columns: {sorted(list(missing))}")


class AcademicFeatureEngineer(BaseEstimator, TransformerMixin):
    """Custom scikit-learn transformer for domain-specific academic telemetry.
    
    Derives:
    - grade_velocity: G2 - G1 (negative indicates academic decline)
    - grade_average: (G1 + G2) / 2.0 (cumulative assessment baseline)
    - chronic_absenteeism: 1 if absences >= absence_threshold else 0
      (Note: threshold of 10 absences is a project-defined heuristic assumption,
       configurable per institutional policy, not a universal regulatory standard).
    - study_to_fail_ratio: studytime / (failures + 1.0)
    """

    def __init__(self, absence_threshold: int = 10):
        # Default 10 absences is an EduGuard project-defined heuristic assumption
        self.absence_threshold = absence_threshold

    def fit(self, X: pd.DataFrame, y=None):
        validate_feature_input(X)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        validate_feature_input(X)
        X_out = X.copy()

        # Grade dynamics
        g1 = pd.to_numeric(X_out["G1"])
        g2 = pd.to_numeric(X_out["G2"])
        absences = pd.to_numeric(X_out["absences"])
        studytime = pd.to_numeric(X_out["studytime"])
        failures = pd.to_numeric(X_out["failures"])

        X_out["grade_velocity"] = g2 - g1
        X_out["grade_average"] = (g1 + g2) / 2.0
        X_out["chronic_absenteeism"] = (absences >= self.absence_threshold).astype(float)
        X_out["study_to_fail_ratio"] = studytime / (failures + 1.0)

        # Enforce column order consistency
        return X_out


def create_column_preprocessor() -> ColumnTransformer:
    """Builds scikit-learn ColumnTransformer for scaling and one-hot encoding."""
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, ALL_NUMERIC_FEATURES),
            ("cat", categorical_transformer, ALL_CATEGORICAL_FEATURES)
        ],
        remainder="drop",
        verbose_feature_names_out=False
    )
    return preprocessor


def create_feature_pipeline() -> Pipeline:
    """Constructs the complete end-to-end feature pipeline."""
    return Pipeline([
        ("engineer", AcademicFeatureEngineer()),
        ("preprocessor", create_column_preprocessor())
    ])


def get_feature_names_from_pipeline(pipeline: Pipeline) -> List[str]:
    """Extracts output feature column names from a fitted feature pipeline."""
    preprocessor: ColumnTransformer = pipeline.named_steps["preprocessor"]
    return list(preprocessor.get_feature_names_out())


if __name__ == "__main__":
    from ml.clean import load_raw_data, clean_student_data

    print("Testing EduGuard feature engineering pipeline...")
    raw_df = load_raw_data()
    X, y = clean_student_data(raw_df)

    pipeline = create_feature_pipeline()
    X_trans = pipeline.fit_transform(X, y)
    feature_names = get_feature_names_from_pipeline(pipeline)

    print(f"Original features count: {X.shape[1]}")
    print(f"Transformed feature matrix shape: {X_trans.shape}")
    print(f"Total encoded features: {len(feature_names)}")
    print(f"Sample transformed feature names: {feature_names[:10]} ... {feature_names[-5:]}")
    print(f"NaN count in transformed matrix: {np.isnan(X_trans).sum()}")
