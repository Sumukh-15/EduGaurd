# EduGuard — Project Requirements & Environment Setup

This document specifies all software runtimes, CLI tools, libraries, environment variables, accounts, and setup commands required to build, test, and run **EduGuard (Explainable AI-Based Early Warning System for Student Academic Risk)** across all project phases.

---

## 1. System & CLI Software Prerequisites

| Tool | Minimum Version | Recommended Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Python** | 3.11+ | 3.12 (64-bit) | ML pipeline, FastAPI backend, SHAP explanations |
| **Node.js** | 20.x LTS | 20.x / 22.x LTS | Next.js frontend, React, TypeScript |
| **npm** | 10.x+ | bundled with Node | Frontend package management |
| **Docker & Docker Compose** | v24+ | Latest Desktop / Engine | Local PostgreSQL database & multi-container orchestration |
| **PostgreSQL** | 15+ | 16 (via Docker or local) | Relational database (users, students, predictions, logs) |
| **Git** | 2.x | Latest | Version control & CI/CD workflow |

---

## 2. Installation Commands by Operating System

### Windows (PowerShell / Windows Terminal)
```powershell
# 1. Install Python 3.12 (if not already installed)
winget install Python.Python.3.12

# 2. Install Node.js LTS (if not already installed)
winget install OpenJS.NodeJS.LTS

# 3. Install Docker Desktop (includes Docker Compose)
winget install Docker.DockerDesktop

# 4. Install Git
winget install Git.Git
```

### macOS (Homebrew)
```bash
# 1. Install Homebrew (if not already present)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install Python, Node.js, PostgreSQL, Docker, Git
brew install python@3.12 node@20 git
brew install --cask docker

# Optional native PostgreSQL (if not using Docker):
brew install postgresql@16
brew services start postgresql@16
```

### Linux (Ubuntu / Debian)
```bash
sudo apt update && sudo apt install -y curl git build-essential

# 1. Install Python 3.12 + venv + pip
sudo apt install -y python3.12 python3.12-venv python3-pip

# 2. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install Docker Engine & Compose plugin
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```

---

## 3. Python Virtual Environment & Dependencies

For both the ML pipeline (`ml/`) and FastAPI backend (`backend/`), we will use Python 3.12.

### Setting up the Python Virtual Environment
```bash
# From the project root:
py -3.12 -m venv .venv

# Activate on Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Activate on macOS / Linux:
source .venv/bin/activate
```

### Key Python Libraries
- **ML & Explainability**: `numpy`, `pandas`, `scikit-learn`, `xgboost`, `shap`, `joblib`
- **Backend & API**: `fastapi`, `uvicorn[standard]`, `pydantic>=2.0`, `pydantic-settings`
- **Database & ORM**: `sqlalchemy>=2.0`, `alembic`, `psycopg2-binary`, `asyncpg`
- **Security & Auth**: `python-jose[cryptography]`, `passlib[bcrypt]`, `bcrypt==4.0.1`, `python-multipart`
- **Testing**: `pytest`, `pytest-asyncio`, `httpx`

---

## 4. Frontend Tooling & Libraries

- **Framework**: Next.js (App Router, React 18/19, TypeScript)
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **UI & Icons**: Lucide React (`lucide-react`), Class Variance Authority (`cva`), `clsx`, `tailwind-merge`
- **Visualizations**: Recharts (for risk gauges, SHAP attribution bar charts, score trend graphs)
- **Testing**: Vitest, React Testing Library, Playwright (end-to-end user flows)

---

## 5. PostgreSQL Database Setup

### Recommended: Quick Local Database via Docker
Run the following command to start a dedicated local PostgreSQL 16 container:
```bash
docker run --name eduguard-postgres -e POSTGRES_USER=eduguard -e POSTGRES_PASSWORD=eduguard_secret -e POSTGRES_DB=eduguard_db -p 5432:5432 -d postgres:16-alpine
```

To stop or resume:
```bash
docker stop eduguard-postgres
docker start eduguard-postgres
```

---

## 6. Environment Variables Reference

### Backend (`backend/.env`)
```env
# Application
ENVIRONMENT=development
PROJECT_NAME="EduGuard API"
API_V1_PREFIX=/api

# Database
DATABASE_URL=postgresql://eduguard:eduguard_secret@localhost:5432/eduguard_db

# Security & JWT
SECRET_KEY=change_this_to_a_secure_random_hex_key_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# ML Artifacts
MODEL_PATH=../ml/artifacts/model_v1.joblib
METADATA_PATH=../ml/artifacts/model_metadata.json
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 7. Third-Party Accounts for Deployment (Phase 5)

No paid accounts are required. Free tiers are fully sufficient:
1. **GitHub**: Source code repository & GitHub Actions runners (CI workflow).
2. **Vercel**: Next.js serverless deployment (Free Hobby tier).
3. **Render or Railway**: Dockerized FastAPI hosting + managed PostgreSQL instance (Free tier).

---

## 8. Verification Checklist for the User

Please verify the following on your terminal before we proceed past Phase 0:

- [ ] Python 3.11 or 3.12 is installed (`python --version` or `py -3.12 --version`)
- [ ] Node.js (v20+ LTS) is installed (`node --version`)
- [ ] Docker is installed and running (`docker info` or `docker --version`)
- [ ] Git is installed (`git --version`)
