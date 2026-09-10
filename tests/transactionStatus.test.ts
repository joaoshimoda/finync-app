import assert from "node:assert/strict";
import test from "node:test";

import {
  fromDbTransactionStatus,
  getCanonicalTransactionStatus,
  getTransactionStatusPresentation,
  toDbTransactionStatus,
} from "../lib/transactionStatus.ts";

test("converte status somente na fronteira com o banco", () => {
  assert.equal(toDbTransactionStatus("pending"), "PENDENTE");
  assert.equal(toDbTransactionStatus("confirmed"), "CONFIRMADO");
  assert.equal(toDbTransactionStatus("paid"), "PAGO");
  assert.equal(fromDbTransactionStatus("PENDENTE"), "pending");
  assert.equal(fromDbTransactionStatus("CONFIRMADO"), "confirmed");
  assert.equal(fromDbTransactionStatus("PAGO"), "paid");
});

test("assinatura futura fica pendente e vira confirmada no dia da cobranca", () => {
  const subscription = {
    type: "card" as const,
    is_recurring: true,
    cardId: "card-1",
    status: "paid" as const,
  };

  assert.equal(
    getCanonicalTransactionStatus(
      { ...subscription, date: "2026-09-11" },
      "2026-09-10",
    ),
    "pending",
  );
  assert.equal(
    getCanonicalTransactionStatus(
      { ...subscription, date: "2026-09-10" },
      "2026-09-10",
    ),
    "confirmed",
  );
});

test("compra de cartao nunca usa status pago da transacao", () => {
  assert.equal(
    getCanonicalTransactionStatus({
      type: "card",
      is_recurring: false,
      date: "2026-09-10",
      status: "paid",
    }),
    "confirmed",
  );
});

test("somente conta fixa recorrente aceita baixa manual", () => {
  assert.equal(
    getCanonicalTransactionStatus({
      type: "fixed",
      is_recurring: true,
      status: "paid",
    }),
    "paid",
  );
  assert.equal(
    getCanonicalTransactionStatus({
      type: "fixed",
      is_recurring: false,
      status: "paid",
    }),
    "confirmed",
  );
});

test("renda variavel prevista permanece pendente ate confirmacao", () => {
  assert.equal(
    getCanonicalTransactionStatus({
      type: "income",
      status: "pending",
      notes: "[variable_income]",
    }),
    "pending",
  );
  assert.equal(
    getCanonicalTransactionStatus({
      type: "income",
      status: "pending",
      notes: "Salario",
    }),
    "confirmed",
  );
});

test("apresentacao diferencia fatura, renda e conta fixa", () => {
  assert.equal(
    getTransactionStatusPresentation({
      type: "card",
      status: "confirmed",
    }).label,
    "Na fatura",
  );
  assert.equal(
    getTransactionStatusPresentation({
      type: "income",
      status: "confirmed",
    }).label,
    "Recebida",
  );
  assert.equal(
    getTransactionStatusPresentation({
      type: "fixed",
      status: "paid",
    }).label,
    "Pago",
  );
});
