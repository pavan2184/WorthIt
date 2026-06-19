"use client";

import { ArrowRight } from "lucide-react";
import type { InputMode } from "@/lib/types";

const examples = [
  {
    label: "Scooter rental vs GrabBike",
    prompt: "Is renting a scooter in HCMC for 1 month worth it compared to GrabBike?",
  },
  {
    label: "Gym membership vs day pass",
    prompt: "Is a gym membership worth it compared to day passes?",
  },
  {
    label: "Buy camera vs rent camera",
    prompt: "Should I buy a camera or rent one when I need it?",
  },
  {
    label: "Netflix vs pay-per-view",
    prompt: "Is a Netflix subscription worth it compared to pay-per-view?",
  },
  {
    label: "Coworking pass vs cafes",
    prompt: "Is a coworking pass worth it compared to working from cafes?",
  },
];

type DecisionInputProps = {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  loading?: boolean;
  compact?: boolean;
  title?: string;
  showExamples?: boolean;
  badge?: string;
  disabled?: boolean;
};

export function DecisionInput({
  value,
  onChange,
  onAnalyze,
  inputMode,
  onInputModeChange,
  loading,
  compact = false,
  title = "Decision question",
  showExamples = true,
  badge,
  disabled = false,
}: DecisionInputProps) {
  const canAnalyze = !disabled && !loading && Boolean(value.trim());

  return (
    <div className="rounded-lg border border-worth-border bg-worth-surface p-5 shadow-subtle sm:p-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-worth-muted">
            Input
          </p>
          {badge && (
            <span className="rounded-full border border-worth-accent/20 bg-worth-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-worth-accent">
              {badge}
            </span>
          )}
        </div>
        <h2 className="mt-1 text-lg font-semibold text-worth-ink">{title}</h2>
      </div>

      <textarea
        className={`mt-5 min-h-28 w-full resize-y rounded-lg border border-worth-border p-4 text-sm leading-6 outline-none transition focus:border-worth-brand ${
          disabled
            ? "cursor-not-allowed bg-worth-page text-worth-muted placeholder:text-slate-400"
            : "text-worth-ink"
        }`}
        placeholder="Describe a decision you want to compare..."
        value={value}
        onChange={(event) => {
          if (!disabled) onChange(event.target.value);
        }}
        readOnly={disabled}
        aria-disabled={disabled}
      />

      {!compact && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <ModeOption
            checked={inputMode === "user_values"}
            title="I have my own values"
            detail="Start with fields I need to fill or confirm."
            onSelect={() => onInputModeChange("user_values")}
            disabled={disabled}
          />
          <ModeOption
            checked={inputMode === "use_estimates"}
            title="Use WorthIt estimates"
            detail="Start with default assumptions I can edit later."
            onSelect={() => onInputModeChange("use_estimates")}
            disabled={disabled}
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-worth-accent px-4 text-sm font-medium text-white transition hover:bg-worth-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze decision"}
          {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {!compact && showExamples && (
        <>
          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-worth-muted">
            Suggested prompts
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {examples.map((example) => (
              <button
                key={example.label}
                onClick={() => onChange(example.prompt)}
                className="min-h-20 rounded-lg border border-worth-border bg-worth-page px-3 py-2 text-left transition hover:border-worth-brand hover:bg-worth-surface"
              >
                <span className="block text-sm font-medium leading-5 text-worth-ink">
                  {example.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-worth-muted">
                  {example.prompt}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type ModeOptionProps = {
  checked: boolean;
  title: string;
  detail: string;
  onSelect: () => void;
  disabled?: boolean;
};

function ModeOption({
  checked,
  title,
  detail,
  onSelect,
  disabled = false,
}: ModeOptionProps) {
  return (
    <label
      className={`flex min-h-20 items-start gap-3 rounded-lg border p-3 text-left transition ${
        checked
          ? "border-worth-brand bg-worth-brand-soft"
          : "border-worth-border bg-worth-surface hover:border-worth-brand"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <input
        type="radio"
        name="input-mode"
        checked={checked}
        onChange={() => {
          if (!disabled) onSelect();
        }}
        disabled={disabled}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-worth-border accent-worth-brand"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-worth-ink">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-worth-muted">
          {detail}
        </span>
      </span>
    </label>
  );
}
