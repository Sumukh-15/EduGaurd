# Phase 0 Plan: Requirements & Dataset Understanding

## 1. What We Are Building and Why
In Phase 0, we establish the foundational contract and environment specifications for **EduGuard (Explainable AI-Based Early Warning System for Student Academic Risk)** before writing any application or pipeline code.
- **Why**: Without clear requirements and a rigorously defined data dictionary and prediction point, machine learning projects suffer from subtle data leakage, environment mismatch, and undefined feature semantics. Phase 0 locks in the environment setup and documents the data attributes, target label, and feature mapping.

---

## 2. Exact List of Files to Create or Modify
- `docs/plan-phase0.md` (this planning document)
- `REQUIREMENTS.md` (complete listing of all tools, runtimes, database, libraries, environment variables, and install commands across operating systems)
- `data/DATASET.md` (in-depth inspection of `data/raw/student-mat.csv`, feature types, absence of nulls, conceptual feature mapping, strict prediction point definition, and class balance analysis)
- `PROGRESS.md` (project tracking log detailing completed phases, pending items, and open questions)

*Note: No application or ML code is touched in Phase 0.*

---

## 3. Tools, Libraries, Accounts, and Setup Required on Your Machine

Before proceeding into implementation, your environment needs the following runtimes and tools.

### Runtimes & CLIs
1. **Python (3.11 or 3.12 recommended)**
   - *Windows*: `winget install Python.Python.3.12` (or download from python.org)
   - *macOS*: `brew install python@3.12`
   - *Linux (Ubuntu/Debian)*: `sudo apt update && sudo apt install python3.12 python3.12-venv python3-pip`
   - *Reason*: Powers the FastAPI backend and scikit-learn/XGBoost/SHAP machine learning pipeline.
2. **Node.js (v20 LTS or v22 LTS) & npm**
   - *Windows*: `winget install OpenJS.NodeJS.LTS` (already detected v22.13.0 on your machine)
   - *macOS*: `brew install node@20` or `nvm install 20`
   - *Linux*: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`
   - *Reason*: Powers the Next.js 14+ frontend and TypeScript tooling.
3. **Docker & Docker Compose**
   - *Windows*: Install Docker Desktop (already detected Docker 29.7.2 on your machine)
   - *macOS*: `brew install --cask docker` or Docker Desktop
   - *Linux*: `sudo apt install docker.io docker-compose-v2`
   - *Reason*: Provides local PostgreSQL database containerization and reproducible multi-service orchestration (`docker-compose.yml`).
4. **Git**
   - *Windows*: Already detected `git version 2.50.0.windows.1`
   - *macOS*: `brew install git`
   - *Linux*: `sudo apt install git`
   - *Reason*: Version control and CI/CD integration.
5. **PostgreSQL Client / Database**
   - *Local via Docker (Recommended)*: `docker run --name eduguard-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=eduguard -p 5432:5432 -d postgres:16-alpine`
   - *Local Native (Optional)*:
     - *macOS*: `brew install postgresql@16 && brew services start postgresql@16`
     - *Linux*: `sudo apt install postgresql postgresql-contrib`
     - *Windows*: Native PostgreSQL installer or use Docker container
   - *Reason*: Backend relational database for users, students, academic records, predictions, and explanations.

### Accounts (for Phase 5 Deployment)
1. **GitHub**: For source repository, issue tracking, and GitHub Actions CI.
2. **Vercel**: For frontend Next.js serverless deployment.
3. **Render or Railway**: For hosting the containerized FastAPI backend and managed PostgreSQL database.

---

## 4. Key Assumptions & Architectural Decisions

1. **Primary Dataset**:
   - Primary dataset for the MVP is `data/raw/student-mat.csv` (Math course, 395 student records).
   - `student-por.csv` (Portuguese course, 649 records) is cataloged as a documented extension for subsequent phases. We do **not** merge them for the MVP to prevent record duplication from overlapping students (382 students belong to both datasets with varying course performance).
2. **Prediction Point & Target Definition (Strict Anti-Leakage)**:
   - Target label `at_risk`: Binary indicator ($0$ = Not At Risk, $1$ = At Risk).
   - In Portuguese secondary schools, grading is strictly on a 0–20 scale, with $10$ as the official pass threshold.
   - **Target Rule**: `at_risk = 1` if $G3 < 10$, else $0$.
   - **No Leakage Guarantee**: $G3$ (final grade) is used **solely** to construct the target label. It is completely dropped prior to model training and will never exist in the feature set $X$.
   - Allowed grades at prediction point: $G1$ (first period grade) and $G2$ (second period grade). They represent midterm marks available prior to final outcomes.
3. **Class Balance**:
   - In `student-mat.csv`, 130 out of 395 students ($32.91\%$) have $G3 < 10$ (`at_risk = 1`), and 265 students ($67.09\%$) have $G3 \ge 10$ (`at_risk = 0`).
   - This represents a ~1:2 moderate class imbalance. Stratified splitting and evaluation prioritizing **Recall** and **F1-Score** for class 1 (At Risk) will be applied.
4. **Risk Probability Bucketing**:
   - Low Risk: $0\% - 39\%$
   - Medium Risk: $40\% - 69\%$
   - High Risk: $70\% - 100\%$
   - Defined as a single centralized configuration constant in code.
5. **Explainability First**:
   - TreeSHAP / LinearSHAP will generate feature-level attribution values for every single prediction, returned via FastAPI as a list of `{feature: str, contribution: float}`.
