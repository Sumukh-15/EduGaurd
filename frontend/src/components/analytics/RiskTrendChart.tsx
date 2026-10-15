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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const hasData = trend && trend.length > 0;

  return (
    <section
      aria-labelledby="risk-trend-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-xs space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-softgreen text-edugreen-dark text-xs font-medium border border-edugreen/30 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-edugreen" />
            <span>Longitudinal Risk Trajectory</span>
          </div>
          <h2 id="risk-trend-heading" className="text-xl sm:text-2xl font-display font-normal text-ink">
            Class Risk Trend Over Time
          </h2>
          <p className="text-xs text-ink/65 mt-1 max-w-xl leading-relaxed">
            Temporal distribution of Low, Medium, and High risk student counts computed from every student&apos;s latest predictive evaluation as of each date.
          </p>
        </div>

        {/* Bucket Selector (Day / Week) */}
        {onBucketChange && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center bg-paper p-1 rounded-xl border border-ink/10">
              <button
                type="button"
                onClick={() => onBucketChange("day")}
                disabled={isUpdating}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  bucket === "day"
                    ? "bg-ink text-white shadow-xs"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Daily</span>
              </button>
              <button
                type="button"
                onClick={() => onBucketChange("week")}
                disabled={isUpdating}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  bucket === "week"
                    ? "bg-ink text-white shadow-xs"
                    : "text-ink/60 hover:text-ink"
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
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} stroke="#12181E" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                stroke="#8c9aa6"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
                stroke="#8c9aa6"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(18, 24, 30, 0.95)",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
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
                stroke="#E85D5D"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#E85D5D" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="medium"
                name="Medium Risk (40-69%)"
                stroke="#F4B740"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#F4B740" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="low"
                name="Low Risk (<40%)"
                stroke="#27AC1F"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#27AC1F" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-40 rounded-xl bg-paper border border-ink/10 flex flex-col items-center justify-center text-xs text-ink/60 gap-1.5">
          <Layers className="w-5 h-5 text-ink/40" />
          <span className="font-semibold text-ink/80">Insufficient historical prediction events to chart time series trend.</span>
          <span className="text-[11px] text-ink/50">
            Trends populate automatically as students receive periodic evaluations over time.
          </span>
        </div>
      )}
    </section>
  );
}
