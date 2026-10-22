"use client";

import { useMemo } from "react";

import type { BalanceTimelinePoint } from "@/components/finance/BalanceTimelineChart";
import { getCardInvoiceCycle } from "@/lib/cardBilling";
import {
  getCardSignedAmount,
  isCardCreditAdjustment,
  shouldCountCardCharge,
} from "@/lib/cardCredits";
import {
  getCategoryBudgetMetrics,
  getCategoryBudgetSpent,
} from "@/lib/categoryBudgets";
import { getDateOnlyParts, toDateOnly } from "@/lib/dateUtils";
import { getDependentSettlementSummary } from "@/lib/dependentSettlements";
import { aggregatePeriodExpenses } from "@/lib/financeAggregation";
import { isPendingVariableIncome } from "@/lib/incomeRecurrence";
import {
  isCardTransactionInSelectedInvoiceMonth,
  isTransactionInSelectedCompetence,
} from "@/lib/transactionPeriod";
import {
  useFinanceStore,
  type CardInvoice,
  type CardInvoiceStatus,
  type Transaction,
} from "@/store/useFinanceStore";

export interface CardSpendingSummary {
  id: string;
  name: string;
  color?: string;
  closingDay?: number;
  dueDay?: number;
  dueDate?: string;
  invoiceStatus?: CardInvoiceStatus;
  invoice?: CardInvoice;
  cycleEndDate: string;
  cycleStartDate: string;
  current: number;
  dependentCurrent: number;
  dependentBreakdown: Array<{ id: string; name: string; amount: number }>;
  personalCurrent: number;
  projected: number;
}

export interface UpcomingDue {
  id: string;
  kind: "bill" | "invoice";
  label: string;
  amount: number;
  date: string;
  daysUntil: number;
  invoice?: CardInvoice;
  cardName?: string;
}

export interface RecentActivityGroup {
  date: string;
  label: string;
  transactions: Transaction[];
}

const selectedMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
});

const activityDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function getTransactionCardId(transaction: Transaction) {
  return (
    (transaction as Transaction & { card_id?: string | null }).card_id ??
    transaction.cardId
  );
}

function getTransactionDependentId(transaction: Transaction) {
  return (
    (transaction as Transaction & { dependent_id?: string | null })
      .dependent_id ?? transaction.dependentId
  );
}

function hasDependent(transaction: Transaction) {
  return Boolean(getTransactionDependentId(transaction));
}

export function isPositiveTransaction(transaction: Transaction) {
  return transaction.type === "income" || isCardCreditAdjustment(transaction);
}

function sortByRecentDate(left: Transaction, right: Transaction) {
  const dateOrder = right.date.localeCompare(left.date);

  if (dateOrder !== 0) return dateOrder;

  return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
}

function getDaysBetween(fromDate: string, toDate: string) {
  const from = getDateOnlyParts(fromDate);
  const to = getDateOnlyParts(toDate);

  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) -
      Date.UTC(from.year, from.month - 1, from.day)) /
      86_400_000,
  );
}

function calculatePendingExpenses(
  calendarTransactions: Transaction[],
  invoiceTransactions: Transaction[],
  invoices: CardInvoice[],
  excludeDependents = false,
) {
  const pendingCalendarExpenses = calendarTransactions
    .filter(
      (transaction) =>
        transaction.type === "fixed" &&
        transaction.status !== "paid" &&
        (!excludeDependents || !hasDependent(transaction)),
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const pendingCardExpenses = invoices.length
    ? invoices.reduce((sum, invoice) => {
        const outstanding = Math.max(
          invoice.totalAmount - invoice.paidAmount,
          0,
        );

        if (!excludeDependents || outstanding === 0) return sum + outstanding;

        const invoiceEntries = invoiceTransactions.filter(
          (transaction) => transaction.invoiceId === invoice.id,
        );
        const invoiceTotal = invoiceEntries.reduce(
          (total, transaction) => total + getCardSignedAmount(transaction),
          0,
        );
        const personalTotal = invoiceEntries
          .filter((transaction) => !hasDependent(transaction))
          .reduce(
            (total, transaction) => total + getCardSignedAmount(transaction),
            0,
          );
        const personalShare =
          invoiceTotal > 0
            ? Math.min(Math.max(personalTotal / invoiceTotal, 0), 1)
            : 1;

        return sum + outstanding * personalShare;
      }, 0)
    : invoiceTransactions
        .filter(
          (transaction) => !excludeDependents || !hasDependent(transaction),
        )
        .reduce(
          (sum, transaction) => sum + getCardSignedAmount(transaction),
          0,
        );

  return (
    Math.max(pendingCalendarExpenses, 0) + Math.max(pendingCardExpenses, 0)
  );
}

function getTodayDate() {
  const today = new Date();

  return toDateOnly(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

export function useDashboardData({
  recentTransactionLimit,
}: {
  recentTransactionLimit: number;
}) {
  const cards = useFinanceStore((state) => state.cards);
  const cardInvoices = useFinanceStore((state) => state.cardInvoices);
  const categories = useFinanceStore((state) => state.categories);
  const dependents = useFinanceStore((state) => state.dependents);
  const categoryBudgets = useFinanceStore((state) => state.categoryBudgets);
  const dependentSettlements = useFinanceStore(
    (state) => state.dependentSettlements,
  );
  const transactions = useFinanceStore((state) => state.transactions);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const fetchedMonth = useFinanceStore((state) => state.fetchedMonth);
  const fetchedYear = useFinanceStore((state) => state.fetchedYear);
  const isFetching = useFinanceStore((state) => state.isFetching);

  const displayMonth = isFetching ? fetchedMonth : currentMonth;
  const displayYear = isFetching ? fetchedYear : currentYear;
  const todayDate = useMemo(() => getTodayDate(), []);
  const today = getDateOnlyParts(todayDate);
  const isCurrentMonth =
    today.month === displayMonth && today.year === displayYear;
  const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
  const selectedMonthName = selectedMonthFormatter.format(
    new Date(displayYear, displayMonth - 1, 1),
  );

  const monthlyTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isTransactionInSelectedCompetence(
          transaction,
          displayMonth,
          displayYear,
        ),
      ),
    [displayMonth, displayYear, transactions],
  );

  const invoiceCycleTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isCardTransactionInSelectedInvoiceMonth(
          transaction,
          displayMonth,
          displayYear,
        ),
      ),
    [displayMonth, displayYear, transactions],
  );

  const selectedCardInvoices = useMemo(
    () =>
      cardInvoices.filter((invoice) => {
        const { month, year } = getDateOnlyParts(invoice.billingMonthStart);

        return month === displayMonth && year === displayYear;
      }),
    [cardInvoices, displayMonth, displayYear],
  );

  const personalExpenseTotals = useMemo(
    () =>
      aggregatePeriodExpenses(transactions, displayMonth, displayYear, {
        excludeDependents: true,
      }),
    [displayMonth, displayYear, transactions],
  );

  const monthlyBalances = useMemo(() => {
    const totalIncome = monthlyTransactions
      .filter(
        (transaction) =>
          transaction.type === "income" &&
          !isPendingVariableIncome(transaction),
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const fallbackCardTotals = invoiceCycleTransactions.reduce(
      (totals, transaction) => {
        const signedAmount = getCardSignedAmount(transaction);

        totals.projected += signedAmount;
        if (shouldCountCardCharge(transaction, todayDate)) {
          totals.untilToday += signedAmount;
        }

        return totals;
      },
      { projected: 0, untilToday: 0 },
    );
    const hasPersistedInvoices = selectedCardInvoices.length > 0;
    const totalPendingObligations = calculatePendingExpenses(
      monthlyTransactions,
      invoiceCycleTransactions,
      selectedCardInvoices,
    );
    const personalPendingObligations = calculatePendingExpenses(
      monthlyTransactions,
      invoiceCycleTransactions,
      selectedCardInvoices,
      true,
    );

    return {
      totalIncome,
      creditCardProjected: hasPersistedInvoices
        ? selectedCardInvoices.reduce(
            (sum, invoice) => sum + invoice.totalAmount,
            0,
          )
        : fallbackCardTotals.projected,
      creditCardUntilToday: hasPersistedInvoices
        ? selectedCardInvoices.reduce(
            (sum, invoice) => sum + invoice.postedAmount,
            0,
          )
        : fallbackCardTotals.untilToday,
      projectedBalance: totalIncome - personalExpenseTotals.total,
      totalPendingObligations,
      personalPendingObligations,
    };
  }, [
    invoiceCycleTransactions,
    monthlyTransactions,
    personalExpenseTotals.total,
    selectedCardInvoices,
    todayDate,
  ]);

  const savingsRate =
    monthlyBalances.totalIncome > 0
      ? (monthlyBalances.projectedBalance / monthlyBalances.totalIncome) * 100
      : 0;

  const incomeAllocation = useMemo(() => {
    const plannedExpenses = Math.max(personalExpenseTotals.total, 0);
    const pending = Math.min(
      Math.max(monthlyBalances.personalPendingObligations, 0),
      plannedExpenses,
    );
    const paid = Math.max(plannedExpenses - pending, 0);
    const leftover = Math.max(monthlyBalances.projectedBalance, 0);
    const base = Math.max(monthlyBalances.totalIncome, paid + pending, 1);

    return [
      {
        key: "paid",
        label: "Já pago",
        amount: paid,
        percentage: (paid / base) * 100,
        barClassName: "bg-zinc-400",
      },
      {
        key: "pending",
        label: "A pagar",
        amount: pending,
        percentage: (pending / base) * 100,
        barClassName: "bg-amber-400",
      },
      {
        key: "leftover",
        label: "Sobra",
        amount: leftover,
        percentage: (leftover / base) * 100,
        barClassName: "bg-emerald-400",
      },
    ];
  }, [
    monthlyBalances.personalPendingObligations,
    monthlyBalances.projectedBalance,
    monthlyBalances.totalIncome,
    personalExpenseTotals.total,
  ]);

  const dailyAllowance =
    isCurrentMonth && monthlyBalances.projectedBalance > 0
      ? {
          amount:
            monthlyBalances.projectedBalance / (daysInMonth - today.day + 1),
          days: daysInMonth - today.day + 1,
        }
      : null;

  const daysLeftInMonth = isCurrentMonth ? daysInMonth - today.day : null;

  const balanceTimeline = useMemo(() => {
    const selectedMonthIndex = displayYear * 12 + displayMonth;
    const todayMonthIndex = today.year * 12 + today.month;
    const todayDay =
      todayMonthIndex === selectedMonthIndex
        ? today.day
        : todayMonthIndex > selectedMonthIndex
          ? daysInMonth
          : null;
    const dailyChanges = new Array<number>(daysInMonth + 1).fill(0);
    const seenIds = new Set<string>();

    transactions.forEach((transaction) => {
      if (seenIds.has(transaction.id)) return;
      seenIds.add(transaction.id);

      if (
        !isTransactionInSelectedCompetence(
          transaction,
          displayMonth,
          displayYear,
        )
      ) {
        return;
      }

      if (transaction.type === "income") {
        if (isPendingVariableIncome(transaction)) return;
      } else if (hasDependent(transaction)) {
        return;
      }

      const { year, month, day } = getDateOnlyParts(transaction.date);
      const transactionMonthIndex = year * 12 + month;
      const dayOfMonth =
        transactionMonthIndex === selectedMonthIndex
          ? day
          : transactionMonthIndex < selectedMonthIndex
            ? 1
            : daysInMonth;
      const amount =
        transaction.type === "income"
          ? transaction.amount
          : -(transaction.type === "card"
              ? getCardSignedAmount(transaction)
              : transaction.amount);

      dailyChanges[dayOfMonth] += amount;
    });

    const points: BalanceTimelinePoint[] = [];
    let runningBalance = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
      runningBalance += dailyChanges[day];
      points.push({
        day,
        actual: todayDay !== null && day <= todayDay ? runningBalance : null,
        projected: todayDay === null || day >= todayDay ? runningBalance : null,
      });
    }

    return { points, todayDay };
  }, [
    daysInMonth,
    displayMonth,
    displayYear,
    today.day,
    today.month,
    today.year,
    transactions,
  ]);

  const recentActivityGroups = useMemo(() => {
    const seenIds = new Set<string>();
    const recentActivity = transactions
      .filter((transaction) => {
        if (seenIds.has(transaction.id)) return false;
        seenIds.add(transaction.id);

        const { month, year } = getDateOnlyParts(transaction.date);

        return (
          month === displayMonth &&
          year === displayYear &&
          (!isCurrentMonth || transaction.date <= todayDate) &&
          !isPendingVariableIncome(transaction)
        );
      })
      .sort(sortByRecentDate)
      .slice(0, recentTransactionLimit);
    const yesterday = new Date(today.year, today.month - 1, today.day - 1);
    const yesterdayDate = toDateOnly(
      yesterday.getFullYear(),
      yesterday.getMonth() + 1,
      yesterday.getDate(),
    );
    const groups: RecentActivityGroup[] = [];

    recentActivity.forEach((transaction) => {
      const lastGroup = groups.at(-1);

      if (lastGroup?.date === transaction.date) {
        lastGroup.transactions.push(transaction);
        return;
      }

      const { year, month, day } = getDateOnlyParts(transaction.date);
      const label =
        transaction.date === todayDate
          ? "Hoje"
          : transaction.date === yesterdayDate
            ? "Ontem"
            : activityDayFormatter
                .format(new Date(year, month - 1, day))
                .replace(/^\w/, (letter) => letter.toUpperCase());

      groups.push({
        date: transaction.date,
        label,
        transactions: [transaction],
      });
    });

    return groups;
  }, [
    displayMonth,
    displayYear,
    isCurrentMonth,
    recentTransactionLimit,
    today.day,
    today.month,
    today.year,
    todayDate,
    transactions,
  ]);

  const categoryBudgetsByLabel = useMemo(() => {
    const competenceMonth = toDateOnly(displayYear, displayMonth, 1);
    const budgetsByLabel = new Map<
      string,
      ReturnType<typeof getCategoryBudgetMetrics>
    >();

    categoryBudgets
      .filter((budget) => budget.competenceMonth === competenceMonth)
      .forEach((budget) => {
        const label =
          categories.find((item) => item.id === budget.categoryId)?.label ??
          "Outros";
        const spent = getCategoryBudgetSpent(
          transactions,
          label,
          displayMonth,
          displayYear,
        );

        budgetsByLabel.set(
          label,
          getCategoryBudgetMetrics(
            budget.amount,
            spent,
            budget.alertThresholdPercent,
          ),
        );
      });

    return budgetsByLabel;
  }, [categories, categoryBudgets, displayMonth, displayYear, transactions]);

  const budgetHealth = useMemo(() => {
    const statuses = [...categoryBudgetsByLabel.values()].map(
      (metrics) => metrics.status,
    );

    return {
      total: statuses.length,
      attention: statuses.filter((status) => status !== "on_track").length,
    };
  }, [categoryBudgetsByLabel]);

  const categorySpending = useMemo(() => {
    const categoryTotals = new Map<string, number>();

    [...monthlyTransactions, ...invoiceCycleTransactions].forEach(
      (transaction) => {
        if (transaction.type === "income" || hasDependent(transaction)) return;

        const amount =
          transaction.type === "card"
            ? getCardSignedAmount(transaction)
            : transaction.amount;

        if (amount <= 0) return;

        const category = transaction.category?.trim() || "Outros";

        categoryTotals.set(
          category,
          (categoryTotals.get(category) ?? 0) + amount,
        );
      },
    );

    const sortedCategories = [...categoryTotals.entries()]
      .filter(([label]) => label !== "Outros")
      .sort((left, right) => right[1] - left[1]);
    const otherTotal =
      (categoryTotals.get("Outros") ?? 0) +
      sortedCategories.slice(4).reduce((sum, [, amount]) => sum + amount, 0);
    const visibleCategories: Array<readonly [string, number]> =
      otherTotal > 0
        ? [...sortedCategories.slice(0, 4), ["Outros", otherTotal]]
        : sortedCategories.slice(0, 4);
    const largestAmount = Math.max(
      ...visibleCategories.map(([, amount]) => amount),
      0,
    );

    return visibleCategories.map(([label, amount]) => ({
      amount,
      budget: categoryBudgetsByLabel.get(label),
      label,
      percentage: largestAmount > 0 ? (amount / largestAmount) * 100 : 0,
    }));
  }, [categoryBudgetsByLabel, invoiceCycleTransactions, monthlyTransactions]);

  const pendingVariableIncomes = useMemo(
    () => monthlyTransactions.filter(isPendingVariableIncome),
    [monthlyTransactions],
  );

  const cardSpendingSummaries = useMemo<CardSpendingSummary[]>(
    () =>
      cards.map((card) => {
        const cardInvoiceTransactions = invoiceCycleTransactions.filter(
          (transaction) =>
            transaction.type === "card" &&
            getTransactionCardId(transaction) === card.id,
        );
        const fallbackInvoiceTotals = cardInvoiceTransactions.reduce(
          (totals, transaction) => {
            const signedAmount = getCardSignedAmount(transaction);

            totals.projected += signedAmount;
            if (shouldCountCardCharge(transaction, todayDate)) {
              totals.current += signedAmount;
            }

            return totals;
          },
          { current: 0, projected: 0 },
        );
        const currentBreakdown = cardInvoiceTransactions
          .filter((transaction) =>
            shouldCountCardCharge(transaction, todayDate),
          )
          .reduce(
            (totals, transaction) => {
              const signedAmount = getCardSignedAmount(transaction);
              const dependentId = getTransactionDependentId(transaction);

              if (dependentId) {
                totals.dependents += signedAmount;
                totals.byDependent.set(
                  dependentId,
                  (totals.byDependent.get(dependentId) ?? 0) + signedAmount,
                );
              } else {
                totals.personal += signedAmount;
              }

              return totals;
            },
            {
              dependents: 0,
              personal: 0,
              byDependent: new Map<string, number>(),
            },
          );
        const persistedInvoice = selectedCardInvoices.find(
          (invoice) => invoice.cardId === card.id,
        );
        const fallbackInvoiceCycle = getCardInvoiceCycle(
          toDateOnly(displayYear, displayMonth, 1),
          card.closingDay,
        );

        return {
          id: card.id,
          name: card.name,
          color: card.color,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          dueDate: persistedInvoice?.dueDate,
          invoice: persistedInvoice,
          invoiceStatus: persistedInvoice?.status,
          cycleEndDate:
            persistedInvoice?.cycleEnd ?? fallbackInvoiceCycle.endDate,
          cycleStartDate:
            persistedInvoice?.cycleStart ?? fallbackInvoiceCycle.startDate,
          current:
            persistedInvoice?.postedAmount ?? fallbackInvoiceTotals.current,
          dependentCurrent: Math.max(currentBreakdown.dependents, 0),
          dependentBreakdown: [...currentBreakdown.byDependent.entries()]
            .filter(([, amount]) => amount > 0)
            .map(([dependentId, amount]) => ({
              id: dependentId,
              name:
                dependents.find((dependent) => dependent.id === dependentId)
                  ?.name ?? "Dependente",
              amount,
            }))
            .sort((left, right) => right.amount - left.amount),
          personalCurrent: Math.max(currentBreakdown.personal, 0),
          projected:
            persistedInvoice?.totalAmount ?? fallbackInvoiceTotals.projected,
        };
      }),
    [
      cards,
      dependents,
      displayMonth,
      displayYear,
      invoiceCycleTransactions,
      selectedCardInvoices,
      todayDate,
    ],
  );

  const cardNamesById = useMemo(
    () => new Map(cards.map((card) => [card.id, card.name])),
    [cards],
  );

  const upcomingDues = useMemo<UpcomingDue[]>(() => {
    const billDues = monthlyTransactions
      .filter(
        (transaction) =>
          transaction.type === "fixed" && transaction.status === "pending",
      )
      .map((transaction) => ({
        id: transaction.id,
        kind: "bill" as const,
        label: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        daysUntil: getDaysBetween(todayDate, transaction.date),
      }));
    const invoiceDues = cardSpendingSummaries.flatMap((cardSummary) => {
      const invoice = cardSummary.invoice;

      if (
        !invoice ||
        invoice.status === "paid" ||
        invoice.totalAmount <= invoice.paidAmount
      ) {
        return [];
      }

      return [
        {
          id: invoice.id,
          kind: "invoice" as const,
          label: `Fatura ${cardSummary.name}`,
          amount: invoice.totalAmount - invoice.paidAmount,
          date: invoice.dueDate,
          daysUntil: getDaysBetween(todayDate, invoice.dueDate),
          invoice,
          cardName: cardSummary.name,
        },
      ];
    });

    return [...billDues, ...invoiceDues].sort(
      (left, right) => left.daysUntil - right.daysUntil,
    );
  }, [cardSpendingSummaries, monthlyTransactions, todayDate]);

  const dependentSpendingSummaries = useMemo(() => {
    const competenceMonth = toDateOnly(displayYear, displayMonth, 1);
    const monthSettlements = dependentSettlements.filter(
      (settlement) => settlement.competenceMonth === competenceMonth,
    );

    return dependents
      .map((dependent) => {
        const settlementSummary = getDependentSettlementSummary(
          monthlyTransactions.filter(
            (transaction) =>
              transaction.type !== "income" &&
              getTransactionDependentId(transaction) === dependent.id,
          ),
          monthSettlements,
          dependent.id,
        );

        return {
          id: dependent.id,
          name: dependent.name,
          total: settlementSummary.obligationTotal,
          outstanding: settlementSummary.outstanding,
        };
      })
      .filter((dependent) => dependent.total > 0)
      .sort((left, right) => right.total - left.total);
  }, [
    dependentSettlements,
    dependents,
    displayMonth,
    displayYear,
    monthlyTransactions,
  ]);

  const setupProgress = {
    hasCard: cards.length > 0,
    hasIncome: transactions.some(
      (transaction) => transaction.type === "income",
    ),
    hasRecurringBill: transactions.some(
      (transaction) =>
        transaction.type === "fixed" && transaction.is_recurring === true,
    ),
    isEmptyAccount: cards.length === 0 && transactions.length === 0,
  };

  return {
    displayMonth,
    displayYear,
    isFetching,
    isCurrentMonth,
    daysLeftInMonth,
    selectedMonthName,
    monthlyBalances,
    personalExpenseTotal: personalExpenseTotals.total,
    savingsRate,
    incomeAllocation,
    dailyAllowance,
    balanceTimeline,
    recentActivityGroups,
    cardNamesById,
    budgetHealth,
    categorySpending,
    pendingVariableIncomes,
    cardSpendingSummaries,
    upcomingDues,
    dependentSpendingSummaries,
    setupProgress,
  };
}
