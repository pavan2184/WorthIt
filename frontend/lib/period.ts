export const PERIOD_PRESETS = [
  { value: "1_day", label: "1 day", days: 1 },
  { value: "1_week", label: "1 week", days: 7 },
  { value: "1_month", label: "1 month", days: 30 },
  { value: "1_year", label: "1 year", days: 365 },
  { value: "custom", label: "Custom", days: 30 },
] as const;

export const CUSTOM_PERIOD_UNITS = [
  { value: "days", singular: "day", plural: "days", days: 1 },
  { value: "weeks", singular: "week", plural: "weeks", days: 7 },
  { value: "months", singular: "month", plural: "months", days: 30 },
  { value: "years", singular: "year", plural: "years", days: 365 },
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]["value"];
export type CustomPeriodUnit = (typeof CUSTOM_PERIOD_UNITS)[number]["value"];

export const DEFAULT_PERIOD_PRESET: PeriodPreset = "1_month";
export const DEFAULT_PERIOD_DAYS = 30;
export const DEFAULT_CUSTOM_PERIOD_UNIT: CustomPeriodUnit = "days";

export function getPeriodPresetDays(preset: PeriodPreset): number {
  return (
    PERIOD_PRESETS.find((option) => option.value === preset)?.days ??
    DEFAULT_PERIOD_DAYS
  );
}

export function getPeriodLabel(days: number): string {
  if (days === 1) return "1 day";
  if (days === 7) return "1 week";
  if (days === 30) return "1 month";
  if (days === 365) return "1 year";
  return `${days} days`;
}

export function getCustomPeriodDays(
  amount: number,
  unit: CustomPeriodUnit
): number {
  const daysPerUnit =
    CUSTOM_PERIOD_UNITS.find((option) => option.value === unit)?.days ?? 1;

  return Math.max(1, Math.round(amount * daysPerUnit));
}

export function getCustomPeriodLabel(
  amount: number,
  unit: CustomPeriodUnit
): string {
  const option = CUSTOM_PERIOD_UNITS.find((item) => item.value === unit);
  const unitLabel = amount === 1 ? option?.singular : option?.plural;

  return `${amount} ${unitLabel ?? unit}`;
}

export function normalizePeriodDays(value: string | null | undefined): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PERIOD_DAYS;
  }

  return Math.max(1, Math.round(parsed));
}
