import assert from "node:assert/strict";
import test from "node:test";

import {
  isCalendarTransactionInSelectedMonth,
  isCardTransactionInSelectedInvoiceMonth,
  isTransactionInSelectedCompetence,
} from "../lib/transactionPeriod.ts";

test("receita e conta fixa usam o mes civil", () => {
  const fixed = { type: "fixed", date: "2026-08-31" };
  const income = { type: "income", date: "2026-08-01" };

  assert.equal(isCalendarTransactionInSelectedMonth(fixed, 8, 2026), true);
  assert.equal(isTransactionInSelectedCompetence(income, 8, 2026), true);
  assert.equal(isTransactionInSelectedCompetence(fixed, 9, 2026), false);
});

test("cartao usa a competencia da fatura e nao a data da compra", () => {
  const transaction = {
    type: "card",
    date: "2026-08-20",
    billingMonthStart: "2026-09-01",
  };

  assert.equal(
    isCardTransactionInSelectedInvoiceMonth(transaction, 8, 2026),
    false,
  );
  assert.equal(isTransactionInSelectedCompetence(transaction, 9, 2026), true);
});

test("cartao legado usa a data quando a competencia nao existe", () => {
  const transaction = {
    type: "card",
    date: "2026-08-03",
  };

  assert.equal(isTransactionInSelectedCompetence(transaction, 8, 2026), true);
});
