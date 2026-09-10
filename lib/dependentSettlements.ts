import { getCardSignedAmount } from "./cardCredits.ts";

type DependentTransaction = {
  amount: number;
  type?: string | null;
  dependentId?: string | null;
  category?: string | null;
  notes?: string | null;
};

type Settlement = {
  amount: number;
  dependentId: string;
  status: "confirmed" | "voided";
};

function toMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getDependentObligationTotal(
  transactions: DependentTransaction[],
  dependentId: string,
) {
  const total = transactions
    .filter(
      (transaction) =>
        transaction.dependentId === dependentId &&
        transaction.type !== "income",
    )
    .reduce(
      (sum, transaction) =>
        sum +
        (transaction.type === "card"
          ? getCardSignedAmount(transaction)
          : transaction.amount),
      0,
    );

  return Math.max(toMoney(total), 0);
}

export function getDependentSettledTotal(
  settlements: Settlement[],
  dependentId: string,
) {
  return toMoney(
    settlements
      .filter(
        (settlement) =>
          settlement.dependentId === dependentId &&
          settlement.status === "confirmed",
      )
      .reduce((sum, settlement) => sum + settlement.amount, 0),
  );
}

export function getDependentSettlementSummary(
  transactions: DependentTransaction[],
  settlements: Settlement[],
  dependentId: string,
) {
  const obligationTotal = getDependentObligationTotal(
    transactions,
    dependentId,
  );
  const settledTotal = getDependentSettledTotal(settlements, dependentId);
  const outstanding = Math.max(toMoney(obligationTotal - settledTotal), 0);

  return {
    obligationTotal,
    settledTotal,
    outstanding,
    progress:
      obligationTotal > 0
        ? Math.min((settledTotal / obligationTotal) * 100, 100)
        : 0,
  };
}
