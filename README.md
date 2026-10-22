# 🎓 EduGuard

### Explainable AI-Based Early Warning System for Student Academic Risk

EduGuard identifies students at risk of academic failure **before** final grades are published. It gives faculty a ranked, explainable view of who needs support and why, and gives students a clear view of their own standing with supportive, non-punitive recommendations.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?logo=scikitlearn&logoColor=white)
![SHAP](https://img.shields.io/badge/Explainability-SHAP-blueviolet)
![Tests](https://img.shields.io/badge/tests-192%20passing-brightgreen)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [API Overview](#-api-overview)
- [Roles & Access Control](#-roles--access-control)
- [Testing](#-testing)
- [Project Status](#-project-status)
- [Limitations & Responsible Use](#-limitations--responsible-use)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🔎 Overview

Schools usually learn that a student is struggling only after the final grade is in. EduGuard predicts risk from **early-term signals** (first and second period grades, attendance, study habits and demographic/context factors) so that mentors can step in while it still matters.

Three principles shape the design:

- **Explainable by default.** Every prediction ships with the top contributing factors, computed with exact SHAP values.
- **Zero target leakage.** The final grade (`G3`) is the label and is never accepted as an input. It is rejected at every entry point (API, CSV upload, and ML pipeline).
- **Human in the loop.** Outputs are advisory. Feature attributions show statistical association, not causation, and advisor oversight is expected.

---

## ✨ Key Features

### 🤖 Machine Learning
- Binary at-risk classification with **Logistic Regression**, chosen over Random Forest and XGBoost on recall/F1 priority.
- Custom `AcademicFeatureEngineer` with derived signals: grade velocity (`G2 − G1`), grade average, chronic absenteeism flag and study-to-failure ratio.
- **Exact LinearSHAP** explanations with human-readable feature labels and non-causal disclaimers.
- Three-tier risk triage: **Low** (< 40%), **Medium** (40% to < 70%) and **High** (≥ 70%), plus a binary at-risk flag at the 0.50 threshold.
- Versioned model artifacts (`model_v1.joblib`) with metadata and a published **Model Card**.

### ⚙️ Backend (FastAPI)
- JWT authentication with role-based access control (student / faculty / admin).
- Prediction endpoint that returns risk probability, risk tier, top-5 SHAP factors and a model version.
- **Append-only** prediction and explanation history. Past records are never modified.
- Deterministic, rule-based recommendations engine (no LLM, no generative AI).
- Longitudinal student history and anonymized faculty cohort analytics.
- Atomic CSV batch upload with strict validation.
- Mentor–student assignments that scope what each faculty member can see.
- Alembic migrations with a zero-drift schema check.

### 🖥️ Frontend (Next.js)
- Role-aware dashboards for students and faculty.
- Faculty **Student Directory** with risk filters (All / High / Medium / Low / Not evaluated), search, sorting and pagination.
- **High-Risk Priority Panel** on the faculty dashboard.
- Recharts visualizations for risk gauges, SHAP attribution and score trends.

---

## 🧠 How It Works

```
 Academic record (32 features, no G3)
            │
            ▼
 ┌──────────────────────────┐
 │ Feature engineering      │  ΔG, grade avg, chronic absenteeism, study/failure ratio
 └────────────┬─────────────┘
              ▼
 ┌──────────────────────────┐
 │ Logistic Regression      │  → risk probability → tier (Low / Medium / High)
 └────────────┬─────────────┘
              ▼
 ┌──────────────────────────┐
 │ LinearSHAP explainer     │  → top-5 contributing factors (direction + magnitude)
 └────────────┬─────────────┘
              ▼
 ┌──────────────────────────┐
 │ Rule-based recommender   │  → supportive, non-causal guidance
 └──────────────────────────┘
```

### Recommendation Rules

| # | Rule | Condition | Priority | Category |
|---|------|-----------|----------|----------|
| 1 | Grade velocity | `G2 − G1 < −2` | High | Academic Progress |
| 2 | Passing standard | `G2 < 10` | High | Academic Remediation |
| 3 | Chronic absenteeism | `absences ≥ 10` | Medium | Attendance |
| 4 | Study allocation | `studytime ≤ 1` | Medium | Study Strategy |

Recommendations are always returned in this canonical order and retrieval is idempotent.

### Model Performance

Evaluated **once** on a stratified, held-out 20% test split (N = 79). Model selection used 5-fold cross-validation on the training split only.

| Metric | CV (train) | Held-out test |
|--------|-----------:|--------------:|
| Recall | 95.24% | 88.46% |
| Precision | n/a | 79.31% |
| F1 | 88.03% | 83.64% |
| ROC-AUC | n/a | 97.97% |

See [`ml/reports/MODEL_CARD.md`](ml/reports/MODEL_CARD.md) for the full evaluation and caveats.

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **ML & Explainability** | Python, NumPy, pandas, scikit-learn, XGBoost, SHAP, joblib |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, Alembic |
| **Database** | PostgreSQL 16+ (SQLite used for the automated test suite) |
| **Auth & Security** | python-jose (JWT), passlib + bcrypt |
| **Frontend** | Next.js (App Router), React, TypeScript, Tailwind CSS, Recharts, Lucide |
| **Testing** | pytest, pytest-asyncio, httpx, Vitest, React Testing Library, Playwright |
| **DevOps** | Docker, GitHub Actions (planned), Vercel and Render/Railway (planned) |

---

## 📁 Project Structure

```
EduGuard/
├── backend/            # FastAPI app: routes, schemas, services, models, tests, Alembic versions
│   ├── app/
│   │   ├── api/v1/     # auth, students, predict, faculty, admin, dataset, recommendations
│   │   ├── services/   # ml_service, recommendation_service
│   │   ├── schemas/    # Pydantic request/response models
│   │   ├── models/     # SQLAlchemy models
│   │   └── db/         # session + seed data
│   ├── alembic/        # migrations
│   └── tests/
├── ml/                 # Standalone ML pipeline
│   ├── clean.py        # data cleaning
│   ├── eda.py          # exploratory analysis
│   ├── features.py     # preprocessing + feature engineering
│   ├── train.py        # training, CV and model comparison
│   ├── explain.py      # SHAP explainer wrapper
│   ├── artifacts/      # model_v1.joblib, model_metadata.json
│   ├── reports/        # model comparison, SHAP summary, MODEL_CARD.md
│   └── tests/          # 36 unit tests
├── frontend/           # Next.js + Tailwind + Recharts dashboards
├── data/               # raw dataset + DATASET.md (profiling & leakage policy)
├── docs/               # planning documents
├── alembic.ini
├── pytest.ini
├── start-db.ps1        # local PostgreSQL helper (Windows)
├── .env.example
├── REQUIREMENTS.md     # full environment setup guide
└── PROGRESS.md         # phase-by-phase status tracker
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ (3.12 recommended) |
| Node.js | 20.x LTS or newer |
| Docker | v24+ (for local PostgreSQL) |
| Git | 2.x |

Full OS-specific install commands are in [`REQUIREMENTS.md`](REQUIREMENTS.md).

### 1. Clone the repository

```bash
git clone https://github.com/Sumukh-15/EduGaurd.git
cd EduGaurd
```

### 2. Set up the Python environment

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install numpy pandas scikit-learn xgboost shap joblib `
            fastapi "uvicorn[standard]" "pydantic>=2.0" pydantic-settings `
            "sqlalchemy>=2.0" alembic psycopg2-binary asyncpg `
            "python-jose[cryptography]" "passlib[bcrypt]" bcrypt==4.0.1 python-multipart `
            pytest pytest-asyncio httpx
```

### 3. Configure environment variables

```powershell
copy .env.example .env
```

Edit `.env` (see [Configuration](#-configuration)). **Change `SECRET_KEY` before deploying anywhere.**

### 4. Run the project

Run each of these from the **repository root**, in separate terminals where noted.

**a) Start the local PostgreSQL database**

```powershell
powershell -ExecutionPolicy Bypass -File .\start-db.ps1
```

**b) Seed demo users, students and mentor assignments**

```powershell
.\.venv\Scripts\python.exe -m backend.app.db.seed
```

**c) Start the backend API** (Terminal 1)

```powershell
.\.venv\Scripts\uvicorn backend.app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

**d) Start the frontend** (Terminal 2)

```powershell
cd frontend
npm install      # first run only
npm run dev
```

Open http://localhost:3000.

> **macOS / Linux:** activate the venv with `source .venv/bin/activate`, then use
> `python -m backend.app.db.seed` and `uvicorn backend.app.main:app --reload --port 8000`.
> `start-db.ps1` is a Windows helper, so start PostgreSQL with the Docker command in [`REQUIREMENTS.md`](REQUIREMENTS.md) instead.

> If the database schema is missing, apply migrations first with `.\.venv\Scripts\alembic upgrade head`.

---

## 🔧 Configuration

Copy `.env.example` to `.env` in the repository root.

### Backend (`.env`)

```env
ENVIRONMENT=development
PROJECT_NAME="EduGuard API"
API_V1_PREFIX=/api

# Match the host/port used by start-db.ps1
DATABASE_URL=postgresql://eduguard:eduguard_secret@localhost:5432/eduguard_db

SECRET_KEY=change_this_to_a_secure_random_hex_key_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

ALLOWED_ORIGINS=http://localhost:3000

MODEL_PATH=ml/artifacts/model_v1.joblib
METADATA_PATH=ml/artifacts/model_metadata.json
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 📡 API Overview

All routes are prefixed with `/api`. Interactive docs are available at `/docs`.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/health` | Public | Service and model-loaded status |
| POST | `/auth/login` | Public | Obtain a JWT access token |
| GET | `/auth/me` | Authenticated | Current user identity |
| GET | `/students/{id}` | Owner / assigned faculty / admin | Student profile |
| PATCH | `/students/{id}` | Owner / assigned faculty / admin | Update demographics (`student_code` immutable) |
| GET | `/students/{id}/academic-data` | Owner / assigned faculty / admin | Academic records |
| POST | `/students/{id}/academic-data` | Faculty, Admin | Submit academic telemetry |
| GET | `/students/{id}/history` | Owner / assigned faculty / admin | Longitudinal predictions (`order=asc\|desc`) |
| POST | `/predict` | Owner / assigned faculty / admin | Risk prediction + top-5 SHAP factors |
| GET | `/recommendations/{student_id}` | Owner / assigned faculty / admin | Rule-based recommendations |
| GET | `/faculty/students` | Faculty, Admin | Filterable, sortable, paginated directory |
| GET | `/faculty/analytics` | Faculty, Admin | Anonymized cohort analytics |
| POST | `/dataset/upload` | Faculty, Admin | Batch CSV upload (max 10 MB) |
| POST / GET / DELETE | `/admin/assignments` | Admin | Manage mentor–student assignments |

### Example: request a prediction

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "student_id": 1 }'
```

The response contains the risk probability, risk level, at-risk flag, top-5 SHAP factors (name, label, raw value, SHAP value, direction), the model version and a non-causal disclaimer.

### CSV Upload Rules

- `.csv` only, 10 MB maximum, with `,` or `;` delimiters detected automatically.
- Files containing a `G3` column are **rejected entirely** (never silently dropped).
- Unknown or missing columns are rejected with `422`.
- Each row is validated against the academic record schema. Errors report the row and field.
- Duplicate `(student_code, term)` entries are rejected.
- The whole batch is atomic: any error rolls back everything.
- An optional `mentor_email` column assigns students to a mentor. Otherwise they are assigned to the uploading faculty member.
- Uploads store students and records only. **No predictions are generated at upload time.**

---

## 🔐 Roles & Access Control

| Capability | Student | Faculty | Admin |
|------------|:------:|:-------:|:-----:|
| View own profile, history and recommendations | ✅ | n/a | n/a |
| View assigned students | ❌ | ✅ | ✅ (all) |
| Submit academic telemetry / batch upload | ❌ | ✅ | ✅ |
| Cohort analytics and student directory | ❌ | ✅ (assigned only) | ✅ (all) |
| Manage mentor assignments | ❌ | ❌ | ✅ |

Security measures include generic login errors (no account enumeration), cross-student access returning `403`, path-traversal sanitization on uploads, and no committed credentials (`.env` is gitignored).

---

## ✅ Testing

```powershell
# ML + backend suite (SQLite in-memory)
.\.venv\Scripts\python.exe -m pytest

# Frontend
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

Current verified state (from `PROGRESS.md`):

- **192 / 192** pytest tests passing (36 ML pipeline + 156 backend).
- Live PostgreSQL integration suite and an 11-domain acceptance audit passed.
- `alembic check` reports zero schema drift.
- Frontend type-check, lint and production build all pass.

---

## 📈 Project Status

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Requirements and dataset understanding | ✅ Completed |
| 1 | ML pipeline (Python + SHAP) | ✅ Completed |
| 2 | Backend (FastAPI + SQLAlchemy + Alembic) | 🚧 Functionally complete, final sign-off pending |
| 3 | Frontend (Next.js + Tailwind + Recharts) | 🚧 In progress |
| 4 | Integration, seeding, demo readiness | ⏳ Pending |
| 5 | Production readiness and deployment | ⏳ Pending |

See [`PROGRESS.md`](PROGRESS.md) for the detailed tracker.

---

## ⚠️ Limitations & Responsible Use

- **Dataset scope:** Trained on 395 secondary-school Mathematics students from two Portuguese schools (2008). The model is **not** validated for other populations (for example higher education) without local recalibration.
- **Correlation, not causation:** SHAP attributions describe model behaviour and statistical association. They are not causal claims about a student.
- **Heuristic thresholds:** Rules such as `absences ≥ 10` are project-defined, not regulatory standards.
- **Advisory only:** Predictions should support, never replace, a human advisor's judgment. Do not use them for punitive or high-stakes decisions about students.

---

## 🗺 Roadmap

- [ ] Complete frontend flows for student and faculty reviews
- [ ] End-to-end demo with Docker Compose
- [ ] CI pipeline with GitHub Actions
- [ ] Deployment (Vercel + Render/Railway)
- [ ] Recalibration tooling for new institutional datasets
- [ ] Model monitoring and drift detection

---

## 👤 Author

**Sumukh** ([@Sumukh-15](https://github.com/Sumukh-15))
