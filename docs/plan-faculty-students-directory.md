# Implementation Plan: Faculty Student Directory & Risk Triage

**Task Name**: `faculty-students-directory`  
**Target File**: `docs/plan-faculty-students-directory.md`  

---

## 1. Goal

Close the primary PRD user journey gap for institutional faculty and administrators:
- Currently, faculty can only review students by manually entering a known numeric student ID (`/dashboard/faculty/review`).
- The PRD requires a complete faculty workflow: **Analytics Dashboard → View All Students Directory → Filter High-Risk Cohort → Select Student → Detailed Predictive & Explainability Analysis**.
- We will implement:
  1. A performant, paginated, filterable backend endpoint: `GET /api/faculty/students` strictly protected with `require_roles("faculty", "admin")`.
  2. A clean, accessible frontend directory page at `/dashboard/faculty/students` with filter chips, search, sort, and pagination.
  3. A "High-Risk Students" priority preview panel on the Faculty Analytics page linking directly to the high-risk filtered directory.
  4. Integration into the `FACULTY_NAV` sidebar.

---

## 2. Files to Create or Modify

### Backend Files
1. **`backend/app/schemas/faculty_students.py`** *(New)*:
   - `FacultyStudentItem`: Schema representing a student row in the directory (`id`, `student_code`, `school`, `latest_risk_level`, `latest_risk_probability`, `latest_prediction_date`, `top_factor_label`, `evaluated`).
   - `FacultyStudentsListResponse`: Paginated wrapper (`total`, `page`, `page_size`, `items`).
2. **`backend/app/api/v1/faculty.py`** *(Modified)*:
   - Implement `GET /api/faculty/students` with subquery for latest prediction per student and scalar subquery for top SHAP factor.
   - Enforce `require_roles("faculty", "admin")`.
3. **`backend/tests/test_faculty_students.py`** *(New)*:
   - Comprehensive pytest suite testing authentication, authorization, filtering, sorting, pagination, empty states, and target leakage ($G3$).

### Frontend Files
4. **`frontend/src/types/faculty_students.ts`** *(New)*:
   - TypeScript interfaces mirroring backend schemas: `FacultyStudentItem`, `FacultyStudentsListResponse`, `FacultyStudentFilterParams`.
5. **`frontend/src/lib/api/faculty_students.ts`** *(New)*:
   - API client function `getFacultyStudents(params: FacultyStudentFilterParams): Promise<FacultyStudentsListResponse>`.
6. **`frontend/src/app/dashboard/faculty/students/page.tsx`** *(New)*:
   - Faculty student directory view with filter chips (All, High, Medium, Low, Not evaluated), search input, sorting dropdown, data table, and pagination controls. Row click routes to `/dashboard/faculty/review?id=<id>`.
7. **`frontend/src/components/layout/Sidebar.tsx`** *(Modified)*:
   - Add `{ label: "Students", href: "/dashboard/faculty/students", icon: Users, description: "Cohort roster & risk triage" }` to `FACULTY_NAV`.
8. **`frontend/src/app/dashboard/faculty/page.tsx`** *(Modified)*:
   - Add a "High-Risk Priority Students" panel showing up to 5 highest-risk evaluated students with a direct link to `/dashboard/faculty/students?risk_level=High`.
9. **`PROGRESS.md`** *(Modified)*:
   - Append completed task documentation upon acceptance.

---

## 3. API Contract

### Endpoint: `GET /api/faculty/students`
- **Security**: Bearer JWT; roles required: `["faculty", "admin"]`.
- **Query Parameters**:
  - `risk_level` (`Optional[str]`): `"Low" | "Medium" | "High"`.
  - `at_risk` (`Optional[bool]`): Filter by binary classification (`True` -> at_risk_binary=1, `False` -> at_risk_binary=0).
  - `school` (`Optional[str]`): Filter by school code (e.g. `"GP"`, `"MS"`).
  - `search` (`Optional[str]`): Case-insensitive substring search matching `student_code`.
  - `evaluated` (`Optional[bool]`): Filter by evaluation status (`True` -> has prediction, `False` -> no predictions yet).
  - `sort` (`str`, default `"risk_desc"`):
    - `"risk_desc"`: Highest probability first; unevaluated students placed last.
    - `"risk_asc"`: Lowest probability first; unevaluated students placed last.
    - `"student_code"`: Alphabetical by student code ascending.
  - `page` (`int`, default `1`, minimum `1`): 1-indexed page number.
  - `page_size` (`int`, default `20`, minimum `1`, maximum `100`): Items per page.

### Response Body (`200 OK`):
```json
{
  "total": 395,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": 1,
      "student_code": "STU-1001",
      "school": "GP",
      "latest_risk_level": "High",
      "latest_risk_probability": 0.842,
      "latest_prediction_date": "2026-09-28T12:00:00Z",
      "top_factor_label": "Period 2 Grade (Midterm 2)",
      "evaluated": true
    },
    {
      "id": 7,
      "student_code": "STU-1007",
      "school": "MS",
      "latest_risk_level": null,
      "latest_risk_probability": null,
      "latest_prediction_date": null,
      "top_factor_label": null,
      "evaluated": false
    }
  ]
}
```

### Error Responses:
- `401 Unauthorized`: Missing or invalid JWT.
- `403 Forbidden`: Authenticated student role attempting access.
- `422 Unprocessable Entity`: Validation failure on query parameters (e.g. `page < 1`, `page_size > 100`, invalid `sort` option).

---

## 4. Query Architecture & Performance (Zero N+1)

To strictly avoid N+1 queries across hundreds of student records:
1. **Latest Prediction Subquery**:
   ```sql
   SELECT student_id, MAX(id) AS max_pred_id
   FROM predictions
   GROUP BY student_id
   ```
2. **Top SHAP Factor Correlated Scalar Subquery**:
   ```sql
   SELECT display_name
   FROM explanations
   WHERE explanations.prediction_id = predictions.id
   ORDER BY ABS(contribution) DESC, id ASC
   LIMIT 1
   ```
3. **Master Join**:
   - `Student` LEFT OUTER JOIN `latest_pred_subq` ON `Student.id == latest_pred_subq.student_id`
   - LEFT OUTER JOIN `Prediction` ON `Prediction.id == latest_pred_subq.max_pred_id`
4. **Ordering Expression**:
   - Evaluated students sort first by risk probability (`CASE WHEN Prediction.id IS NOT NULL THEN 0 ELSE 1 END`, followed by `Prediction.risk_probability DESC/ASC`).
   - Unevaluated students sort cleanly at the end.
5. **Pagination**:
   - `.offset((page - 1) * page_size).limit(page_size)` applied at the database level.
   - Count query executed on the filtered join before pagination slicing.

---

## 5. Non-Negotiable Core Invariants

1. **Zero Target Leakage ($G3$)**:
   - $G3$ is strictly excluded from `FacultyStudentItem` and `FacultyStudentsListResponse`.
   - Verified via automated assertion in tests.
2. **Student Privacy**:
   - Only non-sensitive identifying data (`student_code`, `school`) and model metrics are returned.
   - Student names, emails, addresses, and demographic attributes are NOT exposed in directory lists.
3. **Read-Only / No Accidental Predictions**:
   - `GET /api/faculty/students` strictly performs read-only database SELECT queries.
   - No predictions or explanations are created during directory queries.

---

## 6. Test Plan (`backend/tests/test_faculty_students.py`)

1. **RBAC & Security**:
   - Unauthenticated request returns `401 Unauthorized`.
   - Student token returns `403 Forbidden`.
   - Faculty token returns `200 OK`.
   - Admin token returns `200 OK`.
2. **Filter Correctness**:
   - Filter by `risk_level="High"` returns only high-risk students.
   - Filter by `at_risk=True` returns only binary at-risk students ($p \ge 0.50$).
   - Filter by `school="GP"` returns only students from GP school.
   - Filter by `search="1001"` matches student codes containing "1001".
   - Filter by `evaluated=False` returns only students with no predictions.
3. **Sorting**:
   - `sort="risk_desc"`: Highest risk first, unevaluated last.
   - `sort="risk_asc"`: Lowest risk first, unevaluated last.
   - `sort="student_code"`: Alphabetical by code.
4. **Pagination**:
   - Page 1 and Page 2 return non-overlapping distinct slices.
   - `page_size > 100` returns `422 Unprocessable Entity`.
   - `page < 1` returns `422 Unprocessable Entity`.
5. **Anti-Leakage**:
   - Asserts `"g3"` and `"G3"` do not exist anywhere in the JSON response payload.
6. **Existing Test Suite Regression**:
   - Run full pytest suite (161+ tests) to guarantee zero regressions.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| N+1 query overhead loading top SHAP factors | Use correlated scalar subquery in SQL SELECT clause so database executes single joined query. |
| Null handling in sort (students with no predictions) | Use explicit SQL `case(...)` ordering so unevaluated students sort predictably at the bottom for risk sorting. |
| Inadvertent PII exposure in student roster | Restrict `FacultyStudentItem` schema strictly to `id`, `student_code`, `school`, and prediction evaluation attributes. |
| Breaking existing tests | Existing endpoints and tests are untouched; new endpoint is purely additive. |

---

## 8. Next Step

**STOP**: Awaiting user approval of this plan before writing code or modifying any files.
