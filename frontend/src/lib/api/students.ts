import { api } from "./client";
import {
  AcademicUpdateResponse,
  FacultyAcademicUpdatePayload,
  PredictRequest,
  PredictResponse,
  StudentDetail,
  StudentHistoryResponse,
  StudentSelfReportUpdatePayload,
} from "@/types/student";

/**
 * Retrieves the institutional student profile for a given student ID.
 * Strictly adheres to student ownership boundary enforced by the backend.
 *
 * @param id Database student ID
 * @returns StudentDetail object
 */
export async function getStudentProfile(id: number): Promise<StudentDetail> {
  return api.get<StudentDetail>(`/api/students/${id}`);
}

/**
 * Retrieves chronological academic records and prediction trajectory for a student.
 *
 * @param id Database student ID
 * @param order Chronological sort direction ("desc" newest first, "asc" oldest first)
 * @returns StudentHistoryResponse containing academic records and prediction history
 */
export async function getStudentHistory(
  id: number,
  order: "asc" | "desc" = "desc"
): Promise<StudentHistoryResponse> {
  return api.get<StudentHistoryResponse>(`/api/students/${id}/history?order=${order}`);
}

/**
 * Generates an academic risk evaluation using the Phase 1 serialized Logistic Regression pipeline
 * and LinearSHAP explainer.
 *
 * Evaluates the student's latest persisted academic telemetry record.
 *
 * @param payload Object containing student_id and optional academic_record_id
 * @returns PredictResponse containing dual metrics, SHAP decomposition, and non-causal disclaimer
 */
export async function predictStudentRisk(
  payload: PredictRequest
): Promise<PredictResponse> {
  return api.post<PredictResponse>("/api/predict", payload);
}

/**
 * Student self-reported study habits update.
 * Allows student to update weekly study time and study habits without altering verified faculty marks.
 */
export async function updateStudentSelfReported(
  id: number,
  payload: StudentSelfReportUpdatePayload
): Promise<AcademicUpdateResponse> {
  return api.post<AcademicUpdateResponse>(`/api/students/${id}/self-reported`, payload);
}

/**
 * Faculty verified academic update.
 * Allows faculty/admin to record new verified assessment marks, attendance, and assessment details.
 */
export async function submitFacultyAcademicUpdate(
  id: number,
  payload: FacultyAcademicUpdatePayload
): Promise<AcademicUpdateResponse> {
  return api.post<AcademicUpdateResponse>(`/api/students/${id}/faculty-update`, payload);
}

