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
 * Returns category theme styling and icons.
 */
function getCategoryMeta(category: RecommendationCategory) {
  switch (category) {
    case "Academic Progress":
      return {
        icon: Flame,
        badgeStyle: "bg-softgreen text-edugreen border-edugreen/30",
        accentBorder: "border-l-edugreen",
        label: "Grade Trajectory",
      };
    case "Academic Remediation":
      return {
        icon: BookOpen,
        badgeStyle: "bg-coral/15 text-coral border-coral/30",
        accentBorder: "border-l-coral",
        label: "Exam Performance",
      };
    case "Attendance":
      return {
        icon: Calendar,
        badgeStyle: "bg-amber/15 text-ink border-amber/30",
        accentBorder: "border-l-amber",
        label: "Attendance Concern",
      };
    case "Study Strategy":
      return {
        icon: Compass,
        badgeStyle: "bg-paper text-ink border-ink/20",
        accentBorder: "border-l-edugreen",
        label: "Study Habit Strategy",
      };
    default:
      return {
        icon: FileText,
        badgeStyle: "bg-paper text-ink/80 border-ink/20",
        accentBorder: "border-l-edugreen",
        label: category || "General Advisory",
      };
  }
}

/**
 * Returns priority hierarchy.
 */
function getPriorityMeta(priority: RecommendationPriority) {
  const p = priority.toLowerCase();
  if (p === "high") {
    return {
      badgeClass: "bg-coral/15 text-coral border-coral/30",
      label: "High Priority",
      icon: AlertTriangle,
    };
  }
  if (p === "medium") {
    return {
      badgeClass: "bg-amber/15 text-ink border-amber/35",
      label: "Medium Priority",
      icon: Info,
    };
  }
  return {
    badgeClass: "bg-softgreen text-edugreen border-edugreen/30",
    label: "Low Priority",
    icon: Info,
  };
}

/**
 * Parses recommendation text into structured sections:
 * - Reason
 * - Relevant data
 * - Suggested action
 */
function parseRecommendationDetails(
  description: string,
  trigger: string | null
): { reason: string; relevantData: string; suggestedAction: string } {
  const actionPrefix = "Advisory intervention:";
  let reasonPart = description;
  let actionPart =
    "Discuss these findings with your instructor or academic mentor during office hours.";

  if (description.includes(actionPrefix)) {
    const parts = description.split(actionPrefix);
    reasonPart = parts[0].trim();
    actionPart = parts[1].trim();
  }

  // Extract relevant data points
  let relevantData = "Academic indicator threshold reached";
  const t = (trigger || "").toLowerCase();

  if (t.includes("delta_g") || description.includes("grade decline")) {
    const match = description.match(/\((G1: [^)]+)\)/);
    relevantData = match
      ? `Recent score trajectory: ${match[1]}`
      : "Score decline between Period 1 and Period 2 exceeds 2.0 points";
  } else if (t.includes("g2 < 10") || description.includes("passing threshold")) {
    const match = description.match(/score of ([0-9.]+)/);
    relevantData = match
      ? `Current score: ${match[1]} / 20 (Institutional passing standard: 10.0 / 20)`
      : "Current score is below the 10.0 / 20 passing threshold";
  } else if (t.includes("absences") || description.includes("absences")) {
    const match = description.match(/\(([0-9]+) sessions\)/);
    relevantData = match
      ? `Recorded absences: ${match[1]} sessions (Institutional threshold: 10 sessions)`
      : "Cumulative absences exceed institutional early-warning threshold (≥ 10 sessions)";
  } else if (t.includes("studytime") || description.includes("study time")) {
    relevantData = "Reported study time: < 2 hours / week (Recommended: ≥ 5 hours / week)";
  }

  return {
    reason: reasonPart,
    relevantData,
    suggestedAction: actionPart,
  };
}

export default function RecommendationCard({
  recommendation,
  index,
}: RecommendationCardProps) {
  const categoryMeta = getCategoryMeta(recommendation.category);
  const priorityMeta = getPriorityMeta(recommendation.priority);
  const CategoryIcon = categoryMeta.icon;
  const PriorityIcon = priorityMeta.icon;

  const { reason, relevantData, suggestedAction } = parseRecommendationDetails(
    recommendation.description,
    recommendation.trigger_condition
  );

  const cardId = `recommendation-card-${recommendation.id || index}`;
  const titleId = `recommendation-title-${recommendation.id || index}`;

  return (
    <article
      id={cardId}
      aria-labelledby={titleId}
      className={`bg-white border border-ink/10 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 paper-surface-interactive border-l-4 ${categoryMeta.accentBorder} space-y-4`}
    >
      {/* Header: Canonical Index, Priority, Category */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-paper border border-ink/10 text-xs font-bold font-sans tabular-nums text-ink">
            {index + 1}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${priorityMeta.badgeClass}`}
          >
            <PriorityIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{priorityMeta.label}</span>
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${categoryMeta.badgeStyle}`}
          >
            <CategoryIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{categoryMeta.label}</span>
          </span>
        </div>

        <span className="text-xs font-mono text-ink-muted">
          Rule condition: {recommendation.trigger_condition || "academic_rule"}
        </span>
      </div>

      {/* Recommendation Title */}
      <h3
        id={titleId}
        className="font-display text-lg text-ink tracking-tight"
      >
        {recommendation.title}
      </h3>

      {/* Structured Details: Reason, Relevant Data, Suggested Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* 1. Reason */}
        <div className="p-3.5 rounded-xl bg-paper border border-ink/10">
          <span className="text-xs font-medium text-ink-muted block mb-1">
            Reason
          </span>
          <p className="text-xs text-ink/80 leading-relaxed">
            {reason}
          </p>
        </div>

        {/* 2. Relevant Data */}
        <div className="p-3.5 rounded-xl bg-paper border border-ink/10">
          <span className="text-xs font-medium text-ink-muted block mb-1">
            Observed academic data
          </span>
          <p className="text-xs font-medium text-ink leading-relaxed tabular-nums">
            {relevantData}
          </p>
        </div>

        {/* 3. Suggested Action */}
        <div className="p-3.5 rounded-xl bg-softgreen/60 border border-edugreen/25">
          <span className="text-xs font-medium text-edugreen block mb-1">
            Suggested action
          </span>
          <p className="text-xs text-ink leading-relaxed">
            {suggestedAction}
          </p>
        </div>
      </div>
    </article>
  );
}
