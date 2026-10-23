import assert from "node:assert/strict";
import test from "node:test";

import { FINYNC_BACKUP_VERSION, type FinyncBackup } from "../lib/backupExport.ts";
import type { Tables } from "../lib/database.types.ts";
import {
  buildCategorySummaryCsv,
  buildDependentsCsv,
  buildInvoicesCsv,
  defaultExportFilters,
  filterTransactions,
  summarizeTransactions,
} from "../lib/exportReports.ts";

let sequence = 0;

function transaction(overrides: Partial<Tables<"transactions">>): Tables<"transactions"> {
  sequence += 1;
  return {
    amount: 10,
    card_id: null,
    category: "Lazer",
    created_at: "2026-09-10T12:00:00Z",
    day: 10,
    dependent_id: null,
    description: `Item ${sequence}`,
    direct_subscription: false,
    group_id: null,
    id: `t-${sequence}`,
    import_signature: null,
    invoice_id: null,
    installment_number: 1,
    installments_total: 1,
    month_label: null,
    month_start: "2026-09-01",
    notes: null,
    owner: null,
    recurring: false,
    split_group_id: null,
    split_with: [],
    status: "CONFIRMADO",
    transaction_date: "2026-09-10",
    type: "fixed",
    updated_at: "2026-09-10T12:00:00Z",
    user_id: "user-1",
    ...overrides,
  };
}

function createBackup(): FinyncBackup {
  return {
    format_version: FINYNC_BACKUP_VERSION,
    generated_at: "2026-10-01T12:00:00.000Z",
    user_id: "user-1",
    profile: null,
    data: {
      cards: [
        {
          closing_day: 4,
          color: null,
          created_at: "",
          due_day: 10,
          emoji: null,
          id: "card-1",
          legacy_key: "nubank",
          limit_amount: 5000,
          name: "Nubank",
          updated_at: "",
          user_id: "user-1",
        },
      ],
      dependents: [{ created_at: "", id: "dep-1", name: "Ana", user_id: "user-1" }],
      categories: [],
      transactions: [
        transaction({ month_start: "2026-08-01", transaction_date: "2026-08-05", amount: 100 }),
        transaction({ amount: 50, category: "Mercado" }),
        transaction({ type: "income", amount: 3000, category: "Salário" }),
        transaction({ type: "card", card_id: "card-1", amount: 80, dependent_id: "dep-1" }),
        transaction({
          type: "card",
          card_id: "card-1",
          amount: 20,
          category: "Crédito / Estorno",
          notes: "[card_credit_adjustment]",
        }),
      ],
      card_invoices: [
        {
          billing_month: "2026-09-01",
          card_id: "card-1",
          closed_at: null,
          created_at: "",
          cycle_end: "2026-09-04",
          cycle_start: "2026-08-05",
          due_date: "2026-09-10",
          id: "inv-1",
          paid_amount: 30,
          paid_at: null,
          posted_amount: 60,
          status: "PARTIALLY_PAID",
          total_amount: 60,
          updated_at: "",
          user_id: "user-1",
        },
      ],
      invoice_payments: [],
      dependent_settlements: [
        {
          amount: 50,
          competence_month: "2026-09-01",
          created_at: "",
          dependent_id: "dep-1",
          id: "s-1",
          idempotency_key: null,
          method: "PIX",
          notes: null,
          settled_at: "2026-09-20T12:00:00Z",
          source: "manual",
          status: "CONFIRMED",
          updated_at: "",
          user_id: "user-1",
        },
      ],
      category_budgets: [],
      audit_logs: [],
    },
  };
}

test("filtra por período, tipo, cartão e responsável", () => {
  const backup = createBackup();
  const september = { ...defaultExportFilters, fromMonth: "2026-09-01", toMonth: "2026-09-01" };

  assert.equal(filterTransactions(backup, defaultExportFilters).length, 5);
  assert.equal(filterTransactions(backup, september).length, 4);
  assert.equal(filterTransactions(backup, { ...september, kinds: ["card"] }).length, 2);
  assert.equal(filterTransactions(backup, { ...september, cardId: "card-1" }).length, 2);
  assert.equal(filterTransactions(backup, { ...september, owner: "dep-1" }).length, 1);
  assert.equal(filterTransactions(backup, { ...september, owner: "mine" }).length, 3);
});

test("resume entradas e saídas com estorno abatendo", () => {
  const summary = summarizeTransactions(filterTransactions(createBackup(), defaultExportFilters));

  assert.equal(summary.count, 5);
  assert.equal(summary.income, 3000);
  assert.equal(summary.expenses, 100 + 50 + 80 - 20);
  assert.equal(summary.firstMonth, "2026-08-01");
  assert.equal(summary.lastMonth, "2026-09-01");
});

test("resumo por categoria agrupa por competência", () => {
  const csv = buildCategorySummaryCsv(filterTransactions(createBackup(), defaultExportFilters));

  assert.match(csv, /Competência;Categoria;Despesas;Receitas;Lançamentos/);
  assert.match(csv, /set\/2026;Mercado;50,00;0,00;1(\r|$)/m);
  assert.match(csv, /set\/2026;Salário;0,00;3000,00;1(\r|$)/m);
});

test("faturas mostram restante e situação traduzida", () => {
  const csv = buildInvoicesCsv(createBackup(), defaultExportFilters);

  assert.match(csv, /Nubank;set\/2026;2026-08-05;2026-09-04;2026-09-10;60,00;30,00;30,00;Parcialmente paga/);
});

test("dependentes cruzam gasto e acertos confirmados", () => {
  const csv = buildDependentsCsv(createBackup(), defaultExportFilters);

  assert.match(csv, /Ana;set\/2026;80,00;50,00;30,00/);
});
