"""Data cleaning, validation, and anti-leakage target extraction for EduGuard.

This module loads the raw student performance data, verifies schema integrity,
constructs the binary classification target (at_risk = 1 if G3 < 10 else 0),
and strictly strips G3 from the feature set to ensure zero target leakage.
"""

from pathlib import Path
from typing import Tuple
import pandas as pd

# Expected columns in the raw student-mat.csv dataset
EXPECTED_RAW_COLUMNS = [
    "school", "sex", "age", "address", "famsize", "Pstatus", "Medu", "Fedu",
    "Mjob", "Fjob", "reason", "guardian", "traveltime", "studytime", "failures",
    "schoolsup", "famsup", "paid", "activities", "nursery", "higher", "internet",
    "romantic", "famrel", "freetime", "goout", "Dalc", "Walc", "health",
    "absences", "G1", "G2", "G3"
]

# Universal Portuguese secondary education passing grade threshold
PASSING_GRADE_THRESHOLD = 10


def load_raw_data(csv_path: str | Path = "data/raw/student-mat.csv") -> pd.DataFrame:
    """Loads raw student dataset from CSV.
    
    The raw UCI file is semicolon-delimited (';') with quoted strings.
    """
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Raw data file not found at: {path.resolve()}")

    df = pd.read_csv(path, sep=";", quotechar='"')
    
    # Schema validation
    missing_cols = set(EXPECTED_RAW_COLUMNS) - set(df.columns)
    if missing_cols:
        raise ValueError(f"Schema mismatch: missing expected columns {missing_cols}")

    return df


def clean_student_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Cleans raw data and extracts features and target with strict zero-leakage.
    
    Returns:
        X (pd.DataFrame): 32 features (demographics, attendance, G1, G2, etc.).
                          G3 is guaranteed to be excluded.
        y (pd.Series): Binary target label 'at_risk' (1 if G3 < 10, else 0).
    """
    df_clean = df.copy()

    # 1. Check for unexpected nulls
    null_counts = df_clean.isnull().sum()
    if null_counts.any():
        cols_with_nulls = null_counts[null_counts > 0].to_dict()
        raise ValueError(f"Unexpected missing values detected: {cols_with_nulls}")

    # 2. Derive binary target at_risk
    # at_risk = 1 if final grade G3 is below the passing mark (10), else 0
    if "G3" not in df_clean.columns:
        raise KeyError("Cannot derive 'at_risk' target: 'G3' is missing from raw input.")
    
    at_risk = (pd.to_numeric(df_clean["G3"]) < PASSING_GRADE_THRESHOLD).astype(int)
    at_risk.name = "at_risk"

    # 3. CRITICAL ANTI-LEAKAGE STEP: Drop G3 immediately
    X = df_clean.drop(columns=["G3"])

    # Double check that G3 is strictly absent
    if "G3" in X.columns:
        raise RuntimeError("CRITICAL DATA LEAKAGE: G3 was not dropped from feature matrix X.")

    # 4. Enforce appropriate data types
    numeric_cols = [
        "age", "Medu", "Fedu", "traveltime", "studytime", "failures",
        "famrel", "freetime", "goout", "Dalc", "Walc", "health",
        "absences", "G1", "G2"
    ]
    for col in numeric_cols:
        X[col] = pd.to_numeric(X[col])

    categorical_cols = [c for c in X.columns if c not in numeric_cols]
    for col in categorical_cols:
        X[col] = X[col].astype(str).str.strip()

    return X, at_risk


def get_clean_dataset(csv_path: str | Path = "data/raw/student-mat.csv") -> pd.DataFrame:
    """Returns combined DataFrame with features and at_risk target (G3 excluded)."""
    df_raw = load_raw_data(csv_path)
    X, y = clean_student_data(df_raw)
    combined = X.copy()
    combined["at_risk"] = y
    return combined


if __name__ == "__main__":
    print("Executing EduGuard data cleaning and validation...")
    raw_df = load_raw_data()
    print(f"Raw dataset loaded: {raw_df.shape[0]} rows, {raw_df.shape[1]} columns")

    X, y = clean_student_data(raw_df)
    print(f"Features matrix X shape: {X.shape} (G3 present: {'G3' in X.columns})")
    print(f"Target vector y shape: {y.shape}")
    print(f"Target distribution (at_risk=1): {y.sum()} / {len(y)} ({y.mean()*100:.2f}%)")

    # Persist clean dataset to data/processed/
    output_dir = Path("data/processed")
    output_dir.mkdir(parents=True, exist_ok=True)
    clean_path = output_dir / "student_clean.csv"
    combined = X.copy()
    combined["at_risk"] = y
    combined.to_csv(clean_path, index=False)
    print(f"Cleaned dataset saved to: {clean_path.resolve()}")
