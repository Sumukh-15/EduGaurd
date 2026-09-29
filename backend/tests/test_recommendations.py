"""Automated unit and integration tests for the Deterministic Recommendations Engine.

Sub-step 2.8:
- GET /api/recommendations/{student_id}
- Deterministic rules:
  1. Grade velocity: ΔG < -2
  2. G2 < 10
  3. absences >= 10
  4. studytime <= 1
- RBAC, student ownership, non-causal representation, anti-leakage G3 guarantee,
  persistence and linkage, and prediction immutability.
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.assignment import MentorAssignment
from backend.app.models.prediction import Prediction
from backend.app.models.recommendation import Recommendation
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.services.recommendation_service import (
    ADVISORY_NOTICE,
    RecommendationService,
    recommendation_service,
)


BASE_TELEMETRY = {
    "age": 16,
    "Medu": 3,
    "Fedu": 2,
    "traveltime": 1,
    "studytime": 3,
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


@pytest.fixture
def auth_tokens(db_session: Session):
    """Create test users (student1, student2, faculty, admin) and return JWT Bearer tokens."""
    # Student 1
    u1 = User(
        email="stu1.rec@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Student One",
        role="student",
        is_active=True,
    )
    db_session.add(u1)
    db_session.flush()

    s1 = Student(
        student_code="STU-REC-01",
        user_id=u1.id,
        first_name="Student",
        last_name="One",
        cohort_year=2026,
        school="GP",
    )
    db_session.add(s1)
    db_session.flush()

    # Telemetry for Student 1 (high performing: no rules trigger)
    rec1 = AcademicRecord(student_id=s1.id, **BASE_TELEMETRY)
    db_session.add(rec1)
    db_session.flush()

    pred1 = Prediction(
        student_id=s1.id,
        academic_record_id=rec1.id,
        risk_probability=0.05,
        risk_level="Low",
        at_risk_binary=0,
        model_version="v1.0.0",
    )
    db_session.add(pred1)
    db_session.flush()

    # Student 2
    u2 = User(
        email="stu2.rec@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Student Two",
        role="student",
        is_active=True,
    )
    db_session.add(u2)
    db_session.flush()

    s2 = Student(
        student_code="STU-REC-02",
        user_id=u2.id,
        first_name="Student",
        last_name="Two",
        cohort_year=2026,
        school="MS",
    )
    db_session.add(s2)
    db_session.flush()

    # Telemetry for Student 2: triggers ALL 4 rules
    # delta_g: 14.0 -> 8.0 = -6.0 (< -2)
    # G2: 8.0 (< 10)
    # absences: 14 (>= 10)
    # studytime: 1 (<= 1)
    rec2 = AcademicRecord(
        student_id=s2.id,
        **{
            **BASE_TELEMETRY,
            "G1": 14.0,
            "G2": 8.0,
            "absences": 14,
            "studytime": 1,
            "school": "MS",
            "term": "Term 1",
        },
    )
    db_session.add(rec2)
    db_session.flush()

    pred2 = Prediction(
        student_id=s2.id,
        academic_record_id=rec2.id,
        risk_probability=0.88,
        risk_level="High",
        at_risk_binary=1,
        model_version="v1.0.0",
    )
    db_session.add(pred2)
    db_session.flush()

    # Faculty
    u_fac = User(
        email="faculty.rec@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Faculty User",
        role="faculty",
        is_active=True,
    )
    db_session.add(u_fac)

    # Admin
    u_adm = User(
        email="admin.rec@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Admin User",
        role="admin",
        is_active=True,
    )
    db_session.add(u_adm)
    db_session.flush()

    db_session.add(MentorAssignment(faculty_user_id=u_fac.id, student_id=s1.id))
    db_session.add(MentorAssignment(faculty_user_id=u_fac.id, student_id=s2.id))
    db_session.commit()

    return {
        "student1_id": s1.id,
        "student1_token": create_access_token(subject=u1.id, role="student"),
        "student2_id": s2.id,
        "student2_token": create_access_token(subject=u2.id, role="student"),
        "faculty_token": create_access_token(subject=u_fac.id, role="faculty"),
        "admin_token": create_access_token(subject=u_adm.id, role="admin"),
    }


# =========================================================================
# RBAC & Authentication Tests
# =========================================================================

def test_recommendations_unauthenticated_rejected(test_client: TestClient, auth_tokens):
    """Unauthenticated GET /api/recommendations/{id} must return 401 Unauthorized."""
    s_id = auth_tokens["student1_id"]
    res = test_client.get(f"/api/recommendations/{s_id}")
    assert res.status_code == 401


def test_recommendations_student_own_access_allowed(test_client: TestClient, auth_tokens):
    """Student must be allowed to access their own recommendations."""
    s1_id = auth_tokens["student1_id"]
    headers = {"Authorization": f"Bearer {auth_tokens['student1_token']}"}
    res = test_client.get(f"/api/recommendations/{s1_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == s1_id
    assert data["student_code"] == "STU-REC-01"
    assert "advisory_notice" in data


def test_recommendations_cross_student_forbidden(test_client: TestClient, auth_tokens):
    """Student A attempting to access Student B's recommendations must return 403 Forbidden."""
    s2_id = auth_tokens["student2_id"]
    headers = {"Authorization": f"Bearer {auth_tokens['student1_token']}"}  # Student 1
    res = test_client.get(f"/api/recommendations/{s2_id}", headers=headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_recommendations_faculty_access_allowed(test_client: TestClient, auth_tokens):
    """Faculty user must be allowed to access assigned student's recommendations."""
    s2_id = auth_tokens["student2_id"]
    headers = {"Authorization": f"Bearer {auth_tokens['faculty_token']}"}
    res = test_client.get(f"/api/recommendations/{s2_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == s2_id
    assert data["total_recommendations"] == 4


def test_recommendations_faculty_unassigned_forbidden(test_client: TestClient, auth_tokens, db_session: Session):
    """Faculty user accessing an unassigned student receives 403 Forbidden."""
    unassigned_student = Student(student_code="STU-REC-UNASSIGNED", school="GP", cohort_year=2026)
    db_session.add(unassigned_student)
    db_session.commit()

    headers = {"Authorization": f"Bearer {auth_tokens['faculty_token']}"}
    res = test_client.get(f"/api/recommendations/{unassigned_student.id}", headers=headers)
    assert res.status_code == 403
    assert "not assigned to your mentorship roster" in res.json()["detail"]


def test_recommendations_admin_access_allowed(test_client: TestClient, auth_tokens):
    """Admin user must be allowed to access any student's recommendations."""
    s2_id = auth_tokens["student2_id"]
    headers = {"Authorization": f"Bearer {auth_tokens['admin_token']}"}
    res = test_client.get(f"/api/recommendations/{s2_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == s2_id


def test_recommendations_nonexistent_student_404(test_client: TestClient, auth_tokens):
    """Accessing a non-existent student ID must return 404 Not Found."""
    headers = {"Authorization": f"Bearer {auth_tokens['faculty_token']}"}
    res = test_client.get("/api/recommendations/99999", headers=headers)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


# =========================================================================
# Rule-by-Rule Deterministic Evaluation Tests
# =========================================================================

def test_rule_delta_g_downward_velocity():
    """Verify Rule 1 (ΔG < -2) triggers independently and correctly."""
    # G1=15.0, G2=12.0 -> delta_g = -3.0 < -2.0; G2 >= 10; absences < 10; studytime > 1
    sample = {
        "G1": 15.0,
        "G2": 12.0,
        "absences": 2,
        "studytime": 3,
    }
    recs = RecommendationService.evaluate_rules(sample)
    assert len(recs) == 1
    assert recs[0].trigger_condition == "delta_g < -2"
    assert recs[0].priority == "high"
    assert recs[0].category == "Academic Progress"
    assert "Rapid Grade Trajectory Decline" in recs[0].title
    assert "-3.0 points" in recs[0].description


def test_rule_g2_below_passing():
    """Verify Rule 2 (G2 < 10) triggers independently and correctly."""
    # G1=9.0, G2=8.0 -> delta_g = -1.0 (>= -2.0); G2 = 8.0 < 10; absences < 10; studytime > 1
    sample = {
        "G1": 9.0,
        "G2": 8.0,
        "absences": 2,
        "studytime": 3,
    }
    recs = RecommendationService.evaluate_rules(sample)
    assert len(recs) == 1
    assert recs[0].trigger_condition == "G2 < 10"
    assert recs[0].priority == "high"
    assert recs[0].category == "Academic Remediation"
    assert "Performance Below Passing Standard" in recs[0].title
    assert "8.0 is currently below" in recs[0].description


def test_rule_chronic_absenteeism():
    """Verify Rule 3 (absences >= 10) triggers independently and correctly."""
    # G1=14.0, G2=14.0 -> delta_g = 0; G2 >= 10; absences = 12 >= 10; studytime > 1
    sample = {
        "G1": 14.0,
        "G2": 14.0,
        "absences": 12,
        "studytime": 3,
    }
    recs = RecommendationService.evaluate_rules(sample)
    assert len(recs) == 1
    assert recs[0].trigger_condition == "absences >= 10"
    assert recs[0].priority == "medium"
    assert recs[0].category == "Attendance"
    assert "Chronic Absenteeism Warning" in recs[0].title
    assert "12 sessions" in recs[0].description


def test_rule_low_studytime():
    """Verify Rule 4 (studytime <= 1) triggers independently and correctly."""
    # G1=14.0, G2=14.0 -> delta_g = 0; G2 >= 10; absences < 10; studytime = 1 <= 1
    sample = {
        "G1": 14.0,
        "G2": 14.0,
        "absences": 2,
        "studytime": 1,
    }
    recs = RecommendationService.evaluate_rules(sample)
    assert len(recs) == 1
    assert recs[0].trigger_condition == "studytime <= 1"
    assert recs[0].priority == "medium"
    assert recs[0].category == "Study Strategy"
    assert "Low Weekly Study Time Allocation" in recs[0].title
    assert "< 2 hours per week" in recs[0].description


def test_all_four_rules_simultaneously():
    """Verify that when all 4 conditions are met, all 4 rules trigger."""
    sample = {
        "G1": 16.0,
        "G2": 8.0,    # delta_g = -8.0 (< -2), G2 = 8 (< 10)
        "absences": 15,  # absences >= 10
        "studytime": 1,  # studytime <= 1
    }
    recs = RecommendationService.evaluate_rules(sample)
    assert len(recs) == 4
    triggers = [r.trigger_condition for r in recs]
    assert triggers == ["delta_g < -2", "G2 < 10", "absences >= 10", "studytime <= 1"]


def test_deterministic_ordering_is_stable():
    """Verify that the ordering of recommendations is completely stable across multiple calls."""
    sample = {
        "G1": 15.0,
        "G2": 7.0,
        "absences": 20,
        "studytime": 1,
    }
    expected_order = ["delta_g < -2", "G2 < 10", "absences >= 10", "studytime <= 1"]

    for _ in range(10):
        recs = RecommendationService.evaluate_rules(sample)
        assert [r.trigger_condition for r in recs] == expected_order


def test_no_rules_triggered_returns_empty_list():
    """Verify that a student meeting none of the risk conditions gets an empty list."""
    sample = {
        "G1": 14.0,
        "G2": 15.0,  # delta_g = +1.0 (not < -2)
        "absences": 3,   # not >= 10
        "studytime": 3,  # not <= 1
    }
    recs = RecommendationService.evaluate_rules(sample)
    assert recs == []


def test_exact_threshold_boundary_conditions():
    """Verify exact boundary values for each deterministic heuristic."""
    # 1. delta_g = -2.0 exactly -> must NOT trigger (strictly < -2)
    sample_exact_delta = {"G1": 12.0, "G2": 10.0, "absences": 0, "studytime": 3}
    assert RecommendationService.evaluate_rules(sample_exact_delta) == []

    # 1b. delta_g = -2.1 -> triggers!
    sample_trigger_delta = {"G1": 12.1, "G2": 10.0, "absences": 0, "studytime": 3}
    recs_delta = RecommendationService.evaluate_rules(sample_trigger_delta)
    assert len(recs_delta) == 1
    assert recs_delta[0].trigger_condition == "delta_g < -2"

    # 2. G2 = 10.0 exactly -> must NOT trigger (strictly < 10)
    sample_exact_g2 = {"G1": 10.0, "G2": 10.0, "absences": 0, "studytime": 3}
    assert RecommendationService.evaluate_rules(sample_exact_g2) == []

    # 2b. G2 = 9.9 -> triggers!
    sample_trigger_g2 = {"G1": 10.0, "G2": 9.9, "absences": 0, "studytime": 3}
    recs_g2 = RecommendationService.evaluate_rules(sample_trigger_g2)
    assert len(recs_g2) == 1
    assert recs_g2[0].trigger_condition == "G2 < 10"

    # 3. absences = 10 exactly -> triggers! (>= 10)
    sample_exact_abs = {"G1": 12.0, "G2": 12.0, "absences": 10, "studytime": 3}
    recs_abs = RecommendationService.evaluate_rules(sample_exact_abs)
    assert len(recs_abs) == 1
    assert recs_abs[0].trigger_condition == "absences >= 10"

    # 3b. absences = 9 -> does NOT trigger!
    sample_abs_9 = {"G1": 12.0, "G2": 12.0, "absences": 9, "studytime": 3}
    assert RecommendationService.evaluate_rules(sample_abs_9) == []

    # 4. studytime = 1 exactly -> triggers! (<= 1)
    sample_exact_study = {"G1": 12.0, "G2": 12.0, "absences": 0, "studytime": 1}
    recs_study = RecommendationService.evaluate_rules(sample_exact_study)
    assert len(recs_study) == 1
    assert recs_study[0].trigger_condition == "studytime <= 1"

    # 4b. studytime = 2 -> does NOT trigger!
    sample_study_2 = {"G1": 12.0, "G2": 12.0, "absences": 0, "studytime": 2}
    assert RecommendationService.evaluate_rules(sample_study_2) == []


# =========================================================================
# Governance, Anti-Leakage & Database Persistence Tests
# =========================================================================

def test_g3_cannot_influence_recommendations():
    """Verify that presence or variation of target label G3 has zero effect on recommendations."""
    sample_with_g3_zero = {"G1": 14.0, "G2": 8.0, "absences": 12, "studytime": 1, "G3": 0}
    sample_with_g3_twenty = {"G1": 14.0, "G2": 8.0, "absences": 12, "studytime": 1, "G3": 20}
    sample_without_g3 = {"G1": 14.0, "G2": 8.0, "absences": 12, "studytime": 1}

    recs_0 = RecommendationService.evaluate_rules(sample_with_g3_zero)
    recs_20 = RecommendationService.evaluate_rules(sample_with_g3_twenty)
    recs_none = RecommendationService.evaluate_rules(sample_without_g3)

    assert len(recs_0) == len(recs_20) == len(recs_none) == 4
    for i in range(4):
        assert recs_0[i].trigger_condition == recs_20[i].trigger_condition == recs_none[i].trigger_condition
        assert recs_0[i].title == recs_20[i].title == recs_none[i].title
        assert recs_0[i].description == recs_20[i].description == recs_none[i].description


def test_recommendation_persistence_and_linkage(test_client: TestClient, auth_tokens, db_session: Session):
    """Verify recommendation persistence, linkage to prediction, and idempotent retrieval."""
    s2_id = auth_tokens["student2_id"]
    headers = {"Authorization": f"Bearer {auth_tokens['faculty_token']}"}

    # Before call: check recommendations count in DB for this student
    initial_recs = db_session.query(Recommendation).filter(Recommendation.student_id == s2_id).count()

    # First call: generates and persists
    res1 = test_client.get(f"/api/recommendations/{s2_id}", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["total_recommendations"] == 4
    assert len(data1["recommendations"]) == 4

    persisted_recs = db_session.query(Recommendation).filter(Recommendation.student_id == s2_id).all()
    assert len(persisted_recs) == 4
    for r in persisted_recs:
        assert r.student_id == s2_id
        assert r.prediction_id is not None  # linked to Student 2's prediction!
        assert r.is_acknowledged is False
        assert r.created_at is not None

    # Second call: returns existing rows without creating duplicates
    res2 = test_client.get(f"/api/recommendations/{s2_id}", headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total_recommendations"] == 4

    final_count = db_session.query(Recommendation).filter(Recommendation.student_id == s2_id).count()
    assert final_count == 4  # No duplicate rows created!


def test_historical_predictions_remain_unchanged(test_client: TestClient, auth_tokens, db_session: Session):
    """Verify that calling recommendations endpoint never creates or modifies historical predictions."""
    s2_id = auth_tokens["student2_id"]
    headers = {"Authorization": f"Bearer {auth_tokens['faculty_token']}"}

    pred_before = db_session.query(Prediction).filter(Prediction.student_id == s2_id).first()
    pred_count_before = db_session.query(Prediction).count()

    res = test_client.get(f"/api/recommendations/{s2_id}", headers=headers)
    assert res.status_code == 200

    pred_after = db_session.query(Prediction).filter(Prediction.student_id == s2_id).first()
    pred_count_after = db_session.query(Prediction).count()

    assert pred_count_before == pred_count_after
    assert pred_before.id == pred_after.id
    assert pred_before.risk_probability == pred_after.risk_probability
    assert pred_before.risk_level == pred_after.risk_level
    assert pred_before.created_at == pred_after.created_at


def test_advisory_non_causal_representation(test_client: TestClient, auth_tokens):
    """Verify that the response explicitly contains non-causal advisory disclosures."""
    s2_id = auth_tokens["student2_id"]
    headers = {"Authorization": f"Bearer {auth_tokens['faculty_token']}"}

    res = test_client.get(f"/api/recommendations/{s2_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "advisory_notice" in data
    notice = data["advisory_notice"]
    assert "non-causal" in notice.lower()
    assert "human advisor" in notice.lower()
    assert "decision-support" in notice.lower()


def test_student_with_no_academic_data(test_client: TestClient, auth_tokens, db_session: Session):
    """Verify that a student with no academic telemetry returns 0 recommendations cleanly."""
    u_empty = User(
        email="empty.student@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Empty Student",
        role="student",
        is_active=True,
    )
    db_session.add(u_empty)
    db_session.flush()

    s_empty = Student(
        student_code="STU-EMPTY",
        user_id=u_empty.id,
        first_name="Empty",
        last_name="Student",
        cohort_year=2026,
        school="GP",
    )
    db_session.add(s_empty)
    db_session.flush()

    fac_user = db_session.query(User).filter(User.email == "faculty.rec@school.edu").first()
    if fac_user:
        db_session.add(MentorAssignment(faculty_user_id=fac_user.id, student_id=s_empty.id))

    db_session.commit()

    headers = {"Authorization": f"Bearer {auth_tokens['faculty_token']}"}
    res = test_client.get(f"/api/recommendations/{s_empty.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == s_empty.id
    assert data["total_recommendations"] == 0
    assert data["recommendations"] == []
    assert data["prediction_id"] is None
    assert data["academic_record_id"] is None
