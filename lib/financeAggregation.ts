import { getCardSignedAmount } from "@/lib/cardCredits";
import { isTransactionInSelectedPeriod } from "@/lib/transactionPeriod";

export type ExpenseAggregationEntry = {
  id: string;
  type: string;
  date: string;
  billingMonthStart?: string | null;
  amount: number;
  description?: string;
  category?: string | null;
  notes?: string | null;
  dependentId?: string | null;
};

export type AggregatedExpenseEntry = ExpenseAggregationEntry & {
  signedAmount: number;
};

export function aggregatePeriodExpenses(
  entries: ExpenseAggregationEntry[],
  month: number,
  year: number,
  options: { excludeDependents?: boolean } = {},
) {
  const uniqueEntries = new Map<string, ExpenseAggregationEntry>();

  entries.forEach((entry) => {
    if (!uniqueEntries.has(entry.id)) {
      uniqueEntries.set(entry.id, entry);
    }
  });

  const expenses = [...uniqueEntries.values()].reduce<AggregatedExpenseEntry[]>(
    (result, entry) => {
      if (
        entry.type === "income" ||
        (options.excludeDependents && entry.dependentId) ||
        !isTransactionInSelectedPeriod(entry, month, year)
      ) {
        return result;
      }

      const signedAmount =
        entry.type === "card"
          ? getCardSignedAmount({
              ...entry,
              type: "card",
            })
          : entry.amount;

      result.push({ ...entry, signedAmount });
      return result;
    },
    [],
  );

  const fixed = expenses
    .filter((entry) => entry.type !== "card")
    .reduce((sum, entry) => sum + entry.signedAmount, 0);
  const card = expenses
    .filter((entry) => entry.type === "card")
    .reduce((sum, entry) => sum + entry.signedAmount, 0);

  return {
    entries: expenses,
    fixed: Number(fixed) || 0,
    card: Number(card) || 0,
    total: (Number(fixed) || 0) + (Number(card) || 0),
  };
}
