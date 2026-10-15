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
      className="p-6 rounded-2xl bg-white border border-ink/10 shadow-xs space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-paper border border-ink/10 text-edugreen flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 id="csv-requirements-heading" className="text-base font-display text-ink">
              CSV Schema &amp; Ingestion Requirements
            </h2>
            <p className="text-xs text-ink/65">
              Files are validated strictly against the Phase 1 machine learning telemetry schema.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="py-1.5 px-3 rounded-xl bg-softgreen hover:bg-softgreen/80 text-edugreen text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5 self-start sm:self-auto border border-edugreen/30 btn-interactive"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {/* Critical Rules Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Anti-Leakage G3 rule */}
        <div className="p-3.5 rounded-xl bg-coral/10 border border-coral/30">
          <div className="flex items-center gap-1.5 text-xs font-bold text-coral mb-1">
            <ShieldAlert className="w-4 h-4 text-coral" />
            <span>G3 Strictly Forbidden</span>
          </div>
          <p className="text-[11px] text-ink/75 leading-relaxed">
            Target label <strong className="text-coral">G3</strong> (final grade) must not be included. Files containing G3 will be rejected with HTTP 422 to prevent model data leakage.
          </p>
        </div>

        {/* Max Size & Delimiters */}
        <div className="p-3.5 rounded-xl bg-paper border border-ink/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink mb-1">
            <Info className="w-4 h-4 text-edugreen" />
            <span>Format &amp; Sizing</span>
          </div>
          <p className="text-[11px] text-ink/65 leading-relaxed">
            Maximum file size: <strong className="text-ink">10 MB</strong>. Comma (<code>,</code>) or semicolon (<code>;</code>) delimiters supported. Encoding: UTF-8, UTF-8-SIG, or Latin-1.
          </p>
        </div>

        {/* Duplicate Invariant */}
        <div className="p-3.5 rounded-xl bg-amber/10 border border-amber/30">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Duplicate Prevention</span>
          </div>
          <p className="text-[11px] text-ink/75 leading-relaxed">
            Duplicate <code>(student_code, term)</code> pairs within the same upload are rejected. Batches are committed in an atomic database transaction.
          </p>
        </div>
      </div>

      {/* Expandable Feature List */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-bold text-edugreen hover:underline inline-flex items-center gap-1 focus:outline-none"
        >
          <span>{isExpanded ? "Hide Detailed Feature Schema" : "Show All 32 Required Telemetry Columns"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isExpanded && (
          <div className="mt-3 p-4 rounded-xl bg-paper border border-ink/10 space-y-3 text-xs">
            <div>
              <span className="font-bold text-ink block mb-1">
                32 Required Machine Learning Features:
              </span>
              <p className="font-mono text-[11px] text-ink/80 leading-relaxed bg-white p-2.5 rounded-lg border border-ink/10">
                school, sex, age, address, famsize, Pstatus, Medu, Fedu, Mjob, Fjob, reason, guardian, traveltime, studytime, failures, schoolsup, famsup, paid, activities, nursery, higher, internet, romantic, famrel, freetime, goout, Dalc, Walc, health, absences, G1, G2
              </p>
            </div>

            <div>
              <span className="font-bold text-ink block mb-1">
                Optional Metadata Headers:
              </span>
              <p className="font-mono text-[11px] text-ink/80 bg-white p-2 rounded-lg border border-ink/10">
                student_code (string, auto-generated if omitted), term (e.g. &apos;Term 1&apos;, defaults to &apos;Term 1&apos;)
              </p>
            </div>

            <p className="text-[11px] text-ink/50">
              Note: Any unrecognized or misspelled columns will cause the server to reject the entire file with an HTTP 422 schema error.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
