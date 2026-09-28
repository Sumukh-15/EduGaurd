/**
 * Types for EduGuard deterministic rule-based recommendations.
 * Strictly mirrors backend schemas in backend/app/schemas/recommendation.py.
 */

export type RecommendationCategory =
  | "Academic Progress"
  | "Academic Remediation"
  | "Attendance"
  | "Study Strategy"
  | string;

export type RecommendationPriority = "high" | "medium" | "low" | string;

export interface RecommendationRead {
  id: number;
  student_id: number;
  prediction_id: number | null;
  is_acknowledged: boolean;
  created_at: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  trigger_condition: string | null;
}

export interface StudentRecommendationsResponse {
  student_id: number;
  student_code: string;
  prediction_id: number | null;
  academic_record_id: number | null;
  risk_level: string | null;
  risk_probability: number | null;
  total_recommendations: number;
  recommendations: RecommendationRead[];
  advisory_notice: string;
}
