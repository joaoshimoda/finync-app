"use client";

import { useMemo } from "react";

import { DEFAULT_CATEGORIES } from "@/lib/categories";
import {
  getDateOnlyParts,
  getLocalTodayDateOnly,
  normalizeDateOnly,
} from "@/lib/dateUtils";
import { isTransactionInSelectedCompetence } from "@/lib/transactionPeriod";
import { useFinanceStore, type Transaction } from "@/store/useFinanceStore";

export type FixedBillGroup = "overdue" | "soon" | "later" | "paid";

export interface FixedBill {
  transaction: Transaction;
  daysUntil: number;
  group: FixedBillGroup;
  categoryIcon: string | null;
}

export interface Subscription {
  id: string;
  transaction: Transaction;
  cardName: string;
  chargeDay: number;
  daysUntil: number;
  share: number;
}

export interface TimelineDay {
  day: number;
  fixedAmount: number;
  subscriptionAmount: number;
  items: Array<{ id: string; label: string; amount: number; kind: "fixed" | "subscription"; paid: boolean }>;
}

const SOON_WINDOW_DAYS = 7;

export function getDaysUntil(dateOnly: string, today = getLocalTodayDateOnly()) {
  const from = new Date(`${today}T00:00:00`);
  const to = new Date(`${normalizeDateOnly(dateOnly)}T00:00:00`);

  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function byDate(left: Transaction, right: Transaction) {
  return normalizeDateOnly(left.date).localeCompare(normalizeDateOnly(right.date));
}

/* Everything the recurring page shows for the selected month, derived from
   the store only: fixed bills grouped by urgency, one row per subscription,
   a day-by-day timeline and the month totals. */
export function useRecurringData() {
  const transactions = useFinanceStore((state) => state.transactions);
  const cards = useFinanceStore((state) => state.cards);
  const categories = useFinanceStore((state) => state.categories);
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);

  return useMemo(() => {
    const today = getLocalTodayDateOnly();
    /* Defaults first so a bill still gets an icon before the user's
       categories load; the user's own icons win. */
    const categoryIcons = new Map<string, string>(
      [...DEFAULT_CATEGORIES, ...categories].map((category) => [
        category.label,
        category.icon,
      ]),
    );
    const inMonth = (transaction: Transaction) =>
      transaction.is_recurring === true &&
      isTransactionInSelectedCompetence(transaction, currentMonth, currentYear);

    const bills: FixedBill[] = transactions
      .filter((transaction) => transaction.type === "fixed" && inMonth(transaction))
      .sort(byDate)
      .map((transaction) => {
        const daysUntil = getDaysUntil(transaction.date, today);
        const group: FixedBillGroup =
          transaction.status === "paid"
            ? "paid"
            : daysUntil < 0
              ? "overdue"
              : daysUntil <= SOON_WINDOW_DAYS
                ? "soon"
                : "later";

        return {
          transaction,
          daysUntil,
          group,
          categoryIcon: categoryIcons.get(transaction.category) ?? null,
        };
      });

    /* One row per subscription: a group may hold more than one charge in
       the store, keep the one billed in the selected invoice month. */
    const subscriptionRows = new Map<string, Transaction>();
    transactions
      .filter((transaction) => transaction.type === "card" && inMonth(transaction))
      .sort(byDate)
      .forEach((transaction) => {
        const id = transaction.groupId ?? transaction.id;
        if (!subscriptionRows.has(id)) subscriptionRows.set(id, transaction);
      });

    const subscriptionTotal = Array.from(subscriptionRows.values()).reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );
    const subscriptions: Subscription[] = Array.from(subscriptionRows.entries()).map(
      ([id, transaction]) => ({
        id,
        transaction,
        cardName:
          cards.find((card) => card.id === transaction.cardId)?.name ?? "Cartão",
        chargeDay: getDateOnlyParts(transaction.date).day,
        daysUntil: getDaysUntil(transaction.date, today),
        share: subscriptionTotal > 0 ? transaction.amount / subscriptionTotal : 0,
      }),
    );

    const fixedTotal = bills.reduce((total, bill) => total + bill.transaction.amount, 0);
    const paidBills = bills.filter((bill) => bill.group === "paid");
    const openBills = bills.filter((bill) => bill.group !== "paid");
    const paidAmount = paidBills.reduce((total, bill) => total + bill.transaction.amount, 0);
    const overdueBills = bills.filter((bill) => bill.group === "overdue");

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const timeline: TimelineDay[] = Array.from({ length: daysInMonth }, (_, index) => ({
      day: index + 1,
      fixedAmount: 0,
      subscriptionAmount: 0,
      items: [],
    }));
    bills.forEach(({ transaction }) => {
      const slot = timeline[getDateOnlyParts(transaction.date).day - 1];
      if (!slot) return;
      slot.fixedAmount += transaction.amount;
      slot.items.push({
        id: transaction.id,
        label: transaction.description,
        amount: transaction.amount,
        kind: "fixed",
        paid: transaction.status === "paid",
      });
    });
    /* Subscriptions are placed on their charge day, clamped to this month. */
    subscriptions.forEach((subscription) => {
      const slot = timeline[Math.min(subscription.chargeDay, daysInMonth) - 1];
      slot.subscriptionAmount += subscription.transaction.amount;
      slot.items.push({
        id: subscription.id,
        label: subscription.transaction.description,
        amount: subscription.transaction.amount,
        kind: "subscription",
        paid: subscription.daysUntil <= 0,
      });
    });

    const todayParts = getDateOnlyParts(today);
    const todayDay =
      todayParts.month === currentMonth && todayParts.year === currentYear
        ? todayParts.day
        : null;

    return {
      bills,
      openBills,
      overdueBills,
      nextBill: openBills[0] ?? null,
      subscriptions,
      timeline,
      todayDay,
      totals: {
        fixed: fixedTotal,
        paid: paidAmount,
        open: fixedTotal - paidAmount,
        subscriptions: subscriptionTotal,
        commitment: fixedTotal + subscriptionTotal,
      },
    };
  }, [cards, categories, currentMonth, currentYear, transactions]);
}

export type RecurringData = ReturnType<typeof useRecurringData>;
