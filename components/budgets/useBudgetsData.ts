"use client";

import { useMemo } from "react";

import { DEFAULT_CATEGORIES } from "@/lib/categories";
import {
  getBudgetTransactionAmount,
  getCategoryBudgetMetrics,
  getCategoryBudgetTransactions,
  isPersonalSpendingInMonth,
  normalizeCategory,
  type CategoryBudgetStatus,
} from "@/lib/categoryBudgets";
import { getDateOnlyParts, getLocalTodayDateOnly, toDateOnly } from "@/lib/dateUtils";
import {
  useFinanceStore,
  type CategoryBudget,
  type Transaction,
} from "@/store/useFinanceStore";

export interface BudgetRow extends CategoryBudget {
  categoryLabel: string;
  categoryIcon: string | null;
  spent: number;
  available: number;
  exceededBy: number;
  percentage: number;
  progress: number;
  status: CategoryBudgetStatus;
  /* Spend at the current pace by the end of the month (current month only). */
  projected: number | null;
  /* What can still be spent per remaining day (current month only). */
  dailyAllowance: number | null;
  transactions: Transaction[];
}

export interface UnbudgetedCategory {
  label: string;
  categoryId: string | null;
  categoryIcon: string | null;
  spent: number;
  count: number;
}

export type MonthPhase = "past" | "current" | "future";

/* Budgets for the selected competence month with spending, pace and
   projection, plus personal spending that has no budget yet. */
export function useBudgetsData(month: number, year: number) {
  const categories = useFinanceStore((state) => state.categories);
  const categoryBudgets = useFinanceStore((state) => state.categoryBudgets);
  const transactions = useFinanceStore((state) => state.transactions);

  return useMemo(() => {
    const competenceMonth = toDateOnly(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = getDateOnlyParts(getLocalTodayDateOnly());
    const phase: MonthPhase =
      today.year === year && today.month === month
        ? "current"
        : today.year * 12 + today.month > year * 12 + month
          ? "past"
          : "future";
    const elapsedDays =
      phase === "current" ? today.day : phase === "past" ? daysInMonth : 0;
    /* Today still counts as a day you can spend in. */
    const remainingDays = phase === "current" ? daysInMonth - today.day + 1 : 0;
    const monthProgress = elapsedDays / daysInMonth;

    const iconByLabel = new Map<string, string>(
      [...DEFAULT_CATEGORIES, ...categories].map((category) => [
        normalizeCategory(category.label),
        category.icon,
      ]),
    );

    const rows: BudgetRow[] = categoryBudgets
      .filter((budget) => budget.competenceMonth === competenceMonth)
      .map((budget) => {
        const category = categories.find((item) => item.id === budget.categoryId);
        const label = category?.label ?? "Categoria removida";
        const items = getCategoryBudgetTransactions(
          transactions,
          category?.label ?? "Outros",
          month,
          year,
        ).sort(
          (left, right) =>
            getBudgetTransactionAmount(right) - getBudgetTransactionAmount(left),
        );
        const spent = Math.max(
          items.reduce((total, item) => total + getBudgetTransactionAmount(item), 0),
          0,
        );
        const metrics = getCategoryBudgetMetrics(
          budget.amount,
          spent,
          budget.alertThresholdPercent,
        );

        return {
          ...budget,
          ...metrics,
          categoryLabel: label,
          categoryIcon: iconByLabel.get(normalizeCategory(label)) ?? null,
          spent,
          projected:
            phase === "current" && elapsedDays > 0
              ? (spent / elapsedDays) * daysInMonth
              : null,
          dailyAllowance:
            phase === "current" && remainingDays > 0
              ? metrics.available / remainingDays
              : null,
          transactions: items,
        };
      });

    const budgetedLabels = new Set(
      rows.map((row) => normalizeCategory(row.categoryLabel)),
    );
    const unbudgetedMap = new Map<string, UnbudgetedCategory>();
    transactions
      .filter(
        (transaction) =>
          isPersonalSpendingInMonth(transaction, month, year) &&
          !budgetedLabels.has(normalizeCategory(transaction.category)),
      )
      .forEach((transaction) => {
        const key = normalizeCategory(transaction.category);
        const label = transaction.category?.trim() || "Outros";
        const category = categories.find(
          (item) =>
            item.kind === "expense" &&
            !item.id.startsWith("default-") &&
            normalizeCategory(item.label) === key,
        );
        const current = unbudgetedMap.get(key) ?? {
          label: category?.label ?? label,
          categoryId: category?.id ?? null,
          categoryIcon: iconByLabel.get(key) ?? null,
          spent: 0,
          count: 0,
        };
        current.spent += getBudgetTransactionAmount(transaction);
        current.count += 1;
        unbudgetedMap.set(key, current);
      });
    const unbudgeted = Array.from(unbudgetedMap.values())
      .filter((item) => item.spent > 0)
      .sort((left, right) => right.spent - left.spent);

    const planned = rows.reduce((total, row) => total + row.amount, 0);
    const spent = rows.reduce((total, row) => total + row.spent, 0);
    const totalMetrics = getCategoryBudgetMetrics(planned, spent);
    const projected =
      phase === "current" && elapsedDays > 0
        ? (spent / elapsedDays) * daysInMonth
        : null;

    return {
      competenceMonth,
      phase,
      daysInMonth,
      elapsedDays,
      remainingDays,
      monthProgress,
      rows,
      unbudgeted,
      totals: {
        planned,
        spent,
        ...totalMetrics,
        projected,
        dailyAllowance:
          phase === "current" && remainingDays > 0
            ? totalMetrics.available / remainingDays
            : null,
        unbudgetedSpent: unbudgeted.reduce((total, item) => total + item.spent, 0),
        counts: {
          on_track: rows.filter((row) => row.status === "on_track").length,
          attention: rows.filter((row) => row.status === "attention").length,
          exceeded: rows.filter((row) => row.status === "exceeded").length,
        },
      },
    };
  }, [categories, categoryBudgets, month, transactions, year]);
}

export type BudgetsData = ReturnType<typeof useBudgetsData>;
