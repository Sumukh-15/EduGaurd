"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Clock,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  UploadCloud,
  UserCheck,
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

const STUDENT_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard/student",
    icon: LayoutDashboard,
    description: "Academic risk & summary",
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
  const navItems = role === "student" ? STUDENT_NAV : FACULTY_NAV;

  const roleDisplayNames: Record<UserRole, string> = {
    student: "Student",
    faculty: "Faculty Member",
    admin: "Institutional Admin",
  };

  const roleBadgeStyles: Record<UserRole, string> = {
    student:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800",
    faculty:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800",
    admin:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800",
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
      className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 ${
        isMobile ? "w-72" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
        <Link
          href={role === "student" ? "/dashboard/student" : "/dashboard/faculty"}
          onClick={onClose}
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight block leading-tight">
              EduGuard
            </span>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Decision Support
            </span>
          </div>
        </Link>

        {isMobile && onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Pill Banner */}
      <div className="px-6 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Active Workspace
        </span>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${roleBadgeStyles[role]}`}
        >
          {roleDisplayNames[role]}
        </span>
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Main Navigation"
        className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto"
      >
        <p className="px-3 pb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
            {getInitials(user?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate leading-tight">
              {user?.full_name || "EduGuard User"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user?.email || ""}
            </p>
            {user?.student_code && (
              <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                ID: {user.student_code}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          aria-label="Sign out of EduGuard"
          className="mt-3 w-full py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
