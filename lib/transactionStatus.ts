import { getLocalTodayDateOnly, normalizeDateOnly } from "@/lib/dateUtils";
import type { Transaction, TransactionStatus } from "@/store/useFinanceStore";

export interface TransactionStatusPresentation {
  label: string;
  className: string;
}

const baseStatusPresentation: Record<
  TransactionStatus,
  TransactionStatusPresentation
> = {
  paid: {
    label: "Pago",
    className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  },
  confirmed: {
    label: "Na fatura",
    className: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  },
  pending: {
    label: "Pendente",
    className: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  },
};

export function isCardSubscription(transaction: Transaction) {
  return (
    transaction.type === "card" &&
    transaction.is_recurring === true &&
    Boolean(transaction.cardId)
  );
}

export function isFutureCardSubscription(transaction: Transaction) {
  return (
    isCardSubscription(transaction) &&
    transaction.status !== "paid" &&
    normalizeDateOnly(transaction.date) > getLocalTodayDateOnly()
  );
}

export function getTransactionStatusPresentation(
  transaction: Transaction,
): TransactionStatusPresentation {
  if (isFutureCardSubscription(transaction)) {
    return {
      label: "Agendada",
      className: "border-zinc-300/15 bg-zinc-300/10 text-zinc-300",
    };
  }

  if (isCardSubscription(transaction) && transaction.status === "pending") {
    return baseStatusPresentation.confirmed;
  }

  return baseStatusPresentation[transaction.status || "confirmed"];
}
