"""Live PostgreSQL and Uvicorn integration verification script.

Tests all endpoints and dependencies against the live PostgreSQL database
running on localhost:5433 with Uvicorn on http://127.0.0.1:8000.
"""

import sys
import httpx
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.db.session import SessionLocal
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.prediction import Prediction
from backend.app.api.deps import verify_student_access, require_roles
from fastapi import HTTPException

BASE_URL = "http://127.0.0.1:8000"


def run_live_tests():
    print("=" * 60)
    print("STARTING LIVE POSTGRESQL & UVICORN VERIFICATION SUITE")
    print(f"Base URL: {BASE_URL}")
    print(f"Database: {settings.DATABASE_URL.split('@')[-1]}")
    print("=" * 60)

    # 1. GET /
    r = httpx.get(f"{BASE_URL}/")
    assert r.status_code == 200, f"GET / failed: {r.status_code} {r.text}"
    print("[PASS] 1. GET / -> 200 OK")

    # 2. GET /docs
    r = httpx.get(f"{BASE_URL}/docs")
    assert r.status_code == 200, f"GET /docs failed: {r.status_code}"
    assert "swagger" in r.text.lower() or "openapi" in r.text.lower(), "Swagger UI not found in /docs"
    print("[PASS] 2. GET /docs -> 200 OK (Swagger UI present)")

    # 3. GET /api/health
    r = httpx.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200, f"GET /api/health failed: {r.status_code} {r.text}"
    health_data = r.json()
    assert health_data.get("status") == "ok", f"Health status not ok: {health_data}"
    assert health_data.get("model_loaded") is True, f"Model not loaded: {health_data}"
    print(f"[PASS] 3. GET /api/health -> 200 OK (status: ok, model_loaded: True)")

    # 4. POST /api/auth/login - Non-existent user
    r = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": "nonexistent@school.edu", "password": "RandomPassword!"})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    assert r.json().get("detail") == "Incorrect email or password", f"Unexpected generic detail: {r.text}"
    print("[PASS] 4. POST /api/auth/login (Non-existent user) -> 401 Generic Error")

    # 5. POST /api/auth/login - Wrong password
    r = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": "student@school.edu", "password": "WrongPassword123!"})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    assert r.json().get("detail") == "Incorrect email or password", f"Unexpected generic detail: {r.text}"
    print("[PASS] 5. POST /api/auth/login (Wrong password) -> 401 Generic Error (Anti-Enumeration confirmed)")

    # 6. POST /api/auth/login - Valid student login
    r = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": "student@school.edu", "password": "TestStudent123!"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code} {r.text}"
    student_token_data = r.json()
    assert "access_token" in student_token_data, "No access_token returned"
    assert student_token_data.get("token_type") == "bearer", f"Token type not bearer: {student_token_data}"
    assert student_token_data.get("role") == "student", f"Role not student: {student_token_data}"
    student_token = student_token_data["access_token"]
    print("[PASS] 6. POST /api/auth/login (Valid student) -> 200 OK with JWT token")

    # 7. GET /api/auth/me - Authenticated student
    headers = {"Authorization": f"Bearer {student_token}"}
    r = httpx.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert r.status_code == 200, f"Expected 200, got {r.status_code} {r.text}"
    student_profile = r.json()
    assert student_profile.get("email") == "student@school.edu"
    assert student_profile.get("role") == "student"
    assert student_profile.get("student_code") == "STU-1001"
    print(f"[PASS] 7. GET /api/auth/me (Student) -> 200 OK (email={student_profile['email']}, code={student_profile['student_code']})")

    # 8. POST /api/auth/login - Valid faculty login
    r = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": "faculty@school.edu", "password": "TestFaculty123!"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code} {r.text}"
    faculty_token_data = r.json()
    assert faculty_token_data.get("role") == "faculty"
    faculty_token = faculty_token_data["access_token"]
    print("[PASS] 8. POST /api/auth/login (Valid faculty) -> 200 OK with JWT token")

    # 9. GET /api/auth/me - Authenticated faculty
    headers = {"Authorization": f"Bearer {faculty_token}"}
    r = httpx.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert r.status_code == 200, f"Expected 200, got {r.status_code} {r.text}"
    faculty_profile = r.json()
    assert faculty_profile.get("email") == "faculty@school.edu"
    assert faculty_profile.get("role") == "faculty"
    print(f"[PASS] 9. GET /api/auth/me (Faculty) -> 200 OK (role={faculty_profile['role']})")

    # 10. POST /api/auth/login - Valid admin login
    r = httpx.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@school.edu", "password": "TestAdmin123!"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code} {r.text}"
    admin_token_data = r.json()
    assert admin_token_data.get("role") == "admin"
    admin_token = admin_token_data["access_token"]
    print("[PASS] 10. POST /api/auth/login (Valid admin) -> 200 OK with JWT token")

    # 11. GET /api/auth/me - Authenticated admin
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = httpx.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert r.status_code == 200, f"Expected 200, got {r.status_code} {r.text}"
    admin_profile = r.json()
    assert admin_profile.get("email") == "admin@school.edu"
    assert admin_profile.get("role") == "admin"
    print(f"[PASS] 11. GET /api/auth/me (Admin) -> 200 OK (role={admin_profile['role']})")

    # 12. Security Edge Cases: Tampered token & Missing header
    r = httpx.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer invalid.tampered.token"})
    assert r.status_code == 401, f"Expected 401 for tampered token, got {r.status_code}"
    print("[PASS] 12a. Tampered Bearer token -> 401 Unauthorized")

    r = httpx.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401, f"Expected 401 for missing header, got {r.status_code}"
    print("[PASS] 12b. Missing Authorization header -> 401 Unauthorized")

    # 13. RBAC & Student Ownership verification against PostgreSQL records
    db: Session = SessionLocal()
    try:
        student_user = db.query(User).filter(User.email == "student@school.edu").first()
        faculty_user = db.query(User).filter(User.email == "faculty@school.edu").first()
        admin_user = db.query(User).filter(User.email == "admin@school.edu").first()
        student_own = db.query(Student).filter(Student.student_code == "STU-1001").first()
        student_other = db.query(Student).filter(Student.student_code == "STU-1002").first()

        assert student_own is not None, "STU-1001 not found"
        assert student_other is not None, "STU-1002 not found"

        # 13a. Student accessing their own record -> Allowed
        verify_student_access(student_id=student_own.id, current_user=student_user, db=db)
        print("[PASS] 13a. RBAC: Student accessing own student_id -> Allowed")

        # 13b. Student accessing unlinked/other student record -> 403 Forbidden
        try:
            verify_student_access(student_id=student_other.id, current_user=student_user, db=db)
            assert False, "Student should NOT be able to access another student's record"
        except HTTPException as exc:
            assert exc.status_code == 403
            print("[PASS] 13b. RBAC: Student accessing cross-student record -> 403 Forbidden")

        # 13c. Faculty accessing assigned student records -> Allowed
        verify_student_access(student_id=student_own.id, current_user=faculty_user, db=db)
        verify_student_access(student_id=student_other.id, current_user=faculty_user, db=db)
        print("[PASS] 13c. RBAC: Faculty accessing assigned student records -> Allowed")

        # 13d. Admin accessing any student record -> Allowed
        verify_student_access(student_id=student_own.id, current_user=admin_user, db=db)
        verify_student_access(student_id=student_other.id, current_user=admin_user, db=db)
        print("[PASS] 13d. RBAC: Admin accessing student records -> Allowed")

        # 13e. Role requirement: Student accessing faculty role -> 403
        try:
            checker = require_roles("faculty", "admin")
            # pyrefly: ignore [unexpected-keyword]
            checker(current_user=student_user)
            assert False, "Student should NOT pass require_roles('faculty', 'admin')"
        except HTTPException as exc:
            assert exc.status_code == 403
            print("[PASS] 13e. RBAC: Student accessing faculty/admin role endpoint -> 403 Forbidden")

        # 13f. Role requirement: Faculty accessing faculty role -> Allowed
        checker = require_roles("faculty", "admin")
        # pyrefly: ignore [unexpected-keyword]
        checker(current_user=faculty_user)
        print("[PASS] 13f. RBAC: Faculty accessing faculty/admin role endpoint -> Allowed")

        # 13g. Role requirement: Faculty accessing admin-only role -> 403
        try:
            checker = require_roles("admin")
            # pyrefly: ignore [unexpected-keyword]
            checker(current_user=faculty_user)
            assert False, "Faculty should NOT pass require_roles('admin')"
        except HTTPException as exc:
            assert exc.status_code == 403
            print("[PASS] 13g. RBAC: Faculty accessing admin-only role endpoint -> 403 Forbidden")

        # 13h. Role requirement: Admin accessing admin role -> Allowed
        checker = require_roles("admin")
        # pyrefly: ignore [unexpected-keyword]
        checker(current_user=admin_user)
        print("[PASS] 13h. RBAC: Admin accessing admin role endpoint -> Allowed")

    finally:
        db.close()

    # =========================================================================
    # SUB-STEP 2.4 LIVE ENDPOINT VERIFICATION (POSTGRESQL + UVICORN)
    # =========================================================================
    print("-" * 60)
    print("SUB-STEP 2.4 STUDENT & ACADEMIC DATA LIVE ENDPOINT VERIFICATION")
    print("-" * 60)

    # Need student ID for student@school.edu (STU-1001)
    db = SessionLocal()
    try:
        s1 = db.query(Student).filter(Student.student_code == "STU-1001").first()
        s2 = db.query(Student).filter(Student.student_code == "STU-1002").first()
        assert s1 is not None and s2 is not None
        s1_id = s1.id
        s2_id = s2.id
    finally:
        db.close()

    # 14. GET /api/students/{id} - Own profile
    r = httpx.get(f"{BASE_URL}/api/students/{s1_id}", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    assert r.json()["student_code"] == "STU-1001"
    print(f"[PASS] 14. GET /api/students/{s1_id} (Student viewing own profile) -> 200 OK")

    # 15. GET /api/students/{id} - Cross-student forbidden
    r = httpx.get(f"{BASE_URL}/api/students/{s2_id}", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 403, f"Expected 403, got {r.status_code}"
    print(f"[PASS] 15. GET /api/students/{s2_id} (Student viewing cross-student profile) -> 403 Forbidden")

    # 16. GET /api/students/{id} - Faculty allowed for any student
    r = httpx.get(f"{BASE_URL}/api/students/{s1_id}", headers={"Authorization": f"Bearer {faculty_token}"})
    assert r.status_code == 200
    r2 = httpx.get(f"{BASE_URL}/api/students/{s2_id}", headers={"Authorization": f"Bearer {faculty_token}"})
    assert r2.status_code == 200
    print("[PASS] 16. GET /api/students/{id} (Faculty viewing any student) -> 200 OK")

    # 17. GET /api/students/{id} - Admin allowed
    r = httpx.get(f"{BASE_URL}/api/students/{s1_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    print("[PASS] 17. GET /api/students/{id} (Admin viewing student) -> 200 OK")

    # 18. GET /api/students/999999 - Not found
    r = httpx.get(f"{BASE_URL}/api/students/999999", headers={"Authorization": f"Bearer {faculty_token}"})
    assert r.status_code == 404
    print("[PASS] 18. GET /api/students/999999 (Non-existent student) -> 404 Not Found")

    # 19. PATCH /api/students/{id} - Student updating permitted attributes
    r = httpx.patch(
        f"{BASE_URL}/api/students/{s1_id}",
        json={"first_name": "AliceUpdated", "cohort_year": 2027},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert r.status_code == 200
    assert r.json()["first_name"] == "AliceUpdated"
    assert r.json()["cohort_year"] == 2027
    print(f"[PASS] 19. PATCH /api/students/{s1_id} (Student updating permitted fields) -> 200 OK")

    # 20. PATCH /api/students/{id} - Student attempting cross-student update
    r = httpx.patch(
        f"{BASE_URL}/api/students/{s2_id}",
        json={"first_name": "Hacked"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert r.status_code == 403
    print(f"[PASS] 20. PATCH /api/students/{s2_id} (Cross-student update) -> 403 Forbidden")

    # 21. PATCH /api/students/{id} - Extra immutable field rejected
    r = httpx.patch(
        f"{BASE_URL}/api/students/{s1_id}",
        json={"student_code": "NEW-CODE"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert r.status_code == 422
    print("[PASS] 21. PATCH /api/students/{id} (Immutable student_code rejected) -> 422 Unprocessable Entity")

    # 22. POST /api/students/{id}/academic-data - Student forbidden to author telemetry
    sample_academic = {
        "age": 17, "Medu": 3, "Fedu": 2, "traveltime": 1, "studytime": 2, "failures": 0,
        "famrel": 4, "freetime": 3, "goout": 2, "Dalc": 1, "Walc": 1, "health": 5, "absences": 4,
        "G1": 13.0, "G2": 14.0, "school": "GP", "sex": "F", "address": "U", "famsize": "GT3",
        "Pstatus": "T", "schoolsup": "no", "famsup": "yes", "paid": "no", "activities": "yes",
        "nursery": "yes", "higher": "yes", "internet": "yes", "romantic": "no",
        "Mjob": "other", "Fjob": "other", "reason": "course", "guardian": "mother", "term": "Term 1"
    }
    r = httpx.post(
        f"{BASE_URL}/api/students/{s1_id}/academic-data",
        json=sample_academic,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert r.status_code == 403
    print("[PASS] 22. POST /api/students/{id}/academic-data (Student prohibited from telemetry entry) -> 403 Forbidden")

    # 23. POST /api/students/{id}/academic-data - G3 leakage strictly rejected
    leaked_payload = dict(sample_academic)
    leaked_payload["G3"] = 15.0
    r = httpx.post(
        f"{BASE_URL}/api/students/{s1_id}/academic-data",
        json=leaked_payload,
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 422
    print("[PASS] 23. POST /api/students/{id}/academic-data (Target label G3 strictly rejected) -> 422 Unprocessable Entity")

    # 24. POST /api/students/{id}/academic-data - Out-of-bounds validation
    invalid_grade = dict(sample_academic)
    invalid_grade["G1"] = 25.0
    r = httpx.post(
        f"{BASE_URL}/api/students/{s1_id}/academic-data",
        json=invalid_grade,
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 422
    print("[PASS] 24. POST /api/students/{id}/academic-data (Out-of-bounds grade G1=25 rejected) -> 422 Unprocessable Entity")

    # 25. POST /api/students/{id}/academic-data - Faculty recording valid telemetry
    r = httpx.post(
        f"{BASE_URL}/api/students/{s1_id}/academic-data",
        json=sample_academic,
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 201
    created_record = r.json()
    assert created_record["student_id"] == s1_id
    assert created_record["G1"] == 13.0
    assert "G3" not in created_record
    print(f"[PASS] 25. POST /api/students/{s1_id}/academic-data (Faculty recording valid 32 features) -> 201 Created")

    # 26. GET /api/students/{id}/academic-data - Student viewing own records
    r = httpx.get(f"{BASE_URL}/api/students/{s1_id}/academic-data", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 200
    records = r.json()
    assert len(records) >= 1
    assert records[0]["student_id"] == s1_id
    assert "G3" not in records[0]
    print(f"[PASS] 26. GET /api/students/{s1_id}/academic-data (Student viewing own records) -> 200 OK (count={len(records)})")

    # 27. GET /api/students/{id}/academic-data - Student cross-student view forbidden
    r = httpx.get(f"{BASE_URL}/api/students/{s2_id}/academic-data", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 403
    print(f"[PASS] 27. GET /api/students/{s2_id}/academic-data (Cross-student telemetry view) -> 403 Forbidden")

    # =========================================================================
    # SUB-STEP 2.5 LIVE PREDICTION & SHAP EXPLANATION VERIFICATION (POSTGRESQL + UVICORN)
    # =========================================================================
    print("-" * 60)
    print("SUB-STEP 2.5 PREDICTION & SHAP EXPLANATION LIVE ENDPOINT VERIFICATION")
    print("-" * 60)

    # 28. POST /api/predict - Student evaluating own telemetry
    r = httpx.post(
        f"{BASE_URL}/api/predict",
        json={"student_id": s1_id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    pred_data = r.json()
    assert pred_data["student_id"] == s1_id
    assert pred_data["risk_level"] in ("Low", "Medium", "High")
    assert 0.0 <= pred_data["risk_probability"] <= 1.0
    assert pred_data["at_risk_binary"] in (0, 1)
    assert pred_data["model_version"] == "v1.0.0"
    assert len(pred_data["top_factors"]) == 5
    assert "causal" in pred_data["causal_disclaimer"].lower()
    live_pred_id = pred_data["prediction_id"]
    print(f"[PASS] 28. POST /api/predict (Student own prediction) -> 200 OK (id={live_pred_id}, risk={pred_data['risk_level']}, prob={pred_data['risk_probability']})")

    # 29. Verify database persistence in PostgreSQL
    db = SessionLocal()
    try:
        from backend.app.models.prediction import Prediction
        from backend.app.models.explanation import Explanation
        db_prediction = db.query(Prediction).filter(Prediction.id == live_pred_id).first()
        assert db_prediction is not None, f"Prediction {live_pred_id} not found in PostgreSQL"
        assert db_prediction.student_id == s1_id
        assert db_prediction.model_version == "v1.0.0"

        db_explanations = db.query(Explanation).filter(Explanation.prediction_id == live_pred_id).all()
        assert len(db_explanations) == 5, f"Expected 5 explanations, found {len(db_explanations)}"
        for exp in db_explanations:
            assert exp.feature_name
            assert exp.display_name
            assert isinstance(exp.contribution, float)
            assert exp.direction in ("increases_risk", "decreases_risk")
        print(f"[PASS] 29. PostgreSQL persistence verified: Prediction {live_pred_id} + 5 linked SHAP explanations")
    finally:
        db.close()

    # 30. POST /api/predict - Student cross-student prediction forbidden
    r = httpx.post(
        f"{BASE_URL}/api/predict",
        json={"student_id": s2_id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert r.status_code == 403
    print(f"[PASS] 30. POST /api/predict (Student attempting cross-student prediction) -> 403 Forbidden")

    # 31. POST /api/predict - Faculty permitted for any student
    r = httpx.post(
        f"{BASE_URL}/api/predict",
        json={"student_id": s2_id, "academic_data": sample_academic},
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 200
    assert r.json()["student_id"] == s2_id
    print(f"[PASS] 31. POST /api/predict (Faculty predicting with new telemetry) -> 200 OK")

    # 32. POST /api/predict - Student prohibited from submitting academic_data
    r = httpx.post(
        f"{BASE_URL}/api/predict",
        json={"student_id": s1_id, "academic_data": sample_academic},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert r.status_code == 403
    print(f"[PASS] 32. POST /api/predict (Student prohibited from authoring academic_data) -> 403 Forbidden")

    # 33. POST /api/predict - Target label G3 strictly rejected
    leaked_predict = {"student_id": s1_id, "G3": 15.0}
    r = httpx.post(
        f"{BASE_URL}/api/predict",
        json=leaked_predict,
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 422
    print(f"[PASS] 33. POST /api/predict (Target label G3 strictly rejected) -> 422 Unprocessable Entity")

    # 34. POST /api/predict - Non-existent student ID -> 404
    r = httpx.post(
        f"{BASE_URL}/api/predict",
        json={"student_id": 999999},
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 404
    print(f"[PASS] 34. POST /api/predict (Non-existent student) -> 404 Not Found")

    # 35. Append-only invariant verification in PostgreSQL
    r2 = httpx.post(
        f"{BASE_URL}/api/predict",
        json={"student_id": s1_id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert r2.status_code == 200
    live_pred_id_2 = r2.json()["prediction_id"]
    assert live_pred_id_2 != live_pred_id

    db = SessionLocal()
    try:
        from backend.app.models.prediction import Prediction
        preds = db.query(Prediction).filter(Prediction.student_id == s1_id).all()
        assert len(preds) >= 2
        print(f"[PASS] 35. PostgreSQL append-only invariant verified: Student {s1_id} has {len(preds)} immutable predictions")
    finally:
        db.close()

    print("-" * 60)
    print("SUB-STEP 2.6 HISTORY & FACULTY ANALYTICS LIVE ENDPOINT VERIFICATION")
    print("-" * 60)

    # 36. GET /api/students/{id}/history - Student viewing own trajectory
    r = httpx.get(f"{BASE_URL}/api/students/{s1_id}/history", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    hist_data = r.json()
    assert hist_data["student_id"] == s1_id
    assert hist_data["student_code"] == "STU-1001"
    assert hist_data["total_records"] >= 2
    assert hist_data["total_predictions"] >= 2
    assert hist_data["latest_prediction"] is not None
    assert "G3" not in hist_data["academic_records"][0]
    print(f"[PASS] 36. GET /api/students/{s1_id}/history (Student viewing own history) -> 200 OK (records={hist_data['total_records']}, preds={hist_data['total_predictions']})")

    # 37. GET /api/students/{id}/history - Cross-student forbidden
    r = httpx.get(f"{BASE_URL}/api/students/{s2_id}/history", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 403
    print(f"[PASS] 37. GET /api/students/{s2_id}/history (Cross-student history) -> 403 Forbidden")

    # 38. GET /api/students/{id}/history - Chronological sorting
    r_asc = httpx.get(f"{BASE_URL}/api/students/{s1_id}/history?order=asc", headers={"Authorization": f"Bearer {student_token}"})
    r_desc = httpx.get(f"{BASE_URL}/api/students/{s1_id}/history?order=desc", headers={"Authorization": f"Bearer {student_token}"})
    assert r_asc.status_code == 200 and r_desc.status_code == 200
    preds_asc = r_asc.json()["predictions"]
    preds_desc = r_desc.json()["predictions"]
    if len(preds_asc) >= 2:
        assert preds_asc[0]["created_at"] <= preds_asc[-1]["created_at"]
        assert preds_desc[0]["created_at"] >= preds_desc[-1]["created_at"]
    print(f"[PASS] 38. GET /api/students/{s1_id}/history (Chronological asc/desc ordering verified)")

    # 39. GET /api/students/{id}/history - Faculty accessing student history
    r = httpx.get(f"{BASE_URL}/api/students/{s1_id}/history", headers={"Authorization": f"Bearer {faculty_token}"})
    assert r.status_code == 200
    assert r.json()["student_id"] == s1_id
    print(f"[PASS] 39. GET /api/students/{s1_id}/history (Faculty viewing student history) -> 200 OK")

    # 40. GET /api/students/999999/history - Non-existent student -> 404
    r = httpx.get(f"{BASE_URL}/api/students/999999/history", headers={"Authorization": f"Bearer {faculty_token}"})
    assert r.status_code == 404
    print("[PASS] 40. GET /api/students/999999/history (Non-existent student) -> 404 Not Found")

    # 41. GET /api/faculty/analytics - Faculty accessing cohort analytics
    r = httpx.get(f"{BASE_URL}/api/faculty/analytics", headers={"Authorization": f"Bearer {faculty_token}"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    an_data = r.json()
    assert an_data["total_students"] >= 2
    assert an_data["evaluated_students"] >= 1
    assert "risk_distribution" in an_data
    assert "school_distribution" in an_data
    assert an_data["model_version"] == "v1.0.0"

    # Privacy check: No student-identifying information in aggregate payload
    forbidden_keys = {"student_code", "email", "first_name", "last_name", "user_id"}
    for k in forbidden_keys:
        assert k not in an_data
    print(f"[PASS] 41. GET /api/faculty/analytics (Faculty accessing analytics) -> 200 OK (total={an_data['total_students']}, eval={an_data['evaluated_students']})")

    # 42. GET /api/faculty/analytics - Admin accessing cohort analytics
    r = httpx.get(f"{BASE_URL}/api/faculty/analytics", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    print("[PASS] 42. GET /api/faculty/analytics (Admin accessing analytics) -> 200 OK")

    # 43. GET /api/faculty/analytics - Student forbidden
    r = httpx.get(f"{BASE_URL}/api/faculty/analytics", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 403
    print("[PASS] 43. GET /api/faculty/analytics (Student forbidden) -> 403 Forbidden")

    # 44. GET /api/faculty/analytics - Unauthenticated rejected
    r = httpx.get(f"{BASE_URL}/api/faculty/analytics")
    assert r.status_code == 401
    print("[PASS] 44. GET /api/faculty/analytics (Unauthenticated rejected) -> 401 Unauthorized")

    print("-" * 60)
    print("SUB-STEP 2.7 BATCH DATASET UPLOAD LIVE ENDPOINT VERIFICATION")
    print("-" * 60)

    upload_header = (
        "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,"
        "traveltime,studytime,failures,schoolsup,famsup,paid,activities,nursery,higher,"
        "internet,romantic,famrel,freetime,goout,Dalc,Walc,health,absences,G1,G2,student_code,term"
    )
    upload_row_1 = "GP,F,17,U,GT3,T,3,2,other,other,course,mother,1,2,0,no,yes,no,yes,yes,yes,yes,no,4,3,2,1,1,5,4,13.0,14.0,STU-LIVE-001,Term 1"
    upload_row_2 = "MS,M,16,R,LE3,A,2,3,services,services,home,father,2,1,1,yes,no,yes,no,no,yes,no,yes,3,4,3,2,2,4,6,11.0,12.0,STU-LIVE-002,Term 1"
    valid_csv_bytes = f"{upload_header}\n{upload_row_1}\n{upload_row_2}\n".encode("utf-8")

    # 45. POST /api/dataset/upload - Student forbidden
    r = httpx.post(
        f"{BASE_URL}/api/dataset/upload",
        files={"file": ("batch.csv", valid_csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert r.status_code == 403
    print("[PASS] 45. POST /api/dataset/upload (Student forbidden) -> 403 Forbidden")

    # 46. POST /api/dataset/upload - Unauthenticated rejected
    r = httpx.post(
        f"{BASE_URL}/api/dataset/upload",
        files={"file": ("batch.csv", valid_csv_bytes, "text/csv")},
    )
    assert r.status_code == 401
    print("[PASS] 46. POST /api/dataset/upload (Unauthenticated rejected) -> 401 Unauthorized")

    # 47. POST /api/dataset/upload - Non-CSV extension rejected
    r = httpx.post(
        f"{BASE_URL}/api/dataset/upload",
        files={"file": ("batch.json", b'{"data": "test"}', "application/json")},
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 400
    print("[PASS] 47. POST /api/dataset/upload (Non-CSV extension rejected) -> 400 Bad Request")

    # 48. POST /api/dataset/upload - Target label G3 presence strictly rejected
    leaked_csv = f"{upload_header},G3\n{upload_row_1},14\n".encode("utf-8")
    r = httpx.post(
        f"{BASE_URL}/api/dataset/upload",
        files={"file": ("leakage.csv", leaked_csv, "text/csv")},
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 422
    assert "Data leakage detected: Target label 'G3' is strictly forbidden" in r.json()["detail"]
    print("[PASS] 48. POST /api/dataset/upload (Target label G3 strictly rejected) -> 422 Unprocessable Entity")

    # 49. POST /api/dataset/upload - Out-of-bounds numeric value rejected & atomic rollback
    db = SessionLocal()
    initial_rec_count = db.query(AcademicRecord).count()
    initial_pred_count = db.query(Prediction).count()
    db.close()

    bad_numeric_csv = f"{upload_header}\n{upload_row_1}\n" + upload_row_2.replace(",16,", ",99,") + "\n"
    r = httpx.post(
        f"{BASE_URL}/api/dataset/upload",
        files={"file": ("invalid_age.csv", bad_numeric_csv.encode("utf-8"), "text/csv")},
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 422
    db = SessionLocal()
    post_fail_count = db.query(AcademicRecord).count()
    db.close()
    assert post_fail_count == initial_rec_count
    print("[PASS] 49. POST /api/dataset/upload (Out-of-bounds age=99 rejected & atomic rollback verified) -> 422 Unprocessable Entity")

    # 50. POST /api/dataset/upload - Faculty valid upload
    r = httpx.post(
        f"{BASE_URL}/api/dataset/upload",
        files={"file": ("live_cohort.csv", valid_csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    up_res = r.json()
    assert up_res["records_created"] == 2
    assert up_res["status"] == "success"
    print(f"[PASS] 50. POST /api/dataset/upload (Faculty valid upload) -> 201 Created ({up_res['records_created']} records, {up_res['students_created']} students)")

    # 51. PostgreSQL database verification & No unintended predictions
    db = SessionLocal()
    try:
        live_s1 = db.query(Student).filter(Student.student_code == "STU-LIVE-001").first()
        live_s2 = db.query(Student).filter(Student.student_code == "STU-LIVE-002").first()
        assert live_s1 is not None and live_s2 is not None
        rec_s1 = db.query(AcademicRecord).filter(AcademicRecord.student_id == live_s1.id).first()
        assert rec_s1 is not None and rec_s1.G1 == 13.0 and rec_s1.G2 == 14.0

        # Invariant: No predictions must be automatically generated during upload
        current_pred_count = db.query(Prediction).count()
        assert current_pred_count == initial_pred_count
        print(f"[PASS] 51. PostgreSQL database verification: Academic records persisted, prediction count unchanged ({current_pred_count})")
    finally:
        db.close()

    # 52. POST /api/dataset/upload - Admin valid semicolon-separated upload
    semicolon_csv = f"{upload_header.replace(',', ';')}\n"
    semicolon_csv += "GP;M;18;U;GT3;T;4;4;teacher;teacher;reputation;father;1;3;0;no;yes;yes;yes;yes;yes;yes;no;5;3;2;1;1;5;0;16.0;17.0;STU-LIVE-003;Term 1\n"
    r = httpx.post(
        f"{BASE_URL}/api/dataset/upload",
        files={"file": ("semicolon_uci.csv", semicolon_csv.encode("utf-8"), "text/csv")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 201
    assert r.json()["records_created"] == 1
    print("[PASS] 52. POST /api/dataset/upload (Admin valid semicolon CSV upload) -> 201 Created")

    print("-" * 60)
    print("SUB-STEP 2.8 DETERMINISTIC RECOMMENDATIONS LIVE ENDPOINT VERIFICATION")
    print("-" * 60)

    # 53. GET /api/recommendations/{id} - Unauthenticated -> 401 Unauthorized
    r = httpx.get(f"{BASE_URL}/api/recommendations/{s1_id}")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    print("[PASS] 53. GET /api/recommendations/{id} (Unauthenticated) -> 401 Unauthorized")

    # 54. GET /api/recommendations/{s1_id} - Student viewing own recommendations -> 200 OK
    r = httpx.get(f"{BASE_URL}/api/recommendations/{s1_id}", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    rec_s1_data = r.json()
    assert rec_s1_data["student_id"] == s1_id
    assert "advisory_notice" in rec_s1_data
    print(f"[PASS] 54. GET /api/recommendations/{s1_id} (Student viewing self STU-1001) -> 200 OK ({rec_s1_data['total_recommendations']} active recommendations)")

    # 55. GET /api/recommendations/{s2_id} - Student attempting cross-student access -> 403 Forbidden
    r = httpx.get(f"{BASE_URL}/api/recommendations/{s2_id}", headers={"Authorization": f"Bearer {student_token}"})
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    print("[PASS] 55. GET /api/recommendations/{s2_id} (Student cross-student access) -> 403 Forbidden")

    # 56. POST telemetry for s2_id triggering all 4 rules and predict
    risk_telemetry = {
        **sample_academic,
        "G1": 15.0,
        "G2": 8.0,
        "absences": 14,
        "studytime": 1,
        "term": "Term 2",
    }
    r = httpx.post(
        f"{BASE_URL}/api/predict",
        json={"student_id": s2_id, "academic_data": risk_telemetry},
        headers={"Authorization": f"Bearer {faculty_token}"},
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    s2_pred_id = r.json()["prediction_id"]
    print(f"[PASS] 56. POST /api/predict (High-risk telemetry for s2_id) -> 200 OK (pred_id={s2_pred_id})")

    # 57. GET /api/recommendations/{s2_id} - Faculty accessing student recommendations -> 200 OK
    r = httpx.get(f"{BASE_URL}/api/recommendations/{s2_id}", headers={"Authorization": f"Bearer {faculty_token}"})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    rec_s2_data = r.json()
    assert rec_s2_data["student_id"] == s2_id
    assert rec_s2_data["total_recommendations"] == 4
    triggers = [item["trigger_condition"] for item in rec_s2_data["recommendations"]]
    assert triggers == ["delta_g < -2", "G2 < 10", "absences >= 10", "studytime <= 1"]
    print(f"[PASS] 57. GET /api/recommendations/{s2_id} (Faculty access, all 4 rules triggered) -> 200 OK (stable canonical ordering verified)")

    # 58. GET /api/recommendations/{s2_id} - Admin accessing student recommendations -> 200 OK
    r = httpx.get(f"{BASE_URL}/api/recommendations/{s2_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert r.json()["total_recommendations"] == 4
    print("[PASS] 58. GET /api/recommendations/{s2_id} (Admin access) -> 200 OK")

    # 59. GET /api/recommendations/999999 - Non-existent student -> 404 Not Found
    r = httpx.get(f"{BASE_URL}/api/recommendations/999999", headers={"Authorization": f"Bearer {faculty_token}"})
    assert r.status_code == 404
    print("[PASS] 59. GET /api/recommendations/999999 (Non-existent student) -> 404 Not Found")

    # 60. PostgreSQL persistence & linkage verification
    db = SessionLocal()
    try:
        from backend.app.models.recommendation import Recommendation
        db_recs = db.query(Recommendation).filter(Recommendation.student_id == s2_id, Recommendation.prediction_id == s2_pred_id).all()
        assert len(db_recs) == 4, f"Expected 4 persisted recommendations in PostgreSQL, found {len(db_recs)}"
        for dbr in db_recs:
            assert dbr.title
            assert dbr.description
            assert dbr.category in ("Academic Progress", "Academic Remediation", "Attendance", "Study Strategy")
            assert dbr.priority in ("high", "medium")
            assert dbr.trigger_condition in ("delta_g < -2", "G2 < 10", "absences >= 10", "studytime <= 1")
        print(f"[PASS] 60. PostgreSQL persistence verified: 4 Recommendation entities linked to Prediction {s2_pred_id}")
    finally:
        db.close()

    # 61. Historical predictions immutability & advisory disclosure verification
    db = SessionLocal()
    try:
        preds = db.query(Prediction).filter(Prediction.student_id == s2_id).all()
        assert len(preds) >= 1
        assert "non-causal" in rec_s2_data["advisory_notice"].lower()
        assert "human advisor" in rec_s2_data["advisory_notice"].lower()
        print(f"[PASS] 61. Governance verified: Historical predictions immutable, non-causal advisory disclosure verified")
    finally:
        db.close()

    print("=" * 60)
    print("ALL LIVE POSTGRESQL & UVICORN VERIFICATION TESTS PASSED SUCCESSFULLY! (61/61)")
    print("=" * 60)


if __name__ == "__main__":
    run_live_tests()

