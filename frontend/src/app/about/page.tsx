"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Database,
  Layers,
  Scale,
  Shield,
  Sparkles,
  XCircle,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col selection:bg-mint selection:text-ink page-enter">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-ink/8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-edugreen flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-ink tracking-tight">EduGuard</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-softgreen text-edugreen-dark rounded-md border border-softgreen-border">
                  About
                </span>
              </div>
              <p className="text-[11px] text-ink-muted -mt-0.5 hidden sm:block">
                Methodology & System Architecture
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-semibold shadow-xs hover:shadow-md btn-interactive"
            >
              Sign In
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="py-12 sm:py-16 border-b border-ink/8 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-softgreen border border-softgreen-border text-edugreen-dark text-xs font-medium mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Transparent machine learning documentation
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-ink tracking-tight">
            About EduGuard Methodology
          </h1>
          <p className="mt-4 text-base text-ink-muted max-w-2xl mx-auto leading-relaxed">
            A comprehensive overview of our early-warning mission, foundational dataset, statistical
            model architecture, known limitations, and strict non-goals.
          </p>
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 flex-1">
        {/* Section 1: Purpose */}
        <section className="p-7 sm:p-9 rounded-3xl bg-white border border-ink/8 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-ink">System Purpose & Mission</h2>
              <p className="text-xs text-ink-muted">Why early-warning decision support matters</p>
            </div>
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            In higher education and secondary schooling, traditional academic intervention typically
            occurs reactively at the conclusion of a semester—often after final grades have solidified
            and course failure is irreversible.
          </p>
          <p className="text-sm text-ink/80 leading-relaxed mt-3">
            <strong className="text-ink">EduGuard</strong> shifts this timeline from post-mortem triage
            to <em>proactive, supportive mid-semester mentorship</em>. By synthesizing milestone grades
            (G1 and G2 evaluations), attendance patterns, and study commitments, EduGuard provides
            human advisors and students with transparent risk indicators and mathematical factor
            attributions to foster targeted, timely interventions.
          </p>
        </section>

        {/* Section 2: Foundational Dataset */}
        <section className="p-7 sm:p-9 rounded-3xl bg-white border border-ink/8 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-ink">The Dataset: Cortez & Silva (2008)</h2>
              <p className="text-xs text-ink-muted">Historical secondary student performance records</p>
            </div>
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            EduGuard&apos;s baseline statistical models are trained on the seminal{" "}
            <strong className="text-ink">Student Performance Dataset</strong> collected by Paulo
            Cortez and Alice Silva (University of Minho, 2008), comprising 33 features across secondary
            school students:
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-paper border border-ink/8 text-xs">
              <span className="font-bold text-ink block mb-1">Academic Performance Features</span>
              <p className="text-ink-muted leading-relaxed">
                Period 1 score (<code>G1</code>, 0–20), Period 2 score (<code>G2</code>, 0–20),
                previous subject failures (<code>failures</code>), and grade velocity
                (<code>G2 - G1</code>).
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-paper border border-ink/8 text-xs">
              <span className="font-bold text-ink block mb-1">Behavioral & Attendance Features</span>
              <p className="text-ink-muted leading-relaxed">
                School attendance record (<code>absences</code>), dedicated weekly study hours
                (<code>studytime</code>, 1–4 scale), and participation in school extracurriculars.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-paper border border-ink/8 text-xs">
              <span className="font-bold text-ink block mb-1">Institutional Support Indicators</span>
              <p className="text-ink-muted leading-relaxed">
                Extra school educational support (<code>schoolsup</code>), family educational
                assistance (<code>famsup</code>), and paid supplemental classes (<code>paid</code>).
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-paper border border-ink/8 text-xs">
              <span className="font-bold text-ink block mb-1">Socio-Contextual Disclosures</span>
              <p className="text-ink-muted leading-relaxed">
                Parental education levels (<code>Medu</code>, <code>Fedu</code>), study environment,
                and internet accessibility at home.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Model & LinearSHAP Summary */}
        <section className="p-7 sm:p-9 rounded-3xl bg-white border border-ink/8 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-softgreen text-edugreen flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-ink">Model Architecture & LinearSHAP</h2>
              <p className="text-xs text-ink-muted">High-recall statistical classification with additive explainability</p>
            </div>
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">
            EduGuard employs a class-balanced <strong className="text-ink">Logistic Regression</strong>{" "}
            classifier calibrated with an operating decision threshold optimized for high Recall
            (<strong>0.83+</strong>). In an early warning system, failing to detect an at-risk student
            (False Negative) carries far greater educational detriment than offering supportive
            tutoring to a student who might have passed independently (False Positive).
          </p>

          <div className="mt-5 p-5 rounded-2xl bg-paper border border-ink/8">
            <h3 className="text-xs font-semibold text-ink mb-2">
              LinearSHAP feature attribution formula
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              For any feature <em>i</em> with normalized value <em>x<sub>i</sub></em>, baseline mean{" "}
              <em>E[x<sub>i</sub>]</em>, and model logistic weight <em>w<sub>i</sub></em>, the SHAP
              attribution value <em>&phi;<sub>i</sub></em> is computed exactly as:
            </p>
            <div className="my-3 px-4 py-2.5 rounded-xl bg-white border border-ink/10 font-mono text-sm text-center text-edugreen-dark font-bold tabular-nums">
              &phi;<sub>i</sub> = w<sub>i</sub> &times; (x<sub>i</sub> - E[x<sub>i</sub>])
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              This guarantees mathematical efficiency and local accuracy: the sum of all factor
              contributions precisely reconciles the student&apos;s log-odds divergence from the cohort
              base expectation, ensuring 100% auditable transparency.
            </p>
          </div>
        </section>

        {/* Section 4: Known Limitations */}
        <section className="p-7 sm:p-9 rounded-3xl bg-white border border-ink/8 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-soft text-amber flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-ink">Known Technical Limitations</h2>
              <p className="text-xs text-ink-muted">Critical boundaries and operational constraints</p>
            </div>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-ink/80">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-2 shrink-0" />
              <span>
                <strong>Non-Causal Correlation:</strong> SHAP values quantify statistical associations
                within historical cohort data. They do not demonstrate that altering a specific
                factor (e.g. changing study hours alone) will causally guarantee improved marks.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-2 shrink-0" />
              <span>
                <strong>Cohort Distribution Shift:</strong> Academic performance data collected in
                different institutional contexts, grading scales, or semesters may exhibit covariate
                shift requiring periodic model threshold recalibration.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-2 shrink-0" />
              <span>
                <strong>Self-Reported Covariates:</strong> Features such as weekly study time and
                family support rely on self-reporting and may carry measurement noise.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber mt-2 shrink-0" />
              <span>
                <strong>Mid-Term Latency:</strong> The highest-weighted predictors are milestone scores
                (G1 and G2); early warning accuracy improves significantly once G1 assessment data
                is submitted.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 5: Non-Goals */}
        <section className="p-7 sm:p-9 rounded-3xl bg-white border border-ink/8 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-coral-soft text-coral flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-ink">Explicit Non-Goals</h2>
              <p className="text-xs text-ink-muted">What EduGuard is strictly prohibited from doing</p>
            </div>
          </div>
          <div className="space-y-3.5">
            <div className="p-4 rounded-2xl bg-coral-soft/50 border border-coral/20 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-ink">Not an Automated Grading Engine</h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  EduGuard never assigns, modifies, or computes student grades, GPA, or official academic standings.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-coral-soft/50 border border-coral/20 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-ink">Not a Punitive Sorting or Disciplinary Tool</h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  Risk scores must never be utilized to disqualify students from courses, revoke scholarships,
                  or trigger disciplinary proceedings.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-coral-soft/50 border border-coral/20 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-ink">Not an Autonomous Intervention Executor</h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  EduGuard never acts autonomously without human oversight. All mentorship actions, tutoring
                  recommendations, and academic advisements require human educator review.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-coral-soft/50 border border-coral/20 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-ink">Not a Substitute for Faculty-Student Relationships</h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  Algorithmic telemetry cannot replace the empathetic, contextual understanding that
                  teachers and advisors bring to student discussions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Return to Portal Banner */}
        <div className="p-8 rounded-3xl bg-ink text-white text-center">
          <h3 className="font-display text-xl font-normal">Have questions or ready to test the system?</h3>
          <p className="text-xs text-white/70 mt-2 max-w-md mx-auto">
            Log in to your authenticated EduGuard account to explore the student, faculty, and
            administrative interfaces.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-semibold shadow-xs btn-interactive"
            >
              Access Portal
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 btn-interactive"
            >
              Return to Landing Page
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-paper border-t border-ink/8 text-center text-xs text-ink-muted">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-edugreen" />
            <span className="font-bold text-ink">EduGuard Early-Warning Platform</span>
            <span>•</span>
            <span>Documented Research & Ethics</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-ink transition-colors">
              Home
            </Link>
            <Link href="/login" className="hover:text-ink transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
