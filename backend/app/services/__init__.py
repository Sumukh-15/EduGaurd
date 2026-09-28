"""EduGuard backend services package."""

from backend.app.services.ml_service import ml_service, MLModelUnavailableException
from backend.app.services.recommendation_service import recommendation_service, RecommendationService

__all__ = ["ml_service", "MLModelUnavailableException", "recommendation_service", "RecommendationService"]
