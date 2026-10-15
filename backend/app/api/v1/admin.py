"""Admin endpoints for user provisioning, role management, model inspection, system monitoring, and mentor assignments."""

from datetime import datetime, timedelta, timezone
import json
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db, require_roles
from backend.app.core.config import settings
from backend.app.core.security import get_password_hash
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.assignment import MentorAssignment
from backend.app.models.audit_log import AuditLog
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.admin import (
    AdminUserCreateRequest,
    AdminUserListResponse,
    AdminUserRead,
    AdminUserUpdateRequest,
    AuditLogListResponse,
    AuditLogRead,
    ModelInfoResponse,
    SystemUsageResponse,
)
from backend.app.schemas.assignment import (
    AssignmentCreateRequest,
    AssignmentItem,
    AssignmentListResponse,
)
from backend.app.services.audit_service import log_audit_event
from backend.app.services.ml_service import ml_service

router = APIRouter(prefix="/admin", tags=["admin"])


# =====================================================================
# 1. USER MANAGEMENT ENDPOINTS
# =====================================================================

@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="List Users",
    description="Retrieve paginated list of user accounts with optional role filtering. Passwords and hashes are strictly excluded.",
    dependencies=[Depends(require_roles("admin"))],
)
def get_users(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    role: Optional[str] = Query(None, description="Optional role filter: admin, faculty, or student"),
    db: Session = Depends(get_db),
) -> AdminUserListResponse:
    """Return paginated, safe user representations."""
    query = db.query(User)

    if role:
        normalized_role = role.lower().strip()
        if normalized_role in ("admin", "faculty", "student"):
            query = query.filter(User.role == normalized_role)

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size)) if total > 0 else 1

    users = (
        query.order_by(User.created_at.desc(), User.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [AdminUserRead.model_validate(u) for u in users]
    return AdminUserListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items,
        users=items,
    )


@router.post(
    "/users",
    response_model=AdminUserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create User",
    description="Provision a new user account with hashed password and role-based permissions. Logs an audit trail.",
)
def create_user(
    payload: AdminUserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> AdminUserRead:
    """Create a user with bcrypt-hashed credentials and generate an audit log."""
    normalized_email = payload.email.lower().strip()

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    name_str = (payload.full_name or "").strip() or normalized_email.split("@")[0]
    hashed_pw = get_password_hash(payload.password)
    new_user = User(
        email=normalized_email,
        hashed_password=hashed_pw,
        full_name=name_str,
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(new_user)
    db.flush()

    # If new user is a student, ensure linked Student entity exists
    if payload.role == "student":
        student_code = f"STU-{1000 + new_user.id}"
        name_parts = name_str.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        student = Student(
            student_code=student_code,
            user_id=new_user.id,
            first_name=first_name,
            last_name=last_name,
            school="GP",
            cohort_year=datetime.now(timezone.utc).year,
        )
        db.add(student)
        db.flush()

    # Log audit event (NEVER store password or hash in audit logs)
    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        action="user_created",
        target=f"user_id={new_user.id}, email={new_user.email}",
        details=f"Created user with role={new_user.role}, is_active={new_user.is_active}",
    )

    db.commit()
    db.refresh(new_user)
    return AdminUserRead.model_validate(new_user)


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserRead,
    summary="Update User Status",
    description="Deactivate or reactivate a user account. Admins cannot deactivate their own accounts.",
)
def update_user_status(
    user_id: int,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> AdminUserRead:
    """Deactivate or reactivate a user account."""
    if current_user.id == user_id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    previous_state = target_user.is_active
    target_user.is_active = payload.is_active
    db.flush()

    if previous_state != payload.is_active:
        action = "user_reactivated" if payload.is_active else "user_deactivated"
        log_audit_event(
            db=db,
            actor_user_id=current_user.id,
            action=action,
            target=f"user_id={target_user.id}, email={target_user.email}",
            details=f"Status changed from is_active={previous_state} to is_active={payload.is_active}",
        )

    db.commit()
    db.refresh(target_user)
    return AdminUserRead.model_validate(target_user)


# =====================================================================
# 2. MODEL INFORMATION ENDPOINT
# =====================================================================

@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="Machine Learning Model Information",
    description="Inspect model metadata, training configuration, threshold bounds, and validation metrics.",
    dependencies=[Depends(require_roles("admin"))],
)
def get_model_info() -> ModelInfoResponse:
    """Return model metadata and validation metrics from disk/memory."""
    metadata = {}
    if settings.resolved_metadata_path.exists():
        try:
            with open(settings.resolved_metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except Exception:
            metadata = ml_service.metadata or {}
    else:
        metadata = ml_service.metadata or {}

    metrics = None
    metrics_path = settings.PROJECT_ROOT / "ml" / "reports" / "selected_model_test_metrics.json"
    if metrics_path.exists():
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                metrics = json.load(f)
        except Exception:
            metrics = None
    if not metrics and "validation_metrics" in metadata:
        metrics = metadata["validation_metrics"]

    schema = metadata.get("schema", {})
    raw_feats = schema.get("raw_input_features", [])
    raw_cnt = schema.get("raw_feature_count", len(raw_feats) if raw_feats else 32)
    thresh = float(metadata.get("risk_thresholds", {}).get("binary_decision_threshold", settings.BINARY_THRESHOLD))
    return ModelInfoResponse(
        model_name=metadata.get("model_name", "EduGuard Student Academic Risk Classifier"),
        model_version=metadata.get("model_version", "v1.1.0"),
        algorithm=metadata.get("algorithm", "Logistic Regression with L1 Regularization"),
        selected_model=metadata.get("selected_model", "Logistic Regression"),
        training_date=metadata.get("created_at_utc"),
        metrics=metrics,
        decision_threshold=thresh,
        classification_threshold=thresh,
        risk_thresholds=metadata.get("risk_thresholds")
        or {
            "low": settings.RISK_LOW_MAX,
            "high": settings.RISK_HIGH_MIN,
            "binary": settings.BINARY_THRESHOLD,
        },
        raw_feature_count=raw_cnt,
        feature_count=raw_cnt,
        transformed_feature_count=schema.get("transformed_feature_count", 62),
        raw_features=raw_feats,
        feature_names=raw_feats,
        engineered_features=schema.get("engineered_features", []),
        transformed_features=schema.get("transformed_features", []),
        excluded_features=schema.get("excluded_features", ["G3"]),
        tuned_hyperparameters=metadata.get("tuned_hyperparameters"),
        artifact_info={
            "model_path": str(settings.MODEL_PATH),
            "metadata_path": str(settings.METADATA_PATH),
            "environment": metadata.get("environment"),
        },
    )


# =====================================================================
# 3. SYSTEM USAGE / MONITORING ENDPOINT
# =====================================================================

@router.get(
    "/usage",
    response_model=SystemUsageResponse,
    summary="System Telemetry & Workload Metrics",
    description="Aggregated database telemetry on user accounts, student cohorts, evaluation volume, and datasets.",
    dependencies=[Depends(require_roles("admin"))],
)
def get_system_usage(db: Session = Depends(get_db)) -> SystemUsageResponse:
    """Return live system telemetry and activity statistics."""
    total_users = db.query(func.count(User.id)).scalar() or 0

    role_counts = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    users_by_role = {"admin": 0, "faculty": 0, "student": 0}
    for r, count in role_counts:
        users_by_role[r] = count

    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    inactive_users = db.query(func.count(User.id)).filter(User.is_active == False).scalar() or 0

    total_students = db.query(func.count(Student.id)).scalar() or 0
    total_academic_records = db.query(func.count(AcademicRecord.id)).scalar() or 0

    now_utc = datetime.now(timezone.utc)
    seven_days_ago = now_utc - timedelta(days=7)
    thirty_days_ago = now_utc - timedelta(days=30)

    predictions_last_7_days = (
        db.query(func.count(Prediction.id))
        .filter(Prediction.created_at >= seven_days_ago)
        .scalar()
        or 0
    )
    predictions_last_30_days = (
        db.query(func.count(Prediction.id))
        .filter(Prediction.created_at >= thirty_days_ago)
        .scalar()
        or 0
    )

    dataset_uploads = (
        db.query(func.count(AuditLog.id))
        .filter(AuditLog.action == "dataset_upload")
        .scalar()
        or 0
    )
    total_audit_logs = db.query(func.count(AuditLog.id)).scalar() or 0

    return SystemUsageResponse(
        total_users=total_users,
        users_by_role=users_by_role,
        active_users=active_users,
        inactive_users=inactive_users,
        total_students=total_students,
        total_academic_records=total_academic_records,
        predictions_last_7_days=predictions_last_7_days,
        predictions_last_30_days=predictions_last_30_days,
        dataset_uploads=dataset_uploads,
        total_dataset_uploads=dataset_uploads,
        total_audit_logs=total_audit_logs,
    )


# =====================================================================
# 4. AUDIT LOGS RETRIEVAL ENDPOINT
# =====================================================================

@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="List Audit Logs",
    description="Retrieve paginated audit logs for administrative security monitoring.",
    dependencies=[Depends(require_roles("admin"))],
)
def get_audit_logs(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    """Return paginated audit log entries."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action.strip())

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size)) if total > 0 else 1

    entries = (
        query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for log in entries:
        actor_email = log.actor.email if log.actor else None
        items.append(
            AuditLogRead(
                id=log.id,
                actor_user_id=log.actor_user_id,
                actor_email=actor_email,
                action=log.action,
                target=log.target,
                details=log.details,
                created_at=log.created_at,
            )
        )

    return AuditLogListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items,
    )


# =====================================================================
# 5. MENTOR ASSIGNMENT ENDPOINTS (WITH AUDIT LOGGING)
# =====================================================================

@router.post(
    "/assignments",
    response_model=AssignmentListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign students to a faculty mentor",
)
def create_assignments(
    payload: AssignmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
) -> AssignmentListResponse:
    """Assign multiple students to a faculty mentor (Admin only) with audit logging."""
    faculty = db.query(User).filter(User.id == payload.faculty_user_id).first()
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Faculty user with ID {payload.faculty_user_id} not found.",
        )
    if faculty.role not in ("faculty", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with ID {payload.faculty_user_id} is not a faculty member or administrator.",
        )

    students = db.query(Student).filter(Student.id.in_(payload.student_ids)).all()
    existing_student_ids = {s.id for s in students}
    missing_ids = set(payload.student_ids) - existing_student_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student ID(s) not found: {sorted(list(missing_ids))}",
        )

    student_code_map = {s.id: s.student_code for s in students}
    created_items = []

    for sid in payload.student_ids:
        assignment = (
            db.query(MentorAssignment)
            .filter(
                MentorAssignment.faculty_user_id == payload.faculty_user_id,
                MentorAssignment.student_id == sid,
            )
            .first()
        )
        if not assignment:
            assignment = MentorAssignment(
                faculty_user_id=payload.faculty_user_id,
                student_id=sid,
            )
            db.add(assignment)
            db.flush()

        created_items.append(
            AssignmentItem(
                id=assignment.id,
                faculty_user_id=assignment.faculty_user_id,
                student_id=assignment.student_id,
                student_code=student_code_map.get(assignment.student_id),
                created_at=assignment.created_at,
            )
        )

    # Log audit event for assignment changes
    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        action="assignment_created",
        target=f"faculty_id={payload.faculty_user_id}, faculty_email={faculty.email}",
        details=f"Assigned {len(created_items)} student(s): {payload.student_ids}",
    )

    db.commit()
    return AssignmentListResponse(total=len(created_items), items=created_items)


@router.delete(
    "/assignments/{id}",
    summary="Delete a mentor assignment",
)
def delete_assignment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Delete a mentor assignment by its ID (Admin only) with audit logging."""
    assignment = db.query(MentorAssignment).filter(MentorAssignment.id == id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment with ID {id} not found.",
        )

    faculty_id = assignment.faculty_user_id
    student_id = assignment.student_id

    db.delete(assignment)
    db.flush()

    # Log audit event
    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        action="assignment_deleted",
        target=f"assignment_id={id}, faculty_id={faculty_id}, student_id={student_id}",
        details="Removed mentor assignment",
    )

    db.commit()
    return {"message": f"Assignment {id} deleted successfully."}


@router.get(
    "/assignments",
    response_model=AssignmentListResponse,
    summary="List mentor assignments",
    dependencies=[Depends(require_roles("admin"))],
)
def list_assignments(
    faculty_user_id: Optional[int] = Query(None, description="Filter assignments by faculty user ID"),
    db: Session = Depends(get_db),
) -> AssignmentListResponse:
    """List mentor assignments, optionally filtered by faculty member (Admin only)."""
    query = (
        db.query(MentorAssignment, Student.student_code)
        .outerjoin(Student, MentorAssignment.student_id == Student.id)
    )

    if faculty_user_id is not None:
        query = query.filter(MentorAssignment.faculty_user_id == faculty_user_id)

    results = query.order_by(MentorAssignment.created_at.desc()).all()

    items = [
        AssignmentItem(
            id=assignment.id,
            faculty_user_id=assignment.faculty_user_id,
            student_id=assignment.student_id,
            student_code=student_code,
            created_at=assignment.created_at,
        )
        for assignment, student_code in results
    ]

    return AssignmentListResponse(total=len(items), items=items)
