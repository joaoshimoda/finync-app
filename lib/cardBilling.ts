import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  normalizeDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";

export function getCardInvoiceMonthStart(date: string, closingDay?: number) {
  const normalizedDate = normalizeDateOnly(date);
  const { day, month, year } = getDateOnlyParts(normalizedDate);

  if (!closingDay || day < closingDay) {
    return toDateOnly(year, month, 1);
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return toDateOnly(nextYear, nextMonth, 1);
}

export function getInstallmentInvoiceMonthStart(
  purchaseDate: string,
  closingDay: number | undefined,
  installmentIndex: number,
) {
  const firstInvoiceMonth = getCardInvoiceMonthStart(purchaseDate, closingDay);
  const { month, year } = getDateOnlyParts(firstInvoiceMonth);
  const monthIndex = month - 1 + installmentIndex;
  const installmentYear = year + Math.floor(monthIndex / 12);
  const installmentMonth = (monthIndex % 12) + 1;

  return toDateOnly(installmentYear, installmentMonth, 1);
}

export function getCurrentFinancialMonthStart(
  cards: { closingDay?: number | null }[],
  referenceDate = getLocalTodayDateOnly(),
) {
  const invoiceMonths = cards
    .map((card) => getCardInvoiceMonthStart(referenceDate, card.closingDay ?? undefined))
    .sort();

  return invoiceMonths.at(-1) ?? toDateOnly(
    getDateOnlyParts(referenceDate).year,
    getDateOnlyParts(referenceDate).month,
    1,
  );
}
