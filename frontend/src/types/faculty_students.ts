/**
 * Types for faculty cohort student browsing and risk triage directory.
 * Strictly mirrors backend schemas in backend/app/schemas/faculty_students.py.
 */

export interface FacultyStudentItem {
  id: number;
  student_code: string;
  school: string | null;
  latest_risk_level: "Low" | "Medium" | "High" | null;
  latest_risk_probability: number | null;
  latest_prediction_date: string | null;
  top_factor_label: string | null;
  evaluated: boolean;
}

export interface FacultyStudentsListResponse {
  total: number;
  page: number;
  page_size: number;
  items: FacultyStudentItem[];
}

export interface FacultyStudentFilterParams {
  risk_level?: "Low" | "Medium" | "High";
  at_risk?: boolean;
  school?: string;
  search?: string;
  evaluated?: boolean;
  sort?: "risk_desc" | "risk_asc" | "student_code";
  page?: number;
  page_size?: number;
}
