import { formatNumber } from "@/lib/format";
import type { CalculationResult } from "@/lib/types";

type BreakEvenCardProps = {
  result: CalculationResult;
};

export function BreakEvenCard({ result }: BreakEvenCardProps) {
  const needed =
    result.break_even_uses === null
      ? null
      : Math.max(result.break_even_uses - result.expected_uses, 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Break-even point
      </p>
      <div className="mt-3">
        <p className="text-3xl font-semibold tabular-nums text-slate-900">
          {result.break_even_uses === null
            ? "No break-even"
            : `${formatNumber(result.break_even_uses, 0)} uses`}
        </p>
        {result.break_even_uses_per_day !== null && (
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(result.break_even_uses_per_day, 2)} uses per day
          </p>
        )}
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-worth-page p-3">
        <p className="text-sm text-slate-500">You expect</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
          {formatNumber(result.expected_uses, 0)} uses
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {needed === null
            ? "Current variable costs do not create a normal break-even point."
            : needed === 0
              ? "You are at or above break-even."
              : `You need ${formatNumber(needed, 0)} more uses to break even.`}
        </p>
      </div>
    </section>
  );
}
