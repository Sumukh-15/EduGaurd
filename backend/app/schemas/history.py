"""Pydantic schemas for student academic trajectories and prediction history."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.academic_data import AcademicRecordRead


class PredictionHistoryItem(BaseModel):
    """Historical machine learning prediction record."""

    id: int = Field(..., description="Unique prediction record ID")
    student_id: int = Field(..., description="Student database ID")
    academic_record_id: Optional[int] = Field(None, description="Linked academic telemetry record ID")
    risk_probability: float = Field(..., description="Predicted risk probability (0.0 to 1.0)")
    risk_level: str = Field(..., description="Risk tier ('Low', 'Medium', 'High')")
    at_risk_binary: int = Field(..., description="Binary classification (1: at risk, 0: safe)")
    model_version: str = Field(..., description="Model version tag used for inference")
    created_at: datetime = Field(..., description="Inference timestamp (UTC)")

    model_config = ConfigDict(from_attributes=True)


class AcademicRecordHistoryItem(AcademicRecordRead):
    """Academic telemetry record with associated predictions."""

    predictions: List[PredictionHistoryItem] = Field(
        default_factory=list,
        description="Predictions evaluated against this academic telemetry record",
    )


class StudentHistoryResponse(BaseModel):
    """Comprehensive longitudinal academic and risk trajectory for a student."""

    student_id: int = Field(..., description="Student database ID")
    student_code: str = Field(..., description="Institutional student code")
    first_name: Optional[str] = Field(None, description="Student given name")
    last_name: Optional[str] = Field(None, description="Student family name")
    cohort_year: Optional[int] = Field(None, description="Enrolled cohort year")
    school: Optional[str] = Field(None, description="Enrolled school code")
    total_records: int = Field(..., description="Total chronological academic telemetry records")
    total_predictions: int = Field(..., description="Total append-only predictions recorded over time")
    academic_records: List[AcademicRecordHistoryItem] = Field(
        default_factory=list,
        description="Chronological sequence of academic telemetry records",
    )
    predictions: List[PredictionHistoryItem] = Field(
        default_factory=list,
        description="Chronological sequence of all predictions generated for this student",
    )
    latest_prediction: Optional[PredictionHistoryItem] = Field(
        None,
        description="Most recent risk evaluation, or null if no predictions exist",
    )

    model_config = ConfigDict(from_attributes=True)
