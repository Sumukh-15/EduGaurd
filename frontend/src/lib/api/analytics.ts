import { api } from "./client";
import { FacultyAnalyticsResponse } from "@/types/analytics";

/**
 * Retrieves aggregate, non-identifying cohort analytics for institutional faculty and administrators.
 * Returns macro-level population counts, risk triage distributions, and school breakdowns.
 *
 * @returns FacultyAnalyticsResponse
 */
export async function getFacultyAnalytics(): Promise<FacultyAnalyticsResponse> {
  return api.get<FacultyAnalyticsResponse>("/api/faculty/analytics");
}
