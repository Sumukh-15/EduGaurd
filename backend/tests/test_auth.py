"""Tests for authentication, password security, JWT, and RBAC dependencies."""

from datetime import timedelta
import pytest
from fastapi import Depends, HTTPException
from jose import JWTError

from backend.app.core.config import settings
from backend.app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from backend.app.api.deps import (
    get_current_user,
    require_roles,
    verify_student_access,
)
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.assignment import MentorAssignment


# --- 1. Password Hashing & Verification Tests ---

def test_password_hashing_and_verification():
    """Verify that bcrypt hashing produces secure salted hashes and verifies correctly."""
    plain_password = "SecretPassword123!"
    hashed = get_password_hash(plain_password)

    # Hash must not equal plaintext
    assert hashed != plain_password
    # Bcrypt format check
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    # Correct password verifies
    assert verify_password(plain_password, hashed) is True
    # Incorrect password fails
    assert verify_password("WrongPassword!", hashed) is False
    # Empty string fails
    assert verify_password("", hashed) is False


# --- 2. JWT Generation, Expiration & Decoding Tests ---

def test_jwt_creation_and_decoding():
    """Verify JWT token encoding and decoding with standard and custom claims."""
    token = create_access_token(
        subject=42,
        role="faculty",
        extra_claims={"email": "prof@school.edu"},
    )
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "faculty"
    assert payload["email"] == "prof@school.edu"
    assert "exp" in payload


def test_jwt_expired_token():
    """Verify that an expired JWT raises JWTError when decoded."""
    expired_token = create_access_token(
        subject=10,
        role="student",
        expires_delta=timedelta(minutes=-10),  # expired 10 minutes ago
    )

    with pytest.raises(JWTError):
        decode_access_token(expired_token)


def test_jwt_tampered_token():
    """Verify that a tampered JWT fails signature verification."""
    token = create_access_token(subject=1, role="admin")
    tampered_token = token[:-4] + "abcd"

    with pytest.raises(JWTError):
        decode_access_token(tampered_token)


# --- 3. Login Endpoint Tests (/api/auth/login) ---

def test_login_successful_student(test_client, db_session):
    """Verify successful student authentication returns Bearer token and role."""
    user = User(
        email="student@school.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Sam Student",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = test_client.post(
        "/api/auth/login",
        json={"email": "student@school.edu", "password": "StudentPass123!"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "student"
    assert data["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    # Ensure token decodes to user ID
    payload = decode_access_token(data["access_token"])
    assert payload["sub"] == str(user.id)
    assert payload["role"] == "student"


def test_login_successful_faculty(test_client, db_session):
    """Verify successful faculty authentication returns correct role."""
    user = User(
        email="faculty@school.edu",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Prof. Oak",
        role="faculty",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = test_client.post(
        "/api/auth/login",
        json={"email": "faculty@school.edu", "password": "FacultyPass123!"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "faculty"


def test_login_invalid_password_returns_generic_401(test_client, db_session):
    """Verify wrong password returns 401 with generic error message."""
    user = User(
        email="user@school.edu",
        hashed_password=get_password_hash("CorrectPass123!"),
        full_name="Regular User",
        role="student",
    )
    db_session.add(user)
    db_session.commit()

    response = test_client.post(
        "/api/auth/login",
        json={"email": "user@school.edu", "password": "WrongPassword!"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_unknown_email_returns_identical_generic_401(test_client):
    """Verify non-existent email returns identical 401 message (no user enumeration)."""
    response = test_client.post(
        "/api/auth/login",
        json={"email": "nonexistent@school.edu", "password": "SomePassword!"},
    )

    assert response.status_code == 401
    # Message must be identical to wrong password error
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_inactive_user_rejected(test_client, db_session):
    """Verify deactivated user accounts cannot log in."""
    user = User(
        email="inactive@school.edu",
        hashed_password=get_password_hash("Password123!"),
        full_name="Inactive User",
        role="student",
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()

    response = test_client.post(
        "/api/auth/login",
        json={"email": "inactive@school.edu", "password": "Password123!"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user account"


# --- 4. Current User Profile Endpoint (/api/auth/me) & Secret Isolation ---

def test_get_current_user_profile(test_client, db_session):
    """Verify /api/auth/me returns safe profile with linked student info."""
    user = User(
        email="alice@school.edu",
        hashed_password=get_password_hash("AlicePass123!"),
        full_name="Alice Wonderland",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    student = Student(
        student_code="STU00101",
        user_id=user.id,
        first_name="Alice",
        last_name="Wonderland",
    )
    db_session.add(student)
    db_session.commit()

    token = create_access_token(subject=user.id, role=user.role)
    response = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["email"] == "alice@school.edu"
    assert data["full_name"] == "Alice Wonderland"
    assert data["role"] == "student"
    assert data["is_active"] is True
    assert data["student_id"] == student.id
    assert data["student_code"] == "STU00101"

    # STRICT SECURITY: Verify passwords and hashes are NOT leaked
    assert "password" not in data
    assert "hashed_password" not in data
    assert settings.SECRET_KEY not in response.text


def test_auth_me_requires_authentication(test_client):
    """Verify accessing /api/auth/me without a token returns 401."""
    response = test_client.get("/api/auth/me")
    assert response.status_code == 401


def test_auth_me_rejects_expired_token(test_client, db_session):
    """Verify accessing /api/auth/me with an expired token returns 401."""
    user = User(
        email="expired@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Expired User",
        role="student",
    )
    db_session.add(user)
    db_session.commit()

    expired_token = create_access_token(
        subject=user.id,
        role=user.role,
        expires_delta=timedelta(seconds=-1),
    )

    response = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "credentials" in response.json()["detail"].lower()


# --- 5. Role-Based Access Control (RBAC) Dependency Tests ---

def test_require_roles_allows_permitted_roles():
    """Verify require_roles passes through users with allowed roles."""
    checker = require_roles("faculty", "admin")

    faculty_user = User(id=1, email="f@s.edu", role="faculty", full_name="F", hashed_password="x")
    admin_user = User(id=2, email="a@s.edu", role="admin", full_name="A", hashed_password="x")

    assert checker(faculty_user) == faculty_user
    assert checker(admin_user) == admin_user


def test_require_roles_blocks_forbidden_roles():
    """Verify require_roles raises 403 Forbidden for unpermitted roles."""
    checker = require_roles("faculty", "admin")

    student_user = User(id=3, email="s@s.edu", role="student", full_name="S", hashed_password="x")

    with pytest.raises(HTTPException) as exc_info:
        checker(student_user)

    assert exc_info.value.status_code == 403
    assert "Operation not permitted" in exc_info.value.detail


# --- 6. Student Ownership Boundaries (verify_student_access) ---

def test_verify_student_access_student_own_profile(db_session):
    """Verify a student can access their own student profile."""
    user = User(id=10, email="s10@s.edu", role="student", full_name="S10", hashed_password="x")
    student = Student(id=100, student_code="STU00100", user_id=10)
    user.student = student

    result = verify_student_access(student_id=100, current_user=user)
    assert result == user


def test_verify_student_access_student_cross_student_forbidden(db_session):
    """Verify a student CANNOT access another student's profile (403 Forbidden)."""
    user = User(id=11, email="s11@s.edu", role="student", full_name="S11", hashed_password="x")
    student = Student(id=101, student_code="STU00101", user_id=11)
    user.student = student

    # Student 11 tries to access student 999
    with pytest.raises(HTTPException) as exc_info:
        verify_student_access(student_id=999, current_user=user)

    assert exc_info.value.status_code == 403
    assert "Access denied" in exc_info.value.detail


def test_verify_student_access_faculty_and_admin_permitted(db_session):
    """Verify faculty (when assigned) and admin (universally) can access student profile."""
    faculty_user = User(id=20, email="fac@s.edu", role="faculty", full_name="Fac", hashed_password="x")
    admin_user = User(id=21, email="adm@s.edu", role="admin", full_name="Adm", hashed_password="x")
    db_session.add_all([faculty_user, admin_user])
    db_session.flush()

    student = Student(id=100, student_code="STU-0100", cohort_year=2026, school="GP")
    db_session.add(student)
    db_session.flush()

    assignment = MentorAssignment(faculty_user_id=faculty_user.id, student_id=student.id)
    db_session.add(assignment)
    db_session.commit()

    # Faculty can access assigned student 100
    assert verify_student_access(student_id=100, current_user=faculty_user, db=db_session) == faculty_user
    # Admin can access student 100 universally
    assert verify_student_access(student_id=100, current_user=admin_user, db=db_session) == admin_user

    # Faculty cannot access unassigned student 101
    with pytest.raises(HTTPException) as exc_info:
        verify_student_access(student_id=101, current_user=faculty_user, db=db_session)
    assert exc_info.value.status_code == 403
    assert "not assigned to your mentorship roster" in exc_info.value.detail
