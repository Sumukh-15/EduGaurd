"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/student": {
    title: "Student Dashboard",
    subtitle: "Personal Academic Risk & Early-Warning Status",
  },
  "/dashboard/student/history": {
    title: "Academic History",
    subtitle: "Course Performance & Historical Risk Trajectory",
  },
  "/dashboard/student/recommendations": {
    title: "Targeted Interventions",
    subtitle: "Actionable Academic Guidance & Support Rules",
  },
  "/dashboard/faculty": {
    title: "Faculty Overview",
    subtitle: "Cohort Risk Distribution & Student Population Overview",
  },
  "/dashboard/faculty/students": {
    title: "Student Cohort Roster",
    subtitle: "Academic Directory & Operational Risk Triage",
  },
  "/dashboard/faculty/review": {
    title: "Student Review",
    subtitle: "Direct Student ID Inspection & Performance Evaluation",
  },
  "/dashboard/faculty/analytics": {
    title: "Cohort Analytics",
    subtitle: "Longitudinal Trends & Class Performance Metrics",
  },
  "/dashboard/faculty/upload": {
    title: "Dataset Management",
    subtitle: "Batch CSV Student Academic Records Ingestion",
  },
  "/dashboard/admin": {
    title: "Administrative Console",
    subtitle: "Institutional Health, Telemetry & Audit Stream",
  },
  "/dashboard/admin/users": {
    title: "User Directory & Access",
    subtitle: "Identity Provisioning & Role-Based Access Control",
  },
  "/dashboard/admin/model": {
    title: "Model Governance",
    subtitle: "Inference Engine Metadata, Test Metrics & Feature Registry",
  },
  "/dashboard/admin/dataset": {
    title: "Dataset Administration",
    subtitle: "Batch Records Ingestion & Schema Verification",
  },
};

export default function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const currentRouteInfo = ROUTE_TITLES[pathname] || {
    title: "EduGuard Portal",
    subtitle: "Academic Decision Support System",
  };

  const role: UserRole = user?.role || "student";

  const roleBadgeStyles: Record<UserRole, string> = {
    student:
      "bg-softgreen text-edugreen font-bold border-softgreen-border",
    faculty:
      "bg-amber-soft text-amber font-bold border-amber/30",
    admin:
      "bg-slate-100 text-ink font-bold border-slate-200",
  };

  const roleNames: Record<UserRole, string> = {
    student: "Student Portal",
    faculty: "Faculty Portal",
    admin: "Admin Console",
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-extrabold text-ink truncate leading-tight tracking-tight">
            {currentRouteInfo.title}
          </h1>
          <p className="text-xs text-slate-500 truncate hidden sm:block">
            {currentRouteInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Security Badge, Role Indicator & Quick Logout */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper text-slate-600 text-xs font-semibold border border-slate-200/80">
          <ShieldCheck className="w-3.5 h-3.5 text-edugreen" />
          <span>Decision Support Engine Active</span>
        </div>

        <span
          className={`text-[11px] font-bold px-3 py-1 rounded-full border ${roleBadgeStyles[role]}`}
        >
          {roleNames[role]}
        </span>

        <button
          onClick={logout}
          aria-label="Sign out"
          title="Sign out of EduGuard"
          className="p-2 rounded-xl text-slate-500 hover:text-coral hover:bg-coral-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
