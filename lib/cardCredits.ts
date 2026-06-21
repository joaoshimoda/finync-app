export const CARD_CREDIT_ADJUSTMENT_NOTE = "[card_credit_adjustment]";
export const CARD_CREDIT_ADJUSTMENT_CATEGORY = "Crédito / Estorno";

type CardCreditCandidate = {
  cardId?: string | null;
  category?: string | null;
  notes?: string | null;
  status?: string | null;
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
    normalizedCategory?.includes("estorno") ||
    normalizedCategory?.includes("pagamento")
  );
}

export function getCardSignedAmount<T extends CardCreditCandidate & { amount: number }>(
  transaction: T,
) {
  return isCardCreditAdjustment(transaction)
    ? -transaction.amount
    : transaction.amount;
}

export function calculateCardDebt<
  T extends CardCreditCandidate & { amount: number },
>(transactions: T[], cardId: string) {
  const debt = transactions
    .filter(
      (transaction) =>
        transaction.type === "card" &&
        transaction.cardId === cardId &&
        transaction.status !== "paid",
    )
    .reduce(
      (total, transaction) => total + getCardSignedAmount(transaction),
      0,
    );

  return Math.max(debt, 0);
}

export function calculateAvailableCardLimit<
  T extends CardCreditCandidate & { amount: number },
>(transactions: T[], cardId: string, limitAmount = 0) {
  return limitAmount - calculateCardDebt(transactions, cardId);
}
