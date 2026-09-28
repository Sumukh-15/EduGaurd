"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AcademicRecordHistoryItem } from "@/types/student";

interface AcademicTrajectoryChartProps {
  records: AcademicRecordHistoryItem[];
}

export default function AcademicTrajectoryChart({ records }: AcademicTrajectoryChartProps) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  if (records.length === 0) {
    return null;
  }

  // Chart Dimensions
  const svgWidth = 640;
  const svgHeight = 240;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 45;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Grade scale: 0 to 20
  const maxGrade = 20;

  const points = records.map((rec, i) => {
    const x =
      records.length === 1
        ? padLeft + plotWidth / 2
        : padLeft + (i / (records.length - 1)) * plotWidth;

    const g1Val = rec.G1 !== null ? Math.min(Math.max(rec.G1, 0), maxGrade) : 0;
    const g2Val = rec.G2 !== null ? Math.min(Math.max(rec.G2, 0), maxGrade) : 0;

    const y1 = padTop + (1 - g1Val / maxGrade) * plotHeight;
    const y2 = padTop + (1 - g2Val / maxGrade) * plotHeight;

    const dateStr = new Date(rec.recorded_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return {
      index: i,
      x,
      y1,
      y2,
      record: rec,
      g1Val,
      g2Val,
      dateStr,
    };
  });

  // SVG Path Strings
  const g1Path =
    points.length === 1
      ? `M ${points[0].x} ${points[0].y1}`
      : points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y1}`).join(" ");

  const g2Path =
    points.length === 1
      ? `M ${points[0].x} ${points[0].y2}`
      : points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y2}`).join(" ");

  // Velocity Calculation: between first and latest G2
  const firstG2 = records[0].G2 ?? records[0].G1 ?? 0;
  const latestG2 = records[records.length - 1].G2 ?? records[records.length - 1].G1 ?? 0;
  const netVelocity = Math.round((latestG2 - firstG2) * 10) / 10;

  const activePoint = activePointIndex !== null ? points[activePointIndex] : points[points.length - 1];

  return (
    <section
      aria-labelledby="trajectory-chart-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Longitudinal Progression
            </span>
          </div>
          <h2 id="trajectory-chart-heading" className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Academic Grade Trajectory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Historical evolution of Period 1 (G1) and Period 2 (G2) course marks across chronological evaluation periods (Grading Scale: 0 to 20).
          </p>
        </div>

        {/* Velocity Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              netVelocity > 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                : netVelocity < 0
                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            }`}
          >
            {netVelocity > 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : netVelocity < 0 ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <GraduationCap className="w-3.5 h-3.5" />
            )}
            <span>
              Net Trajectory: {netVelocity > 0 ? `+${netVelocity}` : netVelocity} pts
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Period 1 Grade (G1)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Period 2 Midterm (G2)</span>
          </div>
        </div>

        {activePoint && (
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
            Period: <strong>{activePoint.record.term || `Record #${activePoint.index + 1}`}</strong> • G1:{" "}
            <strong>{activePoint.g1Val}</strong> • G2: <strong>{activePoint.g2Val}</strong>
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto pt-2">
        <div className="min-w-[500px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto"
            role="img"
            aria-label="Academic Grade Progression Chart from Period 1 to latest period"
          >
            {/* Grid Lines (Horizontal: 0, 5, 10, 15, 20) */}
            {[0, 5, 10, 15, 20].map((grade) => {
              const y = padTop + (1 - grade / maxGrade) * plotHeight;
              return (
                <g key={grade}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="1"
                    strokeDasharray={grade === 10 ? "4 4" : undefined}
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono"
                  >
                    {grade}
                  </text>
                </g>
              );
            })}

            {/* Threshold Reference (Passing mark: 10/20) */}
            <text
              x={svgWidth - padRight}
              y={padTop + (1 - 10 / maxGrade) * plotHeight - 5}
              textAnchor="end"
              className="text-[9px] fill-amber-500 font-semibold"
            >
              Passing Threshold (10/20)
            </text>

            {/* Line G1 (Indigo) */}
            <path
              d={g1Path}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Line G2 (Emerald) */}
            <path
              d={g2Path}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
            {points.map((p) => {
              const isSelected = activePointIndex === p.index;
              return (
                <g
                  key={p.index}
                  tabIndex={0}
                  role="button"
                  aria-label={`Record ${p.index + 1}: ${p.record.term}, G1: ${p.g1Val}, G2: ${p.g2Val}`}
                  onMouseEnter={() => setActivePointIndex(p.index)}
                  onFocus={() => setActivePointIndex(p.index)}
                  className="cursor-pointer focus:outline-none"
                >
                  {/* Vertical Guide on hover/focus */}
                  {isSelected && (
                    <line
                      x1={p.x}
                      y1={padTop}
                      x2={p.x}
                      y2={padTop + plotHeight}
                      stroke="#818cf8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.6"
                    />
                  )}

                  {/* G1 Circle */}
                  <circle
                    cx={p.x}
                    cy={p.y1}
                    r={isSelected ? 6 : 4}
                    fill="#6366f1"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-200"
                  />

                  {/* G2 Circle */}
                  <circle
                    cx={p.x}
                    cy={p.y2}
                    r={isSelected ? 6 : 4}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-200"
                  />

                  {/* X Axis Label */}
                  <text
                    x={p.x}
                    y={svgHeight - 15}
                    textAnchor="middle"
                    className={`text-[10px] font-mono transition-colors ${
                      isSelected
                        ? "fill-indigo-600 dark:fill-indigo-400 font-bold"
                        : "fill-slate-400"
                    }`}
                  >
                    {p.record.term || `P${p.index + 1}`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Non-causal Visual Notice */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Trajectory Context:</strong> Points represent historical evaluation marks recorded by faculty. Grade progression reflects historical performance and does not imply automated deterministic outcomes.
        </span>
      </div>
    </section>
  );
}
