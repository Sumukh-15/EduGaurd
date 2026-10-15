"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  HeartHandshake,
  Layers,
  LineChart,
  Lock,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();

  // Role-based redirect for authenticated sessions
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      if (user.role === "admin") {
        router.replace("/dashboard/admin");
      } else if (user.role === "student") {
        router.replace("/dashboard/student");
      } else {
        router.replace("/dashboard/faculty");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // If session is still verifying, show a subtle branded loading state
  if (isLoading || (isAuthenticated && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-edugreen border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wide uppercase text-ink/60">
            Routing to EduGuard Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col selection:bg-mint selection:text-ink">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-ink/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-edugreen flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-ink tracking-tight">EduGuard</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-softgreen text-edugreen-dark rounded-md border border-softgreen-border">
                  EWS AI
                </span>
              </div>
              <p className="text-[11px] text-ink-muted -mt-0.5 hidden sm:block">
                Academic Risk Early-Warning Platform
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-muted">
            <a href="#workflow" className="hover:text-ink transition-colors">
              How It Works
            </a>
            <a href="#ethics" className="hover:text-ink transition-colors">
              Ethical AI
            </a>
            <a href="#audiences" className="hover:text-ink transition-colors">
              Audiences
            </a>
            <Link href="/about" className="hover:text-ink transition-colors">
              About & Methodology
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/about"
              className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
            >
              Methodology
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4.5 py-2 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            >
              Sign In to Portal
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-ink/8">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-softgreen blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-mint/20 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-ink/10 shadow-xs mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-edugreen" />
            <span className="text-xs font-medium text-ink-muted">
              Transparent, non-causal AI early-warning system
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-ink text-balance leading-[1.12]">
            Proactive academic support{" "}
            <span className="text-edugreen underline decoration-mint/70 decoration-wavy decoration-2">
              before
            </span>{" "}
            students fall behind.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-ink-muted max-w-2xl mx-auto text-balance leading-relaxed">
            EduGuard combines machine learning risk estimation with mathematical{" "}
            <strong className="text-ink font-semibold">LinearSHAP</strong> explainability to help
            faculty mentors and students identify academic challenges early—without black-box
            opacity or punitive bias.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/login"
              className="btn-interactive w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <span>Access EduGuard portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/about"
              className="btn-interactive w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-paper-card border border-ink/12 text-ink text-sm font-medium shadow-xs hover:border-ink/25 transition-all"
            >
              <BookOpen className="w-4 h-4 text-edugreen" />
              <span>Read research &amp; non-goals</span>
            </Link>
          </div>

          {/* Quick Pillars Grid */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4.5 rounded-2xl bg-white border border-ink/8 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-softgreen flex items-center justify-center text-edugreen mb-3">
                <Search className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-ink">Transparent Attribution</h3>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Every risk score is deconstructed into positive and negative contributing factors
                via SHAP additive values.
              </p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white border border-ink/8 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-softgreen flex items-center justify-center text-edugreen mb-3">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-ink">Supportive, Not Punitive</h3>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Built strictly for mentorship triage, tutoring guidance, and early advising. Never
                used for automated academic disciplinary actions.
              </p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white border border-ink/8 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-softgreen flex items-center justify-center text-edugreen mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-ink">Role-Based Privacy</h3>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Fine-grained student isolation and assigned-mentor roster boundaries safeguard
                sensitive academic records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Workflow: Detect -> Explain -> Visualize -> Support */}
      <section id="workflow" className="py-20 bg-white border-b border-ink/8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold text-edugreen bg-softgreen px-2.5 py-1 rounded-md border border-softgreen-border">
              The 4-step architecture
            </span>
            <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight mt-3">
              How EduGuard Works
            </h2>
            <p className="text-sm text-ink-muted mt-2">
              From raw milestone indicators to actionable human mentorship in four transparent stages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1: Detect */}
            <div className="relative p-6 rounded-2xl bg-paper border border-ink/8 hover:border-edugreen/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-ink/10 flex items-center justify-center text-edugreen shadow-xs">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-ink/15 tabular-nums">01</span>
                </div>
                <h3 className="text-base font-bold text-ink mb-1">Detect</h3>
                <p className="text-xs font-medium text-edugreen mb-2">
                  Early signal analysis
                </p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Evaluates academic milestones (G1, G2), attendance records, and study patterns
                  against a balanced statistical model trained to maximize recall (0.83+).
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-ink/6 text-[11px] font-medium text-ink/70 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-edugreen" />
                Catches 83%+ at-risk signals
              </div>
            </div>

            {/* Step 2: Explain */}
            <div className="relative p-6 rounded-2xl bg-paper border border-ink/8 hover:border-edugreen/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-ink/10 flex items-center justify-center text-edugreen shadow-xs">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-ink/15 tabular-nums">02</span>
                </div>
                <h3 className="text-base font-bold text-ink mb-1">Explain</h3>
                <p className="text-xs font-medium text-edugreen mb-2">
                  LinearSHAP attribution
                </p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Calculates exact additive SHAP feature contributions. Unpacks why a student was
                  flagged into protective strengths and risk factors.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-ink/6 text-[11px] font-medium text-ink/70 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-edugreen" />
                No uninterpretable black box
              </div>
            </div>

            {/* Step 3: Visualize */}
            <div className="relative p-6 rounded-2xl bg-paper border border-ink/8 hover:border-edugreen/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-ink/10 flex items-center justify-center text-edugreen shadow-xs">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-ink/15 tabular-nums">03</span>
                </div>
                <h3 className="text-base font-bold text-ink mb-1">Visualize</h3>
                <p className="text-xs font-medium text-edugreen mb-2">
                  Grade velocity & gauges
                </p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Renders intuitive calibrated risk gauges, longitudinal trajectories (G1 → G2), and
                  grade velocity shifts for quick human inspection.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-ink/6 text-[11px] font-medium text-ink/70 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-edugreen" />
                Clear visual risk tiers
              </div>
            </div>

            {/* Step 4: Support */}
            <div className="relative p-6 rounded-2xl bg-paper border border-ink/8 hover:border-edugreen/40 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-ink/10 flex items-center justify-center text-edugreen shadow-xs">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-bold font-mono text-ink/15 tabular-nums">04</span>
                </div>
                <h3 className="text-base font-bold text-ink mb-1">Support</h3>
                <p className="text-xs font-medium text-edugreen mb-2">
                  Human-in-the-loop mentorship
                </p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Facilitates targeted tutoring, peer study groups, and faculty advisor check-ins.
                  Preserves human autonomy and student empowerment.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-ink/6 text-[11px] font-medium text-ink/70 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-edugreen" />
                Constructive intervention workflows
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ethical Commitment & Non-Causal Framing */}
      <section id="ethics" className="py-18 bg-paper border-b border-ink/8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-white border-2 border-edugreen/20 shadow-sm relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-softgreen text-edugreen flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-edugreen">
                    Ethical artificial intelligence commitment
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight">
                  Non-Causal Disclaimer & Responsible Use Policy
                </h2>
                <p className="text-sm text-ink-muted mt-3 leading-relaxed">
                  EduGuard is built on the unwavering premise that{" "}
                  <strong className="text-ink">correlational machine learning predictions are not causal determinants</strong>,
                  nor are they judgments of a student&apos;s innate intelligence or academic capability.
                </p>

                <div className="mt-5 space-y-2.5 text-xs text-ink/80 bg-paper p-4 rounded-xl border border-ink/8">
                  <p className="flex items-start gap-2">
                    <span className="text-edugreen font-bold">•</span>
                    <span>
                      <strong>Decision Support Only:</strong> Model outputs serve solely as an early-warning signal for human educators, mentors, and the students themselves.
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-edugreen font-bold">•</span>
                    <span>
                      <strong>No Automated Sanctions:</strong> Predictions must never be used to limit course enrollment, alter grading scales, or enforce punitive administrative penalties.
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-edugreen font-bold">•</span>
                    <span>
                      <strong>Supportive Language:</strong> All student-facing communication is framed constructively to foster agency, academic resilience, and access to institutional resources.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Audiences Overview */}
      <section id="audiences" className="py-18 bg-white border-b border-ink/8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-edugreen bg-softgreen px-2.5 py-1 rounded-md border border-softgreen-border">
              Role-specific workflows
            </span>
            <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight mt-3">
              Designed for the Academic Community
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student */}
            <div className="p-6 rounded-2xl bg-paper border border-ink/8">
              <div className="w-10 h-10 rounded-xl bg-white border border-ink/10 flex items-center justify-center text-edugreen shadow-xs mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink">Students</h3>
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                Inspect your academic trajectory, check risk scores on demand, understand grade
                velocity between terms, and access tailored study recommendations.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-ink/75">
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-edugreen" /> Self-evaluation & on-demand checks
                </li>
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-edugreen" /> Plain-language SHAP factor breakdowns
                </li>
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-edugreen" /> Grade trajectory & attendance tracking
                </li>
              </ul>
            </div>

            {/* Faculty */}
            <div className="p-6 rounded-2xl bg-paper border border-ink/8">
              <div className="w-10 h-10 rounded-xl bg-white border border-ink/10 flex items-center justify-center text-edugreen shadow-xs mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink">Faculty Mentors</h3>
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                Triage assigned student rosters, prioritize students in High Risk tiers, review
                longitudinal history, and log timely academic mentorship interventions.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-ink/75">
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-edugreen" /> Cohort risk distribution analytics
                </li>
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-edugreen" /> Student deep-dive & audit review
                </li>
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-edugreen" /> Roster-based mentor security
                </li>
              </ul>
            </div>

            {/* Admin */}
            <div className="p-6 rounded-2xl bg-paper border border-ink/8">
              <div className="w-10 h-10 rounded-xl bg-white border border-ink/10 flex items-center justify-center text-edugreen shadow-xs mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink">Institutional Admins</h3>
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                Monitor system telemetry, inspect model versions, track threshold calibration,
                manage user roles, and ingest bulk academic datasets securely.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-ink/75">
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-edugreen" /> Model health & parameter audit
                </li>
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-edugreen" /> User access & role lifecycle
                </li>
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-edugreen" /> Dataset batch upload & validation
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer Banner */}
      <section className="py-14 bg-ink text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">
            Ready to empower your academic community?
          </h2>
          <p className="mt-3 text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
            Log in to the EduGuard portal with your institution credentials or learn more about our
            underlying statistical models.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-edugreen hover:bg-edugreen-dark text-white text-xs font-semibold btn-interactive shadow-sm"
            >
              Sign In to EduGuard
            </Link>
            <Link
              href="/about"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 btn-interactive"
            >
              Read About & Limitations
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-paper border-t border-ink/8 text-center text-xs text-ink-muted">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-edugreen" />
            <span className="font-bold text-ink">EduGuard Early-Warning Platform</span>
            <span>•</span>
            <span>Empowering Academic Retention</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-ink transition-colors">
              Methodology & Non-Goals
            </Link>
            <Link href="/login" className="hover:text-ink transition-colors">
              Portal Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
