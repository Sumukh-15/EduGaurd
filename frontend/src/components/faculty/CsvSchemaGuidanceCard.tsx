"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Info,
  ShieldAlert,
} from "lucide-react";

export default function CsvSchemaGuidanceCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  const sampleCsvHeader =
    "school,sex,age,address,famsize,Pstatus,Medu,Fedu,Mjob,Fjob,reason,guardian,traveltime,studytime,failures,schoolsup,famsup,paid,activities,nursery,higher,internet,romantic,famrel,freetime,goout,Dalc,Walc,health,absences,G1,G2,student_code,term";

  const sampleCsvRow =
    "GP,F,17,U,GT3,T,3,2,other,other,course,mother,1,2,0,no,yes,no,yes,yes,yes,yes,no,4,3,2,1,1,5,4,13.0,14.0,STU-TEMPLATE-01,Term 1";

  const handleDownloadTemplate = () => {
    const csvContent = `${sampleCsvHeader}\n${sampleCsvRow}\n`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "eduguard_telemetry_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-labelledby="csv-requirements-heading"
      className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 id="csv-requirements-heading" className="text-base font-bold text-slate-900 dark:text-white">
              CSV Schema &amp; Ingestion Requirements
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Files are validated strictly against the Phase 1 machine learning telemetry schema.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-all inline-flex items-center gap-1.5 self-start sm:self-auto border border-indigo-200 dark:border-indigo-800"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {/* Critical Rules Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Anti-Leakage G3 rule */}
        <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300 mb-1">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>G3 Strictly Forbidden</span>
          </div>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400 leading-relaxed">
            Target label <strong>G3</strong> (final grade) must not be included. Files containing G3 will be rejected with HTTP 422 to prevent model data leakage.
          </p>
        </div>

        {/* Max Size & Delimiters */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Format &amp; Sizing</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Maximum file size: <strong>10 MB</strong>. Comma (<code>,</code>) or semicolon (<code>;</code>) delimiters supported. Encoding: UTF-8, UTF-8-SIG, or Latin-1.
          </p>
        </div>

        {/* Duplicate Invariant */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Duplicate Prevention</span>
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400 leading-relaxed">
            Duplicate <code>(student_code, term)</code> pairs within the same upload are rejected. Batches are committed in an atomic database transaction.
          </p>
        </div>
      </div>

      {/* Expandable Feature List */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 focus:outline-none"
        >
          <span>{isExpanded ? "Hide Detailed Feature Schema" : "Show All 32 Required Telemetry Columns"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isExpanded && (
          <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                32 Required Machine Learning Features:
              </span>
              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                school, sex, age, address, famsize, Pstatus, Medu, Fedu, Mjob, Fjob, reason, guardian, traveltime, studytime, failures, schoolsup, famsup, paid, activities, nursery, higher, internet, romantic, famrel, freetime, goout, Dalc, Walc, health, absences, G1, G2
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Optional Metadata Headers:
              </span>
              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                student_code (string, auto-generated if omitted), term (e.g. &apos;Term 1&apos;, defaults to &apos;Term 1&apos;)
              </p>
            </div>

            <p className="text-[11px] text-slate-400">
              Note: Any unrecognized or misspelled columns will cause the server to reject the entire file with an HTTP 422 schema error.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
