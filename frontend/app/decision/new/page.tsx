import { NewDecisionClient } from "./NewDecisionClient";
import { normalizeCurrency } from "@/lib/currency";
import { normalizePeriodDays } from "@/lib/period";

type NewDecisionPageProps = {
  searchParams: Promise<{
    prompt?: string;
    inputMode?: string;
    currency?: string;
    days?: string;
  }>;
};

export default async function NewDecisionPage({
  searchParams,
}: NewDecisionPageProps) {
  const params = await searchParams;

  return (
    <NewDecisionClient
      initialPrompt={params.prompt || ""}
      initialInputMode={
        params.inputMode === "user_values" ? "user_values" : "use_estimates"
      }
      initialCurrency={normalizeCurrency(params.currency)}
      initialDays={normalizePeriodDays(params.days)}
    />
  );
}
