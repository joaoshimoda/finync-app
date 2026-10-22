import { getCardSignedAmount, isCardCreditAdjustment } from "@/lib/cardCredits";
import { getDateOnlyParts, toDateOnly } from "@/lib/dateUtils";
import type { Card, Transaction } from "@/store/useFinanceStore";

export type TypeFilter = "all" | "income" | "expense" | "fixed";
export type OriginFilter = "all" | "card" | "debit-pix";
export type OriginKind = "card" | "debit-pix" | "income";
export type SortOption = "recent" | "oldest" | "highest" | "lowest" | "alpha";
export type GroupOption = "date" | "category" | "none";

export interface TransactionGroup {
  key: string;
  label: string;
  hint?: string;
  total: number;
  share?: number;
  transactions: Transaction[];
}

export const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigas" },
  { value: "highest", label: "Maior valor" },
  { value: "lowest", label: "Menor valor" },
  { value: "alpha", label: "Ordem alfabética" },
];

export const groupOptions: Array<{ value: GroupOption; label: string }> = [
  { value: "date", label: "Por dia" },
  { value: "category", label: "Por categoria" },
  { value: "none", label: "Sem agrupar" },
];

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function getDependentId(transaction: Transaction) {
  return (
    (transaction as Transaction & { dependent_id?: string | null })
      .dependent_id ?? transaction.dependentId
  );
}

export function getTransactionCardId(transaction: Transaction) {
  return (
    (transaction as Transaction & { card_id?: string | null }).card_id ??
    transaction.cardId ??
    null
  );
}

export function getOriginKind(transaction: Transaction): OriginKind {
  if (transaction.type === "income") return "income";
  if (transaction.type === "card" || getTransactionCardId(transaction)) {
    return "card";
  }

  return "debit-pix";
}

export function getOriginLabel(transaction: Transaction, cards: Card[]) {
  if (transaction.type === "income") return "Receita";
  if (transaction.type === "fixed") return "Débito/PIX";

  return (
    cards.find((card) => card.id === getTransactionCardId(transaction))?.name ??
    "Cartão de crédito"
  );
}

export function isPositiveTransaction(transaction: Transaction) {
  return transaction.type === "income" || isCardCreditAdjustment(transaction);
}

/** Signed effect on the balance: income is positive, spending negative. */
export function getSignedAmount(transaction: Transaction) {
  if (transaction.type === "income") return transaction.amount;
  if (transaction.type === "card") return -getCardSignedAmount(transaction);

  return -transaction.amount;
}

function compareRecent(left: Transaction, right: Transaction) {
  const dateOrder = right.date.localeCompare(left.date);

  if (dateOrder !== 0) return dateOrder;

  return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
}

const comparators: Record<
  SortOption,
  (left: Transaction, right: Transaction) => number
> = {
  recent: compareRecent,
  oldest: (left, right) => compareRecent(right, left),
  highest: (left, right) =>
    right.amount - left.amount || compareRecent(left, right),
  lowest: (left, right) =>
    left.amount - right.amount || compareRecent(left, right),
  alpha: (left, right) =>
    left.description.localeCompare(right.description, "pt-BR", {
      sensitivity: "base",
    }) || compareRecent(left, right),
};

export function sortTransactions(
  transactions: Transaction[],
  sort: SortOption,
) {
  return [...transactions].sort(comparators[sort]);
}

function getDayLabel(date: string, todayDate: string, yesterdayDate: string) {
  if (date === todayDate) return "Hoje";
  if (date === yesterdayDate) return "Ontem";

  const { year, month, day } = getDateOnlyParts(date);

  return dayFormatter
    .format(new Date(year, month - 1, day))
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function sumSigned(transactions: Transaction[]) {
  return transactions.reduce(
    (total, transaction) => total + getSignedAmount(transaction),
    0,
  );
}

export function groupTransactions(
  transactions: Transaction[],
  sort: SortOption,
  group: GroupOption,
): TransactionGroup[] {
  const sorted = sortTransactions(transactions, sort);

  if (group === "none") {
    return sorted.length
      ? [
          {
            key: "all",
            label: "Todas as movimentações",
            total: sumSigned(sorted),
            transactions: sorted,
          },
        ]
      : [];
  }

  const buckets = new Map<string, Transaction[]>();

  sorted.forEach((transaction) => {
    const key =
      group === "date"
        ? transaction.date
        : transaction.category?.trim() || "Sem categoria";

    buckets.set(key, [...(buckets.get(key) ?? []), transaction]);
  });

  if (group === "date") {
    const today = new Date();
    const yesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1,
    );
    const todayDate = toDateOnly(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate(),
    );
    const yesterdayDate = toDateOnly(
      yesterday.getFullYear(),
      yesterday.getMonth() + 1,
      yesterday.getDate(),
    );
    const toGroup = ([date, items]: [string, Transaction[]]) => ({
      key: date,
      label: getDayLabel(date, todayDate, yesterdayDate),
      hint: date > todayDate ? "Previsto" : undefined,
      total: sumSigned(items),
      transactions: items,
    });
    const entries = [...buckets.entries()];

    if (sort === "oldest") {
      return entries
        .sort(([left], [right]) => left.localeCompare(right))
        .map(toGroup);
    }

    // Scheduled entries (recurring bills, subscriptions) are dated ahead of
    // today; listing them after what already happened keeps the latest
    // purchase at the top, with the soonest upcoming entry first below it.
    const past = entries
      .filter(([date]) => date <= todayDate)
      .sort(([left], [right]) => right.localeCompare(left));
    const upcoming = entries
      .filter(([date]) => date > todayDate)
      .sort(([left], [right]) => left.localeCompare(right));

    return [...past, ...upcoming].map(toGroup);
  }

  const spendingByCategory = [...buckets.entries()].map(([label, items]) => ({
    label,
    items,
    total: sumSigned(items),
    volume: items.reduce((total, item) => total + item.amount, 0),
  }));
  const totalVolume = spendingByCategory.reduce(
    (total, category) => total + category.volume,
    0,
  );

  return spendingByCategory
    .sort((left, right) => right.volume - left.volume)
    .map((category) => ({
      key: category.label,
      label: category.label,
      hint: `${category.items.length} ${category.items.length === 1 ? "lançamento" : "lançamentos"}`,
      total: category.total,
      share: totalVolume > 0 ? (category.volume / totalVolume) * 100 : 0,
      transactions: category.items,
    }));
}
