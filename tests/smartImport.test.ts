import assert from "node:assert/strict";
import test from "node:test";

import { parseCsvStatement, parseStatementDate } from "../lib/invoiceCsv.ts";
import {
  applyCleanNames,
  mapPdfTransaction,
  mapStatementTransaction,
  orientCardTransactions,
  parseInstallment,
} from "../lib/invoiceImport.ts";
import { decodeOfxBytes } from "../lib/invoiceOfx.ts";
import {
  analyzePdfInvoiceLines,
  mergeWrappedLines,
  splitSideBySideTransactions,
} from "../lib/invoicePdf.ts";
import { cleanMerchantName, guessCategory } from "../lib/merchantRules.ts";

/* CSV ----------------------------------------------------------------------- */

test("CSV with account details above the header", () => {
  const text = [
    "Extrato de conta corrente",
    "Agência: 1234;Conta: 56789-0",
    "",
    "Data;Lançamento;Valor (R$);Saldo (R$)",
    "01/10/2026;SALDO ANTERIOR;;1.000,00",
    "02/10/2026;PIX ENVIADO JOAO;-50,00;950,00",
    "05/10/2026;SALARIO ACME;5.200,00;6.150,00",
    "05/10/2026;S A L D O;;6.150,00",
  ].join("\n");
  const { transactions } = parseCsvStatement(text, 2026);

  assert.deepEqual(transactions, [
    { amount: 50, date: "2026-10-02", description: "PIX ENVIADO JOAO", isCredit: false },
    { amount: 5200, date: "2026-10-05", description: "SALARIO ACME", isCredit: true },
  ]);
});

test("CSV with separate debit and credit columns", () => {
  const text = [
    "Data,Histórico,Débito,Crédito",
    "03/10/2026,Supermercado,\"212,35\",",
    "04/10/2026,Pix recebido,,\"80,00\"",
  ].join("\n");
  const result = parseCsvStatement(text, 2026);

  assert.equal(result.hasExplicitDirection, true);
  assert.deepEqual(
    result.transactions.map((row) => [row.description, row.amount, row.isCredit]),
    [
      ["Supermercado", 212.35, false],
      ["Pix recebido", 80, true],
    ],
  );
});

test("CSV with a D/C column or a trailing D/C flag", () => {
  const flagColumn = parseCsvStatement(
    ["data;descricao;valor;tipo", "03/10/2026;Farmacia;45,90;D", "04/10/2026;Estorno;10,00;C"].join("\n"),
    2026,
  );
  assert.deepEqual(flagColumn.transactions.map((row) => row.isCredit), [false, true]);

  const trailing = parseCsvStatement(
    ["data;descricao;valor", "03/10/2026;Farmacia;45,90 D", "04/10/2026;Estorno;10,00 C"].join("\n"),
    2026,
  );
  assert.deepEqual(trailing.transactions.map((row) => row.isCredit), [false, true]);
});

test("CSV without a header is read by what its columns hold", () => {
  const { transactions } = parseCsvStatement(
    ["05/10/2026;UBER TRIP;-18,40", "06/10/2026;PADARIA CENTRAL;-12,00"].join("\n"),
    2026,
  );

  assert.deepEqual(
    transactions.map((row) => [row.date, row.description, row.amount]),
    [
      ["2026-10-05", "UBER TRIP", 18.4],
      ["2026-10-06", "PADARIA CENTRAL", 12],
    ],
  );
});

test("Nubank card CSV keeps purchases as purchases", () => {
  const { transactions, hasExplicitDirection } = parseCsvStatement(
    [
      "date,title,amount",
      "2026-10-03,Mercado Livre - Parcela 2/5,89.90",
      "2026-10-04,Netflix,39.90",
      "2026-10-09,Pagamento recebido,-1850.00",
    ].join("\n"),
    2026,
  );
  const oriented = hasExplicitDirection
    ? transactions
    : orientCardTransactions(transactions, true);

  assert.deepEqual(oriented.map((row) => row.isCredit), [false, false, true]);
});

test("card files with purchases written as negative are also understood", () => {
  const oriented = orientCardTransactions(
    [
      { amount: 10, date: "2026-10-01", description: "A", isCredit: false },
      { amount: 20, date: "2026-10-02", description: "B", isCredit: false },
      { amount: 5, date: "2026-10-03", description: "Estorno", isCredit: true },
    ],
    true,
  );

  assert.deepEqual(oriented.map((row) => row.isCredit), [false, false, true]);
});

test("CSV saved in Windows-1252 keeps its accents", () => {
  /* "Data;Descrição;Valor\n03/10/2026;Açaí;-10,00" in Windows-1252. */
  const bytes = new Uint8Array([
    ...Buffer.from("Data;Descri", "latin1"), 0xe7, 0xe3, ...Buffer.from("o;Valor\n03/10/2026;A", "latin1"),
    0xe7, 0x61, 0xed, ...Buffer.from(";-10,00", "latin1"),
  ]);
  const { transactions } = parseCsvStatement(decodeOfxBytes(bytes), 2026);

  assert.equal(transactions[0].description, "Açaí");
});

test("statement dates in the formats banks use", () => {
  assert.equal(parseStatementDate("05/10/2026"), "2026-10-05");
  assert.equal(parseStatementDate("05/10/26"), "2026-10-05");
  assert.equal(parseStatementDate("2026-10-05T10:00:00"), "2026-10-05");
  assert.equal(parseStatementDate("05-10-2026"), "2026-10-05");
  assert.equal(parseStatementDate("05.10.2026"), "2026-10-05");
  assert.equal(parseStatementDate("05 out 2026"), "2026-10-05");
  assert.equal(parseStatementDate("05 de outubro de 2026"), "2026-10-05");
  assert.equal(parseStatementDate("05/10", 2026), "2026-10-05");
  assert.equal(parseStatementDate("31/02/2026"), null);
  assert.equal(parseStatementDate("Saldo"), null);
});

/* Installments ------------------------------------------------------------- */

test("installments written the ways invoices write them", () => {
  assert.deepEqual(parseInstallment("LOJA PARC 02/05"), {
    cleanDescription: "LOJA",
    installmentNumber: 2,
    installmentsTotal: 5,
  });
  assert.deepEqual(parseInstallment("Loja Parcela 2 de 5"), {
    cleanDescription: "Loja",
    installmentNumber: 2,
    installmentsTotal: 5,
  });
  assert.equal(parseInstallment("Restaurante 2 de 5").installmentsTotal, 1);
  assert.equal(parseInstallment("Renner - Parcela 2/4").cleanDescription, "Renner");
});

/* Categories and names ----------------------------------------------------- */

test("categories are guessed for well-known merchants", () => {
  assert.equal(guessCategory("IFD*IFOOD RESTAURANTES", "expense"), "Alimentação");
  assert.equal(guessCategory("UBER *TRIP HELP.UBER.COM", "expense"), "Transporte");
  assert.equal(guessCategory("NETFLIX.COM", "expense"), "Lazer");
  assert.equal(guessCategory("DROGASIL 123", "expense"), "Saúde");
  assert.equal(guessCategory("PIX IMOBILIARIA CENTRO ALUGUEL", "expense"), "Moradia");
  assert.equal(guessCategory("MERCADOLIVRE*LOJAX", "expense"), null);
  assert.equal(guessCategory("RENDIMENTO POUPANCA", "income"), "Investimentos");
  /* Never a category the user no longer has. */
  assert.equal(guessCategory("NETFLIX.COM", "expense", ["Alimentação", "Outros"]), null);
});

test("the guess fills in only when there is no history", () => {
  const line = { amount: 30, date: "2026-10-05", description: "IFD*IFOOD", isCredit: false };

  assert.equal(mapPdfTransaction(line, {}, ["Alimentação"])?.category, "Alimentação");
  assert.equal(
    mapPdfTransaction(line, { "ifd ifood": "Lazer" }, ["Alimentação", "Lazer"])?.category,
    "Lazer",
  );
  assert.equal(mapPdfTransaction(line, {})?.category, "Outros");
  assert.equal(
    mapStatementTransaction({ ...line, description: "UBER TRIP" }, {}, {}, ["Transporte"]).category,
    "Transporte",
  );
});

test("merchant names are cleaned, and nice names are left alone", () => {
  assert.equal(cleanMerchantName("IFD*IFOOD RESTAURANTES"), "iFood");
  assert.equal(cleanMerchantName("UBER *TRIP HELP.UBER.COM"), "Uber");
  assert.equal(cleanMerchantName("PAG*JOSEFINA PADARIA LTDA"), "Josefina Padaria");
  assert.equal(cleanMerchantName("PIX ENVIADO MARIA SOUZA"), "Pix para Maria Souza");
  assert.equal(cleanMerchantName("PIX RECEBIDO JOAO DA SILVA"), "Pix de Joao da Silva");
  assert.equal(cleanMerchantName("COMPRA DEBITO SUPERMERCADO BOM PRECO"), "Supermercado Bom Preco");
  assert.equal(cleanMerchantName("Padaria do Bairro"), null);
  assert.equal(cleanMerchantName("Netflix"), null);
});

test("clean names keep the bank text so they can be undone", () => {
  const [row] = applyCleanNames([
    mapStatementTransaction(
      { amount: 18.4, date: "2026-10-05", description: "UBER *TRIP HELP.UBER.COM", isCredit: false },
      {},
      {},
    ),
  ]);

  assert.equal(row.description, "Uber");
  assert.equal(row.originalDescription, "UBER *TRIP HELP.UBER.COM");
});

/* PDF ----------------------------------------------------------------------- */

test("two-column invoices are split into one line per transaction", () => {
  assert.deepEqual(
    splitSideBySideTransactions("05/10 LOJA A 10,00 06/10 LOJA B 20,00"),
    ["05/10 LOJA A 10,00", "06/10 LOJA B 20,00"],
  );
  assert.deepEqual(splitSideBySideTransactions("05/10 LOJA 02/05 89,90"), [
    "05/10 LOJA 02/05 89,90",
  ]);
});

test("descriptions that wrap to the next line are joined", () => {
  assert.deepEqual(
    mergeWrappedLines(["05/10 RESTAURANTE MUITO", "BOM DO CENTRO 89,90", "06/10 LOJA 10,00"]),
    ["05/10 RESTAURANTE MUITO BOM DO CENTRO 89,90", "06/10 LOJA 10,00"],
  );
});

test("PDF lines read credits marked with C and dates written in full", () => {
  const { transactions } = analyzePdfInvoiceLines(
    ["05 de outubro LOJA X 120,00", "06/10 AJUSTE LOJA 15,00 C", "07 OUT CASHBACK 3,00"],
    "2026-10-01",
  );

  assert.deepEqual(
    transactions.map((row) => [row.date, row.description, row.isCredit]),
    [
      ["2026-10-05", "LOJA X", false],
      ["2026-10-06", "AJUSTE LOJA", true],
      ["2026-10-07", "CASHBACK", true],
    ],
  );
});
