"use client";

import React from "react";
import { BookOpen, Calendar, GraduationCap, Mail, School, Shield } from "lucide-react";
import { StudentDetail } from "@/types/student";

interface StudentIdentityCardProps {
  student: StudentDetail;
  totalRecords?: number;
  totalPredictions?: number;
}

export default function StudentIdentityCard({
  student,
  totalRecords = 0,
  totalPredictions = 0,
}: StudentIdentityCardProps) {
  const schoolNames: Record<string, string> = {
    GP: "Gabriel Pereira High School (GP)",
    MS: "Mousinho da Silveira (MS)",
  };

  const schoolDisplayName =
    (student.school && schoolNames[student.school]) || student.school || "Institutional Campus";

  return (
    <section
      aria-labelledby="student-profile-heading"
      className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 id="student-profile-heading" className="text-lg font-bold text-slate-900 dark:text-white">
              {student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student Profile"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Institutional ID: <strong className="text-emerald-600 dark:text-emerald-400">{student.student_code}</strong>
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Active Enrollment</span>
        </div>
      </div>

      {/* Grid of Profile Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Academic Email
            </span>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5">
              {student.email || "No email linked"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <School className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Enrolled Campus
            </span>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate mt-0.5">
              {schoolDisplayName}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Cohort Year
            </span>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
              Class of {student.cohort_year || "2027"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Audit Data Trajectory
            </span>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
              {totalRecords} records • {totalPredictions} evaluations
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
