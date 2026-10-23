import type { Tables } from "./database.types.ts";
import { toCsv, type FinyncBackup } from "./backupExport.ts";
import { getCardSignedAmount } from "./cardCredits.ts";

/* Reports built from the downloaded backup, so every export reads the same
   snapshot. Periods use the competence month (`month_start`): card
   purchases count in their invoice month, everything else in its own. */

type Transaction = Tables<"transactions">;
export type TransactionKind = "income" | "fixed" | "card";
export type OwnerFilter = "all" | "mine" | string;

export interface ExportFilters {
  /* First day of the first and last month, inclusive; null is open ended. */
  fromMonth: string | null;
  toMonth: string | null;
  kinds: TransactionKind[];
  cardId: string | null;
  owner: OwnerFilter;
}

export const defaultExportFilters: ExportFilters = {
  fromMonth: null,
  toMonth: null,
  kinds: ["income", "fixed", "card"],
  cardId: null,
  owner: "all",
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function monthOf(date: string) {
  return `${date.slice(0, 7)}-01`;
}

export function formatCompetence(monthStart: string) {
  return monthFormatter
    .format(new Date(`${monthOf(monthStart)}T12:00:00Z`))
    .replace(".", "")
    .replace(" de ", "/");
}

/* Signed for totals: income and card credits reduce spending. */
export function getSignedExpense(transaction: Transaction) {
  if (transaction.type === "income") return 0;
  return transaction.type === "card"
    ? getCardSignedAmount({ ...transaction, type: "card" })
    : transaction.amount;
}

export function filterTransactions(backup: FinyncBackup, filters: ExportFilters) {
  return backup.data.transactions
    .filter((transaction) => {
      const month = monthOf(transaction.month_start);

      return (
        (!filters.fromMonth || month >= filters.fromMonth) &&
        (!filters.toMonth || month <= filters.toMonth) &&
        filters.kinds.includes(transaction.type as TransactionKind) &&
        (!filters.cardId || transaction.card_id === filters.cardId) &&
        (filters.owner === "all" ||
          (filters.owner === "mine"
            ? !transaction.dependent_id
            : transaction.dependent_id === filters.owner))
      );
    })
    .sort(
      (left, right) =>
        left.month_start.localeCompare(right.month_start) ||
        left.transaction_date.localeCompare(right.transaction_date),
    );
}

export function summarizeTransactions(transactions: Transaction[]) {
  const months = transactions.map((transaction) => monthOf(transaction.month_start)).sort();

  return {
    count: transactions.length,
    income: transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    expenses: transactions.reduce((sum, transaction) => sum + getSignedExpense(transaction), 0),
    firstMonth: months[0] ?? null,
    lastMonth: months[months.length - 1] ?? null,
  };
}

/* One row per month and category: what went out, what came in. */
export function buildCategorySummaryCsv(transactions: Transaction[]) {
  const totals = new Map<string, { expenses: number; income: number; count: number }>();

  transactions.forEach((transaction) => {
    const key = `${monthOf(transaction.month_start)}|${transaction.category?.trim() || "Sem categoria"}`;
    const current = totals.get(key) ?? { expenses: 0, income: 0, count: 0 };

    if (transaction.type === "income") current.income += transaction.amount;
    else current.expenses += getSignedExpense(transaction);
    current.count += 1;
    totals.set(key, current);
  });

  const rows = Array.from(totals.entries())
    .sort(([left], [right]) => left.localeCompare(right, "pt-BR"))
    .map(([key, total]) => {
      const [month, category] = key.split("|");
      return [formatCompetence(month), category, total.expenses, total.income, String(total.count)];
    });

  return toCsv(["Competência", "Categoria", "Despesas", "Receitas", "Lançamentos"], rows);
}

const invoiceStatusLabels: Record<string, string> = {
  open: "Aberta",
  closed: "Fechada",
  partially_paid: "Parcialmente paga",
  paid: "Paga",
};

export function buildInvoicesCsv(backup: FinyncBackup, filters: ExportFilters) {
  const cardNames = new Map(backup.data.cards.map((card) => [card.id, card.name]));
  const rows = backup.data.card_invoices
    .filter(
      (invoice) =>
        (!filters.fromMonth || monthOf(invoice.billing_month) >= filters.fromMonth) &&
        (!filters.toMonth || monthOf(invoice.billing_month) <= filters.toMonth) &&
        (!filters.cardId || invoice.card_id === filters.cardId),
    )
    .sort(
      (left, right) =>
        left.billing_month.localeCompare(right.billing_month) ||
        (cardNames.get(left.card_id) ?? "").localeCompare(cardNames.get(right.card_id) ?? ""),
    )
    .map((invoice) => [
      cardNames.get(invoice.card_id) ?? "Cartão removido",
      formatCompetence(invoice.billing_month),
      invoice.cycle_start,
      invoice.cycle_end,
      invoice.due_date,
      invoice.total_amount,
      invoice.paid_amount,
      Math.max(invoice.total_amount - invoice.paid_amount, 0),
      invoiceStatusLabels[invoice.status.toLowerCase()] ?? invoice.status,
    ]);

  return toCsv(
    [
      "Cartão",
      "Competência",
      "Início do ciclo",
      "Fim do ciclo",
      "Vencimento",
      "Total",
      "Pago",
      "Restante",
      "Situação",
    ],
    rows,
  );
}

/* Per dependent and month: spent on the user's name, paid back, still due. */
export function buildDependentsCsv(backup: FinyncBackup, filters: ExportFilters) {
  const names = new Map(backup.data.dependents.map((dependent) => [dependent.id, dependent.name]));
  const totals = new Map<string, { spent: number; settled: number }>();
  const inRange = (month: string) =>
    (!filters.fromMonth || month >= filters.fromMonth) &&
    (!filters.toMonth || month <= filters.toMonth);
  const keep = (dependentId: string) =>
    filters.owner === "all" || filters.owner === "mine" || filters.owner === dependentId;

  backup.data.transactions.forEach((transaction) => {
    const month = monthOf(transaction.month_start);
    if (!transaction.dependent_id || !inRange(month) || !keep(transaction.dependent_id)) return;
    const key = `${transaction.dependent_id}|${month}`;
    const current = totals.get(key) ?? { spent: 0, settled: 0 };
    current.spent += getSignedExpense(transaction);
    totals.set(key, current);
  });

  backup.data.dependent_settlements.forEach((settlement) => {
    const month = monthOf(settlement.competence_month);
    if (settlement.status.toLowerCase() !== "confirmed" || !inRange(month) || !keep(settlement.dependent_id)) {
      return;
    }
    const key = `${settlement.dependent_id}|${month}`;
    const current = totals.get(key) ?? { spent: 0, settled: 0 };
    current.settled += settlement.amount;
    totals.set(key, current);
  });

  const rows = Array.from(totals.entries())
    .map(([key, total]) => {
      const [dependentId, month] = key.split("|");
      return {
        name: names.get(dependentId) ?? "Dependente removido",
        month,
        ...total,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR") || left.month.localeCompare(right.month))
    .map((row) => [
      row.name,
      formatCompetence(row.month),
      row.spent,
      row.settled,
      Math.max(row.spent - row.settled, 0),
    ]);

  return toCsv(["Dependente", "Competência", "Gasto", "Recebido", "Falta receber"], rows);
}
