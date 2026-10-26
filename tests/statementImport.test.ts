import assert from "node:assert/strict";
import test from "node:test";

import {
  getCsvStatementTransaction,
  getSuggestedStatementMonth,
  isCardBillPayment,
  isInternalMovement,
  mapStatementTransaction,
} from "../lib/invoiceImport.ts";

const line = (description: string, amount: number, isCredit: boolean) => ({
  amount,
  date: "2026-10-20",
  description,
  isCredit,
});

test("statement debits become expenses with historical categories", () => {
  const mapped = mapStatementTransaction(
    line("Pix enviado - Padaria Pão Quente", 25, false),
    { "pix enviado padaria pao quente": "Alimentação" },
    {},
  );

  assert.equal(mapped.type, "expense");
  assert.equal(mapped.category, "Alimentação");
  assert.equal(mapped.installmentsTotal, 1);
  assert.equal(mapped.projectFutureInstallments, false);
  assert.equal(mapped.reviewStatus, undefined);
});

test("statement credits become income, with salary recognized", () => {
  assert.equal(
    mapStatementTransaction(line("CRED SALARIO EMPRESA X", 5000, true), {}, {}).category,
    "Salário",
  );
  assert.equal(
    mapStatementTransaction(line("Pix recebido - Maria", 80, true), {}, {}).category,
    "Outras Receitas",
  );
  assert.equal(
    mapStatementTransaction(
      line("Pix recebido - Cliente ABC", 900, true),
      {},
      { "pix recebido cliente abc": "Freelance" },
    ).category,
    "Freelance",
  );
});

test("card bill payments start ignored so they are not counted twice", () => {
  const mapped = mapStatementTransaction(
    line("Pagamento de fatura - Nubank", 1500, false),
    {},
    {},
  );

  assert.equal(mapped.reviewStatus, "ignored");
  assert.equal(mapped.reviewReason, "Pagamento de fatura");
  assert.equal(isCardBillPayment("PGTO FATURA CARTAO"), true);
  assert.equal(isCardBillPayment("Pix enviado - Fatima"), false);
});

test("transfers between own accounts and investments wait for review", () => {
  const mapped = mapStatementTransaction(line("Aplicação RDB", 300, false), {}, {});

  assert.equal(mapped.requiresReview, true);
  assert.equal(mapped.reviewStatus, undefined);
  assert.equal(isInternalMovement("Resgate CDB"), true);
  assert.equal(isInternalMovement("Transferência entre contas"), true);
  assert.equal(isInternalMovement("Pix enviado - Lucas Rdbetto"), false);
});

test("bank CSVs treat negative amounts as money out", () => {
  assert.deepEqual(
    getCsvStatementTransaction({ data: "20/10/2026", valor: "-45,90", descricao: "Uber" }),
    { amount: 45.9, date: "2026-10-20", description: "Uber", isCredit: false },
  );
  assert.equal(
    getCsvStatementTransaction({ data: "05/11/2026", valor: "5000.00", descricao: "Salário" })
      ?.isCredit,
    true,
  );
  assert.equal(getCsvStatementTransaction({ data: "", valor: "", descricao: "" }), null);
});

test("the suggested statement month is where most lines fall", () => {
  assert.equal(
    getSuggestedStatementMonth(["2026-10-30", "2026-11-03", "2026-11-05", "2026-11-20"]),
    "2026-11-01",
  );
  assert.equal(getSuggestedStatementMonth(["2026-09-28", "2026-10-02"]), "2026-10-01");
  assert.equal(getSuggestedStatementMonth([]), null);
});
