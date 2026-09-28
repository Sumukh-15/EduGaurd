"""FastAPI application entrypoint for the EduGuard backend service.

Provides application lifecycle management, CORS configuration,
global middleware, and the /api/health monitoring endpoint.
"""

from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import OperationalError

from backend.app.core.config import settings

# Setup logger
logger = logging.getLogger("eduguard.backend")
logging.basicConfig(level=logging.INFO if not settings.DEBUG else logging.DEBUG)


def check_model_availability() -> bool:
    """Verify that Phase 1 ML model and metadata artifacts exist and are accessible."""
    model_exists = settings.resolved_model_path.is_file()
    metadata_exists = settings.resolved_metadata_path.is_file()
    return bool(model_exists and metadata_exists)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager to verify resources on startup."""
    logger.info("Starting up %s (v%s, env=%s)...", settings.PROJECT_NAME, settings.VERSION, settings.ENVIRONMENT)

    # Check ML artifact availability and initialize MLService
    from backend.app.services import ml_service
    if check_model_availability():
        ml_service.load_artifacts()
    app.state.model_available = ml_service.is_ready

    if ml_service.is_ready:
        logger.info("ML model and SHAP explainer ready for inference (version=%s).", ml_service.model_version)
    else:
        logger.warning(
            "ML model artifacts not found or failed to load. Inference endpoints will return 503 Service Unavailable."
        )

    yield

    logger.info("Shutting down %s...", settings.PROJECT_NAME)


# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Explainable AI-Based Early Warning System for Student Academic Risk API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(OperationalError)
async def db_operational_error_handler(request: Request, exc: OperationalError) -> JSONResponse:
    """Handle database connection and authentication failures gracefully."""
    logger.error("Database connection failure on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database service unavailable. Please verify that your database server is running and credentials in .env are configured."
        },
    )


from backend.app.services.ml_service import MLModelUnavailableException

@app.exception_handler(MLModelUnavailableException)
async def ml_unavailable_handler(request: Request, exc: MLModelUnavailableException) -> JSONResponse:
    """Handle missing or corrupted machine learning artifacts gracefully."""
    logger.error("ML model unavailable on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": str(exc)},
    )


# Health check response schema
class HealthResponse(BaseModel):
    """Health check response schema.

    Exposes operational availability without leaking sensitive credentials,
    database connection strings, or internal system paths.
    """

    status: str
    app_name: str
    version: str
    environment: str
    model_loaded: bool


@app.get(
    f"{settings.API_V1_PREFIX}/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Service Health Check",
    description="Reports the operational status of the API and the availability of the machine learning model.",
)
async def health_check() -> HealthResponse:
    """Return current service health and model readiness without leaking secrets."""
    model_ready = check_model_availability()
    return HealthResponse(
        status="ok" if model_ready else "degraded",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        model_loaded=model_ready,
    )


from backend.app.api.v1 import api_v1_router

# Mount API routers
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["System"], include_in_schema=False)
async def root():
    """Root endpoint welcoming clients and directing them to docs and health status."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs_url": "/docs",
        "health_url": f"{settings.API_V1_PREFIX}/health",
        "version": settings.VERSION,
    }
