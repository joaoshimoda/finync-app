export type PdfInvoiceBank = "nubank" | "inter" | "generic";

export type PdfInvoiceTransaction = {
  amount: number;
  date: string;
  description: string;
  isCredit: boolean;
};

export type PdfInvoiceResult = {
  bank: PdfInvoiceBank;
  rejectedLines: PdfRejectedInvoiceLine[];
  totalPages: number;
  transactions: PdfInvoiceTransaction[];
};

export type PdfRejectedInvoiceLine = {
  amount: number | null;
  date: string | null;
  description: string;
  isCredit: boolean;
  raw: string;
  reason: string;
};

type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
};

const monthNumbers: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

const ignoredLineIndicators = [
  "compras nacionais",
  "data descricao valor",
  "data estabelecimento valor",
  "encargos e servicos",
  "limite disponivel",
  "limite total",
  "melhor dia de compra",
  "pagamento recebido",
  "pagamento de fatura",
  "resumo da fatura",
  "saldo anterior",
  "total da fatura",
  "valor da fatura",
  "vencimento",
];

const dateAtStartPattern =
  /^\s*(\d{1,2})(?:[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?|\s+(jan(?:eiro)?|fev(?:ereiro)?|mar(?:co|ço)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?))\b[\s,.-]*/i;
const amountAtEndPattern =
  /(?:R\$\s*)?(-?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}\s*-?)(?:\s*[DC])?\s*$/i;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function detectBank(text: string): PdfInvoiceBank {
  const normalized = normalizeText(text);

  if (normalized.includes("nubank") || normalized.includes("nu pagamentos")) {
    return "nubank";
  }

  if (
    normalized.includes("banco inter") ||
    normalized.includes("inter pagamentos")
  ) {
    return "inter";
  }

  return "generic";
}

function parseBrazilianAmount(value: string) {
  const isNegative = value.includes("-");
  const amount = Number(
    value
      .replace(/[^\d,.]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

  return { amount, isNegative };
}

function resolveDate(
  match: RegExpMatchArray,
  referenceMonth: string,
): string | null {
  const [referenceYear, referenceMonthNumber] = referenceMonth
    .slice(0, 10)
    .split("-")
    .map(Number);
  const reference = { month: referenceMonthNumber, year: referenceYear };
  const day = Number(match[1]);
  const numericMonth = match[2] ? Number(match[2]) : null;
  const namedMonth = match[4]
    ? monthNumbers[normalizeText(match[4]).replace("ç", "c")]
    : null;
  const month = numericMonth ?? namedMonth ?? reference.month;
  let year = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : reference.year;

  if (!match[3]) {
    if (month - reference.month > 6) year -= 1;
    if (reference.month - month > 6) year += 1;
  }

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    day < 1 ||
    day > new Date(year, month, 0).getDate() ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseTransactionLine(
  line: string,
  referenceMonth: string,
): PdfInvoiceTransaction | null {
  const dateMatch = line.match(dateAtStartPattern);
  const amountMatch = line.match(amountAtEndPattern);

  if (!dateMatch || !amountMatch) return null;

  const date = resolveDate(dateMatch, referenceMonth);
  if (!date) return null;

  const description = line
    .slice(dateMatch[0].length, amountMatch.index)
    .replace(/\s+/g, " ")
    .replace(/[·|]+$/g, "")
    .trim();
  const normalizedDescription = normalizeText(description);

  if (
    !description ||
    ignoredLineIndicators.some((indicator) =>
      normalizedDescription.includes(indicator),
    )
  ) {
    return null;
  }

  const parsedAmount = parseBrazilianAmount(amountMatch[1]);
  if (!Number.isFinite(parsedAmount.amount) || parsedAmount.amount <= 0) {
    return null;
  }

  const isCredit =
    parsedAmount.isNegative ||
    /\b(estorno|credito|crédito|devolucao|devolução)\b/i.test(description);

  return {
    amount: Math.abs(parsedAmount.amount),
    date,
    description,
    isCredit,
  };
}

function isIgnoredInvoiceLine(line: string) {
  const normalized = normalizeText(line);
  return ignoredLineIndicators.some((indicator) =>
    normalized.includes(indicator),
  );
}

function getRejectedLine(
  line: string,
  referenceMonth: string,
): PdfRejectedInvoiceLine | null {
  if (isIgnoredInvoiceLine(line)) return null;

  const dateMatch = line.match(dateAtStartPattern);
  const amountMatch = line.match(amountAtEndPattern);
  if (!dateMatch && !amountMatch) return null;

  const date = dateMatch ? resolveDate(dateMatch, referenceMonth) : null;
  const parsedAmount = amountMatch
    ? parseBrazilianAmount(amountMatch[1])
    : { amount: Number.NaN, isNegative: false };
  const amount =
    Number.isFinite(parsedAmount.amount) && parsedAmount.amount > 0
      ? Math.abs(parsedAmount.amount)
      : null;
  const descriptionStart = dateMatch?.[0].length ?? 0;
  const descriptionEnd = amountMatch?.index ?? line.length;
  const description = line
    .slice(descriptionStart, descriptionEnd)
    .replace(/\s+/g, " ")
    .trim();
  const missing = [
    !date ? "data" : null,
    !description ? "descrição" : null,
    !amount ? "valor" : null,
  ].filter(Boolean);

  return {
    amount,
    date,
    description,
    isCredit:
      parsedAmount.isNegative ||
      /\b(estorno|credito|crédito|devolucao|devolução)\b/i.test(description),
    raw: line,
    reason: missing.length
      ? `Não foi possível identificar: ${missing.join(", ")}.`
      : "A linha não corresponde ao formato esperado da fatura.",
  };
}

export function parsePdfInvoiceLines(lines: string[], referenceMonth: string) {
  return analyzePdfInvoiceLines(lines, referenceMonth).transactions;
}

export function analyzePdfInvoiceLines(
  lines: string[],
  referenceMonth: string,
) {
  const transactions: PdfInvoiceTransaction[] = [];
  const rejectedLines: PdfRejectedInvoiceLine[] = [];

  for (const line of lines) {
    const transaction = parseTransactionLine(line, referenceMonth);
    if (transaction) {
      transactions.push(transaction);
      continue;
    }

    const rejected = getRejectedLine(line, referenceMonth);
    if (rejected) rejectedLines.push(rejected);
  }

  return { rejectedLines, transactions };
}

function groupItemsIntoLines(pages: PositionedTextItem[][]) {
  return pages.flatMap((items) => {
    const rows: Array<{ y: number; items: PositionedTextItem[] }> = [];

    for (const item of items) {
      const text = item.str.trim();
      if (!text) continue;

      const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
      if (row) {
        row.items.push(item);
      } else {
        rows.push({ y: item.y, items: [item] });
      }
    }

    return rows
      .sort((a, b) => b.y - a.y)
      .map((row) =>
        row.items
          .sort((a, b) => a.x - b.x)
          .map((item) => item.str.trim())
          .filter(Boolean)
          .join(" "),
      );
  });
}

export async function extractPdfInvoice(
  file: File,
  referenceMonth: string,
): Promise<PdfInvoiceResult> {
  const { extractTextItems, getDocumentProxy } = await import("unpdf");
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(data);
  const { items, totalPages } = await extractTextItems(pdf);
  const lines = groupItemsIntoLines(items);
  const text = lines.join("\n");

  if (normalizeText(text).length < 30) {
    throw new Error(
      "Este PDF não possui texto selecionável. Nesta primeira versão, use o CSV do banco ou um PDF digital (não escaneado).",
    );
  }

  const { rejectedLines, transactions } = analyzePdfInvoiceLines(
    lines,
    referenceMonth,
  );

  return {
    bank: detectBank(text),
    rejectedLines,
    totalPages,
    transactions,
  };
}
