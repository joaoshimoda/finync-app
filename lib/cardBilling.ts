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

function addMonthsToMonthStart(monthStart: string, offset: number) {
  const { month, year } = getDateOnlyParts(monthStart);
  const monthIndex = month - 1 + offset;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonth = ((monthIndex % 12) + 12) % 12 + 1;

  return toDateOnly(nextYear, nextMonth, 1);
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function toClampedDateOnly(year: number, month: number, day: number) {
  return toDateOnly(year, month, Math.min(day, getLastDayOfMonth(year, month)));
}

export function getCardInvoiceCycle(
  invoiceMonthStart: string,
  closingDay?: number | null,
) {
  const normalizedInvoiceMonth = normalizeDateOnly(invoiceMonthStart);
  const safeClosingDay = Math.max(closingDay ?? 1, 1);
  const previousMonthStart = addMonthsToMonthStart(normalizedInvoiceMonth, -1);
  const invoiceParts = getDateOnlyParts(normalizedInvoiceMonth);
  const previousParts = getDateOnlyParts(previousMonthStart);
  const endParts =
    safeClosingDay === 1 ? previousParts : invoiceParts;
  const endDay =
    safeClosingDay === 1
      ? getLastDayOfMonth(previousParts.year, previousParts.month)
      : safeClosingDay - 1;

  return {
    endDate: toClampedDateOnly(
      endParts.year,
      endParts.month,
      endDay,
    ),
    startDate: toClampedDateOnly(
      previousParts.year,
      previousParts.month,
      safeClosingDay,
    ),
  };
}
