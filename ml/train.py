"""Model training, hyperparameter tuning, and cross-validation module for EduGuard.

Executes:
1. Stratified 80/20 train/test splitting (test set held out strictly for final evaluation).
2. Hyperparameter tuning using GridSearchCV with Stratified 5-Fold CV on the training split ONLY:
   - Logistic Regression (C, penalty)
   - Random Forest (n_estimators, max_depth, min_samples_leaf)
   - XGBoost (max_depth, learning_rate, n_estimators)
   - Support Vector Machine (C, kernel)
   - Scored on Recall (primary refit target), reporting F1 and ROC-AUC.
   - Best params saved to ml/reports/tuning_results.csv.
3. 5-Fold Stratified Cross-Validation on training split with end-to-end preprocessing pipelines
   to guarantee zero preprocessing leakage between folds.
4. Export of model comparison report to ml/reports/model_comparison.csv.
"""

from pathlib import Path
from typing import Dict, Any, List, Tuple
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split, GridSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix
)

from ml.clean import load_raw_data, clean_student_data
from ml.features import create_feature_pipeline, validate_feature_input

# Constant random seed for complete reproducibility
RANDOM_STATE = 42

# Imbalance ratio in dataset (~2.04 negative to positive ratio)
# Used for XGBoost scale_pos_weight
IMBALANCE_SCALE_POS_WEIGHT = 2.04


def build_candidate_pipelines(
    tuned_params: Dict[str, Dict[str, Any]] = None
) -> Dict[str, Pipeline]:
    """Instantiates candidate model pipelines with leak-free preprocessing.
    
    If tuned_params is provided, applies tuned hyperparameters to the classifiers.
    """
    candidates = {}
    params = tuned_params or {}

    # 1. Logistic Regression (Linear baseline with balanced class weights)
    lr_config = params.get("Logistic Regression", {})
    lr_clf = LogisticRegression(
        C=lr_config.get("C", 0.05 if "Logistic Regression" in params else 0.5),
        penalty=lr_config.get("penalty", "l1" if "Logistic Regression" in params else "l2"),
        max_iter=1000,
        class_weight="balanced",
        solver="liblinear",
        random_state=RANDOM_STATE
    )
    candidates["Logistic Regression"] = Pipeline([
        ("features", create_feature_pipeline()),
        ("classifier", lr_clf)
    ])

    # 2. Random Forest (Non-linear ensemble with balanced subsample weighting)
    rf_config = params.get("Random Forest", {})
    rf_clf = RandomForestClassifier(
        n_estimators=rf_config.get("n_estimators", 150),
        max_depth=rf_config.get("max_depth", 5),
        min_samples_split=rf_config.get("min_samples_split", 4),
        min_samples_leaf=rf_config.get("min_samples_leaf", 2),
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    candidates["Random Forest"] = Pipeline([
        ("features", create_feature_pipeline()),
        ("classifier", rf_clf)
    ])

    # 3. XGBoost (Gradient boosted decision trees with scale_pos_weight)
    xgb_config = params.get("XGBoost", {})
    xgb_clf = XGBClassifier(
        n_estimators=xgb_config.get("n_estimators", 100),
        max_depth=xgb_config.get("max_depth", 3),
        learning_rate=xgb_config.get("learning_rate", 0.05),
        scale_pos_weight=IMBALANCE_SCALE_POS_WEIGHT,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=RANDOM_STATE,
        eval_metric="logloss",
        n_jobs=-1
    )
    candidates["XGBoost"] = Pipeline([
        ("features", create_feature_pipeline()),
        ("classifier", xgb_clf)
    ])

    # 4. Support Vector Machine (SVC with probability=True, class_weight='balanced')
    svm_config = params.get("Support Vector Machine", params.get("SVM", {}))
    svm_clf = SVC(
        C=svm_config.get("C", 0.5 if ("Support Vector Machine" in params or "SVM" in params) else 1.0),
        kernel=svm_config.get("kernel", "rbf"),
        probability=True,
        class_weight="balanced",
        random_state=RANDOM_STATE
    )
    candidates["Support Vector Machine"] = Pipeline([
        ("features", create_feature_pipeline()),
        ("classifier", svm_clf)
    ])

    return candidates


# Hyperparameter search grids for each candidate model
TUNING_GRIDS: Dict[str, Dict[str, List[Any]]] = {
    "Logistic Regression": {
        "classifier__C": [0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0],
        "classifier__penalty": ["l1", "l2"],
    },
    "Random Forest": {
        "classifier__n_estimators": [50, 100, 150],
        "classifier__max_depth": [3, 5, 8, None],
        "classifier__min_samples_leaf": [1, 2, 4],
    },
    "XGBoost": {
        "classifier__max_depth": [2, 3, 5],
        "classifier__learning_rate": [0.01, 0.05, 0.1],
        "classifier__n_estimators": [50, 100, 150],
    },
    "Support Vector Machine": {
        "classifier__C": [0.1, 0.5, 1.0, 5.0],
        "classifier__kernel": ["linear", "rbf"],
    },
}


def tune_hyperparameters(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    reports_dir: str | Path = "ml/reports",
    n_splits: int = 5
) -> Tuple[pd.DataFrame, Dict[str, Pipeline], Dict[str, Dict[str, Any]]]:
    """Runs GridSearchCV for all candidate models using Stratified 5-Fold CV.
    
    Tuning is performed ONLY on the training split (test set held out strictly).
    Scoring is optimized primarily on Recall (refit='recall') while reporting F1 and ROC-AUC.
    Saves best params to ml/reports/tuning_results.csv.
    """
    reports_path = Path(reports_dir)
    reports_path.mkdir(parents=True, exist_ok=True)

    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=RANDOM_STATE)
    scoring = {
        "recall": "recall",
        "f1": "f1",
        "roc_auc": "roc_auc"
    }

    base_candidates = build_candidate_pipelines()
    tuning_rows: List[Dict[str, Any]] = []
    best_pipelines: Dict[str, Pipeline] = {}
    best_params_dict: Dict[str, Dict[str, Any]] = {}

    print("\n" + "=" * 60)
    print("Hyperparameter Tuning via Stratified 5-Fold CV (Refit = Recall)")
    print("=" * 60)

    for name, pipeline in base_candidates.items():
        param_grid = TUNING_GRIDS.get(name)
        if not param_grid:
            best_pipelines[name] = pipeline
            continue

        print(f"Tuning {name} over grid {list(param_grid.keys())}...")
        grid = GridSearchCV(
            estimator=pipeline,
            param_grid=param_grid,
            scoring=scoring,
            refit="recall",
            cv=skf,
            n_jobs=-1
        )
        grid.fit(X_train, y_train)

        best_idx = grid.best_index_
        best_pipe = grid.best_estimator_
        best_pipelines[name] = best_pipe

        # Clean parameter names by stripping 'classifier__' prefix
        clean_params = {
            k.replace("classifier__", ""): v for k, v in grid.best_params_.items()
        }
        best_params_dict[name] = clean_params

        mean_rec = float(grid.cv_results_["mean_test_recall"][best_idx])
        std_rec = float(grid.cv_results_["std_test_recall"][best_idx])
        mean_f1 = float(grid.cv_results_["mean_test_f1"][best_idx])
        std_f1 = float(grid.cv_results_["std_test_f1"][best_idx])
        mean_auc = float(grid.cv_results_["mean_test_roc_auc"][best_idx])
        std_auc = float(grid.cv_results_["std_test_roc_auc"][best_idx])

        tuning_rows.append({
            "model": name,
            "best_params": json.dumps(clean_params),
            "cv_recall_mean": mean_rec,
            "cv_recall_std": std_rec,
            "cv_f1_mean": mean_f1,
            "cv_f1_std": std_f1,
            "cv_roc_auc_mean": mean_auc,
            "cv_roc_auc_std": std_auc,
            "primary_scorer": "recall",
        })

        print(f"  Best params: {clean_params}")
        print(f"  CV Recall: {mean_rec*100:.2f}% (±{std_rec*100:.2f}%) | CV F1: {mean_f1*100:.2f}% | CV ROC-AUC: {mean_auc*100:.2f}%")

    tuning_df = pd.DataFrame(tuning_rows)
    tuning_csv = reports_path / "tuning_results.csv"
    tuning_df.to_csv(tuning_csv, index=False)
    print(f"\nTuning results successfully written to: {tuning_csv.resolve()}")

    return tuning_df, best_pipelines, best_params_dict


def evaluate_cv_pipeline(
    pipeline: Pipeline,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    n_splits: int = 5
) -> Dict[str, Any]:
    """Performs 5-fold stratified cross-validation on train split only."""
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=RANDOM_STATE)

    fold_metrics = {
        "accuracy": [],
        "precision": [],
        "recall": [],
        "f1": [],
        "roc_auc": [],
        "pr_auc": [],
        "specificity": [],
        "tp": [], "fp": [], "fn": [], "tn": []
    }

    for fold, (train_idx, val_idx) in enumerate(skf.split(X_train, y_train)):
        X_tr, X_val = X_train.iloc[train_idx], X_train.iloc[val_idx]
        y_tr, y_val = y_train.iloc[train_idx], y_train.iloc[val_idx]

        # Pipeline fits preprocessing and classifier STRICTLY on fold training data
        pipeline.fit(X_tr, y_tr)

        y_pred = pipeline.predict(X_val)
        y_proba = pipeline.predict_proba(X_val)[:, 1]

        # Confusion matrix for fold
        cm = confusion_matrix(y_val, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()

        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

        fold_metrics["accuracy"].append(accuracy_score(y_val, y_pred))
        fold_metrics["precision"].append(precision_score(y_val, y_pred, zero_division=0))
        fold_metrics["recall"].append(recall_score(y_val, y_pred, zero_division=0))
        fold_metrics["f1"].append(f1_score(y_val, y_pred, zero_division=0))
        fold_metrics["roc_auc"].append(roc_auc_score(y_val, y_proba))
        fold_metrics["pr_auc"].append(average_precision_score(y_val, y_proba))
        fold_metrics["specificity"].append(specificity)
        fold_metrics["tp"].append(tp)
        fold_metrics["fp"].append(fp)
        fold_metrics["fn"].append(fn)
        fold_metrics["tn"].append(tn)

    summary = {}
    for metric in ["recall", "precision", "f1", "roc_auc", "pr_auc", "accuracy", "specificity"]:
        summary[f"{metric}_mean"] = float(np.mean(fold_metrics[metric]))
        summary[f"{metric}_std"] = float(np.std(fold_metrics[metric]))

    # Sum total confusion matrix counts across all 5 folds
    summary["total_tp"] = int(np.sum(fold_metrics["tp"]))
    summary["total_fp"] = int(np.sum(fold_metrics["fp"]))
    summary["total_fn"] = int(np.sum(fold_metrics["fn"]))
    summary["total_tn"] = int(np.sum(fold_metrics["tn"]))

    return summary


def train_and_compare_models(
    reports_dir: str | Path = "ml/reports",
    processed_dir: str | Path = "data/processed"
) -> pd.DataFrame:
    """Trains candidate models, performs leak-free CV, and persists comparison tables."""
    reports_path = Path(reports_dir)
    reports_path.mkdir(parents=True, exist_ok=True)
    processed_path = Path(processed_dir)
    processed_path.mkdir(parents=True, exist_ok=True)

    # 1. Load clean data
    raw_df = load_raw_data()
    X, y = clean_student_data(raw_df)
    validate_feature_input(X)

    # 2. Stratified 80/20 train/test split
    # Test set is locked and preserved strictly for final validation
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=y
    )

    # Save splits for downstream modules to guarantee identical test evaluation
    train_split = X_train.copy()
    train_split["at_risk"] = y_train
    train_split.to_csv(processed_path / "train_split.csv", index=False)

    test_split = X_test.copy()
    test_split["at_risk"] = y_test
    test_split.to_csv(processed_path / "test_split.csv", index=False)

    print("=" * 60)
    print("EduGuard Model Training & 5-Fold Stratified Cross-Validation")
    print("=" * 60)
    print(f"Total observations: {len(X)}")
    print(f"Training split:     {len(X_train)} (At Risk: {y_train.sum()} = {y_train.mean()*100:.1f}%)")
    print(f"Held-out test set:  {len(X_test)} (At Risk: {y_test.sum()} = {y_test.mean()*100:.1f}%)")
    print(f"Preprocessing:      Strictly inside 5-fold CV (zero leakage)\n")

    # 3. Hyperparameter Tuning strictly on training split
    tuning_df, tuned_pipelines, best_params_dict = tune_hyperparameters(
        X_train, y_train, reports_dir=reports_path, n_splits=5
    )

    # 4. Evaluate each tuned candidate model via full 5-fold CV for comprehensive metrics
    results = []
    for name, pipeline in tuned_pipelines.items():
        print(f"Running full 5-fold CV evaluation for: {name} ...")
        cv_summary = evaluate_cv_pipeline(pipeline, X_train, y_train, n_splits=5)
        cv_summary["model"] = name
        results.append(cv_summary)

    results_df = pd.DataFrame(results)
    # Order columns logically
    cols = [
        "model",
        "recall_mean", "recall_std",
        "precision_mean", "precision_std",
        "f1_mean", "f1_std",
        "roc_auc_mean", "roc_auc_std",
        "pr_auc_mean", "pr_auc_std",
        "accuracy_mean", "accuracy_std",
        "specificity_mean", "specificity_std",
        "total_tp", "total_fp", "total_fn", "total_tn"
    ]
    results_df = results_df[cols]

    # Save comparison CSV
    comparison_csv = reports_path / "model_comparison.csv"
    results_df.to_csv(comparison_csv, index=False)
    print(f"\nModel comparison metrics saved to: {comparison_csv.resolve()}")

    # Print summary table
    print("\nCross-Validation Performance Summary (Class 1: At Risk):")
    display_cols = [
        "model", "recall_mean", "precision_mean", "f1_mean", "roc_auc_mean", "accuracy_mean"
    ]
    formatted_table = results_df[display_cols].copy()
    for col in display_cols[1:]:
        formatted_table[col] = formatted_table[col].apply(lambda v: f"{v*100:.2f}%")
    print(formatted_table.to_string(index=False))

    print("\nAggregate Cross-Validation Confusion Matrices (across all 316 training samples):")
    for _, row in results_df.iterrows():
        print(f"  {row['model']:24s} -> TP={row['total_tp']:3d} | FN={row['total_fn']:2d} | FP={row['total_fp']:2d} | TN={row['total_tn']:3d}")

    # Generate training summary text file
    summary_path = reports_path / "training_summary.txt"
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("EduGuard ML Pipeline — Training & Cross-Validation Summary\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Training Samples: {len(X_train)} | Test Samples (Held-out): {len(X_test)}\n")
        f.write(f"Class Balance (Train): {y_train.sum()} At-Risk / {len(y_train)} Total ({y_train.mean()*100:.2f}%)\n")
        f.write("CV Strategy: 5-Fold Stratified K-Fold (Shuffle=True, Seed=42)\n")
        f.write("Anti-Leakage Safeguard: Preprocessing fit strictly per fold; G3 excluded.\n\n")
        f.write(formatted_table.to_string(index=False))
        f.write("\n\nAggregate Confusion Matrices:\n")
        for _, row in results_df.iterrows():
            f.write(f"  {row['model']}:\n")
            f.write(f"    TP: {row['total_tp']} (Correctly flagged at-risk)\n")
            f.write(f"    FN: {row['total_fn']} (Missed at-risk)\n")
            f.write(f"    FP: {row['total_fp']} (False alarms)\n")
            f.write(f"    TN: {row['total_tn']} (Correctly flagged not at-risk)\n\n")

    return results_df


if __name__ == "__main__":
    train_and_compare_models()
