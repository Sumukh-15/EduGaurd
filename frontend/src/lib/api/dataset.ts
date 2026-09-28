import { api } from "./client";
import { DatasetUploadResponse } from "@/types/dataset";

/**
 * Uploads a standardized academic telemetry CSV dataset to the FastAPI backend.
 * Uses multipart/form-data with field name 'file'.
 *
 * NOTE: CSV upload performs atomic schema validation, entity provisioning,
 * and academic record persistence. It does NOT generate risk predictions.
 *
 * @param file The original CSV File selected by the user
 * @returns DatasetUploadResponse containing row counts and persistence metrics
 */
export async function uploadDatasetCsv(file: File): Promise<DatasetUploadResponse> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  return api.post<DatasetUploadResponse>("/api/dataset/upload", formData);
}
