import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCurrency,
  getCurrencySymbol,
  getHiddenCurrencyLabel,
} from "../lib/currency.ts";

test("formats the configured currency without converting the stored value", () => {
  assert.equal(formatCurrency(1234.56, "BRL"), "R$\u00a01.234,56");
  assert.equal(formatCurrency(1234.56, "USD"), "US$\u00a01.234,56");
  assert.equal(formatCurrency(1234.56, "EUR"), "€\u00a01.234,56");
});

test("uses the selected currency in privacy labels", () => {
  assert.equal(getCurrencySymbol("USD"), "US$");
  assert.equal(getHiddenCurrencyLabel("EUR"), "€ ••••");
});
