import assert from "node:assert/strict";
import test from "node:test";

import {
  getInvoiceOutstanding,
  getPostedInvoiceOutstanding,
  getSuggestedInvoicePayment,
} from "../lib/invoicePayments.ts";

test("pagamento parcial reduz o saldo total da fatura", () => {
  const invoice = { postedAmount: 500, totalAmount: 700, paidAmount: 200 };

  assert.equal(getInvoiceOutstanding(invoice), 500);
  assert.equal(getPostedInvoiceOutstanding(invoice), 300);
  assert.equal(getSuggestedInvoicePayment(invoice), 300);
});

test("pagamento antecipado pode cobrir o restante projetado", () => {
  const invoice = { postedAmount: 300, totalAmount: 500, paidAmount: 300 };

  assert.equal(getPostedInvoiceOutstanding(invoice), 0);
  assert.equal(getSuggestedInvoicePayment(invoice), 200);
});

test("valores pagos nunca geram saldo negativo", () => {
  const invoice = { postedAmount: 300, totalAmount: 300, paidAmount: 300 };

  assert.equal(getInvoiceOutstanding(invoice), 0);
  assert.equal(getPostedInvoiceOutstanding(invoice), 0);
});
