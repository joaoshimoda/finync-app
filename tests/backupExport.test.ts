import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTransactionsCsv,
  FINYNC_BACKUP_VERSION,
  getBackupFilename,
  parseFinyncBackup,
  type FinyncBackup,
} from "../lib/backupExport.ts";

function createBackup(): FinyncBackup {
  return {
    format_version: FINYNC_BACKUP_VERSION,
    generated_at: "2026-09-10T12:00:00.000Z",
    user_id: "user-1",
    profile: null,
    data: {
      cards: [
        {
          closing_day: 4,
          color: null,
          created_at: "2026-01-01T00:00:00Z",
          due_day: 10,
          emoji: null,
          id: "card-1",
          legacy_key: "nubank",
          limit_amount: 5000,
          name: "Nubank",
          updated_at: "2026-01-01T00:00:00Z",
          user_id: "user-1",
        },
      ],
      dependents: [],
      categories: [],
      transactions: [
        {
          amount: 49.9,
          card_id: "card-1",
          category: "Lazer",
          created_at: "2026-09-10T12:00:00Z",
          day: 10,
          dependent_id: null,
          description: "=SUM(A1:A2)",
          direct_subscription: false,
          group_id: null,
          id: "transaction-1",
          import_signature: null,
          invoice_id: null,
          installment_number: 1,
          installments_total: 1,
          is_variable: false,
          month_label: "Setembro 2026",
          month_start: "2026-09-01",
          notes: null,
          owner: null,
          recurring: false,
          split_with: [],
          status: "PENDENTE",
          transaction_date: "2026-08-10",
          type: "card",
          updated_at: "2026-09-10T12:00:00Z",
          user_id: "user-1",
        },
      ],
      card_invoices: [],
      invoice_payments: [],
      dependent_settlements: [],
      category_budgets: [],
      audit_logs: [],
    },
  };
}

test("valida a estrutura mínima do backup", () => {
  const backup = createBackup();

  assert.equal(parseFinyncBackup(backup as unknown as never)?.user_id, "user-1");
  assert.equal(parseFinyncBackup({ format_version: "invalid" }), null);
});

test("CSV protege fórmulas e mantém dados financeiros", () => {
  const csv = buildTransactionsCsv(createBackup());

  assert.match(csv, /'=SUM\(A1:A2\)/);
  assert.match(csv, /49,90/);
  assert.match(csv, /Cartão de crédito/);
  assert.match(csv, /Nubank/);
});

test("nome do arquivo usa data local estável", () => {
  assert.equal(
    getBackupFilename("json", new Date(2026, 8, 10, 12)),
    "finync-backup-2026-09-10.json",
  );
});
