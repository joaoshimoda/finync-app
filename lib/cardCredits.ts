import { getLocalTodayDateOnly, normalizeDateOnly } from "./dateUtils.ts";

export const CARD_CREDIT_ADJUSTMENT_NOTE = "[card_credit_adjustment]";
export const CARD_CREDIT_ADJUSTMENT_CATEGORY = "Crédito / Estorno";

type CardCreditCandidate = {
  cardId?: string | null;
  category?: string | null;
  date?: string | null;
  installments?: number | null;
  installmentsTotal?: number | null;
  installment_number?: number | null;
  installments_total?: number | null;
  is_recurring?: boolean | null;
  notes?: string | null;
  status?: string | null;
  type?: string | null;
};

export function isCardInstallment(transaction: CardCreditCandidate) {
  const installmentsTotal =
    transaction.installmentsTotal ??
    transaction.installments ??
    transaction.installments_total ??
    1;

  return transaction.type === "card" && installmentsTotal > 1;
}

export function isCardCreditAdjustment(transaction: CardCreditCandidate) {
  if (transaction.type !== "card") return false;

  const normalizedCategory = transaction.category
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    transaction.notes?.includes(CARD_CREDIT_ADJUSTMENT_NOTE) ||
    normalizedCategory?.includes("credito") ||
    normalizedCategory?.includes("estorno") ||
    normalizedCategory?.includes("pagamento")
  );
}

export function getCardSignedAmount<
  T extends CardCreditCandidate & { amount: number },
>(transaction: T) {
  return isCardCreditAdjustment(transaction)
    ? -transaction.amount
    : transaction.amount;
}

export function shouldCountCardCharge(
  transaction: CardCreditCandidate,
  todayDate = getLocalTodayDateOnly(),
) {
  if (transaction.type !== "card") return true;
  if (isCardCreditAdjustment(transaction)) return true;
  if (isCardInstallment(transaction)) return true;

  return (
    transaction.is_recurring !== true ||
    !transaction.date ||
    normalizeDateOnly(transaction.date) <= todayDate
  );
}

export function calculateCardDebt<
  T extends CardCreditCandidate & { amount: number },
>(transactions: T[], cardId: string, confirmedPayments = 0) {
  const debt = transactions
    .filter(
      (transaction) =>
        transaction.type === "card" &&
        transaction.cardId === cardId &&
        shouldCountCardCharge(transaction),
    )
    .reduce(
      (total, transaction) => total + getCardSignedAmount(transaction),
      0,
    );

  return Math.max(debt - confirmedPayments, 0);
}

export function calculateAvailableCardLimit<
  T extends CardCreditCandidate & { amount: number },
>(
  transactions: T[],
  cardId: string,
  limitAmount = 0,
  confirmedPayments = 0,
) {
  return (
    limitAmount - calculateCardDebt(transactions, cardId, confirmedPayments)
  );
}
