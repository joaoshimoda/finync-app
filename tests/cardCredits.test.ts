import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCardDebt,
  getCardSignedAmount,
  shouldCountCardCharge,
} from "../lib/cardCredits.ts";

test("assinatura futura nao entra na fatura atual", () => {
  assert.equal(
    shouldCountCardCharge(
      {
        type: "card",
        is_recurring: true,
        date: "2026-08-21",
        status: "pending",
      },
      "2026-08-20",
    ),
    false,
  );
});

test("assinatura entra na fatura ao atingir o dia da cobranca", () => {
  assert.equal(
    shouldCountCardCharge(
      {
        type: "card",
        is_recurring: true,
        date: "2026-08-20",
        status: "pending",
      },
      "2026-08-20",
    ),
    true,
  );
});

test("parcelas nao usam a trava temporal exclusiva de assinaturas", () => {
  assert.equal(
    shouldCountCardCharge(
      {
        type: "card",
        is_recurring: false,
        date: "2026-08-21",
        status: "confirmed",
      },
      "2026-08-20",
    ),
    true,
  );
});

test("pagamentos da fatura e estornos reduzem o total sem alterar compras", () => {
  const transactions = [
    {
      type: "card",
      cardId: "card-1",
      amount: 300,
      status: "confirmed",
      date: "2026-08-10",
      notes: "",
    },
    {
      type: "card",
      cardId: "card-1",
      amount: 100,
      status: "confirmed",
      date: "2026-08-10",
      notes: "",
    },
    {
      type: "card",
      cardId: "card-1",
      amount: 50,
      status: "confirmed",
      date: "2026-08-10",
      notes: "[card_credit_adjustment]",
    },
  ];

  assert.equal(getCardSignedAmount(transactions[2]), -50);
  assert.equal(calculateCardDebt(transactions, "card-1", 100), 250);
});

test("pagamentos da fatura reduzem a divida sem alterar as compras", () => {
  const transactions = [
    {
      type: "card",
      cardId: "card-1",
      amount: 300,
      status: "confirmed",
      date: "2026-08-10",
      notes: "",
    },
  ];

  assert.equal(calculateCardDebt(transactions, "card-1", 125), 175);
});
