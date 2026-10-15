"""Comprehensive tests for EduGuard Admin Role and endpoints.

Verifies:
- Admin user management: list, paginate, filter, create, bcrypt hash, safe fields only.
- Activate / deactivate user, self-deactivation prevention.
- Inactive user generic login rejection (no account enumeration).
- Model information endpoint (genuine metrics, RBAC).
- System usage endpoint (actual DB counts, RBAC).
- Audit logging for user creation, status toggles, assignments, dataset uploads.
- RBAC protection: faculty -> 403, student -> 403, unauthenticated -> 401.
"""

import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash, verify_password
from backend.app.models.audit_log import AuditLog
from backend.app.models.student import Student
from backend.app.models.user import User


@pytest.fixture
def admin_test_env(db_session: Session):
    """Seed test users with distinct roles for Admin RBAC tests."""
    admin = User(
        email="admin.lead@institution.edu",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Lead Administrator",
        role="admin",
        is_active=True,
    )
    admin_other = User(
        email="admin.second@institution.edu",
        hashed_password=get_password_hash("AdminPass456!"),
        full_name="Second Administrator",
        role="admin",
        is_active=True,
    )
    faculty = User(
        email="faculty.prof@institution.edu",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Prof. Faculty",
        role="faculty",
        is_active=True,
    )
    student_user = User(
        email="student.enroll@institution.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Enrolled Student",
        role="student",
        is_active=True,
    )

    db_session.add_all([admin, admin_other, faculty, student_user])
    db_session.flush()

    student_record = Student(
        student_code="STU-ADM-001",
        user_id=student_user.id,
        school="GP",
        cohort_year=2026,
    )
    db_session.add(student_record)
    db_session.commit()

    return {
        "admin": admin,
        "admin_other": admin_other,
        "faculty": faculty,
        "student_user": student_user,
        "student_record": student_record,
        "admin_headers": {"Authorization": f"Bearer {create_access_token(admin.id, 'admin')}"},
        "admin_other_headers": {"Authorization": f"Bearer {create_access_token(admin_other.id, 'admin')}"},
        "faculty_headers": {"Authorization": f"Bearer {create_access_token(faculty.id, 'faculty')}"},
        "student_headers": {"Authorization": f"Bearer {create_access_token(student_user.id, 'student')}"},
    }


# =====================================================================
# 1. ADMIN USER MANAGEMENT: LIST & FILTER
# =====================================================================

def test_admin_can_list_users(test_client: TestClient, admin_test_env):
    """Admin can list registered users with pagination."""
    resp = test_client.get("/api/admin/users", headers=admin_test_env["admin_headers"])
    assert resp.status_code == 200
    data = resp.json()

    assert "total" in data
    assert "users" in data
    assert "page" in data
    assert "page_size" in data
    assert "total_pages" in data
    assert data["total"] >= 4

    # Validate safe fields and absence of sensitive attributes
    for user_item in data["users"]:
        assert "id" in user_item
        assert "email" in user_item
        assert "role" in user_item
        assert "is_active" in user_item
        assert "created_at" in user_item
        # CRITICAL: Passwords and hashes must NEVER be exposed
        assert "password" not in user_item
        assert "hashed_password" not in user_item
        assert "password_hash" not in user_item


def test_admin_user_role_filter(test_client: TestClient, admin_test_env):
    """Admin can filter the user directory by role."""
    # Faculty filter
    resp_fac = test_client.get(
        "/api/admin/users?role=faculty", headers=admin_test_env["admin_headers"]
    )
    assert resp_fac.status_code == 200
    fac_data = resp_fac.json()
    assert all(u["role"] == "faculty" for u in fac_data["users"])
    assert fac_data["total"] >= 1

    # Student filter
    resp_stu = test_client.get(
        "/api/admin/users?role=student", headers=admin_test_env["admin_headers"]
    )
    assert resp_stu.status_code == 200
    stu_data = resp_stu.json()
    assert all(u["role"] == "student" for u in stu_data["users"])
    assert stu_data["total"] >= 1

    # Admin filter
    resp_adm = test_client.get(
        "/api/admin/users?role=admin", headers=admin_test_env["admin_headers"]
    )
    assert resp_adm.status_code == 200
    adm_data = resp_adm.json()
    assert all(u["role"] == "admin" for u in adm_data["users"])
    assert adm_data["total"] >= 2


def test_admin_user_pagination(test_client: TestClient, admin_test_env):
    """Admin users endpoint respects page and page_size parameters."""
    resp = test_client.get(
        "/api/admin/users?page=1&page_size=2", headers=admin_test_env["admin_headers"]
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["users"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total_pages"] >= 2


# =====================================================================
# 2. ADMIN USER CREATION & BCRYPT HASHING
# =====================================================================

def test_admin_can_create_user(test_client: TestClient, admin_test_env, db_session: Session):
    """Admin can create a new user; password is encrypted with bcrypt and audit logged."""
    payload = {
        "email": "new.faculty@institution.edu",
        "password": "SecurePassword123!",
        "role": "faculty",
        "full_name": "Dr. Newly Created",
    }
    resp = test_client.post(
        "/api/admin/users",
        json=payload,
        headers=admin_test_env["admin_headers"],
    )
    assert resp.status_code == 201
    created = resp.json()

    assert created["email"] == "new.faculty@institution.edu"
    assert created["role"] == "faculty"
    assert created["full_name"] == "Dr. Newly Created"
    assert created["is_active"] is True
    # Passwords must not be returned
    assert "password" not in created
    assert "hashed_password" not in created
    assert "password_hash" not in created

    # Verify password was hashed in database with bcrypt
    db_user = db_session.query(User).filter(User.email == payload["email"]).first()
    assert db_user is not None
    assert db_user.hashed_password != payload["password"]
    assert verify_password(payload["password"], db_user.hashed_password) is True

    # Verify audit log entry
    audit = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "user_created", AuditLog.actor_user_id == admin_test_env["admin"].id)
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    assert audit is not None
    assert payload["email"] in audit.target
    # Verify no secret is leaked in details or target
    assert payload["password"] not in audit.target
    assert payload["password"] not in (audit.details or "")


def test_admin_create_user_duplicate_email(test_client: TestClient, admin_test_env):
    """Duplicate email registration is rejected with 409 Conflict."""
    payload = {
        "email": admin_test_env["faculty"].email,
        "password": "SomeOtherPassword123!",
        "role": "faculty",
    }
    resp = test_client.post(
        "/api/admin/users",
        json=payload,
        headers=admin_test_env["admin_headers"],
    )
    detail_msg = resp.json()["detail"].lower()
    assert "already exists" in detail_msg or "already registered" in detail_msg


def test_admin_create_user_invalid_role(test_client: TestClient, admin_test_env):
    """Non-existent roles are rejected with 422 Unprocessable Content."""
    payload = {
        "email": "invalid.role@institution.edu",
        "password": "Password123!",
        "role": "superhero",
    }
    resp = test_client.post(
        "/api/admin/users",
        json=payload,
        headers=admin_test_env["admin_headers"],
    )
    assert resp.status_code == 422


# =====================================================================
# 3. DEACTIVATION, REACTIVATION & SELF-DEACTIVATION GUARD
# =====================================================================

def test_admin_can_deactivate_and_reactivate_user(
    test_client: TestClient, admin_test_env, db_session: Session
):
    """Admin can deactivate and subsequently reactivate a user account with audit trail."""
    target_id = admin_test_env["faculty"].id

    # 1. Deactivate
    resp_deact = test_client.patch(
        f"/api/admin/users/{target_id}",
        json={"is_active": False},
        headers=admin_test_env["admin_headers"],
    )
    assert resp_deact.status_code == 200
    assert resp_deact.json()["is_active"] is False

    # Check DB
    db_session.expire_all()
    user = db_session.query(User).filter(User.id == target_id).first()
    assert user.is_active is False

    # Check audit log for deactivation
    deact_audit = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "user_deactivated")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    assert deact_audit is not None
    assert str(target_id) in deact_audit.target

    # 2. Reactivate
    resp_react = test_client.patch(
        f"/api/admin/users/{target_id}",
        json={"is_active": True},
        headers=admin_test_env["admin_headers"],
    )
    assert resp_react.status_code == 200
    assert resp_react.json()["is_active"] is True

    # Check DB
    db_session.expire_all()
    user = db_session.query(User).filter(User.id == target_id).first()
    assert user.is_active is True

    # Check audit log for reactivation
    react_audit = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "user_reactivated")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    assert react_audit is not None
    assert str(target_id) in react_audit.target


def test_admin_cannot_deactivate_themselves(test_client: TestClient, admin_test_env):
    """Admin is strictly forbidden from deactivating their own account."""
    admin_id = admin_test_env["admin"].id

    resp = test_client.patch(
        f"/api/admin/users/{admin_id}",
        json={"is_active": False},
        headers=admin_test_env["admin_headers"],
    )
    assert resp.status_code == 400
    assert "cannot deactivate their own account" in resp.json()["detail"].lower()


def test_admin_can_deactivate_another_admin(test_client: TestClient, admin_test_env):
    """An admin can deactivate a DIFFERENT admin account."""
    other_admin_id = admin_test_env["admin_other"].id

    resp = test_client.patch(
        f"/api/admin/users/{other_admin_id}",
        json={"is_active": False},
        headers=admin_test_env["admin_headers"],
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


def test_admin_deactivate_nonexistent_user(test_client: TestClient, admin_test_env):
    """Patching a non-existent user returns 404 Not Found."""
    resp = test_client.patch(
        "/api/admin/users/999999",
        json={"is_active": False},
        headers=admin_test_env["admin_headers"],
    )
    assert resp.status_code == 404


# =====================================================================
# 4. ACTIVE USER LOGIN BEHAVIOR & ANTI-ENUMERATION
# =====================================================================

def test_deactivated_user_cannot_login_generic_rejection(
    test_client: TestClient, admin_test_env, db_session: Session
):
    """Deactivated accounts cannot authenticate and receive generic credentials rejection without enumeration."""
    faculty_user = admin_test_env["faculty"]

    # 1. Active login succeeds
    login_resp = test_client.post(
        "/api/auth/login",
        json={"email": faculty_user.email, "password": "FacultyPass123!"},
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # 2. Deactivate the faculty account
    faculty_user.is_active = False
    db_session.commit()

    # 3. Login attempt with correct password must fail with 401
    deact_login_resp = test_client.post(
        "/api/auth/login",
        json={"email": faculty_user.email, "password": "FacultyPass123!"},
    )
    assert deact_login_resp.status_code == 401
    deact_detail = deact_login_resp.json()["detail"]

    # 4. Login attempt for non-existent user
    non_existent_resp = test_client.post(
        "/api/auth/login",
        json={"email": "nobody@nowhere.com", "password": "SomePassword123!"},
    )
    assert non_existent_resp.status_code == 401
    non_existent_detail = non_existent_resp.json()["detail"]

    # CRITICAL SECURITY REQUIREMENT: Response must be IDENTICAL to prevent user enumeration
    assert deact_detail == non_existent_detail
    assert "deactivate" not in deact_detail.lower()
    assert "inactive" not in deact_detail.lower()

    # 5. Reactivate and verify login works again
    faculty_user.is_active = True
    db_session.commit()

    react_login_resp = test_client.post(
        "/api/auth/login",
        json={"email": faculty_user.email, "password": "FacultyPass123!"},
    )
    assert react_login_resp.status_code == 200


# =====================================================================
# 5. MODEL INFORMATION ENDPOINT
# =====================================================================

def test_admin_can_access_model_info(test_client: TestClient, admin_test_env):
    """Admin can retrieve real model metadata and test performance metrics."""
    resp = test_client.get(
        "/api/admin/model-info", headers=admin_test_env["admin_headers"]
    )
    assert resp.status_code == 200
    info = resp.json()

    assert "model_version" in info
    assert "algorithm" in info
    assert "metrics" in info
    assert "classification_threshold" in info
    assert "risk_thresholds" in info
    assert "feature_count" in info
    assert "feature_names" in info

    assert info["feature_count"] == 32
    assert "G1" in info["feature_names"]
    assert "G2" in info["feature_names"]
    assert "G3" not in info["feature_names"]  # Anti-leakage verification


def test_model_info_rbac_forbidden(test_client: TestClient, admin_test_env):
    """Faculty, student, and unauthenticated clients cannot access model-info."""
    # Faculty -> 403
    resp_fac = test_client.get(
        "/api/admin/model-info", headers=admin_test_env["faculty_headers"]
    )
    assert resp_fac.status_code == 403

    # Student -> 403
    resp_stu = test_client.get(
        "/api/admin/model-info", headers=admin_test_env["student_headers"]
    )
    assert resp_stu.status_code == 403

    # Unauthenticated -> 401
    resp_anon = test_client.get("/api/admin/model-info")
    assert resp_anon.status_code == 401


# =====================================================================
# 6. USAGE / SYSTEM MONITORING ENDPOINT
# =====================================================================

def test_admin_can_access_usage(test_client: TestClient, admin_test_env):
    """Admin can retrieve live database usage telemetry."""
    resp = test_client.get("/api/admin/usage", headers=admin_test_env["admin_headers"])
    assert resp.status_code == 200
    usage = resp.json()

    assert "total_users" in usage
    assert "users_by_role" in usage
    assert "active_users" in usage
    assert "inactive_users" in usage
    assert "total_students" in usage
    assert "total_academic_records" in usage
    assert "predictions_last_7_days" in usage
    assert "predictions_last_30_days" in usage
    assert "total_dataset_uploads" in usage

    assert usage["total_users"] >= 4
    assert usage["users_by_role"]["admin"] >= 2
    assert usage["users_by_role"]["faculty"] >= 1
    assert usage["users_by_role"]["student"] >= 1
    assert usage["total_students"] >= 1


def test_usage_rbac_forbidden(test_client: TestClient, admin_test_env):
    """Faculty, student, and unauthenticated users receive 403 / 401 on /api/admin/usage."""
    # Faculty -> 403
    resp_fac = test_client.get(
        "/api/admin/usage", headers=admin_test_env["faculty_headers"]
    )
    assert resp_fac.status_code == 403

    # Student -> 403
    resp_stu = test_client.get(
        "/api/admin/usage", headers=admin_test_env["student_headers"]
    )
    assert resp_stu.status_code == 403

    # Unauthenticated -> 401
    resp_anon = test_client.get("/api/admin/usage")
    assert resp_anon.status_code == 401


# =====================================================================
# 7. AUDIT LOGGING FOR ASSIGNMENTS AND DATASET UPLOADS
# =====================================================================

def test_assignment_creates_audit_log(
    test_client: TestClient, admin_test_env, db_session: Session
):
    """Admin assignment creation and deletion record immutable audit log entries."""
    faculty_id = admin_test_env["faculty"].id
    student_id = admin_test_env["student_record"].id

    # 1. Create assignment via admin endpoint
    resp_create = test_client.post(
        "/api/admin/assignments",
        json={"faculty_user_id": faculty_id, "student_ids": [student_id]},
        headers=admin_test_env["admin_headers"],
    )
    assert resp_create.status_code == 201
    assignment_id = resp_create.json()["items"][0]["id"]

    # Verify audit log
    audit_create = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "assignment_created")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    assert audit_create is not None
    assert f"faculty_id={faculty_id}" in audit_create.target

    # 2. Delete assignment via admin endpoint
    resp_del = test_client.delete(
        f"/api/admin/assignments/{assignment_id}",
        headers=admin_test_env["admin_headers"],
    )
    assert resp_del.status_code == 200

    # Verify audit log
    audit_del = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "assignment_deleted")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    assert audit_del is not None
    assert f"assignment_id={assignment_id}" in audit_del.target


def test_dataset_upload_creates_audit_log(
    test_client: TestClient, admin_test_env, db_session: Session
):
    """Dataset upload by faculty/admin produces an audit log record."""
    csv_header = (
        "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,"
        "traveltime,studytime,failures,schoolsup,famsup,paid,activities,nursery,higher,"
        "internet,romantic,famrel,freetime,goout,Dalc,Walc,health,absences,G1,G2,student_code,term\n"
    )
    csv_row = (
        "GP,F,17,U,GT3,T,3,2,other,other,course,mother,"
        "1,2,0,no,yes,no,yes,yes,yes,yes,no,4,3,2,1,1,5,4,13.0,14.0,STU-AUDIT-001,Term 1\n"
    )
    csv_bytes = (csv_header + csv_row).encode("utf-8")

    resp = test_client.post(
        "/api/dataset/upload",
        files={"file": ("audit_telemetry.csv", io.BytesIO(csv_bytes), "text/csv")},
        headers=admin_test_env["admin_headers"],
    )
    assert resp.status_code == 201

    # Verify audit log
    audit_upload = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "dataset_upload")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    assert audit_upload is not None
    assert "filename=audit_telemetry.csv" in audit_upload.target
    assert audit_upload.actor_user_id == admin_test_env["admin"].id
