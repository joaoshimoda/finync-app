import assert from "node:assert/strict";
import test from "node:test";

import {
  getCardInvoiceCycle,
  getCardInvoiceMonthStart,
  getInstallmentInvoiceMonthStart,
} from "../lib/cardBilling.ts";

test("compra anterior ao fechamento permanece na fatura do mes", () => {
  assert.equal(getCardInvoiceMonthStart("2026-08-03", 4), "2026-08-01");
});

test("compra no dia do fechamento vai para a proxima fatura", () => {
  assert.equal(getCardInvoiceMonthStart("2026-08-04", 4), "2026-09-01");
});

test("compra posterior ao fechamento vai para a proxima fatura", () => {
  assert.equal(getCardInvoiceMonthStart("2026-08-20", 4), "2026-09-01");
});

test("fechamento em dezembro avanca corretamente para janeiro", () => {
  assert.equal(getCardInvoiceMonthStart("2026-12-10", 4), "2027-01-01");
});

test("parcelas avancam a partir da competencia da primeira parcela", () => {
  assert.equal(
    getInstallmentInvoiceMonthStart("2026-08-04", 4, 0),
    "2026-09-01",
  );
  assert.equal(
    getInstallmentInvoiceMonthStart("2026-08-04", 4, 1),
    "2026-10-01",
  );
  assert.equal(
    getInstallmentInvoiceMonthStart("2026-08-04", 4, 4),
    "2027-01-01",
  );
});

test("ciclo com fechamento dia 4 vai do dia 4 anterior ao dia 3 atual", () => {
  assert.deepEqual(getCardInvoiceCycle("2026-09-01", 4), {
    startDate: "2026-08-04",
    endDate: "2026-09-03",
  });
});

test("ciclo com fechamento dia 1 cobre o mes civil anterior", () => {
  assert.deepEqual(getCardInvoiceCycle("2026-09-01", 1), {
    startDate: "2026-08-01",
    endDate: "2026-08-31",
  });
});
