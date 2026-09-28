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
  model_version: string;
  generated_at: string;
}
