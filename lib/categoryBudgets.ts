import { getCardSignedAmount } from "./cardCredits.ts";
import { isTransactionInSelectedCompetence } from "./transactionPeriod.ts";

type BudgetTransaction = {
  amount: number;
  billingMonthStart?: string | null;
  category?: string | null;
  date: string;
  dependentId?: string | null;
  notes?: string | null;
  type: "income" | "fixed" | "card";
};

export type CategoryBudgetStatus = "on_track" | "attention" | "exceeded";

export function normalizeCategory(value: string | null | undefined) {
  return (value?.trim() || "Outros")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function toMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* Personal spending of the month: no income, no dependents' purchases. */
export function isPersonalSpendingInMonth(
  transaction: BudgetTransaction,
  month: number,
  year: number,
) {
  return (
    transaction.type !== "income" &&
    !transaction.dependentId &&
    isTransactionInSelectedCompetence(transaction, month, year)
  );
}

export function getBudgetTransactionAmount(transaction: BudgetTransaction) {
  return transaction.type === "card"
    ? getCardSignedAmount(transaction)
    : transaction.amount;
}

export function getCategoryBudgetTransactions<T extends BudgetTransaction>(
  transactions: T[],
  categoryLabel: string,
  month: number,
  year: number,
) {
  const normalizedCategory = normalizeCategory(categoryLabel);

  return transactions.filter(
    (transaction) =>
      isPersonalSpendingInMonth(transaction, month, year) &&
      normalizeCategory(transaction.category) === normalizedCategory,
  );
}

export function getCategoryBudgetSpent(
  transactions: BudgetTransaction[],
  categoryLabel: string,
  month: number,
  year: number,
) {
  const spent = getCategoryBudgetTransactions(
    transactions,
    categoryLabel,
    month,
    year,
  ).reduce(
    (total, transaction) => total + getBudgetTransactionAmount(transaction),
    0,
  );

  return Math.max(toMoney(spent), 0);
}

export function getCategoryBudgetMetrics(
  amount: number,
  spent: number,
  alertThresholdPercent = 80,
) {
  const safeAmount = Math.max(amount, 0);
  const safeSpent = Math.max(spent, 0);
  const percentage = safeAmount > 0 ? (safeSpent / safeAmount) * 100 : 0;
  const status: CategoryBudgetStatus =
    percentage > 100
      ? "exceeded"
      : percentage >= alertThresholdPercent
        ? "attention"
        : "on_track";

  return {
    available: toMoney(Math.max(safeAmount - safeSpent, 0)),
    exceededBy: toMoney(Math.max(safeSpent - safeAmount, 0)),
    percentage,
    progress: Math.min(percentage, 100),
    status,
  };
}
