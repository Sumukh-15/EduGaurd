"""Pydantic schemas for faculty cohort analytics and aggregate monitoring."""

from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict, Field


class RiskDistribution(BaseModel):
    """Counts of evaluated students within each risk triage category."""

    low: int = Field(0, description="Students in Low risk tier (< 40%)")
    medium: int = Field(0, description="Students in Medium risk tier (40% - 69.9%)")
    high: int = Field(0, description="Students in High risk tier (>= 70%)")


class RiskPercentages(BaseModel):
    """Proportion of evaluated students within each risk triage category."""

    low: float = Field(0.0, description="Percentage of evaluated students in Low risk tier")
    medium: float = Field(0.0, description="Percentage of evaluated students in Medium risk tier")
    high: float = Field(0.0, description="Percentage of evaluated students in High risk tier")


class SchoolDistribution(BaseModel):
    """Aggregate breakdown by educational institution."""

    school: str = Field(..., description="School code identifier (e.g. 'GP' or 'MS')")
    student_count: int = Field(..., description="Total enrolled students in this school")
    evaluated_count: int = Field(..., description="Students with at least one prediction")
    at_risk_count: int = Field(..., description="Students currently classified as at-risk (binary threshold 0.50)")


class FacultyAnalyticsResponse(BaseModel):
    """Aggregate, non-identifying cohort analytics for institutional faculty monitoring.

    STRICT PRIVACY GUARANTEE:
    This schema contains strictly anonymized macro-level distributions and averages.
    No student-identifying attributes (names, codes, emails, or individual features)
    are exposed in this response.
    """

    total_students: int = Field(..., description="Total enrolled students across the institution")
    evaluated_students: int = Field(..., description="Distinct students with at least one risk evaluation")
    unevaluated_students: int = Field(..., description="Students without any risk evaluations")
    total_predictions: int = Field(..., description="Total append-only predictions stored across all students")
    at_risk_count: int = Field(..., description="Count of evaluated students currently classified at-risk")
    at_risk_percentage: float = Field(..., description="Percentage of evaluated students currently at-risk (0.0 to 100.0)")
    average_risk_probability: float = Field(..., description="Average predicted risk probability across evaluated students")
    risk_distribution: RiskDistribution = Field(..., description="Counts per risk triage category")
    risk_percentages: RiskPercentages = Field(..., description="Percentages per risk triage category")
    school_distribution: List[SchoolDistribution] = Field(
        default_factory=list,
        description="Aggregate statistics partitioned by school",
    )
    model_version: str = Field("v1.0.0", description="Active prediction model version tag")
    generated_at: datetime = Field(..., description="UTC timestamp of analytics computation")

    model_config = ConfigDict(from_attributes=True)
