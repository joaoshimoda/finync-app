import assert from "node:assert/strict";
import test from "node:test";

import {
  getCategoryBudgetMetrics,
  getCategoryBudgetSpent,
} from "../lib/categoryBudgets.ts";

test("orçamento considera apenas gastos pessoais da competência", () => {
  const spent = getCategoryBudgetSpent(
    [
      {
        amount: 200,
        category: "Alimentação",
        date: "2026-09-05",
        type: "fixed",
      },
      {
        amount: 300,
        category: "Alimentação",
        date: "2026-09-06",
        dependentId: "dependent-1",
        type: "fixed",
      },
      {
        amount: 100,
        category: "Alimentação",
        date: "2026-10-05",
        type: "fixed",
      },
    ],
    "Alimentação",
    9,
    2026,
  );

  assert.equal(spent, 200);
});

test("cartão usa a competência da fatura", () => {
  const spent = getCategoryBudgetSpent(
    [
      {
        amount: 150,
        billingMonthStart: "2026-09-01",
        category: "Lazer",
        date: "2026-08-20",
        type: "card",
      },
    ],
    "Lazer",
    9,
    2026,
  );

  assert.equal(spent, 150);
});

test("crédito de cartão reduz o consumo da categoria", () => {
  const spent = getCategoryBudgetSpent(
    [
      {
        amount: 200,
        billingMonthStart: "2026-09-01",
        category: "Outros",
        date: "2026-08-20",
        type: "card",
      },
      {
        amount: 50,
        billingMonthStart: "2026-09-01",
        category: "Outros",
        date: "2026-08-21",
        notes: "[card_credit_adjustment]",
        type: "card",
      },
    ],
    "Outros",
    9,
    2026,
  );

  assert.equal(spent, 150);
});

test("métricas distinguem atenção e estouro", () => {
  assert.equal(getCategoryBudgetMetrics(1000, 800, 80).status, "attention");
  assert.equal(getCategoryBudgetMetrics(1000, 1200, 80).status, "exceeded");
  assert.equal(getCategoryBudgetMetrics(1000, 1200, 80).exceededBy, 200);
});
