export type CurrencyCode = "BRL" | "USD" | "EUR";

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: CurrencyCode, compact: boolean) {
  const cacheKey = `${currency}:${compact ? "compact" : "standard"}`;
  const cachedFormatter = currencyFormatterCache.get(cacheKey);

  if (cachedFormatter) return cachedFormatter;

  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    ...(compact
      ? {
          notation: "compact" as const,
          maximumFractionDigits: 1,
        }
      : {}),
  });

  currencyFormatterCache.set(cacheKey, formatter);
  return formatter;
}

function normalizeCurrencyValue(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function formatCurrency(
  value: number | null | undefined,
  currency: CurrencyCode = "BRL",
) {
  return getFormatter(currency, false).format(normalizeCurrencyValue(value));
}

export function formatCompactCurrency(
  value: number | null | undefined,
  currency: CurrencyCode = "BRL",
) {
  return getFormatter(currency, true).format(normalizeCurrencyValue(value));
}

export function getCurrencySymbol(currency: CurrencyCode = "BRL") {
  return (
    getFormatter(currency, false)
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

export function getHiddenCurrencyLabel(currency: CurrencyCode = "BRL") {
  return `${getCurrencySymbol(currency)} ••••`;
}
