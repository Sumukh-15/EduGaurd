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
    title: "Faculty Analytics",
    subtitle: "Cohort Risk Distribution & Student Population Overview",
  },
  "/dashboard/faculty/review": {
    title: "Student Review",
    subtitle: "Direct Student ID Lookup & Risk Explanation",
  },
  "/dashboard/faculty/upload": {
    title: "Dataset Management",
    subtitle: "Batch CSV Student Academic Records Ingestion",
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
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800",
    faculty:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800",
    admin:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800",
  };

  const roleNames: Record<UserRole, string> = {
    student: "Student Portal",
    faculty: "Faculty Portal",
    admin: "Admin Console",
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate leading-tight">
            {currentRouteInfo.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
            {currentRouteInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Security Badge, Role Indicator & Quick Logout */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200/80 dark:border-slate-700/80">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>PostgreSQL Active</span>
        </div>

        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleBadgeStyles[role]}`}
        >
          {roleNames[role]}
        </span>

        <button
          onClick={logout}
          aria-label="Sign out"
          title="Sign out of EduGuard"
          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-slate-400 dark:hover:text-rose-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
