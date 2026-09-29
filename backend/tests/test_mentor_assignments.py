"""Tests for mentor assignments and faculty scoping across all endpoints."""

import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.assignment import MentorAssignment
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User


SAMPLE_RECORD_BASE = {
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
def assignment_test_env(db_session: Session):
    """Seed users and students for mentor assignment scoping tests."""
    # 1. Faculty A
    fac_a = User(
        email="fac.a@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Faculty Alpha",
        role="faculty",
        is_active=True,
    )
    # 2. Faculty B
    fac_b = User(
        email="fac.b@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Faculty Beta",
        role="faculty",
        is_active=True,
    )
    # 3. Faculty Unassigned
    fac_unassigned = User(
        email="fac.none@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Faculty Zero",
        role="faculty",
        is_active=True,
    )
    # 4. Student User
    student_user = User(
        email="stu@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Student Test",
        role="student",
        is_active=True,
    )
    # 5. Admin User
    admin_user = User(
        email="admin@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Admin Test",
        role="admin",
        is_active=True,
    )
    db_session.add_all([fac_a, fac_b, fac_unassigned, student_user, admin_user])
    db_session.flush()

    # Students
    s1 = Student(student_code="STU-001", user_id=student_user.id, school="GP", cohort_year=2026)
    s2 = Student(student_code="STU-002", school="GP", cohort_year=2026)
    s3 = Student(student_code="STU-003", school="MS", cohort_year=2026)
    db_session.add_all([s1, s2, s3])
    db_session.flush()

    # Academic Records & Predictions
    rec1 = AcademicRecord(student_id=s1.id, **{**SAMPLE_RECORD_BASE, "school": "GP", "G1": 8.0, "G2": 9.0, "absences": 12})
    rec2 = AcademicRecord(student_id=s2.id, **{**SAMPLE_RECORD_BASE, "school": "GP", "G1": 15.0, "G2": 16.0, "absences": 2})
    rec3 = AcademicRecord(student_id=s3.id, **{**SAMPLE_RECORD_BASE, "school": "MS", "G1": 12.0, "G2": 11.0, "absences": 5})
    db_session.add_all([rec1, rec2, rec3])
    db_session.flush()

    p1 = Prediction(student_id=s1.id, academic_record_id=rec1.id, risk_probability=0.85, risk_level="High", at_risk_binary=1, model_version="v1.0.0")
    p2 = Prediction(student_id=s2.id, academic_record_id=rec2.id, risk_probability=0.15, risk_level="Low", at_risk_binary=0, model_version="v1.0.0")
    p3 = Prediction(student_id=s3.id, academic_record_id=rec3.id, risk_probability=0.45, risk_level="Medium", at_risk_binary=0, model_version="v1.0.0")
    db_session.add_all([p1, p2, p3])
    db_session.flush()

    # Assignments:
    # Faculty A -> STU-001, STU-002
    # Faculty B -> STU-003
    # Faculty Zero -> (no assignments)
    assign_a1 = MentorAssignment(faculty_user_id=fac_a.id, student_id=s1.id)
    assign_a2 = MentorAssignment(faculty_user_id=fac_a.id, student_id=s2.id)
    assign_b3 = MentorAssignment(faculty_user_id=fac_b.id, student_id=s3.id)
    db_session.add_all([assign_a1, assign_a2, assign_b3])
    db_session.commit()

    return {
        "fac_a": fac_a,
        "fac_b": fac_b,
        "fac_unassigned": fac_unassigned,
        "student_user": student_user,
        "admin_user": admin_user,
        "s1": s1,
        "s2": s2,
        "s3": s3,
        "assign_a1": assign_a1,
        "assign_a2": assign_a2,
        "assign_b3": assign_b3,
        "fac_a_headers": {"Authorization": f"Bearer {create_access_token(fac_a.id, 'faculty')}"},
        "fac_b_headers": {"Authorization": f"Bearer {create_access_token(fac_b.id, 'faculty')}"},
        "fac_zero_headers": {"Authorization": f"Bearer {create_access_token(fac_unassigned.id, 'faculty')}"},
        "student_headers": {"Authorization": f"Bearer {create_access_token(student_user.id, 'student')}"},
        "admin_headers": {"Authorization": f"Bearer {create_access_token(admin_user.id, 'admin')}"},
    }


# =========================================================================
# 1. Admin Assignment Management Endpoints
# =========================================================================

def test_admin_create_assignments_success(test_client: TestClient, assignment_test_env, db_session: Session):
    """Admin successfully assigns students to a faculty mentor."""
    admin_headers = assignment_test_env["admin_headers"]
    fac_zero = assignment_test_env["fac_unassigned"]
    s1 = assignment_test_env["s1"]
    s3 = assignment_test_env["s3"]

    payload = {
        "faculty_user_id": fac_zero.id,
        "student_ids": [s1.id, s3.id],
    }
    resp = test_client.post("/api/admin/assignments", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assigned_student_ids = [item["student_id"] for item in data["items"]]
    assert s1.id in assigned_student_ids
    assert s3.id in assigned_student_ids

    # Idempotent re-submission should not create duplicate records
    resp2 = test_client.post("/api/admin/assignments", json=payload, headers=admin_headers)
    assert resp2.status_code == 201
    assert resp2.json()["total"] == 2


def test_admin_create_assignments_rbac_forbidden(test_client: TestClient, assignment_test_env):
    """Only admins can manage assignments; faculty and students are rejected with 403."""
    fac_headers = assignment_test_env["fac_a_headers"]
    stu_headers = assignment_test_env["student_headers"]
    payload = {"faculty_user_id": assignment_test_env["fac_a"].id, "student_ids": [assignment_test_env["s1"].id]}

    # Faculty cannot create assignments
    resp_fac = test_client.post("/api/admin/assignments", json=payload, headers=fac_headers)
    assert resp_fac.status_code == 403

    # Students cannot create assignments
    resp_stu = test_client.post("/api/admin/assignments", json=payload, headers=stu_headers)
    assert resp_stu.status_code == 403

    # Unauthenticated rejected with 401
    resp_unauth = test_client.post("/api/admin/assignments", json=payload)
    assert resp_unauth.status_code == 401


def test_admin_create_assignments_validation(test_client: TestClient, assignment_test_env):
    """Admin assignment returns 404 for invalid faculty or student IDs, and 400 for non-faculty users."""
    admin_headers = assignment_test_env["admin_headers"]

    # 1. Non-existent faculty user ID
    resp = test_client.post("/api/admin/assignments", json={"faculty_user_id": 999999, "student_ids": [1]}, headers=admin_headers)
    assert resp.status_code == 404
    assert "Faculty user with ID 999999 not found" in resp.json()["detail"]

    # 2. Assigning to a student user role (not faculty/admin)
    resp = test_client.post(
        "/api/admin/assignments",
        json={"faculty_user_id": assignment_test_env["student_user"].id, "student_ids": [assignment_test_env["s1"].id]},
        headers=admin_headers,
    )
    assert resp.status_code == 400
    assert "not a faculty member or administrator" in resp.json()["detail"]

    # 3. Non-existent student ID
    resp = test_client.post(
        "/api/admin/assignments",
        json={"faculty_user_id": assignment_test_env["fac_a"].id, "student_ids": [assignment_test_env["s1"].id, 99999]},
        headers=admin_headers,
    )
    assert resp.status_code == 404
    assert "Student ID(s) not found" in resp.json()["detail"]


def test_admin_delete_assignment_success(test_client: TestClient, assignment_test_env, db_session: Session):
    """Admin successfully deletes a mentor assignment."""
    admin_headers = assignment_test_env["admin_headers"]
    assign_a1 = assignment_test_env["assign_a1"]

    resp = test_client.delete(f"/api/admin/assignments/{assign_a1.id}", headers=admin_headers)
    assert resp.status_code == 200
    assert "deleted successfully" in resp.json()["message"]

    # Verify deleted from DB
    deleted = db_session.query(MentorAssignment).filter(MentorAssignment.id == assign_a1.id).first()
    assert deleted is None

    # Deleting again returns 404
    resp_again = test_client.delete(f"/api/admin/assignments/{assign_a1.id}", headers=admin_headers)
    assert resp_again.status_code == 404


def test_admin_get_assignments_filtered(test_client: TestClient, assignment_test_env):
    """Admin lists all assignments or filters by faculty user ID."""
    admin_headers = assignment_test_env["admin_headers"]
    fac_a = assignment_test_env["fac_a"]
    fac_b = assignment_test_env["fac_b"]

    # 1. Unfiltered: returns all 3 seeded assignments
    resp_all = test_client.get("/api/admin/assignments", headers=admin_headers)
    assert resp_all.status_code == 200
    assert resp_all.json()["total"] == 3

    # 2. Filtered by Faculty A: returns 2 assignments
    resp_a = test_client.get(f"/api/admin/assignments?faculty_user_id={fac_a.id}", headers=admin_headers)
    assert resp_a.status_code == 200
    assert resp_a.json()["total"] == 2
    for item in resp_a.json()["items"]:
        assert item["faculty_user_id"] == fac_a.id

    # 3. Filtered by Faculty B: returns 1 assignment
    resp_b = test_client.get(f"/api/admin/assignments?faculty_user_id={fac_b.id}", headers=admin_headers)
    assert resp_b.status_code == 200
    assert resp_b.json()["total"] == 1
    assert resp_b.json()["items"][0]["faculty_user_id"] == fac_b.id


# =========================================================================
# 2. Faculty Directory Browsing Scoping (GET /api/faculty/students)
# =========================================================================

def test_faculty_students_scoped_to_assigned_only(test_client: TestClient, assignment_test_env):
    """Faculty A sees only STU-001 and STU-002; Faculty B sees only STU-003; Admin sees all 3."""
    fac_a_headers = assignment_test_env["fac_a_headers"]
    fac_b_headers = assignment_test_env["fac_b_headers"]
    admin_headers = assignment_test_env["admin_headers"]

    # Faculty A
    resp_a = test_client.get("/api/faculty/students", headers=fac_a_headers)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["total"] == 2
    codes_a = {item["student_code"] for item in data_a["items"]}
    assert codes_a == {"STU-001", "STU-002"}

    # Faculty B
    resp_b = test_client.get("/api/faculty/students", headers=fac_b_headers)
    assert resp_b.status_code == 200
    data_b = resp_b.json()
    assert data_b["total"] == 1
    assert data_b["items"][0]["student_code"] == "STU-003"

    # Admin
    resp_adm = test_client.get("/api/faculty/students", headers=admin_headers)
    assert resp_adm.status_code == 200
    data_adm = resp_adm.json()
    assert data_adm["total"] == 3


def test_faculty_students_zero_assignments_returns_empty(test_client: TestClient, assignment_test_env):
    """Faculty member with zero assignments receives an empty list, not all students."""
    fac_zero_headers = assignment_test_env["fac_zero_headers"]

    resp = test_client.get("/api/faculty/students", headers=fac_zero_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


# =========================================================================
# 3. Faculty Cohort Analytics Scoping (GET /api/faculty/analytics)
# =========================================================================

def test_faculty_analytics_scoped_metrics(test_client: TestClient, assignment_test_env):
    """Faculty analytics aggregates metrics strictly over assigned students."""
    fac_a_headers = assignment_test_env["fac_a_headers"]
    fac_b_headers = assignment_test_env["fac_b_headers"]

    # Faculty A has STU-001 (High Risk) and STU-002 (Low Risk)
    resp_a = test_client.get("/api/faculty/analytics", headers=fac_a_headers)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["total_students"] == 2
    assert data_a["evaluated_students"] == 2
    assert data_a["at_risk_count"] == 1  # only STU-001 is binary at-risk
    assert data_a["risk_distribution"]["high"] == 1
    assert data_a["risk_distribution"]["low"] == 1
    assert data_a["risk_distribution"]["medium"] == 0

    # Faculty B has STU-003 (Medium Risk, at_risk=0)
    resp_b = test_client.get("/api/faculty/analytics", headers=fac_b_headers)
    assert resp_b.status_code == 200
    data_b = resp_b.json()
    assert data_b["total_students"] == 1
    assert data_b["evaluated_students"] == 1
    assert data_b["at_risk_count"] == 0
    assert data_b["risk_distribution"]["medium"] == 1
    assert data_b["risk_distribution"]["high"] == 0
    assert data_b["risk_distribution"]["low"] == 0


def test_faculty_analytics_zero_assignments_zeroed(test_client: TestClient, assignment_test_env):
    """Faculty member with zero assignments gets zeroed aggregate analytics."""
    fac_zero_headers = assignment_test_env["fac_zero_headers"]

    resp = test_client.get("/api/faculty/analytics", headers=fac_zero_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_students"] == 0
    assert data["evaluated_students"] == 0
    assert data["total_predictions"] == 0
    assert data["at_risk_count"] == 0
    assert data["at_risk_percentage"] == 0.0
    assert data["average_risk_probability"] == 0.0
    assert data["risk_distribution"]["low"] == 0
    assert data["risk_distribution"]["medium"] == 0
    assert data["risk_distribution"]["high"] == 0
    assert data["school_distribution"] == []


# =========================================================================
# 4. Strict Cross-Faculty & Unassigned 403 Forbidden Enforcement
# =========================================================================

def test_verify_student_access_unassigned_faculty_403(test_client: TestClient, assignment_test_env):
    """Faculty member accessing an unassigned student receives 403 Forbidden across all student endpoints."""
    fac_b_headers = assignment_test_env["fac_b_headers"]
    unassigned_student_id = assignment_test_env["s1"].id  # s1 is assigned to Faculty A, not B

    # 1. GET /api/students/{id}
    res = test_client.get(f"/api/students/{unassigned_student_id}", headers=fac_b_headers)
    assert res.status_code == 403
    assert "not assigned to your mentorship roster" in res.json()["detail"]

    # 2. PATCH /api/students/{id}
    res = test_client.patch(f"/api/students/{unassigned_student_id}", json={"first_name": "Hacked"}, headers=fac_b_headers)
    assert res.status_code == 403
    assert "not assigned to your mentorship roster" in res.json()["detail"]

    # 3. GET /api/students/{id}/academic-data
    res = test_client.get(f"/api/students/{unassigned_student_id}/academic-data", headers=fac_b_headers)
    assert res.status_code == 403
    assert "not assigned to your mentorship roster" in res.json()["detail"]

    # 4. POST /api/students/{id}/academic-data
    payload = {
        "school": "GP", "sex": "F", "age": 17, "address": "U", "famsize": "GT3", "Pstatus": "T",
        "Medu": 2, "Fedu": 2, "Mjob": "other", "Fjob": "other", "reason": "course", "guardian": "mother",
        "traveltime": 1, "studytime": 2, "failures": 0, "schoolsup": "no", "famsup": "yes", "paid": "no",
        "activities": "yes", "nursery": "yes", "higher": "yes", "internet": "yes", "romantic": "no",
        "famrel": 4, "freetime": 3, "goout": 2, "Dalc": 1, "Walc": 1, "health": 5, "absences": 4,
        "G1": 12.0, "G2": 13.0, "term": "Term 2",
    }
    res = test_client.post(f"/api/students/{unassigned_student_id}/academic-data", json=payload, headers=fac_b_headers)
    assert res.status_code == 403
    assert "not assigned to your mentorship roster" in res.json()["detail"]

    # 5. GET /api/students/{id}/history
    res = test_client.get(f"/api/students/{unassigned_student_id}/history", headers=fac_b_headers)
    assert res.status_code == 403
    assert "not assigned to your mentorship roster" in res.json()["detail"]

    # 6. POST /api/predict
    res = test_client.post("/api/predict", json={"student_id": unassigned_student_id}, headers=fac_b_headers)
    assert res.status_code == 403
    assert "not assigned to your mentorship roster" in res.json()["detail"]

    # 7. GET /api/recommendations/{id}
    res = test_client.get(f"/api/recommendations/{unassigned_student_id}", headers=fac_b_headers)
    assert res.status_code == 403
    assert "not assigned to your mentorship roster" in res.json()["detail"]


# =========================================================================
# 5. Dataset Upload Assignment Side Effects
# =========================================================================

def test_dataset_upload_with_mentor_email(test_client: TestClient, assignment_test_env, db_session: Session):
    """Batch upload assigning student to mentor via mentor_email CSV column."""
    admin_headers = assignment_test_env["admin_headers"]
    fac_zero = assignment_test_env["fac_unassigned"]

    csv_content = (
        "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,traveltime,studytime,"
        "failures,schoolsup,famsup,paid,activities,nursery,higher,internet,romantic,famrel,freetime,goout,"
        "Dalc,Walc,health,absences,G1,G2,student_code,term,mentor_email\n"
        f"GP,F,16,U,GT3,T,3,3,other,other,course,mother,1,2,0,no,yes,no,yes,yes,yes,yes,no,4,3,2,1,1,5,4,13.0,14.0,STU-MENTOR-01,Term 1,{fac_zero.email}\n"
    )
    files = {"file": ("batch.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    resp = test_client.post("/api/dataset/upload", files=files, headers=admin_headers)
    assert resp.status_code == 201

    # Verify student was assigned to fac_zero
    uploaded_student = db_session.query(Student).filter(Student.student_code == "STU-MENTOR-01").first()
    assert uploaded_student is not None
    assignment = (
        db_session.query(MentorAssignment)
        .filter(MentorAssignment.faculty_user_id == fac_zero.id, MentorAssignment.student_id == uploaded_student.id)
        .first()
    )
    assert assignment is not None


def test_dataset_upload_faculty_auto_assignment(test_client: TestClient, assignment_test_env, db_session: Session):
    """Uploading faculty user is automatically assigned to uploaded students if no mentor_email is specified."""
    fac_zero_headers = assignment_test_env["fac_zero_headers"]
    fac_zero = assignment_test_env["fac_unassigned"]

    csv_content = (
        "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,traveltime,studytime,"
        "failures,schoolsup,famsup,paid,activities,nursery,higher,internet,romantic,famrel,freetime,goout,"
        "Dalc,Walc,health,absences,G1,G2,student_code,term\n"
        "MS,M,17,R,LE3,A,2,2,services,services,reputation,father,2,1,1,no,no,no,no,yes,yes,no,no,3,2,3,2,2,4,8,9.0,8.0,STU-AUTO-ASSIGN-01,Term 1\n"
    )
    files = {"file": ("faculty_batch.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    resp = test_client.post("/api/dataset/upload", files=files, headers=fac_zero_headers)
    assert resp.status_code == 201

    # Verify student was auto-assigned to fac_zero
    student = db_session.query(Student).filter(Student.student_code == "STU-AUTO-ASSIGN-01").first()
    assert student is not None
    assignment = (
        db_session.query(MentorAssignment)
        .filter(MentorAssignment.faculty_user_id == fac_zero.id, MentorAssignment.student_id == student.id)
        .first()
    )
    assert assignment is not None
