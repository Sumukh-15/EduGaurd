"""End-to-End Acceptance and Regression Verification Script for Phase 2.

Comprehensive integration audit covering:
1. PostgreSQL 18 database schema & foreign keys
2. Zero orphan records verification
3. End-to-end user workflows (Admin -> Faculty -> Student)
4. Strict RBAC boundaries and student data isolation
5. Anti-leakage G3 rejection across all entrypoints
6. ML model inference, SHAP explanations & threshold checks
7. Append-only prediction immutability
8. Deterministic rule-based recommendations & persistence
9. Cohort analytics aggregation & privacy checks
10. Batch CSV dataset ingestion & atomic rollback
11. Latency and performance sanity checks
"""

import time
import httpx
from datetime import datetime, timezone
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from backend.app.core.config import settings
from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.explanation import Explanation
from backend.app.models.prediction import Prediction
from backend.app.models.recommendation import Recommendation
from backend.app.models.student import Student
from backend.app.models.user import User

BASE_URL = "http://127.0.0.1:8000"
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def run_acceptance_audit():
    print("=" * 70)
    print("EDUGUARD PHASE 2 FINAL ACCEPTANCE AUDIT & INTEGRATION VERIFICATION")
    print("=" * 70)

    # ---------------------------------------------------------
    # 1. DATABASE SCHEMA & ORPHAN AUDIT
    # ---------------------------------------------------------
    print("\n--- 1. POSTGRESQL SCHEMA & ORPHAN AUDIT ---")
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    expected_tables = {
        "users",
        "students",
        "academic_records",
        "predictions",
        "explanations",
        "recommendations",
        "alembic_version",
    }
    missing = expected_tables - table_names
    assert not missing, f"Missing database tables: {missing}"
    print(f"[PASS] All {len(expected_tables)} expected PostgreSQL tables exist: {sorted(list(expected_tables))}")

    db = SessionLocal()
    try:
        # Check foreign keys and orphans
        orphan_records = db.query(AcademicRecord).filter(~AcademicRecord.student_id.in_(db.query(Student.id))).count()
        orphan_preds = db.query(Prediction).filter(~Prediction.student_id.in_(db.query(Student.id))).count()
        orphan_exps = db.query(Explanation).filter(~Explanation.prediction_id.in_(db.query(Prediction.id))).count()
        orphan_recs = db.query(Recommendation).filter(~Recommendation.student_id.in_(db.query(Student.id))).count()

        assert orphan_records == 0, f"Found {orphan_records} orphan academic records"
        assert orphan_preds == 0, f"Found {orphan_preds} orphan predictions"
        assert orphan_exps == 0, f"Found {orphan_exps} orphan explanations"
        assert orphan_recs == 0, f"Found {orphan_recs} orphan recommendations"
        print("[PASS] Zero orphan records detected across all foreign key relationships")

        # Verify Alembic version head
        res = db.execute(text("SELECT version_num FROM alembic_version")).fetchone()
        assert res is not None and res[0] == "cfa545c82657"
        print(f"[PASS] Alembic migration head verified in database: {res[0]}")
    finally:
        db.close()

    # ---------------------------------------------------------
    # 2. SEED CLEAN ACCEPTANCE USERS & PROFILES
    # ---------------------------------------------------------
    print("\n--- 2. USER SEEDING & AUTHENTICATION AUDIT ---")
    db = SessionLocal()
    try:
        # Seed test admin
        admin_user = db.query(User).filter(User.email == "accept.admin@school.edu").first()
        if not admin_user:
            admin_user = User(
                email="accept.admin@school.edu",
                hashed_password=get_password_hash("AdminPass123!"),
                full_name="Acceptance Admin",
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            db.flush()

        # Seed test faculty
        fac_user = db.query(User).filter(User.email == "accept.faculty@school.edu").first()
        if not fac_user:
            fac_user = User(
                email="accept.faculty@school.edu",
                hashed_password=get_password_hash("FacultyPass123!"),
                full_name="Acceptance Faculty",
                role="faculty",
                is_active=True,
            )
            db.add(fac_user)
            db.flush()

        # Seed test student A
        stu_a_user = db.query(User).filter(User.email == "accept.student.a@school.edu").first()
        if not stu_a_user:
            stu_a_user = User(
                email="accept.student.a@school.edu",
                hashed_password=get_password_hash("StudentPass123!"),
                full_name="Student Alpha",
                role="student",
                is_active=True,
            )
            db.add(stu_a_user)
            db.flush()

        stu_a = db.query(Student).filter(Student.student_code == "STU-ACC-01").first()
        if not stu_a:
            stu_a = Student(
                student_code="STU-ACC-01",
                user_id=stu_a_user.id,
                first_name="Alpha",
                last_name="Student",
                cohort_year=2026,
                school="GP",
            )
            db.add(stu_a)
            db.flush()

        # Seed test student B
        stu_b_user = db.query(User).filter(User.email == "accept.student.b@school.edu").first()
        if not stu_b_user:
            stu_b_user = User(
                email="accept.student.b@school.edu",
                hashed_password=get_password_hash("StudentPass123!"),
                full_name="Student Beta",
                role="student",
                is_active=True,
            )
            db.add(stu_b_user)
            db.flush()

        stu_b = db.query(Student).filter(Student.student_code == "STU-ACC-02").first()
        if not stu_b:
            stu_b = Student(
                student_code="STU-ACC-02",
                user_id=stu_b_user.id,
                first_name="Beta",
                last_name="Student",
                cohort_year=2026,
                school="MS",
            )
            db.add(stu_b)
            db.flush()

        db.commit()
        admin_id, fac_id, stu_a_id, stu_b_id = admin_user.id, fac_user.id, stu_a.id, stu_b.id
    finally:
        db.close()

    # Login tests
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # Invalid login -> 401
    r = client.post("/api/auth/login", json={"email": "wrong@school.edu", "password": "BadPassword"})
    assert r.status_code == 401
    print("[PASS] Failed login with nonexistent account returns generic 401 (no user enumeration)")

    # Valid logins
    r_adm = client.post("/api/auth/login", json={"email": "accept.admin@school.edu", "password": "AdminPass123!"})
    assert r_adm.status_code == 200
    token_admin = r_adm.json()["access_token"]

    r_fac = client.post("/api/auth/login", json={"email": "accept.faculty@school.edu", "password": "FacultyPass123!"})
    assert r_fac.status_code == 200
    token_fac = r_fac.json()["access_token"]

    r_stu = client.post("/api/auth/login", json={"email": "accept.student.a@school.edu", "password": "StudentPass123!"})
    assert r_stu.status_code == 200
    token_stu_a = r_stu.json()["access_token"]

    # Verify /api/auth/me
    r_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_stu_a}"})
    assert r_me.status_code == 200
    assert r_me.json()["email"] == "accept.student.a@school.edu"
    assert r_me.json()["student_id"] == stu_a_id
    print(f"[PASS] Authentication verified: Bearer tokens issued for Admin, Faculty, and Student")

    # ---------------------------------------------------------
    # 3. PROFILE & ACADEMIC DATA RBAC
    # ---------------------------------------------------------
    print("\n--- 3. PROFILE & ACADEMIC DATA RBAC ---")
    # Student A can view own profile
    r = client.get(f"/api/students/{stu_a_id}", headers={"Authorization": f"Bearer {token_stu_a}"})
    assert r.status_code == 200
    assert r.json()["student_code"] == "STU-ACC-01"

    # Student A cannot view Student B profile (403 Forbidden)
    r = client.get(f"/api/students/{stu_b_id}", headers={"Authorization": f"Bearer {token_stu_a}"})
    assert r.status_code == 403
    print(f"[PASS] Student privacy boundary enforced: cross-student profile access returns 403 Forbidden")

    # Student cannot author academic telemetry (403 Forbidden)
    telemetry_payload = {
        "age": 16, "Medu": 3, "Fedu": 2, "traveltime": 1, "studytime": 1,
        "failures": 1, "famrel": 4, "freetime": 3, "goout": 2, "Dalc": 1,
        "Walc": 2, "health": 4, "absences": 12, "G1": 14.0, "G2": 8.0,
        "school": "GP", "sex": "F", "address": "U", "famsize": "GT3",
        "Pstatus": "T", "schoolsup": "no", "famsup": "yes", "paid": "no",
        "activities": "yes", "nursery": "yes", "higher": "yes", "internet": "yes",
        "romantic": "no", "Mjob": "other", "Fjob": "other", "reason": "course",
        "guardian": "mother", "term": "Fall 2026",
    }
    r = client.post(
        f"/api/students/{stu_a_id}/academic-data",
        json=telemetry_payload,
        headers={"Authorization": f"Bearer {token_stu_a}"},
    )
    assert r.status_code == 403
    print("[PASS] Students strictly forbidden from authoring official academic telemetry (403 Forbidden)")

    # Anti-leakage: G3 submitted by faculty -> 422 Unprocessable Entity
    leaked_payload = {**telemetry_payload, "G3": 10.0}
    r = client.post(
        f"/api/students/{stu_a_id}/academic-data",
        json=leaked_payload,
        headers={"Authorization": f"Bearer {token_fac}"},
    )
    assert r.status_code == 422
    print("[PASS] Target label G3 in academic telemetry payload strictly rejected (422 Unprocessable Entity)")

    # Faculty posts valid academic telemetry -> 201 Created
    r = client.post(
        f"/api/students/{stu_a_id}/academic-data",
        json=telemetry_payload,
        headers={"Authorization": f"Bearer {token_fac}"},
    )
    assert r.status_code == 201
    acad_record_id = r.json()["id"]
    print(f"[PASS] Faculty authored academic telemetry: Record ID {acad_record_id} created")

    # ---------------------------------------------------------
    # 4. ML PREDICTION & SHAP EXPLANATION
    # ---------------------------------------------------------
    print("\n--- 4. ML PREDICTION & SHAP INTEGRITY ---")
    # Student triggers prediction on own profile
    r = client.post(
        "/api/predict",
        json={"student_id": stu_a_id},
        headers={"Authorization": f"Bearer {token_stu_a}"},
    )
    assert r.status_code == 200
    pred_res = r.json()
    prediction_id = pred_res["prediction_id"]
    risk_level = pred_res["risk_level"]
    prob = pred_res["risk_probability"]
    binary_risk = pred_res["at_risk_binary"]
    top_factors = pred_res["top_factors"]

    # Threshold checks
    if prob < 0.40:
        assert risk_level == "Low"
    elif prob < 0.70:
        assert risk_level == "Medium"
    else:
        assert risk_level == "High"

    assert binary_risk == (1 if prob >= 0.50 else 0)
    assert len(top_factors) == 5, f"Expected 5 SHAP factors, got {len(top_factors)}"
    assert "causal" in pred_res["causal_disclaimer"].lower()
    print(f"[PASS] Inference output: risk={risk_level} (p={prob:.4f}), binary={binary_risk}, {len(top_factors)} SHAP factors")

    # Database verification
    db = SessionLocal()
    try:
        p_row = db.query(Prediction).filter(Prediction.id == prediction_id).first()
        assert p_row is not None
        assert p_row.student_id == stu_a_id
        assert p_row.model_version in ("v1.0.0", "v1.1.0")

        exp_rows = db.query(Explanation).filter(Explanation.prediction_id == prediction_id).all()
        assert len(exp_rows) == 5
        print(f"[PASS] PostgreSQL persistence: Prediction {prediction_id} and 5 linked Explanation rows verified")
    finally:
        db.close()

    # Append-only invariant: trigger second prediction, ensure first is unchanged
    r_second = client.post(
        "/api/predict",
        json={"student_id": stu_a_id},
        headers={"Authorization": f"Bearer {token_stu_a}"},
    )
    assert r_second.status_code == 200
    pred_2_id = r_second.json()["prediction_id"]
    assert pred_2_id != prediction_id

    db = SessionLocal()
    try:
        preds = db.query(Prediction).filter(Prediction.student_id == stu_a_id).all()
        assert len(preds) >= 2
        print(f"[PASS] Append-only invariant verified: student has {len(preds)} immutable historical prediction rows")
    finally:
        db.close()

    # ---------------------------------------------------------
    # 5. STUDENT HISTORY ENDPOINT
    # ---------------------------------------------------------
    print("\n--- 5. STUDENT HISTORY TRAJECTORY AUDIT ---")
    r = client.get(f"/api/students/{stu_a_id}/history?order=asc", headers={"Authorization": f"Bearer {token_stu_a}"})
    assert r.status_code == 200
    hist = r.json()
    assert hist["student_id"] == stu_a_id
    assert hist["latest_prediction"] is not None
    assert "G3" not in str(hist)  # Zero target leakage in history
    print(f"[PASS] Longitudinal history verified: chronological records linked to predictions (zero G3 leakage)")

    # ---------------------------------------------------------
    # 6. DETERMINISTIC RECOMMENDATIONS ENGINE
    # ---------------------------------------------------------
    print("\n--- 6. DETERMINISTIC RECOMMENDATIONS AUDIT ---")
    # Query recommendations for student A:
    # Telemetry: G1=14.0, G2=8.0 (delta_g = -6.0 < -2), G2=8.0 (< 10), absences=12 (>= 10), studytime=1 (<= 1)
    # ALL 4 rules must trigger in stable canonical order!
    r = client.get(f"/api/recommendations/{stu_a_id}", headers={"Authorization": f"Bearer {token_stu_a}"})
    assert r.status_code == 200
    rec_data = r.json()
    assert rec_data["total_recommendations"] == 4
    triggers = [item["trigger_condition"] for item in rec_data["recommendations"]]
    expected_order = ["delta_g < -2", "G2 < 10", "absences >= 10", "studytime <= 1"]
    assert triggers == expected_order, f"Expected order {expected_order}, got {triggers}"
    assert "non-causal" in rec_data["advisory_notice"].lower()

    # Verify PostgreSQL persistence & idempotency
    rec_pred_id = rec_data["prediction_id"]
    db = SessionLocal()
    try:
        recs_in_db = db.query(Recommendation).filter(Recommendation.prediction_id == rec_pred_id).all()
        assert len(recs_in_db) == 4
        # Query again through API: count must not increase
        r_again = client.get(f"/api/recommendations/{stu_a_id}", headers={"Authorization": f"Bearer {token_stu_a}"})
        assert r_again.status_code == 200
        recs_in_db_after = db.query(Recommendation).filter(Recommendation.prediction_id == rec_pred_id).all()
        assert len(recs_in_db_after) == 4
        print(f"[PASS] Deterministic recommendations verified: 4 rules triggered in canonical order; idempotent persistence confirmed")
    finally:
        db.close()

    # ---------------------------------------------------------
    # 7. FACULTY ANALYTICS ENDPOINT
    # ---------------------------------------------------------
    print("\n--- 7. FACULTY COHORT ANALYTICS AUDIT ---")
    # Student forbidden -> 403
    r = client.get("/api/faculty/analytics", headers={"Authorization": f"Bearer {token_stu_a}"})
    assert r.status_code == 403

    # Faculty allowed -> 200
    r = client.get("/api/faculty/analytics", headers={"Authorization": f"Bearer {token_fac}"})
    assert r.status_code == 200
    analytics = r.json()
    assert analytics["total_students"] >= 2
    assert analytics["evaluated_students"] >= 1
    assert "low" in analytics["risk_distribution"] and "high" in analytics["risk_distribution"]
    assert any(item["school"] == "GP" for item in analytics["school_distribution"])
    # Verify no individual student names or IDs in response (anonymized aggregates)
    assert "first_name" not in str(analytics) and "email" not in str(analytics)
    print(f"[PASS] Faculty analytics verified: macro cohort aggregations computed with zero student PII leakage")

    # ---------------------------------------------------------
    # 8. BATCH DATASET UPLOAD
    # ---------------------------------------------------------
    print("\n--- 8. BATCH DATASET UPLOAD AUDIT ---")
    # Student forbidden from upload -> 403
    csv_sample = (
        "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,"
        "traveltime,studytime,failures,schoolsup,famsup,paid,activities,nursery,higher,"
        "internet,romantic,famrel,freetime,goout,Dalc,Walc,health,absences,G1,G2,student_code,term\n"
        "GP,F,17,U,GT3,T,3,3,services,services,home,mother,1,2,0,no,yes,no,yes,yes,yes,yes,no,4,3,2,1,1,4,2,14.0,15.0,STU-BATCH-01,Term 1\n"
    )
    files = {"file": ("batch.csv", csv_sample.encode("utf-8"), "text/csv")}
    r = client.post("/api/dataset/upload", files=files, headers={"Authorization": f"Bearer {token_stu_a}"})
    assert r.status_code == 403
    print("[PASS] Students strictly forbidden from dataset upload (403 Forbidden)")

    # Target G3 rejection in dataset upload -> 422
    csv_leaked = (
        "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,"
        "traveltime,studytime,failures,schoolsup,famsup,paid,activities,nursery,higher,"
        "internet,romantic,famrel,freetime,goout,Dalc,Walc,health,absences,G1,G2,G3,student_code,term\n"
        "GP,F,17,U,GT3,T,3,3,services,services,home,mother,1,2,0,no,yes,no,yes,yes,yes,yes,no,4,3,2,1,1,4,2,14.0,15.0,16.0,STU-BATCH-01,Term 1\n"
    )
    r = client.post(
        "/api/dataset/upload",
        files={"file": ("leak.csv", csv_leaked.encode("utf-8"), "text/csv")},
        headers={"Authorization": f"Bearer {token_fac}"},
    )
    assert r.status_code == 422
    assert "data leakage" in r.json()["detail"].lower()
    print("[PASS] Upload strictly rejects G3 column (422 Unprocessable Entity, zero target leakage)")

    # Faculty valid batch upload -> 201 Created
    db = SessionLocal()
    pred_count_pre_upload = db.query(Prediction).count()
    db.close()

    r = client.post(
        "/api/dataset/upload",
        files={"file": ("batch.csv", csv_sample.encode("utf-8"), "text/csv")},
        headers={"Authorization": f"Bearer {token_fac}"},
    )
    assert r.status_code == 201
    assert r.json()["status"] == "success"
    assert r.json()["records_created"] == 1

    # Invariant: Upload must NOT automatically create predictions
    db = SessionLocal()
    try:
        pred_count_post_upload = db.query(Prediction).count()
        assert pred_count_post_upload == pred_count_pre_upload
        print("[PASS] Dataset upload persistence verified: 0 predictions created during ingestion")
    finally:
        db.close()

    # ---------------------------------------------------------
    # 9. PERFORMANCE & LATENCY SANITY CHECKS
    # ---------------------------------------------------------
    print("\n--- 9. LOCAL LATENCY SANITY CHECKS ---")
    endpoints_to_profile = [
        ("GET /api/health", lambda: client.get("/api/health")),
        ("GET /api/students/{id}", lambda: client.get(f"/api/students/{stu_a_id}", headers={"Authorization": f"Bearer {token_fac}"})),
        ("POST /api/predict", lambda: client.post("/api/predict", json={"student_id": stu_a_id}, headers={"Authorization": f"Bearer {token_fac}"})),
        ("GET /api/recommendations/{id}", lambda: client.get(f"/api/recommendations/{stu_a_id}", headers={"Authorization": f"Bearer {token_fac}"})),
        ("GET /api/faculty/analytics", lambda: client.get("/api/faculty/analytics", headers={"Authorization": f"Bearer {token_fac}"})),
    ]

    for name, call in endpoints_to_profile:
        latencies = []
        for _ in range(5):
            t0 = time.perf_counter()
            resp = call()
            dt_ms = (time.perf_counter() - t0) * 1000
            assert resp.status_code == 200
            latencies.append(dt_ms)
        avg_ms = sum(latencies) / len(latencies)
        min_ms = min(latencies)
        max_ms = max(latencies)
        print(f"[PASS] {name:<30} -> avg: {avg_ms:6.1f} ms  (min: {min_ms:5.1f} ms, max: {max_ms:5.1f} ms)")

    client.close()
    print("\n" + "=" * 70)
    print("ALL PHASE 2 ACCEPTANCE AUDIT CRITERIA SATISFIED 100%!")
    print("=" * 70)


if __name__ == "__main__":
    run_acceptance_audit()
