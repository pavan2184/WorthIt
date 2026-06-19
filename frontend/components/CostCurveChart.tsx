"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatNumber } from "@/lib/format";
import type { CalculationResult, DecisionPayload } from "@/lib/types";

type CostCurveChartProps = {
  decision: DecisionPayload;
  result: CalculationResult;
};

export function CostCurveChart({ decision, result }: CostCurveChartProps) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Cost vs usage
          </h2>
          <p className="text-sm text-slate-500">
            Total cost across different monthly usage levels.
          </p>
        </div>
      </div>
      <div className="mt-5 h-80 min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={320}
          initialDimension={{ width: 640, height: 320 }}
        >
          <LineChart data={result.chart_points} margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="uses"
              tick={{ fill: "#64748B", fontSize: 12 }}
              tickFormatter={(value) => formatNumber(Number(value), 0)}
              stroke="#CBD5E1"
            />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 12 }}
              tickFormatter={(value) =>
                `${formatNumber(Number(value) / 1000000, 1)}M`
              }
              stroke="#CBD5E1"
            />
            <Tooltip
              formatter={(value, name) => {
                const numericValue =
                  typeof value === "number" ? value : Number(value || 0);
                const seriesName =
                  name === "option_a_total"
                    ? decision.option_a.name
                    : decision.option_b.name;

                return [formatMoney(numericValue, decision.currency), seriesName];
              }}
              labelFormatter={(label) => `${String(label)} uses`}
            />
            <Legend />
            <ReferenceLine
              x={result.expected_uses}
              stroke="#D97706"
              strokeDasharray="4 4"
              label={{
                value: "Expected",
                position: "insideTopRight",
                fill: "#D97706",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="option_a_total"
              name={decision.option_a.name}
              stroke="#00A86B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="option_b_total"
              name={decision.option_b.name}
              stroke="#FF6B35"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
