"""Pydantic schemas for student profile management."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class StudentBase(BaseModel):
    """Base student attributes."""

    student_code: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Canonical institutional student identifier (e.g., STU-1001)",
    )
    first_name: Optional[str] = Field(None, max_length=100, description="Student given name")
    last_name: Optional[str] = Field(None, max_length=100, description="Student family name")
    cohort_year: Optional[int] = Field(None, ge=1900, le=2100, description="Matriculation cohort year")
    school: Optional[str] = Field(None, max_length=10, description="Institutional school code (e.g., GP, MS)")


class StudentCreate(StudentBase):
    """Schema for creating a new student profile."""

    user_id: Optional[int] = Field(None, description="Optional foreign key to users.id")


class StudentUpdate(BaseModel):
    """Schema for updating permitted student profile attributes.

    Note: `student_code` is the canonical immutable identifier and cannot be modified.
    `user_id` linkage is managed by administrative provisioning.
    """

    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    cohort_year: Optional[int] = Field(None, ge=1900, le=2100)
    school: Optional[str] = Field(None, max_length=10)

    model_config = ConfigDict(extra="forbid")


class StudentRead(BaseModel):
    """Public/authorized student profile read representation."""

    id: int
    student_code: str
    user_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    cohort_year: Optional[int] = None
    school: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentDetailRead(StudentRead):
    """Detailed student profile including linked user account metadata."""

    email: Optional[str] = None
    full_name: Optional[str] = None
