import { api } from "./client";
import { FacultyAnalyticsResponse, FacultyAnalyticsTrendsResponse } from "@/types/analytics";

/**
 * Retrieves aggregate, non-identifying cohort analytics for institutional faculty and administrators.
 * Returns macro-level population counts, risk triage distributions, class averages, and risk trends.
 *
 * @param bucket "day" | "week" grouping for trend computation
 * @returns FacultyAnalyticsResponse
 */
export async function getFacultyAnalytics(bucket: "day" | "week" = "day"): Promise<FacultyAnalyticsResponse> {
  return api.get<FacultyAnalyticsResponse>(`/api/faculty/analytics?bucket=${bucket}`);
}

/**
 * Retrieves cohort risk trends, class averages, and deteriorating student tracking.
 *
 * @param bucket "day" | "week" grouping for trend computation
 * @returns FacultyAnalyticsTrendsResponse
 */
export async function getFacultyAnalyticsTrends(bucket: "day" | "week" = "day"): Promise<FacultyAnalyticsTrendsResponse> {
  return api.get<FacultyAnalyticsTrendsResponse>(`/api/faculty/analytics/trends?bucket=${bucket}`);
}
