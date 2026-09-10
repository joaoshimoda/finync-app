import { getLocalTodayDateOnly, normalizeDateOnly } from "./dateUtils.ts";

export type TransactionStatus = "pending" | "confirmed" | "paid";
export type DbTransactionStatus = "PAGO" | "PENDENTE" | "CONFIRMADO";

type TransactionStatusCandidate = {
  type: "income" | "fixed" | "card";
  status?: TransactionStatus | null;
  date?: string | null;
  is_recurring?: boolean | null;
  cardId?: string | null;
  notes?: string | null;
};

export interface TransactionStatusPresentation {
  label: string;
  className: string;
}

const paidPresentation: TransactionStatusPresentation = {
  label: "Pago",
  className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
};

const pendingPresentation: TransactionStatusPresentation = {
  label: "Pendente",
  className: "border-amber-300/20 bg-amber-300/10 text-amber-200",
};

const confirmedPresentation: TransactionStatusPresentation = {
  label: "Efetivada",
  className: "border-sky-300/20 bg-sky-300/10 text-sky-200",
};

export function toDbTransactionStatus(
  status: TransactionStatus,
): DbTransactionStatus {
  if (status === "paid") return "PAGO";
  if (status === "pending") return "PENDENTE";
  return "CONFIRMADO";
}

export function fromDbTransactionStatus(
  status: string,
): TransactionStatus {
  if (status === "PAGO") return "paid";
  if (status === "PENDENTE") return "pending";
  return "confirmed";
}

export function getCanonicalTransactionStatus(
  transaction: TransactionStatusCandidate,
  todayDate = getLocalTodayDateOnly(),
): TransactionStatus {
  if (transaction.type === "card") {
    return transaction.is_recurring === true &&
      transaction.date &&
      normalizeDateOnly(transaction.date) > todayDate
      ? "pending"
      : "confirmed";
  }

  if (transaction.type === "fixed") {
    if (transaction.is_recurring !== true) return "confirmed";
    return transaction.status === "paid" ? "paid" : "pending";
  }

  const isPendingVariableIncome =
    transaction.status === "pending" &&
    transaction.notes?.includes("[variable_income]");

  return isPendingVariableIncome ? "pending" : "confirmed";
}

export function isCardSubscription(transaction: TransactionStatusCandidate) {
  return (
    transaction.type === "card" &&
    transaction.is_recurring === true &&
    Boolean(transaction.cardId)
  );
}

export function isFutureCardSubscription(
  transaction: TransactionStatusCandidate,
) {
  return (
    isCardSubscription(transaction) &&
    Boolean(transaction.date) &&
    normalizeDateOnly(transaction.date!) > getLocalTodayDateOnly()
  );
}

export function getTransactionStatusPresentation(
  transaction: TransactionStatusCandidate,
): TransactionStatusPresentation {
  if (isFutureCardSubscription(transaction)) {
    return {
      label: "Agendada",
      className: "border-zinc-300/15 bg-zinc-300/10 text-zinc-300",
    };
  }

  if (transaction.type === "card") {
    return transaction.status === "pending"
      ? pendingPresentation
      : {
          label: "Na fatura",
          className: "border-sky-300/20 bg-sky-300/10 text-sky-200",
        };
  }

  if (transaction.type === "income") {
    return transaction.status === "pending"
      ? {
          label: "Prevista",
          className: "border-amber-300/20 bg-amber-300/10 text-amber-200",
        }
      : {
          label: "Recebida",
          className:
            "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
        };
  }

  if (transaction.status === "paid") return paidPresentation;
  if (transaction.status === "pending") return pendingPresentation;
  return confirmedPresentation;
}
