import { getDateOnlyParts } from "./dateUtils.ts";

// How far ahead a due date starts producing a reminder, and how long an
// overdue item keeps nagging before it is left to the dashboard alone.
export const REMINDER_DAYS_AHEAD = 3;
export const REMINDER_OVERDUE_DAYS = 7;
export const WEEKLY_SUMMARY_DAYS_AHEAD = 7;

type ReminderInvoice = {
  id: string;
  cardId: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
};

type ReminderTransaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: "income" | "fixed" | "card";
  status: "pending" | "confirmed" | "paid";
};

export interface DueReminder {
  id: string;
  kind: "invoice" | "bill";
  label: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
}

export function getDaysBetween(fromDate: string, toDate: string) {
  const from = getDateOnlyParts(fromDate);
  const to = getDateOnlyParts(toDate);

  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) -
      Date.UTC(from.year, from.month - 1, from.day)) /
      86_400_000,
  );
}

/* Unpaid card invoices and pending fixed bills whose due date falls between
   `overdueDays` ago and `daysAhead` from today, soonest first. */
export function getDueReminders({
  invoices,
  transactions,
  cardNamesById,
  today,
  daysAhead = REMINDER_DAYS_AHEAD,
  overdueDays = REMINDER_OVERDUE_DAYS,
}: {
  invoices: ReminderInvoice[];
  transactions: ReminderTransaction[];
  cardNamesById: Map<string, string>;
  today: string;
  daysAhead?: number;
  overdueDays?: number;
}): DueReminder[] {
  const isInWindow = (daysUntil: number) =>
    daysUntil <= daysAhead && daysUntil >= -overdueDays;

  const invoiceReminders = invoices.flatMap((invoice) => {
    const outstanding = invoice.totalAmount - invoice.paidAmount;
    if (invoice.status === "paid" || outstanding <= 0) return [];

    const daysUntil = getDaysBetween(today, invoice.dueDate);
    if (!isInWindow(daysUntil)) return [];

    const cardName = cardNamesById.get(invoice.cardId);
    return [
      {
        id: `invoice:${invoice.id}`,
        kind: "invoice" as const,
        label: cardName ? `Fatura ${cardName}` : "Fatura do cartão",
        amount: outstanding,
        dueDate: invoice.dueDate,
        daysUntil,
      },
    ];
  });

  const billReminders = transactions.flatMap((transaction) => {
    if (transaction.type !== "fixed" || transaction.status !== "pending") {
      return [];
    }

    const daysUntil = getDaysBetween(today, transaction.date);
    if (!isInWindow(daysUntil)) return [];

    return [
      {
        id: `bill:${transaction.id}`,
        kind: "bill" as const,
        label: transaction.description,
        amount: transaction.amount,
        dueDate: transaction.date,
        daysUntil,
      },
    ];
  });

  return [...invoiceReminders, ...billReminders].sort(
    (left, right) =>
      left.daysUntil - right.daysUntil || left.label.localeCompare(right.label),
  );
}

export function describeDueDay(daysUntil: number) {
  if (daysUntil < -1) return `venceu há ${Math.abs(daysUntil)} dias`;
  if (daysUntil === -1) return "venceu ontem";
  if (daysUntil === 0) return "vence hoje";
  if (daysUntil === 1) return "vence amanhã";
  return `vence em ${daysUntil} dias`;
}

/* Monday-based week key, so the weekly summary fires once per week no matter
   which day the app is first opened. */
export function getWeekKey(today: string) {
  const { year, month, day } = getDateOnlyParts(today);
  const date = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);

  return date.toISOString().slice(0, 10);
}
