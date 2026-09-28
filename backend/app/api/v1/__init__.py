"""API v1 router registry."""

from fastapi import APIRouter
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.students import router as students_router
from backend.app.api.v1.predict import router as predict_router
from backend.app.api.v1.faculty import router as faculty_router
from backend.app.api.v1.dataset import router as dataset_router
from backend.app.api.v1.recommendations import router as recommendations_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(students_router)
api_v1_router.include_router(predict_router)
api_v1_router.include_router(faculty_router)
api_v1_router.include_router(dataset_router)
api_v1_router.include_router(recommendations_router)

__all__ = ["api_v1_router"]
