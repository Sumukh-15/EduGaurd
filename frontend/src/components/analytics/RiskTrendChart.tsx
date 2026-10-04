"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Layers,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RiskTrendPoint } from "@/types/analytics";

interface RiskTrendChartProps {
  trend: RiskTrendPoint[];
  bucket: "day" | "week";
  onBucketChange?: (bucket: "day" | "week") => void;
  isUpdating?: boolean;
}

export default function RiskTrendChart({
  trend,
  bucket,
  onBucketChange,
  isUpdating = false,
}: RiskTrendChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasData = trend && trend.length > 0;

  return (
    <section
      aria-labelledby="risk-trend-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Longitudinal Risk Trajectory</span>
          </div>
          <h2 id="risk-trend-heading" className="text-xl font-bold text-slate-900 dark:text-white">
            Class Risk Trend Over Time
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Temporal distribution of Low, Medium, and High risk student counts computed from every student&apos;s latest predictive evaluation as of each date.
          </p>
        </div>

        {/* Bucket Selector (Day / Week) */}
        {onBucketChange && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onBucketChange("day")}
                disabled={isUpdating}
                className={`py-1 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  bucket === "day"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Daily</span>
              </button>
              <button
                type="button"
                onClick={() => onBucketChange("week")}
                disabled={isUpdating}
                className={`py-1 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  bucket === "week"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Weekly</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recharts Line Chart */}
      {hasData && mounted ? (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                stroke="#94a3b8"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
                stroke="#94a3b8"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.94)",
                  borderRadius: "0.75rem",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.75rem",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                }}
                labelStyle={{ fontWeight: "bold", marginBottom: "0.25rem", color: "#e2e8f0" }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
              />
              <Line
                type="monotone"
                dataKey="high"
                name="High Risk (>=70%)"
                stroke="#e11d48"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#e11d48" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="medium"
                name="Medium Risk (40-69%)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f59e0b" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="low"
                name="Low Risk (<40%)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#10b981" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-40 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-xs text-slate-500 gap-1.5">
          <Layers className="w-5 h-5 text-slate-400" />
          <span>Insufficient historical prediction events to chart time series trend.</span>
          <span className="text-[11px] text-slate-400">
            Trends populate automatically as students receive periodic evaluations over time.
          </span>
        </div>
      )}
    </section>
  );
}
