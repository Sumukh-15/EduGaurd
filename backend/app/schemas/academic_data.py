"""Pydantic schemas for student academic records and institutional telemetry.

STRICT ANTI-LEAKAGE GUARANTEE:
1. All 32 permissible features (15 numerical, 17 categorical) are defined and validated.
2. G3 is strictly excluded from these schemas.
3. Extra fields are forbidden (`extra = "forbid"`), immediately rejecting any payload
   containing G3 or unrecognized fields with a 422 Unprocessable Entity error.
"""

from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class AcademicRecordBase(BaseModel):
    """32 validated ML input features for student risk telemetry."""

    # 15 Numerical features
    age: int = Field(..., ge=15, le=25, description="Student age in years (15-25)")
    Medu: int = Field(..., ge=0, le=4, description="Mother's education level (0: none to 4: higher education)")
    Fedu: int = Field(..., ge=0, le=4, description="Father's education level (0: none to 4: higher education)")
    traveltime: int = Field(..., ge=1, le=4, description="Home to school travel time (1: <15 min to 4: >1 hour)")
    studytime: int = Field(..., ge=1, le=4, description="Weekly study time (1: <2 hrs to 4: >10 hrs)")
    failures: int = Field(..., ge=0, le=4, description="Number of past class failures (0-4)")
    famrel: int = Field(..., ge=1, le=5, description="Quality of family relationships (1: very bad to 5: excellent)")
    freetime: int = Field(..., ge=1, le=5, description="Free time after school (1: very low to 5: very high)")
    goout: int = Field(..., ge=1, le=5, description="Going out with friends (1: very low to 5: very high)")
    Dalc: int = Field(..., ge=1, le=5, description="Workday alcohol consumption (1: very low to 5: very high)")
    Walc: int = Field(..., ge=1, le=5, description="Weekend alcohol consumption (1: very low to 5: very high)")
    health: int = Field(..., ge=1, le=5, description="Current health status (1: very bad to 5: very good)")
    absences: int = Field(..., ge=0, le=93, description="Number of school absences (0-93)")
    G1: float = Field(..., ge=0.0, le=20.0, description="First period grade (0-20 scale)")
    G2: float = Field(..., ge=0.0, le=20.0, description="Second period grade (0-20 scale)")

    # 17 Categorical features
    school: Literal["GP", "MS"] = Field(..., description="Student's school ('GP' - Gabriel Pereira or 'MS' - Mousinho da Silveira)")
    sex: Literal["F", "M"] = Field(..., description="Student's biological sex ('F' - female or 'M' - male)")
    address: Literal["U", "R"] = Field(..., description="Home address type ('U' - urban or 'R' - rural)")
    famsize: Literal["LE3", "GT3"] = Field(..., description="Family size ('LE3' - <=3 or 'GT3' - >3)")
    Pstatus: Literal["T", "A"] = Field(..., description="Parent's cohabitation status ('T' - together or 'A' - apart)")
    Mjob: Literal["teacher", "health", "services", "at_home", "other"] = Field(..., description="Mother's job category")
    Fjob: Literal["teacher", "health", "services", "at_home", "other"] = Field(..., description="Father's job category")
    reason: Literal["home", "reputation", "course", "other"] = Field(..., description="Reason to choose this school")
    guardian: Literal["mother", "father", "other"] = Field(..., description="Student's primary guardian")
    schoolsup: Literal["yes", "no"] = Field(..., description="Extra educational support")
    famsup: Literal["yes", "no"] = Field(..., description="Family educational support")
    paid: Literal["yes", "no"] = Field(..., description="Extra paid classes within the course subject")
    activities: Literal["yes", "no"] = Field(..., description="Extra-curricular activities")
    nursery: Literal["yes", "no"] = Field(..., description="Attended nursery school")
    higher: Literal["yes", "no"] = Field(..., description="Wants to pursue higher education")
    internet: Literal["yes", "no"] = Field(..., description="Internet access at home")
    romantic: Literal["yes", "no"] = Field(..., description="In a romantic relationship")

    # Anti-leakage and strict schema enforcement
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def reject_g3_leakage(cls, data: Any) -> Any:
        """Reject any payload attempting to supply G3 as an input feature."""
        if isinstance(data, dict):
            if "G3" in data:
                raise ValueError("Target label 'G3' is strictly forbidden as an input feature to prevent data leakage.")
        return data


class AcademicRecordCreate(AcademicRecordBase):
    """Payload for submitting a new academic telemetry record for a student."""

    term: str = Field(default="Term 1", max_length=20, description="Academic period or assessment term")
    data_source: Optional[str] = Field(default="faculty_verified", max_length=50, description="Data provenance: 'faculty_verified' or 'self_reported'")
    subject: Optional[str] = Field(default=None, max_length=100, description="Academic course / subject")
    assessment_name: Optional[str] = Field(default=None, max_length=100, description="Specific assessment name")


class AcademicRecordRead(AcademicRecordBase):
    """Database representation of a recorded academic record."""

    id: int
    student_id: int
    term: str
    recorded_at: datetime
    data_source: Optional[str] = "faculty_verified"
    subject: Optional[str] = None
    assessment_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StudentSelfReportUpdate(BaseModel):
    """Student self-reported study habits update.

    Students cannot edit official faculty-verified grades (G1, G2), absences, or failures.
    These fields capture self-reported weekly study hours and optional support information.
    """

    studytime: int = Field(..., ge=1, le=4, description="Weekly study time (1: <2 hrs, 2: 2-5 hrs, 3: 5-10 hrs, 4: >10 hrs)")
    freetime: Optional[int] = Field(None, ge=1, le=5, description="Free time after school (1: very low to 5: very high)")
    schoolsup: Optional[Literal["yes", "no"]] = Field(None, description="Extra educational support")
    famsup: Optional[Literal["yes", "no"]] = Field(None, description="Family educational support")
    paid: Optional[Literal["yes", "no"]] = Field(None, description="Extra paid classes within the course subject")
    activities: Optional[Literal["yes", "no"]] = Field(None, description="Extra-curricular activities")
    recalculate_risk: bool = Field(default=True, description="Whether to immediately recalculate risk assessment with the new study info")

    model_config = ConfigDict(extra="forbid")


class FacultyAcademicUpdate(BaseModel):
    """Faculty assessment and attendance recording.

    Validates input marks and converts to standard 0-20 scale.
    """

    subject: str = Field(..., min_length=1, max_length=100, description="Subject name (e.g. Mathematics)")
    assessment_name: str = Field(..., min_length=1, max_length=100, description="Assessment name (e.g. Midterm 2)")
    marks: float = Field(..., ge=0.0, description="Marks obtained")
    max_marks: float = Field(default=20.0, gt=0.0, description="Maximum possible marks for this assessment")
    absences: int = Field(..., ge=0, le=93, description="Recorded absences")
    term: Optional[str] = Field(default="Term 2", max_length=20, description="Assessment period / Term")
    recalculate_risk: bool = Field(default=True, description="Whether to immediately run risk prediction")

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def validate_marks(self) -> "FacultyAcademicUpdate":
        if self.marks > self.max_marks:
            raise ValueError(f"Marks ({self.marks}) cannot exceed maximum marks ({self.max_marks}).")
        return self

