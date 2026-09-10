import assert from "node:assert/strict";
import test from "node:test";

import {
  addMonthsToDateOnly,
  buildMonthlyProjectionDates,
  splitAmountIntoInstallments,
} from "../lib/transactionProjection.ts";

test("mantem o dia ancora ao projetar recorrencias", () => {
  assert.deepEqual(buildMonthlyProjectionDates("2026-08-10", 4), [
    "2026-08-10",
    "2026-09-10",
    "2026-10-10",
    "2026-11-10",
  ]);
});

test("ajusta o dia ancora para o ultimo dia de meses curtos", () => {
  assert.equal(addMonthsToDateOnly("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsToDateOnly("2028-01-31", 1), "2028-02-29");
});

test("recorrencia atravessa dezembro sem perder o ano", () => {
  assert.equal(addMonthsToDateOnly("2026-12-15", 1), "2027-01-15");
});

test("parcelamento preserva exatamente o total em centavos", () => {
  const installments = splitAmountIntoInstallments(1000, 3);

  assert.deepEqual(installments, [333.34, 333.33, 333.33]);
  assert.equal(
    installments.reduce((sum, amount) => sum + Math.round(amount * 100), 0),
    100_000,
  );
});

test("rejeita quantidade de parcelas invalida", () => {
  assert.throws(() => splitAmountIntoInstallments(100, 0), RangeError);
});
