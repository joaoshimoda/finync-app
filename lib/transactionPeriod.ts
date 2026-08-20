import { getDateOnlyParts } from "@/lib/dateUtils";

type PeriodTransaction = {
  type: string;
  date: string;
  billingMonthStart?: string | null;
};

export function getTransactionCompetenceDate(transaction: PeriodTransaction) {
  return transaction.type === "card"
    ? transaction.billingMonthStart ?? transaction.date
    : transaction.date;
}

export function getTransactionPeriodDate(transaction: PeriodTransaction) {
  return getTransactionCompetenceDate(transaction);
}

export function isCalendarTransactionInSelectedMonth(
  transaction: PeriodTransaction,
  month: number,
  year: number,
) {
  if (transaction.type === "card") return false;

  const period = getDateOnlyParts(transaction.date);

  return period.month === month && period.year === year;
}

export function isCardTransactionInSelectedInvoiceMonth(
  transaction: PeriodTransaction,
  month: number,
  year: number,
) {
  if (transaction.type !== "card") return false;

  const period = getDateOnlyParts(
    transaction.billingMonthStart ?? transaction.date,
  );

  return period.month === month && period.year === year;
}

export function isTransactionInSelectedCompetence(
  transaction: PeriodTransaction,
  month: number,
  year: number,
) {
  return transaction.type === "card"
    ? isCardTransactionInSelectedInvoiceMonth(transaction, month, year)
    : isCalendarTransactionInSelectedMonth(transaction, month, year);
}

export function isTransactionInSelectedPeriod(
  transaction: PeriodTransaction,
  month: number,
  year: number,
) {
  return isTransactionInSelectedCompetence(transaction, month, year);
}
