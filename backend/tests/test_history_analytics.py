"""Unit and integration tests for student history trajectories and faculty analytics.

Sub-step 2.6:
- GET /api/students/{id}/history
- GET /api/faculty/analytics
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User


SAMPLE_TELEMETRY_1 = {
    "age": 16,
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
    "absences": 2,
    "G1": 15.0,
    "G2": 16.0,
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

SAMPLE_TELEMETRY_2 = {
    **SAMPLE_TELEMETRY_1,
    "term": "Term 2",
    "absences": 4,
    "G1": 14.0,
    "G2": 15.0,
}


@pytest.fixture
def student_with_history(db_session: Session):
    """Create a student with two academic records and two linked predictions."""
    user = User(
        email="history.student@school.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="History Student",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    student = Student(
        student_code="STU-HIST-01",
        user_id=user.id,
        first_name="History",
        last_name="Student",
        cohort_year=2026,
        school="GP",
    )
    db_session.add(student)
    db_session.flush()

    # Record 1 (earlier)
    now = datetime.now(timezone.utc)
    rec1 = AcademicRecord(
        student_id=student.id,
        recorded_at=now - timedelta(days=60),
        **SAMPLE_TELEMETRY_1,
    )
    db_session.add(rec1)
    db_session.flush()

    # Prediction 1 (linked to Record 1)
    pred1 = Prediction(
        student_id=student.id,
        academic_record_id=rec1.id,
        risk_probability=0.08,
        risk_level="Low",
        at_risk_binary=0,
        model_version="v1.0.0",
        created_at=now - timedelta(days=60),
    )
    db_session.add(pred1)
    db_session.flush()

    # Record 2 (later)
    rec2 = AcademicRecord(
        student_id=student.id,
        recorded_at=now - timedelta(days=10),
        **SAMPLE_TELEMETRY_2,
    )
    db_session.add(rec2)
    db_session.flush()

    # Prediction 2 (linked to Record 2)
    pred2 = Prediction(
        student_id=student.id,
        academic_record_id=rec2.id,
        risk_probability=0.12,
        risk_level="Low",
        at_risk_binary=0,
        model_version="v1.0.0",
        created_at=now - timedelta(days=10),
    )
    db_session.add(pred2)
    db_session.commit()

    db_session.refresh(user)
    db_session.refresh(student)
    db_session.refresh(rec1)
    db_session.refresh(rec2)
    db_session.refresh(pred1)
    db_session.refresh(pred2)

    token = create_access_token(subject=user.id, role="student")
    return {
        "user": user,
        "student": student,
        "records": [rec1, rec2],
        "predictions": [pred1, pred2],
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture
def other_student(db_session: Session):
    """Secondary student for cross-student ownership verification."""
    user = User(
        email="other.student@school.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Other Student",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    student = Student(
        student_code="STU-HIST-02",
        user_id=user.id,
        first_name="Other",
        last_name="Student",
        cohort_year=2026,
        school="MS",
    )
    db_session.add(student)
    db_session.commit()

    token = create_access_token(subject=user.id, role="student")
    return {
        "user": user,
        "student": student,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture
def faculty_user(db_session: Session):
    """Faculty user fixture."""
    user = User(
        email="faculty.history@school.edu",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Prof History",
        role="faculty",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(subject=user.id, role="faculty")
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def admin_user(db_session: Session):
    """Admin user fixture."""
    user = User(
        email="admin.history@school.edu",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin History",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(subject=user.id, role="admin")
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


# =========================================================================
# STUDENT HISTORY TESTS (GET /api/students/{id}/history)
# =========================================================================

def test_student_history_own_profile_success(test_client: TestClient, student_with_history):
    """Student can successfully retrieve their own academic & prediction trajectory."""
    student_id = student_with_history["student"].id
    res = test_client.get(f"/api/students/{student_id}/history", headers=student_with_history["headers"])

    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == student_id
    assert data["student_code"] == "STU-HIST-01"
    assert data["total_records"] == 2
    assert data["total_predictions"] == 2
    assert len(data["academic_records"]) == 2
    assert len(data["predictions"]) == 2

    # Verify latest prediction
    assert data["latest_prediction"] is not None
    assert data["latest_prediction"]["id"] == student_with_history["predictions"][1].id
    assert data["latest_prediction"]["risk_probability"] == 0.12
    assert data["latest_prediction"]["risk_level"] == "Low"
    assert data["latest_prediction"]["model_version"] == "v1.0.0"

    # Verify linkage between academic records and predictions
    rec1_id = student_with_history["records"][0].id
    matching_rec = next(r for r in data["academic_records"] if r["id"] == rec1_id)
    assert len(matching_rec["predictions"]) == 1
    assert matching_rec["predictions"][0]["risk_probability"] == 0.08


def test_student_history_ordering(test_client: TestClient, student_with_history):
    """Verify chronological ordering (asc vs desc)."""
    student_id = student_with_history["student"].id

    # Ascending (chronological, oldest first)
    res_asc = test_client.get(f"/api/students/{student_id}/history?order=asc", headers=student_with_history["headers"])
    assert res_asc.status_code == 200
    data_asc = res_asc.json()
    assert data_asc["predictions"][0]["created_at"] < data_asc["predictions"][1]["created_at"]
    assert data_asc["academic_records"][0]["recorded_at"] < data_asc["academic_records"][1]["recorded_at"]

    # Descending (newest first)
    res_desc = test_client.get(f"/api/students/{student_id}/history?order=desc", headers=student_with_history["headers"])
    assert res_desc.status_code == 200
    data_desc = res_desc.json()
    assert data_desc["predictions"][0]["created_at"] > data_desc["predictions"][1]["created_at"]
    assert data_desc["academic_records"][0]["recorded_at"] > data_desc["academic_records"][1]["recorded_at"]


def test_student_history_cross_student_forbidden(test_client: TestClient, student_with_history, other_student):
    """Student attempting to view another student's history is strictly forbidden (403)."""
    target_id = student_with_history["student"].id
    res = test_client.get(f"/api/students/{target_id}/history", headers=other_student["headers"])
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_student_history_faculty_allowed(test_client: TestClient, student_with_history, faculty_user):
    """Faculty members can view any student's historical trajectory."""
    student_id = student_with_history["student"].id
    res = test_client.get(f"/api/students/{student_id}/history", headers=faculty_user["headers"])
    assert res.status_code == 200
    assert res.json()["student_id"] == student_id


def test_student_history_admin_allowed(test_client: TestClient, student_with_history, admin_user):
    """Administrators can view any student's historical trajectory."""
    student_id = student_with_history["student"].id
    res = test_client.get(f"/api/students/{student_id}/history", headers=admin_user["headers"])
    assert res.status_code == 200
    assert res.json()["student_id"] == student_id


def test_student_history_unauthenticated_rejected(test_client: TestClient, student_with_history):
    """Unauthenticated calls return 401 Unauthorized."""
    student_id = student_with_history["student"].id
    res = test_client.get(f"/api/students/{student_id}/history")
    assert res.status_code == 401


def test_student_history_nonexistent_student_returns_404(test_client: TestClient, faculty_user):
    """Nonexistent student ID returns 404 Not Found."""
    res = test_client.get("/api/students/999999/history", headers=faculty_user["headers"])
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_student_history_append_only_behavior(test_client: TestClient, student_with_history, faculty_user, db_session: Session):
    """Verify that multiple predictions over time are all preserved in history."""
    student_id = student_with_history["student"].id
    rec_id = student_with_history["records"][0].id

    # Add a third prediction
    pred3 = Prediction(
        student_id=student_id,
        academic_record_id=rec_id,
        risk_probability=0.25,
        risk_level="Low",
        at_risk_binary=0,
        model_version="v1.0.0",
    )
    db_session.add(pred3)
    db_session.commit()

    res = test_client.get(f"/api/students/{student_id}/history", headers=faculty_user["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["total_predictions"] == 3
    assert len(data["predictions"]) == 3
    # Check that rec1 now has 2 associated predictions
    matching_rec = next(r for r in data["academic_records"] if r["id"] == rec_id)
    assert len(matching_rec["predictions"]) == 2


def test_student_history_zero_leakage_guarantee(test_client: TestClient, student_with_history):
    """Verify that no G3 label is present in any academic records returned."""
    student_id = student_with_history["student"].id
    res = test_client.get(f"/api/students/{student_id}/history", headers=student_with_history["headers"])
    assert res.status_code == 200
    data = res.json()

    for rec in data["academic_records"]:
        assert "G3" not in rec
        assert "G1" in rec
        assert "G2" in rec


# =========================================================================
# FACULTY ANALYTICS TESTS (GET /api/faculty/analytics)
# =========================================================================

def test_faculty_analytics_faculty_allowed(test_client: TestClient, faculty_user):
    """Faculty members can access aggregate analytics."""
    res = test_client.get("/api/faculty/analytics", headers=faculty_user["headers"])
    assert res.status_code == 200
    data = res.json()
    assert "total_students" in data
    assert "evaluated_students" in data
    assert "at_risk_count" in data
    assert "risk_distribution" in data
    assert "school_distribution" in data
    assert data["model_version"] == "v1.0.0"


def test_faculty_analytics_admin_allowed(test_client: TestClient, admin_user):
    """Admin users can access aggregate analytics."""
    res = test_client.get("/api/faculty/analytics", headers=admin_user["headers"])
    assert res.status_code == 200


def test_faculty_analytics_student_forbidden(test_client: TestClient, student_with_history):
    """Students are strictly forbidden from accessing faculty analytics (403)."""
    res = test_client.get("/api/faculty/analytics", headers=student_with_history["headers"])
    assert res.status_code == 403
    assert "Operation not permitted" in res.json()["detail"]


def test_faculty_analytics_unauthenticated_rejected(test_client: TestClient):
    """Unauthenticated access to faculty analytics returns 401."""
    res = test_client.get("/api/faculty/analytics")
    assert res.status_code == 401


def test_faculty_analytics_aggregation_correctness(test_client: TestClient, faculty_user, db_session: Session):
    """Verify aggregate metric math across a multi-student cohort."""
    # Create 3 students with distinct risk profiles
    s1 = Student(student_code="AN-STU-01", school="GP")
    s2 = Student(student_code="AN-STU-02", school="GP")
    s3 = Student(student_code="AN-STU-03", school="MS")
    s4 = Student(student_code="AN-STU-04", school="MS")  # unevaluated student
    db_session.add_all([s1, s2, s3, s4])
    db_session.flush()

    # Predictions
    p1 = Prediction(student_id=s1.id, risk_probability=0.10, risk_level="Low", at_risk_binary=0, model_version="v1.0.0")
    p2 = Prediction(student_id=s2.id, risk_probability=0.80, risk_level="High", at_risk_binary=1, model_version="v1.0.0")
    p3 = Prediction(student_id=s3.id, risk_probability=0.55, risk_level="Medium", at_risk_binary=1, model_version="v1.0.0")
    db_session.add_all([p1, p2, p3])
    db_session.commit()

    res = test_client.get("/api/faculty/analytics", headers=faculty_user["headers"])
    assert res.status_code == 200
    data = res.json()

    assert data["total_students"] >= 4
    assert data["evaluated_students"] >= 3
    assert data["unevaluated_students"] >= 1

    # Check risk distribution
    assert data["risk_distribution"]["low"] >= 1
    assert data["risk_distribution"]["medium"] >= 1
    assert data["risk_distribution"]["high"] >= 1

    # Check schools
    schools = {item["school"]: item for item in data["school_distribution"]}
    assert "GP" in schools
    assert "MS" in schools
    assert schools["GP"]["student_count"] >= 2
    assert schools["MS"]["student_count"] >= 2


def test_faculty_analytics_empty_database_safe(test_client: TestClient, admin_user, db_session: Session):
    """Verify that empty/sparse datasets return clean zeroed metrics without dividing by zero."""
    # Delete predictions and students to test empty state
    db_session.query(Prediction).delete()
    db_session.query(AcademicRecord).delete()
    db_session.query(Student).delete()
    db_session.commit()

    res = test_client.get("/api/faculty/analytics", headers=admin_user["headers"])
    assert res.status_code == 200
    data = res.json()

    assert data["total_students"] == 0
    assert data["evaluated_students"] == 0
    assert data["unevaluated_students"] == 0
    assert data["total_predictions"] == 0
    assert data["at_risk_count"] == 0
    assert data["at_risk_percentage"] == 0.0
    assert data["average_risk_probability"] == 0.0
    assert data["risk_distribution"]["low"] == 0
    assert data["risk_distribution"]["medium"] == 0
    assert data["risk_distribution"]["high"] == 0
    assert data["school_distribution"] == []


def test_faculty_analytics_privacy_non_identifying(test_client: TestClient, faculty_user):
    """Verify that aggregate analytics do not expose any student-identifying information."""
    res = test_client.get("/api/faculty/analytics", headers=faculty_user["headers"])
    assert res.status_code == 200
    data = res.json()

    # The payload should only contain macro aggregates
    forbidden_keys = {"student_code", "email", "first_name", "last_name", "user_id", "G1", "G2", "G3"}
    for key in forbidden_keys:
        assert key not in data
