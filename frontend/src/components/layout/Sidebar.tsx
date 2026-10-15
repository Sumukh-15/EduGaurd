"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Clock,
  Cpu,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  LogOut,
  ShieldAlert,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

const ADMIN_NAV: NavItem[] = [
  {
    label: "Admin Overview",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
    description: "System health & usage telemetry",
  },
  {
    label: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
    description: "User directory & access control",
  },
  {
    label: "Model",
    href: "/dashboard/admin/model",
    icon: Cpu,
    description: "Model metadata, metrics & thresholds",
  },
  {
    label: "Dataset",
    href: "/dashboard/admin/dataset",
    icon: UploadCloud,
    description: "Batch student records CSV",
  },
];

const STUDENT_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard/student",
    icon: LayoutDashboard,
    description: "Academic overview & summary",
  },
  {
    label: "Risk & SHAP",
    href: "/dashboard/student/risk",
    icon: ShieldAlert,
    description: "Risk gauge & factor attribution",
  },
  {
    label: "Performance",
    href: "/dashboard/student/performance",
    icon: LineChart,
    description: "G1/G2 trajectory & grade velocity",
  },
  {
    label: "Academic History",
    href: "/dashboard/student/history",
    icon: Clock,
    description: "Course & semester records",
  },
  {
    label: "Recommendations",
    href: "/dashboard/student/recommendations",
    icon: Lightbulb,
    description: "Interventions & guidance",
  },
];

const FACULTY_NAV: NavItem[] = [
  {
    label: "Analytics Overview",
    href: "/dashboard/faculty",
    icon: BarChart3,
    description: "Cohort distribution & risk metrics",
  },
  {
    label: "Students",
    href: "/dashboard/faculty/students",
    icon: Users,
    description: "Cohort roster & risk triage",
  },
  {
    label: "Student Review",
    href: "/dashboard/faculty/review",
    icon: UserCheck,
    badge: "Direct ID",
    description: "Lookup student by numeric ID",
  },
  {
    label: "Dataset Upload",
    href: "/dashboard/faculty/upload",
    icon: UploadCloud,
    description: "Batch student records CSV",
  },
];

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const role: UserRole = user?.role || "student";
  const navItems =
    role === "admin"
      ? ADMIN_NAV
      : role === "student"
      ? STUDENT_NAV
      : FACULTY_NAV;

  const roleDisplayNames: Record<UserRole, string> = {
    student: "Student",
    faculty: "Faculty Member",
    admin: "Institutional Admin",
  };

  const roleBadgeStyles: Record<UserRole, string> = {
    student:
      "bg-softgreen text-edugreen font-bold border-softgreen-border",
    faculty:
      "bg-amber-soft text-amber font-bold border-amber/40",
    admin:
      "bg-slate-100 text-ink font-bold border-slate-200",
  };

  const getInitials = (name?: string) => {
    if (!name) return "EG";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={`flex flex-col h-full bg-white border-r border-slate-200/90 shadow-xs ${
        isMobile ? "w-72" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/70">
        <Link
          href={
            role === "admin"
              ? "/dashboard/admin"
              : role === "student"
              ? "/dashboard/student"
              : "/dashboard/faculty"
          }
          onClick={onClose}
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen rounded-xl group transition-transform active:scale-98"
        >
          <div className="w-10 h-10 rounded-xl bg-ink text-mint flex items-center justify-center shadow-sm border border-slate-800/80 group-hover:bg-edugreen group-hover:text-white transition-colors duration-200">
            <GraduationCap className="w-5 h-5 transition-transform group-hover:scale-105" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-ink tracking-tight leading-tight">
                EduGuard
              </span>
              <span className="w-2 h-2 rounded-full bg-edugreen" title="System Online" />
            </div>
            <span className="text-[11px] font-medium text-slate-500 block">
              Decision Support
            </span>
          </div>
        </Link>

        {isMobile && onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Pill Banner */}
      <div className="px-6 py-3 bg-paper border-b border-slate-200/70 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          Active Workspace
        </span>
        <span
          className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${roleBadgeStyles[role]}`}
        >
          {roleDisplayNames[role]}
        </span>
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Main Navigation"
        className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto"
      >
        <p className="px-3 pb-2 text-xs font-medium text-slate-400">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard/student" &&
              item.href !== "/dashboard/faculty" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-edugreen ${
                isActive
                  ? "bg-softgreen text-ink border-l-3 border-edugreen shadow-xs font-semibold"
                  : "text-slate-600 hover:text-ink hover:bg-slate-50 hover:border-l-3 hover:border-mint"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${
                    isActive
                      ? "text-edugreen"
                      : "text-slate-400 group-hover:text-edugreen"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout Footer */}
      <div className="p-4 border-t border-slate-200/70 bg-paper">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-softgreen text-edugreen-dark font-extrabold text-xs flex items-center justify-center flex-shrink-0 border border-softgreen-border">
            {getInitials(user?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-ink truncate leading-tight">
              {user?.full_name || "EduGuard User"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {user?.email || ""}
            </p>
            {user?.student_code && (
              <p className="text-[10px] font-mono text-edugreen font-bold">
                ID: {user.student_code}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          aria-label="Sign out of EduGuard"
          className="mt-3 w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-coral hover:bg-coral-soft rounded-xl transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
