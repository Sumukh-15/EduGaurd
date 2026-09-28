"""Pydantic schemas for deterministic rule-based recommendations."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RecommendationBase(BaseModel):
    """Base schema for an individual recommendation item."""

    title: str = Field(..., description="Actionable title for the intervention")
    description: str = Field(..., description="Supportive intervention guidance for human advisors")
    category: str = Field(..., description="Domain: Academic Progress, Academic Remediation, Attendance, Study Strategy")
    priority: str = Field(..., description="Triage priority level: high, medium, low")
    trigger_condition: Optional[str] = Field(None, description="Deterministic rule identifier that triggered this recommendation")


class RecommendationRead(RecommendationBase):
    """Schema for returning a persisted recommendation record."""

    id: int
    student_id: int
    prediction_id: Optional[int] = None
    is_acknowledged: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentRecommendationsResponse(BaseModel):
    """Response payload for GET /api/recommendations/{student_id}."""

    student_id: int
    student_code: str
    prediction_id: Optional[int] = None
    academic_record_id: Optional[int] = None
    risk_level: Optional[str] = None
    risk_probability: Optional[float] = None
    total_recommendations: int
    recommendations: List[RecommendationRead]
    advisory_notice: str = Field(
        default=(
            "Recommendations are rule-based, non-causal decision-support guidance derived from heuristic "
            "thresholds on observed academic telemetry. They do not constitute deterministic causal conclusions "
            "or automated punitive sanctions. All interventions require evaluation and contextual validation "
            "by a certified human advisor or instructor."
        ),
        description="Mandatory non-causal advisory notice",
    )
