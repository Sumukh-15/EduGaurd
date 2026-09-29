"""EduGuard Pydantic schemas package."""

from backend.app.schemas.auth import LoginRequest, TokenPayload, TokenResponse, UserRead
from backend.app.schemas.student import (
    StudentBase,
    StudentCreate,
    StudentDetailRead,
    StudentRead,
    StudentUpdate,
)
from backend.app.schemas.academic_data import (
    AcademicRecordBase,
    AcademicRecordCreate,
    AcademicRecordRead,
)
from backend.app.schemas.prediction import (
    PredictRequest,
    PredictResponse,
    FactorContributionRead,
)
from backend.app.schemas.recommendation import (
    RecommendationBase,
    RecommendationRead,
    StudentRecommendationsResponse,
)

from backend.app.schemas.faculty_students import (
    FacultyStudentItem,
    FacultyStudentsListResponse,
)
from backend.app.schemas.assignment import (
    AssignmentCreateRequest,
    AssignmentItem,
    AssignmentListResponse,
)

__all__ = [
    "LoginRequest",
    "TokenPayload",
    "TokenResponse",
    "UserRead",
    "StudentBase",
    "StudentCreate",
    "StudentDetailRead",
    "StudentRead",
    "StudentUpdate",
    "AcademicRecordBase",
    "AcademicRecordCreate",
    "AcademicRecordRead",
    "PredictRequest",
    "PredictResponse",
    "FactorContributionRead",
    "RecommendationBase",
    "RecommendationRead",
    "StudentRecommendationsResponse",
    "FacultyStudentItem",
    "FacultyStudentsListResponse",
    "AssignmentCreateRequest",
    "AssignmentItem",
    "AssignmentListResponse",
]
