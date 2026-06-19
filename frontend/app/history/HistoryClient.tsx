"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { deleteDecision, getTracker, listDecisions } from "@/lib/api";
import { formatMoney, formatNumber, frequencyLabel } from "@/lib/format";
import type {
  CostItem,
  SavedDecision,
  TrackerEntry,
  TrackerResponse,
} from "@/lib/types";

type HistoryDecision = SavedDecision & {
  tracker: TrackerResponse | null;
};

async function loadDecisionWithTracker(
  decision: SavedDecision,
  signal: AbortSignal
): Promise<HistoryDecision> {
  try {
    const tracker = await getTracker(decision.id, signal);

    return {
      ...decision,
      tracker: tracker.entries.length > 0 ? tracker : null,
    };
  } catch {
    return {
      ...decision,
      tracker: null,
    };
  }
}

export function HistoryClient() {
  const [decisions, setDecisions] = useState<HistoryDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [showNetBreakdown, setShowNetBreakdown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    async function loadInitial() {
      setLoading(true);
      setError(null);

      try {
        const loaded = await listDecisions(controller.signal);
        const loadedWithTrackers = await Promise.all(
          loaded.map((decision) =>
            loadDecisionWithTracker(decision, controller.signal)
          )
        );
        if (!cancelled) {
          setDecisions(loadedWithTrackers);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            controller.signal.aborted
              ? "Loading decisions took too long. Check that the backend is running, then try again."
              : err instanceof Error
                ? err.message
                : "Failed to load decisions"
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [reloadToken]);

  const remove = async (id: string) => {
    try {
      await deleteDecision(id);
      setDecisions((current) =>
        current.filter((decision) => decision.id !== id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete decision");
    }
  };

  const latestDecision = decisions[0] ?? null;
  const reloadDecisions = () => setReloadToken((current) => current + 1);
  const latestDecisionLabel = latestDecision
    ? getDecisionLabel(latestDecision)
    : "No decisions yet";
  const displayCurrency = decisions[0]?.payload.currency ?? "VND";
  const netSavings = decisions.reduce(
    (total, decision) => total + getDecisionFinancials(decision).netSavings,
    0
  );
  const netSavingsTone = getSavingsTone(netSavings);
  const netSavingsLabel = netSavings >= 0 ? "Net gain" : "Net loss";

  return (
    <main className="min-h-screen bg-worth-page">
      <AppHeader active="history" />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              My Decisions
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Reopen saved comparisons, review their WorthIt scores, and keep
              refining the assumptions behind each decision.
            </p>
          </div>
          <Link
            href="/decision/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-worth-accent px-4 text-sm font-medium text-white transition hover:bg-worth-accent-hover"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New decision
          </Link>
        </div>

        {error && (
          <ErrorPanel message={error} onRetry={reloadDecisions} />
        )}

        {loading ? (
          <StatusPanel message="Loading your decisions..." />
        ) : error && decisions.length === 0 ? null : decisions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-5 space-y-5">
            <section className="grid gap-4 md:grid-cols-3">
              <SummaryMetric
                icon={<Scale className="h-4 w-4" aria-hidden="true" />}
                label="Saved decisions"
                value={formatNumber(decisions.length)}
                detail="Ready to reopen"
                href="/decisions#saved-decisions"
              />
              <SummaryMetric
                icon={
                  netSavings >= 0 ? (
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-4 w-4" aria-hidden="true" />
                  )
                }
                label="Net gain/loss"
                value={formatSignedMoney(netSavings, displayCurrency)}
                detail="Click for cost breakdown"
                valueClassName={netSavingsTone}
                active={showNetBreakdown}
                ariaControls="net-cost-breakdown"
                onClick={() =>
                  setShowNetBreakdown((currentlyVisible) => !currentlyVisible)
                }
                suffixIcon={
                  showNetBreakdown ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )
                }
              />
              <SummaryMetric
                icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                label="Latest save"
                value={
                  latestDecision
                    ? new Date(latestDecision.created_at).toLocaleDateString()
                    : "-"
                }
                detail={latestDecisionLabel}
              />
            </section>

            {showNetBreakdown && (
              <NetBreakdownPanel
                id="net-cost-breakdown"
                decisions={decisions}
                currency={displayCurrency}
                netSavings={netSavings}
                netSavingsLabel={netSavingsLabel}
              />
            )}

            <section id="saved-decisions">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Saved comparisons
                  </h2>
                  <p className="text-sm text-slate-500">
                    Open a decision to edit assumptions or start its tracker.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {decisions.map((decision) => (
                  <DecisionRow
                    key={decision.id}
                    decision={decision}
                    onDelete={() => void remove(decision.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

type SummaryMetricProps = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  href?: string;
  valueClassName?: string;
  active?: boolean;
  ariaControls?: string;
  onClick?: () => void;
  suffixIcon?: ReactNode;
};

type DecisionFinancials = {
  optionATotal: number;
  optionBTotal: number;
  timeValueTotal: number;
  netSavings: number;
  uses: number;
  periodLabel: string;
  isTracked: boolean;
};

function getDecisionLabel(decision: SavedDecision) {
  const optionAName = decision.payload.option_a.name.trim() || "Option A";
  const optionBName = decision.payload.option_b.name.trim() || "Option B";

  return `${optionAName} vs ${optionBName}`;
}

function hasTrackedData(decision: HistoryDecision) {
  return Boolean(decision.tracker && decision.tracker.entries.length > 0);
}

function getDecisionFinancials(decision: HistoryDecision): DecisionFinancials {
  if (decision.tracker && hasTrackedData(decision)) {
    return {
      optionATotal: decision.tracker.summary.live_option_a_cost_to_date,
      optionBTotal: decision.tracker.summary.live_option_b_cost_to_date,
      timeValueTotal: 0,
      netSavings: decision.tracker.summary.live_savings_to_date,
      uses: decision.tracker.summary.actual_uses,
      periodLabel: `${formatNumber(
        decision.tracker.summary.actual_uses,
        0
      )} tracked entries over ${formatNumber(
        decision.tracker.summary.days_logged
      )} logged days`,
      isTracked: true,
    };
  }

  return {
    optionATotal: decision.result.option_a_total,
    optionBTotal: decision.result.option_b_total,
    timeValueTotal: decision.result.time_savings_value,
    netSavings: decision.result.value_adjusted_savings,
    uses: decision.result.expected_uses,
    periodLabel: `${formatNumber(
      decision.result.expected_uses,
      2
    )} expected uses over ${formatNumber(decision.payload.usage.days)} days`,
    isTracked: false,
  };
}

function formatSignedMoney(value: number, currency = "VND") {
  if (value > 0) {
    return `+${formatMoney(value, currency)}`;
  }

  return formatMoney(value, currency);
}

function getSavingsTone(value: number) {
  if (value > 0) {
    return "text-green-600";
  }

  if (value < 0) {
    return "text-red-600";
  }

  return "text-slate-900";
}

function SummaryMetric({
  icon,
  label,
  value,
  detail,
  href,
  valueClassName = "text-slate-900",
  active = false,
  ariaControls,
  onClick,
  suffixIcon,
}: SummaryMetricProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <span className="flex items-center gap-2">
          {suffixIcon && (
            <span className="text-slate-400">
              {suffixIcon}
            </span>
          )}
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-worth-brand-soft text-worth-brand">
            {icon}
          </span>
        </span>
      </div>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${valueClassName}`}>
        {value}
      </p>
      <p className="mt-1 truncate text-sm text-slate-500">{detail}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-slate-200 bg-white p-5 shadow-subtle transition hover:border-worth-brand hover:shadow-md focus:outline-none focus:ring-2 focus:ring-worth-brand/25"
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={active}
        aria-controls={ariaControls}
        className={`block w-full rounded-lg border bg-white p-5 text-left shadow-subtle transition hover:border-worth-brand hover:shadow-md focus:outline-none focus:ring-2 focus:ring-worth-brand/25 ${
          active ? "border-worth-brand" : "border-slate-200"
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      {content}
    </article>
  );
}

function NetBreakdownPanel({
  id,
  decisions,
  currency,
  netSavings,
  netSavingsLabel,
}: {
  id: string;
  decisions: HistoryDecision[];
  currency: string;
  netSavings: number;
  netSavingsLabel: string;
}) {
  const optionATotal = decisions.reduce(
    (total, decision) => total + getDecisionFinancials(decision).optionATotal,
    0
  );
  const optionBTotal = decisions.reduce(
    (total, decision) => total + getDecisionFinancials(decision).optionBTotal,
    0
  );
  const timeValueTotal = decisions.reduce(
    (total, decision) => total + getDecisionFinancials(decision).timeValueTotal,
    0
  );
  const trackedDecisionCount = decisions.filter(hasTrackedData).length;

  return (
    <section
      id={id}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Cost breakdown
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Where the net {netSavings >= 0 ? "gain" : "loss"} comes from
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Tracked decisions use actual logged spend only. Saved comparisons
            without tracker entries still use their original estimate.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-slate-500">{netSavingsLabel}</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${getSavingsTone(netSavings)}`}>
            {formatSignedMoney(netSavings, currency)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <BreakdownTotal label="Option A cost" value={optionATotal} currency={currency} />
        <BreakdownTotal label="Option B cost" value={optionBTotal} currency={currency} />
        <BreakdownTotal label="Time value" value={timeValueTotal} currency={currency} />
        <BreakdownTotal
          label="Net gain/loss"
          value={netSavings}
          currency={currency}
          signed
          valueClassName={getSavingsTone(netSavings)}
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {formatNumber(trackedDecisionCount)} tracked /{" "}
        {formatNumber(decisions.length - trackedDecisionCount)} estimated
      </p>

      <div className="mt-5 divide-y divide-slate-200">
        {decisions.map((decision) => (
          <DecisionCostBreakdown key={decision.id} decision={decision} />
        ))}
      </div>
    </section>
  );
}

function BreakdownTotal({
  label,
  value,
  currency,
  signed = false,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: number;
  currency: string;
  signed?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-worth-page p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${valueClassName}`}>
        {signed ? formatSignedMoney(value, currency) : formatMoney(value, currency)}
      </p>
    </div>
  );
}

function DecisionCostBreakdown({ decision }: { decision: HistoryDecision }) {
  const decisionLabel = getDecisionLabel(decision);
  const currency = decision.payload.currency;
  const financials = getDecisionFinancials(decision);
  const sourceModeLabel = financials.isTracked
    ? "Tracked costs to date"
    : "Estimated model costs";
  const emptySourceLabel = financials.isTracked
    ? "No tracked costs."
    : "No included costs.";

  return (
    <article className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {decisionLabel}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {financials.periodLabel}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-slate-500">Net</p>
          <p className={`mt-1 text-sm font-semibold tabular-nums ${getSavingsTone(financials.netSavings)}`}>
            {formatSignedMoney(financials.netSavings, currency)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CostSourceList
          title={decision.payload.option_a.name}
          total={financials.optionATotal}
          currency={currency}
          sources={getCostSources(decision, "option_a")}
          sourceModeLabel={sourceModeLabel}
          emptySourceLabel={emptySourceLabel}
        />
        <CostSourceList
          title={decision.payload.option_b.name}
          total={financials.optionBTotal}
          currency={currency}
          sources={getCostSources(decision, "option_b")}
          sourceModeLabel={sourceModeLabel}
          emptySourceLabel={emptySourceLabel}
        />
      </div>

      {financials.timeValueTotal !== 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-worth-page p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Time value adjustment</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {formatMoney(financials.timeValueTotal, currency)}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

type CostSource = {
  id: string;
  label: string;
  amount: number;
  frequency: string;
  hidden: boolean;
  contribution: number;
  detail: string;
};

function CostSourceList({
  title,
  total,
  currency,
  sources,
  sourceModeLabel,
  emptySourceLabel,
}: {
  title: string;
  total: number;
  currency: string;
  sources: CostSource[];
  sourceModeLabel: string;
  emptySourceLabel: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-worth-page p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{sourceModeLabel}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
          {formatMoney(total, currency)}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {sources.length === 0 ? (
          <p className="text-sm text-slate-500">{emptySourceLabel}</p>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {source.label}
                    {source.hidden && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        Hidden
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {source.detail}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                  {formatMoney(source.contribution, currency)}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {formatMoney(source.amount, currency)} {frequencyLabel(source.frequency)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getCostSources(
  decision: HistoryDecision,
  optionKey: "option_a" | "option_b"
): CostSource[] {
  if (decision.tracker && hasTrackedData(decision)) {
    return getTrackedCostSources(decision, optionKey);
  }

  const days = decision.payload.usage.days;
  const uses = decision.result.expected_uses;
  const currency = decision.payload.currency;

  return decision.payload[optionKey].costs
    .filter((cost) => cost.included)
    .map((cost) => ({
      id: cost.id,
      label: cost.label,
      amount: cost.amount,
      frequency: cost.frequency,
      hidden: cost.hidden,
      contribution: calculateCostContribution(cost, days, uses),
      detail: describeCostContribution(cost, days, uses, currency),
    }));
}

function getTrackedCostSources(
  decision: HistoryDecision,
  optionKey: "option_a" | "option_b"
): CostSource[] {
  const tracker = decision.tracker;

  if (!tracker) {
    return [];
  }

  return tracker.entries.flatMap((entry) =>
    getTrackedEntryCostSources(decision, entry, optionKey)
  );
}

function getTrackedEntryCostSources(
  decision: HistoryDecision,
  entry: TrackerEntry,
  optionKey: "option_a" | "option_b"
): CostSource[] {
  const optionAName = decision.payload.option_a.name;
  const optionBName = decision.payload.option_b.name;
  const note = entry.note.trim();

  if (optionKey === "option_a") {
    if (entry.option_key !== "option_a" || entry.option_a_spend <= 0) {
      return [];
    }

    return [
      {
        id: `${entry.id}_option_a`,
        label: note || trackedEntryLabel(optionAName, entry),
        amount: entry.option_a_spend,
        frequency: entry.expense_frequency,
        hidden: false,
        contribution: entry.option_a_spend,
        detail: `${entry.date} - logged ${frequencyLabel(entry.expense_frequency)} spend`,
      },
    ];
  }

  const sources: CostSource[] = [];

  if (entry.option_key === "option_b" && entry.option_b_spend > 0) {
    sources.push({
      id: `${entry.id}_option_b`,
      label: note || trackedEntryLabel(optionBName, entry),
      amount: entry.option_b_spend,
      frequency: entry.expense_frequency,
      hidden: false,
      contribution: entry.option_b_spend,
      detail: `${entry.date} - logged ${frequencyLabel(entry.expense_frequency)} spend`,
    });
  }

  if (
    entry.option_key === "option_a" &&
    entry.expense_frequency === "per_use" &&
    entry.option_b_spend > 0
  ) {
    sources.push({
      id: `${entry.id}_matched_option_b`,
      label: `Matched ${optionBName} alternative`,
      amount: entry.option_b_spend,
      frequency: "per_use",
      hidden: false,
      contribution: entry.option_b_spend,
      detail: `${entry.date} - explicitly matched to ${optionAName}`,
    });
  }

  return sources;
}

function trackedEntryLabel(optionName: string, entry: TrackerEntry) {
  if (entry.spend_kind === "fixed") {
    return `${optionName} ${frequencyLabel(entry.expense_frequency)} cost`;
  }

  return `${optionName} use`;
}

function calculateCostContribution(cost: CostItem, days: number, uses: number) {
  if (cost.frequency === "one_time") {
    return cost.amount;
  }

  if (cost.frequency === "per_use") {
    return cost.amount * uses;
  }

  if (cost.frequency === "per_day") {
    return cost.amount * days;
  }

  if (cost.frequency === "per_week") {
    return cost.amount * (days / 7);
  }

  if (cost.frequency === "per_month") {
    return cost.amount * (days / 30);
  }

  if (cost.frequency === "per_year") {
    return cost.amount * (days / 365);
  }

  return 0;
}

function describeCostContribution(
  cost: CostItem,
  days: number,
  uses: number,
  currency: string
) {
  if (cost.frequency === "one_time") {
    return "One-time cost";
  }

  if (cost.frequency === "per_use") {
    return `${formatMoney(cost.amount, currency)} x ${formatNumber(uses, 2)} uses`;
  }

  if (cost.frequency === "per_day") {
    return `${formatMoney(cost.amount, currency)} x ${formatNumber(days)} days`;
  }

  if (cost.frequency === "per_week") {
    return `${formatMoney(cost.amount, currency)} x ${formatNumber(days / 7, 1)} weeks`;
  }

  if (cost.frequency === "per_month") {
    return `${formatMoney(cost.amount, currency)} x ${formatNumber(days / 30, 1)} months`;
  }

  if (cost.frequency === "per_year") {
    return `${formatMoney(cost.amount, currency)} x ${formatNumber(days / 365, 2)} years`;
  }

  return "Not counted";
}

function DecisionRow({
  decision,
  onDelete,
}: {
  decision: HistoryDecision;
  onDelete: () => void;
}) {
  const savings = getDecisionFinancials(decision).netSavings;
  const savingsTone = savings >= 0 ? "text-green-600" : "text-red-600";
  const score = Math.round(decision.result.worth_it_score);
  const decisionLabel = getDecisionLabel(decision);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-subtle">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_112px_170px_180px] lg:items-center">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {decisionLabel}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Saved {new Date(decision.created_at).toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Score</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {score}
            <span className="text-sm text-slate-400">/100</span>
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Verdict</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {decision.result.verdict_label}
          </p>
          <p className={`mt-1 text-sm font-semibold tabular-nums ${savingsTone}`}>
            {formatMoney(savings, decision.payload.currency)}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Link
            href={`/decision/${decision.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-worth-brand hover:text-worth-brand"
            aria-label={`Open ${decisionLabel}`}
          >
            Open
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${decisionLabel}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusPanel({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-subtle">
      {message}
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-600 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-subtle">
      <h2 className="text-lg font-semibold text-slate-900">
        No saved decisions yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Create a decision dashboard, save it, and it will appear here for
        editing, comparison, and live tracking.
      </p>
      <Link
        href="/decision/new"
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-worth-accent px-4 text-sm font-medium text-white transition hover:bg-worth-accent-hover"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        New decision
      </Link>
    </section>
  );
}
