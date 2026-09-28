/**
 * Dataset batch upload and ingestion types for EduGuard.
 * Strictly mirrors the backend schemas in backend/app/schemas/dataset.py.
 */

export interface DatasetUploadResponse {
  filename: string;
  total_rows: number;
  records_created: number;
  students_created: number;
  message: string;
  status: string;
}
