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
  Low: "#27AC1F",    // EduGuard Green
  Medium: "#F4B740", // Amber
  High: "#E85D5D",   // Coral
};

export default function RiskDistributionChart({
  distribution,
  percentages,
  evaluatedCount,
}: RiskDistributionChartProps) {
  const [mounted, setMounted] = useState(false);
  const [chartMode, setChartMode] = useState<"donut" | "bar">("donut");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      className="p-6 sm:p-7 rounded-2xl bg-white border border-ink/10 shadow-xs space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-ink-muted block">
            Population Stratification
          </span>
          <h2 id="risk-distribution-heading" className="text-xl sm:text-2xl font-display font-normal text-ink mt-0.5">
            Risk Triage Distribution
          </h2>
          <p className="text-xs text-ink/65 mt-1 max-w-xl leading-relaxed">
            Cohort categorization into operational triage tiers using Phase 1 Logistic Regression probability thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center bg-paper p-1 rounded-xl border border-ink/10">
            <button
              type="button"
              onClick={() => setChartMode("donut")}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                chartMode === "donut"
                  ? "bg-ink text-white shadow-xs"
                  : "text-ink/60 hover:text-ink"
              }`}
              title="Donut Chart View"
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Donut</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode("bar")}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                chartMode === "bar"
                  ? "bg-ink text-white shadow-xs"
                  : "text-ink/60 hover:text-ink"
              }`}
              title="Bar Chart View"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bar</span>
            </button>
          </div>

          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-softgreen text-edugreen-dark border border-edugreen/30">
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
                    backgroundColor: "rgba(18, 24, 30, 0.95)",
                    borderRadius: "0.75rem",
                    border: "1px solid rgba(255,255,255,0.1)",
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
                    backgroundColor: "rgba(18, 24, 30, 0.95)",
                    borderRadius: "0.75rem",
                    border: "1px solid rgba(255,255,255,0.1)",
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
        <div className="h-32 rounded-xl bg-paper border border-ink/10 flex items-center justify-center text-xs text-ink/60">
          No student evaluations recorded yet.
        </div>
      )}

      {/* Triage Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Low Tier Card */}
        <div className="p-4 rounded-xl bg-softgreen/60 border border-edugreen/30 hover:border-edugreen/50 hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-edugreen-dark">
              <CheckCircle className="w-4 h-4 text-edugreen" />
              <span>Low Risk Tier</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-edugreen text-white">
              &lt; 40%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-sans font-bold tabular-nums text-ink">
              {distribution.low}
            </span>
            <span className="text-xs font-semibold text-edugreen-dark">
              ({lowPct}%)
            </span>
          </div>
          <p className="text-[11px] text-ink/75 mt-1">
            Satisfactory course trajectory with minimal early-warning indicators.
          </p>
        </div>

        {/* Medium Tier Card */}
        <div className="p-4 rounded-xl bg-amber/15 border border-amber/30 hover:border-amber/50 hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Medium Risk Tier</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500 text-white">
              40% - 69%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-sans font-bold tabular-nums text-ink">
              {distribution.medium}
            </span>
            <span className="text-xs font-semibold text-amber-900">
              ({medPct}%)
            </span>
          </div>
          <p className="text-[11px] text-ink/75 mt-1">
            Emerging academic friction; recommended for targeted check-ins.
          </p>
        </div>

        {/* High Tier Card */}
        <div className="p-4 rounded-xl bg-coral/15 border border-coral/30 hover:border-coral/50 hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-coral">
              <ShieldAlert className="w-4 h-4 text-coral" />
              <span>High Risk Tier</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-coral text-white">
              &ge; 70%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-sans font-bold tabular-nums text-ink">
              {distribution.high}
            </span>
            <span className="text-xs font-semibold text-coral">
              ({highPct}%)
            </span>
          </div>
          <p className="text-[11px] text-ink/75 mt-1">
            Urgent risk of course distress; requires faculty intervention.
          </p>
        </div>
      </div>

      {/* Threshold Context Note */}
      <div className="p-3.5 rounded-xl bg-paper border border-ink/10 flex items-start gap-2.5 text-xs text-ink/75">
        <Info className="w-4 h-4 text-edugreen flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-ink">Binary Classification Threshold:</strong> Students with risk probability &ge; 0.50 are formally flagged as at-risk in the backend classification ledger.
        </span>
      </div>
    </section>
  );
}
