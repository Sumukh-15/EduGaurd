"""Pydantic schemas for faculty student directory browsing and risk triage."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FacultyStudentItem(BaseModel):
    """Student roster entry for faculty risk triage."""

    id: int = Field(..., description="Student database identifier")
    student_code: str = Field(..., description="Institutional student code (e.g. STU-1001)")
    school: Optional[str] = Field(None, description="School code (e.g. GP, MS)")
    latest_risk_level: Optional[str] = Field(
        None, description="Latest evaluated risk tier ('Low', 'Medium', 'High') or null"
    )
    latest_risk_probability: Optional[float] = Field(
        None, description="Latest evaluated risk probability (0.0 to 1.0) or null"
    )
    latest_prediction_date: Optional[datetime] = Field(
        None, description="Timestamp of the latest prediction in UTC or null"
    )
    top_factor_label: Optional[str] = Field(
        None, description="Top SHAP contributing feature display name or null"
    )
    evaluated: bool = Field(
        ..., description="True if student has at least one prediction evaluated, False otherwise"
    )

    model_config = ConfigDict(from_attributes=True)


class FacultyStudentsListResponse(BaseModel):
    """Paginated list response for faculty student browsing."""

    total: int = Field(..., description="Total matching student records")
    page: int = Field(..., description="Current page number (1-indexed)")
    page_size: int = Field(..., description="Number of items per page")
    items: List[FacultyStudentItem] = Field(..., description="List of student items")

    model_config = ConfigDict(from_attributes=True)
