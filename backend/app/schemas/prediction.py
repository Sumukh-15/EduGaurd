"""Pydantic schemas for machine learning predictions and SHAP explanations."""

from datetime import datetime
from typing import Any, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.app.schemas.academic_data import AcademicRecordCreate


class PredictRequest(BaseModel):
    """Payload to trigger an academic risk prediction.

    Can evaluate an existing persisted AcademicRecord (via `academic_record_id`, or latest by default),
    or evaluate new academic telemetry provided in `academic_data` (recorded by faculty/admin).

    STRICT ANTI-LEAKAGE:
    Extra attributes, particularly target label G3, are strictly rejected with 422.
    """

    student_id: int = Field(..., description="ID of student to predict for")
    academic_record_id: Optional[int] = Field(
        None,
        description="Optional ID of specific recorded academic telemetry. If omitted, evaluates the student's latest record.",
    )
    academic_data: Optional[AcademicRecordCreate] = Field(
        None,
        description="Optional new academic telemetry to record and evaluate in a single step (faculty/admin only).",
    )

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def reject_g3_leakage(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "G3" in data:
                raise ValueError("Target label 'G3' is strictly forbidden as an input feature.")
        return data


class FactorContributionRead(BaseModel):
    """Decomposed SHAP attribution for a single feature."""

    feature: str = Field(..., description="Internal feature matrix column key")
    display_name: str = Field(..., description="Human-readable feature name")
    contribution: float = Field(..., description="Shapley value (log-odds contribution)")
    abs_contribution: float = Field(..., description="Absolute magnitude of contribution")
    direction: str = Field(..., description="'increases_risk' or 'decreases_risk'")
    raw_value: Optional[Union[str, int, float]] = Field(None, description="Observed value of the feature")
    interpretation: str = Field(..., description="Statistical interpretation of feature attribution")


class PredictResponse(BaseModel):
    """Prediction output payload containing dual metrics, SHAP decomposition, and ethical disclaimer."""

    prediction_id: int = Field(..., description="Unique database ID of persisted immutable Prediction record")
    student_id: int = Field(..., description="Associated student ID")
    academic_record_id: Optional[int] = Field(None, description="Associated academic record ID")
    risk_level: str = Field(..., description="Categorized risk triage tier ('Low', 'Medium', 'High')")
    risk_probability: float = Field(..., ge=0.0, le=1.0, description="Predicted risk probability (0.0 to 1.0)")
    at_risk_binary: int = Field(..., ge=0, le=1, description="Binary classification (1: at-risk, 0: not at-risk at threshold 0.50)")
    model_version: str = Field(..., description="Model version tag from Phase 1 metadata (e.g. 'v1.0.0')")
    created_at: datetime = Field(..., description="Timestamp of inference execution (UTC)")
    base_log_odds: float = Field(..., description="Baseline expectation value for the cohort")
    top_factors: List[FactorContributionRead] = Field(..., description="Top contributing factors ranked by absolute magnitude")
    causal_disclaimer: str = Field(..., description="Ethical non-causal interpretation disclaimer")

    model_config = ConfigDict(from_attributes=True)
