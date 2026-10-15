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
      "bg-softgreen text-edugreen-dark border-edugreen/30",
    amber:
      "bg-amber/15 text-amber-900 border-amber/30",
    rose:
      "bg-coral/15 text-coral border-coral/30",
    indigo:
      "bg-paper text-ink border-ink/15",
    slate:
      "bg-paper text-ink/70 border-ink/10",
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-ink/10 shadow-xs flex flex-col justify-between transition-all duration-200 hover:border-edugreen/30 hover:-translate-y-0.5 group">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-medium text-ink-muted">
            {title}
          </span>
          <div className="w-9 h-9 rounded-xl bg-paper border border-ink/10 text-ink/70 flex items-center justify-center flex-shrink-0 transition-colors duration-200 group-hover:text-edugreen group-hover:border-edugreen/30">
            <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-105" />
          </div>
        </div>

        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl sm:text-3xl font-sans font-bold tabular-nums text-ink tracking-tight">
            {value}
          </span>
          {badge && (
            <span
              className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${badgeVariants[badge.variant]}`}
            >
              {badge.text}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-ink/65 mt-1.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {progress && (
        <div className="mt-4 pt-3 border-t border-ink/10">
          <div className="flex justify-between text-[11px] font-semibold text-ink/60 mb-1.5">
            <span>{progress.label || "Coverage"}</span>
            <span className="font-mono">{Math.round(progress.value)}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress.value)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progress.label || "Progress bar"}
            className="w-full h-1.5 bg-ink/10 rounded-full overflow-hidden"
          >
            <div
              style={{ width: `${Math.min(Math.max(progress.value, 0), 100)}%` }}
              className="h-full bg-edugreen rounded-full transition-all duration-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}
