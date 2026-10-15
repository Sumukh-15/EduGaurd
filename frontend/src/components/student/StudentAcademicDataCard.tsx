"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Edit3,
  Loader2,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { AcademicRecordHistoryItem, AcademicUpdateResponse } from "@/types/student";
import { updateStudentSelfReported } from "@/lib/api/students";

interface StudentAcademicDataCardProps {
  studentId: number;
  latestRecord?: AcademicRecordHistoryItem;
  onUpdateSuccess: (response: AcademicUpdateResponse) => void;
}

export default function StudentAcademicDataCard({
  studentId,
  latestRecord,
  onUpdateSuccess,
}: StudentAcademicDataCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studyTime, setStudyTime] = useState<number>(latestRecord?.studytime || 2);
  const [familySupport, setFamilySupport] = useState<boolean>(
    latestRecord?.famsup === true || latestRecord?.famsup === "yes"
  );
  const [extraPaidClasses, setExtraPaidClasses] = useState<boolean>(
    latestRecord?.paid === true || latestRecord?.paid === "yes"
  );
  const [extraCurricular, setExtraCurricular] = useState<boolean>(
    latestRecord?.activities === true || latestRecord?.activities === "yes"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const studyTimeDescriptions: Record<number, { label: string; desc: string }> = {
    1: { label: "< 2 hours / week", desc: "Minimal independent study outside class" },
    2: { label: "2 - 5 hours / week", desc: "Regular weekly review and homework completion" },
    3: { label: "5 - 10 hours / week", desc: "Dedicated study schedule with practice problems" },
    4: { label: "> 10 hours / week", desc: "Intensive preparation, tutoring, and self-study" },
  };

  const formattedDate = latestRecord?.recorded_at
    ? new Date(latestRecord.recorded_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not recorded";

  const isFacultyVerified = latestRecord?.data_source !== "self_reported";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await updateStudentSelfReported(studentId, {
        studytime: Number(studyTime),
        famsup: familySupport ? "yes" : "no",
        paid: extraPaidClasses ? "yes" : "no",
        activities: extraCurricular ? "yes" : "no",
      });
      setIsModalOpen(false);
      onUpdateSuccess(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Failed to update study information. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="academic-data-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface space-y-6"
    >
      {/* Header with Title and Update Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-ink/10">
        <div>
          <span className="text-xs font-medium text-ink-muted block">
            Academic status &amp; data provenance
          </span>
          <h2 id="academic-data-heading" className="font-display text-xl text-ink mt-0.5 tracking-tight">
            Your Current Academic Data
          </h2>
          <p className="text-xs text-ink/60 mt-1 max-w-xl">
            Official assessment marks and attendance are verified by faculty, while study habits are self-reported.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn-interactive py-2.5 px-4 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 self-start sm:self-auto flex-shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Update academic information</span>
        </button>
      </div>

      {/* Grid: Official Faculty Data vs Student Self-Reported Data */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* OFFICIAL FACULTY DATA (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
              <ShieldCheck className="w-4 h-4 text-edugreen" />
              <span>Official institutional records</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-softgreen border border-edugreen/25 text-edugreen">
              <CheckCircle className="w-3 h-3" />
              <span>Verified by faculty</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* G1 Grade */}
            <div className="p-3.5 rounded-xl bg-paper border border-ink/10">
              <span className="text-xs font-medium text-ink-muted block">
                Previous grade (G1)
              </span>
              <p className="text-xl font-bold font-sans tabular-nums text-ink mt-1">
                {latestRecord?.G1 !== null && latestRecord?.G1 !== undefined
                  ? `${latestRecord.G1} / 20`
                  : "N/A"}
              </p>
              <span className="text-[11px] text-ink-muted block mt-0.5">
                First period exam
              </span>
            </div>

            {/* G2 Grade */}
            <div className="p-3.5 rounded-xl bg-paper border border-ink/10">
              <span className="text-xs font-medium text-ink-muted block">
                Latest grade (G2)
              </span>
              <p className="text-xl font-bold font-sans tabular-nums text-edugreen mt-1">
                {latestRecord?.G2 !== null && latestRecord?.G2 !== undefined
                  ? `${latestRecord.G2} / 20`
                  : "N/A"}
              </p>
              <span className="text-[11px] text-ink-muted block mt-0.5">
                Midterm evaluation
              </span>
            </div>

            {/* Attendance / Absences */}
            <div className="p-3.5 rounded-xl bg-paper border border-ink/10">
              <span className="text-xs font-medium text-ink-muted block">
                Attendance
              </span>
              <p
                className={`text-xl font-bold font-sans tabular-nums mt-1 ${
                  (latestRecord?.absences ?? 0) >= 10
                    ? "text-coral"
                    : "text-ink"
                }`}
              >
                {latestRecord?.absences !== undefined
                  ? `${latestRecord.absences} absences`
                  : "N/A"}
              </p>
              <span className="text-[11px] text-ink-muted block mt-0.5">
                {(latestRecord?.absences ?? 0) >= 10
                  ? "Chronic absence warning"
                  : "Within attendance standard"}
              </span>
            </div>

            {/* Past Academic Difficulties */}
            <div className="p-3.5 rounded-xl bg-paper border border-ink/10">
              <span className="text-xs font-medium text-ink-muted block">
                Past difficulties
              </span>
              <p className="text-lg font-bold font-sans tabular-nums text-ink mt-1">
                {latestRecord?.failures !== undefined
                  ? `${latestRecord.failures} courses`
                  : "0 courses"}
              </p>
              <span className="text-[11px] text-ink-muted block mt-0.5">
                Past course failures
              </span>
            </div>

            {/* Subject & Assessment */}
            <div className="p-3.5 rounded-xl bg-paper border border-ink/10 col-span-2">
              <span className="text-xs font-medium text-ink-muted block">
                Curriculum assessment
              </span>
              <p className="text-sm font-semibold text-ink mt-1 truncate">
                {latestRecord?.subject || "Mathematics"} • {latestRecord?.assessment_name || "Midterm Evaluation"}
              </p>
              <span className="text-[11px] text-ink-muted block mt-0.5">
                Updated on {formattedDate}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-paper border border-ink/10 text-xs text-ink-muted flex items-center gap-1.5">
            <LockIcon className="w-3.5 h-3.5 text-ink/40 flex-shrink-0" />
            <span>Official marks and attendance are recorded by certified faculty instructors.</span>
          </div>
        </div>

        {/* STUDENT SELF-REPORTED DATA (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
              <UserCheck className="w-4 h-4 text-edugreen" />
              <span>Student self-reported habits</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-paper border border-ink/15 text-ink/70">
              <span>Self-reported</span>
            </span>
          </div>

          <div className="space-y-3">
            {/* Study Time Card */}
            <div className="p-3.5 rounded-xl bg-paper border border-ink/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted block">
                  Study time per week
                </span>
                <span className="text-xs text-ink-muted font-sans tabular-nums">
                  Tier {latestRecord?.studytime || 2}
                </span>
              </div>
              <p className="text-base font-semibold text-ink mt-1">
                {studyTimeDescriptions[latestRecord?.studytime || 2]?.label}
              </p>
              <p className="text-xs text-ink/60 mt-0.5">
                {studyTimeDescriptions[latestRecord?.studytime || 2]?.desc}
              </p>
            </div>

            {/* Support and Resources */}
            <div className="p-3.5 rounded-xl bg-paper border border-ink/10">
              <span className="text-xs font-medium text-ink-muted block">
                Academic support &amp; habits
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                    latestRecord?.famsup === true || latestRecord?.famsup === "yes"
                      ? "bg-softgreen text-edugreen border-edugreen/25"
                      : "bg-paper text-ink/60 border-ink/10"
                  }`}
                >
                  Family support: {latestRecord?.famsup === true || latestRecord?.famsup === "yes" ? "Yes" : "No"}
                </span>

                <span
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                    latestRecord?.paid === true || latestRecord?.paid === "yes"
                      ? "bg-softgreen text-edugreen border-edugreen/25"
                      : "bg-paper text-ink/60 border-ink/10"
                  }`}
                >
                  Supplemental tutoring: {latestRecord?.paid === true || latestRecord?.paid === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {/* Last updated timestamp */}
            <div className="text-[11px] text-ink-muted flex items-center justify-between px-1">
              <span>Data source: {isFacultyVerified ? "Verified by faculty" : "Self-reported"}</span>
              <span>Updated: {formattedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dialog for Self-Reporting Study Information */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-update-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs"
        >
          <div className="bg-white border border-ink/10 rounded-2xl max-w-lg w-full p-6 shadow-xl paper-surface space-y-5 modal-panel-enter">
            <div className="flex items-center justify-between pb-3 border-b border-ink/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-ink text-mint flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="modal-update-title" className="font-display text-lg text-ink">
                    Update Academic Information
                  </h3>
                  <p className="text-xs text-ink/60">
                    Self-report your weekly study hours and academic environment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink/40 hover:text-ink text-lg font-semibold transition-colors"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-coral/10 border border-coral/30 text-coral text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Study time select */}
              <div>
                <label
                  htmlFor="studytime-select"
                  className="block text-xs font-semibold text-ink mb-1.5"
                >
                  Weekly Dedicated Study Time (outside class)
                </label>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((tier) => (
                    <label
                      key={tier}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        studyTime === tier
                          ? "bg-softgreen/60 border-edugreen text-ink"
                          : "bg-paper border-ink/10 text-ink/80 hover:border-ink/25"
                      }`}
                    >
                      <input
                        type="radio"
                        name="studytime"
                        value={tier}
                        checked={studyTime === tier}
                        onChange={() => setStudyTime(tier)}
                        className="mt-1 text-edugreen focus:ring-edugreen"
                      />
                      <div>
                        <div className="text-xs font-semibold">{studyTimeDescriptions[tier].label}</div>
                        <div className="text-[11px] text-ink/60">
                          {studyTimeDescriptions[tier].desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Support checkboxes */}
              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={familySupport}
                    onChange={(e) => setFamilySupport(e.target.checked)}
                    className="rounded text-edugreen focus:ring-edugreen"
                  />
                  <span>Family educational support available (tutoring, study encouragement)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extraPaidClasses}
                    onChange={(e) => setExtraPaidClasses(e.target.checked)}
                    className="rounded text-edugreen focus:ring-edugreen"
                  />
                  <span>Enrolled in supplemental tutoring or extra coursework</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extraCurricular}
                    onChange={(e) => setExtraCurricular(e.target.checked)}
                    className="rounded text-edugreen focus:ring-edugreen"
                  />
                  <span>Participates in school extra-curricular activities</span>
                </label>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-xl bg-paper border border-ink/10 text-[11px] text-ink/70">
                <p>
                  <strong>Data Integrity Note:</strong> Updating your self-reported study habits will recalculate your risk assessment using the verified institutional marks recorded by faculty. Official grades cannot be overwritten here.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="btn-interactive py-2 px-4 rounded-xl border border-ink/15 text-xs font-semibold text-ink/75 hover:bg-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-interactive py-2 px-5 rounded-xl bg-edugreen hover:bg-edugreen-dark active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recalculating Risk...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Save &amp; Recalculate Risk</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
