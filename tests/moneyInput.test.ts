import assert from "node:assert/strict";
import test from "node:test";

import { parseMoneyInput } from "../lib/moneyInput.ts";

test("reads Brazilian amounts with thousands and decimals", () => {
  assert.equal(parseMoneyInput("6.500,00"), 6500);
  assert.equal(parseMoneyInput("1.234,56"), 1234.56);
  assert.equal(parseMoneyInput("1.234.567,89"), 1234567.89);
  assert.equal(parseMoneyInput("R$ 2.100,00"), 2100);
});

test("reads dots as thousands when they group three digits", () => {
  assert.equal(parseMoneyInput("6.500"), 6500);
  assert.equal(parseMoneyInput("12.000"), 12000);
  assert.equal(parseMoneyInput("1.000.000"), 1000000);
});

test("reads a lone dot with one or two digits as a decimal", () => {
  assert.equal(parseMoneyInput("12.5"), 12.5);
  assert.equal(parseMoneyInput("1234.56"), 1234.56);
  assert.equal(parseMoneyInput("0.500"), 0.5);
});

test("reads comma decimals and plain numbers", () => {
  assert.equal(parseMoneyInput("249,90"), 249.9);
  assert.equal(parseMoneyInput("6500"), 6500);
  assert.equal(parseMoneyInput("0,01"), 0.01);
  assert.equal(parseMoneyInput("1,234.56"), 1234.56);
});

test("returns NaN when nothing numeric was typed", () => {
  assert.ok(Number.isNaN(parseMoneyInput("")));
  assert.ok(Number.isNaN(parseMoneyInput("abc")));
  assert.ok(Number.isNaN(parseMoneyInput(null)));
});

test("passes numbers through", () => {
  assert.equal(parseMoneyInput(42.5), 42.5);
});
