import assert from "node:assert/strict";
import test from "node:test";

import { FINYNC_BACKUP_VERSION, type FinyncBackup } from "../lib/backupExport.ts";
import type { Tables } from "../lib/database.types.ts";
import {
  getAffectedRecords,
  groupByCategoryLabel,
  healthCheckInfo,
} from "../lib/dataHealth.ts";

let sequence = 0;

function transaction(overrides: Partial<Tables<"transactions">>): Tables<"transactions"> {
  sequence += 1;
  return {
    amount: 10,
    card_id: null,
    category: "Lazer",
    created_at: "",
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
    updated_at: "",
    user_id: "user-1",
    ...overrides,
  };
}

function backupWith(
  transactions: Tables<"transactions">[],
  extra: Partial<FinyncBackup["data"]> = {},
): FinyncBackup {
  return {
    format_version: FINYNC_BACKUP_VERSION,
    generated_at: "",
    user_id: "user-1",
    profile: null,
    data: {
      cards: [],
      dependents: [],
      categories: [
        { created_at: "", icon: "Tag", id: "cat-1", kind: "expense", label: "Lazer", name: "Lazer", user_id: "user-1" },
      ] as FinyncBackup["data"]["categories"],
      transactions,
      card_invoices: [],
      invoice_payments: [],
      dependent_settlements: [],
      category_budgets: [],
      audit_logs: [],
      ...extra,
    },
  };
}

test("encontra lançamentos sem categoria e com categoria apagada", () => {
  const backup = backupWith([
    transaction({ category: null }),
    transaction({ category: "  " }),
    transaction({ category: "Viagem" }),
    transaction({ category: "lazer " }),
    transaction({ type: "income", category: null }),
    transaction({ type: "card", card_id: "c", category: "Crédito / Estorno" }),
  ]);

  assert.equal(getAffectedRecords("transactions_without_category", backup).length, 2);
  const unknown = getAffectedRecords("transactions_with_unknown_category", backup);
  assert.deepEqual(unknown.map((record) => record.categoryLabel), ["Viagem"]);
  assert.deepEqual(groupByCategoryLabel(unknown).map((group) => group.label), ["Viagem"]);
});

test("aponta parcelas soltas e repetidas", () => {
  const backup = backupWith([
    transaction({ installments_total: 3, installment_number: 1, group_id: null }),
    transaction({ installments_total: 3, installment_number: 2, group_id: "g" }),
    transaction({ installments_total: 3, installment_number: 2, group_id: "g" }),
    transaction({ installments_total: 3, installment_number: 3, group_id: "g" }),
  ]);

  assert.equal(getAffectedRecords("invalid_installment_groups", backup).length, 1);
  assert.equal(getAffectedRecords("duplicate_installment_positions", backup).length, 2);
});

test("compara total da fatura com as compras, abatendo estornos", () => {
  const invoice = {
    billing_month: "2026-09-01",
    card_id: "c",
    closed_at: null,
    created_at: "",
    cycle_end: "",
    cycle_start: "",
    due_date: "2026-09-10",
    id: "inv",
    paid_amount: 0,
    paid_at: null,
    posted_amount: 0,
    status: "OPEN",
    total_amount: 90,
    updated_at: "",
    user_id: "user-1",
  };
  const purchases = [
    transaction({ type: "card", card_id: "c", invoice_id: "inv", amount: 100 }),
    transaction({ type: "card", card_id: "c", invoice_id: "inv", amount: 10, category: "Estorno" }),
  ];

  assert.equal(
    getAffectedRecords("invoice_total_mismatches", backupWith(purchases, { card_invoices: [invoice] })).length,
    0,
  );
  const [mismatch] = getAffectedRecords(
    "invoice_total_mismatches",
    backupWith(purchases, { card_invoices: [{ ...invoice, total_amount: 120 }] }),
  );
  assert.equal(mismatch.expected, 90);
  assert.equal(mismatch.actual, 120);
});

test("acerto acima do devido aparece por pessoa e mês", () => {
  const backup = backupWith([transaction({ dependent_id: "d", amount: 50 })], {
    dependents: [{ created_at: "", id: "d", name: "Ana", user_id: "user-1" }],
    dependent_settlements: [
      {
        amount: 80,
        competence_month: "2026-09-01",
        created_at: "",
        dependent_id: "d",
        id: "s",
        idempotency_key: null,
        method: "PIX",
        notes: null,
        settled_at: "",
        source: "manual",
        status: "CONFIRMED",
        updated_at: "",
        user_id: "user-1",
      },
    ],
  });
  const [record] = getAffectedRecords("dependent_settlements_above_obligations", backup);

  assert.equal(record.title, "Ana");
  assert.equal(record.expected, 50);
  assert.equal(record.actual, 80);
});

test("todas as verificações do banco têm explicação", () => {
  assert.equal(Object.keys(healthCheckInfo).length, 12);
});
