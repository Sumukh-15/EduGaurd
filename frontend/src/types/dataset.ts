/**
 * Dataset batch upload and ingestion types for EduGuard.
 * Strictly mirrors the backend schemas in backend/app/schemas/dataset.py.
 */

export interface RiskSummary {
  low: number;
  medium: number;
  high: number;
  [key: string]: number;
}

export interface DatasetUploadResponse {
  filename: string;
  total_rows: number;
  records_created: number;
  students_created: number;
  predictions_created?: number;
  risk_summary?: RiskSummary | null;
  message: string;
  status: string;
}
