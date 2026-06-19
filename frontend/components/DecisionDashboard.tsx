"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, History, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { CostCurveChart } from "./CostCurveChart";
import { ScenarioTable } from "./ScenarioTable";
import { calculateDecision, saveDecision } from "@/lib/api";
import { formatMoney, formatNumber } from "@/lib/format";
import type { CalculationResult, DecisionPayload } from "@/lib/types";

type DecisionDashboardProps = {
  initialDecision: DecisionPayload;
  initialResult?: CalculationResult | null;
  initialDecisionId?: string | null;
};

export function DecisionDashboard({
  initialDecision,
  initialResult = null,
  initialDecisionId = null,
}: DecisionDashboardProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<DecisionPayload>(initialDecision);
  const [draftDecision, setDraftDecision] =
    useState<DecisionPayload>(initialDecision);
  const [result, setResult] = useState<CalculationResult | null>(initialResult);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const hasPendingChanges = useMemo(
    () => JSON.stringify(draftDecision) !== JSON.stringify(decision),
    [decision, draftDecision]
  );

  useEffect(() => {
    let cancelled = false;

    async function recalculate() {
      setCalculating(true);
      setError(null);

      try {
        const calculated = await calculateDecision(decision);
        if (!cancelled) {
          setResult(calculated);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Calculation failed");
        }
      } finally {
        if (!cancelled) {
          setCalculating(false);
        }
      }
    }

    void recalculate();

    return () => {
      cancelled = true;
    };
  }, [decision]);

  const handleStartTracker = async () => {
    setSaving(true);
    setError(null);

    try {
      if (initialDecisionId && !hasPendingChanges) {
        router.push(`/tracker/${initialDecisionId}`);
        return;
      }

      const saved = await saveDecision(
        hasPendingChanges ? draftDecision : decision
      );
      router.push(`/tracker/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tracker failed to start");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveValues = () => {
    setCalculating(true);
    setError(null);
    setDecision(draftDecision);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Interactive decision dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {decision.title}
            </h1>
            <CompactComparison
              optionAName={decision.option_a.name}
              optionBName={decision.option_b.name}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/decisions"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-worth-brand hover:text-worth-brand"
            >
              <History className="h-4 w-4" aria-hidden="true" />
              My Decisions
            </Link>
            <button
              onClick={handleStartTracker}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-worth-accent px-4 text-sm font-medium text-white transition hover:bg-worth-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Activity className="h-4 w-4" aria-hidden="true" />
              {saving ? "Starting..." : "Start live tracker"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {result ? (
        <ResultSummaryCard
          decision={decision}
          result={result}
          onEditAssumptions={() => setShowAssumptions((current) => !current)}
          assumptionsOpen={showAssumptions}
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-subtle">
          {calculating ? "Calculating..." : "Waiting for calculation..."}
        </div>
      )}

      {showAssumptions && (
        <AssumptionsPanel
          decision={draftDecision}
          hasPendingChanges={hasPendingChanges}
          savingValues={calculating}
          onDecisionChange={(nextDecision) => setDraftDecision(nextDecision)}
          onSaveValues={handleSaveValues}
        />
      )}

      {result && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <CostCurveChart decision={decision} result={result} />
          <ScenarioTable decision={decision} result={result} />
        </div>
      )}
    </div>
  );
}

type CompactComparisonProps = {
  optionAName: string;
  optionBName: string;
};

function CompactComparison({
  optionAName,
  optionBName,
}: CompactComparisonProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex max-w-full items-center rounded-full border border-worth-brand/25 bg-worth-brand-soft px-3 py-1 font-medium text-worth-brand">
        <span className="truncate">{optionAName}</span>
      </span>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        vs
      </span>
      <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
        <span className="truncate">{optionBName}</span>
      </span>
    </div>
  );
}

type ResultSummaryCardProps = {
  decision: DecisionPayload;
  result: CalculationResult;
  assumptionsOpen: boolean;
  onEditAssumptions: () => void;
};

function ResultSummaryCard({
  decision,
  result,
  assumptionsOpen,
  onEditAssumptions,
}: ResultSummaryCardProps) {
  const score = Math.round(result.worth_it_score);
  const tone = getScoreTone(score);
  const savingsTone =
    result.value_adjusted_savings >= 0 ? "text-green-600" : "text-red-600";
  const betterValue =
    result.value_adjusted_savings >= 0
      ? decision.option_a.name
      : decision.option_b.name;
  const breakEvenText =
    result.break_even_uses === null
      ? "No break-even"
      : `${formatNumber(result.break_even_uses, 0)} uses`;
  const breakEvenHelper =
    result.break_even_uses_per_day === null
      ? "Current costs do not create a normal break-even point."
      : `${formatNumber(result.break_even_uses_per_day, 2)} uses per day`;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-stretch">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Result summary
          </p>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold leading-tight text-slate-900">
                {result.verdict_label}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                {result.verdict_summary}
              </p>
            </div>
            <button
              type="button"
              onClick={onEditAssumptions}
              className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-worth-brand hover:text-worth-brand"
              aria-expanded={assumptionsOpen}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {assumptionsOpen ? "Hide assumptions" : "Edit assumptions"}
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
              label="Break-even"
              value={breakEvenText}
              helper={breakEvenHelper}
            />
            <SummaryMetric
              label="You expect"
              value={`${formatNumber(result.expected_uses, 0)} uses`}
              helper="Expected usage"
            />
            <SummaryMetric
              label={decision.option_a.name}
              value={formatMoney(result.option_a_total, decision.currency)}
              helper="Option A cost"
            />
            <SummaryMetric
              label={decision.option_b.name}
              value={formatMoney(result.option_b_total, decision.currency)}
              helper="Option B cost"
            />
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-worth-page p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            WorthIt Score
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className={`text-5xl font-semibold tabular-nums ${tone.text}`}>
                {score}
                <span className="text-2xl text-slate-400">/100</span>
              </p>
              <p className={`mt-2 text-sm font-semibold ${tone.text}`}>
                {result.verdict_label}
              </p>
            </div>
            <div className="flex h-20 w-20 items-end rounded-lg border border-slate-200 bg-white p-2">
              <div
                className={`w-full rounded-md ${tone.bg}`}
                style={{ height: `${Math.max(score, 8)}%` }}
              />
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Expected savings</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${savingsTone}`}>
              {formatMoney(result.value_adjusted_savings, decision.currency)}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Better value:{" "}
              <span className="font-medium text-slate-700">{betterValue}</span>
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-worth-page p-4">
      <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function getScoreTone(score: number): { text: string; bg: string } {
  if (score >= 75) {
    return { text: "text-green-600", bg: "bg-green-600" };
  }
  if (score >= 60) {
    return { text: "text-worth-brand", bg: "bg-worth-brand" };
  }
  if (score >= 45) {
    return { text: "text-amber-600", bg: "bg-amber-600" };
  }
  return { text: "text-red-600", bg: "bg-red-600" };
}
