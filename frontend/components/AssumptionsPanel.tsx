"use client";

import { MoreHorizontal, Plus, Save } from "lucide-react";
import { useState } from "react";

import type { CostItem, DecisionPayload, UsageModel } from "@/lib/types";
import { CostItemEditor } from "./CostItemEditor";
import { HiddenCostsPanel } from "./HiddenCostsPanel";

type AssumptionsPanelProps = {
  decision: DecisionPayload;
  hasPendingChanges: boolean;
  savingValues: boolean;
  onDecisionChange: (decision: DecisionPayload) => void;
  onSaveValues: () => void;
};

export function AssumptionsPanel({
  decision,
  hasPendingChanges,
  savingValues,
  onDecisionChange,
  onSaveValues,
}: AssumptionsPanelProps) {
  const [openOptionMenu, setOpenOptionMenu] = useState<
    "option_a" | "option_b" | null
  >(null);
  const usageLabel = getUsageLabel(decision);

  const updateOptionName = (side: "option_a" | "option_b", name: string) => {
    onDecisionChange({
      ...decision,
      [side]: {
        ...decision[side],
        name,
      },
    });
  };

  const updateCost = (
    side: "option_a" | "option_b",
    costId: string,
    patch: Partial<CostItem>
  ) => {
    onDecisionChange({
      ...decision,
      [side]: {
        ...decision[side],
        costs: decision[side].costs.map((cost) =>
          cost.id === costId ? { ...cost, ...patch } : cost
        ),
      },
    });
  };

  const addCost = (side: "option_a" | "option_b") => {
    const newCost: CostItem = {
      id: `custom_${side}_${Date.now()}_${decision[side].costs.length}`,
      label: "New cost",
      amount: 0,
      frequency: "per_month",
      included: true,
      hidden: false,
    };

    onDecisionChange({
      ...decision,
      [side]: {
        ...decision[side],
        costs: [...decision[side].costs, newCost],
      },
    });
    setOpenOptionMenu(null);
  };

  const removeCost = (side: "option_a" | "option_b", costId: string) => {
    onDecisionChange({
      ...decision,
      [side]: {
        ...decision[side],
        costs: decision[side].costs.filter((cost) => cost.id !== costId),
      },
    });
  };

  const updateUsage = (patch: Partial<UsageModel>) => {
    onDecisionChange({
      ...decision,
      usage: {
        ...decision.usage,
        ...patch,
      },
    });
  };

  const optionANormalCosts = decision.option_a.costs.filter(
    (cost) => !cost.hidden
  );
  const optionBNormalCosts = decision.option_b.costs.filter(
    (cost) => !cost.hidden
  );
  const optionAHiddenCosts = decision.option_a.costs.filter(
    (cost) => cost.hidden
  );
  const optionBHiddenCosts = decision.option_b.costs.filter(
    (cost) => cost.hidden
  );

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Assumptions
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Edit the model
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        <section>
          <label
            htmlFor="decision-title"
            className="text-sm font-semibold text-slate-900"
          >
            Decision title
          </label>
          <input
            id="decision-title"
            value={decision.title}
            onChange={(event) =>
              onDecisionChange({ ...decision, title: event.target.value })
            }
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
          />
        </section>

        <section
          id="option-a-price-details"
          className="scroll-mt-20 rounded-lg border border-worth-brand/30 bg-worth-brand-soft/60 p-3"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <OptionNameBubble
                id="option-a-name"
                label="Option A"
                value={decision.option_a.name}
                tone="brand"
                onChange={(value) => updateOptionName("option_a", value)}
              />
            </div>
            <OptionActionsMenu
              label="Option A actions"
              open={openOptionMenu === "option_a"}
              onToggle={() =>
                setOpenOptionMenu(
                  openOptionMenu === "option_a" ? null : "option_a"
                )
              }
              onAddCost={() => addCost("option_a")}
            />
          </div>

          <div className="mt-5">
            <CostItemEditor
              title={`${decision.option_a.name} price details`}
              costs={optionANormalCosts}
              currency={decision.currency}
              onChange={(costId, patch) => updateCost("option_a", costId, patch)}
              onRemove={(costId) => removeCost("option_a", costId)}
            />
          </div>
        </section>

        <section
          id="option-b-price-details"
          className="scroll-mt-20 rounded-lg border border-worth-accent/30 bg-worth-accent-soft/70 p-3"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <OptionNameBubble
                id="option-b-name"
                label="Option B"
                value={decision.option_b.name}
                tone="accent"
                onChange={(value) => updateOptionName("option_b", value)}
              />
            </div>
            <OptionActionsMenu
              label="Option B actions"
              open={openOptionMenu === "option_b"}
              onToggle={() =>
                setOpenOptionMenu(
                  openOptionMenu === "option_b" ? null : "option_b"
                )
              }
              onAddCost={() => addCost("option_b")}
            />
          </div>

          <div className="mt-5">
            <CostItemEditor
              title={`${decision.option_b.name} price details`}
              costs={optionBNormalCosts}
              currency={decision.currency}
              onChange={(costId, patch) => updateCost("option_b", costId, patch)}
              onRemove={(costId) => removeCost("option_b", costId)}
            />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-slate-900">Usage</h3>
          <div className="mt-3 space-y-4">
            <SliderField
              label={usageLabel}
              value={decision.usage.uses_per_day}
              min={0}
              max={8}
              step={0.25}
              suffix="/day"
              onChange={(value) => updateUsage({ uses_per_day: value })}
            />
            <NumberField
              label="Number of days"
              value={decision.usage.days}
              min={1}
              onChange={(value) => updateUsage({ days: Math.max(1, value) })}
            />
            <SliderField
              label="Usage confidence"
              value={decision.usage.confidence}
              min={0}
              max={1}
              step={0.05}
              suffix=""
              helperText="How likely are you to stick to this usage estimate?"
              displayValue={`${Math.round(decision.usage.confidence * 100)}%`}
              onChange={(value) => updateUsage({ confidence: value })}
            />
          </div>
        </section>

        <HiddenCostsPanel
          optionAHiddenCosts={optionAHiddenCosts}
          optionBHiddenCosts={optionBHiddenCosts}
          currency={decision.currency}
          onOptionAChange={(costId, patch) =>
            updateCost("option_a", costId, patch)
          }
          onOptionBChange={(costId, patch) =>
            updateCost("option_b", costId, patch)
          }
        />

        {hasPendingChanges ? (
          <div className="sticky bottom-4 z-10 rounded-lg border border-worth-brand/30 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Unsaved values
                </p>
                <p className="text-xs text-slate-500">
                  Save to refresh the calculations.
                </p>
              </div>
              <button
                type="button"
                onClick={onSaveValues}
                disabled={savingValues}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-worth-accent px-4 text-sm font-medium text-white transition hover:bg-worth-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="size-4" />
                {savingValues ? "Saving..." : "Save values"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function getUsageLabel(decision: DecisionPayload) {
  const decisionText = [
    decision.title,
    decision.option_a.name,
    decision.option_b.name,
  ]
    .join(" ")
    .toLowerCase();

  if (
    decisionText.includes("scooter") ||
    decisionText.includes("grab") ||
    decisionText.includes("trip") ||
    decisionText.includes("ride")
  ) {
    return "Trips per day";
  }

  if (
    decisionText.includes("netflix") ||
    decisionText.includes("pay-per-view") ||
    decisionText.includes("movie") ||
    decisionText.includes("show")
  ) {
    return "Movies/shows per day";
  }

  if (decisionText.includes("gym") || decisionText.includes("day pass")) {
    return "Visits per day";
  }

  if (decisionText.includes("cowork") || decisionText.includes("cafe")) {
    return "Work sessions per day";
  }

  return "Uses per day";
}

type OptionActionsMenuProps = {
  label: string;
  open: boolean;
  onToggle: () => void;
  onAddCost: () => void;
};

function OptionActionsMenu({
  label,
  open,
  onToggle,
  onAddCost,
}: OptionActionsMenuProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-subtle transition hover:border-worth-brand/40 hover:text-worth-brand focus:outline-none focus:ring-2 focus:ring-worth-brand/30"
        aria-label={label}
        aria-expanded={open}
      >
        <MoreHorizontal className="size-5" />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={onAddCost}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-worth-brand-soft hover:text-worth-brand"
          >
            <Plus className="size-4" />
            Add price detail
          </button>
        </div>
      ) : null}
    </div>
  );
}

type OptionNameBubbleProps = {
  id: string;
  label: string;
  value: string;
  tone: "brand" | "accent";
  onChange: (value: string) => void;
};

function OptionNameBubble({
  id,
  label,
  value,
  tone,
  onChange,
}: OptionNameBubbleProps) {
  const toneClass =
    tone === "brand"
      ? "border-worth-brand/30 bg-worth-brand-soft text-worth-brand"
      : "border-worth-accent/30 bg-worth-accent-soft text-worth-accent";

  return (
    <section>
      <label htmlFor={id} className="text-sm font-semibold text-slate-900">
        {label}
      </label>
      <div
        className={`mt-2 rounded-full border px-4 py-2 shadow-subtle ${toneClass}`}
      >
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full min-w-0 border-0 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
        />
      </div>
    </section>
  );
}

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  helperText?: string;
  displayValue?: string;
  onChange: (value: number) => void;
};

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  helperText,
  displayValue,
  onChange,
}: SliderFieldProps) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">
          {displayValue || `${value}${suffix}`}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full"
      />
      {helperText ? (
        <span className="mt-1 block text-xs text-slate-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
};

function NumberField({ label, value, min, onChange }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || min)}
        className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
      />
    </label>
  );
}
