import { formatMoney, formatNumber } from "@/lib/format";
import type { CalculationResult, DecisionPayload } from "@/lib/types";

type ScenarioTableProps = {
  decision: DecisionPayload;
  result: CalculationResult;
};

export function ScenarioTable({ decision, result }: ScenarioTableProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-subtle">
      <h2 className="text-lg font-semibold text-slate-900">
        Scenario comparison
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-3 font-medium">Scenario</th>
              <th className="py-3 font-medium">Uses</th>
              <th className="py-3 font-medium">{decision.option_a.name}</th>
              <th className="py-3 font-medium">{decision.option_b.name}</th>
              <th className="py-3 font-medium">Savings</th>
            </tr>
          </thead>
          <tbody>
            {result.scenario_results.map((scenario) => (
              <tr key={scenario.label} className="border-b border-slate-100">
                <td className="py-3 font-medium text-slate-900">
                  {scenario.label}
                </td>
                <td className="py-3 tabular-nums text-slate-700">
                  {formatNumber(scenario.uses, 0)}
                </td>
                <td className="py-3 tabular-nums text-slate-700">
                  {formatMoney(scenario.option_a_total, decision.currency)}
                </td>
                <td className="py-3 tabular-nums text-slate-700">
                  {formatMoney(scenario.option_b_total, decision.currency)}
                </td>
                <td
                  className={`py-3 font-semibold tabular-nums ${
                    scenario.savings >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatMoney(scenario.savings, decision.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
