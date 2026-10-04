/**
 * Faculty analytics and population monitoring types for EduGuard.
 * Strictly mirrors backend schemas in backend/app/schemas/analytics.py.
 */

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
}

export interface RiskPercentages {
  low: number;
  medium: number;
  high: number;
}

export interface SchoolDistribution {
  school: string;
  student_count: number;
  evaluated_count: number;
  at_risk_count: number;
}

export interface ClassAverages {
  avg_g1: number;
  avg_g2: number;
  avg_grade_velocity: number;
  avg_absences: number;
  chronic_absenteeism_pct: number;
  failures_pct: number;
  total_students_with_records: number;
}

export interface RiskTrendPoint {
  date: string;
  low: number;
  medium: number;
  high: number;
  total_evaluated: number;
}

export interface WorseningStudentItem {
  student_id: number;
  student_code: string;
  previous_risk_probability: number;
  latest_risk_probability: number;
  risk_delta: number;
  previous_risk_level: string;
  latest_risk_level: string;
}

export interface FacultyAnalyticsResponse {
  total_students: number;
  evaluated_students: number;
  unevaluated_students: number;
  total_predictions: number;
  at_risk_count: number;
  at_risk_percentage: number;
  average_risk_probability: number;
  risk_distribution: RiskDistribution;
  risk_percentages: RiskPercentages;
  school_distribution: SchoolDistribution[];
  class_averages: ClassAverages;
  risk_trend: RiskTrendPoint[];
  students_worsening_count: number;
  students_worsening: WorseningStudentItem[];
  model_version: string;
  generated_at: string;
}

export interface FacultyAnalyticsTrendsResponse {
  bucket: string;
  risk_trend: RiskTrendPoint[];
  class_averages: ClassAverages;
  students_worsening_count: number;
  students_worsening: WorseningStudentItem[];
  generated_at: string;
}
