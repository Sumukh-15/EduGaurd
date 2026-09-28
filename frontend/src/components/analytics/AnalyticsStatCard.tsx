"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface AnalyticsStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: "emerald" | "amber" | "rose" | "indigo" | "slate";
  };
  progress?: {
    value: number; // 0 - 100
    label?: string;
  };
}

export default function AnalyticsStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  progress,
}: AnalyticsStatCardProps) {
  const badgeVariants = {
    emerald:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800",
    amber:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800",
    rose:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800",
    indigo:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800",
    slate:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </span>
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {value}
          </span>
          {badge && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeVariants[badge.variant]}`}
            >
              {badge.text}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {progress && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{progress.label || "Coverage"}</span>
            <span className="font-mono">{Math.round(progress.value)}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress.value)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progress.label || "Progress bar"}
            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
          >
            <div
              style={{ width: `${Math.min(Math.max(progress.value, 0), 100)}%` }}
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}
