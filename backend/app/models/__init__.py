"""EduGuard database models package.

Centralizes all model imports so Base.metadata is fully populated.
"""

from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.prediction import Prediction
from backend.app.models.explanation import Explanation
from backend.app.models.recommendation import Recommendation

__all__ = [
    "User",
    "Student",
    "AcademicRecord",
    "Prediction",
    "Explanation",
    "Recommendation",
]
