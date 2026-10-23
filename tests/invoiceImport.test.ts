import assert from "node:assert/strict";
import test from "node:test";

import { CARD_CREDIT_ADJUSTMENT_CATEGORY } from "../lib/cardCredits.ts";
import {
  findHistoricalCategory,
  getImportSignature,
  getRowsForImport,
  mapCsvRow,
  parseCsvDate,
  parseCurrencyInput,
  parseAmount,
  parseInstallment,
  type ParsedTransaction,
} from "../lib/invoiceImport.ts";

test("parseInstallment reads the common installment suffixes", () => {
  assert.deepEqual(parseInstallment("Magazine Luiza 04/10"), {
    cleanDescription: "Magazine Luiza",
    installmentNumber: 4,
    installmentsTotal: 10,
  });
  assert.deepEqual(parseInstallment("Renner - Parcela 2/4"), {
    cleanDescription: "Renner",
    installmentNumber: 2,
    installmentsTotal: 4,
  });
  assert.equal(parseInstallment("Netflix").installmentsTotal, 1);
  assert.equal(parseInstallment("Loja 5/3").installmentsTotal, 1);
});

test("parseAmount reads Brazilian and dot-decimal amounts", () => {
  assert.deepEqual(parseAmount("312.45"), { amount: 312.45, isNegative: false });
  assert.deepEqual(parseAmount("-79.9"), { amount: 79.9, isNegative: true });
  assert.equal(parseAmount("1.234,56").amount, 1234.56);
  assert.equal(parseAmount("1,234.56").amount, 1234.56);
  assert.equal(parseAmount("R$ 12,50").amount, 12.5);
  assert.equal(parseAmount("1.500").amount, 1500);
  assert.equal(parseAmount("200").amount, 200);
  assert.equal(parseAmount("(45,00)").isNegative, true);
});

test("parseCsvDate accepts ISO and Brazilian dates", () => {
  assert.equal(parseCsvDate("2026-10-05"), "2026-10-05");
  assert.equal(parseCsvDate("05/10/2026"), "2026-10-05");
  assert.equal(parseCsvDate("5/10/26"), "2026-10-05");
});

test("parseCurrencyInput handles Brazilian formatting", () => {
  assert.equal(parseCurrencyInput("1.234,56"), 1234.56);
  assert.equal(parseCurrencyInput("R$ 10,5"), 10.5);
  assert.equal(parseCurrencyInput("abc"), 0);
});

test("mapCsvRow maps expenses, credits and skips invoice payments", () => {
  const history = { "padaria central": "Alimentação" };
  const [expense] = mapCsvRow(
    { date: "2026-10-03", title: "Padaria Central", amount: "12,50" },
    history,
  );

  assert.equal(expense.type, "expense");
  assert.equal(expense.amount, 12.5);
  assert.equal(expense.category, "Alimentação");

  const [credit] = mapCsvRow(
    { date: "2026-10-04", title: "Estorno loja", amount: "-30,00" },
    history,
  );

  assert.equal(credit.type, "credit");
  assert.equal(credit.category, CARD_CREDIT_ADJUSTMENT_CATEGORY);

  assert.deepEqual(
    mapCsvRow({ date: "2026-10-05", title: "Pagamento recebido", amount: "500" }, history),
    [],
  );

  const [paymentCredit] = mapCsvRow(
    { date: "2026-10-05", title: "Pagamento recebido", amount: "-500" },
    history,
  );

  assert.equal(paymentCredit.requiresReview, true);
});

test("findHistoricalCategory matches similar descriptions", () => {
  assert.equal(
    findHistoricalCategory("UBER *TRIP", { "uber trip": "Transporte" }),
    "Transporte",
  );
  assert.equal(findHistoricalCategory("Loja X", {}), null);
});

test("getRowsForImport projects the remaining installments", () => {
  const transaction: ParsedTransaction = {
    date: "2026-10-15",
    description: "Notebook",
    amount: 300,
    category: "Compras",
    type: "expense",
    projectFutureInstallments: true,
    referenceMonthOffset: 0,
    installmentNumber: 8,
    installmentsTotal: 10,
    owner: "me",
  };
  const rows = getRowsForImport(transaction, () => "group-1");

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => [row.installmentNumber, row.referenceMonthOffset, row.date]),
    [
      [8, 0, "2026-10-15"],
      [9, 1, "2026-11-15"],
      [10, 2, "2026-12-15"],
    ],
  );
  assert.ok(rows.every((row) => row.groupId === "group-1"));
  assert.equal(
    getRowsForImport({ ...transaction, projectFutureInstallments: false }, () => "g")
      .length,
    1,
  );
});

test("getImportSignature ignores accents and case in descriptions", () => {
  const base = {
    month_start: "2026-10-01",
    day: 5,
    amount: 10,
    installment_number: 1,
    installments_total: 1,
  };

  assert.equal(
    getImportSignature({ ...base, description: "Padaria São João" }),
    getImportSignature({ ...base, description: "PADARIA SAO JOAO" }),
  );
});
