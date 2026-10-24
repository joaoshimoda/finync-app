"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { showBrowserNotification } from "@/lib/browserNotifications";
import { getLocalTodayDateOnly } from "@/lib/dateUtils";
import {
  WEEKLY_SUMMARY_DAYS_AHEAD,
  describeDueDay,
  getDueReminders,
  getWeekKey,
  type DueReminder,
} from "@/lib/reminders";
import { useFinanceStore } from "@/store/useFinanceStore";

const REMINDERS_HREF = "/dashboard";

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the reminder may repeat, which is fine.
  }
}

/* Native notification when allowed, otherwise an in-app toast. */
export function deliverReminder(
  title: string,
  body: string,
  tag: string,
  navigate: (href: string) => void,
) {
  if (showBrowserNotification(title, { body, tag, href: REMINDERS_HREF })) return;

  toast(title, {
    description: body,
    duration: 10_000,
    action: {
      label: "Ver",
      onClick: () => navigate(REMINDERS_HREF),
    },
  });
}

function joinLabels(reminders: DueReminder[]) {
  const labels = reminders.slice(0, 3).map((reminder) => reminder.label);
  const rest = reminders.length - labels.length;
  return rest > 0 ? `${labels.join(", ")} e mais ${rest}` : labels.join(", ");
}

/* Checks due dates once per day while the app is open and, on the first
   visit of each week, sums up the next seven days. Mounted by the dashboard
   layout, so it runs on whichever page the user lands. */
export function ReminderRunner() {
  const router = useRouter();
  const userId = useFinanceStore((state) => state.authUser?.id);
  const isPreferencesReady = useFinanceStore((state) => state.isPreferencesReady);
  const isLoading = useFinanceStore((state) => state.isLoading);
  const isFetching = useFinanceStore((state) => state.isFetching);
  const invoiceReminder = useFinanceStore((state) => state.invoiceReminder);
  const weeklySummary = useFinanceStore((state) => state.weeklySummary);
  const hideValues = useFinanceStore((state) => state.hideBalancesByDefault);
  const cards = useFinanceStore((state) => state.cards);
  const cardInvoices = useFinanceStore((state) => state.cardInvoices);
  const transactions = useFinanceStore((state) => state.transactions);
  const { formatCurrency } = useCurrencyFormatter();
  const hasRunRef = useRef(false);

  const cardNamesById = useMemo(
    () => new Map(cards.map((card) => [card.id, card.name])),
    [cards],
  );

  const isReady = Boolean(userId) && isPreferencesReady && !isLoading && !isFetching;

  useEffect(() => {
    if (!isReady || !userId || hasRunRef.current) return;
    hasRunRef.current = true;

    const today = getLocalTodayDateOnly();
    const formatAmount = (value: number) => (hideValues ? "" : ` · ${formatCurrency(value)}`);

    if (invoiceReminder) {
      const storageKey = `finync-reminders-sent:${userId}`;
      const sent = readStorage(storageKey);
      const sentToday = sent?.startsWith(`${today}|`)
        ? new Set(sent.slice(today.length + 1).split(","))
        : new Set<string>();
      const pending = getDueReminders({
        invoices: cardInvoices,
        transactions,
        cardNamesById,
        today,
      }).filter((reminder) => !sentToday.has(reminder.id));

      if (pending.length === 1) {
        const [reminder] = pending;
        deliverReminder(
          `${reminder.label} ${describeDueDay(reminder.daysUntil)}`,
          hideValues
            ? "Abra o Finync para ver os detalhes."
            : `Valor: ${formatCurrency(reminder.amount)}`,
          reminder.id,
          router.push,
        );
      } else if (pending.length > 1) {
        const overdue = pending.filter((reminder) => reminder.daysUntil < 0).length;
        const total = pending.reduce((sum, reminder) => sum + reminder.amount, 0);
        deliverReminder(
          overdue
            ? `${pending.length} contas pedem atenção (${overdue} vencida${overdue > 1 ? "s" : ""})`
            : `${pending.length} contas vencem nos próximos dias`,
          `${joinLabels(pending)}${formatAmount(total)}`,
          `reminders:${today}`,
          router.push,
        );
      }

      if (pending.length) {
        const ids = [...sentToday, ...pending.map((reminder) => reminder.id)];
        writeStorage(storageKey, `${today}|${ids.join(",")}`);
      }
    }

    if (weeklySummary) {
      const storageKey = `finync-weekly-summary:${userId}`;
      const weekKey = getWeekKey(today);

      if (readStorage(storageKey) !== weekKey) {
        const upcoming = getDueReminders({
          invoices: cardInvoices,
          transactions,
          cardNamesById,
          today,
          daysAhead: WEEKLY_SUMMARY_DAYS_AHEAD,
          overdueDays: 0,
        });
        const total = upcoming.reduce((sum, reminder) => sum + reminder.amount, 0);

        deliverReminder(
          "Sua semana no Finync",
          upcoming.length
            ? `${upcoming.length} ${upcoming.length === 1 ? "conta vence" : "contas vencem"} nos próximos 7 dias${formatAmount(total)}`
            : "Nenhuma conta vence nos próximos 7 dias. Semana tranquila!",
          `weekly:${weekKey}`,
          router.push,
        );
        writeStorage(storageKey, weekKey);
      }
    }
  }, [
    cardInvoices,
    cardNamesById,
    formatCurrency,
    hideValues,
    invoiceReminder,
    isReady,
    router,
    transactions,
    userId,
    weeklySummary,
  ]);

  return null;
}
