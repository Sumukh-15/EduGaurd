import { api } from "./client";
import {
  FacultyStudentFilterParams,
  FacultyStudentsListResponse,
} from "@/types/faculty_students";

/**
 * Fetches paginated student cohort records with risk triage evaluations and top SHAP factors.
 * Requires faculty or admin authentication role.
 *
 * @param params Query filtering, sorting, and pagination parameters
 * @returns FacultyStudentsListResponse
 */
export async function getFacultyStudents(
  params: FacultyStudentFilterParams = {}
): Promise<FacultyStudentsListResponse> {
  const searchParams = new URLSearchParams();

  if (params.risk_level) {
    searchParams.set("risk_level", params.risk_level);
  }
  if (params.at_risk !== undefined) {
    searchParams.set("at_risk", String(params.at_risk));
  }
  if (params.school) {
    searchParams.set("school", params.school);
  }
  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.evaluated !== undefined) {
    searchParams.set("evaluated", String(params.evaluated));
  }
  if (params.sort) {
    searchParams.set("sort", params.sort);
  }
  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params.page_size !== undefined) {
    searchParams.set("page_size", String(params.page_size));
  }

  const queryStr = searchParams.toString();
  const endpoint = queryStr ? `/api/faculty/students?${queryStr}` : "/api/faculty/students";

  return api.get<FacultyStudentsListResponse>(endpoint);
}
