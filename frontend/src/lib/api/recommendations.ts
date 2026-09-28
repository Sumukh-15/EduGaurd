import { api } from "./client";
import { StudentRecommendationsResponse } from "@/types/recommendation";

/**
 * Retrieves deterministic, rule-based recommendations for an authorized student.
 * Uses Phase 2 locked endpoint: GET /api/recommendations/{student_id}
 *
 * @param studentId The database ID of the student
 * @returns StudentRecommendationsResponse payload containing recommendations and non-causal advisory notice
 */
export async function getStudentRecommendations(
  studentId: number
): Promise<StudentRecommendationsResponse> {
  return api.get<StudentRecommendationsResponse>(`/api/recommendations/${studentId}`);
}
