"use client";

import { useMemo } from "react";

import { getCardInvoiceCycle } from "@/lib/cardBilling";
import {
  calculateCardDebt,
  getCardSignedAmount,
  isCardCreditAdjustment,
  shouldCountCardCharge,
} from "@/lib/cardCredits";
import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  toDateOnly,
} from "@/lib/dateUtils";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import {
  useFinanceStore,
  type Card,
  type CardInvoice,
  type Transaction,
} from "@/store/useFinanceStore";

/** Dark-surface categorical order: personal share first, then dependents. */
export const shareColors = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#9085e9",
];

export interface CardOverview {
  card: Card;
  invoice?: CardInvoice;
  invoiceTotal: number;
  projectedTotal: number;
  debtTotal: number;
  limitAmount: number;
  available: number;
  limitUsage: number;
  dueDate: string | null;
}

export interface InstallmentPlan {
  transaction: Transaction;
  current: number;
  total: number;
  remainingCount: number;
  remainingAmount: number;
  endsAt: string;
}

export function getInstallmentProgress(transaction: Transaction) {
  const current =
    transaction.installmentNumber ?? transaction.current_installment ?? 1;
  const total = transaction.installmentsTotal ?? transaction.installments ?? 1;

  return { current, total };
}

function addMonthsToDate(date: string, offset: number) {
  const { year, month } = getDateOnlyParts(date);
  const target = new Date(year, month - 1 + offset, 1);

  return toDateOnly(target.getFullYear(), target.getMonth() + 1, 1);
}

function getDaysUntil(date: string, today: string) {
  const from = getDateOnlyParts(today);
  const to = getDateOnlyParts(date);

  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) -
      Date.UTC(from.year, from.month - 1, from.day)) /
      86_400_000,
  );
}

function resolveDueDate(
  card: Card,
  invoice: CardInvoice | undefined,
  monthStart: string,
) {
  if (invoice?.dueDate) return invoice.dueDate;
  if (!card.dueDay) return null;

  const { year, month } = getDateOnlyParts(monthStart);
  const lastDay = new Date(year, month, 0).getDate();

  return toDateOnly(year, month, Math.min(card.dueDay, lastDay));
}

export function useCardsData(selectedCardId: string | null) {
  const cards = useFinanceStore((state) => state.cards);
  const cardInvoices = useFinanceStore((state) => state.cardInvoices);
  const dependents = useFinanceStore((state) => state.dependents);
  const transactions = useFinanceStore((state) => state.transactions);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);

  return useMemo(() => {
    const today = getLocalTodayDateOnly();
    const monthStart = toDateOnly(currentYear, currentMonth, 1);
    const monthlyTransactions = transactions.filter((transaction) =>
      isTransactionInSelectedCompetence(transaction, currentMonth, currentYear),
    );

    const overviews: CardOverview[] = cards.map((card) => {
      const invoice = cardInvoices.find(
        (item) =>
          item.cardId === card.id && item.billingMonthStart === monthStart,
      );
      const cardTransactions = monthlyTransactions.filter(
        (transaction) => transaction.cardId === card.id,
      );
      const postedFallback = cardTransactions
        .filter((transaction) => shouldCountCardCharge(transaction, today))
        .reduce(
          (sum, transaction) => sum + getCardSignedAmount(transaction),
          0,
        );
      const projectedFallback = cardTransactions.reduce(
        (sum, transaction) => sum + getCardSignedAmount(transaction),
        0,
      );
      const debtTotal = calculateCardDebt(
        transactions,
        card.id,
        cardInvoices
          .filter(
            (item) =>
              item.cardId === card.id &&
              transactions.some(
                (transaction) => transaction.invoiceId === item.id,
              ),
          )
          .reduce((sum, item) => sum + item.paidAmount, 0),
      );
      const limitAmount = card.limitAmount ?? 0;

      return {
        card,
        invoice,
        invoiceTotal: invoice?.postedAmount ?? postedFallback,
        projectedTotal: invoice?.totalAmount ?? projectedFallback,
        debtTotal,
        limitAmount,
        available: Math.max(limitAmount - debtTotal, 0),
        limitUsage:
          limitAmount > 0 ? Math.min((debtTotal / limitAmount) * 100, 100) : 0,
        dueDate: resolveDueDate(card, invoice, monthStart),
      };
    });

    const portfolio = (() => {
      const totalLimit = overviews.reduce(
        (sum, item) => sum + item.limitAmount,
        0,
      );
      const totalDebt = overviews
        .filter((item) => item.limitAmount > 0)
        .reduce((sum, item) => sum + item.debtTotal, 0);
      const openDues = overviews
        .filter(
          (item) =>
            item.dueDate &&
            item.invoice?.status !== "paid" &&
            item.projectedTotal > (item.invoice?.paidAmount ?? 0),
        )
        .map((item) => ({
          name: item.card.name,
          dueDate: item.dueDate as string,
          amount: item.projectedTotal - (item.invoice?.paidAmount ?? 0),
          daysUntil: getDaysUntil(item.dueDate as string, today),
        }))
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
      const nextDue =
        openDues.find((due) => due.daysUntil >= 0) ?? openDues.at(-1) ?? null;

      return {
        invoicesTotal: overviews.reduce(
          (sum, item) => sum + item.invoiceTotal,
          0,
        ),
        projectedTotal: overviews.reduce(
          (sum, item) => sum + item.projectedTotal,
          0,
        ),
        totalLimit,
        totalAvailable: Math.max(totalLimit - totalDebt, 0),
        limitUsage:
          totalLimit > 0 ? Math.min((totalDebt / totalLimit) * 100, 100) : 0,
        nextDue,
      };
    })();

    const selected =
      overviews.find((item) => item.card.id === selectedCardId) ??
      overviews[0] ??
      null;

    if (!selected) {
      return { overviews, portfolio, selected: null, monthStart } as const;
    }

    const invoiceTransactions = monthlyTransactions
      .filter((transaction) => transaction.cardId === selected.card.id)
      .sort((left, right) => right.date.localeCompare(left.date));
    const dependentNames = new Map(
      dependents.map((dependent) => [dependent.id, dependent.name]),
    );
    const sumOf = (items: Transaction[]) =>
      items.reduce(
        (sum, transaction) => sum + getCardSignedAmount(transaction),
        0,
      );

    const shareTotals = new Map<string, number>();
    invoiceTransactions.forEach((transaction) => {
      const key = transaction.dependentId ?? "personal";
      shareTotals.set(
        key,
        (shareTotals.get(key) ?? 0) + getCardSignedAmount(transaction),
      );
    });
    const shares = [
      {
        id: "personal",
        name: "Você",
        amount: shareTotals.get("personal") ?? 0,
      },
      ...[...shareTotals.entries()]
        .filter(([key]) => key !== "personal")
        .map(([key, amount]) => ({
          id: key,
          name: dependentNames.get(key) ?? "Dependente",
          amount,
        }))
        .sort((left, right) => right.amount - left.amount),
    ]
      .filter((share) => share.amount > 0)
      .map((share, index) => ({
        ...share,
        color: shareColors[index % shareColors.length],
      }));

    const isInstallment = (transaction: Transaction) =>
      getInstallmentProgress(transaction).total > 1;
    const composition = [
      {
        key: "purchase",
        label: "Compras",
        amount: sumOf(
          invoiceTransactions.filter(
            (transaction) =>
              !transaction.is_recurring &&
              !isInstallment(transaction) &&
              !isCardCreditAdjustment(transaction),
          ),
        ),
      },
      {
        key: "installment",
        label: "Parcelas",
        amount: sumOf(invoiceTransactions.filter(isInstallment)),
      },
      {
        key: "subscription",
        label: "Assinaturas",
        amount: sumOf(
          invoiceTransactions.filter((transaction) => transaction.is_recurring),
        ),
      },
      {
        key: "credit",
        label: "Créditos",
        amount: Math.abs(
          sumOf(
            invoiceTransactions.filter((transaction) =>
              isCardCreditAdjustment(transaction),
            ),
          ),
        ),
      },
    ];

    const scheduledTotal = sumOf(
      invoiceTransactions.filter(
        (transaction) => !shouldCountCardCharge(transaction, today),
      ),
    );
    const paidAmount = selected.invoice?.paidAmount ?? 0;
    const cycle = selected.invoice
      ? {
          startDate: selected.invoice.cycleStart,
          endDate: selected.invoice.cycleEnd,
        }
      : getCardInvoiceCycle(monthStart, selected.card.closingDay);

    const installments: InstallmentPlan[] = invoiceTransactions
      .filter(
        (transaction) =>
          isInstallment(transaction) && !isCardCreditAdjustment(transaction),
      )
      .map((transaction) => {
        const { current, total } = getInstallmentProgress(transaction);
        const remainingCount = Math.max(total - current, 0);

        return {
          transaction,
          current,
          total,
          remainingCount,
          remainingAmount: remainingCount * transaction.amount,
          endsAt: addMonthsToDate(
            transaction.billingMonthStart ?? monthStart,
            remainingCount,
          ),
        };
      })
      .sort((left, right) => right.remainingAmount - left.remainingAmount);

    const subscriptions = invoiceTransactions
      .filter(
        (transaction) =>
          transaction.is_recurring && !isCardCreditAdjustment(transaction),
      )
      .sort((left, right) => right.amount - left.amount);

    const categoryTotals = new Map<string, number>();
    invoiceTransactions.forEach((transaction) => {
      if (isCardCreditAdjustment(transaction)) return;
      const amount = getCardSignedAmount(transaction);
      if (amount <= 0) return;
      const name = transaction.category?.trim() || "Outros";
      categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + amount);
    });
    const categories = [...categoryTotals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 5);

    return {
      overviews,
      portfolio,
      monthStart,
      selected: {
        ...selected,
        cycle,
        paidAmount,
        openAmount: Math.max(selected.projectedTotal - paidAmount, 0),
        scheduledTotal,
        daysUntilDue: selected.dueDate
          ? getDaysUntil(selected.dueDate, today)
          : null,
        shares,
        composition,
        installments,
        installmentsRemaining: installments.reduce(
          (sum, plan) => sum + plan.remainingAmount,
          0,
        ),
        subscriptions,
        subscriptionsTotal: subscriptions.reduce(
          (sum, transaction) => sum + transaction.amount,
          0,
        ),
        categories,
        transactions: invoiceTransactions,
        dependentNames,
      },
    } as const;
  }, [
    cardInvoices,
    cards,
    currentMonth,
    currentYear,
    dependents,
    selectedCardId,
    transactions,
  ]);
}
