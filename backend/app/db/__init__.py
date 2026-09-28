"""Database module for EduGuard backend."""

from backend.app.db.base import Base
from backend.app.db.session import engine, SessionLocal, get_db
import backend.app.models  # noqa: F401 - registers all models on Base.metadata

__all__ = ["Base", "engine", "SessionLocal", "get_db"]
