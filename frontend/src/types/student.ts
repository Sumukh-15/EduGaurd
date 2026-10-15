/**
 * Student and academic telemetry types for EduGuard.
 * Strictly mirrors the backend schemas in backend/app/schemas/.
 */

export interface StudentDetail {
  id: number;
  student_code: string;
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  cohort_year: number | null;
  school: string | null;
  created_at: string;
  updated_at: string;
  email: string | null;
  full_name: string | null;
}

export interface PredictionHistoryItem {
  id: number;
  student_id: number;
  academic_record_id: number | null;
  risk_probability: number;
  risk_level: "Low" | "Medium" | "High";
  at_risk_binary: number;
  model_version: string;
  created_at: string;
  top_factors?: FactorContribution[];
}

export interface AcademicRecordHistoryItem {
  id: number;
  student_id: number;
  recorded_at: string;
  term: string;
  data_source?: "faculty_verified" | "self_reported" | string | null;
  subject?: string | null;
  assessment_name?: string | null;
  current_semester?: number;
  G1: number | null;
  G2: number | null;
  absences: number;
  studytime: number;
  failures: number;
  schoolsup: boolean | string;
  famsup: boolean | string;
  paid: boolean | string;
  activities: boolean | string;
  higher: boolean | string;
  internet: boolean | string;
  freetime: number;
  goout: number;
  Dalc: number;
  Walc: number;
  health: number;
  medu?: number;
  fedu?: number;
  traveltime?: number;
  predictions: PredictionHistoryItem[];
}

export interface StudentHistoryResponse {
  student_id: number;
  student_code: string;
  first_name: string | null;
  last_name: string | null;
  cohort_year: number | null;
  school: string | null;
  total_records: number;
  total_predictions: number;
  academic_records: AcademicRecordHistoryItem[];
  predictions: PredictionHistoryItem[];
  latest_prediction: PredictionHistoryItem | null;
}

export interface FactorContribution {
  feature: string;
  display_name: string;
  contribution: number;
  abs_contribution: number;
  direction: "increases_risk" | "decreases_risk";
  raw_value: string | number | null;
  interpretation: string;
}

export interface PredictRequest {
  student_id: number;
  academic_record_id?: number | null;
}

export interface PredictResponse {
  prediction_id: number;
  student_id: number;
  academic_record_id: number | null;
  risk_level: "Low" | "Medium" | "High";
  risk_probability: number;
  at_risk_binary: number;
  model_version: string;
  created_at: string;
  base_log_odds: number;
  top_factors: FactorContribution[];
  causal_disclaimer: string;
}

export interface StudentSelfReportUpdatePayload {
  studytime: number;
  freetime?: number;
  schoolsup?: "yes" | "no";
  famsup?: "yes" | "no";
  paid?: "yes" | "no";
  activities?: "yes" | "no";
  recalculate_risk?: boolean;
}

export interface FacultyAcademicUpdatePayload {
  subject: string;
  assessment_name: string;
  marks: number;
  max_marks: number;
  absences: number;
  term?: string;
  recalculate_risk?: boolean;
}

export interface AcademicUpdateResponse {
  student_id: number;
  academic_record: AcademicRecordHistoryItem;
  prediction?: PredictResponse | null;
  message: string;
}

