export function formatMoney(value: number, currency = "VND"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(value);
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function frequencyLabel(frequency: string): string {
  const labels: Record<string, string> = {
    one_time: "one-time",
    per_use: "per use",
    per_day: "per day",
    per_week: "per week",
    per_month: "per month",
    per_year: "per year",
  };

  return labels[frequency] || frequency;
}
