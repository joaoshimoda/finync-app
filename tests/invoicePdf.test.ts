import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzePdfInvoiceLines,
  parsePdfInvoiceLines,
} from "../lib/invoicePdf.ts";

test("lê linhas comuns de uma fatura Nubank e identifica parcelas", () => {
  const transactions = parsePdfInvoiceLines(
    [
      "03 JUN UBER *TRIP 02/03 R$ 25,90",
      "15 JUN SUPERMERCADO CENTRAL R$ 184,32",
      "20 JUN Pagamento recebido -R$ 500,00",
    ],
    "2026-06-01",
  );

  assert.deepEqual(transactions, [
    {
      amount: 25.9,
      date: "2026-06-03",
      description: "UBER *TRIP 02/03",
      isCredit: false,
    },
    {
      amount: 184.32,
      date: "2026-06-15",
      description: "SUPERMERCADO CENTRAL",
      isCredit: false,
    },
  ]);
});

test("lê datas completas e estornos de uma fatura Inter", () => {
  const transactions = parsePdfInvoiceLines(
    [
      "05/08/2026 POSTO AVENIDA R$ 210,00",
      "07/08/2026 Estorno Loja Online R$ 49,99",
      "08/08/2026 Total da fatura R$ 259,99",
    ],
    "2026-08-01",
  );

  assert.deepEqual(transactions, [
    {
      amount: 210,
      date: "2026-08-05",
      description: "POSTO AVENIDA",
      isCredit: false,
    },
    {
      amount: 49.99,
      date: "2026-08-07",
      description: "Estorno Loja Online",
      isCredit: true,
    },
  ]);
});

test("infere o ano anterior quando a fatura de janeiro contém compra de dezembro", () => {
  const transactions = parsePdfInvoiceLines(
    ["29 DEZ RESTAURANTE R$ 72,00"],
    "2027-01-01",
  );

  assert.equal(transactions[0]?.date, "2026-12-29");
});

test("separa uma linha incompleta para correção manual", () => {
  const result = analyzePdfInvoiceLines(
    ["12/08 COMPRA SEM VALOR", "Total da fatura R$ 100,00"],
    "2026-08-01",
  );

  assert.equal(result.transactions.length, 0);
  assert.deepEqual(result.rejectedLines, [
    {
      amount: null,
      date: "2026-08-12",
      description: "COMPRA SEM VALOR",
      isCredit: false,
      raw: "12/08 COMPRA SEM VALOR",
      reason: "Não foi possível identificar: valor.",
    },
  ]);
});
