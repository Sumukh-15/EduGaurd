"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  Shield,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";
import CsvSchemaGuidanceCard from "@/components/faculty/CsvSchemaGuidanceCard";
import DatasetUploadResultCard from "@/components/faculty/DatasetUploadResultCard";
import { ApiClientError } from "@/lib/api/client";
import { uploadDatasetCsv } from "@/lib/api/dataset";
import { DatasetUploadResponse } from "@/types/dataset";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface CsvPreviewData {
  headers: string[];
  rows: string[][];
  hasG3: boolean;
  totalPreviewRows: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    return err.detail;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred during dataset upload.";
}

export default function AdminDatasetUploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // CSV preview state
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null);

  // Upload execution state
  const [runPredictions, setRunPredictions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<DatasetUploadResponse | null>(null);

  // Validate and read file preview
  const processSelectedFile = useCallback((file: File) => {
    setClientError(null);
    setUploadError(null);
    setUploadResult(null);
    setCsvPreview(null);

    // 1. Extension check
    const isCsvExtension = file.name.toLowerCase().endsWith(".csv");
    if (!isCsvExtension) {
      setClientError("Invalid file type. Only standard .csv files are supported.");
      setSelectedFile(null);
      return;
    }

    // 2. File size check (max 10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setClientError(
        `File size (${formatBytes(file.size)}) exceeds the maximum permitted limit of 10 MB.`
      );
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setClientError("The selected CSV file is empty (0 bytes).");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    // 3. Client-side lightweight preview (first 5 lines)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length > 0) {
        // Detect delimiter (semicolon vs comma)
        const firstLine = lines[0];
        const delimiter =
          firstLine.includes(";") &&
          firstLine.split(";").length >= firstLine.split(",").length
            ? ";"
            : ",";

        const headers = firstLine.split(delimiter).map((h) => h.trim());
        const hasG3 = headers.some((h) => h.toUpperCase() === "G3");

        const previewRows = lines
          .slice(1, 4)
          .map((row) => row.split(delimiter).map((c) => c.trim()));

        setCsvPreview({
          headers,
          rows: previewRows,
          hasG3,
          totalPreviewRows: previewRows.length,
        });
      }
    };

    // Read only the first 64KB for preview to avoid memory spikes
    const slice = file.slice(0, 65536);
    reader.readAsText(slice);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setClientError(null);
    setCsvPreview(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleResetUpload = () => {
    handleRemoveFile();
    setUploadResult(null);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setClientError("Please select a valid CSV file before uploading.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setClientError("File size exceeds the 10 MB limit.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      setClientError(null);

      // Submit original file via multipart/form-data to POST /api/dataset/upload
      const result = await uploadDatasetCsv(selectedFile, runPredictions);
      setUploadResult(result);
    } catch (err: unknown) {
      setUploadError(extractErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="max-w-5xl mx-auto space-y-7 page-enter">
        {/* Header Banner - Dark Ink Editorial Hero */}
        <div className="p-6 sm:p-8 rounded-2xl bg-ink text-paper shadow-sm border border-ink/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint/15 text-mint border border-mint/20 text-xs font-medium mb-2.5 backdrop-blur-sm">
                <UploadCloud className="w-4 h-4" />
                <span>Administrative dataset ingestion</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-white">
                Batch Telemetry Ingestion
              </h1>
              <p className="text-xs sm:text-sm text-paper/80 mt-1.5 max-w-2xl leading-relaxed">
                Upload institutional student performance CSV datasets to batch-record telemetry in PostgreSQL. Streamed pre-validation guarantees data integrity with immutable audit trail.
              </p>
            </div>

            <div className="p-3 bg-white/10 rounded-xl text-left sm:text-right backdrop-blur-sm border border-white/10 self-start sm:self-auto flex-shrink-0">
              <p className="text-xs text-paper/70 font-medium font-mono">
                Target endpoint
              </p>
              <p className="text-sm font-semibold text-white capitalize mt-0.5 font-mono">
                /api/dataset/upload
              </p>
            </div>
          </div>
        </div>

        {/* Scope Notice Banner */}
        <div
          role="note"
          aria-label="Upload scope and prediction boundary"
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 leading-relaxed transition-all shadow-sm ${
            runPredictions
              ? "bg-softgreen border-edugreen/30 text-ink"
              : "bg-paper border-ink/10 text-ink/80"
          }`}
        >
          <Shield
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              runPredictions
                ? "text-edugreen"
                : "text-ink/60"
            }`}
          />
          <div>
            <strong className="block font-semibold mb-0.5 text-ink">
              {runPredictions
                ? "Admin Opt-In Active: Batch Risk Inference & SHAP Enabled"
                : "Scope Notice: Administrative Ingestion (Predictions Optional)"}
            </strong>
            <span>
              {runPredictions
                ? "Risk predictions and SHAP factor explanations will be generated and persisted for all newly ingested records in the same atomic database transaction with security audit logging."
                : "Uploading a dataset ingests student and academic telemetry records into PostgreSQL. You can check 'Run risk predictions after upload' below to automatically evaluate risk and generate SHAP explanations during ingestion."}
            </span>
          </div>
        </div>

        {/* Success View */}
        {uploadResult && (
          <DatasetUploadResultCard
            result={uploadResult}
            onReset={handleResetUpload}
          />
        )}

        {/* Upload Form (Shown when no successful result yet) */}
        {!uploadResult && (
          <section
            aria-labelledby="upload-section-heading"
            className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm space-y-6"
          >
            <div>
              <h2 id="upload-section-heading" className="font-display text-lg text-ink">
                Select CSV Telemetry File
              </h2>
              <p className="text-xs text-ink/60 mt-0.5">
                Drag and drop your institutional student performance CSV file below, or click to browse.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                  isDragOver
                    ? "border-edugreen bg-softgreen/40"
                    : selectedFile
                    ? "border-edugreen/40 bg-softgreen/20"
                    : "border-ink/15 hover:border-edugreen bg-paper/60"
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="admin-dataset-file-input"
                  name="datasetFile"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-label="Select CSV dataset file"
                />

                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform ${
                    selectedFile
                      ? "bg-softgreen text-edugreen"
                      : "bg-paper text-ink/60"
                  }`}
                >
                  {selectedFile ? (
                    <FileSpreadsheet className="w-7 h-7" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>

                <div>
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-ink/60 mt-0.5 tabular-nums">
                        {formatBytes(selectedFile.size)} • Ready for validation
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Drop your telemetry CSV here, or{" "}
                        <span className="text-edugreen underline font-semibold">
                          browse files
                        </span>
                      </p>
                      <p className="text-xs text-ink/40 mt-1">
                        Only standard .csv files up to 10 MB are accepted
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Validation Error */}
              {clientError && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-coral/10 border border-coral/30 text-xs text-ink flex items-start gap-3 shadow-sm"
                >
                  <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold text-coral">Invalid File Selection</strong>
                    <span className="text-ink/80">{clientError}</span>
                  </div>
                </div>
              )}

              {/* G3 Warning Alert (Anti-Leakage Detection) */}
              {csvPreview?.hasG3 && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-coral/10 border border-coral/30 text-xs text-ink flex items-start gap-3 leading-relaxed shadow-sm"
                >
                  <AlertTriangle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold text-coral mb-0.5">
                      Target Label &apos;G3&apos; Detected in Headers!
                    </strong>
                    <span className="text-ink/80">
                      The selected file contains the final grade column <strong>G3</strong>. The backend strictly prohibits G3 to avoid data leakage and will reject this file with an <strong>HTTP 422 Data Leakage</strong> error. Please remove the G3 column before uploading.
                    </span>
                  </div>
                </div>
              )}

              {/* Pre-Upload Review Details & Preview */}
              {selectedFile && !clientError && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                    <h3 className="text-xs font-medium text-ink-muted">
                      Pre-upload file summary
                    </h3>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      disabled={isUploading}
                      className="btn-interactive text-xs text-coral hover:text-coral/80 inline-flex items-center gap-1 font-semibold focus:outline-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove file</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-paper border border-ink/10">
                      <span className="text-xs font-medium text-ink-muted block">Filename</span>
                      <p className="font-semibold text-ink truncate mt-0.5">
                        {selectedFile.name}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-paper border border-ink/10">
                      <span className="text-xs font-medium text-ink-muted block">File size</span>
                      <p className="font-bold font-sans tabular-nums text-ink mt-0.5">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-paper border border-ink/10">
                      <span className="text-xs font-medium text-ink-muted block">Detected columns</span>
                      <p className="font-bold font-sans tabular-nums text-ink mt-0.5">
                        {csvPreview ? `${csvPreview.headers.length} headers` : "Parsing..."}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-paper border border-ink/10">
                      <span className="text-xs font-medium text-ink-muted block">Inference action</span>
                      <p className={`font-semibold mt-0.5 ${runPredictions ? "text-edugreen" : "text-ink/70"}`}>
                        {runPredictions ? "Ingest + Run predictions (SHAP)" : "Ingestion only (no ML)"}
                      </p>
                    </div>
                  </div>

                  {/* Lightweight CSV Table Preview */}
                  {csvPreview && csvPreview.headers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-ink/60">
                        <span>Preview (first {csvPreview.totalPreviewRows} data rows):</span>
                        <span className="font-mono text-xs tabular-nums text-ink-muted">
                          {csvPreview.headers.length} columns detected
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-ink/10 max-h-48">
                        <table className="w-full text-left text-xs font-mono" role="table">
                          <thead className="bg-paper text-xs font-medium text-ink-muted sticky top-0 border-b border-ink/10">
                            <tr>
                              {csvPreview.headers.map((h, i) => (
                                <th
                                  key={i}
                                  className={`py-2 px-2.5 whitespace-nowrap border-r border-ink/10 ${
                                    h.toUpperCase() === "G3" ? "bg-coral/20 text-coral font-bold" : ""
                                  }`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-ink/10 text-ink/80">
                            {csvPreview.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="table-row-hover">
                                {csvPreview.headers.map((_, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="py-1.5 px-2.5 whitespace-nowrap border-r border-ink/10 tabular-nums"
                                  >
                                    {row[cIdx] || ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Backend Upload Error Alert */}
              {uploadError && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-coral/10 border border-coral/30 text-xs text-ink space-y-2 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold text-coral">Backend Ingestion Rejected</strong>
                      <p className="mt-0.5 font-medium leading-relaxed text-ink/80">{uploadError}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-coral/20 text-xs text-coral">
                    <strong>Transaction Rollback:</strong> In accordance with PostgreSQL atomic transactions, zero academic records or student entities were persisted.
                  </div>
                </div>
              )}

              {/* Opt-in Prediction Evaluation Checkbox */}
              <div className="p-4 rounded-xl bg-paper border border-ink/10 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="admin-run-predictions-checkbox"
                  name="runPredictions"
                  checked={runPredictions}
                  onChange={(e) => setRunPredictions(e.target.checked)}
                  disabled={isUploading}
                  className="mt-0.5 h-4 w-4 rounded border-ink/20 text-edugreen focus:ring-edugreen cursor-pointer accent-edugreen"
                />
                <label htmlFor="admin-run-predictions-checkbox" className="text-xs cursor-pointer select-none space-y-0.5">
                  <span className="font-semibold text-ink block">
                    Run risk predictions after upload
                  </span>
                  <span className="text-ink/60 block text-xs leading-relaxed">
                    Automatically executes the machine learning model and computes SHAP factor attributions for all uploaded records in the same atomic database transaction.
                  </span>
                </label>
              </div>

              {/* Upload Submit Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-ink-muted">
                  {selectedFile
                    ? `Ready to upload ${selectedFile.name} (${formatBytes(selectedFile.size)})`
                    : "No file currently selected"}
                </span>

                <button
                  type="submit"
                  disabled={!selectedFile || isUploading || !!clientError}
                  className="btn-interactive w-full sm:w-auto py-2.5 px-6 rounded-xl text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen bg-edugreen hover:bg-edugreen-dark active:scale-[0.99]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{runPredictions ? "Uploading & Predicting..." : "Uploading & Ingesting Dataset..."}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>{runPredictions ? "Upload & Run Risk Predictions" : "Upload & Ingest Telemetry"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* CSV Schema & Feature Reference Guidance */}
        <CsvSchemaGuidanceCard />
      </div>
    </RoleGuard>
  );
}
