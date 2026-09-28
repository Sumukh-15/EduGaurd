# EduGuard — Project Progress & Status Tracker

This tracker maintains the real-time status of each project phase, tracking completed deliverables, deferred items, and open architectural questions.

---

## Overall Phase Roadmap

| Phase | Description | Status | Acceptance Gate |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Requirements Doc + Dataset Understanding | **Completed** | Approved by user on 2026-09-23 |
| **Phase 1** | ML Pipeline (Standalone Python + SHAP) | **Completed** | All 36 pytest tests passing; `MODEL_CARD.md` published |
| **Phase 2** | Backend (FastAPI + SQLAlchemy + Alembic) | **In Progress** | Sub-steps 2.1–2.8 complete; 125 backend tests + 36 ML tests passing |
| **Phase 3** | Frontend (Next.js + Tailwind + Recharts) | Pending | Type-check clean; Vitest + Playwright passes; live explanation rendered |
| **Phase 4** | Integration, Seeding, Demo Readiness | Pending | Docker Compose running end-to-end; real student demo flow verified |
| **Phase 5** | Production Readiness & Deployment | Pending | CI green; sub-2s API response; production configs finalized |

---

## Phase 0 Status: Completed & Accepted

- [x] Inspected raw dataset files in `data/raw/` (`student-mat.csv`, `student-por.csv`, `student.txt`).
- [x] Verified exact row count (395), column count (33), 0 missing values, and delimiter (`;`).
- [x] Authored `docs/plan-phase0.md` detailing goals, file lists, machine setup, and assumptions.
- [x] Authored root `REQUIREMENTS.md` specifying all runtimes, CLI tools, libraries, environment variables, and OS commands.
- [x] Authored `data/DATASET.md` profiling attributes, mapping raw features to institutional signals, formalizing the zero-leakage prediction point ($G1, G2 \to \text{features}, G3 \to \text{label}$), and calculating class balance ($32.91\%$ at-risk).
- [x] Approved by user on 2026-09-23.

---

## Phase 1 Status: Completed & Verified (All 7 Sub-steps)

- [x] **Sub-step 1.1**: Clean data (`ml/clean.py`), EDA reports (`ml/eda.py` -> `ml/reports/eda/`). Verified 0 nulls, $G3$ dropped from $X$.
- [x] **Sub-step 1.2**: Scikit-learn preprocessing pipeline (`ml/features.py`), `AcademicFeatureEngineer` derived signals ($\Delta G = G2 - G1$, grade average, chronic absenteeism, study-to-failure ratio), zero-leakage validation.
- [x] **Sub-step 1.3**: Stratified 80/20 train/test split, 5-fold cross-validation on train split only, comparative evaluation of Logistic Regression, Random Forest, and XGBoost (`ml/train.py` -> `ml/reports/model_comparison.csv`).
- [x] **Sub-step 1.4**: Model selection by Recall/F1 priority -> Selected **Logistic Regression** (95.24% CV Recall, 88.03% CV F1). Evaluated once on held-out test split ($N=79$: 88.46% Recall, 79.31% Precision, 83.64% F1, 97.97% ROC-AUC). Generated comprehensive, honest [ml/reports/MODEL_CARD.md](file:///c:/Users/Supriya%20Mallikarjuna/OneDrive/Desktop/EduGaurd/ml/reports/MODEL_CARD.md).
- [x] **Sub-step 1.5**: Exact LinearSHAP explainability wrapper (`ml/explain.py`), human-readable feature labels, non-causal interpretation disclaimers, and global feature importance export (`ml/reports/shap_global_summary.csv`).
- [x] **Sub-step 1.6**: Artifact serialization (`ml/artifacts/model_v1.joblib` and `ml/artifacts/model_metadata.json`), threshold definitions, independent subprocess loading verified.
- [x] **Sub-step 1.7**: Complete test suite of **36 automated unit tests** in `ml/tests/` passing with 100% success. End-to-end artifact consistency verified.

---

## Phase 2 Status: In Progress (Sub-steps 2.1–2.7 Complete)

- [x] **Sub-step 2.1**: Project scaffold, environment configuration, Dockerfile, health check endpoint (`/api/health`), and automated test suite (`backend/tests/test_health.py`). All 6 backend tests passing; live Uvicorn startup verified.
- [x] **Sub-step 2.3**: Security, JWT Authentication & RBAC Dependencies (`/api/auth/login`, `/api/auth/me`, `require_roles`, `verify_student_access`).
  - **Root Cause of Original Live Login Failure**: Unit tests operated against in-memory SQLite fixtures (`StaticPool`), whereas live Uvicorn defaulted to `localhost:5432` where the target application role (`eduguard`) and database (`eduguard_db`) did not exist.
  - **Database Architecture & Setup**: Dedicated local PostgreSQL 18 cluster initialized on non-conflicting host port `5433` (avoiding conflict with existing port 5432 service). Authenticated role `eduguard` and database `eduguard_db` created. Environment configuration dynamically loaded via root `.env` (gitignored, zero committed credentials).
  - **PostgreSQL Migration Verification**: `alembic upgrade head` executed directly against PostgreSQL (`cfa545c82657_initial_schema.py`). Verified all 6 application tables (`users`, `students`, `academic_records`, `predictions`, `explanations`, `recommendations`), primary keys, 5 foreign-key constraints, unique indexes, and append-only constraints.
  - **Live Authentication & RBAC Verification**:
    - Seeded safe test users into PostgreSQL (`student@school.edu` linked to `STU-1001`, `faculty@school.edu`, `admin@school.edu`, and unlinked `STU-1002`).
    - Live Uvicorn server (`http://127.0.0.1:8000`) verified:
      - `GET /` -> 200 OK
      - `GET /docs` -> 200 OK (Swagger UI present)
      - `GET /api/health` -> 200 OK (`status: ok`, `model_loaded: true`)
      - `POST /api/auth/login` (invalid user & wrong password) -> 401 Generic Error (`Incorrect email or password`, preventing account enumeration)
      - `POST /api/auth/login` (valid student, faculty, admin) -> 200 OK with signed JWT access tokens
      - `GET /api/auth/me` with Bearer tokens -> 200 OK returning user identity and linked student code
      - Tampered tokens & missing headers -> 401 Unauthorized
      - Student ownership enforcement -> Student viewing own record (`STU-1001`) allowed; student accessing cross-student record (`STU-1002`) strictly 403 Forbidden
      - Faculty/Admin access -> Accessing any student record allowed; student accessing faculty-only/admin-only operations strictly 403 Forbidden
  - **Automated & Integration Test Results**:
    - **SQLite Automated Test Suite**: 68/68 passed (36 ML, 6 health, 9 models, 17 auth) in ~12.7s.
    - **PostgreSQL Live Integration Suite**: 13/13 test groups passed 100% against live PostgreSQL on port 5433 and live Uvicorn on port 8000.
- [x] **Sub-step 2.4**: Student Profile & Academic Data Endpoints (`/api/students/{id}`, `/api/students/{id}/academic-data`).
  - **Deliverables Implemented**:
    - `backend/app/schemas/student.py`: `StudentBase`, `StudentCreate`, `StudentUpdate` (extra forbidden), `StudentRead`, `StudentDetailRead`.
    - `backend/app/schemas/academic_data.py`: `AcademicRecordBase` (all 32 Phase 1 input features validated with exact mathematical/categorical bounds, `extra="forbid"`, root validator strictly forbidding target label `G3`), `AcademicRecordCreate`, `AcademicRecordRead`.
    - `backend/app/api/v1/students.py`:
      - `GET /api/students/{id}`: Demographic profile retrieval with student ownership guard (`403 Forbidden` on cross-student access, `404 Not Found` for invalid student IDs).
      - `PATCH /api/students/{id}`: Permitted demographic field updates; canonical `student_code` is immutable (`422 Unprocessable Entity` on unknown/immutable attributes).
      - `GET /api/students/{id}/academic-data`: Chronological academic telemetry records; student restricted to own records (`403 Forbidden` on cross-student access).
      - `POST /api/students/{id}/academic-data`: Official institutional telemetry entry. Restricted strictly to `faculty` and `admin` roles (`403 Forbidden` if invoked by students). Reject `G3` payloads with `422 Unprocessable Entity`.
    - Mounted `students_router` in `backend/app/api/v1/__init__.py`.
  - **Verification Results**:
    - **SQLite Automated Test Suite**: 91/91 passed (36 ML tests, 6 health tests, 9 model tests, 17 auth tests, 23 student/academic data tests) in ~20.9s.
    - **PostgreSQL Live Integration Suite**: 27/27 test groups passed 100% against live PostgreSQL (port 5433) and live Uvicorn (port 8000), verifying real database queries, student ownership enforcement, G3 leakage rejection, and role-based access control.
- [x] **Sub-step 2.5**: ML Service Integration & Prediction Endpoint (`POST /api/predict`).
  - **Deliverables Implemented**:
    - `backend/app/services/ml_service.py`: Singleton ML service managing `model_v1.joblib` pipeline, `model_metadata.json`, and `EduGuardExplainer`. Evaluates all 32 features, verifies zero leakage (strictly rejects target `G3`), calculates risk probability, classifies risk tier (Low <40%, Medium 40%–<70%, High >=70%), computes binary at-risk flag (threshold 0.50), and extracts top-5 local SHAP contributing factors.
    - `backend/app/schemas/prediction.py`: Pydantic models for `PredictRequest` (accepts `student_id`, optional `academic_record_id`, optional `academic_data`; rejects extra fields; rejects `G3` with 422), `FactorContributionRead` (SHAP value, feature name, human-readable label, raw value, direction), and `PredictResponse` (full prediction details, model version, non-causal disclaimer).
    - `backend/app/api/v1/predict.py`: Route handler for `POST /api/predict`. Enforces student ownership (students can only trigger predictions for their own profile; faculty/admin can evaluate any student or provide telemetry). Resolves existing `AcademicRecord` or creates new one for faculty/admin. Executes inference + SHAP explanation, persists immutable `Prediction` and linked `Explanation` records in PostgreSQL, and returns structured prediction payload.
    - `backend/app/main.py`: Pre-loads ML artifacts at startup via lifespan handler, and registers a global exception handler mapping `MLModelUnavailableException` to `503 Service Unavailable`.
    - `backend/tests/test_predict_endpoint.py`: 16 focused unit tests covering successful prediction, probability/risk-level consistency, binary threshold consistency, G3 rejection, student ownership, faculty access, database persistence, append-only invariants, SHAP explanation consistency, zero-telemetry handling, and model unavailability handling.
  - **Verification Results**:
    - **Full Pytest Suite**: **107/107 passed** (36 ML pipeline tests + 71 backend API tests) with 0 failures in 21.8s.
    - **PostgreSQL Live Integration Suite**: **35/35 test groups passed** (including live `POST /api/predict`, student ownership checks, G3 rejection, database persistence of `Prediction` and 5 linked `Explanation` records, and PostgreSQL append-only invariant checks) against live PostgreSQL (port 5433) and live Uvicorn (port 8000).
- [x] **Sub-step 2.6**: Historical Trajectories & Faculty Analytics (`/api/students/{id}/history`, `/api/faculty/analytics`).
  - **Deliverables Implemented**:
    - `backend/app/schemas/history.py`: Pydantic models for `PredictionHistoryItem`, `AcademicRecordHistoryItem` (with linked predictions), and `StudentHistoryResponse` (longitudinal trajectory with `latest_prediction`).
    - `backend/app/schemas/analytics.py`: Pydantic models for `RiskDistribution`, `RiskPercentages`, `SchoolDistribution`, and `FacultyAnalyticsResponse` (anonymized macro distributions with zero PII).
    - `backend/app/api/v1/students.py`: Added `GET /api/students/{id}/history`. Enforces strict student ownership (`verify_student_access`), supports chronological sorting (`order=asc|desc`), links predictions to academic records, preserves append-only history, and guarantees zero target leakage (no $G3$).
    - `backend/app/api/v1/faculty.py`: Added `GET /api/faculty/analytics`. Strictly restricted to `faculty` and `admin` roles (`require_roles("faculty", "admin")`). Computes non-identifying cohort aggregates (total students, evaluated/unevaluated counts, at-risk count & percentage, average risk probability, risk triage distributions, school distributions, and division-by-zero safeguards).
    - `backend/app/api/v1/__init__.py`: Mounted `faculty_router` onto the `/api` routing tree.
    - `backend/tests/test_history_analytics.py`: 16 comprehensive unit tests covering student history ownership, cross-student 403, faculty/admin access, missing student 404, chronological asc/desc ordering, append-only immutability, zero leakage, analytics RBAC (faculty/admin allowed, student 403, unauthenticated 401), mathematical aggregation correctness, empty database safety, and privacy checks.
    - `backend/tests/verify_live_postgres.py`: Extended with test groups 36–44 covering live HTTP invocation of history and analytics endpoints against PostgreSQL (port 5433) and Uvicorn (port 8000).
  - **Verification Results**:
    - **Full Pytest Suite**: **123/123 passed** (36 ML pipeline tests + 87 backend API tests) with 0 failures.
    - **PostgreSQL Live Integration Suite**: **44/44 test groups passed** 100% against live PostgreSQL (port 5433) and live Uvicorn (port 8000).
- [x] **Sub-step 2.7**: Batch Dataset Upload (`POST /api/dataset/upload`).
  - **Deliverables Implemented**:
    - `backend/app/schemas/dataset.py`: Pydantic model `DatasetUploadResponse` (`filename`, `total_rows`, `records_created`, `students_created`, `message`, `status`).
    - `backend/app/api/v1/dataset.py`: Route handler for `POST /api/dataset/upload`.
      - **RBAC**: Strictly limited to `faculty` and `admin` roles (`require_roles("faculty", "admin")`); students receive `403 Forbidden`, unauthenticated calls receive `401 Unauthorized`.
      - **File Validation**: Enforces 10 MB maximum size limit via chunked stream consumption (`413 Content Too Large` on overflow); validates `.csv` extension and MIME type (`text/csv`, `application/vnd.ms-excel`, `text/plain`); path traversal sanitization with `Path(file.filename).name`.
      - **CSV Parsing & Robustness**: Delimiter auto-detection (supporting both `,` and `;` UCI formats) and encoding fallback (`utf-8-sig`, `utf-8`, `latin-1`).
      - **Anti-Leakage Safeguard**: Strict pre-ingestion scan for target label column `G3`. If `G3` is detected in headers, the entire upload is rejected immediately with `422 Unprocessable Entity` (never silently dropped or ignored).
      - **Column Validation**: Rejects unexpected/unknown columns and missing required feature columns with `422 Unprocessable Entity`.
      - **Row-level Ingestion & Schema Conformance**: Validates each row using `AcademicRecordCreate` (ranges, types, categorical membership). Reject invalid rows with `422 Unprocessable Entity` including row index and field name.
      - **Duplicate Rejection**: In-batch duplicate detection on `(student_code, term)` rejecting duplicated telemetry entries with `422 Unprocessable Entity`.
      - **Transactional Atomic Persistence**: Database transaction wraps the entire batch; any error triggers automatic rollback leaving zero partial records persisted.
      - **Telemetry vs Prediction Boundary**: Strictly persists `Student` and `AcademicRecord` entities; zero predictions are generated during dataset ingestion.
    - `backend/app/api/v1/__init__.py`: Mounted `dataset_router` under `/api`.
    - `backend/tests/test_dataset_upload.py`: 19 focused automated tests covering all RBAC boundaries, file validation rules, 10MB limit, delimiter support, G3 anti-leakage rejection, schema validation, within-file duplicate rejection, transactional rollback, path traversal neutralization, and prediction zero-creation guarantee.
    - `backend/tests/verify_live_postgres.py`: Extended with test groups 45–52 covering live dataset upload, RBAC, G3 rejection, duplicate detection, atomic persistence, and prediction immutability against live PostgreSQL (port 5433) and Uvicorn (port 8000).
  - **Verification Results**:
    - **Full Pytest Suite**: **142/142 passed** (36 ML pipeline tests + 106 backend API tests) with 0 failures in 46.86s.
    - **PostgreSQL Live Integration Suite**: **52/52 test groups passed** 100% against live PostgreSQL (port 5433) and live Uvicorn (port 8000).
- [x] **Sub-step 2.8**: Deterministic Rule-Based Recommendations Engine (`/api/recommendations/{student_id}`).
  - **Deliverables Implemented**:
    - `backend/app/schemas/recommendation.py`: Pydantic models `RecommendationBase`, `RecommendationRead`, and `StudentRecommendationsResponse` (including student context, prediction link, and explicit non-causal advisory notice).
    - `backend/app/services/recommendation_service.py`: Pure rule engine implementing the 4 project-approved heuristics:
      1. **Grade Velocity**: $\Delta G = G2 - G1 < -2$ (`high` priority, Academic Progress)
      2. **Passing Standard**: $G2 < 10$ (`high` priority, Academic Remediation)
      3. **Chronic Absenteeism**: $absences \ge 10$ (`medium` priority, Attendance)
      4. **Study Allocation**: $studytime \le 1$ (`medium` priority, Study Strategy)
      - **Stable Canonical Ordering**: Always sorted by canonical priority ranking [Rule 1, Rule 2, Rule 3, Rule 4].
      - **Zero Generative AI / No LLM**: Pure mathematical condition checks; zero causal assertions; supportive non-punitive guidance.
      - **Zero Target Leakage**: Target $G3$ is strictly excluded from recommendation inputs.
      - **Persistence & Idempotency**: Persists `Recommendation` entities linked to `student_id` and `prediction_id`; idempotent retrieval without duplicate database inserts; preserves append-only prediction history.
    - `backend/app/api/v1/recommendations.py`: Route handler for `GET /api/recommendations/{student_id}`. Enforces student ownership boundary (students can only access own recommendations, 403 Forbidden on cross-student requests; faculty/admin can view any student).
    - `backend/app/api/v1/__init__.py`: Mounted `recommendations_router` under `/api`.
    - `backend/tests/test_recommendations.py`: 19 comprehensive unit tests covering unauthenticated (401), own access (200), cross-student (403), faculty access (200), admin access (200), nonexistent student (404), all 4 rules independently, all 4 rules simultaneously, stable deterministic ordering, empty/no-trigger case, exact threshold boundaries, G3 non-influence, database persistence, prediction immutability, advisory notice, and empty student profile safety.
    - `backend/tests/verify_live_postgres.py`: Extended with test groups 53–61 covering live recommendation retrieval, RBAC boundaries, PostgreSQL persistence, and non-causal disclosures against live PostgreSQL (port 5433) and Uvicorn (port 8000).
  - **Verification Results**:
    - **Full Pytest Suite**: **161/161 passed** (36 ML pipeline tests + 125 backend API tests) with 0 failures in 50.10s.
    - **PostgreSQL Live Integration Suite**: **61/61 test groups passed** 100% against live PostgreSQL (port 5433) and live Uvicorn (port 8000).
- [x] **Sub-step 2.9**: Full Integration, PostgreSQL Verification & Acceptance Check.
  - **Deliverables Implemented & Verified**:
    - `backend/tests/verify_acceptance_phase2.py`: Comprehensive end-to-end integration and acceptance audit script executing 11 end-to-end verification domains:
      1. PostgreSQL 18 schema verification (`users`, `students`, `academic_records`, `predictions`, `explanations`, `recommendations`, `alembic_version`), foreign key cascades, and zero orphan records.
      2. Alembic migration head confirmation (`cfa545c82657`) and zero model drift (`alembic check`).
      3. User authentication, password hashing, JWT lifecycle, and non-enumerating login error handling.
      4. Student profile & academic telemetry RBAC, student ownership boundary enforcement, and cross-student 403 Forbidden checks.
      5. Strict G3 anti-leakage rejection across all entrypoints (telemetry submission, predict endpoint, batch CSV upload).
      6. ML model inference reproducibility, 32-feature matrix alignment, probability-risk triage tier consistency, and 5-factor SHAP local explanations.
      7. Append-only prediction immutability (historical rows never modified or overwritten).
      8. Longitudinal student history trajectory and chronological linking.
      9. Deterministic recommendations engine (all 4 rules, canonical sorting, idempotent persistence).
      10. Faculty cohort analytics with anonymized distributions and zero student PII leakage.
      11. Batch dataset upload with MIME/extension checks, 10MB limit enforcement, delimiter detection, and transaction rollback.
      12. Local latency benchmarks confirming sub-50ms average responses for all core endpoints.
  - **Verification Results**:
    - **Automated Pytest Suite**: **161/161 passed** (36 Phase 1 ML tests + 125 Phase 2 backend tests) with 0 failures, 0 skips, and 1 minor library deprecation warning in 55.04s.
    - **PostgreSQL Live Integration Suite (`verify_live_postgres.py`)**: **61/61 test groups passed** 100% against live PostgreSQL 18 (port 5433) and live Uvicorn (port 8000).
    - **Acceptance Audit Suite (`verify_acceptance_phase2.py`)**: **All 11 acceptance verification phases passed 100%** with zero orphan records and zero data drift.
    - **Alembic Drift Audit (`alembic check`)**: 0 discrepancies detected; live PostgreSQL database schema strictly mirrors SQLAlchemy models.

### Known Assumptions & Technical Debt
1. **Sample Size & Cohort Bounds**: Dataset consists of 395 secondary students from 2 Portuguese schools in 2008 for Mathematics. Not representative of broad higher education without local recalibration.
2. **Chronic Absenteeism Threshold**: $\text{absences} \ge 10$ is a project-defined heuristic assumption rather than an immutable regulatory standard.
3. **Correlation vs. Causation**: Feature attributions reflect model weights and statistical alignments, not direct causal interventions. Human advisor oversight is strictly required.

