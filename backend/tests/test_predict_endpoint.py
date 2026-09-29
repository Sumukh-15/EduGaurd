"""Unit and integration tests for the prediction endpoint (POST /api/predict)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.assignment import MentorAssignment
from backend.app.models.explanation import Explanation
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.services.ml_service import ml_service, MLModelUnavailableException


# Standard valid 32-feature payload
SAMPLE_ACADEMIC_PAYLOAD = {
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


@pytest.fixture(autouse=True)
def ensure_ml_service_ready():
    """Ensure MLService is loaded before test execution."""
    if not ml_service.is_ready:
        ml_service.load_artifacts()
    yield


@pytest.fixture
def student_with_record(db_session: Session):
    """Create a student user, student profile, and an academic record."""
    user = User(
        email="alice.predict@school.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Alice Predict",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    student = Student(
        student_code="STU-PRED-01",
        user_id=user.id,
        first_name="Alice",
        last_name="Predict",
        cohort_year=2026,
        school="GP",
    )
    db_session.add(student)
    db_session.flush()

    record = AcademicRecord(student_id=student.id, **SAMPLE_ACADEMIC_PAYLOAD)
    db_session.add(record)
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(student)
    db_session.refresh(record)

    token = create_access_token(subject=user.id, role="student")
    return {
        "user": user,
        "student": student,
        "record": record,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture
def other_student_with_record(db_session: Session):
    """Create a secondary student for cross-student authorization testing."""
    user = User(
        email="bob.predict@school.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Bob Predict",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    student = Student(
        student_code="STU-PRED-02",
        user_id=user.id,
        first_name="Bob",
        last_name="Predict",
        cohort_year=2026,
        school="MS",
    )
    db_session.add(student)
    db_session.flush()

    # High-risk profile (low grades, high failures)
    high_risk_data = dict(SAMPLE_ACADEMIC_PAYLOAD)
    high_risk_data["G1"] = 6.0
    high_risk_data["G2"] = 5.0
    high_risk_data["failures"] = 3
    high_risk_data["absences"] = 18

    record = AcademicRecord(student_id=student.id, **high_risk_data)
    db_session.add(record)
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(student)
    db_session.refresh(record)

    token = create_access_token(subject=user.id, role="student")
    return {
        "user": user,
        "student": student,
        "record": record,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture
def faculty_user(db_session: Session):
    """Create faculty user and bearer token, assigning to existing students."""
    user = User(
        email="faculty.pred@school.edu",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Faculty Advisor",
        role="faculty",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    for s in db_session.query(Student).all():
        db_session.add(MentorAssignment(faculty_user_id=user.id, student_id=s.id))
    db_session.commit()

    token = create_access_token(subject=user.id, role="faculty")
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def admin_user(db_session: Session):
    """Create admin user and bearer token."""
    user = User(
        email="admin.pred@school.edu",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin Chief",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=user.id, role="admin")
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


# =========================================================================
# 1. Successful Prediction & Schema Compliance
# =========================================================================

def test_predict_successful_student_own_record(test_client: TestClient, student_with_record):
    """A student can request an evaluation for their own academic record."""
    student_id = student_with_record["student"].id
    headers = student_with_record["headers"]

    payload = {"student_id": student_id}
    resp = test_client.post("/api/predict", json=payload, headers=headers)
    assert resp.status_code == 200

    data = resp.json()
    assert data["student_id"] == student_id
    assert data["academic_record_id"] == student_with_record["record"].id
    assert data["risk_level"] in ("Low", "Medium", "High")
    assert 0.0 <= data["risk_probability"] <= 1.0
    assert data["at_risk_binary"] in (0, 1)
    assert data["model_version"] == "v1.0.0"
    assert "prediction_id" in data
    assert "created_at" in data
    assert "base_log_odds" in data
    assert len(data["top_factors"]) == 5
    assert "do NOT establish causal relationships" in data["causal_disclaimer"]


def test_predict_probability_risk_level_consistency(test_client: TestClient, student_with_record):
    """Risk levels must strictly correspond to Phase 1 thresholds."""
    student_id = student_with_record["student"].id
    headers = student_with_record["headers"]

    resp = test_client.post("/api/predict", json={"student_id": student_id}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    prob = data["risk_probability"]
    level = data["risk_level"]
    binary = data["at_risk_binary"]

    if prob >= 0.70:
        assert level == "High"
    elif prob >= 0.40:
        assert level == "Medium"
    else:
        assert level == "Low"

    assert binary == (1 if prob >= 0.50 else 0)


def test_predict_persists_in_database(test_client: TestClient, db_session: Session, student_with_record):
    """Predictions and linked SHAP explanations must be persisted to the database."""
    student_id = student_with_record["student"].id
    headers = student_with_record["headers"]

    resp = test_client.post("/api/predict", json={"student_id": student_id}, headers=headers)
    assert resp.status_code == 200
    pred_id = resp.json()["prediction_id"]

    # Verify Prediction in DB
    db_pred = db_session.query(Prediction).filter(Prediction.id == pred_id).first()
    assert db_pred is not None
    assert db_pred.student_id == student_id
    assert db_pred.academic_record_id == student_with_record["record"].id
    assert db_pred.model_version == "v1.0.0"

    # Verify linked Explanations in DB
    db_exps = db_session.query(Explanation).filter(Explanation.prediction_id == pred_id).all()
    assert len(db_exps) == 5
    for exp in db_exps:
        assert exp.feature_name
        assert exp.display_name
        assert isinstance(exp.contribution, float)
        assert exp.direction in ("increases_risk", "decreases_risk")


def test_predict_append_only_history(test_client: TestClient, db_session: Session, student_with_record):
    """Repeated predictions must create distinct append-only records, not overwrite."""
    student_id = student_with_record["student"].id
    headers = student_with_record["headers"]

    resp1 = test_client.post("/api/predict", json={"student_id": student_id}, headers=headers)
    resp2 = test_client.post("/api/predict", json={"student_id": student_id}, headers=headers)

    assert resp1.status_code == 200
    assert resp2.status_code == 200

    id1 = resp1.json()["prediction_id"]
    id2 = resp2.json()["prediction_id"]
    assert id1 != id2

    total_preds = db_session.query(Prediction).filter(Prediction.student_id == student_id).count()
    assert total_preds >= 2


# =========================================================================
# 2. Authorization & Privacy Boundaries
# =========================================================================

def test_predict_student_cross_student_forbidden(test_client: TestClient, student_with_record, other_student_with_record):
    """Student A must receive 403 Forbidden when attempting to predict for Student B."""
    target_id = other_student_with_record["student"].id
    headers = student_with_record["headers"]  # Alice attempting to predict for Bob

    resp = test_client.post("/api/predict", json={"student_id": target_id}, headers=headers)
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]


def test_predict_faculty_allowed_any_student(test_client: TestClient, other_student_with_record, faculty_user):
    """Faculty members are authorized to predict for any student."""
    target_id = other_student_with_record["student"].id
    headers = faculty_user["headers"]

    resp = test_client.post("/api/predict", json={"student_id": target_id}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["student_id"] == target_id
    assert resp.json()["risk_level"] == "High"  # High-risk profile verified


def test_predict_admin_allowed_any_student(test_client: TestClient, student_with_record, admin_user):
    """Administrators are authorized to predict for any student."""
    target_id = student_with_record["student"].id
    headers = admin_user["headers"]

    resp = test_client.post("/api/predict", json={"student_id": target_id}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["student_id"] == target_id


def test_predict_unauthenticated_rejected(test_client: TestClient):
    """Unauthenticated requests must be rejected with 401 Unauthorized."""
    resp = test_client.post("/api/predict", json={"student_id": 1})
    assert resp.status_code == 401


# =========================================================================
# 3. Input Validation, Leakage Rejection & Edge Cases
# =========================================================================

def test_predict_g3_strictly_rejected(test_client: TestClient, faculty_user, student_with_record):
    """Passing target label G3 anywhere in the predict payload must return 422."""
    headers = faculty_user["headers"]
    student_id = student_with_record["student"].id

    # Direct top-level G3
    payload = {"student_id": student_id, "G3": 15.0}
    resp = test_client.post("/api/predict", json=payload, headers=headers)
    assert resp.status_code == 422

    # G3 inside academic_data
    leaked_data = dict(SAMPLE_ACADEMIC_PAYLOAD)
    leaked_data["G3"] = 15.0
    payload_nested = {"student_id": student_id, "academic_data": leaked_data}
    resp_nested = test_client.post("/api/predict", json=payload_nested, headers=headers)
    assert resp_nested.status_code == 422


def test_predict_student_cannot_author_academic_data(test_client: TestClient, student_with_record):
    """A student cannot supply new academic_data in their prediction request (403 Forbidden)."""
    student_id = student_with_record["student"].id
    headers = student_with_record["headers"]

    payload = {"student_id": student_id, "academic_data": SAMPLE_ACADEMIC_PAYLOAD}
    resp = test_client.post("/api/predict", json=payload, headers=headers)
    assert resp.status_code == 403
    assert "Students cannot submit new academic telemetry" in resp.json()["detail"]


def test_predict_faculty_with_academic_data_creates_record_and_predicts(
    test_client: TestClient, db_session: Session, student_with_record, faculty_user
):
    """Faculty supplying academic_data creates an AcademicRecord, runs prediction, and links both."""
    student_id = student_with_record["student"].id
    headers = faculty_user["headers"]

    new_telemetry = dict(SAMPLE_ACADEMIC_PAYLOAD)
    new_telemetry["G1"] = 16.0
    new_telemetry["G2"] = 17.0
    new_telemetry["term"] = "Term 2 Midterm"

    payload = {"student_id": student_id, "academic_data": new_telemetry}
    resp = test_client.post("/api/predict", json=payload, headers=headers)
    assert resp.status_code == 200

    data = resp.json()
    new_record_id = data["academic_record_id"]
    assert new_record_id is not None
    assert new_record_id != student_with_record["record"].id

    # Verify newly created AcademicRecord in DB
    rec = db_session.query(AcademicRecord).filter(AcademicRecord.id == new_record_id).first()
    assert rec is not None
    assert rec.term == "Term 2 Midterm"
    assert rec.G1 == 16.0


def test_predict_nonexistent_student_returns_404(test_client: TestClient, faculty_user):
    """Predicting for an unknown student ID returns 404 Not Found."""
    headers = faculty_user["headers"]
    resp = test_client.post("/api/predict", json={"student_id": 999999}, headers=headers)
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_predict_nonexistent_academic_record_returns_404(test_client: TestClient, student_with_record):
    """Specifying an unknown academic_record_id returns 404 Not Found."""
    student_id = student_with_record["student"].id
    headers = student_with_record["headers"]

    payload = {"student_id": student_id, "academic_record_id": 999999}
    resp = test_client.post("/api/predict", json=payload, headers=headers)
    assert resp.status_code == 404


def test_predict_student_with_zero_records_returns_400(test_client: TestClient, db_session: Session):
    """Student with zero telemetry attempting prediction returns 400 Bad Request."""
    user = User(
        email="new.student@school.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="New Student",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    student = Student(student_code="STU-NO-RECORDS", user_id=user.id)
    db_session.add(student)
    db_session.commit()

    token = create_access_token(subject=user.id, role="student")
    headers = {"Authorization": f"Bearer {token}"}

    resp = test_client.post("/api/predict", json={"student_id": student.id}, headers=headers)
    assert resp.status_code == 400
    assert "telemetry must be recorded" in resp.json()["detail"].lower()


# =========================================================================
# 4. SHAP Explanation Consistency & Model Artifact Resilience
# =========================================================================

def test_predict_shap_explanation_consistency(test_client: TestClient, student_with_record):
    """SHAP explanations must correspond directly to the prediction and obey ordering rules."""
    student_id = student_with_record["student"].id
    headers = student_with_record["headers"]

    resp = test_client.post("/api/predict", json={"student_id": student_id}, headers=headers)
    assert resp.status_code == 200
    factors = resp.json()["top_factors"]

    # Verify descending sort order by absolute contribution
    abs_contribs = [f["abs_contribution"] for f in factors]
    assert abs_contribs == sorted(abs_contribs, reverse=True)

    # Verify direction consistency
    for f in factors:
        if f["contribution"] > 0:
            assert f["direction"] == "increases_risk"
            assert "shifted risk upward" in f["interpretation"]
        else:
            assert f["direction"] == "decreases_risk"
            assert "shifted risk downward" in f["interpretation"]


def test_predict_unavailable_model_returns_503(test_client: TestClient, student_with_record, monkeypatch):
    """If ML service is degraded/unloaded, predict endpoint returns 503 Service Unavailable."""
    student_id = student_with_record["student"].id
    headers = student_with_record["headers"]

    # Temporarily set ml_service to unready
    monkeypatch.setattr(ml_service, "is_ready", False)

    resp = test_client.post("/api/predict", json={"student_id": student_id}, headers=headers)
    assert resp.status_code == 503
    assert "ML model artifacts are not loaded" in resp.json()["detail"]
