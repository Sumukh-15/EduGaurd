"""Unit and integration tests for dataset batch upload endpoint (POST /api/dataset/upload).

Sub-step 2.7:
- POST /api/dataset/upload
"""

import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.prediction import Prediction
from backend.app.models.student import Student
from backend.app.models.user import User


# Complete 32-feature CSV header + optional metadata
VALID_HEADER = (
    "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,"
    "traveltime,studytime,failures,schoolsup,famsup,paid,activities,nursery,higher,"
    "internet,romantic,famrel,freetime,goout,Dalc,Walc,health,absences,G1,G2,student_code,term"
)

VALID_ROW_1 = (
    "GP,F,17,U,GT3,T,3,2,other,other,course,mother,1,2,0,no,yes,no,yes,yes,yes,yes,no,4,3,2,1,1,5,4,13.0,14.0,STU-UP-001,Term 1"
)

VALID_ROW_2 = (
    "MS,M,16,R,LE3,A,2,3,services,services,home,father,2,1,1,yes,no,yes,no,no,yes,no,yes,3,4,3,2,2,4,6,11.0,12.0,STU-UP-002,Term 1"
)

VALID_CSV_CONTENT = f"{VALID_HEADER}\n{VALID_ROW_1}\n{VALID_ROW_2}\n"


@pytest.fixture
def faculty_auth(db_session: Session):
    """Create a faculty user and authorization header."""
    user = User(
        email="faculty.upload@school.edu",
        hashed_password=get_password_hash("FacultyPass123!"),
        full_name="Prof Uploader",
        role="faculty",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(subject=user.id, role="faculty")
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def admin_auth(db_session: Session):
    """Create an admin user and authorization header."""
    user = User(
        email="admin.upload@school.edu",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin Uploader",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(subject=user.id, role="admin")
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def student_auth(db_session: Session):
    """Create a student user and authorization header."""
    user = User(
        email="student.upload@school.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        full_name="Student Uploader",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token(subject=user.id, role="student")
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


# =========================================================================
# RBAC & AUTHENTICATION TESTS
# =========================================================================

def test_upload_unauthenticated_rejected(test_client: TestClient):
    """Unauthenticated upload requests must receive 401 Unauthorized."""
    files = {"file": ("students.csv", io.BytesIO(VALID_CSV_CONTENT.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files)
    assert res.status_code == 401


def test_upload_student_forbidden(test_client: TestClient, student_auth):
    """Students are strictly forbidden from uploading datasets (403 Forbidden)."""
    files = {"file": ("students.csv", io.BytesIO(VALID_CSV_CONTENT.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=student_auth["headers"])
    assert res.status_code == 403
    assert "Operation not permitted" in res.json()["detail"]


def test_upload_faculty_allowed(test_client: TestClient, faculty_auth):
    """Faculty members can upload and ingest valid dataset CSVs."""
    files = {"file": ("students.csv", io.BytesIO(VALID_CSV_CONTENT.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "success"
    assert data["total_rows"] == 2
    assert data["records_created"] == 2
    assert data["students_created"] == 2


def test_upload_admin_allowed(test_client: TestClient, admin_auth):
    """Administrators can upload and ingest valid dataset CSVs."""
    files = {"file": ("students.csv", io.BytesIO(VALID_CSV_CONTENT.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=admin_auth["headers"])
    assert res.status_code == 201
    assert res.json()["status"] == "success"


# =========================================================================
# FORMAT, EXTENSION & FILE SIZE TESTS
# =========================================================================

def test_upload_wrong_extension_rejected(test_client: TestClient, faculty_auth):
    """Files without a .csv extension must be rejected with 400 Bad Request."""
    files = {"file": ("students.xlsx", io.BytesIO(b"dummy binary data"), "application/vnd.ms-excel")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 400
    assert "Only .csv files are supported" in res.json()["detail"]


def test_upload_wrong_mime_type_rejected(test_client: TestClient, faculty_auth):
    """Disallowed MIME content types must be rejected with 400 Bad Request."""
    files = {"file": ("students.csv", io.BytesIO(VALID_CSV_CONTENT.encode("utf-8")), "application/pdf")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 400
    assert "Invalid MIME type" in res.json()["detail"]


def test_upload_empty_file_rejected(test_client: TestClient, faculty_auth):
    """Empty files (0 bytes) must be rejected with 400 Bad Request."""
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_upload_file_over_10mb_rejected(test_client: TestClient, faculty_auth):
    """Files exceeding 10 MB must be rejected with 413 Request Entity Too Large."""
    # Create an in-memory stream exceeding 10 MB
    large_payload = b"x" * (10 * 1024 * 1024 + 1024)
    files = {"file": ("huge.csv", io.BytesIO(large_payload), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 413
    assert "exceeds maximum permitted limit of 10 MB" in res.json()["detail"]


def test_upload_semicolon_delimited_csv_success(test_client: TestClient, faculty_auth):
    """Verify that semicolon-separated datasets (e.g. raw UCI dataset) parse properly."""
    semicolon_csv = VALID_CSV_CONTENT.replace(",", ";")
    files = {"file": ("uci_students.csv", io.BytesIO(semicolon_csv.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 201
    assert res.json()["records_created"] == 2


# =========================================================================
# LEAKAGE PROTECTION & SCHEMA VALIDATION TESTS
# =========================================================================

def test_upload_g3_strictly_rejected(test_client: TestClient, faculty_auth):
    """Presence of target label G3 must trigger immediate 422 rejection (Anti-leakage)."""
    leaked_header = f"{VALID_HEADER},G3"
    leaked_row = f"{VALID_ROW_1},15"
    leaked_csv = f"{leaked_header}\n{leaked_row}\n"

    files = {"file": ("leaked_data.csv", io.BytesIO(leaked_csv.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 422
    assert "Data leakage detected: Target label 'G3' is strictly forbidden" in res.json()["detail"]


def test_upload_unknown_columns_rejected(test_client: TestClient, faculty_auth):
    """Unexpected or unpermitted columns must be rejected with 422 Unprocessable Entity."""
    extra_header = f"{VALID_HEADER},random_metric"
    extra_row = f"{VALID_ROW_1},99"
    bad_csv = f"{extra_header}\n{extra_row}\n"

    files = {"file": ("bad_columns.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 422
    assert "Unexpected column(s) detected" in res.json()["detail"]
    assert "random_metric" in res.json()["detail"]


def test_upload_missing_required_features_rejected(test_client: TestClient, faculty_auth):
    """Missing any of the 32 permissible features must be rejected with 422."""
    # Omit 'G1' and 'absences'
    cols = VALID_HEADER.split(",")
    cols.remove("G1")
    cols.remove("absences")
    bad_header = ",".join(cols)
    bad_csv = f"{bad_header}\n"

    files = {"file": ("missing_cols.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 422
    assert "Missing required feature column(s)" in res.json()["detail"]


def test_upload_invalid_numeric_range_rejected(test_client: TestClient, faculty_auth):
    """Out-of-bounds numeric values (e.g. age=30, G1=25.0) must be rejected with 422."""
    # Replace age 17 with age 99
    bad_row = VALID_ROW_1.replace(",17,", ",99,")
    bad_csv = f"{VALID_HEADER}\n{bad_row}\n"

    files = {"file": ("invalid_numeric.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 422
    assert "Row 2:" in res.json()["detail"]


def test_upload_invalid_categorical_value_rejected(test_client: TestClient, faculty_auth):
    """Unrecognized categorical values (e.g. school='INVALID') must be rejected with 422."""
    # Replace school GP with INVALID
    bad_row = VALID_ROW_1.replace("GP,", "INVALID,")
    bad_csv = f"{VALID_HEADER}\n{bad_row}\n"

    files = {"file": ("invalid_categorical.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 422
    assert "Row 2:" in res.json()["detail"]


def test_upload_missing_field_value_in_row_rejected(test_client: TestClient, faculty_auth):
    """Missing or empty values in a data row must be rejected with 422."""
    # Make studytime empty
    bad_row = VALID_ROW_1.replace(",2,0,no", ",,0,no")
    bad_csv = f"{VALID_HEADER}\n{bad_row}\n"

    files = {"file": ("empty_field.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 422
    assert "Row 2: Missing value for required field 'studytime'" in res.json()["detail"]


def test_upload_duplicate_handling_within_file(test_client: TestClient, faculty_auth):
    """Duplicate records for the same student code and term in the same file must be rejected."""
    duplicate_csv = f"{VALID_HEADER}\n{VALID_ROW_1}\n{VALID_ROW_1}\n"
    files = {"file": ("duplicates.csv", io.BytesIO(duplicate_csv.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 422
    assert "Duplicate record detected for student 'STU-UP-001' in term 'Term 1'" in res.json()["detail"]


# =========================================================================
# TRANSACTIONAL ROLLBACK & PERSISTENCE INVARIANTS
# =========================================================================

def test_upload_transactional_rollback_on_failure(test_client: TestClient, faculty_auth, db_session: Session):
    """When a file contains a valid row followed by an invalid row, zero records must be persisted."""
    initial_count = db_session.query(AcademicRecord).count()

    # Row 1 is valid, Row 2 has out-of-range grade G1=50.0
    invalid_row_2 = VALID_ROW_2.replace(",11.0,", ",50.0,")
    mixed_csv = f"{VALID_HEADER}\n{VALID_ROW_1}\n{invalid_row_2}\n"

    files = {"file": ("mixed.csv", io.BytesIO(mixed_csv.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 422

    # Verify atomic rollback: no records were inserted into the database
    after_count = db_session.query(AcademicRecord).count()
    assert after_count == initial_count


def test_upload_security_path_traversal_neutralized(test_client: TestClient, faculty_auth):
    """Filenames with path traversal characters must be neutralized safely."""
    files = {"file": ("../../etc/malicious.csv", io.BytesIO(VALID_CSV_CONTENT.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 201
    assert res.json()["filename"] == "malicious.csv"


def test_upload_no_unintended_predictions_created(test_client: TestClient, faculty_auth, db_session: Session):
    """Uploading academic records must NEVER automatically create prediction records."""
    initial_predictions = db_session.query(Prediction).count()

    files = {"file": ("telemetry_only.csv", io.BytesIO(VALID_CSV_CONTENT.encode("utf-8")), "text/csv")}
    res = test_client.post("/api/dataset/upload", files=files, headers=faculty_auth["headers"])
    assert res.status_code == 201

    after_predictions = db_session.query(Prediction).count()
    assert after_predictions == initial_predictions, "Predictions must not be automatically generated during upload!"
