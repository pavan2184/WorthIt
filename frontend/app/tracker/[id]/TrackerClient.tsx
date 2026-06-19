"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Activity, ArrowLeft, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { addTrackerEntry, getTracker } from "@/lib/api";
import { formatMoney, formatNumber } from "@/lib/format";
import type {
  CostItem,
  DecisionPayload,
  TrackerEntryInput,
  TrackerResponse,
} from "@/lib/types";

type TrackerClientProps = {
  id: string;
};

type TrackerOptionKey = TrackerEntryInput["option_key"];
type TrackerExpenseFrequency = TrackerEntryInput["expense_frequency"];
type MatchedActivityKind = "trip" | "media" | "generic";
type MatchedActivityCopy = {
  kind: MatchedActivityKind;
  perUseLabel: string;
  perUseDescription: string;
  fallbackNotePrefix: string;
};
type TrackerEntryFormState = Omit<TrackerEntryInput, "option_key" | "uses"> & {
  option_key: TrackerOptionKey | null;
  distance_km: number;
  duration_minutes: number;
  is_rush_hour: boolean;
  occurred_time: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const grabBikeFareModel = {
  baseFare: 13_000,
  baseDistanceKm: 2,
  ratePerKmAfterBase: 4_500,
  ratePerMinute: 350,
  rushHourMultiplier: 1.4,
};

const buildEmptyEntry = (
  optionKey: TrackerOptionKey | null = null
): TrackerEntryFormState => ({
  option_key: optionKey,
  spend_kind: "variable",
  expense_frequency: "per_use",
  date: today(),
  option_a_spend: 0,
  option_b_spend: 0,
  distance_km: 0,
  duration_minutes: 0,
  is_rush_hour: false,
  occurred_time: "",
  note: "",
});

export function TrackerClient({ id }: TrackerClientProps) {
  const [tracker, setTracker] = useState<TrackerResponse | null>(null);
  const [entry, setEntry] = useState<TrackerEntryFormState>(buildEmptyEntry());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTracker() {
      setLoading(true);
      setError(null);

      try {
        setTracker(await getTracker(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tracker");
      } finally {
        setLoading(false);
      }
    }

    void loadTracker();
  }, [id]);

  const progressPercent = useMemo(() => {
    const breakEven = tracker?.summary.refined_break_even_uses;
    if (!tracker || !breakEven || breakEven <= 0) return 0;

    return Math.min((tracker.summary.actual_uses / breakEven) * 100, 100);
  }, [tracker]);

  const optionBPerUseCost = useMemo(() => {
    if (!tracker) return 0;
    return getIncludedPerUseCost(tracker.payload.option_b.costs);
  }, [tracker]);
  const matchedActivityCopy = useMemo(() => {
    if (!tracker) return getMatchedActivityCopy(null);
    return getMatchedActivityCopy(tracker.payload);
  }, [tracker]);

  const handleAddEntry = async () => {
    const validationError = validateTrackerEntry(
      entry,
      matchedActivityCopy.kind,
    );
    const isMatchedActivity =
      entry.option_key === "option_a" && entry.expense_frequency === "per_use";

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (!entry.option_key) {
        setError("Choose which option you used.");
        return;
      }

      const estimatedOptionBSpend = estimateMatchedOptionBCost(
        entry,
        optionBPerUseCost,
        matchedActivityCopy.kind,
      );

      const normalizedEntry: TrackerEntryInput = {
        option_key: entry.option_key,
        spend_kind:
          entry.expense_frequency === "per_use" ? "variable" : "fixed",
        expense_frequency: entry.expense_frequency,
        date: entry.date,
        uses: 1,
        option_a_spend:
          entry.option_key === "option_a" && !isMatchedActivity
            ? entry.option_a_spend
            : 0,
        option_b_spend:
          isMatchedActivity
            ? entry.option_b_spend || estimatedOptionBSpend
            : entry.option_key === "option_b"
              ? entry.option_b_spend
              : 0,
        note: buildTrackerEntryNote(entry, matchedActivityCopy.kind),
      };
      const updated = await addTrackerEntry(id, normalizedEntry);
      setTracker(updated);
      setEntry(buildEmptyEntry());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-worth-page">
      <AppHeader />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-subtle">
            Loading live tracker...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {tracker ? (
          <div className="space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <Activity className="size-4 text-worth-brand" />
                    Live tracker
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                    {tracker.payload.title}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Logs update your observed usage and variable cost per use,
                    then refresh the break-even projection.
                  </p>
                </div>
                <Link
                  href={`/decision/${tracker.decision_id}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-worth-brand hover:text-worth-brand"
                >
                  <ArrowLeft className="size-4" />
                  Edit starting information
                </Link>
              </div>
            </section>

            <DailyEntryForm
              entry={entry}
              currency={tracker.payload.currency}
              optionAName={tracker.payload.option_a.name}
              optionBName={tracker.payload.option_b.name}
              optionBPerUseCost={optionBPerUseCost}
              matchedActivityCopy={matchedActivityCopy}
              saving={saving}
              onChange={setEntry}
              onSubmit={handleAddEntry}
            />

            <section className="grid gap-4 lg:grid-cols-4">
              <TrackerMetric
                label="Actual uses logged"
                value={`${formatNumber(tracker.summary.actual_uses, 0)} uses`}
                detail={`${formatNumber(
                  tracker.summary.actual_option_a_uses,
                  0
                )} ${tracker.payload.option_a.name} / ${formatNumber(
                  tracker.summary.actual_option_b_uses,
                  0
                )} ${tracker.payload.option_b.name}`}
              />
              <TrackerMetric
                label="Break-even target"
                value={
                  tracker.summary.refined_break_even_uses === null
                    ? "No break-even"
                    : `${formatNumber(
                        tracker.summary.refined_break_even_uses,
                        0
                      )} uses`
                }
                detail={
                  tracker.summary.remaining_uses_to_break_even === null
                    ? "Variable costs do not cross"
                    : `${formatNumber(
                        tracker.summary.remaining_uses_to_break_even,
                        0
                      )} uses remaining`
                }
              />
              <TrackerMetric
                label="Projected savings"
                value={formatMoney(
                  tracker.summary.projected_savings,
                  tracker.payload.currency
                )}
                detail={`${formatNumber(
                  tracker.summary.projected_uses,
                  0
                )} projected uses`}
                tone={
                  tracker.summary.projected_savings >= 0 ? "success" : "danger"
                }
              />
              <TrackerMetric
                label="Live savings to date"
                value={formatMoney(
                  tracker.summary.live_savings_to_date,
                  tracker.payload.currency
                )}
                detail={`${tracker.summary.days_logged} days logged`}
                tone={
                  tracker.summary.live_savings_to_date >= 0
                    ? "success"
                    : "danger"
                }
              />
            </section>

            <section className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
              <div className="space-y-5">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Break-even progress
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-900">
                        {tracker.summary.verdict_label}
                      </h2>
                    </div>
                    <RefreshCw className="size-5 text-worth-brand" />
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-worth-brand"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {tracker.summary.verdict_summary}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SmallStat
                      label={`${tracker.payload.option_a.name} projected`}
                      value={formatMoney(
                        tracker.summary.projected_option_a_total,
                        tracker.payload.currency
                      )}
                    />
                    <SmallStat
                      label={`${tracker.payload.option_b.name} projected`}
                      value={formatMoney(
                        tracker.summary.projected_option_b_total,
                        tracker.payload.currency
                      )}
                    />
                    <SmallStat
                      label={`${tracker.payload.option_a.name} observed/use`}
                      value={formatMoney(
                        tracker.summary.observed_option_a_variable_per_use,
                        tracker.payload.currency
                      )}
                    />
                    <SmallStat
                      label={`${tracker.payload.option_b.name} observed/use`}
                      value={formatMoney(
                        tracker.summary.observed_option_b_variable_per_use,
                        tracker.payload.currency
                      )}
                    />
                    <SmallStat
                      label={`Matched ${tracker.payload.option_b.name}`}
                      value={formatMoney(
                        tracker.summary.matched_option_b_spend,
                        tracker.payload.currency
                      )}
                    />
                  </div>
                </section>

              </div>

              <TrackerEntriesTable tracker={tracker} />
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

type TrackerMetricProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "success" | "danger";
};

function TrackerMetric({
  label,
  value,
  detail,
  tone = "neutral",
}: TrackerMetricProps) {
  const toneClass =
    tone === "success"
      ? "text-green-600"
      : tone === "danger"
        ? "text-red-600"
        : "text-slate-900";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </article>
  );
}

type SmallStatProps = {
  label: string;
  value: string;
};

function SmallStat({ label, value }: SmallStatProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-worth-page p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}

type DailyEntryFormProps = {
  entry: TrackerEntryFormState;
  currency: string;
  optionAName: string;
  optionBName: string;
  optionBPerUseCost: number;
  matchedActivityCopy: MatchedActivityCopy;
  saving: boolean;
  onChange: (entry: TrackerEntryFormState) => void;
  onSubmit: () => void;
};

function DailyEntryForm({
  entry,
  currency,
  optionAName,
  optionBName,
  optionBPerUseCost,
  matchedActivityCopy,
  saving,
  onChange,
  onSubmit,
}: DailyEntryFormProps) {
  const isMatchedActivity =
    entry.option_key === "option_a" && entry.expense_frequency === "per_use";
  const isMatchedTrip =
    isMatchedActivity && matchedActivityCopy.kind === "trip";
  const selectedOptionName =
    entry.option_key === "option_a" ? optionAName : optionBName;
  const selectedSpend =
    entry.option_key === "option_a"
      ? entry.option_a_spend
      : entry.option_b_spend;
  const hasSelectedOption = entry.option_key !== null;
  const isOptionASelected = entry.option_key === "option_a";
  const shouldShowSelectedSpendInput = !isMatchedActivity;

  const updateSelectedOption = (optionKey: TrackerOptionKey) => {
    const nextExpenseFrequency =
      optionKey === "option_a" &&
      entry.expense_frequency !== "per_use" &&
      entry.expense_frequency !== "per_month"
        ? "per_use"
        : entry.expense_frequency;
    const nextIsPerUseExpense = nextExpenseFrequency === "per_use";
    const nextIsMatchedActivity =
      optionKey === "option_a" && nextIsPerUseExpense;

    onChange({
      ...entry,
      option_key: optionKey,
      expense_frequency: nextExpenseFrequency,
      spend_kind: nextIsPerUseExpense ? "variable" : "fixed",
      option_a_spend:
        optionKey === "option_a" && !nextIsMatchedActivity
          ? entry.option_a_spend
          : 0,
      option_b_spend: 0,
      distance_km:
        optionKey === "option_a" && nextIsPerUseExpense
          ? entry.distance_km
          : 0,
      duration_minutes:
        optionKey === "option_a" && nextIsPerUseExpense
          ? entry.duration_minutes
          : 0,
      is_rush_hour:
        optionKey === "option_a" && nextIsPerUseExpense
          ? entry.is_rush_hour
          : false,
      occurred_time:
        optionKey === "option_a" && nextIsPerUseExpense
          ? entry.occurred_time
          : "",
    });
  };

  const updateExpenseFrequency = (expenseFrequency: TrackerExpenseFrequency) => {
    const keepsMatchedTrip =
      entry.option_key === "option_a" && expenseFrequency === "per_use";

    onChange({
      ...entry,
      expense_frequency: expenseFrequency,
      spend_kind: expenseFrequency === "per_use" ? "variable" : "fixed",
      option_a_spend: keepsMatchedTrip ? 0 : entry.option_a_spend,
      option_b_spend:
        entry.option_key === "option_b" || keepsMatchedTrip
          ? entry.option_b_spend
          : 0,
      distance_km: keepsMatchedTrip ? entry.distance_km : 0,
      duration_minutes: keepsMatchedTrip ? entry.duration_minutes : 0,
      is_rush_hour: keepsMatchedTrip ? entry.is_rush_hour : false,
      occurred_time: keepsMatchedTrip ? entry.occurred_time : "",
    });
  };

  const updateSelectedSpend = (value: number) => {
    onChange({
      ...entry,
      option_a_spend: entry.option_key === "option_a" ? value : 0,
      option_b_spend:
        entry.option_key === "option_b" ? value : entry.option_b_spend,
    });
  };
  const estimatedMatchedOptionBCost = estimateMatchedOptionBCost(
    entry,
    optionBPerUseCost,
    matchedActivityCopy.kind,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Log new activity
      </p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">
        Add today&apos;s usage and spend
      </h2>

      <div className="mt-4">
        <p className="text-sm font-medium text-slate-700">
          Which option did you use?
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <OptionChoiceButton
            label="Option A"
            name={optionAName}
            selected={entry.option_key === "option_a"}
            tone="brand"
            onClick={() => updateSelectedOption("option_a")}
          />
          <OptionChoiceButton
            label="Option B"
            name={optionBName}
            selected={entry.option_key === "option_b"}
            tone="accent"
            onClick={() => updateSelectedOption("option_b")}
          />
        </div>
      </div>

      {hasSelectedOption ? (
        <>
          {isOptionASelected ? (
            <div className="mt-5">
              <p className="text-sm font-medium text-slate-700">
                What are you logging for {optionAName}?
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <ExpenseFrequencyButton
                  label={matchedActivityCopy.perUseLabel}
                  description={matchedActivityCopy.perUseDescription}
                  selected={entry.expense_frequency === "per_use"}
                  onClick={() => updateExpenseFrequency("per_use")}
                />
                <ExpenseFrequencyButton
                  label="Monthly cost"
                  description="Log the rental payment, pass, or subscription."
                  selected={entry.expense_frequency === "per_month"}
                  onClick={() => updateExpenseFrequency("per_month")}
                />
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-sm font-medium text-slate-700">
                How often does this expense happen?
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ExpenseFrequencyButton
                  label="Per use"
                  description="Movie/show, visit, ride, or single use."
                  selected={entry.expense_frequency === "per_use"}
                  onClick={() => updateExpenseFrequency("per_use")}
                />
                <ExpenseFrequencyButton
                  label="Daily"
                  description="Repeats every day in this period."
                  selected={entry.expense_frequency === "per_day"}
                  onClick={() => updateExpenseFrequency("per_day")}
                />
                <ExpenseFrequencyButton
                  label="Monthly"
                  description="Monthly rental, pass, or subscription."
                  selected={entry.expense_frequency === "per_month"}
                  onClick={() => updateExpenseFrequency("per_month")}
                />
                <ExpenseFrequencyButton
                  label="Yearly"
                  description="Annual membership, insurance, or license."
                  selected={entry.expense_frequency === "per_year"}
                  onClick={() => updateExpenseFrequency("per_year")}
                />
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Date</span>
              <input
                type="date"
                value={entry.date}
                onChange={(event) =>
                  onChange({ ...entry, date: event.target.value })
                }
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
              />
            </label>

            {shouldShowSelectedSpendInput ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  {entry.expense_frequency !== "per_use"
                    ? `What is the ${frequencyAdjective(entry.expense_frequency)} expense for ${selectedOptionName}?`
                    : `What did you spend on ${selectedOptionName}?`}
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={selectedSpend === 0 ? "" : selectedSpend}
                  onKeyDown={preventNegativeNumberInput}
                  onChange={(event) =>
                    updateSelectedSpend(
                      parseNonNegativeNumberInput(event.target.value),
                    )
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
                  placeholder={`Amount in ${currency}`}
                />
                {entry.expense_frequency !== "per_use" ? (
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    This is projected by time period, not multiplied by usage.
                  </span>
                ) : null}
              </label>
            ) : null}

            {isMatchedTrip ? (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Distance travelled
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    inputMode="decimal"
                    value={entry.distance_km === 0 ? "" : entry.distance_km}
                    onKeyDown={preventNegativeNumberInput}
                    onChange={(event) =>
                      onChange({
                        ...entry,
                        distance_km: parseNonNegativeNumberInput(
                          event.target.value,
                        ),
                      })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
                    placeholder="Kilometers"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Trip duration
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={
                      entry.duration_minutes === 0
                        ? ""
                        : entry.duration_minutes
                    }
                    onKeyDown={preventNegativeNumberInput}
                    onChange={(event) =>
                      onChange({
                        ...entry,
                        duration_minutes: parseNonNegativeNumberInput(
                          event.target.value,
                        ),
                      })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
                    placeholder="Minutes"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Start time
                  </span>
                  <input
                    type="time"
                    value={entry.occurred_time}
                    onChange={(event) =>
                      onChange({ ...entry, occurred_time: event.target.value })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
                  />
                </label>

                <label className="flex h-10 items-center gap-3 self-end rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={entry.is_rush_hour}
                    onChange={(event) =>
                      onChange({
                        ...entry,
                        is_rush_hour: event.target.checked,
                      })
                    }
                    className="size-4 rounded border-slate-300 text-worth-brand focus:ring-worth-brand"
                  />
                  Rush hour / heavy rain
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Matched {optionBName} cost
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={
                      entry.option_b_spend === 0 ? "" : entry.option_b_spend
                    }
                    onKeyDown={preventNegativeNumberInput}
                    onChange={(event) =>
                      onChange({
                        ...entry,
                        option_b_spend: parseNonNegativeNumberInput(
                          event.target.value,
                        ),
                      })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
                    placeholder={formatMoney(
                      estimatedMatchedOptionBCost,
                      currency,
                    )}
                  />
                </label>
              </>
            ) : null}

            {isMatchedActivity && !isMatchedTrip ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Matched {optionBName} cost
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={entry.option_b_spend === 0 ? "" : entry.option_b_spend}
                  onKeyDown={preventNegativeNumberInput}
                  onChange={(event) =>
                    onChange({
                      ...entry,
                      option_b_spend: parseNonNegativeNumberInput(
                        event.target.value,
                      ),
                    })
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
                  placeholder={formatMoney(estimatedMatchedOptionBCost, currency)}
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Note</span>
              <input
                value={entry.note}
                onChange={(event) =>
                  onChange({ ...entry, note: event.target.value })
                }
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-worth-brand"
                placeholder="Optional"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-worth-accent px-4 text-sm font-medium text-white transition hover:bg-worth-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Plus className="size-4" />
            {saving ? "Adding..." : "Add entry"}
          </button>
        </>
      ) : null}
    </section>
  );
}

type OptionChoiceButtonProps = {
  label: string;
  name: string;
  selected: boolean;
  tone: "brand" | "accent";
  onClick: () => void;
};

function OptionChoiceButton({
  label,
  name,
  selected,
  tone,
  onClick,
}: OptionChoiceButtonProps) {
  const selectedClass =
    tone === "brand"
      ? "border-worth-brand bg-worth-brand-soft text-worth-brand"
      : "border-worth-accent bg-worth-accent-soft text-worth-accent";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-20 rounded-lg border p-4 text-left transition ${
        selected
          ? selectedClass
          : "border-slate-200 bg-white text-slate-700 hover:border-worth-brand/40"
      }`}
    >
      <span className="block text-xs font-semibold uppercase tracking-wide">
        {label}
      </span>
      <span className="mt-1 block text-sm font-semibold text-slate-900">
        {name}
      </span>
    </button>
  );
}

function frequencyAdjective(frequency: TrackerExpenseFrequency): string {
  if (frequency === "per_day") return "daily";
  if (frequency === "per_month") return "monthly";
  if (frequency === "per_year") return "yearly";
  return "per-use";
}

function frequencyDisplay(frequency: TrackerExpenseFrequency): string {
  if (frequency === "per_day") return "Daily";
  if (frequency === "per_month") return "Monthly";
  if (frequency === "per_year") return "Yearly";
  return "Per use";
}

function parseNonNegativeNumberInput(value: string): number {
  if (value.trim() === "") return 0;

  const nextValue = Number(value);

  if (!Number.isFinite(nextValue)) return 0;

  return Math.max(0, nextValue);
}

function preventNegativeNumberInput(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "-" || event.key === "Minus") {
    event.preventDefault();
  }
}

function validateTrackerEntry(
  entry: TrackerEntryFormState,
  matchedActivityKind: MatchedActivityKind,
): string | null {
  if (!entry.option_key) {
    return "Choose which option you used.";
  }

  const isMatchedActivity =
    entry.option_key === "option_a" && entry.expense_frequency === "per_use";
  const isMatchedTrip = isMatchedActivity && matchedActivityKind === "trip";
  const selectedSpend =
    entry.option_key === "option_a"
      ? entry.option_a_spend
      : entry.option_b_spend;

  if (!Number.isFinite(selectedSpend) || selectedSpend < 0) {
    return "Expense amount must be 0 or higher.";
  }

  if (
    isMatchedTrip &&
    (!Number.isFinite(entry.distance_km) || entry.distance_km < 0)
  ) {
    return "Distance travelled must be 0 or higher.";
  }

  if (
    isMatchedTrip &&
    (!Number.isFinite(entry.duration_minutes) || entry.duration_minutes < 0)
  ) {
    return "Trip duration must be 0 or higher.";
  }

  if (isMatchedActivity && entry.option_b_spend < 0) {
    return "Matched alternative cost must be 0 or higher.";
  }

  return null;
}

function buildTrackerEntryNote(
  entry: TrackerEntryFormState,
  matchedActivityKind: MatchedActivityKind,
): string {
  const note = entry.note.trim();

  if (entry.option_key !== "option_a" || entry.expense_frequency !== "per_use") {
    return note;
  }

  if (matchedActivityKind !== "trip") {
    return note;
  }

  const detailParts = [];

  if (entry.distance_km > 0) {
    detailParts.push(`${formatNumber(entry.distance_km, 1)} km`);
  }

  if (entry.duration_minutes > 0) {
    detailParts.push(`${formatNumber(entry.duration_minutes, 0)} min`);
  }

  if (entry.occurred_time) {
    detailParts.push(`at ${entry.occurred_time}`);
  }

  if (entry.is_rush_hour) {
    detailParts.push("rush hour/heavy rain");
  }

  if (detailParts.length === 0) {
    return note;
  }

  const tripDetails = `Matched trip: ${detailParts.join(" ")}`;
  return [tripDetails, note].filter(Boolean).join(" · ");
}

function getMatchedActivityCopy(
  payload: DecisionPayload | null,
): MatchedActivityCopy {
  const decisionText = payload
    ? [payload.title, payload.option_a.name, payload.option_b.name]
        .join(" ")
        .toLowerCase()
    : "";

  if (
    decisionText.includes("netflix") ||
    decisionText.includes("pay-per-view") ||
    decisionText.includes("movie") ||
    decisionText.includes("show")
  ) {
    return {
      kind: "media",
      perUseLabel: "Movie/show",
      perUseDescription:
        "Log one movie or show with its matched pay-per-view cost.",
      fallbackNotePrefix: "Matched movie/show",
    };
  }

  if (
    decisionText.includes("scooter") ||
    decisionText.includes("grab") ||
    decisionText.includes("trip") ||
    decisionText.includes("ride") ||
    !payload
  ) {
    return {
      kind: "trip",
      perUseLabel: "Trip",
      perUseDescription:
        "Log a ride with distance, time, and matched alternative cost.",
      fallbackNotePrefix: "Matched trip",
    };
  }

  return {
    kind: "generic",
    perUseLabel: "Use",
    perUseDescription: "Log one use with its matched alternative cost.",
    fallbackNotePrefix: "Matched use",
  };
}

function estimateMatchedOptionBCost(
  entry: TrackerEntryFormState,
  fallbackFare: number,
  matchedActivityKind: MatchedActivityKind,
): number {
  if (matchedActivityKind !== "trip") {
    return fallbackFare;
  }

  return estimateGrabBikeFare(
    entry.distance_km,
    entry.duration_minutes,
    fallbackFare,
    entry.is_rush_hour,
  );
}

function getIncludedPerUseCost(costs: CostItem[]): number {
  return costs
    .filter((cost) => cost.included && cost.frequency === "per_use")
    .reduce((total, cost) => total + cost.amount, 0);
}

function estimateGrabBikeFare(
  distanceKm: number,
  durationMinutes: number,
  fallbackFare: number,
  isRushHour: boolean,
): number {
  if (distanceKm <= 0 || durationMinutes <= 0) {
    return fallbackFare;
  }

  const distanceCost =
    distanceKm <= grabBikeFareModel.baseDistanceKm
      ? grabBikeFareModel.baseFare
      : grabBikeFareModel.baseFare +
        (distanceKm - grabBikeFareModel.baseDistanceKm) *
          grabBikeFareModel.ratePerKmAfterBase;
  const timeCost = durationMinutes * grabBikeFareModel.ratePerMinute;
  const surgeMultiplier = isRushHour ? grabBikeFareModel.rushHourMultiplier : 1;

  return roundToNearestThousand((distanceCost + timeCost) * surgeMultiplier);
}

function roundToNearestThousand(value: number): number {
  return Math.round(value / 1_000) * 1_000;
}

type ExpenseFrequencyButtonProps = {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
};

function ExpenseFrequencyButton({
  label,
  description,
  selected,
  onClick,
}: ExpenseFrequencyButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-20 rounded-lg border p-4 text-left transition ${
        selected
          ? "border-worth-brand bg-worth-brand-soft"
          : "border-slate-200 bg-white hover:border-worth-brand/40"
      }`}
    >
      <span className="block text-sm font-semibold text-slate-900">
        {label}
      </span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">
        {description}
      </span>
    </button>
  );
}

function TrackerEntriesTable({ tracker }: { tracker: TrackerResponse }) {
  const matchedActivityCopy = getMatchedActivityCopy(tracker.payload);

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Daily history
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Logged entries
          </h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-worth-page px-3 py-1 text-xs font-medium text-slate-500">
          {tracker.entries.length} entries
        </span>
      </div>

      {tracker.entries.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-worth-page p-8 text-center text-sm text-slate-500">
          No daily entries yet.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 font-medium">Option</th>
                <th className="py-3 pr-4 font-medium">Frequency</th>
                <th className="py-3 pr-4 font-medium">Spend</th>
                <th className="py-3 pr-4 font-medium">Matched alternative</th>
                <th className="py-3 pr-4 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {tracker.entries.map((entry) => {
                const optionName =
                  entry.option_key === "option_a"
                    ? tracker.payload.option_a.name
                    : tracker.payload.option_b.name;
                const spend =
                  entry.option_key === "option_a"
                    ? entry.option_a_spend
                    : entry.option_b_spend;

                return (
                  <tr key={entry.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 tabular-nums text-slate-900">
                      {entry.date}
                    </td>
                    <td className="py-3 pr-4 text-slate-900">{optionName}</td>
                    <td className="py-3 pr-4 text-slate-500">
                      {frequencyDisplay(entry.expense_frequency)}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-900">
                      {formatMoney(spend, tracker.payload.currency)}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-slate-900">
                      {entry.option_key === "option_a" &&
                      entry.option_b_spend > 0
                        ? formatMoney(
                            entry.option_b_spend,
                            tracker.payload.currency,
                          )
                        : "-"}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {formatTrackerEntryNote(
                        entry,
                        tracker.payload.option_b.name,
                        tracker.payload.currency,
                        matchedActivityCopy,
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatTrackerEntryNote(
  entry: TrackerResponse["entries"][number],
  optionBName: string,
  currency: string,
  matchedActivityCopy: MatchedActivityCopy,
) {
  const note = entry.note.trim();
  const isMatchedActivity =
    entry.option_key === "option_a" &&
    entry.expense_frequency === "per_use" &&
    entry.option_b_spend > 0;

  if (!isMatchedActivity) {
    return note || "-";
  }

  const matchedPrefix = `${matchedActivityCopy.fallbackNotePrefix}:`;
  const legacyMatchedTripIndex = note.indexOf("Matched trip:");
  const matchedNoteIndex =
    note.indexOf(matchedPrefix) >= 0
      ? note.indexOf(matchedPrefix)
      : legacyMatchedTripIndex;

  if (matchedNoteIndex === 0) {
    return note;
  }

  if (matchedNoteIndex > 0) {
    const customNote = note.slice(0, matchedNoteIndex).replace(/\s*·\s*$/, "");
    const matchedNote = note.slice(matchedNoteIndex);

    return [matchedNote, customNote].filter(Boolean).join(" · ");
  }

  const fallbackNote = `${matchedPrefix} ${formatMoney(
    entry.option_b_spend,
    currency,
  )} ${optionBName} alternative`;

  return [fallbackNote, note].filter(Boolean).join(" · ");
}
