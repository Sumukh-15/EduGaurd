"use client";

import React from "react";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Compass,
  FileText,
  Flame,
  Info,
  Layers,
} from "lucide-react";
import {
  RecommendationCategory,
  RecommendationPriority,
  RecommendationRead,
} from "@/types/recommendation";

interface RecommendationCardProps {
  recommendation: RecommendationRead;
  index: number;
}

/**
 * Returns icon and thematic styles according to the institutional recommendation category.
 */
function getCategoryMeta(category: RecommendationCategory) {
  switch (category) {
    case "Academic Progress":
      return {
        icon: Flame,
        badgeStyle: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
        accentBorder: "border-l-purple-500",
        label: "Academic Progress",
      };
    case "Academic Remediation":
      return {
        icon: BookOpen,
        badgeStyle: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
        accentBorder: "border-l-rose-500",
        label: "Academic Remediation",
      };
    case "Attendance":
      return {
        icon: Calendar,
        badgeStyle: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
        accentBorder: "border-l-amber-500",
        label: "Attendance",
      };
    case "Study Strategy":
      return {
        icon: Compass,
        badgeStyle: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
        accentBorder: "border-l-teal-500",
        label: "Study Strategy",
      };
    default:
      return {
        icon: FileText,
        badgeStyle: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
        accentBorder: "border-l-indigo-500",
        label: category || "General Advisory",
      };
  }
}

/**
 * Returns distinct visual hierarchy and accessible attributes for priority tiers.
 */
function getPriorityMeta(priority: RecommendationPriority) {
  const p = priority.toLowerCase();
  if (p === "high") {
    return {
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
      dotClass: "bg-rose-600 dark:bg-rose-400",
      label: "High Priority",
      icon: AlertTriangle,
    };
  }
  if (p === "medium") {
    return {
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
      dotClass: "bg-amber-600 dark:bg-amber-400",
      label: "Medium Priority",
      icon: Info,
    };
  }
  return {
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    dotClass: "bg-blue-600 dark:bg-blue-400",
    label: "Low Priority",
    icon: Info,
  };
}

/**
 * Human-friendly explanation of deterministic trigger conditions.
 */
function formatTriggerDescription(trigger: string | null): string {
  if (!trigger) return "Standard academic indicator threshold met";
  const t = trigger.toLowerCase();
  if (t.includes("delta_g") || t.includes("δg")) {
    return "Triggered by rapid period-over-period grade decline (ΔG < -2.0 points)";
  }
  if (t.includes("g2 < 10")) {
    return "Triggered by Period 2 academic mark below passing standard (< 10.0 / 20)";
  }
  if (t.includes("absences")) {
    return "Triggered by cumulative session absenteeism meeting early-warning threshold (≥ 10 sessions)";
  }
  if (t.includes("studytime")) {
    return "Triggered by reported dedicated study time allocation (≤ 1 unit, < 2 hours/week)";
  }
  return `Triggered by rule condition: ${trigger}`;
}

export default function RecommendationCard({ recommendation, index }: RecommendationCardProps) {
  const categoryMeta = getCategoryMeta(recommendation.category);
  const priorityMeta = getPriorityMeta(recommendation.priority);
  const CategoryIcon = categoryMeta.icon;
  const PriorityIcon = priorityMeta.icon;

  const cardId = `recommendation-card-${recommendation.id || index}`;
  const titleId = `recommendation-title-${recommendation.id || index}`;

  return (
    <article
      id={cardId}
      aria-labelledby={titleId}
      className={`relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 ${categoryMeta.accentBorder}`}
    >
      {/* Header: Canonical Index, Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Canonical Index Pill */}
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            {index + 1}
          </span>

          {/* Category Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${categoryMeta.badgeStyle}`}
          >
            <CategoryIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{categoryMeta.label}</span>
          </span>

          {/* Priority Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${priorityMeta.badgeClass}`}
          >
            <PriorityIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{priorityMeta.label}</span>
          </span>
        </div>

        {/* Rule-Engine Deterministic Indicator */}
        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <Layers className="w-3 h-3" aria-hidden="true" />
          <span>Rule Heuristic</span>
        </div>
      </div>

      {/* Title */}
      <h3
        id={titleId}
        className="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-tight"
      >
        {recommendation.title}
      </h3>

      {/* Description */}
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-5">
        {recommendation.description}
      </p>

      {/* Trigger & Context Footer */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Trigger Heuristic:
          </span>
          <code className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] border border-slate-200 dark:border-slate-700">
            {recommendation.trigger_condition || "telemetry_condition"}
          </code>
        </div>

        <div className="text-slate-400 dark:text-slate-500 italic text-[11px]">
          {formatTriggerDescription(recommendation.trigger_condition)}
        </div>
      </div>
    </article>
  );
}
