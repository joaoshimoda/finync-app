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

function normalizeCategory(value: string | null | undefined) {
  return (value?.trim() || "Outros")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function toMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getCategoryBudgetSpent(
  transactions: BudgetTransaction[],
  categoryLabel: string,
  month: number,
  year: number,
) {
  const normalizedCategory = normalizeCategory(categoryLabel);
  const spent = transactions
    .filter(
      (transaction) =>
        transaction.type !== "income" &&
        !transaction.dependentId &&
        normalizeCategory(transaction.category) === normalizedCategory &&
        isTransactionInSelectedCompetence(transaction, month, year),
    )
    .reduce(
      (total, transaction) =>
        total +
        (transaction.type === "card"
          ? getCardSignedAmount(transaction)
          : transaction.amount),
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
