import assert from "node:assert/strict";
import test from "node:test";

import { getDependentSettlementSummary } from "../lib/dependentSettlements.ts";

test("acerto parcial reduz o valor a receber", () => {
  const summary = getDependentSettlementSummary(
    [
      { amount: 300, type: "card", dependentId: "dependent-1" },
      { amount: 100, type: "fixed", dependentId: "dependent-1" },
    ],
    [
      {
        amount: 150,
        dependentId: "dependent-1",
        status: "confirmed",
      },
    ],
    "dependent-1",
  );

  assert.equal(summary.obligationTotal, 400);
  assert.equal(summary.settledTotal, 150);
  assert.equal(summary.outstanding, 250);
  assert.equal(summary.progress, 37.5);
});

test("estorno do cartão reduz a obrigação do dependente", () => {
  const summary = getDependentSettlementSummary(
    [
      { amount: 300, type: "card", dependentId: "dependent-1" },
      {
        amount: 50,
        type: "card",
        dependentId: "dependent-1",
        notes: "[card_credit_adjustment]",
      },
    ],
    [],
    "dependent-1",
  );

  assert.equal(summary.obligationTotal, 250);
  assert.equal(summary.outstanding, 250);
});

test("acerto cancelado não reduz o valor a receber", () => {
  const summary = getDependentSettlementSummary(
    [{ amount: 200, type: "fixed", dependentId: "dependent-1" }],
    [{ amount: 200, dependentId: "dependent-1", status: "voided" }],
    "dependent-1",
  );

  assert.equal(summary.settledTotal, 0);
  assert.equal(summary.outstanding, 200);
});

test("valor a receber nunca fica negativo", () => {
  const summary = getDependentSettlementSummary(
    [{ amount: 100, type: "fixed", dependentId: "dependent-1" }],
    [{ amount: 100, dependentId: "dependent-1", status: "confirmed" }],
    "dependent-1",
  );

  assert.equal(summary.outstanding, 0);
  assert.equal(summary.progress, 100);
});
