"""Comprehensive PRD Section 28 Demo Script & RBAC/Anti-Leakage Verification Suite.

Executes:
1. Steps 1–11 of the End-to-End Demo Journey against freshly seeded PostgreSQL database
2. Strict Target Leakage (G3) Rejection Verification across all 4 entrypoints:
   - POST /api/students/{id}/academic-data (telemetry POST)
   - POST /api/predict (single prediction)
   - POST /api/predict/batch (batch prediction)
   - POST /api/dataset/upload (CSV dataset upload)
3. Strict RBAC & Boundary Isolation (403 Forbidden) Re-Verification:
   - Cross-Student profile, academic-data, history, predict, recommendations
   - Cross-Faculty (unassigned faculty accessing student assigned to other faculty)
   - Student attempting faculty endpoints (analytics, directory, CSV upload, telemetry authoring)
   - Revoked token (jti denylist) 401 rejection post-logout
"""

import sys
import json
import io
import time
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.models.user import User
from backend.app.models.student import Student
from backend.app.models.academic_record import AcademicRecord
from backend.app.models.prediction import Prediction
from backend.app.models.recommendation import Recommendation
from backend.app.services.ml_service import ml_service

if not ml_service.is_ready:
    ml_service.load_artifacts()

client = TestClient(app)

results = []

def record(step_id: str, title: str, passed: bool, evidence: str):
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {step_id}: {title}")
    print(f"       Evidence: {evidence}")
    results.append({"step": step_id, "title": title, "status": status, "evidence": evidence})
    if not passed:
        print(f"ERROR: {step_id} failed!")
        sys.exit(1)


def run_demo_and_verifications():
    print("=" * 80)
    print("EDUGUARD PRD SECTION 28 DEMO SCRIPT & VERIFICATION AUDIT")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # PART 1: PRD SECTION 28 DEMO SCRIPT (STEPS 1–11)
    # -------------------------------------------------------------------------
    print("\n--- PRD SECTION 28 DEMO SCRIPT: STEPS 1–11 ---")

    # Step 1: Health & Runtime Integrity
    t0 = time.perf_counter()
    r = client.get("/api/health")
    dt = (time.perf_counter() - t0) * 1000
    h_ok = r.status_code == 200 and r.json().get("status") == "ok" and r.json().get("model_loaded") is True
    record("Step 1", "System Health & Model Runtime Loading", h_ok,
           f"HTTP {r.status_code}, status={r.json().get('status')}, model_loaded={r.json().get('model_loaded')}, latency={dt:.1f}ms")

    # Step 2: Faculty Authentication
    t0 = time.perf_counter()
    r = client.post("/api/auth/login", json={"email": "faculty@school.edu", "password": "TestFaculty123!"})
    dt = (time.perf_counter() - t0) * 1000
    f_login_ok = r.status_code == 200 and "access_token" in r.json()
    fac_token = r.json()["access_token"]
    fac_headers = {"Authorization": f"Bearer {fac_token}"}
    
    # Confirm /api/auth/me
    r_me = client.get("/api/auth/me", headers=fac_headers)
    me_ok = r_me.status_code == 200 and r_me.json()["role"] == "faculty" and r_me.json()["email"] == "faculty@school.edu"
    record("Step 2", "Faculty Authentication & Profile Verification", f_login_ok and me_ok,
           f"Login HTTP {r.status_code}, /me role={r_me.json().get('role')}, email={r_me.json().get('email')}, latency={dt:.1f}ms")

    # Step 3: Class Overview & Macro Analytics (PRD F9, F11)
    t0 = time.perf_counter()
    r = client.get("/api/faculty/analytics", headers=fac_headers)
    dt = (time.perf_counter() - t0) * 1000
    an_data = r.json()
    an_ok = (
        r.status_code == 200 and
        an_data["total_students"] >= 20 and
        an_data["evaluated_students"] >= 20 and
        "risk_distribution" in an_data and
        ("high" in an_data["risk_distribution"] or "High" in an_data["risk_distribution"]) and
        "average_risk_probability" in an_data
    )
    record("Step 3", "Faculty Cohort Overview & Macro Analytics", an_ok,
           f"HTTP {r.status_code}, total={an_data.get('total_students')}, evaluated={an_data.get('evaluated_students')}, "
           f"dist={an_data.get('risk_distribution')}, avg_prob={an_data.get('average_risk_probability'):.3f}, latency={dt:.1f}ms")

    # Step 4: High-Risk Student Directory Triage
    t0 = time.perf_counter()
    r = client.get("/api/faculty/students?risk_level=High", headers=fac_headers)
    dt = (time.perf_counter() - t0) * 1000
    dir_data = r.json()
    dir_ok = r.status_code == 200 and dir_data["total"] >= 1 and len(dir_data["items"]) >= 1
    # Find high risk student STU-1003 or first item
    high_risk_stu = None
    for item in dir_data["items"]:
        if item["student_code"] == "STU-1003":
            high_risk_stu = item
            break
    if not high_risk_stu and dir_data["items"]:
        high_risk_stu = dir_data["items"][0]
    
    target_stu_id = high_risk_stu["id"]
    target_stu_code = high_risk_stu["student_code"]
    record("Step 4", "Faculty Student Directory & Risk Triage Filter", dir_ok,
           f"HTTP {r.status_code}, total_high_risk={dir_data.get('total')}, selected={target_stu_code} (ID={target_stu_id}, prob={high_risk_stu.get('risk_probability')}), latency={dt:.1f}ms")

    # Step 5: High-Risk Student Profile & Academic Telemetry
    t0 = time.perf_counter()
    r_prof = client.get(f"/api/students/{target_stu_id}", headers=fac_headers)
    r_tele = client.get(f"/api/students/{target_stu_id}/academic-data", headers=fac_headers)
    dt = (time.perf_counter() - t0) * 1000
    prof_ok = r_prof.status_code == 200 and r_prof.json()["student_code"] == target_stu_code
    tele_data = r_tele.json()
    tele_ok = r_tele.status_code == 200 and len(tele_data) >= 1
    latest_rec = tele_data[0]
    record("Step 5", "Student Profile & Academic Telemetry Inspection", prof_ok and tele_ok,
           f"Profile HTTP {r_prof.status_code} ({r_prof.json().get('first_name')} {r_prof.json().get('last_name')}), "
           f"Telemetry HTTP {r_tele.status_code} ({len(tele_data)} records, latest: G1={latest_rec.get('G1')}, G2={latest_rec.get('G2')}, absences={latest_rec.get('absences')}), latency={dt:.1f}ms")

    # Step 6: Live ML Risk Prediction Execution (PRD F5)
    t0 = time.perf_counter()
    r_pred = client.post("/api/predict", json={"student_id": target_stu_id}, headers=fac_headers)
    dt = (time.perf_counter() - t0) * 1000
    pred_data = r_pred.json()
    pred_ok = (
        r_pred.status_code == 200 and
        pred_data["risk_level"] == "High" and
        pred_data["at_risk_binary"] == 1 and
        pred_data["risk_probability"] >= 0.70 and
        "prediction_id" in pred_data
    )
    record("Step 6", "ML Model Inference & Binary Risk Scoring", pred_ok,
           f"HTTP {r_pred.status_code}, prediction_id={pred_data.get('prediction_id')}, risk_level={pred_data.get('risk_level')}, "
           f"prob={pred_data.get('risk_probability'):.4f}, at_risk_binary={pred_data.get('at_risk_binary')}, latency={dt:.1f}ms")

    # Step 7: SHAP Factor Attribution & Explainability (PRD F6)
    factors = pred_data.get("top_factors", [])
    disclaimer = pred_data.get("causal_disclaimer", "")
    shap_ok = (
        len(factors) == 5 and
        all("feature" in f and "display_name" in f and "contribution" in f and "direction" in f for f in factors) and
        "causal" in disclaimer.lower()
    )
    factor_summary = "; ".join([f"{f['display_name']}: {f['direction']} ({f['contribution']:+.3f})" for f in factors[:3]])
    record("Step 7", "LinearSHAP Feature Attribution & Supportive Disclaimer", shap_ok,
           f"Top 5 factors verified: [{factor_summary}], disclaimer present='{'causal' in disclaimer.lower()}'")

    # Step 8: Deterministic Rule-Based Recommendations (PRD F8)
    t0 = time.perf_counter()
    r_rec = client.get(f"/api/recommendations/{target_stu_id}", headers=fac_headers)
    dt = (time.perf_counter() - t0) * 1000
    rec_data = r_rec.json()
    rec_list = rec_data.get("recommendations", [])
    rec_ok = (
        r_rec.status_code == 200 and
        rec_data["total_recommendations"] >= 1 and
        "non-causal" in rec_data.get("advisory_notice", "").lower() and
        all("title" in item and "trigger_condition" in item for item in rec_list)
    )
    rec_triggers = [item["trigger_condition"] for item in rec_list]
    record("Step 8", "Deterministic Rule-Based Recommendations Retrieval", rec_ok,
           f"HTTP {r_rec.status_code}, total={rec_data.get('total_recommendations')}, triggers={rec_triggers}, "
           f"advisory='{'non-causal' in rec_data.get('advisory_notice', '').lower()}', latency={dt:.1f}ms")

    # Step 9: Longitudinal History & Risk Trajectory (PRD F7, F10)
    t0 = time.perf_counter()
    r_hist = client.get(f"/api/students/{target_stu_id}/history", headers=fac_headers)
    dt = (time.perf_counter() - t0) * 1000
    hist_data = r_hist.json()
    timeline = hist_data.get("trajectory", [])
    # Verify zero G3 leakage across entire response string
    no_g3_leak = "G3" not in str(hist_data)
    hist_ok = (
        r_hist.status_code == 200 and
        len(timeline) >= 1 and
        hist_data.get("latest_prediction") is not None and
        no_g3_leak
    )
    record("Step 9", "Longitudinal History & Trajectory (Zero G3 Leakage)", hist_ok,
           f"HTTP {r_hist.status_code}, trajectory_points={len(timeline)}, latest_pred_id={hist_data.get('latest_prediction', {}).get('id')}, "
           f"zero_G3_leak={no_g3_leak}, latency={dt:.1f}ms")

    # Step 10: Batch CSV Ingestion & Atomic Rollback
    csv_content = (
        "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,"
        "traveltime,studytime,failures,schoolsup,famsup,paid,activities,nursery,higher,"
        "internet,romantic,famrel,freetime,goout,Dalc,Walc,health,absences,G1,G2,student_code,term\n"
        "GP,F,17,U,GT3,T,3,3,services,services,home,mother,1,2,0,no,yes,no,yes,yes,yes,yes,no,4,3,2,1,1,4,2,14.0,15.0,STU-DEMO-99,Fall 2026\n"
    )
    t0 = time.perf_counter()
    files = {"file": ("demo_batch.csv", csv_content.encode("utf-8"), "text/csv")}
    r_up = client.post("/api/dataset/upload", files=files, headers=fac_headers)
    dt = (time.perf_counter() - t0) * 1000
    up_data = r_up.json()
    up_ok = (
        r_up.status_code == 201 and
        up_data.get("status") == "success" and
        up_data.get("records_created") == 1
    )
    record("Step 10", "Batch CSV Telemetry Ingestion (Atomic & Validated)", up_ok,
           f"HTTP {r_up.status_code}, status={up_data.get('status')}, records_created={up_data.get('records_created')}, "
           f"students_created={up_data.get('students_created')}, latency={dt:.1f}ms")

    # Step 11: Updated Cohort Analytics & Macro Re-Distribution
    t0 = time.perf_counter()
    r_an2 = client.get("/api/faculty/analytics", headers=fac_headers)
    dt = (time.perf_counter() - t0) * 1000
    an2_data = r_an2.json()
    an2_ok = (
        r_an2.status_code == 200 and
        an2_data["total_students"] >= an_data["total_students"]
    )
    record("Step 11", "Updated Cohort Analytics & Macroscopic Re-Distribution", an2_ok,
           f"HTTP {r_an2.status_code}, previous_total={an_data['total_students']}, new_total={an2_data['total_students']}, "
           f"distribution={an2_data.get('risk_distribution')}, latency={dt:.1f}ms")

    # -------------------------------------------------------------------------
    # PART 2: STRICT TARGET LEAKAGE (G3) REJECTION (4 ENTRYPOINTS)
    # -------------------------------------------------------------------------
    print("\n--- TARGET LEAKAGE (G3) REJECTION ACROSS 4 ENTRYPOINTS ---")

    # Telemetry baseline dictionary
    telemetry_base = {
        "age": 17, "Medu": 3, "Fedu": 3, "traveltime": 1, "studytime": 2,
        "failures": 0, "famrel": 4, "freetime": 3, "goout": 2, "Dalc": 1,
        "Walc": 1, "health": 4, "absences": 4, "G1": 13.0, "G2": 14.0,
        "school": "GP", "sex": "F", "address": "U", "famsize": "GT3",
        "Pstatus": "T", "schoolsup": "no", "famsup": "yes", "paid": "no",
        "activities": "yes", "nursery": "yes", "higher": "yes", "internet": "yes",
        "romantic": "no", "Mjob": "services", "Fjob": "other", "reason": "course",
        "guardian": "mother", "term": "Fall 2026",
    }

    # 1. Telemetry POST: POST /api/students/{id}/academic-data with G3
    payload_g3_telemetry = {**telemetry_base, "G3": 15.0}
    r = client.post(f"/api/students/{target_stu_id}/academic-data", json=payload_g3_telemetry, headers=fac_headers)
    g3_tele_ok = r.status_code == 422
    record("G3-Entrypoint-1", "Telemetry POST rejects G3 column", g3_tele_ok,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # 2. Predict Endpoint: POST /api/predict with G3 in request root
    r = client.post("/api/predict", json={"student_id": target_stu_id, "G3": 16.0}, headers=fac_headers)
    g3_pred_root_ok = r.status_code == 422
    record("G3-Entrypoint-2a", "/api/predict root rejects G3 column", g3_pred_root_ok,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # 2b. Predict Endpoint: POST /api/predict with G3 inside academic_data
    r = client.post("/api/predict", json={"student_id": target_stu_id, "academic_data": payload_g3_telemetry}, headers=fac_headers)
    g3_pred_nested_ok = r.status_code == 422
    record("G3-Entrypoint-2b", "/api/predict academic_data rejects G3 column", g3_pred_nested_ok,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # 3. Batch Predict Endpoint: POST /api/predict/batch with G3 in body
    r = client.post("/api/predict/batch", json={"student_ids": [target_stu_id], "G3": 14.0}, headers=fac_headers)
    g3_batch_ok = r.status_code == 422
    record("G3-Entrypoint-3", "/api/predict/batch rejects G3 in payload", g3_batch_ok,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # 4. CSV Upload: POST /api/dataset/upload with G3 column in header
    csv_with_g3 = (
        "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,"
        "traveltime,studytime,failures,schoolsup,famsup,paid,activities,nursery,higher,"
        "internet,romantic,famrel,freetime,goout,Dalc,Walc,health,absences,G1,G2,G3,student_code,term\n"
        "GP,F,17,U,GT3,T,3,3,services,services,home,mother,1,2,0,no,yes,no,yes,yes,yes,yes,no,4,3,2,1,1,4,2,14.0,15.0,16.0,STU-LEAK-01,Fall 2026\n"
    )
    files = {"file": ("leaked_g3.csv", csv_with_g3.encode("utf-8"), "text/csv")}
    r = client.post("/api/dataset/upload", files=files, headers=fac_headers)
    g3_csv_ok = r.status_code == 422 and "leakage" in r.json().get("detail", "").lower()
    record("G3-Entrypoint-4", "CSV Upload strictly rejects G3 column in header", g3_csv_ok,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # -------------------------------------------------------------------------
    # PART 3: RBAC BOUNDARIES & 403 FORBIDDEN RE-VERIFICATION
    # -------------------------------------------------------------------------
    print("\n--- RBAC BOUNDARIES & 403 FORBIDDEN RE-VERIFICATION ---")

    # Setup tokens:
    # Student 1 (linked to STU-1001)
    r1 = client.post("/api/auth/login", json={"email": "student@school.edu", "password": "TestStudent123!"})
    token_stu1 = r1.json()["access_token"]
    stu1_headers = {"Authorization": f"Bearer {token_stu1}"}
    me_stu1 = client.get("/api/auth/me", headers=stu1_headers).json()
    stu1_id = me_stu1["student_id"]

    # Student 2 (linked to STU-1002)
    r2 = client.post("/api/auth/login", json={"email": "student2@school.edu", "password": "TestStudent123!"})
    token_stu2 = r2.json()["access_token"]
    stu2_headers = {"Authorization": f"Bearer {token_stu2}"}
    me_stu2 = client.get("/api/auth/me", headers=stu2_headers).json()
    stu2_id = me_stu2["student_id"]

    # Faculty 2 (Alan Turing, unassigned)
    rf2 = client.post("/api/auth/login", json={"email": "faculty2@school.edu", "password": "TestFaculty456!"})
    token_fac2 = rf2.json()["access_token"]
    fac2_headers = {"Authorization": f"Bearer {token_fac2}"}

    # Test 3.1: Student 1 accessing Student 2 Profile -> 403
    r = client.get(f"/api/students/{stu2_id}", headers=stu1_headers)
    record("RBAC-1", "Cross-student profile access returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.2: Student 1 accessing Student 2 Academic Data -> 403
    r = client.get(f"/api/students/{stu2_id}/academic-data", headers=stu1_headers)
    record("RBAC-2", "Cross-student academic data access returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.3: Student 1 accessing Student 2 History Trajectory -> 403
    r = client.get(f"/api/students/{stu2_id}/history", headers=stu1_headers)
    record("RBAC-3", "Cross-student history trajectory access returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.4: Student 1 predicting for Student 2 -> 403
    r = client.post("/api/predict", json={"student_id": stu2_id}, headers=stu1_headers)
    record("RBAC-4", "Cross-student prediction execution returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.5: Student 1 accessing Student 2 Recommendations -> 403
    r = client.get(f"/api/recommendations/{stu2_id}", headers=stu1_headers)
    record("RBAC-5", "Cross-student recommendations access returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.6: Student attempting to self-author official telemetry -> 403
    r = client.post(f"/api/students/{stu1_id}/academic-data", json=telemetry_base, headers=stu1_headers)
    record("RBAC-6", "Student authoring official academic telemetry returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.7: Student calling Faculty Analytics -> 403
    r = client.get("/api/faculty/analytics", headers=stu1_headers)
    record("RBAC-7", "Student accessing Faculty Analytics returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.8: Student calling Faculty Students Directory -> 403
    r = client.get("/api/faculty/students", headers=stu1_headers)
    record("RBAC-8", "Student accessing Faculty Students Directory returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.9: Student calling Batch Dataset Upload -> 403
    files = {"file": ("test.csv", b"dummy,csv", "text/csv")}
    r = client.post("/api/dataset/upload", files=files, headers=stu1_headers)
    record("RBAC-9", "Student attempting Batch Dataset Upload returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.10: Unassigned Faculty accessing student profile -> 403
    r = client.get(f"/api/students/{stu1_id}", headers=fac2_headers)
    record("RBAC-10", "Unassigned faculty accessing student profile returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.11: Unassigned Faculty executing prediction on student -> 403
    r = client.post("/api/predict", json={"student_id": stu1_id}, headers=fac2_headers)
    record("RBAC-11", "Unassigned faculty predicting for student returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.12: Unassigned Faculty posting telemetry for student -> 403
    r = client.post(f"/api/students/{stu1_id}/academic-data", json=telemetry_base, headers=fac2_headers)
    record("RBAC-12", "Unassigned faculty posting telemetry returns 403 Forbidden", r.status_code == 403,
           f"HTTP {r.status_code}, detail={r.json().get('detail')}")

    # Test 3.13: Denylisted Token (POST /api/auth/logout) -> Subsequent 401
    r_logout = client.post("/api/auth/logout", headers=stu1_headers)
    logout_ok = r_logout.status_code == 200
    r_post_logout = client.get("/api/auth/me", headers=stu1_headers)
    revoked_ok = r_post_logout.status_code == 401 and "revoked" in r_post_logout.json().get("detail", "").lower()
    record("RBAC-13", "Revoked Token (jti denylist) strictly rejected with 401 Unauthorized", logout_ok and revoked_ok,
           f"Logout HTTP {r_logout.status_code}, Subsequent /me HTTP {r_post_logout.status_code}, detail={r_post_logout.json().get('detail')}")

    print("\n" + "=" * 80)
    print(f"VERIFICATION COMPLETE: ALL {len(results)}/{len(results)} CHECKS PASSED 100%!")
    print("=" * 80)

if __name__ == "__main__":
    run_demo_and_verifications()
