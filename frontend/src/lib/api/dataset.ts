import { api } from "./client";
import { DatasetUploadResponse } from "@/types/dataset";

/**
 * Uploads a standardized academic telemetry CSV dataset to the FastAPI backend.
 * Uses multipart/form-data with field name 'file'.
 *
 * @param file The original CSV File selected by the user
 * @param runPredictions Optional flag to trigger ML inference and SHAP explainability
 * @returns DatasetUploadResponse containing row counts and persistence metrics
 */
export async function uploadDatasetCsv(
  file: File,
  runPredictions: boolean = false
): Promise<DatasetUploadResponse> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const endpoint = runPredictions
    ? "/api/dataset/upload?run_predictions=true"
    : "/api/dataset/upload";

  return api.post<DatasetUploadResponse>(endpoint, formData);
}
