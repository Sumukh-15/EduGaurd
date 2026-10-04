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
from backend.app.models.assignment import MentorAssignment
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
    """Faculty user fixture with assignments for existing students."""
    user = User(
        email="faculty.history@school.edu",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Prof History",
        role="faculty",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    for s in db_session.query(Student).all():
        db_session.add(MentorAssignment(faculty_user_id=user.id, student_id=s.id))
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
    assert data["model_version"] in ("v1.0.0", "v1.1.0")


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

    # Assign students to faculty_user
    for s in [s1, s2, s3, s4]:
        db_session.add(MentorAssignment(faculty_user_id=faculty_user["user"].id, student_id=s.id))
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


def test_faculty_analytics_class_averages_math_correctness(
    test_client: TestClient, admin_user, db_session: Session
):
    """Verify class averages are calculated over each student's latest academic record with mathematical precision."""
    # Create two students
    s1 = Student(student_code="STU-AVG-01", school="GP")
    s2 = Student(student_code="STU-AVG-02", school="GP")
    db_session.add_all([s1, s2])
    db_session.flush()

    # Student 1: Old record (should be ignored for class average)
    r1_old = AcademicRecord(
        student_id=s1.id,
        recorded_at=datetime.now(timezone.utc) - timedelta(days=30),
        G1=5.0,
        G2=5.0,
        absences=20,
        failures=3,
        **{k: v for k, v in SAMPLE_TELEMETRY_1.items() if k not in ["G1", "G2", "absences", "failures", "term"]},
        term="Old Term",
    )
    db_session.add(r1_old)
    db_session.flush()

    # Student 1: Latest record: G1=10, G2=14 (velocity = +4), absences=12 (chronic), failures=1 (>0)
    r1_new = AcademicRecord(
        student_id=s1.id,
        recorded_at=datetime.now(timezone.utc),
        G1=10.0,
        G2=14.0,
        absences=12,
        failures=1,
        **{k: v for k, v in SAMPLE_TELEMETRY_1.items() if k not in ["G1", "G2", "absences", "failures", "term"]},
        term="Latest Term 1",
    )
    # Student 2: Latest record: G1=16, G2=14 (velocity = -2), absences=2 (not chronic), failures=0
    r2 = AcademicRecord(
        student_id=s2.id,
        recorded_at=datetime.now(timezone.utc),
        G1=16.0,
        G2=14.0,
        absences=2,
        failures=0,
        **{k: v for k, v in SAMPLE_TELEMETRY_1.items() if k not in ["G1", "G2", "absences", "failures", "term"]},
        term="Latest Term 2",
    )
    db_session.add_all([r1_new, r2])
    db_session.commit()

    # Expected:
    # avg G1 = (10 + 16) / 2 = 13.0
    # avg G2 = (14 + 14) / 2 = 14.0
    # avg velocity = (4 + (-2)) / 2 = 1.0
    # avg absences = (12 + 2) / 2 = 7.0
    # chronic absenteeism pct = 1 / 2 * 100 = 50.0%
    # failures pct = 1 / 2 * 100 = 50.0%

    res = test_client.get("/api/faculty/analytics", headers=admin_user["headers"])
    assert res.status_code == 200
    data = res.json()
    avg = data["class_averages"]

    assert avg["avg_g1"] == 13.0
    assert avg["avg_g2"] == 14.0
    assert avg["avg_grade_velocity"] == 1.0
    assert avg["avg_absences"] == 7.0
    assert avg["chronic_absenteeism_pct"] == 50.0
    assert avg["failures_pct"] == 50.0
    assert avg["total_students_with_records"] == 2


def test_faculty_analytics_risk_trend_time_series_and_worsening(
    test_client: TestClient, admin_user, db_session: Session
):
    """Verify point-in-time risk trend computation and students-worsening detection."""
    s1 = Student(student_code="STU-TREND-01", school="GP")
    s2 = Student(student_code="STU-TREND-02", school="GP")
    db_session.add_all([s1, s2])
    db_session.flush()

    day1 = datetime(2026, 9, 10, 10, 0, 0, tzinfo=timezone.utc)
    day2 = datetime(2026, 9, 20, 10, 0, 0, tzinfo=timezone.utc)

    # Day 1: Student 1 has Low risk (0.20)
    p1_d1 = Prediction(
        student_id=s1.id,
        created_at=day1,
        risk_probability=0.20,
        risk_level="Low",
        at_risk_binary=0,
        model_version="v1.0.0",
    )
    # Day 1: Student 2 has High risk (0.80)
    p2_d1 = Prediction(
        student_id=s2.id,
        created_at=day1,
        risk_probability=0.80,
        risk_level="High",
        at_risk_binary=1,
        model_version="v1.0.0",
    )
    # Day 2: Student 1 worsens significantly: risk increases from 0.20 to 0.45 (+0.25 >= 0.15), risk_level="Medium"
    p1_d2 = Prediction(
        student_id=s1.id,
        created_at=day2,
        risk_probability=0.45,
        risk_level="Medium",
        at_risk_binary=0,
        model_version="v1.0.0",
    )
    db_session.add_all([p1_d1, p2_d1, p1_d2])
    db_session.commit()

    # Query trends with bucket=day
    res = test_client.get("/api/faculty/analytics/trends?bucket=day", headers=admin_user["headers"])
    assert res.status_code == 200
    data = res.json()

    assert data["bucket"] == "day"
    trends = data["risk_trend"]
    assert len(trends) == 2

    # Trend Point 1 (2026-09-10): s1 is Low, s2 is High
    t1 = next(t for t in trends if t["date"] == "2026-09-10")
    assert t1["low"] == 1
    assert t1["medium"] == 0
    assert t1["high"] == 1
    assert t1["total_evaluated"] == 2

    # Trend Point 2 (2026-09-20): s1 became Medium, s2 is still High (latest as of date)
    t2 = next(t for t in trends if t["date"] == "2026-09-20")
    assert t2["low"] == 0
    assert t2["medium"] == 1
    assert t2["high"] == 1
    assert t2["total_evaluated"] == 2

    # Worsening students: s1 worsened by +0.25 (>= 0.15)
    assert data["students_worsening_count"] == 1
    assert len(data["students_worsening"]) == 1
    w = data["students_worsening"][0]
    assert w["student_id"] == s1.id
    assert w["student_code"] == "STU-TREND-01"
    assert w["previous_risk_probability"] == 0.20
    assert w["latest_risk_probability"] == 0.45
    assert w["risk_delta"] == 0.25
    assert w["previous_risk_level"] == "Low"
    assert w["latest_risk_level"] == "Medium"


def test_faculty_analytics_trends_scoping_and_rbac(
    test_client: TestClient, faculty_user, admin_user, student_with_history, db_session: Session
):
    """Verify RBAC and mentor scoping on GET /api/faculty/analytics/trends."""
    # 1. Unauthenticated -> 401
    res_unauth = test_client.get("/api/faculty/analytics/trends")
    assert res_unauth.status_code == 401

    # 2. Student role -> 403 Forbidden
    res_student = test_client.get(
        "/api/faculty/analytics/trends", headers=student_with_history["headers"]
    )
    assert res_student.status_code == 403

    # 3. Faculty with ZERO assignments -> empty response
    faculty_user_id = faculty_user["user"].id
    # Clean any assignments for this faculty
    db_session.query(MentorAssignment).filter(
        MentorAssignment.faculty_user_id == faculty_user_id
    ).delete()
    db_session.commit()

    res_zero = test_client.get("/api/faculty/analytics/trends", headers=faculty_user["headers"])
    assert res_zero.status_code == 200
    zero_data = res_zero.json()
    assert zero_data["risk_trend"] == []
    assert zero_data["class_averages"]["total_students_with_records"] == 0
    assert zero_data["students_worsening_count"] == 0

    # 4. Faculty with assigned student -> sees assigned data
    assigned_stu = Student(student_code="STU-SCOPE-FA1", school="GP")
    db_session.add(assigned_stu)
    db_session.flush()
    db_session.add(
        MentorAssignment(faculty_user_id=faculty_user_id, student_id=assigned_stu.id)
    )
    db_session.add(
        AcademicRecord(
            student_id=assigned_stu.id,
            G1=14.0,
            G2=16.0,
            absences=3,
            failures=0,
            **{k: v for k, v in SAMPLE_TELEMETRY_1.items() if k not in ["G1", "G2", "absences", "failures", "term"]},
            term="Scoped Term",
        )
    )
    db_session.commit()

    res_assigned = test_client.get("/api/faculty/analytics/trends", headers=faculty_user["headers"])
    assert res_assigned.status_code == 200
    assigned_data = res_assigned.json()
    assert assigned_data["class_averages"]["total_students_with_records"] == 1
    assert assigned_data["class_averages"]["avg_g1"] == 14.0
    assert assigned_data["class_averages"]["avg_g2"] == 16.0

