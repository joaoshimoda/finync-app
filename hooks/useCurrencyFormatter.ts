"use client";

import { useMemo } from "react";

import {
  formatCompactCurrency as formatCompactCurrencyValue,
  formatCurrency as formatCurrencyValue,
  getCurrencySymbol,
  getHiddenCurrencyLabel,
} from "@/lib/currency";
import { useFinanceStore } from "@/store/useFinanceStore";

export function useCurrencyFormatter() {
  const currency = useFinanceStore((state) => state.defaultCurrency);

  return useMemo(
    () => ({
      currency,
      currencySymbol: getCurrencySymbol(currency),
      hiddenCurrencyLabel: getHiddenCurrencyLabel(currency),
      formatCurrency: (value: number | null | undefined) =>
        formatCurrencyValue(value, currency),
      formatCompactCurrency: (value: number | null | undefined) =>
        formatCompactCurrencyValue(value, currency),
    }),
    [currency],
  );
}
