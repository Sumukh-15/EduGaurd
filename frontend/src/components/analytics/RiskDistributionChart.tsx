"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle,
  Info,
  PieChart as PieIcon,
  ShieldAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RiskDistribution, RiskPercentages } from "@/types/analytics";

interface RiskDistributionChartProps {
  distribution: RiskDistribution;
  percentages: RiskPercentages;
  evaluatedCount: number;
}

const TIER_COLORS = {
  Low: "#10b981",    // Emerald-500
  Medium: "#f59e0b", // Amber-500
  High: "#e11d48",   // Rose-600
};

export default function RiskDistributionChart({
  distribution,
  percentages,
  evaluatedCount,
}: RiskDistributionChartProps) {
  const [mounted, setMounted] = useState(false);
  const [chartMode, setChartMode] = useState<"donut" | "bar">("donut");

  useEffect(() => {
    setMounted(true);
  }, []);

  const lowPct = evaluatedCount > 0 ? percentages.low : 0;
  const medPct = evaluatedCount > 0 ? percentages.medium : 0;
  const highPct = evaluatedCount > 0 ? percentages.high : 0;

  const chartData = [
    { name: "Low Risk (< 40%)", tier: "Low", value: distribution.low, percentage: lowPct, color: TIER_COLORS.Low },
    { name: "Medium Risk (40-69%)", tier: "Medium", value: distribution.medium, percentage: medPct, color: TIER_COLORS.Medium },
    { name: "High Risk (>= 70%)", tier: "High", value: distribution.high, percentage: highPct, color: TIER_COLORS.High },
  ];

  return (
    <section
      aria-labelledby="risk-distribution-heading"
      className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Population Stratification
          </span>
          <h2 id="risk-distribution-heading" className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Risk Triage Distribution
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            Cohort categorization into operational triage tiers using Phase 1 Logistic Regression probability thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setChartMode("donut")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                chartMode === "donut"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Donut Chart View"
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Donut</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode("bar")}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                chartMode === "bar"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Bar Chart View"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bar</span>
            </button>
          </div>

          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {evaluatedCount} Evaluated
          </span>
        </div>
      </div>

      {/* Recharts Visualization */}
      {evaluatedCount > 0 && mounted ? (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === "donut" ? (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: unknown, _name: unknown, props: { payload?: { name?: string; percentage?: number } }) => [
                    `${val} students (${props?.payload?.percentage ?? 0}%)`,
                    props?.payload?.name ?? "Count",
                  ]}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.92)",
                    borderRadius: "0.75rem",
                    border: "none",
                    color: "#fff",
                    fontSize: "0.75rem",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
                />
              </PieChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="tier" tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: unknown, _name: unknown, props: { payload?: { percentage?: number } }) => [
                    `${val} students (${props?.payload?.percentage ?? 0}%)`,
                    "Count",
                  ]}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.92)",
                    borderRadius: "0.75rem",
                    border: "none",
                    color: "#fff",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-32 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-xs text-slate-500">
          No student evaluations recorded yet.
        </div>
      )}

      {/* Triage Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Low Tier Card */}
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Low Risk Tier</span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
              &lt; 40%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {distribution.low}
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              ({lowPct}%)
            </span>
          </div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-1">
            Satisfactory course trajectory with minimal early-warning indicators.
          </p>
        </div>

        {/* Medium Tier Card */}
        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Medium Risk Tier</span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              40% - 69%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {distribution.medium}
            </span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              ({medPct}%)
            </span>
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-1">
            Emerging academic friction; recommended for targeted check-ins.
          </p>
        </div>

        {/* High Tier Card */}
        <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>High Risk Tier</span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
              &ge; 70%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-900 dark:text-rose-100">
              {distribution.high}
            </span>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              ({highPct}%)
            </span>
          </div>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-1">
            Urgent risk of course distress; requires faculty intervention.
          </p>
        </div>
      </div>

      {/* Threshold Context Note */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Binary Classification Threshold:</strong> Students with risk probability &ge; 0.50 are formally flagged as at-risk in the backend classification ledger.
        </span>
      </div>
    </section>
  );
}
