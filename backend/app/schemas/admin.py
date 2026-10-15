"""Pydantic schemas for administrative user management, model inspection, usage metrics, and audit logs."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminUserRead(BaseModel):
    """Safe user profile for administrative inspection.

    STRICT SECURITY:
    Never expose password, password_hash, or token information.
    """

    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserListResponse(BaseModel):
    """Paginated collection of user accounts for admin triage."""

    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[AdminUserRead]
    users: Optional[List[AdminUserRead]] = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserCreateRequest(BaseModel):
    """Payload for administrative user account provisioning."""

    email: EmailStr
    password: str = Field(..., min_length=8, description="Initial account password (hashed before persistence)")
    full_name: Optional[str] = Field(default="", max_length=255, description="Full name or institutional display name")
    role: Literal["admin", "faculty", "student"] = Field(..., description="Role-based access level")
    is_active: bool = Field(default=True, description="Initial account activation state")

    model_config = ConfigDict(extra="forbid")


class AdminUserUpdateRequest(BaseModel):
    """Payload for modifying user account status."""

    is_active: bool = Field(..., description="Target activation status")

    model_config = ConfigDict(extra="forbid")


class ModelInfoResponse(BaseModel):
    """Complete machine learning model provenance, configuration, and validation metrics."""

    model_name: str
    model_version: str
    algorithm: str
    selected_model: Optional[str] = None
    training_date: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    decision_threshold: float = 0.5
    classification_threshold: float = 0.5
    risk_thresholds: Optional[Dict[str, Any]] = None
    raw_feature_count: int = 32
    feature_count: int = 32
    transformed_feature_count: int = 62
    raw_features: List[str] = Field(default_factory=list)
    feature_names: List[str] = Field(default_factory=list)
    engineered_features: List[str] = Field(default_factory=list)
    transformed_features: List[str] = Field(default_factory=list)
    excluded_features: List[str] = Field(default_factory=lambda: ["G3"])
    tuned_hyperparameters: Optional[Dict[str, Any]] = None
    artifact_info: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class SystemUsageResponse(BaseModel):
    """Institutional system telemetry and workload metrics."""

    total_users: int
    users_by_role: Dict[str, int]
    active_users: int
    inactive_users: int
    total_students: int
    total_academic_records: int
    predictions_last_7_days: int
    predictions_last_30_days: int
    dataset_uploads: int
    total_dataset_uploads: int
    total_audit_logs: int

    model_config = ConfigDict(from_attributes=True)


class AuditLogRead(BaseModel):
    """Safe audit trail entry representation."""

    id: int
    actor_user_id: Optional[int]
    actor_email: Optional[str] = None
    action: str
    target: str
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    """Paginated collection of audit log entries."""

    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[AuditLogRead]

    model_config = ConfigDict(from_attributes=True)
