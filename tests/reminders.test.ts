import assert from "node:assert/strict";
import test from "node:test";

import { describeDueDay, getDueReminders, getWeekKey } from "../lib/reminders.ts";

const cardNamesById = new Map([["card-1", "Nubank"]]);

function invoice(overrides: Partial<Parameters<typeof getDueReminders>[0]["invoices"][number]>) {
  return {
    id: "inv-1",
    cardId: "card-1",
    dueDate: "2026-10-26",
    status: "closed",
    totalAmount: 500,
    paidAmount: 0,
    ...overrides,
  };
}

function bill(overrides: Partial<Parameters<typeof getDueReminders>[0]["transactions"][number]>) {
  return {
    id: "tx-1",
    description: "Internet",
    amount: 120,
    date: "2026-10-25",
    type: "fixed" as const,
    status: "pending" as const,
    ...overrides,
  };
}

test("lembra faturas em aberto e contas pendentes dentro da janela", () => {
  const reminders = getDueReminders({
    invoices: [invoice({ paidAmount: 200 })],
    transactions: [bill({})],
    cardNamesById,
    today: "2026-10-24",
  });

  assert.deepEqual(
    reminders.map(({ id, label, amount, daysUntil }) => ({ id, label, amount, daysUntil })),
    [
      { id: "bill:tx-1", label: "Internet", amount: 120, daysUntil: 1 },
      { id: "invoice:inv-1", label: "Fatura Nubank", amount: 300, daysUntil: 2 },
    ],
  );
});

test("ignora faturas pagas, contas quitadas e outros tipos", () => {
  const reminders = getDueReminders({
    invoices: [
      invoice({ id: "paid", status: "paid" }),
      invoice({ id: "settled", paidAmount: 500 }),
    ],
    transactions: [
      bill({ id: "paid", status: "paid" }),
      bill({ id: "card", type: "card" }),
      bill({ id: "income", type: "income" }),
    ],
    cardNamesById,
    today: "2026-10-24",
  });

  assert.equal(reminders.length, 0);
});

test("respeita os limites da janela, inclusive na virada de mês", () => {
  const reminders = getDueReminders({
    invoices: [
      invoice({ id: "far", dueDate: "2026-11-04" }),
      invoice({ id: "edge", dueDate: "2026-11-02" }),
    ],
    transactions: [
      bill({ id: "old", date: "2026-10-22" }),
      bill({ id: "too-old", date: "2026-10-21" }),
    ],
    cardNamesById,
    today: "2026-10-30",
    daysAhead: 3,
    overdueDays: 8,
  });

  assert.deepEqual(
    reminders.map((reminder) => [reminder.id, reminder.daysUntil]),
    [
      ["bill:old", -8],
      ["invoice:edge", 3],
    ],
  );
});

test("descreve o prazo em português", () => {
  assert.equal(describeDueDay(-3), "venceu há 3 dias");
  assert.equal(describeDueDay(-1), "venceu ontem");
  assert.equal(describeDueDay(0), "vence hoje");
  assert.equal(describeDueDay(1), "vence amanhã");
  assert.equal(describeDueDay(4), "vence em 4 dias");
});

test("agrupa a semana pela segunda-feira", () => {
  assert.equal(getWeekKey("2026-10-26"), "2026-10-26");
  assert.equal(getWeekKey("2026-11-01"), "2026-10-26");
  assert.equal(getWeekKey("2026-10-25"), "2026-10-19");
});
