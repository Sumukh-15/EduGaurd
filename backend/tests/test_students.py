"""Unit and integration tests for student profile and academic data endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.assignment import MentorAssignment
from backend.app.models.student import Student
from backend.app.models.user import User


# Valid 32-feature payload fixture
SAMPLE_32_FEATURE_PAYLOAD = {
    "age": 17,
    "Medu": 3,
    "Fedu": 2,
    "traveltime": 1,
    "studytime": 2,
    "failures": 0,
    "famrel": 4,
    "freetime": 3,
    "goout": 2,
    "Dalc": 1,
    "Walc": 1,
    "health": 5,
    "absences": 4,
    "G1": 13.0,
    "G2": 14.0,
    "school": "GP",
    "sex": "F",
    "address": "U",
    "famsize": "GT3",
    "Pstatus": "T",
    "schoolsup": "no",
    "famsup": "yes",
    "paid": "no",
    "activities": "yes",
    "nursery": "yes",
    "higher": "yes",
    "internet": "yes",
    "romantic": "no",
    "Mjob": "other",
    "Fjob": "other",
    "reason": "course",
    "guardian": "mother",
    "term": "Term 1",
}


@pytest.fixture
def student_fixture_a(db_session: Session):
    """Create primary student user and profile."""
    user = User(
        email="alice@school.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Alice Student",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    student = Student(
        student_code="STU-0001",
        user_id=user.id,
        first_name="Alice",
        last_name="Smith",
        cohort_year=2026,
        school="GP",
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    db_session.refresh(user)

    token = create_access_token(subject=user.id, role="student")
    return {"user": user, "student": student, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def student_fixture_b(db_session: Session):
    """Create secondary student user and profile for ownership testing."""
    user = User(
        email="bob@school.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Bob Student",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    student = Student(
        student_code="STU-0002",
        user_id=user.id,
        first_name="Bob",
        last_name="Jones",
        cohort_year=2026,
        school="MS",
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    db_session.refresh(user)

    token = create_access_token(subject=user.id, role="student")
    return {"user": user, "student": student, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def faculty_fixture(db_session: Session):
    """Create faculty user and token, auto-assigning student_fixture_a if present."""
    user = User(
        email="prof.clark@school.edu",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Prof. Clark",
        role="faculty",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    student_a = db_session.query(Student).filter(Student.student_code == "STU-0001").first()
    if student_a:
        assignment = MentorAssignment(faculty_user_id=user.id, student_id=student_a.id)
        db_session.add(assignment)
        db_session.commit()

    token = create_access_token(subject=user.id, role="faculty")
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def admin_fixture(db_session: Session):
    """Create admin user and token."""
    user = User(
        email="admin@school.edu",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin User",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=user.id, role="admin")
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


# =========================================================================
# 1. Student Profile Retrieval (GET /api/students/{id})
# =========================================================================

def test_get_student_profile_own_success(test_client: TestClient, student_fixture_a):
    """A student must be able to view their own profile."""
    student_id = student_fixture_a["student"].id
    headers = student_fixture_a["headers"]

    resp = test_client.get(f"/api/students/{student_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == student_id
    assert data["student_code"] == "STU-0001"
    assert data["first_name"] == "Alice"
    assert data["email"] == "alice@school.edu"


def test_get_student_profile_cross_student_forbidden(test_client: TestClient, student_fixture_a, student_fixture_b):
    """Student A must strictly receive 403 Forbidden when attempting to view Student B's profile."""
    target_student_id = student_fixture_b["student"].id
    headers = student_fixture_a["headers"]  # Alice attempting to view Bob

    resp = test_client.get(f"/api/students/{target_student_id}", headers=headers)
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]


def test_get_student_profile_faculty_allowed(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Faculty members are authorized to view assigned student profiles."""
    student_id = student_fixture_a["student"].id
    headers = faculty_fixture["headers"]

    resp = test_client.get(f"/api/students/{student_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == student_id
    assert data["student_code"] == "STU-0001"


def test_get_student_profile_faculty_unassigned_forbidden(test_client: TestClient, student_fixture_b, faculty_fixture):
    """Faculty members receive 403 Forbidden when attempting to view an unassigned student."""
    student_id = student_fixture_b["student"].id
    headers = faculty_fixture["headers"]

    resp = test_client.get(f"/api/students/{student_id}", headers=headers)
    assert resp.status_code == 403
    assert "not assigned to your mentorship roster" in resp.json()["detail"]


def test_get_student_profile_admin_allowed(test_client: TestClient, student_fixture_a, admin_fixture):
    """Administrators are authorized to view any student's profile."""
    student_id = student_fixture_a["student"].id
    headers = admin_fixture["headers"]

    resp = test_client.get(f"/api/students/{student_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == student_id


def test_get_student_profile_not_found(test_client: TestClient, faculty_fixture):
    """Querying a non-existent student ID returns 404 Not Found."""
    headers = faculty_fixture["headers"]
    resp = test_client.get("/api/students/999999", headers=headers)
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_get_student_profile_unauthenticated(test_client: TestClient):
    """Unauthenticated requests must be rejected with 401 Unauthorized."""
    resp = test_client.get("/api/students/1")
    assert resp.status_code == 401


# =========================================================================
# 2. Student Profile Modification (PATCH /api/students/{id})
# =========================================================================

def test_update_student_profile_own_success(test_client: TestClient, student_fixture_a):
    """A student can update their permitted demographic attributes."""
    student_id = student_fixture_a["student"].id
    headers = student_fixture_a["headers"]

    payload = {"first_name": "Alicia", "cohort_year": 2027}
    resp = test_client.patch(f"/api/students/{student_id}", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["first_name"] == "Alicia"
    assert data["cohort_year"] == 2027
    assert data["student_code"] == "STU-0001"  # Immutable


def test_update_student_profile_cross_student_forbidden(test_client: TestClient, student_fixture_a, student_fixture_b):
    """Student A cannot modify Student B's profile."""
    target_id = student_fixture_b["student"].id
    headers = student_fixture_a["headers"]

    payload = {"first_name": "Hacked"}
    resp = test_client.patch(f"/api/students/{target_id}", json=payload, headers=headers)
    assert resp.status_code == 403


def test_update_student_profile_faculty_allowed(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Faculty members can update demographic details on a student profile."""
    student_id = student_fixture_a["student"].id
    headers = faculty_fixture["headers"]

    payload = {"school": "MS"}
    resp = test_client.patch(f"/api/students/{student_id}", json=payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["school"] == "MS"


def test_update_student_profile_extra_field_rejected(test_client: TestClient, student_fixture_a):
    """Attempting to update an immutable or unknown field (e.g. student_code) is rejected."""
    student_id = student_fixture_a["student"].id
    headers = student_fixture_a["headers"]

    payload = {"student_code": "NEW-CODE"}  # Extra/immutable field
    resp = test_client.patch(f"/api/students/{student_id}", json=payload, headers=headers)
    assert resp.status_code == 422


# =========================================================================
# 3. Academic Telemetry Retrieval (GET /api/students/{id}/academic-data)
# =========================================================================

def test_get_academic_data_own_success(test_client: TestClient, db_session: Session, student_fixture_a):
    """A student can retrieve their own academic telemetry records."""
    student_id = student_fixture_a["student"].id
    headers = student_fixture_a["headers"]

    # Seed an academic record
    clean_data = {k: v for k, v in SAMPLE_32_FEATURE_PAYLOAD.items()}
    record = AcademicRecord(student_id=student_id, **clean_data)
    db_session.add(record)
    db_session.commit()

    resp = test_client.get(f"/api/students/{student_id}/academic-data", headers=headers)
    assert resp.status_code == 200
    records = resp.json()
    assert len(records) == 1
    assert records[0]["student_id"] == student_id
    assert records[0]["G1"] == 13.0
    assert records[0]["G2"] == 14.0
    assert "G3" not in records[0]  # Zero leakage in response schema


def test_get_academic_data_cross_student_forbidden(test_client: TestClient, student_fixture_a, student_fixture_b):
    """Student A cannot access Student B's academic telemetry."""
    target_id = student_fixture_b["student"].id
    headers = student_fixture_a["headers"]

    resp = test_client.get(f"/api/students/{target_id}/academic-data", headers=headers)
    assert resp.status_code == 403


def test_get_academic_data_faculty_allowed(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Faculty members can view any student's academic telemetry records."""
    student_id = student_fixture_a["student"].id
    headers = faculty_fixture["headers"]

    resp = test_client.get(f"/api/students/{student_id}/academic-data", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_academic_data_not_found(test_client: TestClient, faculty_fixture):
    """Academic data query for a non-existent student returns 404."""
    headers = faculty_fixture["headers"]
    resp = test_client.get("/api/students/999999/academic-data", headers=headers)
    assert resp.status_code == 404


# =========================================================================
# 4. Academic Telemetry Recording (POST /api/students/{id}/academic-data)
# =========================================================================

def test_create_academic_record_faculty_success(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Faculty can record valid 32-feature academic telemetry for a student."""
    student_id = student_fixture_a["student"].id
    headers = faculty_fixture["headers"]

    resp = test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=SAMPLE_32_FEATURE_PAYLOAD,
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["student_id"] == student_id
    assert data["G1"] == 13.0
    assert data["G2"] == 14.0
    assert data["term"] == "Term 1"
    assert "id" in data
    assert "G3" not in data


def test_create_academic_record_admin_success(test_client: TestClient, student_fixture_a, admin_fixture):
    """Administrators can record academic telemetry for a student."""
    student_id = student_fixture_a["student"].id
    headers = admin_fixture["headers"]

    resp = test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=SAMPLE_32_FEATURE_PAYLOAD,
        headers=headers,
    )
    assert resp.status_code == 201


def test_create_academic_record_student_forbidden(test_client: TestClient, student_fixture_a):
    """Students are strictly forbidden from self-authoring official institutional telemetry."""
    student_id = student_fixture_a["student"].id
    headers = student_fixture_a["headers"]

    resp = test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=SAMPLE_32_FEATURE_PAYLOAD,
        headers=headers,
    )
    assert resp.status_code == 403
    assert "Operation not permitted" in resp.json()["detail"]


def test_create_academic_record_g3_strictly_rejected(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Payloads containing target label G3 MUST be rejected with 422 Unprocessable Entity."""
    student_id = student_fixture_a["student"].id
    headers = faculty_fixture["headers"]

    leaked_payload = dict(SAMPLE_32_FEATURE_PAYLOAD)
    leaked_payload["G3"] = 15.0  # Intentional leakage attempt

    resp = test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=leaked_payload,
        headers=headers,
    )
    assert resp.status_code == 422
    err_detail = str(resp.json())
    assert "G3" in err_detail or "extra" in err_detail.lower()


def test_create_academic_record_out_of_bounds_grades(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Grades outside [0, 20] must be rejected with 422 Unprocessable Entity."""
    student_id = student_fixture_a["student"].id
    headers = faculty_fixture["headers"]

    invalid_payload = dict(SAMPLE_32_FEATURE_PAYLOAD)
    invalid_payload["G1"] = 25.0  # Out of range

    resp = test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=invalid_payload,
        headers=headers,
    )
    assert resp.status_code == 422


def test_create_academic_record_negative_absences(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Negative absences must be rejected with 422."""
    student_id = student_fixture_a["student"].id
    headers = faculty_fixture["headers"]

    invalid_payload = dict(SAMPLE_32_FEATURE_PAYLOAD)
    invalid_payload["absences"] = -5

    resp = test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=invalid_payload,
        headers=headers,
    )
    assert resp.status_code == 422


def test_create_academic_record_invalid_categorical(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Invalid categorical literals (e.g. invalid school code) must be rejected with 422."""
    student_id = student_fixture_a["student"].id
    headers = faculty_fixture["headers"]

    invalid_payload = dict(SAMPLE_32_FEATURE_PAYLOAD)
    invalid_payload["school"] = "INVALID_SCHOOL"

    resp = test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=invalid_payload,
        headers=headers,
    )
    assert resp.status_code == 422


def test_create_academic_record_missing_required_field(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Missing any of the 32 required features must be rejected with 422."""
    student_id = student_fixture_a["student"].id
    headers = faculty_fixture["headers"]

    incomplete_payload = dict(SAMPLE_32_FEATURE_PAYLOAD)
    del incomplete_payload["studytime"]

    resp = test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=incomplete_payload,
        headers=headers,
    )
    assert resp.status_code == 422


def test_create_academic_record_student_not_found(test_client: TestClient, faculty_fixture):
    """Attempting to record telemetry for a non-existent student returns 404."""
    headers = faculty_fixture["headers"]

    resp = test_client.post(
        "/api/students/999999/academic-data",
        json=SAMPLE_32_FEATURE_PAYLOAD,
        headers=headers,
    )
    assert resp.status_code == 404


def test_student_self_reported_update_workflow(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Student can update self-reported study habits; verified grades are preserved and ML recalculates."""
    student_id = student_fixture_a["student"].id
    student_headers = student_fixture_a["headers"]
    faculty_headers = faculty_fixture["headers"]

    # First seed an initial verified academic record by faculty
    initial_payload = dict(SAMPLE_32_FEATURE_PAYLOAD)
    initial_payload["G1"] = 12.0
    initial_payload["G2"] = 14.0
    initial_payload["absences"] = 3
    initial_payload["studytime"] = 2
    r_init = test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=initial_payload,
        headers=faculty_headers,
    )
    assert r_init.status_code == 201

    # Now student updates self-reported habits
    self_report_payload = {
        "studytime": 4,
        "famsup": "yes",
        "schoolsup": "no",
        "paid": "yes",
        "activities": "yes",
        "recalculate_risk": True,
    }
    resp = test_client.post(
        f"/api/students/{student_id}/self-reported",
        json=self_report_payload,
        headers=student_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["academic_record"]["data_source"] == "self_reported"
    assert data["academic_record"]["studytime"] == 4
    # Faculty verified grades are preserved
    assert data["academic_record"]["G1"] == 12.0
    assert data["academic_record"]["G2"] == 14.0
    assert data["academic_record"]["absences"] == 3
    # ML model ran and returned real probability & risk level
    assert "prediction" in data
    assert "risk_probability" in data["prediction"]
    assert 0.0 <= data["prediction"]["risk_probability"] <= 1.0
    assert data["prediction"]["risk_level"].upper() in ["LOW", "MEDIUM", "HIGH"]
    assert len(data["prediction"]["top_factors"]) > 0


def test_student_cannot_update_other_student_self_reported(test_client: TestClient, student_fixture_a, student_fixture_b):
    """Student A cannot submit self-reported data for Student B."""
    student_b_id = student_fixture_b["student"].id
    headers_a = student_fixture_a["headers"]

    resp = test_client.post(
        f"/api/students/{student_b_id}/self-reported",
        json={"studytime": 3},
        headers=headers_a,
    )
    assert resp.status_code == 403


def test_faculty_academic_update_workflow(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Faculty submits official assessment marks; validated, scaled to 0-20, and triggers live ML + SHAP."""
    student_id = student_fixture_a["student"].id
    faculty_headers = faculty_fixture["headers"]

    # First ensure a baseline record exists
    test_client.post(
        f"/api/students/{student_id}/academic-data",
        json=SAMPLE_32_FEATURE_PAYLOAD,
        headers=faculty_headers,
    )

    # Faculty submits assessment: 85 / 100 marks -> scales to 17.0/20
    faculty_payload = {
        "subject": "Mathematics",
        "assessment_name": "Midterm Examination",
        "marks": 85.0,
        "max_marks": 100.0,
        "absences": 4,
        "term": "Term 2",
        "recalculate_risk": True,
    }
    resp = test_client.post(
        f"/api/students/{student_id}/faculty-update",
        json=faculty_payload,
        headers=faculty_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["academic_record"]["data_source"] == "faculty_verified"
    assert data["academic_record"]["subject"] == "Mathematics"
    assert data["academic_record"]["assessment_name"] == "Midterm Examination"
    # Marks scaled to 20: 85/100 * 20 = 17.0
    assert data["academic_record"]["G2"] == 17.0
    # G1 was the previous G2 (14.0 from SAMPLE_32_FEATURE_PAYLOAD)
    assert data["academic_record"]["G1"] == 14.0
    # Live ML prediction occurred
    assert data["prediction"]["risk_level"].upper() in ["LOW", "MEDIUM", "HIGH"]
    assert 0.0 <= data["prediction"]["risk_probability"] <= 1.0
    assert len(data["prediction"]["top_factors"]) > 0


def test_faculty_academic_update_validation(test_client: TestClient, student_fixture_a, faculty_fixture):
    """Marks exceeding max_marks or invalid ranges are rejected with 422."""
    student_id = student_fixture_a["student"].id
    faculty_headers = faculty_fixture["headers"]

    # marks > max_marks
    invalid_payload = {
        "subject": "Math",
        "assessment_name": "Quiz 1",
        "marks": 110.0,
        "max_marks": 100.0,
        "absences": 2,
    }
    resp = test_client.post(
        f"/api/students/{student_id}/faculty-update",
        json=invalid_payload,
        headers=faculty_headers,
    )
    assert resp.status_code == 422

    # Negative absences
    invalid_att = {
        "subject": "Math",
        "assessment_name": "Quiz 1",
        "marks": 80.0,
        "max_marks": 100.0,
        "absences": -5,
    }
    resp = test_client.post(
        f"/api/students/{student_id}/faculty-update",
        json=invalid_att,
        headers=faculty_headers,
    )
    assert resp.status_code == 422


def test_student_cannot_call_faculty_update(test_client: TestClient, student_fixture_a):
    """Students cannot access the faculty-update endpoint."""
    student_id = student_fixture_a["student"].id
    student_headers = student_fixture_a["headers"]

    payload = {
        "subject": "Math",
        "assessment_name": "Self Grade",
        "marks": 20.0,
        "max_marks": 20.0,
        "absences": 0,
    }
    resp = test_client.post(
        f"/api/students/{student_id}/faculty-update",
        json=payload,
        headers=student_headers,
    )
    assert resp.status_code == 403

