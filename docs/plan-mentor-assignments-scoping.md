# Implementation Plan: Mentor-Student Assignments & Faculty Scoping

**Task Name**: `mentor-assignments-scoping`  
**Target File**: `docs/plan-mentor-assignments-scoping.md`  

---

## 1. Goal & Context

According to the PRD Faculty Journey:
- Faculty users should **only view and triage students assigned to them**.
- Prior to this task, no mentor-student relation existed; faculty had unrestricted global access across all students.
- We will implement:
  1. A new `MentorAssignment` model (`mentor_assignments` table) with Alembic migration.
  2. Scoping rules ensuring faculty see **only** assigned students in:
     - `GET /api/faculty/students` (directory)
     - `GET /api/faculty/analytics` (cohort analytics)
     - `GET/PUT /api/students/{id}*` (profile, telemetry, history)
     - `POST /api/predict` (inference)
     - `GET /api/recommendations/{id}` (recommendations)
     - `POST /api/dataset/upload` (side-effect assignment: automatic or via `mentor_email` column)
  3. Strict 403 Forbidden enforcement on cross-faculty / unassigned student access in `verify_student_access`.
  4. Empty results (not all students) when a faculty user has zero assignments.
  5. Admin-only assignment management API:
     - `POST /api/admin/assignments`
     - `DELETE /api/admin/assignments/{id}`
     - `GET /api/admin/assignments?faculty_user_id=`
  6. Updated database seed script (`backend/app/db/seed.py`) with assignments for `faculty@school.edu` (STU-1001 and STU-1002 only) and an unassigned `faculty2@school.edu`.
  7. Backward-compatible fixture updates and comprehensive scoping tests across every endpoint.

---

## 2. Files to Create or Modify

### Backend Models & Migrations
1. **`backend/app/models/assignment.py`** *(New)*:
   - Define `MentorAssignment` model: `id`, `faculty_user_id` (FK `users.id`), `student_id` (FK `students.id`), `created_at`, `UniqueConstraint("faculty_user_id", "student_id")`.
2. **`backend/app/models/user.py`** *(Modified)*:
   - Add `mentor_assignments` relationship to `User`.
3. **`backend/app/models/student.py`** *(Modified)*:
   - Add `mentor_assignments` relationship to `Student`.
4. **`backend/app/models/__init__.py`** *(Modified)*:
   - Export `MentorAssignment`.
5. **`backend/alembic/versions/d4e5f6a7b8c9_mentor_assignments.py`** *(New)*:
   - Alembic migration creating `mentor_assignments` table with FK constraints, index, unique constraint, and downgrade support.

### Backend Schemas & Dependencies
6. **`backend/app/schemas/assignment.py`** *(New)*:
   - Pydantic schemas: `AssignmentCreateRequest`, `AssignmentItem`, `AssignmentListResponse`.
7. **`backend/app/schemas/__init__.py`** *(Modified)*:
   - Export new assignment schemas.
8. **`backend/app/api/deps.py`** *(Modified)*:
   - Update `verify_student_access(student_id: int, current_user: User, db: Session)`:
     - Admin: Allowed for all students.
     - Faculty: Checked against `mentor_assignments`. If unassigned -> `403 Forbidden ("Access denied. This student is not assigned to your mentorship roster.")`.
     - Student: Allowed only for own linked student ID -> `403 Forbidden` for others.

### Backend Endpoints & Scoping
9. **`backend/app/api/v1/admin.py`** *(New)*:
   - Implement `POST /api/admin/assignments` (assign multiple students to a faculty user).
   - Implement `DELETE /api/admin/assignments/{id}` (remove assignment).
   - Implement `GET /api/admin/assignments?faculty_user_id=` (filter or list all).
   - Strictly protected with `require_roles("admin")`.
10. **`backend/app/api/v1/__init__.py`** *(Modified)*:
    - Mount `admin_router` under `/api`.
11. **`backend/app/api/v1/faculty.py`** *(Modified)*:
    - `GET /api/faculty/students`: If faculty, scope query to `Student.id.in_(assigned_student_ids)`. If 0 assignments, returns `total=0, items=[]`.
    - `GET /api/faculty/analytics`: If faculty, scope metrics calculations strictly to assigned students. If 0 assignments, returns zeroed metrics (`total_students=0, evaluated_students=0, school_distribution=[]`, etc.).
12. **`backend/app/api/v1/students.py`** *(Modified)*:
    - Pass `db` to `verify_student_access` in profile GET/PUT, telemetry POST, and history GET.
13. **`backend/app/api/v1/predict.py`** *(Modified)*:
    - Pass `db` to `verify_student_access` for `payload.student_id`.
14. **`backend/app/api/v1/recommendations.py`** *(Modified)*:
    - Pass `db` to `verify_student_access` for `student_id`.
15. **`backend/app/api/v1/dataset.py`** *(Modified)*:
    - Add `mentor_email` to `OPTIONAL_METADATA_COLUMNS`.
    - If `mentor_email` is present in CSV and user exists: assign student to that user.
    - If absent: auto-assign student to the uploading faculty user (if role is faculty).
16. **`backend/app/db/seed.py`** *(Modified)*:
    - Assign `faculty@school.edu` to `STU-1001` and `STU-1002` only.
    - Seed second faculty user `faculty2@school.edu` with zero assignments.

### Backend Tests
17. **`backend/tests/test_mentor_assignments.py`** *(New)*:
    - Full test suite covering:
      - Admin assignment endpoints (POST, DELETE, GET, 401 unauth, 403 non-admin, 404 validation).
      - Scoping on `GET /api/faculty/students` (assigned vs unassigned faculty, zero assignments empty check).
      - Scoping on `GET /api/faculty/analytics` (scoped metrics vs zero assignments).
      - Scoping on `GET/PUT /api/students/{id}`, telemetry, and history (200 assigned, 403 unassigned).
      - Scoping on `POST /api/predict` (200 assigned, 403 unassigned).
      - Scoping on `GET /api/recommendations/{id}` (200 assigned, 403 unassigned).
      - Dataset upload assignments (`mentor_email` explicit assignment & faculty auto-assignment).
18. **Existing Tests Updates** *(Modified)*:
    - `backend/tests/test_students.py`: Ensure `faculty_fixture` is assigned to student A where access is expected; add unassigned 403 test for student B.
    - `backend/tests/test_predict_endpoint.py`: Ensure faculty has assignment in tests expecting 200.
    - `backend/tests/test_history_analytics.py`: Ensure faculty has assignments for history/analytics tests expecting non-zero results.
    - `backend/tests/test_recommendations.py`: Ensure faculty has assignment in tests expecting 200.
    - `backend/tests/test_faculty_students.py`: In `auth_users` / `cohort_students`, assign faculty to cohort students so directory tests continue to pass seamlessly.
    - `backend/tests/test_auth.py`: Update `test_verify_student_access_faculty_and_admin_permitted` to verify assignment checking with `db_session`.

---

## 3. Database Schema: `mentor_assignments`

```sql
CREATE TABLE mentor_assignments (
    id SERIAL PRIMARY KEY,
    faculty_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_mentor_assignments_faculty_student UNIQUE (faculty_user_id, student_id)
);

CREATE INDEX ix_mentor_assignments_id ON mentor_assignments(id);
CREATE INDEX ix_mentor_assignments_faculty_user_id ON mentor_assignments(faculty_user_id);
CREATE INDEX ix_mentor_assignments_student_id ON mentor_assignments(student_id);
```

---

## 4. Scoping & Authorization Architecture

### A. Authorization Matrix

| Endpoint | Student | Assigned Faculty | Unassigned Faculty | Admin |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/faculty/students` | `403` | `200` (Scoped) | `200` (0 items) | `200` (All items) |
| `GET /api/faculty/analytics` | `403` | `200` (Scoped) | `200` (Zeroed) | `200` (All cohort) |
| `GET /api/students/{id}` | `200` (Self) / `403` | `200` | `403` | `200` |
| `PUT /api/students/{id}` | `200` (Self) / `403` | `200` | `403` | `200` |
| `POST /api/students/{id}/telemetry` | `200` (Self) / `403` | `200` | `403` | `200` |
| `GET /api/students/{id}/history` | `200` (Self) / `403` | `200` | `403` | `200` |
| `POST /api/predict` | `200` (Self) / `403` | `200` | `403` | `200` |
| `GET /api/recommendations/{id}` | `200` (Self) / `403` | `200` | `403` | `200` |
| `POST /api/admin/assignments` | `403` | `403` | `403` | `200` |
| `DELETE /api/admin/assignments/{id}` | `403` | `403` | `403` | `200` |
| `GET /api/admin/assignments` | `403` | `403` | `403` | `200` |

### B. Dependency Signature Update

```python
def verify_student_access(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
```
- Fully compatible with FastAPI dependency injection.
- When called imperatively inside routes, `db=db` is passed.

---

## 5. Backward Compatibility Strategy for Existing Test Fixtures

1. **Keep Existing Fixture Signatures**:
   - `student_fixture_a`, `faculty_fixture`, `cohort_students`, etc. will remain structurally identical.
2. **Assign in Setup Where Faculty Access is Asserted**:
   - In tests where the test intention is "faculty accesses student profile/history/recommendation/prediction", we create a `MentorAssignment(faculty_user_id=faculty.id, student_id=student.id)`.
   - In tests where the test intention is "unassigned access", we assert `403 Forbidden`.
   - For `test_faculty_students.py`, `cohort_students` will link `faculty_user` to the students, keeping existing tests green while new tests verify the unassigned/empty state.
3. **Zero Target Leakage ($G3$) & Append-Only Invariants**:
   - Maintained across all assignment models, endpoints, and upload processes.

---

## 6. Test Plan

1. **`backend/tests/test_mentor_assignments.py`** *(New)*:
   - `test_admin_create_assignments_success`: Admin assigns students to faculty.
   - `test_admin_create_assignments_rbac_forbidden`: Student and faculty get 403.
   - `test_admin_create_assignments_validation_404`: Nonexistent faculty or student ID returns 404.
   - `test_admin_delete_assignment_success`: Admin deletes an assignment.
   - `test_admin_get_assignments_filtered`: Filter by `faculty_user_id`.
   - `test_faculty_students_scoped_to_assigned_only`: Faculty A sees only Student A; Faculty B sees only Student B.
   - `test_faculty_students_zero_assignments_returns_empty`: Faculty with 0 assignments gets `total=0, items=[]`.
   - `test_faculty_analytics_scoped_metrics`: Faculty analytics aggregates only assigned students.
   - `test_faculty_analytics_zero_assignments_zeroed`: Zero assigned students returns zero counts and empty distribution.
   - `test_verify_student_access_unassigned_faculty_403`: Cross-faculty / unassigned student access returns 403 on profile, history, prediction, and recommendations.
   - `test_dataset_upload_with_mentor_email`: Batch upload creates assignments for specified mentor email.
   - `test_dataset_upload_faculty_auto_assignment`: Batch upload by faculty without mentor email automatically assigns to that faculty.
2. **Existing Test Suite Verification**:
   - Run `pytest backend/tests/ ml/tests/` to guarantee all 178 existing tests + new tests pass 100%.

---

## 7. Next Step

**STOP**: Awaiting user approval of this plan before writing code or modifying any files.
