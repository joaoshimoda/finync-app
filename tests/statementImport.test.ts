import assert from "node:assert/strict";
import test from "node:test";

import { parseCsvStatement } from "../lib/invoiceCsv.ts";
import {
  applyLearnedNames,
  getImportNote,
  getImportSignatureForSource,
  getOriginalDescriptionFromNote,
  getSuggestedStatementMonth,
  renameTransaction,
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
  const { transactions } = parseCsvStatement(
    ["data,valor,descricao", "20/10/2026,-45.90,Uber", "05/11/2026,5000.00,Salário", ",,"].join("\n"),
    2026,
  );

  assert.deepEqual(transactions, [
    { amount: 45.9, date: "2026-10-20", description: "Uber", isCredit: false },
    { amount: 5000, date: "2026-11-05", description: "Salário", isCredit: true },
  ]);
});

test("renaming keeps the file's name and an empty name restores it", () => {
  const source = mapStatementTransaction(line("PAG*JOSEFINA LTDA", 12, false), {}, {});
  const renamed = renameTransaction(source, "Padaria Josefina");

  assert.equal(renamed.description, "Padaria Josefina");
  assert.equal(renamed.originalDescription, "PAG*JOSEFINA LTDA");
  assert.equal(
    renameTransaction(renamed, "Padaria da esquina").originalDescription,
    "PAG*JOSEFINA LTDA",
  );

  const restored = renameTransaction(renamed, "  ");
  assert.equal(restored.description, "PAG*JOSEFINA LTDA");
  assert.equal(restored.originalDescription, undefined);
});

test("the import note carries the original name and is read back", () => {
  const renamed = renameTransaction(
    mapStatementTransaction(line("PAG*JOSEFINA LTDA", 12, false), {}, {}),
    "Padaria Josefina",
  );
  const note = getImportNote("extrato.ofx", renamed);

  assert.equal(note, "Importado de extrato.ofx · nome original: PAG*JOSEFINA LTDA");
  assert.equal(getOriginalDescriptionFromNote(note), "PAG*JOSEFINA LTDA");
  assert.equal(getImportNote("extrato.ofx", { description: "Uber" }), "Importado de extrato.ofx");
  assert.equal(getOriginalDescriptionFromNote("Importado de extrato.ofx"), null);
});

test("names learned from earlier imports are applied to new lines", () => {
  const [learned, untouched] = applyLearnedNames(
    [
      mapStatementTransaction(line("PAG*JOSEFINA LTDA", 12, false), {}, {}),
      mapStatementTransaction(line("Uber", 20, false), {}, {}),
    ],
    { "pag josefina ltda": "Padaria Josefina" },
  );

  assert.equal(learned.description, "Padaria Josefina");
  assert.equal(learned.originalDescription, "PAG*JOSEFINA LTDA");
  assert.equal(untouched.description, "Uber");
  assert.equal(untouched.originalDescription, undefined);
});

test("duplicate signatures ignore the name the user typed", () => {
  const base = {
    month_start: "2026-10-01",
    transaction_date: "2026-10-20",
    description: "Padaria Josefina",
    amount: 12,
  };

  assert.equal(
    getImportSignatureForSource(base, "PAG*JOSEFINA LTDA"),
    getImportSignatureForSource({ ...base, description: "PAG*JOSEFINA LTDA" }, undefined),
  );
});

test("the suggested statement month is where most lines fall", () => {
  assert.equal(
    getSuggestedStatementMonth(["2026-10-30", "2026-11-03", "2026-11-05", "2026-11-20"]),
    "2026-11-01",
  );
  assert.equal(getSuggestedStatementMonth(["2026-09-28", "2026-10-02"]), "2026-10-01");
  assert.equal(getSuggestedStatementMonth([]), null);
});
