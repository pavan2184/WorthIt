export const SUPPORTED_CURRENCIES = [
  "VND",
  "USD",
  "EUR",
  "GBP",
  "SGD",
  "INR",
  "JPY",
  "AUD",
  "CAD",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "VND";

export function normalizeCurrency(value: string | null | undefined): CurrencyCode {
  const normalized = value?.toUpperCase();

  if (SUPPORTED_CURRENCIES.some((currency) => currency === normalized)) {
    return normalized as CurrencyCode;
  }

  return DEFAULT_CURRENCY;
}
