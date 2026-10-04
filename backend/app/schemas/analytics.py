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


class ClassAverages(BaseModel):
    """Cohort academic telemetry averages based on each student's latest academic record."""

    avg_g1: float = Field(0.0, description="Average Period 1 Grade (G1)")
    avg_g2: float = Field(0.0, description="Average Period 2 Grade (G2)")
    avg_grade_velocity: float = Field(0.0, description="Average Grade Velocity (G2 - G1)")
    avg_absences: float = Field(0.0, description="Average Absences")
    chronic_absenteeism_pct: float = Field(0.0, description="Percentage of students with absences >= 10")
    failures_pct: float = Field(0.0, description="Percentage of students with failures > 0")
    total_students_with_records: int = Field(0, description="Total students with telemetry evaluated")


class RiskTrendPoint(BaseModel):
    """Point-in-time risk distribution snapshot across prediction date buckets."""

    date: str = Field(..., description="Bucket date (YYYY-MM-DD)")
    low: int = Field(0, description="Low-risk students (<40%) as of this date")
    medium: int = Field(0, description="Medium-risk students (40-69.9%) as of this date")
    high: int = Field(0, description="High-risk students (>=70%) as of this date")
    total_evaluated: int = Field(0, description="Cumulative evaluated students as of this date")


class WorseningStudentItem(BaseModel):
    """Student whose latest risk probability worsened by >= 0.15 compared to prior prediction."""

    student_id: int = Field(..., description="Student ID")
    student_code: str = Field(..., description="Student code")
    previous_risk_probability: float = Field(..., description="Risk probability of previous prediction")
    latest_risk_probability: float = Field(..., description="Risk probability of latest prediction")
    risk_delta: float = Field(..., description="Increase in risk probability (latest - previous)")
    previous_risk_level: str = Field(..., description="Risk tier of previous prediction")
    latest_risk_level: str = Field(..., description="Risk tier of latest prediction")


class FacultyAnalyticsResponse(BaseModel):
    """Aggregate, non-identifying cohort analytics for institutional faculty monitoring.

    STRICT PRIVACY GUARANTEE:
    This schema contains strictly anonymized macro-level distributions and averages.
    No student-identifying attributes (names, codes, emails, or individual features)
    are exposed in top-level attributes.
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
    class_averages: ClassAverages = Field(
        default_factory=ClassAverages,
        description="Class-level academic performance averages across latest records",
    )
    risk_trend: List[RiskTrendPoint] = Field(
        default_factory=list,
        description="Time series of class risk triage counts over prediction date buckets",
    )
    students_worsening_count: int = Field(
        0,
        description="Count of students whose latest risk probability increased by >= 0.15 vs previous",
    )
    students_worsening: List[WorseningStudentItem] = Field(
        default_factory=list,
        description="List of students with deteriorating risk trajectories (>= +0.15 risk probability)",
    )
    model_version: str = Field("v1.1.0", description="Active prediction model version tag")
    generated_at: datetime = Field(..., description="UTC timestamp of analytics computation")

    model_config = ConfigDict(from_attributes=True)


class FacultyAnalyticsTrendsResponse(BaseModel):
    """Dedicated response for risk trends, class averages, and worsening student metrics."""

    bucket: str = Field("day", description="Aggregation bucket used ('day' or 'week')")
    risk_trend: List[RiskTrendPoint] = Field(default_factory=list)
    class_averages: ClassAverages = Field(default_factory=ClassAverages)
    students_worsening_count: int = Field(0)
    students_worsening: List[WorseningStudentItem] = Field(default_factory=list)
    generated_at: datetime = Field(..., description="UTC timestamp of computation")

    model_config = ConfigDict(from_attributes=True)
