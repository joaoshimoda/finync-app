import Papa from "papaparse";

import { toDateOnly } from "./dateUtils.ts";
import { normalizeKey, parseAmount, type StatementTransaction } from "./invoiceImport.ts";

/* Reads the CSV that banks export for a card invoice or an account
   statement. Banks disagree on almost everything, so the reader works it
   out from the file: which line is the header (some put a title and
   account details above it), which columns hold the date, description and
   value, whether money in and out sit in one column, two columns or one
   column plus a D/C flag, and which lines are balances rather than
   transactions. Pure and offline. */

type ColumnRole = "date" | "description" | "amount" | "debit" | "credit" | "kind";

/* Header names seen in Brazilian bank exports, already normalized. */
const headerNames: Record<ColumnRole, string[]> = {
  date: [
    "date", "data", "data lancamento", "data de lancamento", "data da compra",
    "data compra", "data movimento", "data mov", "data transacao", "dt lancamento",
    "dia",
  ],
  description: [
    "title", "description", "descricao", "historico", "lancamento", "lancamentos",
    "estabelecimento", "detalhes", "detalhe", "memo", "identificacao",
    "descricao do lancamento", "nome", "transacao",
  ],
  amount: [
    "amount", "valor", "valor r", "valor rs", "valor em r", "valor brl", "montante",
    "quantia", "total", "preco",
  ],
  debit: ["debito", "debitos", "saida", "saidas", "valor debito", "debit"],
  credit: ["credito", "creditos", "entrada", "entradas", "valor credito", "credit"],
  kind: ["tipo", "d c", "dc", "natureza", "operacao", "tipo lancamento"],
};

/* Lines that report a balance or a total, not a transaction. */
const balancePattern =
  /^(?:saldo|s a l d o|total|subtotal|saldo anterior|saldo do dia|saldo final|saldo disponivel|limite)\b/;

const monthNames: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

function normalizeHeader(value: unknown) {
  return normalizeKey(String(value ?? ""))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchRole(header: string): ColumnRole | null {
  if (!header) return null;

  const roles: ColumnRole[] = ["date", "debit", "credit", "kind", "amount", "description"];
  for (const role of roles) {
    if (headerNames[role].includes(header)) return role;
  }
  /* "Valor (R$)", "Data do lançamento" and similar variations. */
  if (header.startsWith("data")) return "date";
  if (header.startsWith("valor")) return "amount";
  if (header.startsWith("descri") || header.startsWith("hist")) return "description";

  return null;
}

/* Dates as banks write them: 05/10/2026, 05/10/26, 2026-10-05, 05-10-2026,
   05.10.2026, 05 out 2026, and 05/10 with the year taken from the file. */
export function parseStatementDate(value: string, fallbackYear?: number) {
  const text = value.trim().toLowerCase();
  if (!text) return null;

  let day: number;
  let month: number;
  let year: number | undefined;

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const numeric = text.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?(?:\s|$|t)/);
  const named = text.match(/^(\d{1,2})\s*(?:de\s+)?([a-zç]{3})[a-zç]*\.?(?:\s*(?:de\s+)?(\d{2,4}))?/);

  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (numeric) {
    day = Number(numeric[1]);
    month = Number(numeric[2]);
    year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : undefined;
  } else if (named && monthNames[named[2].replace("ç", "c")]) {
    day = Number(named[1]);
    month = monthNames[named[2].replace("ç", "c")];
    year = named[3] ? Number(named[3].length === 2 ? `20${named[3]}` : named[3]) : undefined;
  } else {
    return null;
  }

  year ??= fallbackYear;
  if (!year || month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) {
    return null;
  }

  return toDateOnly(year, month, day);
}

function looksLikeAmount(value: string) {
  return /\d/.test(value) && /^[\s(R$+\-]*[\d.,]+[\s)]*(?:[DC-])?\s*$/i.test(value.trim());
}

type ColumnMap = Partial<Record<ColumnRole, number>>;

/* The header is the line, among the first ones, that names a date column
   and a value column; the more columns it names, the more likely. */
function findHeader(rows: string[][]) {
  let best: { index: number; columns: ColumnMap; score: number } | null = null;

  rows.slice(0, 40).forEach((row, index) => {
    const columns: ColumnMap = {};
    row.forEach((cell, column) => {
      const role = matchRole(normalizeHeader(cell));
      if (role && columns[role] === undefined) columns[role] = column;
    });

    const hasValue =
      columns.amount !== undefined || columns.debit !== undefined || columns.credit !== undefined;
    if (columns.date === undefined || !hasValue) return;

    const score = Object.keys(columns).length;
    if (!best || score > best.score) best = { index, columns, score };
  });

  return best as { index: number; columns: ColumnMap } | null;
}

/* Without a header, columns are told apart by what they hold: the one
   that is mostly dates, the one that is mostly amounts, and the longest
   text as the description. */
function inferColumns(rows: string[][]): ColumnMap | null {
  const sample = rows.slice(0, 50);
  const width = Math.max(0, ...sample.map((row) => row.length));
  const share = (test: (value: string) => boolean, column: number) =>
    sample.filter((row) => row[column] && test(row[column])).length / (sample.length || 1);

  let date = -1;
  let amount = -1;
  let description = -1;
  let bestDate = 0.5;
  let bestAmount = 0.5;
  let longest = 0;

  for (let column = 0; column < width; column += 1) {
    const dates = share((value) => parseStatementDate(value, 2000) !== null, column);
    if (dates > bestDate) [bestDate, date] = [dates, column];
  }
  for (let column = 0; column < width; column += 1) {
    if (column === date) continue;
    const amounts = share(looksLikeAmount, column);
    if (amounts > bestAmount) [bestAmount, amount] = [amounts, column];
  }
  for (let column = 0; column < width; column += 1) {
    if (column === date || column === amount) continue;
    const average =
      sample.reduce((total, row) => total + (row[column]?.trim().length ?? 0), 0) /
      (sample.length || 1);
    if (average > longest) [longest, description] = [average, column];
  }

  return date >= 0 && amount >= 0
    ? { date, amount, ...(description >= 0 ? { description } : {}) }
    : null;
}

/* "D", "Débito", "Saída" mean money out; "C", "Crédito", "Entrada" money in. */
function readKind(value: string): "out" | "in" | null {
  const kind = normalizeKey(value);
  if (/^(d|deb|debito|saida|debit|-)$/.test(kind)) return "out";
  if (/^(c|cred|credito|entrada|credit|\+)$/.test(kind)) return "in";
  return null;
}

/* A signed amount from the account's point of view (negative is money
   out), or null when the row has no value. `explicit` says the sign came
   from a D/C flag or from separate columns rather than a minus sign. */
function readSignedAmount(row: string[], columns: ColumnMap) {
  const cell = (role: ColumnRole) =>
    columns[role] === undefined ? "" : (row[columns[role]!] ?? "").trim();

  const debit = parseAmount(cell("debit"));
  const credit = parseAmount(cell("credit"));
  if (debit.amount || credit.amount) {
    return { explicit: true, value: credit.amount - debit.amount };
  }

  const raw = cell("amount");
  const parsed = parseAmount(raw);
  if (!parsed.amount) return null;

  const trailingFlag = raw.match(/\s([DC])\s*$/i)?.[1]?.toUpperCase();
  const kind = readKind(cell("kind")) ?? (trailingFlag === "D" ? "out" : trailingFlag === "C" ? "in" : null);
  if (kind) {
    return { explicit: true, value: kind === "out" ? -parsed.amount : parsed.amount };
  }

  return { explicit: false, value: parsed.isNegative ? -parsed.amount : parsed.amount };
}

export type CsvStatementResult = {
  transactions: StatementTransaction[];
  /* True when money in and out were told apart by columns or a D/C flag
     instead of the sign alone. */
  hasExplicitDirection: boolean;
};

export function parseCsvStatement(text: string, fallbackYear?: number): CsvStatementResult {
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    delimitersToGuess: [",", ";", "\t", "|"],
    skipEmptyLines: "greedy",
  });
  const rows = parsed.data.filter((row) => row.some((cell) => String(cell ?? "").trim()));
  const header = findHeader(rows);
  const columns = header?.columns ?? inferColumns(rows);

  if (!columns || columns.date === undefined) {
    return { transactions: [], hasExplicitDirection: false };
  }

  const year = fallbackYear ?? new Date().getFullYear();
  const transactions: StatementTransaction[] = [];
  let explicitCount = 0;

  rows.slice(header ? header.index + 1 : 0).forEach((row) => {
    const date = parseStatementDate(row[columns.date!] ?? "", year);
    const description =
      columns.description === undefined
        ? ""
        : String(row[columns.description] ?? "").replace(/\s+/g, " ").trim();

    if (!date || balancePattern.test(normalizeHeader(description))) return;

    const signed = readSignedAmount(row, columns);
    if (!signed || !signed.value) return;
    if (signed.explicit) explicitCount += 1;

    transactions.push({
      amount: Math.abs(signed.value),
      date,
      description: description || "Sem descrição",
      isCredit: signed.value > 0,
    });
  });

  return {
    transactions,
    hasExplicitDirection: transactions.length > 0 && explicitCount === transactions.length,
  };
}
