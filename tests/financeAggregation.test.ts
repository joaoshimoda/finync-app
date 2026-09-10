import assert from "node:assert/strict";
import test from "node:test";

import { aggregatePeriodExpenses } from "../lib/financeAggregation.ts";

const baseEntry = {
  category: "Outros",
  date: "2026-08-10",
  dependentId: null,
  is_recurring: false,
  notes: "",
};

test("separa mes civil de competencia do cartao", () => {
  const result = aggregatePeriodExpenses(
    [
      {
        ...baseEntry,
        id: "fixed-august",
        type: "fixed",
        amount: 100,
      },
      {
        ...baseEntry,
        id: "fixed-september",
        type: "fixed",
        date: "2026-09-10",
        amount: 200,
      },
      {
        ...baseEntry,
        id: "card-september",
        type: "card",
        billingMonthStart: "2026-09-01",
        amount: 300,
      },
    ],
    8,
    2026,
  );

  assert.equal(result.fixed, 100);
  assert.equal(result.card, 0);
  assert.equal(result.total, 100);
});

test("usa transacoes individuais uma unica vez", () => {
  const duplicatedEntry = {
    ...baseEntry,
    id: "same-id",
    type: "card",
    billingMonthStart: "2026-08-01",
    amount: 250,
  };
  const result = aggregatePeriodExpenses(
    [duplicatedEntry, duplicatedEntry],
    8,
    2026,
  );

  assert.equal(result.card, 250);
  assert.equal(result.entries.length, 1);
});

test("exclui dependentes somente quando solicitado", () => {
  const entries = [
    {
      ...baseEntry,
      id: "mine",
      type: "fixed",
      amount: 100,
    },
    {
      ...baseEntry,
      id: "dependent",
      type: "card",
      billingMonthStart: "2026-08-01",
      dependentId: "dependent-id",
      amount: 80,
    },
  ];

  assert.equal(aggregatePeriodExpenses(entries, 8, 2026).total, 180);
  assert.equal(
    aggregatePeriodExpenses(entries, 8, 2026, {
      excludeDependents: true,
    }).total,
    100,
  );
});

test("creditos do cartao reduzem a despesa sem gerar total negativo", () => {
  const result = aggregatePeriodExpenses(
    [
      {
        ...baseEntry,
        id: "purchase",
        type: "card",
        billingMonthStart: "2026-08-01",
        amount: 300,
      },
      {
        ...baseEntry,
        id: "refund",
        type: "card",
        billingMonthStart: "2026-08-01",
        category: "Credito / Estorno",
        amount: 50,
      },
    ],
    8,
    2026,
  );

  assert.equal(result.card, 250);
  assert.equal(result.total, 250);
});
