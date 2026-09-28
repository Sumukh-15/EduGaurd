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

export default function FacultyDatasetUploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // CSV preview state
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null);

  // Upload execution state
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
      const result = await uploadDatasetCsv(selectedFile);
      setUploadResult(result);
    } catch (err: unknown) {
      setUploadError(extractErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["faculty", "admin"]}>
      <div className="max-w-5xl mx-auto space-y-7">
        {/* Header Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-700/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold mb-2.5 backdrop-blur-sm">
                <UploadCloud className="w-4 h-4" />
                <span>Dataset Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Batch Telemetry Ingestion
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/90 mt-1.5 max-w-2xl leading-relaxed">
                Upload institutional student performance CSV datasets to batch-record telemetry in PostgreSQL. Streamed pre-validation guarantees data integrity with atomic rollback.
              </p>
            </div>

            <div className="p-3 bg-white/10 rounded-xl text-left sm:text-right backdrop-blur-sm border border-white/10 self-start sm:self-auto flex-shrink-0">
              <p className="text-[11px] text-indigo-200 uppercase tracking-wider font-semibold">
                Target Endpoint
              </p>
              <p className="text-sm font-bold text-white capitalize mt-0.5 font-mono">
                /api/dataset/upload
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Architectural Notice: NO PREDICTION GENERATION */}
        <div
          role="note"
          aria-label="Upload scope and prediction boundary"
          className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 text-xs flex items-start gap-3 leading-relaxed"
        >
          <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold mb-0.5">
              Important Scope Notice: Ingestion Only
            </strong>
            <span>
              Uploading a dataset ingests student and academic telemetry records into the database. <strong>It does not automatically generate risk predictions.</strong> Machine learning evaluations remain a separate, on-demand workflow performed via Direct Student Review.
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
            className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
          >
            <div>
              <h2 id="upload-section-heading" className="text-base font-bold text-slate-900 dark:text-white">
                Select CSV Telemetry File
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Drag and drop your formatted student telemetry CSV file below, or click to browse.
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
                    ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40"
                    : selectedFile
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="dataset-file-input"
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
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                      : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
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
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatBytes(selectedFile.size)} • Ready for validation
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Drop your telemetry CSV here, or{" "}
                        <span className="text-indigo-600 dark:text-indigo-400 underline">
                          browse files
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
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
                  className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Invalid File Selection</strong>
                    <span>{clientError}</span>
                  </div>
                </div>
              )}

              {/* G3 Warning Alert (Anti-Leakage Detection) */}
              {csvPreview?.hasG3 && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3 leading-relaxed"
                >
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold text-rose-800 dark:text-rose-300 mb-0.5">
                      Target Label &apos;G3&apos; Detected in Headers!
                    </strong>
                    <span>
                      The selected file contains the final grade column <strong>G3</strong>. The backend strictly prohibits G3 to avoid data leakage and will reject this file with an <strong>HTTP 422 Data Leakage</strong> error. Please remove the G3 column before uploading.
                    </span>
                  </div>
                </div>
              )}

              {/* Pre-Upload Review Details & Preview */}
              {selectedFile && !clientError && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Pre-Upload File Summary
                    </h3>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      disabled={isUploading}
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 inline-flex items-center gap-1 focus:outline-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove File</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 block">Filename</span>
                      <p className="font-bold text-slate-900 dark:text-white truncate mt-0.5">
                        {selectedFile.name}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 block">File Size</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 block">Detected Columns</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                        {csvPreview ? `${csvPreview.headers.length} headers` : "Parsing..."}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 block">Inference Action</span>
                      <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        Ingestion Only (No ML)
                      </p>
                    </div>
                  </div>

                  {/* Lightweight CSV Table Preview */}
                  {csvPreview && csvPreview.headers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Preview (First {csvPreview.totalPreviewRows} data rows):</span>
                        <span className="font-mono text-[11px]">
                          {csvPreview.headers.length} columns detected
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-48">
                        <table className="w-full text-left text-xs font-mono" role="table">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0">
                            <tr>
                              {csvPreview.headers.map((h, i) => (
                                <th
                                  key={i}
                                  className={`py-2 px-2.5 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 ${
                                    h.toUpperCase() === "G3" ? "bg-rose-100 text-rose-800" : ""
                                  }`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {csvPreview.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                {csvPreview.headers.map((_, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="py-1.5 px-2.5 whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60"
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
                  className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-2"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Backend Ingestion Rejected</strong>
                      <p className="mt-0.5 font-medium leading-relaxed">{uploadError}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-rose-200/80 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-400">
                    <strong>Transaction Rollback:</strong> In accordance with PostgreSQL atomic transactions, zero academic records or student entities were persisted.
                  </div>
                </div>
              )}

              {/* Upload Submit Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  {selectedFile
                    ? `Ready to upload ${selectedFile.name} (${formatBytes(selectedFile.size)})`
                    : "No file currently selected"}
                </span>

                <button
                  type="submit"
                  disabled={!selectedFile || isUploading || !!clientError}
                  className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading &amp; Ingesting Dataset...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload &amp; Ingest Telemetry</span>
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
