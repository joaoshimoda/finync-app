import type { FinyncBackup } from "./backupExport.ts";
import type { Tables } from "./database.types.ts";

/* Client-side mirror of `finync_get_data_health`: the database function
   returns how many records fail each check, this finds which ones, from the
   backup snapshot, so the page can list them and offer safe fixes. Keep the
   rules in sync with supabase/migrations/20260910160000_create_data_health_checks.sql. */

type Transaction = Tables<"transactions">;

export type HealthArea = "categories" | "cards" | "installments" | "dependents" | "budgets";

export interface AffectedRecord {
  id: string;
  title: string;
  detail: string;
  date: string | null;
  amount: number | null;
  /* Values to compare when the problem is a mismatch (expected vs saved). */
  expected?: number;
  actual?: number;
  /* For category checks: the category label to group fixes by. */
  categoryLabel?: string | null;
}

export interface HealthCheckInfo {
  area: HealthArea;
  why: string;
  howToFix: string;
  fix?: "set-category" | "restore-category";
}

export const healthAreas: Record<HealthArea, string> = {
  categories: "Categorias",
  cards: "Cartões e faturas",
  installments: "Parcelas e recorrências",
  dependents: "Dependentes",
  budgets: "Orçamentos",
};

export const healthCheckInfo: Record<string, HealthCheckInfo> = {
  transactions_without_category: {
    area: "categories",
    why: "Ficam de fora dos orçamentos e aparecem como “Sem categoria” nos gráficos.",
    howToFix: "Escolha uma categoria para esses lançamentos.",
    fix: "set-category",
  },
  transactions_with_unknown_category: {
    area: "categories",
    why: "A categoria foi apagada ou renomeada, então esses gastos não somam em nenhum orçamento.",
    howToFix: "Recadastre a categoria ou mova os lançamentos para outra.",
    fix: "restore-category",
  },
  card_transactions_without_card: {
    area: "cards",
    why: "Sem cartão, a compra não entra em nenhuma fatura.",
    howToFix: "Abra o lançamento e escolha o cartão.",
  },
  non_card_transactions_with_card: {
    area: "cards",
    why: "Um gasto à vista ligado a um cartão pode inflar a fatura.",
    howToFix: "Abra o lançamento e confira a forma de pagamento.",
  },
  transactions_linked_to_wrong_invoice: {
    area: "cards",
    why: "A compra conta na fatura errada, mudando o total a pagar.",
    howToFix: "Edite a data ou o cartão da compra para ela voltar à fatura certa.",
  },
  invoice_total_mismatches: {
    area: "cards",
    why: "O total guardado da fatura não bate com a soma das compras dela.",
    howToFix: "Abra a fatura em Cartões; editar ou salvar uma compra dela recalcula o total.",
  },
  invoice_payment_total_mismatches: {
    area: "cards",
    why: "O valor pago guardado não bate com os pagamentos registrados.",
    howToFix: "Confira os pagamentos da fatura em Cartões.",
  },
  invalid_installment_groups: {
    area: "installments",
    why: "Parcelas soltas não são reconhecidas como a mesma compra.",
    howToFix: "Abra a compra parcelada e confira número e total de parcelas.",
  },
  duplicate_installment_positions: {
    area: "installments",
    why: "A mesma parcela lançada duas vezes cobra em dobro.",
    howToFix: "Exclua a parcela repetida.",
  },
  recurrences_without_group: {
    area: "installments",
    why: "Sem vínculo, editar ou cancelar a série não alcança esse lançamento.",
    howToFix: "Abra em Contas fixas e recrie a recorrência, se precisar.",
  },
  dependent_settlements_above_obligations: {
    area: "dependents",
    why: "Foi registrado mais dinheiro recebido do que a pessoa gastou no mês.",
    howToFix: "Confira os acertos ou os gastos vinculados em Dependentes.",
  },
  invalid_category_budgets: {
    area: "budgets",
    why: "O orçamento aponta para uma categoria que não é de despesa.",
    howToFix: "Exclua o orçamento e crie de novo com uma categoria de despesa.",
  },
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

/* Same credit rule the SQL uses for invoice and dependent totals. */
function isCreditLike(transaction: Transaction) {
  const category = normalize(transaction.category);
  return (
    (transaction.notes ?? "").includes("[card_credit_adjustment]") ||
    category.includes("estorno") ||
    category.includes("pagamento")
  );
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function toRecord(transaction: Transaction, detail: string): AffectedRecord {
  return {
    id: transaction.id,
    title: transaction.description,
    detail,
    date: transaction.transaction_date,
    amount: transaction.amount,
    categoryLabel: transaction.category,
  };
}

function installmentLabel(transaction: Transaction) {
  return `Parcela ${transaction.installment_number}/${transaction.installments_total}`;
}

export function getAffectedRecords(checkKey: string, backup: FinyncBackup): AffectedRecord[] {
  const { transactions, card_invoices: invoices, categories } = backup.data;
  const cardNames = new Map(backup.data.cards.map((card) => [card.id, card.name]));
  const expenseLabels = new Set(
    categories.filter((category) => category.kind === "expense").map((category) => normalize(category.label)),
  );

  switch (checkKey) {
    case "transactions_without_category":
      return transactions
        .filter((transaction) => transaction.type !== "income" && !normalize(transaction.category))
        .map((transaction) => toRecord(transaction, "Sem categoria"));

    case "transactions_with_unknown_category":
      return transactions
        .filter(
          (transaction) =>
            transaction.type !== "income" &&
            Boolean(normalize(transaction.category)) &&
            !(transaction.type === "card" && isCreditLike(transaction)) &&
            !expenseLabels.has(normalize(transaction.category)),
        )
        .map((transaction) => toRecord(transaction, `Categoria “${transaction.category?.trim()}”`));

    case "card_transactions_without_card":
      return transactions
        .filter((transaction) => transaction.type === "card" && !transaction.card_id)
        .map((transaction) => toRecord(transaction, "Compra no crédito sem cartão"));

    case "non_card_transactions_with_card":
      return transactions
        .filter((transaction) => transaction.type !== "card" && transaction.card_id)
        .map((transaction) =>
          toRecord(
            transaction,
            `${transaction.type === "income" ? "Receita" : "Débito/Pix"} ligado a ${cardNames.get(transaction.card_id!) ?? "um cartão"}`,
          ),
        );

    case "invalid_installment_groups":
      return transactions
        .filter(
          (transaction) =>
            transaction.installments_total > 1 &&
            (!transaction.group_id ||
              transaction.installment_number < 1 ||
              transaction.installment_number > transaction.installments_total),
        )
        .map((transaction) =>
          toRecord(
            transaction,
            `${installmentLabel(transaction)}${transaction.group_id ? "" : " · sem grupo"}`,
          ),
        );

    case "duplicate_installment_positions": {
      const positions = new Map<string, Transaction[]>();
      transactions
        .filter((transaction) => transaction.group_id && transaction.installments_total > 1)
        .forEach((transaction) => {
          const key = `${transaction.group_id}|${transaction.installment_number}`;
          positions.set(key, [...(positions.get(key) ?? []), transaction]);
        });
      return Array.from(positions.values())
        .filter((items) => items.length > 1)
        .flat()
        .map((transaction) => toRecord(transaction, `${installmentLabel(transaction)} repetida`));
    }

    case "recurrences_without_group":
      return transactions
        .filter((transaction) => transaction.recurring && !transaction.group_id)
        .map((transaction) => toRecord(transaction, "Recorrência sem série"));

    case "transactions_linked_to_wrong_invoice": {
      const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
      return transactions
        .filter((transaction) => {
          const invoice = transaction.invoice_id ? invoicesById.get(transaction.invoice_id) : null;
          return (
            invoice &&
            (transaction.card_id !== invoice.card_id ||
              transaction.month_start.slice(0, 10) !== invoice.billing_month.slice(0, 10))
          );
        })
        .map((transaction) => {
          const invoice = invoicesById.get(transaction.invoice_id!)!;
          return toRecord(
            transaction,
            `Na fatura de ${invoice.billing_month.slice(5, 7)}/${invoice.billing_month.slice(0, 4)} de ${cardNames.get(invoice.card_id) ?? "outro cartão"}`,
          );
        });
    }

    case "invoice_total_mismatches":
      return invoices.flatMap((invoice) => {
        const expected = Math.max(
          money(
            transactions
              .filter((transaction) => transaction.invoice_id === invoice.id)
              .reduce(
                (sum, transaction) =>
                  sum + (isCreditLike(transaction) ? -transaction.amount : transaction.amount),
                0,
              ),
          ),
          0,
        );
        return money(invoice.total_amount) === expected
          ? []
          : [
              {
                id: invoice.id,
                title: `Fatura ${cardNames.get(invoice.card_id) ?? "Cartão"}`,
                detail: `Competência ${invoice.billing_month.slice(5, 7)}/${invoice.billing_month.slice(0, 4)}`,
                date: invoice.due_date,
                amount: null,
                expected,
                actual: invoice.total_amount,
              },
            ];
      });

    case "invoice_payment_total_mismatches":
      return invoices.flatMap((invoice) => {
        const paid = money(
          backup.data.invoice_payments
            .filter(
              (payment) =>
                payment.invoice_id === invoice.id && payment.status.toUpperCase() === "CONFIRMED",
            )
            .reduce((sum, payment) => sum + payment.amount, 0),
        );
        return money(invoice.paid_amount) === paid
          ? []
          : [
              {
                id: invoice.id,
                title: `Fatura ${cardNames.get(invoice.card_id) ?? "Cartão"}`,
                detail: `Competência ${invoice.billing_month.slice(5, 7)}/${invoice.billing_month.slice(0, 4)}`,
                date: invoice.due_date,
                amount: null,
                expected: paid,
                actual: invoice.paid_amount,
              },
            ];
      });

    case "dependent_settlements_above_obligations": {
      const names = new Map(backup.data.dependents.map((dependent) => [dependent.id, dependent.name]));
      const settled = new Map<string, number>();
      backup.data.dependent_settlements
        .filter((settlement) => settlement.status.toUpperCase() === "CONFIRMED")
        .forEach((settlement) => {
          const key = `${settlement.dependent_id}|${settlement.competence_month.slice(0, 10)}`;
          settled.set(key, (settled.get(key) ?? 0) + settlement.amount);
        });
      return Array.from(settled.entries()).flatMap(([key, amount]) => {
        const [dependentId, month] = key.split("|");
        const obligation = Math.max(
          money(
            transactions
              .filter(
                (transaction) =>
                  transaction.dependent_id === dependentId &&
                  transaction.type !== "income" &&
                  transaction.month_start.slice(0, 10) === month,
              )
              .reduce(
                (sum, transaction) =>
                  sum +
                  (transaction.type === "card" && isCreditLike(transaction)
                    ? -transaction.amount
                    : transaction.amount),
                0,
              ),
          ),
          0,
        );
        return money(amount) > obligation
          ? [
              {
                id: key,
                title: names.get(dependentId) ?? "Dependente removido",
                detail: `Competência ${month.slice(5, 7)}/${month.slice(0, 4)}`,
                date: null,
                amount: null,
                expected: obligation,
                actual: money(amount),
              },
            ]
          : [];
      });
    }

    case "invalid_category_budgets": {
      const categoriesById = new Map(categories.map((category) => [category.id, category]));
      return backup.data.category_budgets
        .filter((budget) => {
          const category = categoriesById.get(budget.category_id);
          return category && category.kind !== "expense";
        })
        .map((budget) => ({
          id: budget.id,
          title: `Orçamento de ${categoriesById.get(budget.category_id)?.label ?? "categoria"}`,
          detail: `Competência ${budget.competence_month.slice(5, 7)}/${budget.competence_month.slice(0, 4)}`,
          date: null,
          amount: budget.amount,
        }));
    }

    default:
      return [];
  }
}

/* Groups unknown-category records by the label they still carry. */
export function groupByCategoryLabel(records: AffectedRecord[]) {
  const groups = new Map<string, AffectedRecord[]>();
  records.forEach((record) => {
    const label = record.categoryLabel?.trim() || "Sem categoria";
    groups.set(label, [...(groups.get(label) ?? []), record]);
  });
  return Array.from(groups.entries())
    .map(([label, items]) => ({ label, items }))
    .sort((left, right) => right.items.length - left.items.length);
}
