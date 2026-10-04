"""Application configuration management using Pydantic Settings.

Environment variables are loaded from the environment and optionally from a .env file.
Secrets are kept strictly out of source control.
"""

from pathlib import Path
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root directory (3 levels up from this file: backend/app/core/ -> backend/app/ -> backend/ -> root)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    """EduGuard backend configuration settings."""

    # Project metadata
    PROJECT_NAME: str = "EduGuard API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Security & JWT
    SECRET_KEY: str = "dev_secret_key_change_in_production_f7a8c9b2e1d045a6"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Database configuration
    DATABASE_URL: str = "postgresql://eduguard:eduguard_secret@localhost:5432/eduguard_db"

    # CORS configuration
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Machine Learning artifact paths (relative to project root or absolute)
    MODEL_PATH: str = "ml/artifacts/model_v1_1.joblib"
    METADATA_PATH: str = "ml/artifacts/model_metadata.json"

    # Configurable risk thresholds
    RISK_LOW_MAX: float = 0.40
    RISK_HIGH_MIN: float = 0.70
    BINARY_THRESHOLD: float = 0.50

    # Pydantic Settings configuration
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_risk_thresholds(self) -> "Settings":
        """Validate risk threshold bounds and low < high ordering."""
        if not (0.0 <= self.RISK_LOW_MAX < self.RISK_HIGH_MIN <= 1.0):
            raise ValueError(
                f"Invalid risk thresholds: RISK_LOW_MAX ({self.RISK_LOW_MAX}) must be strictly less than "
                f"RISK_HIGH_MIN ({self.RISK_HIGH_MIN}) and both must lie in [0.0, 1.0]."
            )
        if not (0.0 <= self.BINARY_THRESHOLD <= 1.0):
            raise ValueError(
                f"Invalid BINARY_THRESHOLD ({self.BINARY_THRESHOLD}): must lie in [0.0, 1.0]."
            )
        return self

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse comma-separated origin strings or preserve list of origins."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, (list, tuple)):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return v

    @property
    def is_production(self) -> bool:
        """Check if environment is production."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_testing(self) -> bool:
        """Check if environment is testing."""
        return self.ENVIRONMENT.lower() == "testing"

    @property
    def resolved_model_path(self) -> Path:
        """Resolve model artifact path against project root if relative."""
        p = Path(self.MODEL_PATH)
        return p if p.is_absolute() else (PROJECT_ROOT / p)

    @property
    def resolved_metadata_path(self) -> Path:
        """Resolve metadata artifact path against project root if relative."""
        p = Path(self.METADATA_PATH)
        return p if p.is_absolute() else (PROJECT_ROOT / p)


# Singleton settings instance
settings = Settings()
