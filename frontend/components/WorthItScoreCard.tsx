import type { CalculationResult } from "@/lib/types";

type WorthItScoreCardProps = {
  result: CalculationResult;
};

export function WorthItScoreCard({ result }: WorthItScoreCardProps) {
  const score = Math.round(result.worth_it_score);
  const tone = getTone(score);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        WorthIt Score
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <div className={`text-4xl font-semibold tabular-nums ${tone.text}`}>
            {score}
            <span className="text-xl text-slate-400">/100</span>
          </div>
          <p className={`mt-2 text-sm font-medium ${tone.text}`}>
            {result.verdict_label}
          </p>
        </div>
        <div className="h-16 w-16 rounded-lg border border-slate-200 bg-worth-page p-2">
          <div
            className={`h-full rounded-md ${tone.bg}`}
            style={{ height: `${Math.max(score, 8)}%`, marginTop: "auto" }}
          />
        </div>
      </div>
    </section>
  );
}

function getTone(score: number): { text: string; bg: string } {
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
