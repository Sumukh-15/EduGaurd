"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Loader2,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { submitFacultyAcademicUpdate } from "@/lib/api/students";
import { AcademicUpdateResponse } from "@/types/student";

interface FacultyAcademicDataEntryModalProps {
  studentId: number;
  studentCode: string;
  studentName?: string;
  currentG1?: number | null;
  currentAbsences?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: AcademicUpdateResponse) => void;
}

export default function FacultyAcademicDataEntryModal({
  studentId,
  studentCode,
  studentName,
  currentG1,
  currentAbsences = 0,
  isOpen,
  onClose,
  onSuccess,
}: FacultyAcademicDataEntryModalProps) {
  const [subject, setSubject] = useState("Mathematics");
  const [assessmentName, setAssessmentName] = useState("Midterm 2 Evaluation");
  const [marks, setMarks] = useState<string>("12.0");
  const [maxMarks, setMaxMarks] = useState<string>("20.0");
  const [absences, setAbsences] = useState<number>(currentAbsences);
  const [assessmentDate, setAssessmentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numericMarks = parseFloat(marks);
    const numericMaxMarks = parseFloat(maxMarks);

    if (isNaN(numericMarks) || numericMarks < 0) {
      setErrorMessage("Marks must be a non-negative number.");
      return;
    }

    if (isNaN(numericMaxMarks) || numericMaxMarks <= 0) {
      setErrorMessage("Maximum marks must be a positive number.");
      return;
    }

    if (numericMarks > numericMaxMarks) {
      setErrorMessage("Recorded marks cannot exceed the maximum possible marks.");
      return;
    }

    if (absences < 0) {
      setErrorMessage("Absences cannot be negative.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitFacultyAcademicUpdate(studentId, {
        subject: subject.trim(),
        assessment_name: assessmentName.trim(),
        marks: numericMarks,
        max_marks: numericMaxMarks,
        absences: Number(absences),
        term: `Term 2 (${assessmentDate})`,
        recalculate_risk: true,
      });

      onSuccess(response);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while saving the academic update.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalized20 =
    !isNaN(parseFloat(marks)) && !isNaN(parseFloat(maxMarks)) && parseFloat(maxMarks) > 0
      ? ((parseFloat(marks) / parseFloat(maxMarks)) * 20).toFixed(1)
      : "0.0";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="faculty-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white border border-ink/10 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 modal-panel-enter max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-ink/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-ink-muted block">
                Official faculty record
              </span>
              <h3 id="faculty-modal-title" className="text-lg font-display text-ink mt-0.5">
                Record Verified Academic Update
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/40 hover:text-ink text-2xl font-light leading-none transition-colors"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Student Target Summary */}
        <div className="p-3.5 rounded-xl bg-paper border border-ink/10 flex items-center justify-between text-xs">
          <div>
            <span className="text-ink-muted block text-xs font-medium">
              Student under review
            </span>
            <span className="font-semibold text-ink text-sm">
              {studentName || "Enrolled Student"}
            </span>
            <span className="font-mono text-edugreen ml-2 font-medium">
              ({studentCode})
            </span>
          </div>
          <div className="text-right">
            <span className="text-ink-muted block text-xs font-medium">
              Current baseline G1
            </span>
            <span className="font-bold text-ink/80 font-mono tabular-nums">
              {currentG1 !== null && currentG1 !== undefined ? `${currentG1} / 20` : "N/A"}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-coral/10 border border-coral/30 text-coral text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subject */}
            <div>
              <label
                htmlFor="subject-input"
                className="block text-xs font-bold text-ink/80 mb-1"
              >
                Subject / Course
              </label>
              <input
                id="subject-input"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics, Science"
                className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-paper text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen"
              />
            </div>

            {/* Assessment Name */}
            <div>
              <label
                htmlFor="assessment-name-input"
                className="block text-xs font-bold text-ink/80 mb-1"
              >
                Assessment Name
              </label>
              <input
                id="assessment-name-input"
                type="text"
                required
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                placeholder="e.g. Midterm 2, Quiz 3"
                className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-paper text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen"
              />
            </div>
          </div>

          {/* Marks and Maximum Marks */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="marks-input"
                className="block text-xs font-bold text-ink/80 mb-1"
              >
                Marks Obtained
              </label>
              <input
                id="marks-input"
                type="number"
                step="0.5"
                min="0"
                required
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-paper text-ink text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen"
              />
            </div>

            <div>
              <label
                htmlFor="max-marks-input"
                className="block text-xs font-bold text-ink/80 mb-1"
              >
                Max Marks
              </label>
              <input
                id="max-marks-input"
                type="number"
                step="0.5"
                min="1"
                required
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-paper text-ink text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-ink/80 mb-1">
                Standard (0–20)
              </label>
              <div className="px-3 py-2 rounded-xl bg-softgreen text-edugreen border border-edugreen/30 text-xs font-mono font-bold text-center">
                {normalized20} / 20
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cumulative Absences */}
            <div>
              <label
                htmlFor="absences-input"
                className="block text-xs font-bold text-ink/80 mb-1"
              >
                Cumulative Absences (Days)
              </label>
              <input
                id="absences-input"
                type="number"
                min="0"
                max="93"
                required
                value={absences}
                onChange={(e) => setAbsences(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-paper text-ink text-xs font-mono focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen"
              />
            </div>

            {/* Assessment Date */}
            <div>
              <label
                htmlFor="date-input"
                className="block text-xs font-bold text-ink/80 mb-1"
              >
                Assessment Date
              </label>
              <input
                id="date-input"
                type="date"
                required
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-paper text-ink text-xs font-mono focus:outline-none focus:ring-2 focus:ring-edugreen/20 focus:border-edugreen"
              />
            </div>
          </div>

          {/* Process Workflow Transparency Callout */}
          <div className="p-3.5 rounded-xl bg-paper border border-ink/10 text-[11px] text-ink/65 space-y-1">
            <span className="font-bold text-ink block">
              Automated Decision-Support Processing on Save:
            </span>
            <ol className="list-decimal list-inside space-y-0.5 pl-1">
              <li>Stores official verified assessment record in PostgreSQL</li>
              <li>Calculates derived indicators (grade velocity: G2 − G1)</li>
              <li>Runs live inference through the Logistic Regression model</li>
              <li>Generates LinearSHAP factor contributions and stores them</li>
              <li>Evaluates institutional deterministic recommendation rules</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl border border-ink/15 text-xs font-bold text-ink/80 hover:bg-paper"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-5 rounded-xl bg-edugreen hover:bg-edugreen/90 active:scale-[0.99] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Risk &amp; SHAP...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Save Record &amp; Reassess Risk</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
