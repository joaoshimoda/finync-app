"use client";

import { useMemo } from "react";

import { getCardSignedAmount, isCardCreditAdjustment } from "@/lib/cardCredits";
import { toDateOnly } from "@/lib/dateUtils";
import { getDependentSettlementSummary } from "@/lib/dependentSettlements";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import {
  useFinanceStore,
  type Dependent,
  type DependentSettlement,
  type Transaction,
} from "@/store/useFinanceStore";

export type DependentStatus = "settled" | "partial" | "open" | "idle";

export interface DependentOverview extends Dependent {
  transactions: Transaction[];
  settlements: DependentSettlement[];
  total: number;
  cardTotal: number;
  directTotal: number;
  obligationTotal: number;
  settledTotal: number;
  outstanding: number;
  progress: number;
  status: DependentStatus;
  share: number;
  categories: Array<{ name: string; amount: number }>;
}

export function getDependentAmount(transaction: Transaction) {
  return transaction.type === "card"
    ? getCardSignedAmount(transaction)
    : transaction.amount;
}

/* Every dependent with what they spent in the selected competence month,
   how much was already paid back and where the money went. */
export function useDependentsData() {
  const dependents = useFinanceStore((state) => state.dependents);
  const transactions = useFinanceStore((state) => state.transactions);
  const settlements = useFinanceStore((state) => state.dependentSettlements);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);

  return useMemo(() => {
    const competenceMonth = toDateOnly(currentYear, currentMonth, 1);
    const monthTransactions = transactions
      .filter(
        (transaction) =>
          Boolean(transaction.dependentId) &&
          transaction.type !== "income" &&
          isTransactionInSelectedCompetence(transaction, currentMonth, currentYear),
      )
      .sort((left, right) => right.date.localeCompare(left.date));
    const monthSettlements = settlements.filter(
      (settlement) => settlement.competenceMonth === competenceMonth,
    );
    const grandTotal = monthTransactions.reduce(
      (sum, transaction) => sum + getDependentAmount(transaction),
      0,
    );

    const people: DependentOverview[] = dependents
      .map((dependent) => {
        const own = monthTransactions.filter(
          (transaction) => transaction.dependentId === dependent.id,
        );
        const sumOf = (items: Transaction[]) =>
          items.reduce((sum, transaction) => sum + getDependentAmount(transaction), 0);
        const summary = getDependentSettlementSummary(
          own,
          monthSettlements,
          dependent.id,
        );
        const categoryTotals = new Map<string, number>();
        own
          .filter((transaction) => !isCardCreditAdjustment(transaction))
          .forEach((transaction) => {
            const name = transaction.category?.trim() || "Outros";
            categoryTotals.set(
              name,
              (categoryTotals.get(name) ?? 0) + getDependentAmount(transaction),
            );
          });
        const total = sumOf(own);
        const status: DependentStatus =
          summary.obligationTotal <= 0
            ? "idle"
            : summary.outstanding <= 0
              ? "settled"
              : summary.settledTotal > 0
                ? "partial"
                : "open";

        return {
          ...dependent,
          ...summary,
          transactions: own,
          settlements: monthSettlements
            .filter(
              (settlement) =>
                settlement.dependentId === dependent.id &&
                settlement.status === "confirmed",
            )
            .sort((left, right) => right.settledAt.localeCompare(left.settledAt)),
          total,
          cardTotal: sumOf(own.filter((transaction) => transaction.type === "card")),
          directTotal: sumOf(own.filter((transaction) => transaction.type !== "card")),
          status,
          share: grandTotal > 0 ? Math.max(total, 0) / grandTotal : 0,
          categories: Array.from(categoryTotals.entries())
            .map(([name, amount]) => ({ name, amount }))
            .filter((category) => category.amount > 0)
            .sort((left, right) => right.amount - left.amount),
        };
      })
      .sort((left, right) => right.outstanding - left.outstanding || right.total - left.total);

    return {
      competenceMonth,
      people,
      totals: {
        spent: people.reduce((sum, person) => sum + person.total, 0),
        settled: people.reduce((sum, person) => sum + person.settledTotal, 0),
        outstanding: people.reduce((sum, person) => sum + person.outstanding, 0),
        obligation: people.reduce((sum, person) => sum + person.obligationTotal, 0),
        pendingPeople: people.filter((person) => person.outstanding > 0).length,
      },
    };
  }, [currentMonth, currentYear, dependents, settlements, transactions]);
}

export type DependentsData = ReturnType<typeof useDependentsData>;
