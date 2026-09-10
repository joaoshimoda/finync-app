import {
  getDateOnlyParts,
  normalizeDateOnly,
  toDateOnly,
} from "./dateUtils.ts";

export function addMonthsToDateOnly(date: string, monthsToAdd: number) {
  const { day, month, year } = getDateOnlyParts(normalizeDateOnly(date));
  const monthIndex = month - 1 + monthsToAdd;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonth = (((monthIndex % 12) + 12) % 12) + 1;
  const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();

  return toDateOnly(nextYear, nextMonth, Math.min(day, lastDayOfNextMonth));
}

export function splitAmountIntoInstallments(
  totalAmount: number,
  installments: number,
) {
  if (!Number.isInteger(installments) || installments < 1) {
    throw new RangeError("Installments must be a positive integer.");
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / installments);
  const remainder = totalCents % installments;

  return Array.from({ length: installments }, (_, index) => {
    const cents = baseCents + (index < remainder ? 1 : 0);

    return Number((cents / 100).toFixed(2));
  });
}

export function buildMonthlyProjectionDates(date: string, occurrences: number) {
  if (!Number.isInteger(occurrences) || occurrences < 1) {
    throw new RangeError("Occurrences must be a positive integer.");
  }

  return Array.from({ length: occurrences }, (_, index) =>
    addMonthsToDateOnly(date, index),
  );
}
