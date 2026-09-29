"""Tests for Faculty Student Cohort Browsing & Risk Triage Endpoint.

Endpoint: GET /api/faculty/students
Requirements:
- Role-based access control (require_roles("faculty", "admin"))
  - 401 Unauthorized for unauthenticated requests
  - 403 Forbidden for student accounts
  - 200 OK for faculty and administrator accounts
- Filtering:
  - risk_level (Low, Medium, High)
  - at_risk (bool, True -> at_risk_binary=1, False -> at_risk_binary=0)
  - school (e.g. "GP", "MS")
  - search (case-insensitive substring of student_code)
  - evaluated (bool, True -> has prediction, False -> unevaluated)
- Sorting:
  - risk_desc (highest risk probability first, unevaluated last)
  - risk_asc (lowest risk probability first, unevaluated last)
  - student_code (alphabetical ascending)
- Pagination:
  - page, page_size, total, items
  - validation on page >= 1 and 1 <= page_size <= 100
- Data integrity:
  - Top SHAP factor correctly selected
  - Unevaluated students handled safely with evaluated=False and nulls
  - Zero target leakage: G3 strictly absent from all responses and item keys
"""

import json
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.assignment import MentorAssignment
from backend.app.models.explanation import Explanation
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User


@pytest.fixture
def auth_users(db_session: Session):
    """Create student, faculty, and admin users with auth headers."""
    # 1. Student
    student_user = User(
        email="stu.test@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Student Test",
        role="student",
        is_active=True,
    )
    db_session.add(student_user)

    # 2. Faculty
    faculty_user = User(
        email="faculty.test@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Faculty Test",
        role="faculty",
        is_active=True,
    )
    db_session.add(faculty_user)

    # 3. Admin
    admin_user = User(
        email="admin.test@school.edu",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Admin Test",
        role="admin",
        is_active=True,
    )
    db_session.add(admin_user)
    db_session.commit()

    student_tok = create_access_token(subject=student_user.id, role="student")
    faculty_tok = create_access_token(subject=faculty_user.id, role="faculty")
    admin_tok = create_access_token(subject=admin_user.id, role="admin")

    return {
        "student_headers": {"Authorization": f"Bearer {student_tok}"},
        "faculty_headers": {"Authorization": f"Bearer {faculty_tok}"},
        "admin_headers": {"Authorization": f"Bearer {admin_tok}"},
    }


@pytest.fixture
def cohort_students(db_session: Session):
    """Seed a diverse cohort of students with predictions and explanations.

    Students:
    1. STU-001 (GP): High Risk (0.85, at_risk=1), 2 predictions, top factor 'Period 2 Grade'
    2. STU-002 (GP): Medium Risk (0.35, at_risk=0), 1 prediction, top factor 'Number of Absences'
    3. STU-003 (MS): Low Risk (0.10, at_risk=0), 1 prediction, top factor 'Study Time'
    4. STU-004 (MS): High Risk (0.75, at_risk=1), 1 prediction, top factor 'Past Failures'
    5. STU-005 (GP): Unevaluated (no predictions)
    """
    now = datetime.now(timezone.utc)

    # Student 1
    s1 = Student(student_code="STU-001", school="GP", cohort_year=2026)
    db_session.add(s1)
    db_session.flush()

    # S1 Old Prediction
    p1_old = Prediction(
        student_id=s1.id,
        risk_probability=0.60,
        risk_level="High",
        at_risk_binary=1,
        model_version="v1.0.0",
        created_at=now - timedelta(days=30),
    )
    db_session.add(p1_old)
    db_session.flush()

    # S1 Latest Prediction
    p1 = Prediction(
        student_id=s1.id,
        risk_probability=0.85,
        risk_level="High",
        at_risk_binary=1,
        model_version="v1.0.0",
        created_at=now - timedelta(days=1),
    )
    db_session.add(p1)
    db_session.flush()

    # Explanations for S1 latest
    exp1_1 = Explanation(
        prediction_id=p1.id,
        feature_name="G2",
        display_name="Period 2 Grade",
        contribution=-0.45,
        direction="increases_risk",
    )
    exp1_2 = Explanation(
        prediction_id=p1.id,
        feature_name="failures",
        display_name="Past Failures",
        contribution=0.30,
        direction="increases_risk",
    )
    db_session.add_all([exp1_1, exp1_2])

    # Student 2
    s2 = Student(student_code="STU-002", school="GP", cohort_year=2026)
    db_session.add(s2)
    db_session.flush()

    p2 = Prediction(
        student_id=s2.id,
        risk_probability=0.35,
        risk_level="Medium",
        at_risk_binary=0,
        model_version="v1.0.0",
        created_at=now - timedelta(days=5),
    )
    db_session.add(p2)
    db_session.flush()

    exp2 = Explanation(
        prediction_id=p2.id,
        feature_name="absences",
        display_name="Number of Absences",
        contribution=0.25,
        direction="increases_risk",
    )
    db_session.add(exp2)

    # Student 3
    s3 = Student(student_code="STU-003", school="MS", cohort_year=2026)
    db_session.add(s3)
    db_session.flush()

    p3 = Prediction(
        student_id=s3.id,
        risk_probability=0.10,
        risk_level="Low",
        at_risk_binary=0,
        model_version="v1.0.0",
        created_at=now - timedelta(days=10),
    )
    db_session.add(p3)
    db_session.flush()

    exp3 = Explanation(
        prediction_id=p3.id,
        feature_name="studytime",
        display_name="Study Time",
        contribution=-0.20,
        direction="decreases_risk",
    )
    db_session.add(exp3)

    # Student 4
    s4 = Student(student_code="STU-004", school="MS", cohort_year=2026)
    db_session.add(s4)
    db_session.flush()

    p4 = Prediction(
        student_id=s4.id,
        risk_probability=0.75,
        risk_level="High",
        at_risk_binary=1,
        model_version="v1.0.0",
        created_at=now - timedelta(days=2),
    )
    db_session.add(p4)
    db_session.flush()

    exp4 = Explanation(
        prediction_id=p4.id,
        feature_name="failures",
        display_name="Past Failures",
        contribution=0.50,
        direction="increases_risk",
    )
    db_session.add(exp4)

    # Student 5 (Unevaluated)
    s5 = Student(student_code="STU-005", school="GP", cohort_year=2026)
    db_session.add(s5)
    db_session.flush()

    fac_user = db_session.query(User).filter(User.email == "faculty.test@school.edu").first()
    if fac_user:
        for s in [s1, s2, s3, s4, s5]:
            db_session.add(MentorAssignment(faculty_user_id=fac_user.id, student_id=s.id))

    db_session.commit()
    return {"s1": s1, "s2": s2, "s3": s3, "s4": s4, "s5": s5}


# =========================================================================
# RBAC & SECURITY TESTS
# =========================================================================

def test_faculty_students_unauthenticated_returns_401(test_client: TestClient):
    """Unauthenticated requests must return 401 Unauthorized."""
    res = test_client.get("/api/faculty/students")
    assert res.status_code == 401


def test_faculty_students_student_role_returns_403(test_client: TestClient, auth_users):
    """Students attempting to browse the cohort directory must receive 403 Forbidden."""
    res = test_client.get("/api/faculty/students", headers=auth_users["student_headers"])
    assert res.status_code == 403


def test_faculty_students_faculty_and_admin_authorized(test_client: TestClient, auth_users, cohort_students):
    """Both faculty and admin roles are authorized to browse students."""
    # Faculty
    res_f = test_client.get("/api/faculty/students", headers=auth_users["faculty_headers"])
    assert res_f.status_code == 200
    data_f = res_f.json()
    assert data_f["total"] == 5

    # Admin
    res_a = test_client.get("/api/faculty/students", headers=auth_users["admin_headers"])
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["total"] == 5


# =========================================================================
# EMPTY DB & UNEVALUATED STUDENTS
# =========================================================================

def test_faculty_students_empty_db(test_client: TestClient, auth_users):
    """Empty database returns 200 OK with total=0 and empty items list."""
    res = test_client.get("/api/faculty/students", headers=auth_users["faculty_headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert data["items"] == []


def test_faculty_students_unevaluated_student_fields(test_client: TestClient, auth_users, cohort_students):
    """Unevaluated students must have evaluated=false and null prediction metrics."""
    res = test_client.get(
        "/api/faculty/students?search=STU-005",
        headers=auth_users["faculty_headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["student_code"] == "STU-005"
    assert item["evaluated"] is False
    assert item["latest_risk_level"] is None
    assert item["latest_risk_probability"] is None
    assert item["latest_prediction_date"] is None
    assert item["top_factor_label"] is None


# =========================================================================
# FILTERING TESTS
# =========================================================================

def test_faculty_students_filter_by_risk_level(test_client: TestClient, auth_users, cohort_students):
    """Filter by risk_level returns only matching students."""
    # High risk -> STU-001, STU-004
    res_high = test_client.get(
        "/api/faculty/students?risk_level=High",
        headers=auth_users["faculty_headers"],
    )
    assert res_high.status_code == 200
    data_high = res_high.json()
    assert data_high["total"] == 2
    for item in data_high["items"]:
        assert item["latest_risk_level"] == "High"
        assert item["evaluated"] is True

    # Medium risk -> STU-002
    res_med = test_client.get(
        "/api/faculty/students?risk_level=Medium",
        headers=auth_users["faculty_headers"],
    )
    assert res_med.status_code == 200
    data_med = res_med.json()
    assert data_med["total"] == 1
    assert data_med["items"][0]["student_code"] == "STU-002"

    # Low risk -> STU-003
    res_low = test_client.get(
        "/api/faculty/students?risk_level=Low",
        headers=auth_users["faculty_headers"],
    )
    assert res_low.status_code == 200
    data_low = res_low.json()
    assert data_low["total"] == 1
    assert data_low["items"][0]["student_code"] == "STU-003"


def test_faculty_students_filter_by_at_risk(test_client: TestClient, auth_users, cohort_students):
    """Filter by at_risk=true / at_risk=false."""
    # at_risk=true -> STU-001, STU-004
    res_true = test_client.get(
        "/api/faculty/students?at_risk=true",
        headers=auth_users["faculty_headers"],
    )
    assert res_true.status_code == 200
    data_true = res_true.json()
    assert data_true["total"] == 2
    codes = {item["student_code"] for item in data_true["items"]}
    assert codes == {"STU-001", "STU-004"}

    # at_risk=false -> STU-002, STU-003
    res_false = test_client.get(
        "/api/faculty/students?at_risk=false",
        headers=auth_users["faculty_headers"],
    )
    assert res_false.status_code == 200
    data_false = res_false.json()
    assert data_false["total"] == 2
    codes_false = {item["student_code"] for item in data_false["items"]}
    assert codes_false == {"STU-002", "STU-003"}


def test_faculty_students_filter_by_school(test_client: TestClient, auth_users, cohort_students):
    """Filter by school code."""
    # School GP -> STU-001, STU-002, STU-005
    res_gp = test_client.get(
        "/api/faculty/students?school=GP",
        headers=auth_users["faculty_headers"],
    )
    assert res_gp.status_code == 200
    data_gp = res_gp.json()
    assert data_gp["total"] == 3
    for item in data_gp["items"]:
        assert item["school"] == "GP"

    # School MS -> STU-003, STU-004
    res_ms = test_client.get(
        "/api/faculty/students?school=MS",
        headers=auth_users["faculty_headers"],
    )
    assert res_ms.status_code == 200
    data_ms = res_ms.json()
    assert data_ms["total"] == 2
    for item in data_ms["items"]:
        assert item["school"] == "MS"


def test_faculty_students_filter_by_search(test_client: TestClient, auth_users, cohort_students):
    """Filter by student_code case-insensitive substring."""
    res = test_client.get(
        "/api/faculty/students?search=stu-004",
        headers=auth_users["faculty_headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["student_code"] == "STU-004"

    # Search with partial match
    res_partial = test_client.get(
        "/api/faculty/students?search=00",
        headers=auth_users["faculty_headers"],
    )
    assert res_partial.status_code == 200
    assert res_partial.json()["total"] == 5


def test_faculty_students_filter_by_evaluated(test_client: TestClient, auth_users, cohort_students):
    """Filter by evaluated=true or evaluated=false."""
    # Evaluated -> 4 students
    res_eval = test_client.get(
        "/api/faculty/students?evaluated=true",
        headers=auth_users["faculty_headers"],
    )
    assert res_eval.status_code == 200
    data_eval = res_eval.json()
    assert data_eval["total"] == 4
    for item in data_eval["items"]:
        assert item["evaluated"] is True

    # Unevaluated -> 1 student (STU-005)
    res_uneval = test_client.get(
        "/api/faculty/students?evaluated=false",
        headers=auth_users["faculty_headers"],
    )
    assert res_uneval.status_code == 200
    data_uneval = res_uneval.json()
    assert data_uneval["total"] == 1
    assert data_uneval["items"][0]["student_code"] == "STU-005"
    assert data_uneval["items"][0]["evaluated"] is False


# =========================================================================
# SORTING TESTS
# =========================================================================

def test_faculty_students_sort_risk_desc(test_client: TestClient, auth_users, cohort_students):
    """Default sort (risk_desc) orders highest probability first, unevaluated last."""
    res = test_client.get(
        "/api/faculty/students?sort=risk_desc",
        headers=auth_users["faculty_headers"],
    )
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 5

    # Evaluated students first in descending order of risk probability
    # STU-001 (0.85) -> STU-004 (0.75) -> STU-002 (0.35) -> STU-003 (0.10)
    assert items[0]["student_code"] == "STU-001"
    assert items[0]["latest_risk_probability"] == 0.85
    assert items[1]["student_code"] == "STU-004"
    assert items[1]["latest_risk_probability"] == 0.75
    assert items[2]["student_code"] == "STU-002"
    assert items[2]["latest_risk_probability"] == 0.35
    assert items[3]["student_code"] == "STU-003"
    assert items[3]["latest_risk_probability"] == 0.10

    # Unevaluated student last
    assert items[4]["student_code"] == "STU-005"
    assert items[4]["evaluated"] is False


def test_faculty_students_sort_risk_asc(test_client: TestClient, auth_users, cohort_students):
    """Sort risk_asc orders lowest probability first, unevaluated last."""
    res = test_client.get(
        "/api/faculty/students?sort=risk_asc",
        headers=auth_users["faculty_headers"],
    )
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 5

    # Evaluated students ascending:
    # STU-003 (0.10) -> STU-002 (0.35) -> STU-004 (0.75) -> STU-001 (0.85)
    assert items[0]["student_code"] == "STU-003"
    assert items[0]["latest_risk_probability"] == 0.10
    assert items[1]["student_code"] == "STU-002"
    assert items[1]["latest_risk_probability"] == 0.35
    assert items[2]["student_code"] == "STU-004"
    assert items[2]["latest_risk_probability"] == 0.75
    assert items[3]["student_code"] == "STU-001"
    assert items[3]["latest_risk_probability"] == 0.85

    # Unevaluated student last
    assert items[4]["student_code"] == "STU-005"
    assert items[4]["evaluated"] is False


def test_faculty_students_sort_student_code(test_client: TestClient, auth_users, cohort_students):
    """Sort student_code orders alphabetically ascending."""
    res = test_client.get(
        "/api/faculty/students?sort=student_code",
        headers=auth_users["faculty_headers"],
    )
    assert res.status_code == 200
    items = res.json()["items"]
    codes = [item["student_code"] for item in items]
    assert codes == ["STU-001", "STU-002", "STU-003", "STU-004", "STU-005"]


# =========================================================================
# PAGINATION BOUNDS & SLICING
# =========================================================================

def test_faculty_students_pagination_slicing(test_client: TestClient, auth_users, cohort_students):
    """Pagination slices items correctly and returns non-overlapping pages."""
    # Page 1, size 2
    res_p1 = test_client.get(
        "/api/faculty/students?page=1&page_size=2&sort=student_code",
        headers=auth_users["faculty_headers"],
    )
    assert res_p1.status_code == 200
    d1 = res_p1.json()
    assert d1["total"] == 5
    assert d1["page"] == 1
    assert d1["page_size"] == 2
    assert len(d1["items"]) == 2
    assert [i["student_code"] for i in d1["items"]] == ["STU-001", "STU-002"]

    # Page 2, size 2
    res_p2 = test_client.get(
        "/api/faculty/students?page=2&page_size=2&sort=student_code",
        headers=auth_users["faculty_headers"],
    )
    assert res_p2.status_code == 200
    d2 = res_p2.json()
    assert d2["total"] == 5
    assert d2["page"] == 2
    assert d2["page_size"] == 2
    assert len(d2["items"]) == 2
    assert [i["student_code"] for i in d2["items"]] == ["STU-003", "STU-004"]

    # Page 3, size 2 (only 1 remaining)
    res_p3 = test_client.get(
        "/api/faculty/students?page=3&page_size=2&sort=student_code",
        headers=auth_users["faculty_headers"],
    )
    assert res_p3.status_code == 200
    d3 = res_p3.json()
    assert len(d3["items"]) == 1
    assert d3["items"][0]["student_code"] == "STU-005"


def test_faculty_students_pagination_bounds_validation(test_client: TestClient, auth_users):
    """Invalid pagination bounds must return 422 Unprocessable Entity."""
    # Page < 1
    res_zero = test_client.get(
        "/api/faculty/students?page=0",
        headers=auth_users["faculty_headers"],
    )
    assert res_zero.status_code == 422

    # Page size < 1
    res_neg_size = test_client.get(
        "/api/faculty/students?page_size=0",
        headers=auth_users["faculty_headers"],
    )
    assert res_neg_size.status_code == 422

    # Page size > 100
    res_huge_size = test_client.get(
        "/api/faculty/students?page_size=101",
        headers=auth_users["faculty_headers"],
    )
    assert res_huge_size.status_code == 422

    # Invalid sort option
    res_bad_sort = test_client.get(
        "/api/faculty/students?sort=unsupported_sort",
        headers=auth_users["faculty_headers"],
    )
    assert res_bad_sort.status_code == 422

    # Invalid risk_level
    res_bad_risk = test_client.get(
        "/api/faculty/students?risk_level=Extreme",
        headers=auth_users["faculty_headers"],
    )
    assert res_bad_risk.status_code == 422


# =========================================================================
# TOP FACTOR AND ANTI-LEAKAGE (NO G3) TESTS
# =========================================================================

def test_faculty_students_top_factor_label_resolution(test_client: TestClient, auth_users, cohort_students):
    """Top SHAP factor is correctly selected by magnitude of contribution."""
    res = test_client.get(
        "/api/faculty/students?search=STU-001",
        headers=auth_users["faculty_headers"],
    )
    assert res.status_code == 200
    item = res.json()["items"][0]
    # For STU-001, G2 (Period 2 Grade) has contribution -0.45 (abs=0.45), which is > 0.30
    assert item["top_factor_label"] == "Period 2 Grade"


def test_faculty_students_no_g3_leakage(test_client: TestClient, auth_users, cohort_students):
    """Strictly assert zero target leakage: G3 must never appear in response."""
    res = test_client.get("/api/faculty/students", headers=auth_users["faculty_headers"])
    assert res.status_code == 200

    raw_text = res.text.lower()
    # Ensure neither "g3" nor "g_3" is present anywhere in the serialized payload
    assert "g3" not in raw_text
    assert "g_3" not in raw_text

    data = res.json()
    for item in data["items"]:
        # Verify schema field whitelist
        allowed_keys = {
            "id",
            "student_code",
            "school",
            "latest_risk_level",
            "latest_risk_probability",
            "latest_prediction_date",
            "top_factor_label",
            "evaluated",
        }
        assert set(item.keys()) == allowed_keys
        # Ensure no PII like email, name, address leaked
        assert "email" not in item
        assert "first_name" not in item
        assert "last_name" not in item
        assert "address" not in item
