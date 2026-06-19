import { formatMoney, formatNumber } from "@/lib/format";
import type { CalculationResult, DecisionPayload } from "@/lib/types";

type VerdictCardProps = {
  decision: DecisionPayload;
  result: CalculationResult;
};

export function VerdictCard({ decision, result }: VerdictCardProps) {
  const savingsTone =
    result.value_adjusted_savings >= 0 ? "text-green-600" : "text-red-600";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Verdict
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            {result.verdict_label}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {result.verdict_summary}
          </p>
        </div>
        <div className="min-w-40 rounded-lg border border-slate-200 bg-worth-page p-3">
          <p className="text-xs text-slate-500">Expected savings</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${savingsTone}`}>
            {formatMoney(result.value_adjusted_savings, decision.currency)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          label={decision.option_a.name}
          value={formatMoney(result.option_a_total, decision.currency)}
        />
        <Metric
          label={decision.option_b.name}
          value={formatMoney(result.option_b_total, decision.currency)}
        />
        <Metric
          label="Expected usage"
          value={`${formatNumber(result.expected_uses, 0)} uses`}
        />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-worth-page p-3">
      <p className="truncate text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
