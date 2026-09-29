"""Pydantic schemas for mentor-student assignments."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AssignmentCreateRequest(BaseModel):
    """Schema for assigning students to a faculty mentor."""

    faculty_user_id: int = Field(..., description="User ID of the faculty member")
    student_ids: List[int] = Field(..., min_length=1, description="List of student database IDs to assign")


class AssignmentItem(BaseModel):
    """Schema for a single mentor assignment record."""

    id: int = Field(..., description="Unique assignment record ID")
    faculty_user_id: int = Field(..., description="Faculty user database ID")
    student_id: int = Field(..., description="Student database ID")
    student_code: Optional[str] = Field(None, description="Assigned student institutional code")
    created_at: datetime = Field(..., description="Assignment timestamp in UTC")

    model_config = ConfigDict(from_attributes=True)


class AssignmentListResponse(BaseModel):
    """Schema for listing mentor assignments."""

    total: int = Field(..., description="Total count of mentor assignments")
    items: List[AssignmentItem] = Field(..., description="List of mentor assignment items")

    model_config = ConfigDict(from_attributes=True)
