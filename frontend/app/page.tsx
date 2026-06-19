"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bike,
  Building2,
  Calculator,
  CalendarDays,
  Camera,
  CircleDollarSign,
  ClipboardList,
  Clapperboard,
  Dumbbell,
  Gauge,
  ListChecks,
  Save,
  Sparkles,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { DecisionInput } from "@/components/DecisionInput";
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "@/lib/currency";
import {
  CUSTOM_PERIOD_UNITS,
  DEFAULT_CUSTOM_PERIOD_UNIT,
  DEFAULT_PERIOD_DAYS,
  DEFAULT_PERIOD_PRESET,
  PERIOD_PRESETS,
  getCustomPeriodDays,
  getCustomPeriodLabel,
  getPeriodLabel,
  getPeriodPresetDays,
  type CustomPeriodUnit,
  type PeriodPreset,
} from "@/lib/period";
import type { InputMode } from "@/lib/types";

const comparisonWorkflows = [
  {
    title: "Monthly scooter rental vs GrabBike",
    prompt: "Is renting a scooter in HCMC for 1 month worth it compared to GrabBike?",
    description:
      "Compare a fixed rental commitment against ride-by-ride transport costs.",
    primarySignal: "Break-even trips",
    costSignal: "Rental, fuel, parking, GrabBike fare",
    proofSignal: "Log real trips and matched GrabBike costs",
    icon: <Bike className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Netflix subscription vs pay-per-view",
    prompt: "Is a Netflix subscription worth it compared to pay-per-view?",
    description:
      "See how many movies or shows make the subscription beat per-title rentals.",
    primarySignal: "Views per month",
    costSignal: "Plan price, rentals, unused-month risk",
    proofSignal: "Track actual watching habits",
    icon: <Clapperboard className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Gym membership vs day pass",
    prompt: "Is a gym membership worth it compared to day passes?",
    description:
      "Turn vague fitness intentions into a usage threshold you can judge.",
    primarySignal: "Visits needed",
    costSignal: "Membership, day passes, joining fee",
    proofSignal: "Compare planned visits with reality",
    icon: <Dumbbell className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Buy camera vs rent camera",
    prompt: "Should I buy a camera or rent one when I need it?",
    description:
      "Check whether ownership beats renting once maintenance and usage are visible.",
    primarySignal: "Uses to justify buying",
    costSignal: "Purchase price, rental rate, upkeep",
    proofSignal: "Revisit after shoots or trips",
    icon: <Camera className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Coworking pass vs cafes",
    prompt: "Is a coworking pass worth it compared to working from cafes?",
    description:
      "Compare a monthly workspace pass against cafe spend and work-session patterns.",
    primarySignal: "Work sessions needed",
    costSignal: "Pass, cafe spend, commute, meeting rooms",
    proofSignal: "Track work days and spend",
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
  },
];

const workflowSteps = [
  {
    title: "Pick a workflow",
    detail: "Start with a known comparison, from transport to subscriptions.",
    icon: <ClipboardList className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Set the context",
    detail: "Pick currency, period, and whether to start from estimates or your values.",
    icon: <ListChecks className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Review the math",
    detail: "Compare direct cost, time value, hidden expenses, and break-even logic.",
    icon: <Gauge className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Track reality",
    detail: "Save the decision and log usage to see if the choice stays worth it.",
    icon: <Save className="h-5 w-5" aria-hidden="true" />,
  },
];

const sampleSignals = [
  {
    label: "Break-even point",
    detail: "Trips needed before rental beats ride-hailing.",
    icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "Cost sources",
    detail: "Rental, fuel, parking, and matched GrabBike costs.",
    icon: <CircleDollarSign className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: "Time value",
    detail: "Commute minutes become part of the comparison.",
    icon: <TimerReset className="h-4 w-4" aria-hidden="true" />,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("use_estimates");
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(
    DEFAULT_PERIOD_PRESET
  );
  const [customPeriodAmount, setCustomPeriodAmount] =
    useState(DEFAULT_PERIOD_DAYS);
  const [customPeriodUnit, setCustomPeriodUnit] = useState<CustomPeriodUnit>(
    DEFAULT_CUSTOM_PERIOD_UNIT
  );
  const customPeriodDays = getCustomPeriodDays(
    customPeriodAmount,
    customPeriodUnit
  );
  const selectedDays =
    periodPreset === "custom"
      ? customPeriodDays
      : getPeriodPresetDays(periodPreset);
  const periodLabel =
    periodPreset === "custom"
      ? getCustomPeriodLabel(customPeriodAmount, customPeriodUnit)
      : getPeriodLabel(selectedDays);

  const buildDecisionUrl = (prompt: string, mode: InputMode) => {
    const params = new URLSearchParams({
      prompt,
      inputMode: mode,
      currency,
      days: String(selectedDays),
    });

    return `/decision/new?${params.toString()}`;
  };

  const analyze = () => {
    const prompt = value.trim();
    if (!prompt) return;
    router.push(buildDecisionUrl(prompt, inputMode));
  };

  const startWorkflow = (prompt: string) => {
    router.push(buildDecisionUrl(prompt, "use_estimates"));
  };

  return (
    <main className="min-h-screen bg-worth-page">
      <div className="bg-worth-brand text-white">
        <AppHeader active="new" variant="brand" />
        <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-white sm:text-base">
            <span
              className="h-2 w-2 rounded-full bg-white"
              aria-hidden="true"
            />
            NextGenHacks 2026 submission
          </p>
          <h1 className="mt-8 text-6xl font-black leading-none text-white sm:text-7xl lg:text-8xl">
            WorthIt
          </h1>
          <p className="mt-8 max-w-5xl text-xl leading-8 text-slate-100 sm:text-2xl sm:leading-10">
            A break-even application that compares cost, time, and value before
            you commit, then tracks the outcome in real time.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#decision-builder"
              className="inline-flex h-12 items-center justify-center gap-3 rounded-lg bg-white px-5 text-base font-semibold text-worth-brand transition hover:bg-slate-100"
            >
              Get Started
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </a>
            <Link
              href="/decisions"
              className="inline-flex h-12 items-center justify-center gap-3 rounded-lg px-5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              View Decisions
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <section
        className="bg-worth-page"
        aria-labelledby="product-flow-heading"
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-worth-muted">
              Product flow
            </p>
            <h2
              id="product-flow-heading"
              className="mt-1 text-2xl font-semibold text-worth-ink"
            >
              How WorthIt works
            </h2>
          </div>

          <div className="mt-8 flex flex-col items-stretch gap-4 lg:flex-row lg:gap-3">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="contents"
              >
                <article className="min-h-40 flex-1 rounded-lg border border-worth-border bg-worth-surface p-5 shadow-lg shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-worth-border bg-worth-brand-soft text-worth-brand">
                    {step.icon}
                  </span>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-worth-muted">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-worth-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-worth-muted">
                    {step.detail}
                  </p>
                </article>

                {index < workflowSteps.length - 1 && (
                  <div
                    className="flex items-center justify-center text-worth-gold lg:w-10 lg:shrink-0"
                    aria-hidden="true"
                  >
                    <ArrowRight className="h-6 w-6 rotate-90 lg:rotate-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-worth-page" aria-labelledby="example-output-heading">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-worth-border bg-worth-surface p-5 shadow-subtle sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-worth-muted">
              Example output
            </p>
            <h2
              id="example-output-heading"
              className="mt-1 text-2xl font-semibold text-worth-ink"
            >
              Monthly scooter rental vs GrabBike
            </h2>
            <p className="mt-3 text-sm leading-6 text-worth-muted">
              WorthIt turns a familiar travel choice into the exact signals you
              need before committing.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {sampleSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="flex items-start gap-3 rounded-lg border border-worth-border bg-worth-page p-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-worth-accent-soft text-worth-accent">
                    {signal.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-worth-ink">
                      {signal.label}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-worth-muted">
                      {signal.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <a
              href="#decision-builder"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-worth-accent px-4 text-sm font-medium text-white transition hover:bg-worth-accent-hover"
            >
              Try your own comparison
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <div
        id="decision-builder"
        className="mx-auto w-full max-w-7xl scroll-mt-6 px-4 pb-8 pt-2 sm:px-6 lg:px-8"
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-worth-muted">
              Workspace
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-worth-ink">
              New decision
            </h2>
          </div>
          <p className="text-sm text-worth-muted">
            {currency} · {periodLabel}
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <QuickStartWorkflows onStart={startWorkflow} />
            <DecisionInput
              value={value}
              onChange={setValue}
              onAnalyze={analyze}
              inputMode={inputMode}
              onInputModeChange={setInputMode}
              title="Or describe your own decision"
              showExamples={false}
              badge="Upcoming feature"
              disabled
            />
          </div>

          <aside className="space-y-3">
            <div className="rounded-lg border border-worth-border bg-worth-surface p-4 shadow-subtle">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-worth-border bg-worth-accent-soft text-worth-accent">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-worth-ink">
                    Demo-safe start
                  </p>
                  <p className="mt-1 text-sm leading-6 text-worth-muted">
                    Workflow cards open with WorthIt estimates first. You can
                    still edit every value once the dashboard is built.
                  </p>
                </div>
              </div>
            </div>
            <CurrencyStatusItem
              icon={<Calculator className="h-4 w-4" aria-hidden="true" />}
              label="Currency"
              value={currency}
              onChange={setCurrency}
            />
            <PeriodStatusItem
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              label="Period"
              preset={periodPreset}
              customAmount={customPeriodAmount}
              customUnit={customPeriodUnit}
              onPresetChange={setPeriodPreset}
              onCustomAmountChange={setCustomPeriodAmount}
              onCustomUnitChange={setCustomPeriodUnit}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function QuickStartWorkflows({
  onStart,
}: {
  onStart: (prompt: string) => void;
}) {
  return (
    <section aria-labelledby="quick-start-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-worth-muted">
            Quick start
          </p>
          <h3
            id="quick-start-heading"
            className="mt-1 text-lg font-semibold text-worth-ink"
          >
            Pick a ready-made comparison
          </h3>
        </div>
        <p className="max-w-xl text-sm leading-6 text-worth-muted">
          Launch with estimates, then adjust the assumptions in the dashboard.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {comparisonWorkflows.map((workflow) => (
          <button
            key={workflow.title}
            type="button"
            onClick={() => onStart(workflow.prompt)}
            className="group flex min-h-64 flex-col rounded-lg border border-worth-border bg-worth-surface p-4 text-left shadow-subtle transition hover:-translate-y-0.5 hover:border-worth-brand hover:shadow-lg hover:shadow-slate-200/70 focus:outline-none focus:ring-2 focus:ring-worth-brand focus:ring-offset-2"
            aria-label={`Start ${workflow.title}`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-worth-border bg-worth-brand-soft text-worth-brand transition group-hover:border-worth-brand">
              {workflow.icon}
            </span>
            <span className="mt-4 block text-base font-semibold leading-6 text-worth-ink">
              {workflow.title}
            </span>
            <span className="mt-2 block text-sm leading-6 text-worth-muted">
              {workflow.description}
            </span>

            <span className="mt-4 grid gap-2 text-xs leading-5 text-worth-muted">
              <span className="rounded-lg bg-worth-page px-3 py-2">
                <span className="font-medium text-worth-ink">Signal:</span>{" "}
                {workflow.primarySignal}
              </span>
              <span className="rounded-lg bg-worth-page px-3 py-2">
                <span className="font-medium text-worth-ink">Costs:</span>{" "}
                {workflow.costSignal}
              </span>
              <span className="rounded-lg bg-worth-page px-3 py-2">
                <span className="font-medium text-worth-ink">Tracker:</span>{" "}
                {workflow.proofSignal}
              </span>
            </span>

            <span className="mt-auto inline-flex pt-4 text-sm font-medium text-worth-accent">
              Start with estimates
              <ArrowRight
                className="ml-2 h-4 w-4 transition group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PeriodStatusItem({
  icon,
  label,
  preset,
  customAmount,
  customUnit,
  onPresetChange,
  onCustomAmountChange,
  onCustomUnitChange,
}: {
  icon: ReactNode;
  label: string;
  preset: PeriodPreset;
  customAmount: number;
  customUnit: CustomPeriodUnit;
  onPresetChange: (preset: PeriodPreset) => void;
  onCustomAmountChange: (amount: number) => void;
  onCustomUnitChange: (unit: CustomPeriodUnit) => void;
}) {
  return (
    <div className="rounded-lg border border-worth-border bg-worth-surface p-4 shadow-subtle">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-worth-border bg-worth-brand-soft text-worth-brand">
            {icon}
          </span>
          <span className="truncate text-sm font-medium text-worth-ink">
            {label}
          </span>
        </div>
        <select
          aria-label="Period"
          value={preset}
          onChange={(event) => onPresetChange(event.target.value as PeriodPreset)}
          className="h-10 min-w-28 shrink-0 rounded-lg border border-worth-border bg-worth-surface px-3 text-sm font-medium text-worth-muted outline-none transition focus:border-worth-brand"
        >
          {PERIOD_PRESETS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {preset === "custom" && (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_120px] gap-2">
          <label className="block">
            <span className="sr-only">Custom period amount</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={customAmount}
              onChange={(event) =>
                onCustomAmountChange(
                  Math.max(1, Math.round(Number(event.target.value) || 1))
                )
              }
              className="h-10 w-full rounded-lg border border-worth-border bg-worth-surface px-3 text-sm font-medium text-worth-muted outline-none transition focus:border-worth-brand"
              aria-label="Custom period amount"
            />
          </label>
          <label className="block">
            <span className="sr-only">Custom period unit</span>
            <select
              aria-label="Custom period unit"
              value={customUnit}
              onChange={(event) =>
                onCustomUnitChange(event.target.value as CustomPeriodUnit)
              }
              className="h-10 w-full rounded-lg border border-worth-border bg-worth-surface px-3 text-sm font-medium text-worth-muted outline-none transition focus:border-worth-brand"
            >
              {CUSTOM_PERIOD_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.plural}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

function CurrencyStatusItem({
  icon,
  label,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-worth-border bg-worth-surface p-4 shadow-subtle">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-worth-border bg-worth-brand-soft text-worth-brand">
          {icon}
        </span>
        <span className="truncate text-sm font-medium text-worth-ink">
          {label}
        </span>
      </div>
      <select
        aria-label="Currency"
        value={value}
        onChange={(event) => onChange(event.target.value as CurrencyCode)}
        className="h-10 min-w-24 shrink-0 rounded-lg border border-worth-border bg-worth-surface px-3 text-sm font-medium text-worth-muted outline-none transition focus:border-worth-brand"
      >
        {SUPPORTED_CURRENCIES.map((currencyCode) => (
          <option key={currencyCode} value={currencyCode}>
            {currencyCode}
          </option>
        ))}
      </select>
    </div>
  );
}
