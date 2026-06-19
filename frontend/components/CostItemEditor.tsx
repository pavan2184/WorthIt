"use client";

import type { CostFrequency, CostItem } from "@/lib/types";
import { frequencyLabel } from "@/lib/format";
import { Trash2 } from "lucide-react";

const frequencies: CostFrequency[] = [
  "one_time",
  "per_use",
  "per_day",
  "per_week",
  "per_month",
  "per_year",
];

type CostItemEditorProps = {
  title: string;
  costs: CostItem[];
  currency: string;
  onChange: (costId: string, patch: Partial<CostItem>) => void;
  onRemove?: (costId: string) => void;
};

export function CostItemEditor({
  title,
  costs,
  currency,
  onChange,
  onRemove,
}: CostItemEditorProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-3">
        {costs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            No price details yet.
          </div>
        ) : null}
        {costs.map((cost) => (
          <div
            key={cost.id}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="flex items-start gap-2">
              <label
                htmlFor={`${cost.id}-label`}
                className="sr-only"
              >
                Cost name
              </label>
              <input
                id={`${cost.id}-label`}
                value={cost.label}
                onChange={(event) =>
                  onChange(cost.id, {
                    label: event.target.value,
                  })
                }
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900 outline-none focus:border-worth-brand"
                placeholder="Cost name"
              />
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(cost.id)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove ${cost.label || "cost"}`}
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_132px] gap-2">
              <label className="block">
                <span className="sr-only">Amount in {currency}</span>
                <input
                  id={`${cost.id}-amount`}
                  type="number"
                  min={0}
                  value={cost.amount}
                  onChange={(event) =>
                    onChange(cost.id, {
                      amount: Number(event.target.value) || 0,
                    })
                  }
                  className="h-10 min-w-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
                  placeholder={`Amount (${currency})`}
                />
              </label>
              <label className="block">
                <span className="sr-only">Cost frequency</span>
                <select
                  value={cost.frequency}
                  onChange={(event) =>
                    onChange(cost.id, {
                      frequency: event.target.value as CostFrequency,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-worth-brand"
                >
                  {frequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequencyLabel(frequency)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-2 text-right text-xs text-slate-500">
              {currency}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
