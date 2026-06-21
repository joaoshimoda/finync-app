export const CARD_CREDIT_ADJUSTMENT_NOTE = "[card_credit_adjustment]";
export const CARD_CREDIT_ADJUSTMENT_CATEGORY = "Crédito / Estorno";

type CardCreditCandidate = {
  category?: string | null;
  notes?: string | null;
  type?: string | null;
};

export function isCardCreditAdjustment(transaction: CardCreditCandidate) {
  if (transaction.type !== "card") return false;

  const normalizedCategory = transaction.category
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    transaction.notes?.includes(CARD_CREDIT_ADJUSTMENT_NOTE) ||
    normalizedCategory?.includes("credito") ||
    normalizedCategory?.includes("estorno")
  );
}

export function getCardSignedAmount<T extends CardCreditCandidate & { amount: number }>(
  transaction: T,
) {
  return isCardCreditAdjustment(transaction)
    ? -transaction.amount
    : transaction.amount;
}
