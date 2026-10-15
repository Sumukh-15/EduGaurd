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
      className="p-6 rounded-2xl bg-white border border-ink/10 shadow-sm paper-surface"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-ink/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-ink text-mint ring-4 ring-softgreen flex items-center justify-center font-bold text-base shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 id="student-profile-heading" className="text-xl font-display text-ink tracking-tight">
              {student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student Profile"}
            </h2>
            <p className="text-xs text-ink/60 font-mono mt-0.5">
              Institutional ID: <strong className="text-edugreen font-semibold">{student.student_code}</strong>
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-softgreen border border-edugreen/25 text-xs font-medium text-edugreen self-start sm:self-auto shadow-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>Active Enrollment</span>
        </div>
      </div>

      {/* Grid of Profile Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
          <Mail className="w-4 h-4 text-ink/40 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-ink-muted block">
              Academic email
            </span>
            <p className="text-xs font-medium text-ink truncate mt-0.5">
              {student.email || "No email linked"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
          <School className="w-4 h-4 text-ink/40 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-ink-muted block">
              Enrolled campus
            </span>
            <p className="text-xs font-medium text-ink truncate mt-0.5">
              {schoolDisplayName}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
          <Calendar className="w-4 h-4 text-ink/40 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-ink-muted block">
              Cohort year
            </span>
            <p className="text-xs font-medium text-ink mt-0.5">
              Class of {student.cohort_year || "2027"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-paper border border-ink/10 hover:border-ink/20 transition-colors">
          <BookOpen className="w-4 h-4 text-ink/40 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-ink-muted block">
              Audit data trajectory
            </span>
            <p className="text-xs font-medium text-ink mt-0.5 tabular-nums">
              {totalRecords} records • {totalPredictions} evaluations
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
