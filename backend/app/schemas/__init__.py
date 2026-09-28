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
]
