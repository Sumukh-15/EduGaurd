"""Tests for backend health check endpoint and scaffold configuration."""

import pytest
from backend.app.core.config import settings


def test_health_endpoint_success(client):
    """Verify that /api/health returns 200 OK with correct schema and model status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert data["app_name"] == settings.PROJECT_NAME
    assert data["version"] == settings.VERSION
    assert data["environment"] == "testing"
    assert data["model_loaded"] is True


def test_health_endpoint_schema_keys(client):
    """Verify exact keys returned by the health endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()

    expected_keys = {"status", "app_name", "version", "environment", "model_loaded"}
    assert set(data.keys()) == expected_keys


def test_health_endpoint_does_not_expose_secrets(client):
    """Verify that no secrets, database URLs, or sensitive internal paths are leaked."""
    response = client.get("/api/health")
    assert response.status_code == 200

    raw_text = response.text.lower()

    # Verify secrets and database connection strings are absent
    assert settings.SECRET_KEY.lower() not in raw_text
    assert "postgresql://" not in raw_text
    assert "password" not in raw_text
    assert "secret" not in raw_text

    # Verify server internal filesystem root paths are not leaked
    assert "c:\\" not in raw_text
    assert "/users/" not in raw_text
    assert "/home/" not in raw_text


def test_health_endpoint_degraded_when_model_missing(client, monkeypatch):
    """Verify that health check reports 'degraded' when ML model artifacts are missing."""
    import backend.app.main as main_module

    # Simulate missing ML artifacts
    monkeypatch.setattr(main_module, "check_model_availability", lambda: False)

    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "degraded"
    assert data["model_loaded"] is False
    assert data["app_name"] == settings.PROJECT_NAME


def test_root_endpoint(client):
    """Verify the root endpoint redirects/guides consumers to docs and health check."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()

    assert "docs_url" in data
    assert data["health_url"] == "/api/health"
    assert "version" in data


def test_cors_settings_parsing():
    """Verify that ALLOWED_ORIGINS correctly handles string and list representations."""
    from backend.app.core.config import Settings

    custom_settings = Settings(
        ALLOWED_ORIGINS="http://localhost:3000, http://example.com"
    )
    assert custom_settings.ALLOWED_ORIGINS == [
        "http://localhost:3000",
        "http://example.com",
    ]
