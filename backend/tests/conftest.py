"""Pytest fixtures for backend testing."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.db.base import Base
import backend.app.models  # Ensure all models are registered on Base.metadata


@pytest.fixture(scope="session", autouse=True)
def set_testing_env():
    """Configure environment variables for testing."""
    original_env = settings.ENVIRONMENT
    settings.ENVIRONMENT = "testing"
    yield
    settings.ENVIRONMENT = original_env


@pytest.fixture(scope="module")
def client():
    """Create a FastAPI test client fixture with lifespan events active."""
    with TestClient(app) as test_client:
        yield test_client


from backend.app.db.session import get_db

@pytest.fixture(scope="function")
def test_client(db_session: Session):
    """Create a FastAPI test client with get_db overridden by isolated db_session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as tc:
        yield tc
    app.dependency_overrides.clear()


from sqlalchemy.pool import StaticPool

@pytest.fixture(scope="function")
def db_session() -> Session:
    """Create an isolated in-memory SQLite database session for unit testing."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Enable foreign key constraints in SQLite
    @event.listens_for(test_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Create all tables
    Base.metadata.create_all(bind=test_engine)

    TestSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
        class_=Session,
    )
    session = TestSessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()
