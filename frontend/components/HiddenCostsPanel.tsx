"use client";

import type { CostFrequency, CostItem } from "@/lib/types";
import { formatMoney, frequencyLabel } from "@/lib/format";

type HiddenCostPatch = Partial<Pick<CostItem, "included" | "amount" | "frequency">>;

type HiddenCostsPanelProps = {
  optionAHiddenCosts: CostItem[];
  optionBHiddenCosts: CostItem[];
  currency: string;
  onOptionAChange: (costId: string, patch: HiddenCostPatch) => void;
  onOptionBChange: (costId: string, patch: HiddenCostPatch) => void;
};

export function HiddenCostsPanel({
  optionAHiddenCosts,
  optionBHiddenCosts,
  currency,
  onOptionAChange,
  onOptionBChange,
}: HiddenCostsPanelProps) {
  const costs = [
    ...optionAHiddenCosts.map((cost) => ({
      cost,
      side: "a" as const,
      onChange: onOptionAChange,
    })),
    ...optionBHiddenCosts.map((cost) => ({
      cost,
      side: "b" as const,
      onChange: onOptionBChange,
    })),
  ];

  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">
        Hidden cost checklist
      </h3>
      <div className="mt-3 space-y-3">
        {costs.map(({ cost, side, onChange }) => (
          <div
            key={`${side}-${cost.id}`}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={cost.included}
                onChange={(event) =>
                  onChange(cost.id, { included: event.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">
                  {cost.label}
                </span>
                <span className="block text-xs text-slate-500">
                  {formatMoney(cost.amount, currency)} /{" "}
                  {frequencyLabel(cost.frequency)}
                </span>
              </span>
            </label>
            <div className="mt-3 grid grid-cols-[1fr_132px] gap-2">
              <input
                type="number"
                min={0}
                value={cost.amount}
                onChange={(event) =>
                  onChange(cost.id, { amount: Number(event.target.value) || 0 })
                }
                className="h-9 min-w-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
              />
              <select
                value={cost.frequency}
                onChange={(event) =>
                  onChange(cost.id, {
                    frequency: event.target.value as CostFrequency,
                  })
                }
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-worth-brand"
              >
                {[
                  "one_time",
                  "per_use",
                  "per_day",
                  "per_week",
                  "per_month",
                  "per_year",
                ].map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequencyLabel(frequency)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
