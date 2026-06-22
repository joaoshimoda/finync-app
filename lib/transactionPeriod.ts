import { getDateOnlyParts } from "@/lib/dateUtils";

type PeriodTransaction = {
  type: string;
  date: string;
  billingMonthStart?: string | null;
};

export function getTransactionPeriodDate(transaction: PeriodTransaction) {
  return transaction.type === "card"
    ? transaction.billingMonthStart ?? transaction.date
    : transaction.date;
}

export function isTransactionInSelectedPeriod(
  transaction: PeriodTransaction,
  month: number,
  year: number,
) {
  const period = getDateOnlyParts(getTransactionPeriodDate(transaction));

  return period.month === month && period.year === year;
}
